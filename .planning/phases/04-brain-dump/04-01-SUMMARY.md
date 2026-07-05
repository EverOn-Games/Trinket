---
phase: 04-brain-dump
plan: 01
subsystem: brain-dump
tags: [pure-function, tdd, classifier, parser, jest, typescript]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "data/types.ts DumpItemCategory + Locale unions"
  - phase: 03-co-pilot-end-to-end
    provides: "reconcileActiveSession.ts pure-function TDD precedent (shape to mirror)"
provides:
  - "parseDumpText(raw) — pure newline-stream parser (D-07/D-08)"
  - "classify(text, locale) — pure rule-based PL+EN category classifier (D-09/D-10)"
  - "KEYWORDS_BY_CATEGORY — data-only PL+EN stem lists per category"
affects: [04-02, 04-03, 04-04, 04-05, 04-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure dependency-free TDD function module (no MMKV/React import), mirroring reconcileActiveSession.ts"
    - "Keyword-list-as-data module, mirroring src/components/Mascot/markers.ts"

key-files:
  created:
    - src/features/brain-dump/parseDumpText.ts
    - src/features/brain-dump/__tests__/parseDumpText.test.ts
    - src/features/brain-dump/classify.ts
    - src/features/brain-dump/keywords.ts
    - src/features/brain-dump/__tests__/classify.test.ts
  modified: []

key-decisions:
  - "Exact PL+EN keyword stems chosen at Claude's discretion (D-09), kept short/lowercase for substring matching including Polish inflected forms"
  - "Fixed a tie-break bug in 04-PATTERNS.md's literal classify.ts skeleton: strict '>' alone only protects the zero-score someday default from being displaced by a tie, it does not stop the first category reaching a nonzero score from beating a later category with an identical score — added an explicit equal-score-and-nonzero branch that resets the result to 'someday', satisfying D-09/Pitfall 4's genuine-tie requirement"

patterns-established:
  - "Pure function + TDD: dependency-free module, explicit typed inputs, deterministic output, RED-before-GREEN commit pair, plain describe/it tests with zero mocks"
  - "Keyword-list-as-data: keywords.ts holds no logic, only a typed lookup table, consumed by classify.ts"

requirements-completed: [DUMP-01, DUMP-03]

# Metrics
duration: 8min
completed: 2026-07-05
---

# Phase 4 Plan 1: Brain Dump Pure-Function Foundation Summary

**Dependency-free parseDumpText (D-07/D-08 newline parser) and classify (D-09/D-10 rule-based PL+EN keyword classifier) with a corrected tie-break that guarantees genuine ties always fall back to 'someday'**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-05T01:35:00Z
- **Completed:** 2026-07-05T01:43:31Z
- **Tasks:** 2 (both TDD, RED→GREEN)
- **Files modified:** 5 (all created)

## Accomplishments
- `parseDumpText(raw: string): string[]` — splits on newline, trims each line, drops blank lines, no line-count cap; fully Jest-tested for the empty/single-line/35-line/adversarial-input cases
- `classify(text: string, locale: Locale): DumpItemCategory` — always returns one of the 5 required categories, never null/undefined; PL+EN keyword scoring with a genuine-tie-safe fallback to `'someday'`
- `KEYWORDS_BY_CATEGORY` — PL+EN keyword stem data module for errands/work/home/people (no `someday` list — it's the fallback only)
- Both RED-before-GREEN commit pairs present in git history, confirmed via `git log`

## Task Commits

Each task was committed atomically (TDD RED→GREEN):

1. **Task 1: parseDumpText pure parser** - `06a9d92` (test, RED) → `8d7eac0` (feat, GREEN)
2. **Task 2: classify + keywords rule-based classifier** - `27f831a` (test, RED) → `2aa5fe9` (feat, GREEN)

**Plan metadata:** committed separately after this summary (docs commit)

## Files Created/Modified
- `src/features/brain-dump/parseDumpText.ts` - pure newline-stream parser, no imports
- `src/features/brain-dump/__tests__/parseDumpText.test.ts` - 8 behavior cases including 35-line acceptance and adversarial (long line/emoji/RTL) input
- `src/features/brain-dump/classify.ts` - pure rule-based classifier, imports only `../keywords` and `../../../data/types`
- `src/features/brain-dump/keywords.ts` - data-only PL+EN stem lists per category (errands/work/home/people)
- `src/features/brain-dump/__tests__/classify.test.ts` - 14 behavior cases including PL/EN routing per category, no-match→someday, case-insensitivity, tie→someday, adversarial input

## Decisions Made
- Keyword stems (errands/work/home/people, PL+EN) chosen at Claude's discretion per D-09's "Claude's discretion" note — kept short, lowercase, and substring-friendly so Polish inflected forms (e.g. "sklepie" matching stem "sklep") route correctly without a stemmer library
- Tie-break logic corrected beyond 04-PATTERNS.md's literal skeleton (see Deviations below)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed tie-break logic to satisfy D-09/Pitfall 4's genuine-tie requirement**
- **Found during:** Task 2 (classify + keywords), while writing the RED test for "a genuine tie between two categories resolves to someday, not the last-checked category"
- **Issue:** 04-PATTERNS.md's literal `classify.ts` skeleton uses only `if (score > bestScore) { bestScore = score; bestCategory = category; }` seeded with `bestCategory = 'someday'` / `bestScore = 0`. This correctly protects the zero-score `'someday'` default from being displaced by a zero-score "tie" (no categories match), but it does NOT correctly resolve a genuine tie between two *nonzero*-scoring categories — the first category to reach a given score sets `bestCategory`, and a later category reaching the identical score fails the strict `>` check and is silently ignored, so the first-checked category wins instead of falling back to `'someday'`. This directly contradicts the plan's explicit acceptance criterion ("A genuine tie ... → 'someday', NOT the last-checked category").
- **Fix:** Added an `else if (score === bestScore && score > 0)` branch that resets `bestCategory` to `'someday'` when a later category ties the current best nonzero score. A subsequent category with a strictly higher score still overrides a prior tie via the existing `>` branch (an unambiguous win is not blocked by a prior tie).
- **Files modified:** `src/features/brain-dump/classify.ts`
- **Verification:** New test case `'call about the shop'` (en) — "call" scores 1 for `people`, "shop" scores 1 for `errands`; asserts `classify(...) === 'someday'`. Passes. All 14 classify tests + 8 parseDumpText tests green; full `npm run verify` (eslint + hex gate + mascot-asset gate + jest, 138 tests) passes.
- **Committed in:** `2aa5fe9` (Task 2 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Necessary for correctness — the plan's own explicit acceptance criterion (tie→someday) would otherwise fail for any two-category tie scenario. No scope creep; the fix is contained entirely within `classify.ts`'s scoring loop.

## Issues Encountered
None beyond the tie-break bug documented above (caught by the plan's own RED test before implementation, exactly as TDD is meant to work).

## User Setup Required
None - no external service configuration required. Both modules are pure functions with zero native/runtime dependencies.

## Next Phase Readiness
- `parseDumpText` and `classify` are exported, pure, and fully unit-tested — ready for the capture screen (Plan 04-02+) to call at Save
- `KEYWORDS_BY_CATEGORY` is isolated in its own data module, easy to extend/tune later without touching `classify.ts`'s logic
- No blockers for downstream plans; DUMP-01 (parsing) and DUMP-03 (classification) logic contracts are locked

---
*Phase: 04-brain-dump*
*Completed: 2026-07-05*

## Self-Check: PASSED

All created files verified present on disk; all commit hashes (06a9d92, 8d7eac0, 27f831a, 2aa5fe9, 9747ee8) verified present in git history.
