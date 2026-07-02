---
phase: 01-scaffold-foundations
plan: 02
subsystem: testing
tags: [jest, jest-expo, mmkv, nitro-modules, eslint, flat-config, i18next, eslint-plugin-i18next]

# Dependency graph
requires:
  - phase: 01-01
    provides: Expo SDK 56 scaffold with react-native-mmkv v4, jest-expo, jest, eslint-plugin-i18next already installed in package.json
provides:
  - Jest harness (jest.config.js + jest.setup.ts) running under the jest-expo preset with react-native-mmkv fully mocked in-memory
  - __mocks__/react-native-mmkv.ts — per-id singleton in-memory createMMKV fake (set/getString/getBoolean/getNumber/remove/contains/getAllKeys/clearAll)
  - Passing smoke test (__tests__/harness.smoke.test.ts) proving the harness round-trips and isolates MMKV instances by id
  - Flat eslint.config.js composing eslint-config-expo + eslint-plugin-i18next's no-literal-string rule, scoped to src/app/**/*.tsx and src/features/**/*.tsx
affects: [01-03, 01-04, 01-05, 01-06, mascot-module, co-pilot, brain-dump, starter]

# Tech tracking
tech-stack:
  added: [eslint-config-expo@56.0.4, eslint@9.39.4, "@types/jest@29.5.14"]
  patterns: [in-memory Map-backed MMKV mock keyed by createMMKV id (mirrors real per-id singleton behavior), flat ESLint config composition via array spread of eslint-config-expo/flat + scoped i18next.configs['flat/recommended']]

key-files:
  created: [jest.config.js, jest.setup.ts, __mocks__/react-native-mmkv.ts, __tests__/harness.smoke.test.ts, eslint.config.js]
  modified: [package.json, package-lock.json, tsconfig.json]

key-decisions:
  - "Installed eslint-config-expo (not present after Plan 01, despite being named in RESEARCH.md's Standard Stack) via `npx expo install` — required to compose the flat config the plan's Task 2 specifies; approved in RESEARCH.md's Package Legitimacy Audit"
  - "Added @types/jest as a devDependency and `types: [\"jest\"]` to tsconfig.json — without it, `npx tsc --noEmit` fails strict-mode compilation on jest.setup.ts and the smoke test (describe/it/expect/jest globals unresolved); necessary for CLAUDE.md's TypeScript-strict requirement, not scoped by the plan's file list but required for repo-wide correctness"
  - "MMKV mock instances are keyed by id in a module-level Map so repeated createMMKV({id}) calls with the same id return the same store (mirrors real MMKV's per-id singleton semantics), while distinct ids remain fully isolated"
  - "eslint-plugin-i18next's no-literal-string rule scoped only to src/app/**/*.tsx and src/features/**/*.tsx (not repo-wide) so it doesn't fire on jest.setup.ts, mocks, tests, or theme/i18n modules where literal strings are legitimate"

patterns-established:
  - "Jest+MMKV: any future repository module importing data/mmkv.ts is automatically testable — jest.mock('react-native-mmkv') in jest.setup.ts resolves to the __mocks__ manual mock for every test file, no per-test setup needed"
  - "ESLint flat config: eslint-config-expo/flat spread first, then a files-scoped override block layering plugin-specific rules — this is the pattern later plans (theme/i18n) should follow if they need additional scoped rules rather than editing the base composition"

requirements-completed: [FND-01, FND-02, FND-05]

# Metrics
duration: ~6min
completed: 2026-07-02
---

# Phase 01 Plan 02: Test and Lint Harness Summary

**Jest runs green under jest-expo with an in-memory per-id-singleton MMKV mock (sidestepping the Nitro Modules Jest incompatibility), and a flat ESLint config actively enforces eslint-plugin-i18next's no-literal-string rule over src/app/ and src/features/ JSX.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-07-02T09:38:41Z (approx, following 01-01 plan-metadata commit)
- **Completed:** 2026-07-02T09:44:02Z
- **Tasks:** 2/2 completed
- **Files modified:** 8 (4 created + package.json/package-lock.json/tsconfig.json in Task 1; eslint.config.js created in Task 2)

