---
phase: 03-co-pilot-end-to-end
plan: 01
subsystem: data/hooks
tags: [react-native, appstate, mmkv, timers, tdd, session-lifecycle]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: MMKV contentStorage, sessionsRepo CRUD pattern, schema denylist guard, data/types.ts Session interface
  - phase: 02-mascot-module
    provides: "<Mascot /> state machine (presence/dozing/acknowledge consumed by future Co-pilot plans), useIdleScheduler.ts ref-forwarding/pausable-effect precedent"
provides:
  - "ActiveSessionPointer type + activeSessionRepo (start/heartbeat/read/clear single-key MMKV pointer)"
  - "useElapsedSession hook: timestamp-derived elapsed/dozing with AppState pause/resume and throttled heartbeat"
  - "reconcileActiveSession pure cold-launch decision function (none/keep-live/reconcile-stale)"
affects: [03-02, 03-03, 03-04, co-pilot session screen, root layout boot sweep, Home resume card]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Timestamp-derivation over accumulated counters for all session timing (Date.now() - startedAt, Math.max(0, ...) clamp for backward clock skew)"
    - "Pure decision function + thin effectful wrapper split (reconcileActiveSession is pure; its MMKV/React host lands in Plan 03-02's _layout.tsx hook)"
    - "Ref-forwarding for callbacks read inside long-lived intervals/effects, mirroring useIdleScheduler.ts's latestRef pattern"
    - "State (not ref) for any internal value that must visibly affect a hook's returned output on its own imperative trigger (lastTouchAt) — a plain ref mutation does not schedule a re-render"

key-files:
  created:
    - data/repositories/activeSession.ts
    - src/features/co-pilot/useElapsedSession.ts
    - src/features/co-pilot/reconcileActiveSession.ts
    - src/features/co-pilot/__tests__/useElapsedSession.test.ts
    - src/features/co-pilot/__tests__/reconcileActiveSession.test.ts
  modified:
    - data/types.ts
    - data/repositories/__tests__/repositories.test.ts
    - data/repositories/__tests__/schema.denylist.test.ts

key-decisions:
  - "Heartbeat interval fixed at 45s (midpoint of D-09's 30-60s discretion band)"
  - "Wake-grace window fixed at 60s (D-07's undiscussed 'wakes on touch' duration, Claude's discretion)"
  - "D-11 staleness threshold fixed at 12h (midpoint of the 8-24h discretion band), gated on lastAliveAt per amended D-11 / RESEARCH.md Pitfall 3 — NOT startedAt"
  - "lastTouchAt is React state, not a ref, since it directly drives the hook's rendered isDozing output on wake() — a ref mutation alone would not schedule a re-render (TDD-caught bug, see Deviations)"

patterns-established:
  - "Single-key MMKV pointer repo shape (settings.ts's flat-blob accessor + sessions.ts's try/catch JSON read) for 0-or-1 record state, as an alternative to the per-record+index CRUD shape"

requirements-completed: [PILOT-03, PILOT-04, PILOT-06]

# Metrics
duration: 8min
completed: 2026-07-03
---

# Phase 3 Plan 1: Active-Session Pointer, Elapsed/Dozing Hook, Cold-Launch Reconciliation Summary

**Timestamp-derived Co-pilot session lifecycle core: MMKV pointer repo, `useElapsedSession` (AppState-paused tick, backward-clock-clamped elapsed, 30-min dozing, throttled heartbeat), and a pure `reconcileActiveSession` cold-launch decision function gated on `lastAliveAt`.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-03T01:07:47Z
- **Completed:** 2026-07-03T01:15:33Z
- **Tasks:** 3
- **Files modified:** 8 (5 created, 3 modified)

