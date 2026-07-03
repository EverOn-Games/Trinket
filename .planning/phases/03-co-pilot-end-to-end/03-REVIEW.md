---
phase: 03-co-pilot-end-to-end
reviewed: 2026-07-03T02:35:04Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - data/types.ts
  - data/repositories/activeSession.ts
  - src/features/co-pilot/useElapsedSession.ts
  - src/features/co-pilot/reconcileActiveSession.ts
  - src/app/co-pilot.tsx
  - src/app/index.tsx
  - src/app/_layout.tsx
  - src/app/history.tsx
  - i18n/locales/en.json
  - i18n/locales/pl.json
  - data/repositories/__tests__/repositories.test.ts
  - data/repositories/__tests__/schema.denylist.test.ts
  - src/features/co-pilot/__tests__/reconcileActiveSession.test.ts
  - src/features/co-pilot/__tests__/useElapsedSession.test.ts
  - src/app/__tests__/screens.test.tsx
findings:
  critical: 2
  warning: 4
  info: 2
  total: 8
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-07-03T02:35:04Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

Reviewed the Co-pilot end-to-end slice: the active-session pointer repository, the
timestamp-derived elapsed/dozing hook, the pure cold-launch reconciliation decision
function, the Co-pilot setup/active/ending screen, the Home resume card, History's
per-row duration, and their associated tests/i18n copy. `npm run lint:hex`, `tsc
--noEmit`, `eslint` (including the `i18next/no-literal-string` rule), and the full
Jest suite for these files all pass cleanly — the codebase's mechanical guardrails
(token-only styling, i18n-only copy, schema denylist, corrupted-JSON tolerance) are
correctly upheld by the new code.

However, tracing actual control flow (not just "does it compile / do tests pass")
surfaced two BLOCKER-level functional regressions in `src/app/index.tsx`. Three
separate "prevent a rapid double-tap" guards (`isStartingSessionRef`,
`isResumeCardActionRef`, `dismissedActiveSession`) were carried over from a
single-shot press-then-navigate-away mental model, but Home is a screen that
**persists across push/pop navigation** in Expo Router's Stack (a screen beneath a
pushed screen stays mounted, it is not unmounted) — so any of Home's primary
affordances can be revisited after the user backs out of `/co-pilot` without
completing a session. Because none of the three guards ever reset, this silently
and permanently disables the app's core "Start a session?" CTA and/or the D-11
resume card for the remainder of the app session, with zero error surfaced. Given
this product's explicit target user (someone who hesitates, opens the setup
screen, and backs out before committing) this is not an edge case — it is close to
the happy-path "I changed my mind" interaction, and it defeats the exact "lower
the threshold to start" value proposition `CLAUDE.md` names as this app's core
value.

Four further WARNING-level findings cover a resume-time staleness gap in
`co-pilot.tsx`, a countdown-toggle correctness bug after Resume, a
non-idempotent AppState tick-loop guard, and an unclamped clock-skew duration
in History. Two lower-priority INFO items round out the review (a pre-existing
FlatList sizing gap and a missing `accessibilityState` on a disabled control).

