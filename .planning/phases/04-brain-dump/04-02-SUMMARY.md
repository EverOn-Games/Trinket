---
phase: 04-brain-dump
plan: 02
subsystem: data + i18n
tags: [mmkv, i18next, draft-persistence, copywriting]

# Dependency graph
requires:
  - phase: 04-brain-dump (plan 01)
    provides: DumpItem/DumpItemCategory types, classify() pure function, keyword lists
provides:
  - Draft-persistence MMKV wrapper (data/draft.ts) for D-06 auto-restore
  - All text-side capture/list/category/item i18n copy (brainDump.* namespace, en+pl)
affects: [04-03 (capture + list screen), 04-04, 04-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Non-indexed single-key MMKV wrapper (plain string value, no JSON) for transient UI state that must stay outside the repository/schema-denylist surface"

key-files:
  created:
    - data/draft.ts
    - data/__tests__/draft.test.ts
  modified:
    - i18n/locales/en.json
    - i18n/locales/pl.json

key-decisions:
  - "Draft key literal 'draft:brainDump' (D-06) — manually and test-asserted clean against all 8 schema-denylist stems"
  - "PL category label 'Do załatwienia' (errands) shipped as draft copy pending native-speaker review, per UI-SPEC Flag 6 — not a blocker for this plan"

patterns-established:
  - "TDD RED→GREEN commit pairing for a thin MMKV wrapper (test-first, module temporarily absent to force a genuine failing run before implementing)"

requirements-completed: [DUMP-01]

# Metrics
duration: 12min
completed: 2026-07-05
---

# Phase 04 Plan 02: Draft Persistence + Text-Side i18n Copy Summary

**Draft-persistence MMKV wrapper (D-06) plus all text-capture/list/category/item i18n copy (en+pl) needed for the 04-03 capture and list screens to render entirely through `t()`.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-05T01:47:57Z (approx, first task start)
- **Completed:** 2026-07-05
- **Tasks:** 2 completed
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- `data/draft.ts` round-trips in-progress capture text through a single `'draft:brainDump'` MMKV key, returns `''` (never throws/undefined) on an absent/empty key, and is provably clean against all 8 schema-denylist stems (streak, daily, completionrate, daychain, lastactive, activedays, diagnosis, adhd)
- Extended `brainDump.*` in both `i18n/locales/en.json` and `i18n/locales/pl.json` with 20 new keys (capture text-side, list, 5 category labels, item affordances) copied verbatim from `04-UI-SPEC.md` — no invented copy
- Full `npm run verify` (eslint + hex gate + jest, 18 suites / 142 tests) passes with these changes in place

## Task Commits

Each task was committed atomically:

1. **Task 1: Draft-persistence MMKV wrapper** — RED `5f698ba` (test), GREEN `426e2b3` (feat)
2. **Task 2: Text-side, list, category, and item i18n copy** — `ebd0e39` (feat)

**Plan metadata:** commit to follow (docs: complete plan)

_Note: Task 1 followed the TDD RED→GREEN cycle per its `tdd="true"` attribute — the test file was committed first while `data/draft.ts` did not yet exist (verified genuinely failing: "Cannot find module '../draft'"), then the implementation was added and committed once green._

## Files Created/Modified
- `data/draft.ts` - `readBrainDumpDraft`/`writeBrainDumpDraft`/`clearBrainDumpDraft` over the single `'draft:brainDump'` contentStorage key
- `data/__tests__/draft.test.ts` - round-trip, empty/absent-key, clear, and denylist-stem-clean assertions
- `i18n/locales/en.json` - extends `brainDump` with `capture.*`, `list.*`, `category.*`, `item.*` (20 keys)
- `i18n/locales/pl.json` - same 20 keys, warm/plain/gender-neutral PL register

## Decisions Made
- Draft key literal is exactly `'draft:brainDump'`, chosen and verified (both in a header comment and in the test suite) to contain none of the 8 denylist stems — satisfies D-06's crash-safety and schema-cleanliness requirements without a JSON-encoded/index-keyed shape (this is explicitly not a repo record).
- Copy sourced verbatim from `04-UI-SPEC.md`'s Copywriting Contract and Screen Contracts tables — no new phrasing invented in this plan. The PL "Do załatwienia" label carries forward the UI-SPEC's own Flag 6 (draft, pending native-speaker review) — not resolved here, tracked for founder sign-off before ship.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. Both `data/draft.ts` and the new i18n keys are fully wired to their intended real usage points (04-03's capture/list screen will consume both); no placeholder/mock data introduced.

## Threat Flags

None — this plan's only new surface (the draft MMKV key) was already covered by the plan's own `<threat_model>` (T-04-02-CRASH, T-04-02-SCHEMA, T-04-02-INFO), all mitigated/accepted as specified. No new network endpoints, auth paths, or schema fields were introduced.

## TDD Gate Compliance

Task 1 (`tdd="true"`) followed the mandatory gate sequence:
- RED: `5f698ba` — `test(04-02): add failing test for draft-persistence MMKV wrapper` (verified failing: module not found, since `data/draft.ts` did not exist yet)
- GREEN: `426e2b3` — `feat(04-02): draft-persistence MMKV wrapper for brain-dump capture (D-06)` (verified passing: all 4 behaviors green)
- No REFACTOR commit needed (implementation was already minimal).

Task 2 was a plain `auto` task (no `tdd` attribute) — verified via the plan's node script asserting all 20 keys present in both locales.

## Self-Check: PASSED

All created files found on disk; all 4 commit hashes (5f698ba, 426e2b3, ebd0e39, 9ea09db) present in git log.
