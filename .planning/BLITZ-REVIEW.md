---
phase: blitz-starter-onboarding-settings-freemium
reviewed: 2026-07-05T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - src/app/starter.tsx
  - src/features/starter/intentionNotifications.ts
  - src/app/onboarding.tsx
  - src/app/index.tsx
  - src/app/settings.tsx
  - src/app/paywall.tsx
  - src/app/co-pilot.tsx
  - src/analytics/analytics.ts
  - src/features/subscription/entitlements.ts
  - src/features/subscription/purchases.ts
findings:
  critical: 1
  warning: 6
  info: 4
  total: 11
status: issues_found
---

# Phase: Starter / Onboarding / Settings+Analytics / Freemium-gate — Code Review Report

**Reviewed:** 2026-07-05
**Depth:** standard
**Files Reviewed:** 10 (plus supporting context read per `required_reading`: `src/features/starter/cues.ts`, `__mocks__/expo-notifications.ts`, `src/analytics/events.ts`, `src/features/brain-dump/useVoiceCapture.ts`, `data/stores/useSettingsStore.ts`, `data/types.ts`, `i18n/locales/{en,pl}.json`, plus `data/repositories/intentions.ts` and `src/app/_layout.tsx` for cross-file tracing)
**Status:** issues_found

## Summary

This session's build (Starter builder + reminders, onboarding, settings, freemium gate/paywall) is largely sound and follows this codebase's own established defensive idioms (contextual permission asks, guard refs, DST-safe week math, a typed/allowlisted analytics layer with a runtime content filter). Several things I actively hunted for and found **clean**: the freemium gate correctly fires on all three session-start affordances *and* the `dumpItemId` auto-start effect (traced explicitly); Resume of a live session never re-enters the gate; `startOfCurrentWeek` is genuinely DST-safe (calendar math, not ms arithmetic); no `track()` call site anywhere in this batch can leak content (the typed event schema plus the runtime `Object.entries` filter in `analytics.ts` hold); the `paywall.tsx` purchase/restore functions are truly inert in reference mode; the onboarding→home redirect has no re-render race.

That said, one genuine BLOCKER surfaced in the notification lifecycle: a double-tap on "Remind me then" produces an orphaned, uncancellable OS notification — a direct ghost-demand/PDA violation. I also found a real DST bug in `computeFireDate` (the one function explicitly built to be DST-safe, and it isn't), several missing double-tap guards that are inconsistent with this codebase's own established ref-guard convention used everywhere else, a Jest-mock/real-library drift in `AndroidImportance` (the exact "convenient mock masks a real mismatch" class this review was asked to hunt for), and a few smaller completeness/dead-code items.

## Critical Issues

### CR-01: Double-tap on "Remind me then" orphans an uncancellable OS notification (ghost demand)

**File:** `src/app/starter.tsx:297-317` (handler), `src/app/starter.tsx:454-462` (Pressable)
**Issue:** `handleScheduleReminder` has no in-flight/double-submit guard:
```tsx
const handleScheduleReminder = async () => {
  const granted = await ensureNotificationPermission();
  ...
  const notificationId = await scheduleIntentionNotification(...);
  intentionsRepo.update(intention.id, { notifyAt: fireAt, notificationId });
  ...
};
```
The `Pressable` calling it (`starter.tsx:454-462`) is never disabled while the async chain is in flight. Two rapid taps on "Remind me then" (exactly the double-tap failure mode this codebase's own comments elsewhere call out as common for this app's ADHD-adjacent user population — see `src/app/index.tsx:66-78`) fire `handleScheduleReminder` twice. Both calls schedule a **separate** OS notification (two distinct native ids), but `intentionsRepo.update` writes `notificationId` twice — the second call's write wins, and the intention record now remembers only the *second* id. The *first* scheduled notification is never referenced anywhere in storage again.

Every cancellation path in this codebase — `handleDelete` (`starter.tsx:289-295`), `handleRemoveReminder` (`starter.tsx:319-325`), and Settings' reminders-off loop (`settings.tsx:50-63`) — cancels *only* `intention.notificationId` (the one tracked id). The orphaned first notification can never be cancelled through any UI path and **will fire**, carrying the user's own cue/action text, at a time when the user believes they have removed or changed that reminder (or even after deleting the intention entirely). This is a concrete, provable violation of this app's hard shame-free/PDA constraint ("no re-engagement hook," "one-shot, cancelable" per `intentionNotifications.ts`'s own docstring) — an app-originated notification the user has no way to stop.