## Accomplishments
- `activeSessionRepo` (start/heartbeat/read/clear) over a single `activeSession:pointer` MMKV key, with `ActiveSessionPointer.lastAliveAt` passing the schema denylist guard verbatim
- `useElapsedSession` hook: `elapsedMs`/`isDozing`/`wake()` derive purely from `Date.now() - startedAt`, pause the render tick on backgrounding via `AppState`, and throttle the heartbeat callback to ~45s (with an unconditional immediate fire on `active`→`background`)
- `reconcileActiveSession` pure function implementing the amended D-11 decision: gates the live/stale branch on `lastAliveAt`, not `startedAt`, so a long genuinely-live session isn't silently closed on cold launch
- All three contracts are unit-proven with fake timers / AppState mocks / zero-mock pure-function tests, ready for Wave 2+ screens to consume without further exploration

## Task Commits

Each task followed RED→GREEN TDD gating:

1. **Task 1: ActiveSessionPointer type + activeSessionRepo** — `d3a0e70` (test, RED) → `e0d399c` (feat, GREEN)
2. **Task 2: useElapsedSession hook** — `9a2bb33` (test, RED) → `ce4364e` (feat, GREEN)
3. **Task 3: reconcileActiveSession pure function** — `413da6e` (test, RED) → `859de67` (feat, GREEN)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `data/types.ts` — added `ActiveSessionPointer` interface (`sessionId`, `startedAt`, `lastAliveAt`, `taskLabel?`) directly below `Session`
- `data/repositories/activeSession.ts` — single-key pointer repo over `contentStorage`, try/catch-safe JSON read
- `data/repositories/__tests__/repositories.test.ts` — `describe('activeSessionRepo')` lifecycle + no-op + corrupted-JSON cases
- `data/repositories/__tests__/schema.denylist.test.ts` — runtime probe extended to also probe `activeSessionRepo`'s pointer keys (belt-and-suspenders)
- `src/features/co-pilot/useElapsedSession.ts` — elapsed/dozing derivation hook with AppState pause/resume and throttled heartbeat
- `src/features/co-pilot/__tests__/useElapsedSession.test.ts` — 8 tests covering tick increment, backward-clock clamp, background/foreground correctness, dozing/wake, heartbeat throttling and ref-forwarding
- `src/features/co-pilot/reconcileActiveSession.ts` — pure `(pointer, now, thresholdMs) -> ReconcileAction` decision function
- `src/features/co-pilot/__tests__/reconcileActiveSession.test.ts` — 5 tests covering none/keep-live/reconcile-stale, the lastAliveAt-not-startedAt gate, and backward clock skew

## Decisions Made
- Discretion constants fixed at the RESEARCH.md-recommended midpoints: heartbeat interval 45s, wake-grace 60s, D-11 staleness threshold 12h — all within their respective CONTEXT.md discretion bands, to be consumed by Plan 03-04 (root layout reconciliation mount hook and D-11 threshold constant)
- Confirmed and implemented the amended D-11 lastAliveAt gate (not startedAt) per RESEARCH.md Open Question 1's resolution — `reconcileActiveSession`'s tests explicitly assert a fresh-`startedAt`-but-stale-`lastAliveAt` pointer still reconciles, and an old-`startedAt`-but-fresh-`lastAliveAt` pointer stays live

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `wake()` did not trigger a re-render, leaving `isDozing` stale**
- **Found during:** Task 2 (`useElapsedSession` hook) — a TDD test (`wake() returns to presence...`) written from the plan's own `<behavior>` spec failed against the RESEARCH.md-literal implementation
- **Issue:** The RESEARCH.md Code Example's `wake()` mutated a plain ref (`lastTouchAtRef.current = Date.now()`) with no accompanying state update. Since `isDozing` is computed from that ref at render time, and refs don't schedule re-renders, calling `wake()` while dozing left the caller's `isDozing` value stuck at `true` until the next incidental 1s tick happened to fire (in the fake-timer test, no further tick fired, so the bug was directly observable)
- **Fix:** Converted `lastTouchAt` from a ref to `useState`, so `wake()` (`setLastTouchAt(Date.now())`) immediately triggers a re-render with the corrected `isDozing` value. Left `lastHeartbeatAtRef` and `onHeartbeatRef` as refs since neither directly drives rendered output.
- **Files modified:** `src/features/co-pilot/useElapsedSession.ts`
- **Verification:** `wake() returns to presence...` test passes; full `useElapsedSession` suite (8 tests) green
- **Committed in:** `ce4364e` (Task 2 GREEN commit)

