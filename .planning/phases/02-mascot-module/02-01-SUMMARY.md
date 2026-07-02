---
phase: 02-mascot-module
plan: 01
subsystem: ui
tags: [react-native, typescript, zustand, mmkv, theme-tokens]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: theme/tokens.ts dark palette, MMKV settings repo/store (Zustand persist), schema denylist guard, hex-literal gate
provides:
  - "src/components/Mascot/types.ts — the public MascotState/MascotProminence/MascotSize/MascotProps contract every later Phase 2+ plan imports"
  - "MASC-03 structural guard (noNegativeStates.test.ts) preventing any 6th/negative mascot state from being added"
  - "theme.colors.mascotGlow ('#F2C988') — mascot-only amber accent token"
  - "settings.mascotProminence (default 'prominent') persisted in the existing MMKV settings blob"
affects: [02-mascot-module (Plans 02-05), Phase 8 Settings screen]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Source-scan structural guard (readFileSync + regex extraction + expect().toEqual()) applied to a type-union file, mirroring schema.denylist.test.ts's idiom"
    - "Cross-module type reuse via relative import (data/types.ts imports MascotProminence from src/components/Mascot/types.ts) instead of redeclaring a union"

key-files:
  created:
    - src/components/Mascot/types.ts
    - src/components/Mascot/__tests__/noNegativeStates.test.ts
  modified:
    - theme/tokens.ts
    - theme/__tests__/tokens.test.ts
    - data/types.ts
    - data/stores/useSettingsStore.ts
    - data/repositories/settings.ts
    - data/repositories/__tests__/repositories.test.ts
    - data/repositories/__tests__/schema.denylist.test.ts

key-decisions:
  - "mascotProminence typed via import of the Mascot module's own MascotProminence union (not a redeclared inline union in data/types.ts), avoiding drift between the two definitions"
  - "setMascotProminence excluded from schema.denylist.test.ts's action-function destructure, matching the existing setLocale/setNotificationsOptIn exclusion pattern, so the runtime probe checks only persisted data shape"

patterns-established:
  - "Public component type contracts for Phase 2+ modules live in <Module>/types.ts and are guarded by a source-scan structural test colocated in <Module>/__tests__/"

requirements-completed: [MASC-01, MASC-03]

# Metrics
duration: ~10min
completed: 2026-07-02
---

# Phase 2 Plan 1: Mascot Contracts Summary

**Locked the Phase 2 interface layer: the 5-value `MascotState` union with a structural no-6th-state guard, the `mascotGlow` amber accent token, and the `mascotProminence` settings field — all before any rendering or animation code exists.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-07-02T15:58:00Z (approx.)
- **Completed:** 2026-07-02T16:08:48Z
- **Tasks:** 3 completed
- **Files modified:** 9 (2 created, 7 modified)

## Accomplishments
- `src/components/Mascot/types.ts` exports the public `MascotState`/`MascotProminence`/`MascotSize`/`MascotProps` contract exactly matching the UI-SPEC, deliberately with no `style` prop
- `noNegativeStates.test.ts` mechanically forbids a 6th or negative/directive mascot state literal from ever being added (MASC-03)
- `theme.colors.mascotGlow` (`#F2C988`) landed as the mascot-only accent token, covered by the existing hex-format `it.each` test; `mascotGlowDeep` deliberately not added (D-08)
- `mascotProminence` (default `'prominent'`) persists in the existing `settings` MMKV blob via `useSettingsStore`/`settingsRepo`, reusing the Mascot module's own type rather than redeclaring it

## Task Commits

Each task was committed atomically:

1. **Task 1: Add mascotGlow accent token (D-08)** - `ce67b44` (feat)
2. **Task 2: Define Mascot public type contract + MASC-03 structural guard** - `5a67b91` (feat)
3. **Task 3: Add mascotProminence to settings store/repo (D-05)** - `41c79d5` (feat)

**Plan metadata:** committed separately below

_Note: no TDD-mode tasks in this plan (type=execute); each task committed as a single feat commit including its guard test._

## Files Created/Modified
- `theme/tokens.ts` - Added `mascotGlow: string` to `ThemeTokens.colors` and `'#F2C988'` to `darkTokens.colors`
- `theme/__tests__/tokens.test.ts` - Extended `REQUIRED_COLOR_KEYS` with `'mascotGlow'`
- `src/components/Mascot/types.ts` - New: public `MascotState`/`MascotProminence`/`MascotSize`/`MascotProps` contract
- `src/components/Mascot/__tests__/noNegativeStates.test.ts` - New: MASC-03 source-scan structural guard
- `data/types.ts` - Added `mascotProminence: MascotProminence` to `SettingsState`, importing the type from the Mascot module
- `data/stores/useSettingsStore.ts` - Added `mascotProminence` field (default `'prominent'`) and `setMascotProminence` action
- `data/repositories/settings.ts` - Wired `mascotProminence` through `get()`/`update()`
- `data/repositories/__tests__/repositories.test.ts` - Added default-value and round-trip coverage for `mascotProminence`
- `data/repositories/__tests__/schema.denylist.test.ts` - Excluded `setMascotProminence` from the action-function destructure, matching existing exclusions

## Decisions Made
- Reused the Mascot module's `MascotProminence` union in `data/types.ts` via `import type` rather than redeclaring an inline union, so the two never drift out of sync
- Extended `schema.denylist.test.ts`'s existing action-function exclusion pattern to include the new `setMascotProminence` setter, keeping the runtime probe scoped to persisted data only

## Deviations from Plan

None - plan executed exactly as written. The plan's own text anticipated the `setMascotProminence` exclusion in `schema.denylist.test.ts` implicitly (file was listed in `files_modified`); this was applied for consistency with the established pattern rather than being a deviation from stated intent.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 02 (Lottie placeholder assets + mock) can now build against a locked `MascotState`/`MascotProps` contract
- Plan 03+ (Mascot component itself) can import `theme.colors.mascotGlow` and `MascotProminence` with no further contract changes expected
- No blockers identified for subsequent Phase 2 plans

---
*Phase: 02-mascot-module*
*Completed: 2026-07-02*

## Self-Check: PASSED

All created files verified present on disk; all task commit hashes (ce67b44, 5a67b91, 41c79d5) and the summary commit (947a0e8) verified present in git log.