**Fix:**
```tsx
const isSchedulingRef = useRef(false);
const handleScheduleReminder = async () => {
  if (isSchedulingRef.current) return;
  isSchedulingRef.current = true;
  try {
    const granted = await ensureNotificationPermission();
    if (!granted) {
      setNotifyUnavailable(true);
      setRowMode('idle');
      return;
    }
    setNotificationsOptIn(true);
    const fireAt = computeFireDate(reminderDay, slotHour, 0, Date.now());
    const notificationId = await scheduleIntentionNotification(
      intention.cueText,
      intention.actionText,
      fireAt
    );
    intentionsRepo.update(intention.id, { notifyAt: fireAt, notificationId });
    track('reminder_scheduled', { dayChosen: reminderDay });
    setRowMode('idle');
    onChanged();
  } finally {
    isSchedulingRef.current = false;
  }
};
```
(Mirrors the `isStartingSessionRef`/`isFinishingRef`/`gatePushRef` convention already used throughout `co-pilot.tsx`.)

## Warnings

### WR-01: `computeFireDate`'s "tomorrow"/rollover math is not DST-safe

**File:** `src/features/starter/intentionNotifications.ts:28-41`
**Issue:**
```ts
export function computeFireDate(day, hour, minute, now) {
  const base = new Date(now);
  base.setHours(hour, minute, 0, 0);
  let fireAt = base.getTime();
  if (day === 'tomorrow' || fireAt <= now) {
    fireAt += 24 * 60 * 60 * 1000; // fixed 24h in ms — NOT DST-safe
  }
  return fireAt;
}
```
Both the "tomorrow" branch and the past-time rollover branch add a fixed `24 * 60 * 60 * 1000` ms instead of advancing the calendar day (e.g. `base.setDate(base.getDate() + 1)`). On a DST-transition night (Poland: last Sunday of March / October — this app's primary launch market), a day is either 23 or 25 hours long. A reminder scheduled for "tomorrow at 21:00" across that boundary will fire at 20:00 or 22:00 local time — silently off by exactly the DST offset, contradicting the "user-chosen time" contract. Notably, `src/features/subscription/entitlements.ts:25-32` (`startOfCurrentWeek`, same phase) already demonstrates the correct calendar-math pattern with an explicit "DST-safe via calendar math" comment — this same care wasn't applied here. No test in `intentionNotifications.test.ts` exercises a DST boundary, so this is currently un-caught.
**Fix:**
```ts
export function computeFireDate(day: ReminderDay, hour: number, minute: number, now: number): number {
  const base = new Date(now);
  base.setHours(hour, minute, 0, 0);
  if (day === 'tomorrow') {
    base.setDate(base.getDate() + 1);
  } else if (base.getTime() <= now) {
    base.setDate(base.getDate() + 1);
  }
  return base.getTime();
}
```

### WR-02: Starter builder "Save" has no double-submit guard — duplicate intentions on double-tap

**File:** `src/app/starter.tsx:128-133` (handler), `:264` (Pressable)
**Issue:**
```tsx
const handleSave = () => {
  if (!actionReady) return;
  intentionsRepo.create({ cueText: cueText.trim(), actionText: actionText.trim() });
  track('starter_created', {});
  onSaved();
};
```
No ref-guard blocks re-entry before the `onSaved()` → `setBuilding(false)` state transition commits. A rapid double-tap on "Keep this starter" can create two duplicate `Intention` records (and double-fire `starter_created`) from a single user action. This is exactly the double-tap hazard class this codebase otherwise guards against everywhere (`isStartingSessionRef`, `isEndingSessionRef`, `isFinishingRef`, `gatePushRef` in `co-pilot.tsx`; `isResumeCardActionRef`/`isStartingSessionRef` in `index.tsx`) — its absence here is an inconsistency, not a deliberate design choice.
**Fix:** add an `isSavingRef` guard (`if (isSavingRef.current) return; isSavingRef.current = true;`) before `intentionsRepo.create`, matching the established idiom.

### WR-03: Onboarding `finish()` / `handleFirstTask` have no double-tap guard

**File:** `src/app/onboarding.tsx:40-46` (`finish`), `:51-58` (`handleFirstTask`); Pressables at `:98` (Skip), `:129` (step2 next), `:148` (step3 done)
**Issue:** Neither `finish(skipped)` nor `handleFirstTask` is guarded against re-entry. A double-tap on "Skip" or "Come on in" can call `finish()` twice, double-firing `track('onboarding_completed', ...)` and polluting the ANLY-02 activation funnel with a duplicate event for one user action (the `setOnboardingComplete()` write itself is idempotent, so this doesn't visibly break the UI, but it does corrupt analytics). Separately, a double-tap on the step-2 "Set it down" button can call `dumpItemsRepo.create` twice before `setStep(3)` commits, creating two identical inert dump items from one first-task entry. Same class of gap as WR-02.
**Fix:** guard `finish` with a `hasFinishedRef` (set before `track`/`router.replace`) and `handleFirstTask` with a similar ref before `dumpItemsRepo.create`.

### WR-04: Jest mock's `AndroidImportance.DEFAULT` does not match the real `expo-notifications` value

**File:** `__mocks__/expo-notifications.ts:20`
**Issue:**
```ts
export const AndroidImportance = { DEFAULT: 3 };
```
The real library (`node_modules/expo-notifications/build/NotificationChannelManager.types.d.ts:24-36`) defines `AndroidImportance.DEFAULT = 5`; the mock's `3` is actually the real library's `MIN` value. `intentionNotifications.ts:73` passes `Notifications.AndroidImportance.DEFAULT` straight through to `setNotificationChannelAsync`, so this drift is currently invisible only because no test asserts on the numeric importance value passed — but this is precisely the "mock shape doesn't match the real module" class of bug this codebase has been bitten by before (`useVoiceCapture.ts`'s now-fixed `getSupportedLocales` sync/async mismatch, see its `T-04-06-CRASH` comment). Any future test written against this mock that asserts channel importance, or any refactor that starts relying on the mock's value being semantically "DEFAULT," would be validated against the wrong number.
**Fix:** `export const AndroidImportance = { NONE: 2, MIN: 3, LOW: 4, DEFAULT: 5, HIGH: 6, MAX: 7 };` (match the real enum's values, not just the one key currently used).

### WR-05: Settings reminders-off loop has no error handling — partial-failure leaves ghost reminders active

**File:** `src/app/settings.tsx:50-63`
**Issue:**
```tsx
const handleNotificationsToggle = async (next: boolean) => {
  setNotificationsOptIn(next);
  if (!next) {
    for (const intention of intentionsRepo.list()) {
      if (intention.notificationId) {
        await cancelIntentionNotification(intention.notificationId);
        intentionsRepo.update(intention.id, { notifyAt: undefined, notificationId: undefined });
      }
    }
    setVersion((v) => v + 1);
  }
};
```
`notificationsOptIn` is flipped to `false` *before* the loop runs, and the loop has no `try/catch`. `cancelIntentionNotification` itself never throws (it swallows errors), but `intentionsRepo.update` (a synchronous MMKV write) is not guarded — if it throws mid-loop for any reason, the remaining intentions in the list never get their reminder cancelled/cleared, yet the Settings screen already shows "Reminders: Off." The user is told reminders are off while some are still live and will still fire. The call site (`onPress={() => handleNotificationsToggle(false)}`) also never attaches a `.catch`, so any such failure becomes an unhandled promise rejection.
**Fix:** wrap the loop body in try/catch (continue-on-error, ideally logging/telemetry-free per the AI/analytics boundary), or `Promise.allSettled` the cancellations, and attach a `.catch(() => {})` at minimum at the call site to avoid the unhandled rejection.

### WR-06: `scheduleIntentionNotification`'s native calls are unguarded inside `handleScheduleReminder`

**File:** `src/features/starter/intentionNotifications.ts:64-87`, called from `src/app/starter.tsx:308-312`
**Issue:** Unlike `ensureNotificationPermission` (catches and folds into `false`) and `cancelIntentionNotification` (catches and no-ops), `scheduleIntentionNotification` has no try/catch around `Notifications.setNotificationChannelAsync`/`scheduleNotificationAsync`. If either native call throws (invalid trigger, OS-level scheduling failure, etc.), the exception propagates out of `handleScheduleReminder` uncaught — an unhandled promise rejection — and, because there's no `finally`, `setRowMode('idle')` and `onChanged()` never run: the notify picker stays stuck open in `rowMode === 'notify'` indefinitely with no error surfaced to the user (they can still tap "Not now" to escape, so this isn't data-destructive, but it's an inconsistent error-handling posture within the same file).
**Fix:** wrap the native calls in `scheduleIntentionNotification` with a try/catch that rethrows a typed "scheduling failed" signal the caller can fold into `notifyUnavailable`, or wrap the caller (`handleScheduleReminder`, see CR-01's fix) in a try/catch that resets `rowMode` to `'idle'`/sets `notifyUnavailable` on any failure.

## Info

### IN-01: `settings.tsx`'s post-loop `setVersion` bump has no visible effect

**File:** `src/app/settings.tsx:47,61`
**Issue:** `const [, setVersion] = useState(0);` is bumped after the reminders-off cancellation loop, but nothing on the Settings screen renders per-intention data (the intention list/cards live on `/starter`, a different screen) — the comment ("cheap derived read; the version bump only exists because repo/cache writes aren't reactive") applies to `tier`, which doesn't depend on intentions at all. This `setVersion` call is dead weight that forces an unnecessary re-render with no functional purpose on this screen; likely copy-pasted from the `starter.tsx` pattern without adjusting for the different data dependency.
**Fix:** remove the `setVersion` call from `handleNotificationsToggle`, or replace the comment to accurately explain why it's needed (if it turns out to be needed for something not visible in this diff).

### IN-02: Unused `sessionsRemaining_*` i18n keys directly embody the forbidden "depletion" copy pattern

**File:** `i18n/locales/en.json:208-209`, `i18n/locales/pl.json:210-212`
**Issue:** `"sessionsRemaining_one": "{{count}} session left this week"` (and its `_other`/`_few`/`_many` siblings) are not referenced anywhere in `src/` (confirmed via search) — the actual paywall/settings copy correctly uses the calm "sessions refresh Monday" framing instead. These orphaned keys are exactly the countdown/depletion framing this project's CLAUDE.md explicitly forbids ("never a countdown," "never 'you've run out'"). They're currently inert, but they're a landmine: if a future contributor greps for a "remaining sessions" string and wires this key up (e.g., while adding a session counter badge), they'd reintroduce the exact copy pattern this phase deliberately designed around.
**Fix:** delete the unused keys from both locale files.

### IN-03: Polish plural set for `lengthChip`/other count-based keys has no `_other` form

**File:** `i18n/locales/pl.json:38-40` (and `sessionsRemaining_*` at `:210-212`)
**Issue:** EN defines `_one`/`_other`; PL defines `_one`/`_few`/`_many` but omits `_other`. For the current call site (`LENGTH_CHIP_VALUES = [15, 25, 45, 90]`, all integers), Polish CLDR rules mean `_other` is only reached for non-integer counts, so this is harmless today — but it's an incomplete plural set that will silently fall through to a missing-key warning (and likely render the raw key) the first time this translation function is called with a value CLDR maps to `other` (e.g., if a future length option or a decimal duration is introduced).
**Fix:** add `"lengthChip_other": "{{count}} min"` (or the Polish equivalent) for completeness, matching the `duration_*` keys' pattern (which also lacks `_other` in `history.duration_*`, `pl.json:175-177`).

### IN-04: `gateBlocksStart`'s 800ms reset window is an unexplained magic number

**File:** `src/app/co-pilot.tsx:151-153`
**Issue:** `gateResetTimeoutRef.current = setTimeout(() => { gatePushRef.current = false; }, 800);` — during this 800ms window, if a gated user backs out of the auto-pushed paywall and re-taps a start affordance, `gateBlocksStart()` correctly still blocks the session (`canStartSession` is unchanged) but silently does *not* re-push the paywall, so the tap appears to do nothing for up to 800ms. This self-heals (any tap after 800ms behaves normally) and is not a data-correctness bug, but the constant is uncommented beyond a reference to "brain-dump's promote button" pattern, making the exact debounce-vs-momentary-dead-tap tradeoff easy to lose track of on the next edit.
**Fix:** either a short code comment justifying 800ms specifically for this screen's navigation timing, or reduce it to the transition-animation duration so the dead window is imperceptible.

---

_Reviewed: 2026-07-05_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
