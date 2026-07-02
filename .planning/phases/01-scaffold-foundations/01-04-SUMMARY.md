---
phase: 01-scaffold-foundations
plan: 04
subsystem: i18n
tags: [i18next, react-i18next, expo-localization, cldr-plurals, jest, localization]

# Dependency graph
requires:
  - phase: 01-01
    provides: Expo SDK 56 scaffold with i18next/react-i18next/expo-localization already installed in package.json
  - phase: 01-02
    provides: Jest harness (jest-expo preset, jest.setup.ts, __mocks__/ pattern) and flat ESLint config with eslint-plugin-i18next
provides:
  - i18n/ module (index.ts init, useLocale.ts runtime switcher, locales/en.json, locales/pl.json) —
    the cross-cutting localization contract every future screen consumes
  - resolveInitialLocale(): device-locale resolution per D-07 (Polish device -> pl, else en, no picker)
  - useLocale(): current locale + setLocale() runtime switcher per D-08, ready for the Phase 8 settings control
  - __mocks__/expo-localization.ts — in-memory getLocales() fake, mirroring the established
    __mocks__/react-native-mmkv.ts manual-mock pattern
  - Polish CLDR plural keys (sessionsRemaining_one/_few/_many) proven correct for counts 0/1/2/5/22
affects: [01-05, 01-06, mascot-module, co-pilot, brain-dump, starter, settings]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "i18next JSON format v4 (default since v21) resolves CLDR plural categories via Intl.PluralRules
      with zero compatibilityJSON override — hand-rolled plural branching is explicitly avoided"
    - "Manual native-module mock in root __mocks__/, registered via jest.mock() in jest.setup.ts —
      same pattern as react-native-mmkv, now extended to expo-localization"
    - "useLocale() wraps react-i18next's useTranslation() rather than manual event-listener state,
      since useTranslation already subscribes to i18next's languageChanged event internally"

key-files:
  created:
    - i18n/index.ts
    - i18n/useLocale.ts
    - i18n/locales/en.json
    - i18n/locales/pl.json
    - i18n/__tests__/plurals.test.ts
    - i18n/__tests__/resolveInitialLocale.test.ts
    - __mocks__/expo-localization.ts
  modified:
    - jest.setup.ts

key-decisions:
  - "Reordered the plan's two tasks into a RED-then-GREEN commit sequence (tests committed
    first, confirmed failing against a nonexistent i18n/index.ts; implementation committed
    second, confirmed passing) rather than the plan's literal Task 1 (implementation) -> Task 2
    (tests) ordering — both tasks are tagged tdd=\"true\" and the executor's TDD gate sequence
    requires a test(...) commit before the feat(...) commit; executing the plan's literal order
    would have produced tests-after-implementation with no failing-test proof point"
  - "Added __mocks__/expo-localization.ts + jest.mock('expo-localization') in jest.setup.ts as
    supporting test infra (not explicitly listed in either task's files_modified) — required
    because getLocales() wraps a native module unavailable under Jest, exactly analogous to the
    existing react-native-mmkv mock; without it, importing i18n/index.ts under Jest would throw"
  - "useLocale() delegates to react-i18next's useTranslation() hook (which already subscribes to
    i18next's languageChanged event) instead of hand-rolling a useState + i18n.on/off listener —
    less code, same behavior, avoids a manual-cleanup effect"
  - "Locale JSON files include placeholder-screen copy (home/co-pilot/brain-dump/starter/history/
    settings titles + a 'Start a session?' offer key) beyond the plan's minimum plural-key
    requirement, since Plan 06's shells will consume these and D-04 constrains the skeleton grammar
    (offers, never instructs) from first draft"

patterns-established:
  - "i18n/ is the single source of copy truth, mirroring theme/'s precedent from Plan 03; every
    future screen reads via useTranslation()/t(), never hardcodes JSX text — mechanically enforced
    by eslint-plugin-i18next's no-literal-string rule (Plan 02) once screens land in Plan 06"

requirements-completed: [FND-05]

# Metrics
duration: ~9min
completed: 2026-07-02
---

# Phase 01 Plan 04: i18n Layer (i18next, PL/EN, CLDR Plurals) Summary