No hardcoded secrets, injection vectors, unsafe eval/exec usage, or shame-free/PDA
grammar violations were found in the new or existing i18n copy — the resume card
and ending copy were checked specifically per this phase's sensitive-copy focus and
read as warm/continuity-only ("Still with you. Pick it up?" / "You're here. That's
what matters.") with no "interrupted"/"paused"/"you left" language anywhere.

## Critical Issues

### CR-01: Home's primary "Start a session?" offer permanently stops responding after the first press

**File:** `src/app/index.tsx:69-74`
**Issue:** `isStartingSessionRef` is set to `true` on the first press of the primary
offer and is never reset anywhere in the component:

```tsx
const isStartingSessionRef = useRef(false);
const handleStartSession = () => {
  if (isStartingSessionRef.current) return;
  isStartingSessionRef.current = true;
  router.push('/co-pilot');
};
```

The adjoining comment justifies this as fine because "once navigation has started,
this specific Pressable's job is done for the lifetime of this screen instance" —
but that assumption dates from Phase 1's walking-skeleton model, where
`handleStartSession` also called `sessionsRepo.create(...)` synchronously (an
irreversible action, per this file's own diff removing that call in this phase).
Phase 3's refactor made this **pure navigation** — the user can open the Co-pilot
setup screen and back out (hardware back, header back button, or iOS swipe-back —
the `Stack` in `_layout.tsx` doesn't disable any of these) without ever starting a
session.

Expo Router's `Stack` (React Navigation under the hood) keeps a screen mounted
while another screen is pushed on top of it; popping back to Home reveals the
*same* `HomeScreen` instance, not a fresh one. `isStartingSessionRef.current` is
therefore still `true`, and the primary CTA — the single most important button in
this app per `CLAUDE.md` ("Co-pilot lowers the threshold to start") — becomes a
permanently dead tap target for the rest of the app session. No error, warning, or
any other signal is surfaced; the button just silently stops doing anything. The
existing test suite doesn't catch this because `screens.test.tsx` never exercises
a push-then-back-then-press-again sequence.

**Fix:** Reset the guard whenever Home regains focus, using `expo-router`'s
`useFocusEffect` (already available as a dependency and designed for exactly this —
its own doc comment describes it as "the right primitive for ... resetting
transient screen state every time a user returns to the route"):

```tsx
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

const isStartingSessionRef = useRef(false);
useFocusEffect(
  useCallback(() => {
    isStartingSessionRef.current = false;
  }, [])
);
```

### CR-02: Home's resume-card "Resume"/"Not now" buttons lock up after first use, and "Not now" permanently disables all future resume cards

**File:** `src/app/index.tsx:81`, `101-104`, `111-129`
**Issue:** Same root cause as CR-01 (a guard that assumes Home is "done" once
acted on, which is false once the user can navigate back to it), applied to the
resume card, with two distinct symptoms:

**(a) The buttons themselves lock up.** `isResumeCardActionRef` is shared by
`handleResume` and `handleNotNow` and never resets:

```tsx
const isResumeCardActionRef = useRef(false);
const handleResume = () => {
  if (isResumeCardActionRef.current) return;
  isResumeCardActionRef.current = true;
  router.push('/co-pilot');
};
...
const handleNotNow = () => {
  if (isResumeCardActionRef.current || !pointer) return;
  isResumeCardActionRef.current = true;
  sessionsRepo.update(pointer.sessionId, { endedAt: pointer.lastAliveAt });
  activeSessionRepo.clear();
  setDismissedActiveSession(true);
};
```

Press "Resume" (sets the ref), then back out of the still-live session without
ending it — Home re-renders the resume card (the pointer is still live) but both
"Resume" and "Not now" are now permanently unresponsive for the rest of this Home
instance's life. The card is visible but dead.

**(b) "Not now" is a one-way kill switch for the whole feature, not just that
session.** `dismissedActiveSession` gates the pointer read itself:

```tsx
const [dismissedActiveSession, setDismissedActiveSession] = useState(false);
...
const pointer = dismissedActiveSession ? undefined : activeSessionRepo.read();
```

Once `true` (set by `handleNotNow`), this is not scoped to the session that was
dismissed — *every* future render of this Home instance forces `pointer` to
`undefined`, so the D-11 resume card can never appear again for the rest of the
app session, even for a completely different, legitimately live session started
afterward (e.g. the user starts a new session from the now-restored primary offer,
backs out again, and expects the same warm resume card D-11 promises).

Neither symptom is exercised by `screens.test.tsx`'s existing resume-card tests,
which only assert the *immediate* aftermath of a single Resume/Not-now press, not
a second visit to Home afterward.

**Fix:** Reset `isResumeCardActionRef` on focus (same mechanism as CR-01), and
stop using a permanent boolean to suppress `pointer` — use a plain re-render
trigger instead so `pointer` always re-reads fresh from `activeSessionRepo`
(which is already the source of truth once `.clear()` has run):

```tsx
const [, forceRerender] = useReducer((c) => c + 1, 0);
const isResumeCardActionRef = useRef(false);
useFocusEffect(useCallback(() => { isResumeCardActionRef.current = false; }, []));

const pointer = activeSessionRepo.read(); // always fresh, no permanent override
...
const handleNotNow = () => {
  if (isResumeCardActionRef.current || !pointer) return;
  isResumeCardActionRef.current = true;
  sessionsRepo.update(pointer.sessionId, { endedAt: pointer.lastAliveAt });
  activeSessionRepo.clear();
  forceRerender(); // pointer will naturally read as undefined next render
};
```

## Warnings

### WR-01: `co-pilot.tsx` resumes a session on mount without re-verifying staleness, unlike `index.tsx`

**File:** `src/app/co-pilot.tsx:59-66`
**Issue:**

```tsx
const [flowPhase, setFlowPhase] = useState<'setup' | 'active' | 'ending'>(() =>
  activeSessionRepo.read() ? 'active' : 'setup'
);
const [activeSession, setActiveSession] = useState<LiveSession | null>(() => {
  const pointer = activeSessionRepo.read();
  if (!pointer) return null;
  return { sessionId: pointer.sessionId, startedAt: pointer.startedAt, taskLabel: pointer.taskLabel };
});
```

This trusts "a pointer exists" alone. `src/app/index.tsx` (lines 89-104)
deliberately does *not* make this same shortcut — its own comment explains at
length why: React commits a component's first render before any effect in the
tree fires, so a screen that reads the pointer synchronously on mount can render
based on a pointer that `_layout.tsx`'s `useReconcileActiveSession` effect is
about to silently reconcile away moments later. Home defends against this by
calling `reconcileActiveSession(pointer, nowAtMount, STALE_THRESHOLD_MS)` before
trusting the pointer; `co-pilot.tsx`'s own initializers do not apply the same
check.

In the current app, `/co-pilot` is normally only reached *through* Home (which
already filters out stale pointers before offering "Resume"), so this is latent
rather than actively triggered today. But `screens.test.tsx`'s own
`renderRouter(routeContext, { initialUrl: '/co-pilot' })` calls prove `/co-pilot`
is a fully valid entry point to mount directly — this is exactly the shape a
future deep link (e.g. a Starter notification tapping into an in-progress
session) or an Android process-death-and-restore-to-last-route would take. If that
happens with a *stale* pointer, `co-pilot.tsx` will resume and keep ticking a
session that `_layout.tsx`'s reconciliation effect closes out from under it
seconds later (writing `endedAt = lastAliveAt`), leaving the UI showing a live,
incrementing timer for a session the data layer already considers ended. If the
user doesn't happen to press "End" before the app is killed again, the session's
final `endedAt` stays pinned at the stale reconciliation timestamp instead of
whenever the user actually stopped.

**Fix:** Mirror Home's check in the initializer:

```tsx
const [flowPhase, setFlowPhase] = useState<'setup' | 'active' | 'ending'>(() => {
  const pointer = activeSessionRepo.read();
  return pointer && reconcileActiveSession(pointer, Date.now(), STALE_THRESHOLD_MS).kind === 'keep-live'
    ? 'active'
    : 'setup';
});
```

(and thread the same check into the `activeSession` initializer, or better,
factor the two initializers into one so they can't disagree.)

### WR-02: Length intent is lost across a Resume re-entry, producing a false "0 remaining" that permanently disables the countdown toggle

**File:** `src/app/co-pilot.tsx:70` (interacting with `355-357`, `367-368`, `378-381`)
**Issue:** `lengthIntentMin` is plain `CoPilotScreen` component state, seeded to the
default `25` on every mount:

```tsx
const [lengthIntentMin, setLengthIntentMin] = useState<number | null>(25);
```

This is intentional for a *fresh* session (D-03: never persisted). But pressing
"Resume" on Home's resume card (`router.push('/co-pilot')`) also creates a brand
new `CoPilotScreen` instance — so a resumed session always starts back at the
`25`-minute default, regardless of what the user originally picked (e.g. 90
minutes) before backgrounding/backing out.

Concretely: user picks 90 min, works 40 minutes, backs out and later resumes.
`elapsedMs` correctly carries over (it's derived from the real, persisted
`session.startedAt`), but `lengthIntentMin` is back to the default `25`. If they
tap the timer to check "remaining" (`canToggleTimeMode` is `true` since
`lengthIntentMin` is non-null), `remainingMs` computes
`Math.max(0, 25*60*1000 - 40*60*1000) = 0`, which immediately trips the auto-retire
branch:

```tsx
if (timeMode === 'remaining' && lengthIntentMin != null && !countdownRetired && remainingMs <= 0) {
  setTimeMode('elapsed');
  setCountdownRetired(true);
}
```

The countdown silently shows 0 and then permanently disables itself for the rest
of the (still 50-minutes-remaining-by-the-user's-real-intent) session — this is
incorrect information, not just a reset-to-default inconvenience.

**Fix:** Denormalize the length intent onto `ActiveSessionPointer` the same way
`taskLabel` already is (`data/types.ts:54`), and thread it through
`activeSessionRepo.start`/`beginSession` so a resumed `ActivePhase` receives the
original intent instead of always falling back to the hardcoded default.

### WR-03: `useElapsedSession`'s tick loop is not guarded against a duplicate 'active' AppState event

**File:** `src/features/co-pilot/useElapsedSession.ts:59-71`
**Issue:**

```tsx
const startTicking = () => {
  tick();
  intervalId = setInterval(tick, TICK_MS);
};
...
if (AppState.currentState === 'active') startTicking();

const subscription = AppState.addEventListener('change', (nextState) => {
  if (nextState === 'active') {
    startTicking();
  } else {
    ...
  }
});
```

`startTicking()` unconditionally calls `setInterval` and overwrites the closure's
`intervalId`, with no check for an interval already running. If `AppState` ever
fires two `'active'` change events without an intervening non-active transition
(a real-world quirk on some OS/device/RN-version combinations — e.g. duplicate
focus events around permission dialogs or app-switcher transitions), the first
interval's id is silently discarded. That first interval is never cleared —
`stopTicking()` only clears whatever `intervalId` currently holds (now the second
one), and the effect's unmount cleanup has the same limitation — so it keeps
firing `tick()` (and thus `setNow`/`onHeartbeatRef` calls) forever, including
after the component unmounts.

**Fix:** Make `startTicking` idempotent:

```tsx
const startTicking = () => {
  if (intervalId) return;
  tick();
  intervalId = setInterval(tick, TICK_MS);
};
```

### WR-04: History's per-row duration isn't clamped against backward clock skew

**File:** `src/app/history.tsx:35`
**Issue:**

```tsx
const durationMs = (session.endedAt ?? nowFallback) - session.startedAt;
```

There's no `Math.max(0, ...)` floor here, unlike `useElapsedSession.ts:90`'s
`Math.max(0, now - startedAt)` (explicitly called out in that file as a T-03-02
clock-skew requirement). `endedAt` can legitimately end up earlier than
`startedAt` if the device clock moves backward mid-session: `lastAliveAt` is
written from a raw, unclamped `Date.now()` snapshot on every heartbeat
(`useElapsedSession.ts:51`) and is later persisted verbatim as `endedAt` by
`_layout.tsx`'s reconciliation sweep or `index.tsx`'s "Not now" handler. A
resulting negative `durationMs` doesn't crash — the `durationMs < 60000` branch
silently absorbs it into "Under a minute" — but that silently mislabels what could
have been a long session, the same class of clock-skew error the rest of this
phase's code is otherwise careful to guard against.

**Fix:**

```tsx
const durationMs = Math.max(0, (session.endedAt ?? nowFallback) - session.startedAt);
```

## Info

### IN-01: `history.tsx`'s `<FlatList>` has no bounded height (pre-existing, unchanged by this phase)

**File:** `src/app/history.tsx:98-102`
**Issue:** The list is a direct child of `Screen`'s `flex: 1` column container
with no `flex`/explicit `style` of its own. This is a well-known React Native
layout gotcha: a `FlatList`/`ScrollView` needs a bounded size (`flex: 1` or a
fixed height) from its parent to lay out and scroll correctly. RN Testing
Library's JS-only renderer doesn't perform real layout, so the existing tests
pass regardless of whether this actually renders/scrolls correctly on a device.
This predates Phase 03 (unchanged in this phase's diff, confirmed via `git diff`)
but is flagged since the full file was in scope and History's session list has no
upper bound on growth.

**Fix:** `<FlatList style={{ flex: 1 }} ... />`

### IN-02: One-liner "Start" CTA doesn't expose its disabled state to assistive technology

**File:** `src/app/co-pilot.tsx:245-252`
**Issue:** The `Pressable` uses `disabled={!hasFocusedOneLiner}` but has no
`accessibilityState={{ disabled: !hasFocusedOneLiner }}`. Every other stateful
control in this file (mood buttons, length chips) only conveys selection via
color, but this one specifically toggles between enabled/disabled — screen reader
users won't hear that distinction.

**Fix:**

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityState={{ disabled: !hasFocusedOneLiner }}
  disabled={!hasFocusedOneLiner}
  onPress={() => onStartOneLiner(oneLinerText)}
  style={oneLinerCtaStyle}
>
```

---

_Reviewed: 2026-07-03T02:35:04Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