**2. [Rule 3 - Blocking] Test-side `AppState.currentState` mock override**
- **Found during:** Task 2 — 4 of 8 initial test runs failed with `elapsedMs` stuck at 0 / dozing never triggering despite advancing fake timers
- **Issue:** `@react-native/jest-preset`'s own `AppState` mock (`jest/mocks/AppState.js`) replaces `currentState` with a bare `jest.fn()`, not an `AppStateStatus` string — so the hook's mount-time `AppState.currentState === 'active'` check is always `false` under Jest, and the render tick never auto-starts on mount (it only starts once an explicit `'active'` event is fired, which the RESEARCH.md target test never exercised for the mount-tick case)
- **Fix:** The test file's `mockAppState()` helper now also does `Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' })` so the mount-time check behaves as it would on a real foregrounded device. No production code change required — this was purely a test-environment gap.
- **Files modified:** `src/features/co-pilot/__tests__/useElapsedSession.test.ts`
- **Verification:** All 8 `useElapsedSession` tests pass with the override in place
- **Committed in:** `ce4364e` (Task 2 GREEN commit)

**3. [Rule 1 - Bug] Comment in `data/types.ts` accidentally tripped its own denylist-avoidance acceptance check**
- **Found during:** Task 1 self-verification — the plan's acceptance criterion `grep -in "lastActiveAt" data/types.ts` returns nothing was violated by an explanatory code comment that itself spelled out the forbidden alternative name (`lastActiveAt`) as a "do not use this" warning
- **Issue:** Purely a documentation self-reference issue, not a functional bug — the comment's intent (warn future editors away from the wrong name) accidentally used the literal wrong-name substring
- **Fix:** Reworded the comment to describe the forbidden spelling without literally typing it (e.g., "the more natural alternative spelling, swapping Alive for Active")
- **Files modified:** `data/types.ts`
- **Verification:** `grep -in "lastActiveAt" data/types.ts` now returns nothing; `grep -n "lastAliveAt" data/types.ts` still matches the real declarations
- **Committed in:** `e0d399c` (Task 1 GREEN commit)

**4. [Rule 3 - Blocking] `npm ci` required before any test could run**
- **Found during:** Pre-Task-1 verification attempt — `node_modules/` did not exist in the working tree (fresh checkout)
- **Issue:** `npm test` failed with `jest: not found`
- **Fix:** Ran `npm ci` (installs exactly the versions pinned in the existing `package-lock.json`, no version resolution/upstream-selection risk) before proceeding with RED/GREEN verification
- **Files modified:** none (installs into gitignored `node_modules/`)
- **Verification:** Subsequent `npm test`/`npm run verify` invocations succeeded
- **Committed in:** N/A (no tracked files changed)

---

**Total deviations:** 4 auto-fixed (2x Rule 1, 2x Rule 3)
**Impact on plan:** All auto-fixes were either genuine correctness bugs caught by the plan's own TDD behavior spec (wake() re-render, comment self-reference) or environment/test-infra gaps (AppState mock, npm ci) with zero scope creep — no architectural changes, no new files beyond what the plan specified.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required
None — no external service configuration required. No native dependency was added (confirmed zero `npm install`/`expo install` commands ran), so no `npx expo prebuild --clean` is needed after pulling this plan's changes.

## Next Phase Readiness
`activeSessionRepo`, `useElapsedSession`, and `reconcileActiveSession` are ready for Plan 03-02+ (the `co-pilot.tsx` setup/active/ending screen, Home's resume card, and `_layout.tsx`'s boot-time reconciliation mount hook) to consume directly, with no further exploration needed. The discretion constants recorded here (45s heartbeat, 60s wake-grace, 12h staleness threshold) should be treated as the values later plans build against unless explicitly revised.

---
*Phase: 03-co-pilot-end-to-end*
*Completed: 2026-07-03*