## Accomplishments
- `jest.config.js` wires the `jest-expo` preset with `setupFilesAfterEnv: ['./jest.setup.ts']`
- `__mocks__/react-native-mmkv.ts` implements `createMMKV({id})` as a per-id singleton backed by an in-memory `Map<string, MMKVPrimitive>`, with `set`/`getString`/`getBoolean`/`getNumber`/`remove`/`contains`/`getAllKeys`/`clearAll` — the full surface RESEARCH.md's Pattern B repositories will call
- `jest.setup.ts` registers `jest.mock('react-native-mmkv')` so every test file resolves the manual mock automatically
- `__tests__/harness.smoke.test.ts` (3 tests) proves: a value round-trips through set/getString/remove, two distinct `id`s stay isolated, and repeated `createMMKV()` calls with the same `id` return the same store — `npx jest --watchAll=false` exits 0, no "Failed to get NitroModules" error
- `eslint.config.js` composes `eslint-config-expo/flat` with `eslint-plugin-i18next`'s `configs['flat/recommended']`, scoped via a `files: ['src/app/**/*.tsx', 'src/features/**/*.tsx']` override block, plus a global `ignores` block for `node_modules/`, `ios/`, `android/`, `.expo/`, `__mocks__/`, `__tests__/`, `*.test.ts(x)`, `scripts/`, `dist/`
- Verified `npx eslint --print-config src/app/index.tsx` includes the `i18next/no-literal-string` rule key
- Verified `npx eslint .` runs to completion with 40 rule violations in the scaffold-default `src/app/index.tsx`/`explore.tsx` screens (expected — these are template placeholder screens Plan 06 will replace with localized shells) and zero configuration/parse errors
- Verified `npx tsc --noEmit` compiles clean under strict mode with the new test/setup files included

## Task Commits

Each task was committed atomically:

1. **Task 1: Jest harness with in-memory MMKV mock and passing smoke test** - `496ef78` (feat)
2. **Task 2: Flat ESLint config with eslint-plugin-i18next no-literal-string rule** - `daa1087` (feat)

_No TDD tasks in this plan; both tasks are `type="auto"` infrastructure tasks._

## Files Created/Modified
- `jest.config.js` - `preset: 'jest-expo'`, `setupFilesAfterEnv: ['./jest.setup.ts']`
- `jest.setup.ts` - registers `jest.mock('react-native-mmkv')`
- `__mocks__/react-native-mmkv.ts` - in-memory per-id-singleton `createMMKV` fake
- `__tests__/harness.smoke.test.ts` - 3-test smoke suite proving the harness round-trips and isolates instances
- `eslint.config.js` - flat config composing `eslint-config-expo/flat` + scoped `eslint-plugin-i18next` `no-literal-string` rule, with repo-wide ignores
- `package.json` / `package-lock.json` - added `eslint-config-expo@56.0.4`, `eslint@9.39.4` (dependencies), `@types/jest@29.5.14` (devDependency)
- `tsconfig.json` - added `"types": ["jest"]` so jest globals resolve under `tsc --noEmit`

