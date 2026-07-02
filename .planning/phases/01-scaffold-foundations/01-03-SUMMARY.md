---
phase: 01-scaffold-foundations
plan: 03
subsystem: ui
tags: [theme, design-tokens, react-context, jest, testing-library]

# Dependency graph
requires:
  - phase: 01-01
    provides: Expo SDK 56 scaffold with TypeScript strict, src/app/ routes (@/* alias)
  - phase: 01-02
    provides: Jest harness (jest-expo preset) and flat ESLint config with eslint-plugin-i18next
provides:
  - theme/ module (tokens.ts, ThemeProvider.tsx, useTheme.ts, index.ts) — the cross-cutting
    styling contract every future screen consumes
  - A typed ThemeTokens shape (colors/spacing/radii/typography/elevation) with no dark-prefixed
    keys, ready for a future lightTokens without a type refactor (deferred POLI-01)
  - darkTokens: a genuine earthy, night-cozy dark palette anchor (not a gray placeholder)
  - scripts/check-hex-literals.mjs — comment-aware static gate enforcing D-02 (color values
    confined to theme/tokens.ts), wired as `npm run lint:hex`
affects: [01-04, 01-05, 01-06, mascot-module, co-pilot, brain-dump, starter, settings]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Custom React Context theme provider (not React Navigation's ThemeProvider/DarkTheme) —
      dark-only MVP has no runtime light/dark switch to delegate"
    - "Token consumption contract: components import useTheme() only, never theme/tokens.ts
      directly and never inline hex literals — mechanically enforced by check-hex-literals.mjs"
    - "Comment-aware static-scan gate pattern (strip // lines and trailing // comments before
      regex matching) for structural code-content guards, reusable for future lint-adjacent
      checks beyond ESLint's own rule surface"

key-files:
  created:
    - theme/tokens.ts
    - theme/ThemeProvider.tsx
    - theme/useTheme.ts
    - theme/index.ts
    - theme/__tests__/tokens.test.ts
    - scripts/check-hex-literals.mjs
  modified:
    - package.json

key-decisions:
  - "Followed RESEARCH Pattern C's anchor palette values directly (deep warm near-black
    background #14120F, warm-brown surfaces, cream text, warm-amber accent #D89B4A) per
    CONTEXT.md's Claude's-discretion note — genuine earthy attempt, not a gray placeholder,
    understood to be replaced wholesale when the external Claude Design system lands"
  - "Adjusted the hex-literal gate's scan globs from the plan's app/**, features/**,
    components/** to src/app/**, src/features/**, src/components/** — routes and components
    live under src/ per 01-01-SUMMARY.md's live-template structure, not a top-level app/"
  - "check-hex-literals.mjs currently exits 1 against src/components/animated-icon.tsx and
    themed-text.tsx (3 pre-existing scaffold-default hex literals) — expected per this plan's
    own Task 2 action text ('the gate should pass, or list scaffold violations that Plan 06
    will fix when it replaces screens'); mirrors the precedent set in 01-02-SUMMARY.md for the
    40 eslint no-literal-string violations in the same scaffold-default files"

patterns-established:
  - "theme/ is the single source of visual truth; every future screen/component reads via
    useTheme(), never imports theme/tokens.ts or hardcodes a hex value — verified structurally
    by `npm run lint:hex`, not just by convention"

requirements-completed: [FND-04]

# Metrics
duration: ~10min
completed: 2026-07-02
---

# Phase 01 Plan 03: Theme Token Module Summary

**Typed `theme/` module (ThemeTokens type, earthy night-cozy `darkTokens` palette, custom React context `ThemeProvider`, `useTheme()` hook) plus a comment-aware `scripts/check-hex-literals.mjs` static gate enforcing D-02's token-only styling contract, wired as `npm run lint:hex`.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-07-02T09:47:00Z (approx, following 01-02 plan-metadata commit)
- **Completed:** 2026-07-02T09:51:33Z
- **Tasks:** 2/2 completed
- **Files modified:** 7 (5 created in Task 1/Task 2 combined + 1 test file expanded + package.json)

## Accomplishments

- `theme/tokens.ts` exports a named `ThemeTokens` type (colors, spacing, radii, typography, elevation groups) and a `darkTokens` value using a genuine earthy, night-cozy, dark-only anchor palette (deep warm near-black `#14120F` background, warm-brown surfaces, cream `#F2E9DC` text, warm-amber `#D89B4A` accent) — not a neutral gray placeholder, per D-01
- The `ThemeTokens` type contains no `dark`-prefixed keys, verified by a dedicated test, so a future `lightTokens` can reuse the same shape without a type refactor (deferred POLI-01)
- `theme/ThemeProvider.tsx` is a custom React context provider (deliberately not React Navigation's `ThemeProvider`/`DarkTheme`) supplying `darkTokens`; `theme/useTheme.ts` exposes the `useTheme()` hook as the only sanctioned consumption path (D-02); `theme/index.ts` barrels all four exports
- `theme/__tests__/tokens.test.ts` (14 tests) proves: all 8 required color keys match a hex-color regex, spacing/radii/typography.scale/elevation groups all hold numeric values, the type has no dark-prefixed keys, and `useTheme()` rendered under `ThemeProvider` returns `darkTokens`
- `scripts/check-hex-literals.mjs` statically scans `src/app/**/*.tsx`, `src/features/**/*.tsx`, `src/components/**/*.tsx` for hex color literals (`#RGB`/`#RGBA`/`#RRGGBB`/`#RRGGBBAA`) outside `theme/`, is comment-aware (skips full-line `//` comments and strips trailing `// ...` comments before matching — verified via a temporary probe file with both patterns), and is wired as `npm run lint:hex`
- ThemeProvider was deliberately NOT mounted into `src/app/_layout.tsx` in this plan — that wiring is explicitly deferred to Plan 06 (app-shell integration) to avoid a merge conflict with the concurrent i18n plan in the same wave, per this plan's action text
- `npx tsc --noEmit` compiles clean under strict mode; `npx jest theme --watchAll=false` and the full `npx jest --watchAll=false` (17/17 tests across both suites) pass; `npx eslint theme/` reports zero violations

## Task Commits

Each task was committed atomically, following the TDD RED/GREEN cycle since Task 1 is tagged `tdd="true"`:

1. **Task 1 RED: Add failing test for theme token module** - `04c28dd` (test)
2. **Task 1 GREEN: Implement earthy dark theme token module, provider, and hook** - `d42cf73` (feat)
3. **Task 2: Expand token shape test and add hex-literal gate** - `83ff24a` (feat)

_Task 2 is `type="auto"` (not TDD-gated); it extends the test file created during Task 1's RED phase with the fuller acceptance-criteria assertions and adds the hex-literal gate in a single commit._

## Files Created/Modified

- `theme/tokens.ts` - `ThemeTokens` type + `darkTokens` earthy anchor palette
- `theme/ThemeProvider.tsx` - custom React context provider supplying `darkTokens`
- `theme/useTheme.ts` - `useTheme()` hook, the only sanctioned token consumption path
- `theme/index.ts` - barrel export (`ThemeProvider`, `useTheme`, `darkTokens`, `ThemeTokens`)
- `theme/__tests__/tokens.test.ts` - 14-test suite covering shape, hex validity, and provider wiring
- `scripts/check-hex-literals.mjs` - comment-aware D-02 structural gate
- `package.json` - added `lint:hex` npm script

## Decisions Made

- Used RESEARCH.md's Pattern C anchor palette values directly rather than deriving new ones — CONTEXT.md explicitly delegates exact token values to Claude's discretion, and the research values already satisfy the "calm night-shift raccoon habitat" brief (soft rounded radii, generous spacing, warm-amber accent)
- Adjusted the hex-literal gate's scan globs from the plan's literal `app/**`, `features/**`, `components/**` to `src/app/**`, `src/features/**`, `src/components/**` per this task's `<environment_notes>` — the live SDK 56 template places routes/components under `src/`, not a top-level `app/` directory (established in 01-01-SUMMARY.md)
- `theme/__tests__/tokens.test.ts` uses `await render(...)` for `@testing-library/react-native@14.0.1`'s async `render()` API (returns a `Promise`, not a synchronous result) — required for strict-mode `tsc --noEmit` to pass

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `@testing-library/react-native` v14's `render()` returns a Promise, not a synchronous result**
- **Found during:** Task 1 GREEN phase, `npx tsc --noEmit` verification
- **Issue:** The test's initial `const { getByText } = render(...)` failed strict-mode compilation with `Property 'getByText' does not exist on type 'Promise<...>'` — v14 changed `render()` to an async API (undocumented in the plan/research, which predates checking this specific library version's exact signature)
- **Fix:** Changed to `const { getByText } = await render(...)` inside an `async` test callback
- **Files modified:** `theme/__tests__/tokens.test.ts`
- **Verification:** `npx tsc --noEmit` exits clean; `npx jest theme --watchAll=false` passes
- **Committed in:** `d42cf73` (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug fix required for the test to compile and run correctly under strict TypeScript)
**Impact on plan:** Zero scope creep — a one-line API-shape fix required by the installed library version, not a design change.

