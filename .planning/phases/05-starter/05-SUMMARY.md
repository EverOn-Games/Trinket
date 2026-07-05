---
phase: 05-starter
plan: retroactive
subsystem: starter
tags: [expo-notifications, i18n, jest, typescript, tdd-adjacent]

# Dependency graph
requires:
  - phase: 01-scaffold-foundations
    provides: "intentionsRepo (data/repositories/intentions.ts), MMKV schema + denylist guard"
  - phase: 03-co-pilot-end-to-end
    provides: "pure clock-injected function pattern (reconcileActiveSession) mirrored by computeFireDate"
  - phase: 04-brain-dump
    provides: "keyword-list-as-data pattern (keywords.ts) mirrored by cues.ts; contextual-permission posture (useVoiceCapture) mirrored by ensureNotificationPermission"
provides:
  - "src/app/starter.tsx — two-step when/then builder, cue-library chips, intention cards, optional single reminder"
  - "src/features/starter/cues.ts — localized PL/EN cue library (time/place/event groups)"
  - "src/features/starter/intentionNotifications.ts — computeFireDate (DST-safe), ensureNotificationPermission, schedule/cancel"
  - "Intention.notifyAt/notificationId fields in data/types.ts"
  - "expo-notifications native dependency + app.json config plugin + Jest mock"
  - "tsc --noEmit folded permanently into npm run verify"
affects: [06-onboarding, 07-subscription-freemium, 08-settings-analytics, 09-beta-hardening]

# Tech tracking
tech-stack:
  added: ["expo-notifications"]
  patterns:
    - "Pure clock-injected timing function (computeFireDate), same shape as reconcileActiveSession"
    - "Keyword-list-as-data (cues.ts), same shape as brain-dump keywords.ts"
    - "Contextual permission ask (only at point of use, never on mount/onboarding)"
    - "Replace-don't-orphan notification lifecycle: cancel prior id before scheduling a new one"

key-files:
  created:
    - src/app/starter.tsx
    - src/features/starter/cues.ts
    - src/features/starter/intentionNotifications.ts
    - src/app/__tests__/starter.test.tsx
    - src/features/starter/__tests__/intentionNotifications.test.ts
    - __mocks__/expo-notifications.ts
  modified:
    - data/types.ts
    - app.json
    - jest.setup.ts
    - package.json
    - i18n/locales/en.json
    - i18n/locales/pl.json

key-decisions:
  - "Reminder = user's own words (cue -> title, action -> body), never app-authored exhortation copy"
  - "Chip-based day+time-slot picker instead of a native date/time picker — stays in the app's existing lightweight interaction grammar"
  - "computeFireDate uses calendar-math rollover (setDate) not fixed +24h ms, after a same-session DST bug was caught"
  - "Notification permission requested contextually only when the user taps to schedule, never on mount or during onboarding"
  - "Replace-don't-orphan semantics: scheduling a new reminder explicitly cancels any prior notificationId first"

patterns-established:
  - "Pure clock-injected function for any future date/time logic (mirrors reconcileActiveSession)"
  - "In-flight ref guard + replace-don't-orphan for any future single-slot resource (notification id, timer id, etc.)"

requirements-completed: [START-01, START-02, START-03, START-04]

# Metrics
duration: unknown (built outside per-plan tracking; direct-dev session)
completed: 2026-07-05
---

# Phase 5: Starter Summary

**Two-step "when X, then Y" implementation-intention builder with a localized PL/EN cue library and a single self-worded, replace-don't-orphan reminder notification via expo-notifications**

## Retroactive Notice

This phase was built via founder-authorized direct development, bypassing the normal `/gsd:plan-phase` → `/gsd:execute-plan` pipeline (no PLAN.md files exist for this phase; work landed directly across 4 commits + a shared cross-phase fix commit). This SUMMARY was written after the fact from git history, source inspection, and the session's own code-review artifact (`.planning/BLITZ-REVIEW.md`). Duration/task-count metrics that a live executor would have tracked are not available.

## Accomplishments

- Two-step builder (`src/app/starter.tsx`): step 1 pick-or-type a cue (library chips prefill an editable field), step 2 name a tiny first physical action with static coaching copy — satisfies START-01/START-04 literally.
- Localized cue library (`src/features/starter/cues.ts`): 3 groups (time/place/event) x 3 entries, PL+EN via i18n keys — satisfies START-02.
- Optional single self-worded reminder (`src/features/starter/intentionNotifications.ts`): day+time-slot chips, contextual permission ask, content is the user's own cue/action text, replace-don't-orphan scheduling, cancel on delete/remove/settings-toggle — satisfies START-03.
- `expo-notifications` installed with config plugin (app.json) and a Jest mock (`__mocks__/expo-notifications.ts`); `Intention.notifyAt`/`notificationId` added to the schema (passes denylist guard); `tsc --noEmit` folded into `npm run verify` permanently.

## Commits

Located via `git log --oneline --grep="(05)"` plus the shared cross-phase fix commit:

