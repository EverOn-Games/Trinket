---
phase: 04-brain-dump
plan: 05
subsystem: ui
tags: [react-native, expo-router, jest]

# Dependency graph
requires:
  - phase: 04-brain-dump (plan 04)
    provides: "DumpItemRow 'Start a session' promote button pushing /co-pilot with a dumpItemId router param, never creating a session itself"
  - phase: 03-co-pilot-end-to-end (plan 02/04)
    provides: "startFromDumpItem/beginSession session-start path, resumablePointer resume-priority gate"
provides:
  - "co-pilot.tsx consumes the dumpItemId router param end-to-end, completing DUMP-04's one-tap promote (brain-dump item -> tap 'Start a session' -> sitting in a Co-pilot session)"
  - "Route-level integration test proving the promote hand-off, including resume-priority (a live session always wins over a dumpItemId param)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Router-param-driven session start: a screen-level useEffect gated on existing state machine guards (flowPhase + resumablePointer) reuses an already-defined session-start closure rather than duplicating logic — the additive-extension pattern for hooking external route params into an existing flowPhase state machine"

key-files:
  created: []
  modified:
    - src/app/co-pilot.tsx
    - src/app/__tests__/screens.test.tsx

key-decisions:
  - "The new useEffect depends only on [dumpItemId] (not flowPhase/resumablePointer) so it fires exactly once per param value and never re-triggers after flowPhase transitions to 'active' — guards are read at effect-run time via closure, consistent with ActivePhase's existing timeMode-only effect precedent in the same file."

patterns-established:
  - "Additive router-param consumption via a single gated effect placed after the reused closure's definition, with an eslint-disable-next-line react-hooks/exhaustive-deps comment documenting why the guard variables are intentionally excluded from the dependency array"

requirements-completed: [DUMP-04]

# Metrics
duration: 9min
completed: 2026-07-05
---

# Phase 4 Plan 5: Co-pilot Promote Hand-off Summary

**Co-pilot now consumes the `dumpItemId` router param via one additive, guarded `useEffect` that reuses Phase 3's existing `startFromDumpItem`/`beginSession` closures verbatim — completing DUMP-04's promote path end-to-end with resume-priority preserved and zero session-creation logic duplicated.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-07-05T02:05:00Z (approx, immediately after 04-04's completion)
- **Completed:** 2026-07-05T02:14:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `src/app/co-pilot.tsx` reads `useLocalSearchParams<{ dumpItemId?: string }>()` (new import symbol alongside the existing `useRouter` import) and, in a single new `useEffect`, looks up `dumpItemsRepo.get(dumpItemId)` and calls the already-existing `startFromDumpItem(item)` when a real local item is found — no session-creation logic was duplicated or restructured (D-14)
- The effect is gated on `flowPhase === 'setup' && !resumablePointer`, so an already-live/resumable session always wins over a `dumpItemId` param (resume-priority preserved, matching the same gate the `flowPhase`/`activeSession` initializers already encode for D-16)
- A garbage/unknown `dumpItemId` is a silent no-op (`dumpItemsRepo.get` returns `undefined`, the `if (item)` guard skips) — no crash, no phantom session (T-04-05-SPOOF)
- `startFromDumpItem`'s existing `isStartingSessionRef` guard prevents a double-start if this effect ever raced a manual dump-item tap (T-04-05-DUP) — unchanged, verbatim reuse
- Two new route-level integration tests in `screens.test.tsx`: (1) navigating to `/co-pilot?dumpItemId=<id>` starts a real session with `source:'dump'`/`taskLabel` from the item text, links `promotedTaskId`, and leaves the item in `dumpItemsRepo.list()` (D-15); (2) with a live/keep-live `activeSession` pointer already seeded, entering the same URL resumes the live session instead of starting a second one, and `promotedTaskId` stays unset on the dump item
- Full `npm run verify` green (151/151 tests, eslint + hex + mascot-asset gates clean) — no regression to Phase 3's existing co-pilot/home flows

## Task Commits

Each task was committed atomically:

1. **Task 1: dumpItemId param read + guarded start effect (additive)** - `9296df9` (feat)
2. **Task 2: Route-level promote integration test** - `71b72c5` (test)

**Plan metadata:** committed separately after this summary (docs commit)

## Files Created/Modified
- `src/app/co-pilot.tsx` - Added `useLocalSearchParams` import, a `dumpItemId` param read, and one guarded `useEffect` that reuses `startFromDumpItem`/`beginSession` to start a session from a promoted brain-dump item; `startFromDumpItem`/`beginSession`/`resumablePointer` bodies untouched
- `src/app/__tests__/screens.test.tsx` - New `describe('Co-pilot promote hand-off (DUMP-04, D-14, D-15)')` block with 2 tests: the promote-starts-a-session-and-links-promotedTaskId case, and the resume-priority-wins case

## Decisions Made
- The new effect's dependency array is `[dumpItemId]` only (not `flowPhase`/`resumablePointer`) — this makes it fire exactly once per distinct `dumpItemId` value and never re-fire once `flowPhase` transitions to `'active'` after the session starts; the guard variables are read at effect-run time via closure, following the file's own existing precedent (`ActivePhase`'s `timeMode`-only crossfade effect, `// eslint-disable-next-line react-hooks/exhaustive-deps` with an inline rationale comment).

## Deviations from Plan

None - plan executed exactly as written. The effect placement (after `startFromDumpItem`'s definition, before the `endSession` function) and the exact gating conditions match the plan's `<action>` spec precisely.

## Issues Encountered
None. `npx tsc --noEmit` and `npx eslint src/app/co-pilot.tsx` were both clean on the first pass; all 24 pre-existing `screens.test.tsx` tests continued to pass unmodified, and both new tests passed on first implementation.

## Known Stubs

None. The promote hand-off is fully wired: a real `dumpItemId` starts a real session via the reused Phase 3 path, `promotedTaskId` links correctly, and resume-priority is enforced — no placeholder logic, no unconnected UI.

## User Setup Required

None - no external service configuration required. No native dependency was added or changed this plan (co-pilot.tsx only gained a new `expo-router` hook import, already an existing dependency), so no `expo prebuild --clean` note is needed.

## Next Phase Readiness

- DUMP-04 is now complete end-to-end: brain-dump item -> tap "Start a session" -> sitting in a Co-pilot session with the mascot, with `promotedTaskId` correctly linked and the item still present in the list (D-15)
- Phase 4's remaining plan (04-06, if scoped) has no blockers from this work — the promote path is fully proven at the route level, both the happy path and the resume-priority edge case
- No blockers for downstream plans

---
*Phase: 04-brain-dump*
*Completed: 2026-07-05*

## Self-Check: PASSED

Verified `src/app/co-pilot.tsx` and `src/app/__tests__/screens.test.tsx` both present on disk; both commit hashes (`9296df9`, `71b72c5`) confirmed present in `git log --oneline --all`.
