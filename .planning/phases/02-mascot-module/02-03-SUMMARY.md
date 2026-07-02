---
phase: 02-mascot-module
plan: 03
subsystem: ui
tags: [react-native, lottie, hooks, jest, testing-library, accessibility]

# Dependency graph
requires:
  - phase: 02-mascot-module (Plan 01/02)
    provides: Mascot type contract (types.ts), 5 placeholder Lottie assets, lottie-react-native mock + jest.setup.ts registration, mascot asset size gate
provides:
  - resolveMarkers(asset) — defensive Lottie marker frame-range resolution (plain-string + JSON-stringified cm)
  - useIdleScheduler — weighted, pausable idle micro-behavior scheduler (setTimeout-based, active-gated)
  - useReducedStimulus — OS AccessibilityInfo reduce-motion OR host-prop combiner hook
affects: [02-mascot-module Plan 04 (Mascot component orchestration), any future accessibility-sensitive animation work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Injectable random function (default Math.random) on all timing/selection logic for deterministic unit tests"
    - "Ref-forwarding via a post-render useEffect (never mutate ref.current during render body) to keep long-lived setTimeout effects decoupled from prop identity churn"
    - "AccessibilityInfo.addEventListener(...).remove() subscribe/cleanup pattern for OS signal hooks"

key-files:
  created:
    - src/components/Mascot/markers.ts
    - src/components/Mascot/__tests__/markers.test.ts
    - src/components/Mascot/useIdleScheduler.ts
    - src/components/Mascot/__tests__/useIdleScheduler.test.ts
    - src/components/Mascot/useReducedStimulus.ts
    - src/components/Mascot/__tests__/useReducedStimulus.test.ts
  modified: []

key-decisions:
  - "Used a single latestRef object (markers/onPlay/random) synced in a dependency-less useEffect, not per-value refs mutated during render, to satisfy the react-hooks/refs eslint rule (Cannot access refs during render)"
  - "useIdleScheduler.test.ts injects a fixed random (0.5, deterministic 6500ms interval) instead of real Math.random() for its fake-timer assertions, since real-random draws occasionally summed to under the assertion window and produced an intermittent double-fire (~30% flake rate observed)"

patterns-established:
  - "Pattern: hook effects that own a recursive setTimeout loop depend only on the boolean(s) that gate activity (active/reducedStimulus), with all other inputs (callbacks, data) read from a ref synced post-render — avoids re-creating timers on every parent re-render while still picking up latest values"

requirements-completed: [MASC-02]

# Metrics
duration: 8min
completed: 2026-07-02
---

# Phase 2 Plan 3: Mascot Idle Logic Units Summary

**Three pure-ish, test-first logic units for the Mascot module: defensive Lottie marker resolution, a weighted/pausable idle micro-behavior scheduler, and an OS-plus-prop reduced-stimulus combiner — all deterministically unit-tested with fake timers and mocked native APIs, no LottieView rendering involved.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-02T16:18:09Z
- **Completed:** 2026-07-02T16:26:38Z
- **Tasks:** 3 (all `tdd="true"`, each RED→GREEN)
- **Files modified:** 6 created, 0 modified (plus a post-verification fix touching 3 of those 6)

## Accomplishments
- `resolveMarkers()` resolves both plain-string and JSON-stringified `cm` marker encodings defensively (Pitfall 2), proven against the real bundled `mascot_idle.json` asset, with a dev-only `console.warn` when a required marker name is missing
- `useIdleScheduler` fires a weighted-random micro-behavior (blink 50% / glance 30% / postureShift 20%) on a randomized 4-9s interval (12-24s under reduced-stimulus), and provably pauses (clears its pending timeout) the instant `active` flips false — closing the Pitfall 4 gap
- `useReducedStimulus` combines `AccessibilityInfo.isReduceMotionEnabled()` with a host-supplied prop via logical OR, updates live on the `reduceMotionChanged` event, and cleans up its subscription on unmount

## Task Commits

Each task was committed atomically, RED then GREEN per the plan's TDD discipline:

1. **Task 1: resolveMarkers with defensive cm decoding** — `a1472b8` (test, RED) → `296907d` (feat, GREEN)
2. **Task 2: Weighted, pausable idle micro-behavior scheduler** — `22250f2` (test, RED) → `8dad398` (feat, GREEN)
3. **Task 3: useReducedStimulus OS-signal + host-prop combiner** — `b2a54c9` (test, RED) → `26f4c7c` (feat, GREEN)

**Post-verification fix:** `0ee7938` (fix: eslint react-hooks/refs error, array-type lint warning, flaky-test determinism — see Deviations)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/components/Mascot/markers.ts` - `resolveMarkers(asset)` → `Record<string, MarkerRange>`, defensive `JSON.parse(cm).name` with raw-string fallback, dev-only missing-marker warning
- `src/components/Mascot/__tests__/markers.test.ts` - 6 tests: plain-string cm, JSON-stringified cm, malformed-JSON fallback, real asset, empty/missing markers
- `src/components/Mascot/useIdleScheduler.ts` - `pickWeightedMicroBehavior`, `nextIdleIntervalMs`, `useIdleScheduler` hook (setTimeout reschedule loop, active-gated cleanup)
- `src/components/Mascot/__tests__/useIdleScheduler.test.ts` - 7 tests: weight boundaries, interval ranges, fires-while-active, pauses-while-inactive-and-resumes
- `src/components/Mascot/useReducedStimulus.ts` - `useReducedStimulus(hostProp?)` → `{ reducedStimulus }`, OS signal OR host prop, subscribe/cleanup
- `src/components/Mascot/__tests__/useReducedStimulus.test.ts` - 4 tests: OR logic both directions, live update on OS event, unmount cleanup

## Decisions Made
- Ref-forwarding pattern for `useIdleScheduler`'s long-lived timer effect: a single `latestRef` object is synced inside a dependency-less `useEffect` (runs post-render every render) rather than writing `ref.current = value` directly in the function body — the direct-write pattern trips the project's `react-hooks/refs` eslint rule ("Cannot access refs during render"), which fires under this project's React 19.2/ESLint config even though the values aren't used for rendering.
- Deterministic RNG injection in `useIdleScheduler.test.ts`'s two hook-level tests (`random: () => 0.5`, fixed 6500ms interval) instead of the hook's default real `Math.random()` — see Deviations below for the flakiness this fixed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Ref mutated during render tripped `react-hooks/refs` eslint rule**
- **Found during:** Task 2 verification (`npm run verify` after GREEN commit)
- **Issue:** Initial `useIdleScheduler` implementation wrote `markersRef.current = markers` (and similarly for `onPlay`/`random`) directly in the hook's function body, which `eslint-plugin-react-hooks`'s `react-hooks/refs` rule flags as an error ("Cannot access refs during render") since refs must only be read/written outside of render.
- **Fix:** Consolidated the three refs into one `latestRef` object, synced via a dependency-less `useEffect` that runs after every render instead of during it; the scheduling effect's `setTimeout` callback reads from `latestRef.current`.
- **Files modified:** `src/components/Mascot/useIdleScheduler.ts`
- **Verification:** `npm run lint` clean, `npx tsc --noEmit` clean, all 7 hook tests still pass
- **Committed in:** `0ee7938`

**2. [Rule 1 - Bug] `Array<T>` lint warnings**
- **Found during:** Task 2/1 verification (`npm run lint`)
- **Issue:** `markers.ts` and `useIdleScheduler.ts` used `Array<T>` type syntax, which the project's `@typescript-eslint/array-type` rule requires as `T[]`.
- **Fix:** Changed `Array<{ cm: string; tm: number; dr: number }>` → `{ cm: string; tm: number; dr: number }[]` and `Array<[MicroBehavior, number]>` → `[MicroBehavior, number][]`.
- **Files modified:** `src/components/Mascot/markers.ts`, `src/components/Mascot/useIdleScheduler.ts`
- **Verification:** `npm run lint` clean
- **Committed in:** `0ee7938`

**3. [Rule 1 - Bug] Flaky timing assertions in useIdleScheduler.test.ts**
- **Found during:** Repeated `npm run verify` runs after Task 2's GREEN commit — the "fires onPlay ... exactly once" and "does not fire while inactive" tests intermittently failed (observed ~25-35% failure rate over 20 repeated runs) with one extra `onPlay` call.
- **Issue:** The tests used the hook's default `random = Math.random`. Two consecutive real random draws in `[4000, 9000)` occasionally summed to under the 9000ms assertion window (e.g. 4200ms + 4300ms), causing a second legitimate fire within the window the test expected exactly one — this is expected scheduler behavior, not a scheduler bug, but made the *test* non-deterministic.
- **Fix:** Injected a fixed `random: () => 0.5` (deterministic 6500ms interval per RESEARCH.md's `nextIdleIntervalMs` formula) into both hook-level tests, so timer advances land on exact, predictable fire counts.
- **Files modified:** `src/components/Mascot/__tests__/useIdleScheduler.test.ts`
- **Verification:** 20 consecutive `npm run verify`/isolated test runs all green (0 failures) after the fix, versus ~30% flake rate before
- **Committed in:** `0ee7938`

---

**Total deviations:** 3 auto-fixed (all Rule 1 - bug fixes surfaced by verification, no scope creep)
**Impact on plan:** All three fixes are code-quality/test-correctness issues discovered while running the plan's own `<verification>` block (`npm test`, `npx tsc --noEmit`) against the full existing lint/test suite, not new functionality. Scheduler runtime behavior (Pitfall 4 pause/resume, weighted pick, bounded intervals) is unchanged — only the ref-write timing, array-type syntax, and test determinism were fixed.

## Issues Encountered
None beyond the auto-fixed items documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `resolveMarkers`, `useIdleScheduler`, and `useReducedStimulus` are ready for Plan 04 to wire into the `<Mascot />` component's orchestration (idle-state marker playback, reduced-stimulus-aware fades).
- `npm run verify` (lint + hex gate + mascot-asset-size gate + full jest suite, 66 tests) is green.
- No blockers for Plan 04.

---
*Phase: 02-mascot-module*
*Completed: 2026-07-02*