## Decisions Made
- Installed `eslint-config-expo` via `npx expo install`, since Plan 01 did not install it despite RESEARCH.md listing it in the Standard Stack — needed for Task 2's flat-config composition; the package was pre-approved in RESEARCH.md's Package Legitimacy Audit (`[OK]`, npm registry, `github.com/expo/expo`)
- Added `@types/jest` + `tsconfig.json`'s `types: ["jest"]` so the jest/describe/it/expect globals used in `jest.setup.ts` and the smoke test resolve under TypeScript strict mode — required by CLAUDE.md's strict-TypeScript mandate; without it `npx tsc --noEmit` fails on every jest-adjacent file
- Kept the MMKV mock's instance registry keyed by `id` (not a fresh Map per `createMMKV()` call) to faithfully mirror real MMKV v4 semantics, where multiple `createMMKV({id: 'x'})` calls across a codebase return the same underlying storage — this matters for repository code in later plans that may call `createMMKV` more than once for the same logical store
- Scoped the `no-literal-string` rule to `src/app/**/*.tsx` and `src/features/**/*.tsx` rather than repo-wide, per the plan's explicit instruction to avoid firing on config/test/mock/theme files

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] eslint-config-expo not installed despite being required by Task 2**
- **Found during:** Task 2 (Flat ESLint config)
- **Issue:** The plan's Task 2 action requires composing `eslint-config-expo`'s flat config, but `npm ls eslint-config-expo` showed it was not present in `package.json` after Plan 01 — Plan 01's SUMMARY.md tech-stack list did not include it, and it is not a transitive dependency of any installed package
- **Fix:** Ran `npx expo install eslint-config-expo eslint` (SDK-56-resolved versions: `eslint-config-expo@56.0.4`, `eslint@9.39.4`); this is a package-manager install of a package explicitly named and approved in RESEARCH.md's Standard Stack and Package Legitimacy Audit, not a speculative substitution
- **Files modified:** `package.json`, `package-lock.json`
- **Verification:** `npm ls eslint-config-expo` resolves; `npx eslint --print-config src/app/index.tsx` succeeds and includes both `expo/*` and `i18next/no-literal-string` rule keys
- **Committed in:** `496ef78` (bundled into Task 1's commit since the install happened before Task 2's file write; package.json/package-lock.json changes are shared infra, not per-task-exclusive)

**2. [Rule 3 - Blocking] Missing @types/jest broke `tsc --noEmit` under strict mode**
- **Found during:** Task 1 (Jest harness), post-implementation verification pass
- **Issue:** `npx tsc --noEmit` failed with `Cannot find name 'describe'/'it'/'expect'` in `__tests__/harness.smoke.test.ts` and `Cannot use namespace 'jest' as a value` in `jest.setup.ts` — `@types/jest` was not installed and `tsconfig.json`'s default type inclusion did not resolve it
- **Fix:** Installed `@types/jest@29.5.14` (matching the project's `jest@29.7.0`) as a devDependency and added `"types": ["jest"]` to `tsconfig.json`'s `compilerOptions`
- **Files modified:** `package.json`, `package-lock.json`, `tsconfig.json`
- **Verification:** `npx tsc --noEmit` exits with zero errors; `npx jest --watchAll=false` still passes (3/3 tests)
- **Committed in:** `496ef78` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking issues preventing task completion or repo-wide TypeScript-strict correctness)
**Impact on plan:** Both fixes are infrastructure installs explicitly named in RESEARCH.md's approved Standard Stack (eslint-config-expo) or required to satisfy CLAUDE.md's hard TypeScript-strict constraint (@types/jest) — zero scope creep, no architectural changes, no new libraries outside what RESEARCH.md already vetted.

## Issues Encountered

None beyond the two auto-fixed deviations above.

## User Setup Required

None — no external service configuration required for this plan.

## Next Phase Readiness

- The Jest harness (`jest.config.js`, `jest.setup.ts`, `__mocks__/react-native-mmkv.ts`) is ready for Wave 3's repository plans (`data/repositories/sessions.ts`, `dumpItems.ts`, `intentions.ts`, `settings.ts`) to import and test against without touching the real native MMKV binding
- The flat ESLint config is ready for the theme/i18n plans: once real screens land under `src/app/` with localized copy, `npx eslint .` will start reporting zero `i18next/no-literal-string` violations as each screen is converted from the scaffold-default placeholder text
- `src/features/**` is already included in the ESLint `files` scope even though that directory does not exist yet — no config change needed when later phases add feature-slice screens there
- The 40 current `no-literal-string` violations are entirely confined to `src/app/index.tsx` and `src/app/explore.tsx` (scaffold-default template screens); Plan 06 (home-hub skeleton per D-03/D-04) will replace these files, at which point the violation count should drop to zero as a natural side effect, not a separate cleanup task

## Self-Check: PASSED

All created files verified present on disk: `jest.config.js`, `jest.setup.ts`, `__mocks__/react-native-mmkv.ts`, `__tests__/harness.smoke.test.ts`, `eslint.config.js`, and this SUMMARY.md itself. Both commit hashes (`496ef78`, `daa1087`) verified present in `git log --oneline --all`.

---
*Phase: 01-scaffold-foundations*
*Completed: 2026-07-02*