1. `fb6ecd4` — feat(05): expo-notifications install + config plugin + Jest mock; typecheck joins npm run verify
2. `7d415a8` — feat(05): starter cue library, notification plumbing, EN/PL copy
3. `203fad5` — feat(05): starter two-step builder + intention cards
4. `4a707d7` — test(05): starter builder, reminder, permission-denial and delete coverage
5. `8b357b2` — fix(05-08): blitz-review findings (shared across Phases 5-8; this phase's share: reminder orphan critical fix + DST calendar-math fix + Save double-submit guard + mock enum drift + unguarded native-call fix, all in `src/app/starter.tsx` and `src/features/starter/intentionNotifications.ts`)

No standalone `docs(05)` completion commit exists (retroactive — this SUMMARY plus the final `docs(retro)` commit fills that role).

## Files Created/Modified

- `src/app/starter.tsx` — two-step builder screen + intention cards + reminder scheduling UI
- `src/features/starter/cues.ts` — data-only localized cue library
- `src/features/starter/intentionNotifications.ts` — computeFireDate, permission, schedule/cancel
- `src/app/__tests__/starter.test.tsx` — builder, reminder, permission-denial, delete coverage
- `src/features/starter/__tests__/intentionNotifications.test.ts` — pure-function + native-call coverage
- `__mocks__/expo-notifications.ts` — Jest mock for the native module
- `data/types.ts` — `Intention.notifyAt?: number`, `Intention.notificationId?: string`
- `app.json` — `expo-notifications` config plugin entry (**prebuild required**)
- `jest.setup.ts` — mock registration
- `i18n/locales/{en,pl}.json` — `starter.*` copy (builder, cues, reminders)

## Test Evidence

- `src/app/__tests__/starter.test.tsx` and `src/features/starter/__tests__/intentionNotifications.test.ts` — 13 tests total per the session's own accounting, including the CR-01 no-orphan regression test (double-tap "Remind me then" produces exactly one live, cancelable notification).
- Full repo suite verified during this retro-documentation pass: `npx jest` → **29 suites / 221 tests, all green** (includes this phase's tests plus Phases 1-4, 6, 7, 8).

## Deviations from Plan

No PLAN.md existed to deviate from (direct-dev bypass). The relevant "deviation-equivalent" record is the same-session blitz code review, which found and fixed issues in this phase's own code before this retro-documentation pass:

### Auto-fixed Issues (via BLITZ-REVIEW, same session)

**1. [Critical — PDA violation class] Double-tap on "Remind me then" orphaned an uncancellable OS notification**
- **Found during:** Same-session code review (BLITZ-REVIEW CR-01)
- **Issue:** No in-flight guard on `handleScheduleReminder`; a double-tap scheduled two distinct OS notifications but only the second's id was persisted, leaving the first permanently uncancellable through any UI path — a concrete shame-free/PDA violation (an app-originated notification the user cannot stop).
- **Fix:** In-flight ref guard + explicit cancellation of any prior `notificationId` before scheduling a new one (replace-don't-orphan).
- **Files modified:** `src/app/starter.tsx`, `src/features/starter/intentionNotifications.ts`
- **Verification:** New regression test asserts a double-tap yields exactly one live, cancelable notification.
- **Committed in:** `8b357b2`

**2. [Bug] `computeFireDate`'s rollover math was not DST-safe**
- **Found during:** Same-session code review (BLITZ-REVIEW WR-01)
- **Issue:** Fixed `+24h` in milliseconds instead of calendar-day advance; wrong by exactly the DST offset across Poland's March/October transition.
- **Fix:** `base.setDate(base.getDate() + 1)` then re-pin hour/minute, matching `entitlements.ts`'s `startOfCurrentWeek` calendar-math precedent.
- **Files modified:** `src/features/starter/intentionNotifications.ts`
- **Committed in:** `8b357b2`

**3. [Bug] Starter "Save" had no double-submit guard**
- **Found during:** BLITZ-REVIEW WR-02
- **Fix:** Added `isSavingRef` guard mirroring `co-pilot.tsx`'s existing convention.
- **Committed in:** `8b357b2`

**4. [Bug] Jest mock's `AndroidImportance.DEFAULT` did not match the real library's value**
- **Found during:** BLITZ-REVIEW WR-04
- **Fix:** Mock now defines the full enum with matching numeric values.
- **Files modified:** `__mocks__/expo-notifications.ts`
- **Committed in:** `8b357b2`

**5. [Bug] `scheduleIntentionNotification`'s native calls were unguarded — a throw would leave the UI stuck**
- **Found during:** BLITZ-REVIEW WR-06
- **Fix:** Failures now fold into the existing quiet "notify unavailable" state instead of an unhandled rejection.
- **Committed in:** `8b357b2`

---

**Total deviations:** 5 auto-fixed via same-session review (1 critical, 4 warnings), all fixed before this retro-documentation pass began.
**Impact:** All fixes necessary for correctness/PDA-safety. No scope creep.

## Known Stubs

None. All Starter code paths are wired to real (mocked-under-test) `expo-notifications` calls; no placeholder data flows to the UI.

## User Setup Required

**`npx expo prebuild --clean` required after pulling** — `expo-notifications` is a new native dependency with an app.json config plugin entry.

Real device notification-delivery timing (does the OS fire at the exact scheduled instant under Doze/battery optimization) is a device-only verification, not yet performed — tracked as an open item for Phase 9 (Beta Hardening) device UAT alongside the existing STT and iOS-boot device gates.

## Next Phase Readiness

- START-01..04 all satisfied at the code layer; 13 tests green covering builder flow, reminder scheduling/cancellation, permission denial, and delete.
- `data/types.ts`'s `notifyAt`/`notificationId` shape is stable and consumed by Phase 8's settings reminders-off sweep with no rework.
- No blockers for Phase 6+; the only carried-forward item is the device notification-timing verification noted above.

---
*Phase: 05-starter*
*Completed: 2026-07-05*

## Self-Check: PASSED

Verified via `git log --oneline --all | grep -E "fb6ecd4|7d415a8|203fad5|4a707d7|8b357b2"` — all 5 commit hashes present. Verified via `ls`: `src/app/starter.tsx`, `src/features/starter/cues.ts`, `src/features/starter/intentionNotifications.ts`, `__mocks__/expo-notifications.ts` all present on disk. Verified via `npx jest`: 29 suites / 221 tests green.
