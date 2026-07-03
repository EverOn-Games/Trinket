---
phase: 03-co-pilot-end-to-end
plan: 05
subsystem: ui

# Dependency graph
requires:
  - phase: 03-03
    provides: "co-pilot.tsx EndingPhase (mascot acknowledge one-shot + numberless warm line + skippable 3-level mood check), isFinishingRef single-fire guard, clampMood"
  - phase: 03-02
    provides: "co-pilot.tsx SetupPhase one-liner Start Pressable + hasFocusedOneLiner focus-latch state"
provides:
  - "co-pilot.tsx EndingPhase: navigation decoupled from the acknowledge animation's own completion — only an explicit mood tap or Skip navigates Home (REVISES locked decision D-13 Pattern 3)"
  - "co-pilot.tsx SetupPhase one-liner Start Pressable: accessibilityState={{ disabled }} wired to hasFocusedOneLiner (IN-02)"
  - "Regression test proving router.replace is NOT called when the acknowledge animation concludes with no tap; new Skip-path and mood-tap-then-Skip single-fire-guard tests; new before/after-focus accessibilityState test"
affects: ["03-HUMAN-UAT.md Test 4 and Test 5 gap closure", "any future plan referencing D-13's original Pattern 3 wording"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "D-13/D-14 amendment pattern: when a locked decision is revised by gap-closure, the code comment at the removed branch explicitly states the revision and cites the UAT test/finding that forced it, so the decision-change is traceable in-code, not just in planning docs"

key-files:
  created:
    - .planning/phases/03-co-pilot-end-to-end/03-05-SUMMARY.md
  modified:
    - src/app/co-pilot.tsx
    - src/app/__tests__/screens.test.tsx

key-decisions:
  - "REVISES D-13 Pattern 3: the acknowledge one-shot's onStateAnimationComplete concluding is no longer an implicit skip that navigates Home. On real hardware the ~1500ms placeholder animation made the mood check unusable (03-HUMAN-UAT.md Test 4, severity major). The ending moment now persists until an explicit mood tap or Skip; the acknowledge one-shot still always plays (PILOT-05 preserved) but its completion no longer drives navigation. Every other D-13/D-14 property (numberless warm line, clamped 1|2|3 mood write, Skip stores nothing, isFinishingRef single-fire guard, token-only styling, i18next-only copy) is unchanged."
  - "isFinishingRef comment updated to drop the now-nonexistent 'animation concluding on its own' trigger from its list of guarded paths — only mood tap and Skip remain, which strictly reduces (not changes the shape of) the double-fire surface per the plan's threat register (T-03-05)."

patterns-established: []

requirements-completed: [PILOT-05]

# Metrics
duration: ~6min
completed: 2026-07-03
---

# Phase 3 Plan 5: Co-pilot Ending-Moment Auto-Dismiss Gap Closure Summary

**Fixed the UAT-reported bug where the Co-pilot ending screen's 3-level mood check auto-dismissed after ~1.5s by decoupling Home navigation from the acknowledge animation's own completion (REVISES locked decision D-13 Pattern 3); also wired `accessibilityState` onto the one-liner Start CTA (IN-02).**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-07-03T11:27:00Z (approx.)
- **Completed:** 2026-07-03T11:28:30Z
- **Tasks:** 2
- **Files modified:** 2 (src/app/co-pilot.tsx, src/app/__tests__/screens.test.tsx)

## Accomplishments
- Root cause (03-HUMAN-UAT.md Test 4, severity major) fixed: `EndingPhase`'s `handleAnimationComplete` function and the `<Mascot state="acknowledge" onStateAnimationComplete={...}>` prop wiring are removed — the acknowledge one-shot still always plays (PILOT-05), but its conclusion no longer calls `finishEnding()`/`router.replace('/')`. The ending moment (acknowledgment + numberless warm line + 3-level mood check) now stays on screen until the user taps a mood or Skip.
- **REVISES locked decision D-13 Pattern 3** — the original Pattern 3 treated animation-conclusion as an implicit skip; a new in-code comment on the `<Mascot>` element explicitly documents the revision and cites `03-HUMAN-UAT.md` Test 4, so the decision change is traceable directly in `co-pilot.tsx`, not only in planning docs.
- `isFinishingRef` single-fire guard, `finishEnding()` (still `router.replace('/')`, never `.push`), `handleMoodTap` (clampMood + `sessionsRepo.update({mood})` + finishEnding), `handleSkip`, and `clampMood`'s T-03-04 allowlist are all preserved unchanged — the fix is purely subtractive (removes one navigation trigger) plus a one-line accessibility addition elsewhere in the file.
- IN-02 (03-HUMAN-UAT.md Test 5, review finding, previously deferred): the `SetupPhase` one-liner Start `Pressable` now carries `accessibilityState={{ disabled: !hasFocusedOneLiner }}` alongside its existing `disabled` prop, so a screen reader announces the disabled/enabled state rather than requiring the user to infer it from the accent-color fill.
- Followed the plan's TDD gate: RED commit (`9f47ff4`) added a regression test that fails against the pre-fix code (`expect(replaceSpy).not.toHaveBeenCalled()` after advancing fake timers 1500ms past the acknowledge duration with no tap — this genuinely failed, confirming the bug), plus two new tests (Skip-path, mood-tap-then-Skip single-fire guard) that already passed unchanged, since Skip/guard behavior was correct before this fix and only the animation-driven auto-navigate was wrong. GREEN commit (`e3deee8`) made the regression test pass via the code change.
- `npm run verify` green: 15 suites, 116 tests, eslint + hex gate + mascot-asset-size gate all clean.

## Task Commits

Each task was committed atomically (Task 1 is TDD, RED then GREEN):

1. **Task 1 (RED): failing regression test for ending-moment auto-dismiss** — `9f47ff4` (test)
2. **Task 1 (GREEN): decouple ending-moment navigation from acknowledge animation** — `e3deee8` (feat)
3. **Task 2: accessibilityState on the one-liner Start CTA (IN-02) + test** — `6978cbe` (fix)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `src/app/co-pilot.tsx` — `EndingPhase`: removed `handleAnimationComplete` and the `onStateAnimationComplete` prop on the acknowledge `<Mascot>`; added a comment documenting the D-13 Pattern-3 revision; updated the `isFinishingRef` comment to reflect the now-two (not three) guarded exit triggers. `SetupPhase`: added `accessibilityState={{ disabled: !hasFocusedOneLiner }}` to the one-liner Start `Pressable`.
- `src/app/__tests__/screens.test.tsx` — replaced the stale "animation-conclusion is implicit skip (Pattern 3)" test with a regression test asserting no navigation on animation conclusion; added a Skip-path test, a mood-tap-then-Skip single-fire-guard test, and a before/after-focus `accessibilityState`/`toBeDisabled()`/`toBeEnabled()` test for the one-liner Start CTA.

## Decisions Made
- REVISES D-13 Pattern 3 (see key-decisions above and the in-code comment at `EndingPhase`'s `<Mascot>` element) — this is the load-bearing decision of this plan; any future reference to D-13's original Pattern 3 wording (in PROJECT.md, ROADMAP.md, or prior SUMMARY.md files) should be read with this amendment.
- Kept the `isFinishingRef` guard's own comment updated rather than leaving it referencing a trigger that no longer exists, so the code stays internally consistent for future readers.

## Deviations from Plan
None - plan executed exactly as written. The plan's `<behavior>` and `<action>` blocks for both tasks were followed literally; no additional bugs, missing functionality, or blocking issues were discovered during execution.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required, and no native dependency was added or changed (zero `npm install`/`expo install` commands ran), so no `npx expo prebuild --clean` is needed after pulling this plan's changes.

## Next Phase Readiness
- 03-HUMAN-UAT.md's `## Gaps` entry (Test 4, severity major) is now code-fixed; a follow-up device pass to re-verify Test 4 and Test 5 on real hardware would close both items definitively, though nothing further is required to unblock Phase 4 planning.
- `EndingPhase`/`SetupPhase` are otherwise unchanged in shape from Plan 03-03/03-02 — Phase 4 (Brain Dump) work has no dependency on this plan's files beyond the general `co-pilot.tsx` route already being stable.
- The D-13 revision should be folded into PROJECT.md's Key Decisions table (or left implicit via this SUMMARY + the in-code comment) at the next `/gsd:transition` — flagging here so it isn't silently lost since D-13 was previously recorded as a locked decision from Phase 3 planning.

---
*Phase: 03-co-pilot-end-to-end*
*Completed: 2026-07-03*

## Self-Check: PASSED

Both claimed modified files verified present on disk (`src/app/co-pilot.tsx`, `src/app/__tests__/screens.test.tsx`); all 3 task commit hashes (`9f47ff4`, `e3deee8`, `6978cbe`) verified present in git history.