## Issues Encountered

- `scripts/check-hex-literals.mjs` currently exits 1 (3 violations: `src/components/animated-icon.tsx:136`, `:143`, `src/components/themed-text.tsx:66`) because the scaffold-default template components still contain inline hex literals. This is expected and explicitly anticipated by this plan's own Task 2 action text ("the gate should pass, or list scaffold violations that Plan 06 will fix when it replaces screens") — Plan 06 (home-hub skeleton, D-03/D-04) will replace these template files, at which point `npm run lint:hex` should start exiting 0 as a natural side effect, mirroring the precedent set by 01-02-SUMMARY.md's 40 `no-literal-string` scaffold violations awaiting the same Plan 06 cleanup.
- Verified the gate's comment-awareness and positive-detection logic with two temporary probe files (one with hex values only inside `//` comments — correctly ignored; one with a hex value in actual code — correctly detected and reported), then removed both probes before committing. No probe files are present in the final tree.

## User Setup Required

None - no external service configuration required for this plan.

## Next Phase Readiness

- `theme/` is ready for any later plan to consume via `import { useTheme } from '@/../theme'` (or a relative import, since `theme/` lives at repo root outside `src/`) — no screen work in this plan touched `src/app/_layout.tsx` or any route file
- Plan 06 (app-shell integration) is responsible for mounting `<ThemeProvider>` into `src/app/_layout.tsx` and replacing the scaffold-default `src/components/animated-icon.tsx`/`themed-text.tsx` hex literals with token-driven styling, at which point `npm run lint:hex` should pass cleanly
- `npm run lint:hex` is available as a repeatable structural check for all future plans touching `src/app/`, `src/features/`, or `src/components/`

## Self-Check: PASSED

All created files verified present on disk: `theme/tokens.ts`, `theme/ThemeProvider.tsx`, `theme/useTheme.ts`, `theme/index.ts`, `theme/__tests__/tokens.test.ts`, `scripts/check-hex-literals.mjs`. All three commit hashes (`04c28dd`, `d42cf73`, `83ff24a`) verified present in `git log --oneline --all`.

---
*Phase: 01-scaffold-foundations*
*Completed: 2026-07-02*