**i18next + react-i18next initialized with PL/EN resources, device-locale resolution at boot (D-07: Polish device -> pl, else en, no picker), zero `compatibilityJSON` override so Polish's CLDR plural categories resolve correctly via `Intl.PluralRules`, and a `useLocale()` runtime switcher ready for the Phase 8 settings control (D-08).**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-07-02T09:55:00Z (approx, following 01-03 plan-metadata commit)
- **Completed:** 2026-07-02T10:04:00Z
- **Tasks:** 2/2 completed (executed as RED test commit + GREEN implementation commit)
- **Files modified:** 8 (7 created + jest.setup.ts modified)

## Accomplishments

- `i18n/index.ts` initializes i18next with `initReactI18next`, `en`/`pl` translation resources, `lng` resolved via `resolveInitialLocale()`, `fallbackLng: 'en'`, and explicitly no `compatibilityJSON` key — i18next 26.x's default JSON format v4 handles Polish's `_one`/`_few`/`_many`/`_other` CLDR categories via `Intl.PluralRules` with zero extra config
- `resolveInitialLocale()` reads `getLocales()[0]?.languageCode` from `expo-localization` and returns `'pl'` only when it is exactly `'pl'`, else `'en'` — matches D-07's "device signal decides, no picker screen" rule, including the edge case of a missing/null `languageCode`
- `i18n/useLocale.ts` exports `useLocale()`, wrapping react-i18next's `useTranslation()` to expose the current locale and a `setLocale(next)` that calls `i18n.changeLanguage(next)` — the runtime-switch seam D-08 requires, even though the user-facing control ships in Phase 8
- `i18n/locales/en.json` / `i18n/locales/pl.json` carry placeholder-screen copy (home/co-pilot/brain-dump/starter/history/settings titles, a `home.startSessionOffer` "Start a session?" / "Zacząć sesję?" offer key) written per the shame-free, offer-not-instruct grammar, plus the pluralized `sessionsRemaining` key set
- `__mocks__/expo-localization.ts` provides an in-memory `getLocales()` fake (mirroring `__mocks__/react-native-mmkv.ts`'s established pattern), registered globally via `jest.mock('expo-localization')` in `jest.setup.ts`
- Two test suites (`i18n/__tests__/plurals.test.ts`, `i18n/__tests__/resolveInitialLocale.test.ts`, 10 tests total) prove: Polish CLDR plural selection is correct for counts 0 (`_many`), 1 (`_one`), 2 (`_few`), 5 (`_many`), and 22 (`_few` — the sharp case, since 22 ends in 2 but is outside the 12-14 exception band); English `_one`/`_other` selection for counts 1/2; and `resolveInitialLocale()` resolves `'pl'` for a mocked Polish device, `'en'` for a non-Polish device, and `'en'` for a missing `languageCode`
- Verified `npx tsc --noEmit` compiles clean under strict mode; `npx jest --watchAll=false` passes the full suite (27/27, up from 17/17 after Plan 03); `npx eslint i18n/` reports zero errors (one pre-existing false-positive warning from `eslint-plugin-import`, not `eslint-plugin-i18next`, not blocking); `pl.json`/`en.json` are valid JSON with matching top-level key sets once plural-suffix variants are normalized away

## Task Commits

Executed as a RED-then-GREEN pair (see Deviations for the reordering rationale):

1. **RED: Add failing tests for i18n plurals and locale resolution** - `92fe0ec` (test) — `i18n/__tests__/plurals.test.ts`, `i18n/__tests__/resolveInitialLocale.test.ts`, `__mocks__/expo-localization.ts`, `jest.setup.ts`. Confirmed both suites failed with `Cannot find module '../index'` before implementation existed.
2. **GREEN: Implement i18next init, locale resolution, and PL/EN resources** - `1793940` (feat) — `i18n/index.ts`, `i18n/useLocale.ts`, `i18n/locales/en.json`, `i18n/locales/pl.json`. Confirmed `npx jest i18n --watchAll=false` passes 10/10 and the full suite passes 27/27.

## Files Created/Modified

- `i18n/index.ts` - i18next + react-i18next init, `resolveInitialLocale()` export, default i18n instance export
- `i18n/useLocale.ts` - `useLocale()` hook: current locale + `setLocale()` runtime switcher
- `i18n/locales/en.json` - English strings: screen titles, `home.startSessionOffer`, `sessionsRemaining_one`/`_other`
- `i18n/locales/pl.json` - Polish strings: screen titles, `home.startSessionOffer`, `sessionsRemaining_one`/`_few`/`_many`
- `i18n/__tests__/plurals.test.ts` - 7 tests proving Polish CLDR plural selection (0/1/2/5/22) and English one/other forms
- `i18n/__tests__/resolveInitialLocale.test.ts` - 3 tests proving D-07 device-locale resolution
- `__mocks__/expo-localization.ts` - in-memory `getLocales()` fake for Jest
- `jest.setup.ts` - added `jest.mock('expo-localization')` registration

## Decisions Made

- Reordered the plan's Task 1 (implementation) / Task 2 (tests) into a RED-then-GREEN commit sequence to satisfy the executor's TDD gate requirement (a `test(...)` commit must precede the `feat(...)` commit for any `tdd="true"` task) — see Deviations below for full rationale
- Added `__mocks__/expo-localization.ts` and its `jest.setup.ts` registration as supporting test infrastructure not explicitly named in either task's `files_modified` list, since it is a hard prerequisite for the plan's own tests to run at all (Rule 3 — blocking issue)
- Used react-i18next's `useTranslation()` inside `useLocale()` rather than a hand-rolled `useState` + `i18n.on('languageChanged', ...)` listener — `useTranslation()` already subscribes internally, so this is less code with identical behavior
- Included placeholder-screen title copy (not just the plural key) in `en.json`/`pl.json` beyond the plan's stated minimum, since Plan 06's route shells will need these keys and D-04's grammar constraint (offers, never instructs) is easiest to get right on first draft rather than retrofit

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan's task order (implementation then tests) would violate the TDD RED-before-GREEN gate**
- **Found during:** Pre-execution planning of Task 1 vs Task 2 sequencing
- **Issue:** Both tasks are tagged `tdd="true"`, but Task 1's `<action>` describes only implementation work (no test-writing step, no test files in its `files` list) while Task 2's `<action>` describes writing the test files against Task 1's already-built implementation. Executing literally in plan order would mean Task 2's "RED" phase could never actually fail (the implementation already exists), violating the executor's fail-fast RED-phase rule and producing no `test(...)`-before-`feat(...)` gate-sequence evidence in git history.
- **Fix:** Treated the two tasks' content as a single cohesive RED/GREEN cycle: wrote Task 2's test files first, confirmed both suites failed with `Cannot find module '../index'` (genuine RED), then wrote Task 1's implementation files, confirmed both suites passed (GREEN). Task numbering/content is otherwise unchanged — every file in both tasks' `files_modified` lists was created exactly as specified.
- **Files modified:** No change to scope; only commit ordering changed (tests committed before implementation instead of after)
- **Verification:** `git log --oneline` shows `test(01-04): ...` (`92fe0ec`) immediately before `feat(01-04): ...` (`1793940`); the test commit's suites were confirmed failing pre-implementation via `npx jest i18n --watchAll=false`
- **Committed in:** `92fe0ec` (RED), `1793940` (GREEN)

**2. [Rule 3 - Blocking] `expo-localization`'s `getLocales()` is a native module unavailable under Jest**
- **Found during:** Writing `i18n/__tests__/resolveInitialLocale.test.ts` (RED phase)
- **Issue:** `i18n/index.ts` calls `getLocales()` at module-load time (inside `resolveInitialLocale()`, itself called by `i18n.init()`'s `lng` option). Without a mock, importing `i18n/index.ts` under Jest's Node environment would either throw (native module unavailable) or return undefined, since no `jest-expo`-provided mock exists for `expo-localization` — this is the same class of problem Plan 02 solved for `react-native-mmkv` (Pitfall 1), just for a different native module, and this plan's own `<environment_notes>` flagged it as expected work.
- **Fix:** Created `__mocks__/expo-localization.ts` (in-memory `getLocales` jest.fn(), default-returning an English locale so any incidental import doesn't crash) and registered it via `jest.mock('expo-localization')` in `jest.setup.ts`, following the exact structural precedent of `__mocks__/react-native-mmkv.ts`
- **Files modified:** `__mocks__/expo-localization.ts` (created), `jest.setup.ts` (modified)
- **Verification:** `npx jest i18n --watchAll=false` passes 10/10; `npx jest --watchAll=false` (full suite) passes 27/27 with no native-module errors
- **Committed in:** `92fe0ec` (RED commit, alongside the test files that require this mock to run at all)

---

**Total deviations:** 2 auto-fixed (1 Rule 3 — commit-sequence correction to satisfy the TDD gate; 1 Rule 3 — blocking test-infrastructure gap, same class as Plan 02's MMKV mock)
**Impact on plan:** Zero scope creep — every file named in the plan's two tasks was created exactly as specified; the only changes are (a) commit ordering, to produce genuine RED-then-GREEN evidence, and (b) one small supporting mock file required for the plan's own tests to execute under Jest at all.

## Issues Encountered

- `npx eslint i18n/` reports one warning (not an error) on `i18n/index.ts`: `import/no-named-as-default-member` flags `i18n.use(...)` as potentially meaning to import a named `use` export from `i18next` — this is a false positive from `eslint-plugin-import` confusing i18next's fluent `.use()` chain method with React 19's `use()` hook naming convention. It does not affect the `i18next/no-literal-string` rule (Plan 02's actual FND-05 enforcement mechanism) and does not fail `npx eslint .` (exit code 0). Not fixed, since fixing would require either disabling `import/no-named-as-default-member` project-wide (out of scope, not this plan's rule to own) or an inline suppression comment for a non-blocking warning — flagged here for visibility, not acted on.
- Pre-existing `npm run lint:hex` violations (3, in `src/components/animated-icon.tsx`/`themed-text.tsx`) and `npx eslint .`'s 40 `no-literal-string` violations (scaffold-default `src/app/index.tsx`/`explore.tsx`) remain unchanged from Plan 03 — confirmed out of this plan's scope, still deferred to Plan 06's screen replacement per the established precedent in 01-02-SUMMARY.md and 01-03-SUMMARY.md.

## User Setup Required

None - no external service configuration required for this plan.

## Next Phase Readiness

- `i18n/` is ready for any later plan to consume: `import i18n from '../../i18n'` for the raw instance, `import { useLocale } from '../../i18n/useLocale'` for the runtime switcher, or react-i18next's own `useTranslation()` hook directly (works globally once `i18n/index.ts` has been imported once to run its `i18n.init()` side effect) — no screen work in this plan touched `src/app/_layout.tsx` or any route file
- Plan 06 (app-shell integration) is responsible for: (a) importing `i18n/index.ts` once at app boot (e.g. in `src/app/_layout.tsx`) so `i18n.init()` runs before any screen renders, (b) replacing the scaffold-default placeholder screens with the Expo Router skeleton (`home`, `co-pilot`, `brain-dump`, `starter`, `history`, `settings`) consuming the title/offer keys already authored in `i18n/locales/{en,pl}.json`, and (c) wiring `useLocale()`'s setter to persist the chosen locale once Plan 05's `settings` repository exists (the persistence seam documented in `i18n/useLocale.ts`'s docstring)
- Plan 05 (MMKV repositories) should expose a `settings` repository field for the resolved/selected locale (D-07's "resolved locale persists to the settings repository") — this plan intentionally does not write to any repository, since none exists yet in this wave
- The `__mocks__/expo-localization.ts` pattern is now available for any future test that needs to control the mocked device locale, following the same `jest.mock('module-name')` + root-level manual-mock convention established by Plan 02 for `react-native-mmkv`

## Self-Check: PASSED

All created files verified present on disk: `i18n/index.ts`, `i18n/useLocale.ts`, `i18n/locales/en.json`, `i18n/locales/pl.json`, `i18n/__tests__/plurals.test.ts`, `i18n/__tests__/resolveInitialLocale.test.ts`, `__mocks__/expo-localization.ts`. Both commit hashes (`92fe0ec`, `1793940`) verified present in `git log --oneline --all`.

---
*Phase: 01-scaffold-foundations*
*Completed: 2026-07-02*
