---
phase: 02-mascot-module
plan: 04
subsystem: ui
tags: [react-native, lottie-react-native, reanimated, jest, react-hooks-refs]

# Dependency graph
requires:
  - phase: 02-mascot-module (Plans 01-03)
    provides: MascotState/MascotProminence/MascotSize/MascotProps type contract (types.ts), marker frame-range resolution (markers.ts), idle micro-behavior scheduler (useIdleScheduler.ts), reduced-stimulus signal combiner (useReducedStimulus.ts), 5 placeholder Lottie assets, lottie-react-native jest mock, size gate script
provides:
  - "src/components/Mascot/Mascot.tsx — the public <Mascot /> component, single persistent LottieView owner"
  - "Jest configuration to run Reanimated 4 / react-native-worklets under Jest (jest.setup.ts mocks)"
  - "mockLottieRef stable export in __mocks__/lottie-react-native.tsx for ref-level test assertions"
affects: [02-05 (Mascot integration/device checkpoint), Phase 3 Co-pilot (mounts <Mascot /> for presence/dozing states)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Asset caching relies on require()'s own Metro/Node module-registry cache rather than a manual per-instance ref cache — the react-hooks/refs ESLint rule forbids reading/writing ref.current during render"
    - "Jest mocks for react-native-worklets and react-native-reanimated registered via jest.setup.ts (official mock.js/lib paths), required for any future Reanimated usage under this test suite"
    - "Manual __mocks__ files with additional test-support exports (e.g. mockLottieRef) must be imported via the bare module specifier in test files, never a relative path into __mocks__/ — relative-path imports resolve to a second, disconnected module instance under Jest's automock system"

key-files:
  created:
    - src/components/Mascot/Mascot.tsx
    - src/components/Mascot/__tests__/Mascot.test.tsx
  modified:
    - __mocks__/lottie-react-native.tsx
    - jest.setup.ts

key-decisions:
  - "Dropped the per-instance ref-based asset cache described in the plan's literal wording in favor of require()'s own module-registry caching, to satisfy the react-hooks/refs ESLint rule (refs cannot be read/written during render)"
  - "Registered react-native-worklets' and react-native-reanimated's official Jest mocks in jest.setup.ts — first real Reanimated usage this phase surfaced a native-init crash under Jest that a custom Jest resolver could not cleanly fix without destabilizing other manual mocks"
  - "mockLottieRef test assertions must import via the bare 'lottie-react-native' specifier, not a relative path into __mocks__/, to guarantee the same module instance Mascot.tsx resolves via jest.mock automock"

patterns-established:
  - "Pattern: lazy per-state require() loader function + require()'s own cache (no manual ref-cache) for MASC-04-style perf contracts under React's Rules of Hooks"
  - "Pattern: Reanimated/Worklets Jest setup (jest.mock('react-native-worklets', ...) then jest.mock('react-native-reanimated', ...), in that order) for any future component using Reanimated"

requirements-completed: [MASC-01, MASC-03, MASC-04]

# Metrics
duration: 32min
completed: 2026-07-02
---

# Phase 2 Plan 04: Mascot Component (Public API) Summary

**Public `<Mascot />` component — single persistent LottieView rendering all 5 states with lazy-cached assets, Reanimated opacity fade, prominence-driven sizing, idle micro-behaviors via the Plan 03 scheduler, and safe degradation on unknown state / failed asset load.**

## Performance

- **Duration:** 32 min
- **Started:** 2026-07-02T16:28:15Z
- **Completed:** 2026-07-02T17:00:00Z
- **Tasks:** 2 (RED test, GREEN implementation)
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- `<Mascot />` renders each of the 5 states (`greeting`, `idle`, `presence`, `dozing`, `acknowledge`) via the matching `mascot_<state>.json` asset on a single persistent `LottieView` — verified across rapid state changes (never a second mounted instance)
- One-shot states (`greeting`, `acknowledge`) fire `onStateAnimationComplete(state)` exactly once, timed from the asset's own `op`/`fr` duration
- Idle state drives the Plan 03 `useIdleScheduler`, calling the mocked `LottieView` ref's `play(startFrame, endFrame)` with a valid marker frame range, then resumes the base idle loop after the segment's own duration
- `prominence='hidden'` renders no visible content (0×0 wrapper) while the scheduler is explicitly paused per the UI-SPEC's prominence table; state changes still apply without error
- An unrecognized `state` prop clamps to `idle` (V5/T-02-05) instead of crashing; a failed asset load falls back to the static `surfaceElevated` box with a dev-only `console.warn`
- Got Reanimated 4 / react-native-worklets working under Jest for the first time this project (jest.setup.ts mocks) — unblocks any future Reanimated usage

## Task Commits

Each task was committed atomically:

1. **Task 1: Write Mascot.test.tsx contract (RED)** - `b3c26b8` (test)
2. **Task 2: Implement Mascot.tsx to GREEN** - `216fe58` (feat)

**Plan metadata:** _pending_ (docs: complete plan — this commit)

## Files Created/Modified
- `src/components/Mascot/Mascot.tsx` - Public `<Mascot />` component; single LottieView owner, lazy per-state asset loading, Reanimated fade, prominence sizing, idle scheduler integration, one-shot completion, safe degradation
- `src/components/Mascot/__tests__/Mascot.test.tsx` - Contract tests for all 6 required behaviors (MASC-01 state→asset mapping ×5, MASC-04 single-instance, MASC-01 one-shot completion ×2, MASC-02 idle integration, MASC-04 hidden prominence, V5 unknown-state clamp)
- `__mocks__/lottie-react-native.tsx` - Added `mockLottieRef`, a stable module-scoped export (was previously recreated per-render inside `useImperativeHandle`), so tests can assert imperative `play()`/etc. calls
- `jest.setup.ts` - Registered `react-native-worklets` and `react-native-reanimated`'s official Jest mocks (first real Reanimated usage this phase)

## Decisions Made
- Asset caching implemented via `require()`'s own module-registry cache instead of a manual `useRef` map, because the `react-hooks/refs` ESLint rule (part of `eslint-config-expo`'s current ruleset) forbids reading or writing `ref.current` during render — the plan's literal "cached in a ref map" wording was infeasible under this lint gate without a functionally-equivalent alternative (require() caching achieves the same "no redundant JSON decode" outcome, and is arguably better since it's shared process-wide rather than per-instance)
- Reanimated/Worklets Jest mocks registered directly (`jest.mock('react-native-worklets', ...)`, `jest.mock('react-native-reanimated', ...)`) rather than via a custom Jest `resolver` — a custom resolver pointed at `react-native-worklets/jest/resolver.js` was tried first (it is the package's own shipped resolver, intended for exactly this native-init problem) but empirically destabilized `lottie-react-native`'s manual-mock resolution in the larger, multi-`describe`-block test file, causing `<LottieView>` to silently render no children. Mocking the two packages directly is more surgical and avoids the interaction entirely.
- Test-file `mockLottieRef` import fixed to use the bare `'lottie-react-native'` specifier (via `require()` + type assertion) instead of a relative path into `__mocks__/` — root-caused via bisection that a relative-path import creates a second, disconnected module instance from the one Jest's automock machinery hands to `Mascot.tsx`'s own `import LottieView from 'lottie-react-native'`, silently breaking `LottieView` rendering everywhere in the file once both import styles coexisted

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Reanimated 4 / react-native-worklets crash under Jest ("Native part of Worklets doesn't seem to be initialized")**
- **Found during:** Task 2 (first `import ... from 'react-native-reanimated'` in app code this project)
- **Issue:** `react-native-worklets` (Reanimated 4's split-out worklets peer) tries to initialize a real native runtime on import, which doesn't exist under Jest's Node environment, crashing the whole test file
- **Fix:** Registered the official Jest mocks for both packages in `jest.setup.ts` (`react-native-worklets/lib/module/mock`, then `react-native-reanimated/mock`, in that dependency order)
- **Files modified:** `jest.setup.ts`
- **Verification:** `npm test -- --testPathPattern=Mascot.test` green
- **Committed in:** `216fe58` (Task 2 commit)

**2. [Rule 1 - Bug] `react-hooks/refs` violations from a render-phase ref-based asset cache**
- **Found during:** Task 2, `npm run lint`
- **Issue:** The plan's literal per-state asset cache (`useRef` map, read/written inside two `useMemo` computations) violates the `react-hooks/refs` rule — refs may only be read/written outside render (effects, event handlers, callbacks)
- **Fix:** Removed the manual ref-cache; `asset`/`idleMarkers` now compute directly from `loadAssetSafe(currentState)` inside plain `useMemo`s with no ref access. `require()`'s own module-registry caching provides the equivalent "no redundant decode on re-entry" behavior. The idle asset's `fr` (needed inside the `handleIdleMicroBehavior` timer callback, which runs outside render) is read from the closured `asset` value instead of a ref.
- **Files modified:** `src/components/Mascot/Mascot.tsx`
- **Verification:** `npm run lint` clean (0 errors), full test suite still green (77/77)
- **Committed in:** `216fe58` (Task 2 commit)

**3. [Rule 1 - Bug] `mockLottieRef` relative-path import silently broke `<LottieView>` rendering across the whole test file**
- **Found during:** Task 2 verification — `Mascot.test.tsx`'s first `describe` block (state→asset mapping) failed with "Unable to find an element with testID: lottie-view-mock" only once the idle-scheduler-integration block (importing `mockLottieRef`) was also present in the file
- **Issue:** `import { mockLottieRef } from '../../../../__mocks__/lottie-react-native'` (a relative path) resolves to a module instance separate from the one Jest's `jest.mock('lottie-react-native')` automock hands to `Mascot.tsx`'s bare-specifier import, causing `<LottieView>` to stop rendering any children anywhere in the file once both import styles were exercised in the same run
- **Fix:** Changed the test's import to `const { mockLottieRef } = require('lottie-react-native') as { mockLottieRef: LottieViewRef };` (bare specifier, same resolution path as production code)
- **Files modified:** `src/components/Mascot/__tests__/Mascot.test.tsx`
- **Verification:** Full `Mascot.test.tsx` suite green (11/11); root-caused via systematic bisection (isolated minimal reproduction with `describe` blocks 1+4 only, then narrowed to the import statement)
- **Committed in:** `216fe58` (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 blocking, 2 bugs)
**Impact on plan:** All three were necessary to reach a genuinely passing test suite and clean lint gate; none represent scope creep against the plan's stated contract. The asset-cache redesign (deviation 2) is a implementation-detail change only — the observable MASC-04 perf contract (no redundant decode on re-entry, lazy per-state load) is preserved.

## Issues Encountered
- Root-causing deviation 3 required extensive bisection (binary-search over `describe` blocks, then over individual lines within a block) because the symptom (empty children on `<LottieView>`) appeared file-size-dependent and was initially mistaken for an asset-load failure, a Reanimated mock issue, and a custom-resolver side effect before being isolated to the specific import statement. Documented at length in code comments in both `Mascot.test.tsx` and `__mocks__/lottie-react-native.tsx` so a future contributor doesn't reintroduce the relative-path import.

## User Setup Required

None - no external service configuration required. No native module was added this plan (lottie-react-native and Reanimated were both already installed by Plan 02-02); no `npx expo prebuild --clean` is required for this plan's changes (jest.setup.ts and __mocks__/ are test-only, not native inputs).

## Next Phase Readiness
- `<Mascot />` is ready to be mounted by Plan 02-05 (host integration + Android device checkpoint) and later by Phase 3 (Co-pilot presence/dozing states)
- Reanimated is now proven to work under this project's Jest setup — future phases needing Reanimated animations do not need to re-solve the Worklets Jest-mock problem
- MASC-04's on-device smoothness criterion is still unverified on real Android hardware — that remains Plan 02-05's `checkpoint:human-verify` per D-03/D-04, not closed by this plan

## Self-Check: PASSED

- FOUND: src/components/Mascot/Mascot.tsx
- FOUND: src/components/Mascot/__tests__/Mascot.test.tsx
- FOUND: .planning/phases/02-mascot-module/02-04-SUMMARY.md
- FOUND commit: b3c26b8 (RED test)
- FOUND commit: 216fe58 (GREEN implementation)
- FOUND commit: 727249d (SUMMARY)

---
*Phase: 02-mascot-module*
*Completed: 2026-07-02*
