---
phase: 04-brain-dump
plan: 04
subsystem: ui
tags: [react-native, expo-router, jest, i18next]

# Dependency graph
requires:
  - phase: 04-brain-dump (plan 03)
    provides: "viewPhase 'capture'|'list' state machine, groupByCategory SectionList, read-only DumpItemRow baseline"
provides:
  - "DumpItemRow: inline 5-option category chip picker (D-11), inline text-edit with discard (D-13), explicit delete with shame-free inline confirm (D-13), 'Start a session' promote button + quiet promoted marker (D-14 caller side / D-15)"
  - "Parent-level re-render bump idiom for a render-body dumpItemsRepo.list() read that must reflect row mutations immediately"
affects: [04-05, 04-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mutually-exclusive per-row rowMode ('idle'|'picker'|'edit'|'delete') state machine, mirrors co-pilot.tsx's screen-level flowPhase shape at row scope"
    - "useState version-bump counter to force a re-render after a mutation to data read directly in the render body (no local mirror), extending index.tsx's dismissedActiveSession idiom to a generic 'any row changed' signal"

key-files:
  created:
    - src/app/__tests__/brainDumpItemRow.test.tsx
  modified:
    - src/app/brain-dump.tsx

key-decisions:
  - "Combined the promote button + quiet marker (originally scoped to Task 2) into the same DumpItemRow rewrite as Task 1's chip/edit/delete work, since all four affordances share the same rowMode state machine and JSX structure — splitting them across two separate edits to the same function would have been artificial. Task 2 then focused on the row-behavior test file plus verifying all four behaviors together."
  - "Category-chip and section-header labels intentionally reuse the exact same i18n keys (brainDump.category.*), so tests disambiguate via getByRole('button', {name: ...}) rather than getByText, since a category's section header and its item row's collapsed chip render identical text on screen simultaneously."
  - "Delete's confirm button reuses the literal string 'Delete' (brainDump.item.deleteConfirm.confirm) already locked by the UI-SPEC — safe because the plain 'Delete' link and the confirm button are mutually exclusive within the same row's rowMode, so only one is ever mounted at a time."

patterns-established:
  - "Row-level mutually-exclusive mode state machine (idle/picker/edit/delete) for a single-row inline correction surface — reusable for any future item-row correction affordance"

requirements-completed: [DUMP-03, DUMP-04]

# Metrics
duration: 6min
completed: 2026-07-05
---

# Phase 4 Plan 4: Brain Dump Item Row — Chip Picker, Edit, Delete, Promote Summary

**Turned the 04-03 read-only DumpItemRow into the full inline correction surface: a tappable category chip that expands into a 5-option picker, inline text-edit with discard, an explicit shame-free delete confirm, and a "Start a session" promote button with a quiet promoted marker — all gated by a single per-row mutually-exclusive mode state machine.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-05T01:54:00Z (approx, immediately after 04-03's completion)
- **Completed:** 2026-07-05T02:00:11Z
- **Tasks:** 2
- **Files modified:** 2 (1 rewritten, 1 created)

## Accomplishments
- `DumpItemRow` extracted with a per-row `rowMode: 'idle' | 'picker' | 'edit' | 'delete'` state machine — only one correction surface open per row at a time (D-11/D-13/D-15's "no modals, inline only, mutually exclusive" requirement)
- Category chip (Line 1): collapsed chip renders non-accent (`surfaceElevated`/`textSecondary`, Flag 7 — a suggestion, not a verdict); tapping expands all 5 options as a compact chip row (accent-filled selection, mirrors co-pilot's `LENGTH_CHIP` precedent); tapping an option calls `dumpItemsRepo.update(id, { category })` and collapses back (DUMP-03, D-11)
- Inline text-edit: "Edit" swaps Line 2 for a `TextInput` seeded with the item's text; "Done" persists via `dumpItemsRepo.update(id, { text })` with the category untouched (no re-classify); "Discard changes" reverts (D-13)
- Delete: "Delete" opens an inline confirm ("Delete this?" / "Delete" / "Keep it") with neutral typography (no danger color exists in `theme/tokens.ts`, Flag 4) — never a bare swipe; confirming calls `dumpItemsRepo.remove(id)` guarded by a `useRef(false)` (D-13, T-04-04-DELDUP)
- Promote: a "Start a session" accent pill pushes `router.push({ pathname: '/co-pilot', params: { dumpItemId: item.id } })`, guarded against double-tap by a separate `useRef(false)`; this file never calls `sessionsRepo` (grep-verified 0 occurrences) — session creation stays single-sourced in co-pilot.tsx, 04-05's job (D-14)
- Promoted items render a trailing quiet `· in Co-pilot` marker on Line 1 and dim their body text (`textSecondary`) — never a badge/count/completed treatment; the promote button stays active for re-promoting (D-15)
- Because the screen reads `dumpItemsRepo.list()` directly in its render body, a parent-level `bumpItemsVersion` counter (passed down as `onChange`/`onItemsChanged`) forces a re-render after any row mutation, so category changes, edits, and deletes are reflected immediately without a local mirror of repo state

## Task Commits

Each task was committed atomically:

1. **Task 1: Category chip picker + inline edit + delete confirm** - `fab1392` (feat) — also includes the promote button + quiet marker (see Decisions Made)
2. **Task 2: Promote button + quiet marker + row-behavior test** - `57196de` (feat) — test file added; promote/marker implementation landed with Task 1

**Plan metadata:** committed separately after this summary (docs commit)

## Files Created/Modified
- `src/app/brain-dump.tsx` - `DumpItemRow` fully rewritten: `RowMode` state machine, category chip picker, inline edit, delete confirm, promote button + quiet marker; `BrainDumpScreen` gained a `bumpItemsVersion` re-render counter threaded through `ListPhase` as `onItemsChanged`
- `src/app/__tests__/brainDumpItemRow.test.tsx` - 5 tests: one-tap category re-categorize, delete-requires-confirm (no bare removal), inline edit persists text with category unchanged, inline edit discard reverts text, promote pushes `/co-pilot` with `dumpItemId` without creating a session and leaves the item in the list

## Decisions Made
- Combined Task 2's promote button + quiet marker into the same `DumpItemRow` rewrite as Task 1's chip/edit/delete work — all four affordances share one `rowMode` state machine and one component body, so splitting them across two separate edits to the same function would have been artificial busywork. Task 2's actual distinct deliverable was the row-behavior test file, which exercises all five behaviors (including the discard-edit case, an extra beyond the plan's four named assertions) in one pass.
- Category-chip and section-header labels intentionally reuse the identical `brainDump.category.*` i18n keys, so both a section header and a collapsed chip can render the exact same visible text simultaneously (e.g. two "Errands" text nodes on screen at once). The test file disambiguates via `getByRole('button', { name: ... })` rather than `getByText`, since only the chip (not the section header) is an accessible button.
- The delete confirm button intentionally reuses the same literal "Delete" copy as the plain delete link (`brainDump.item.deleteConfirm.confirm` = "Delete", matching the locked UI-SPEC copy) — this is safe because the two are mutually exclusive per `rowMode`, so only one "Delete"-labelled button is ever mounted in a given row at a time.

## Deviations from Plan

None - plan executed exactly as written, aside from the Task 1/Task 2 work-grouping decision documented above (not a scope change — both tasks' full acceptance criteria are met and were verified independently by their respective grep assertions and the scoped test run).

## Issues Encountered
None. All five tests in `brainDumpItemRow.test.tsx` passed on the first implementation attempt; `npm run verify` (eslint + `lint:hex` + `lint:mascot-assets` + full `npm test`, 149/149) was green with no auto-fixes required.

## Known Stubs

None. Every affordance (chip picker, edit, delete, promote) is fully wired to `dumpItemsRepo` or `router.push` — no placeholder text, no hardcoded empty states, no unconnected UI.

## User Setup Required
None - no external service configuration required. No native dependency was added or changed this plan (the file only extends existing screen logic), so no `expo prebuild --clean` note is needed.

## Next Phase Readiness
- DUMP-03 (one-tap category correction) and DUMP-04's Brain-Dump-side inert-plus-promote contract are both complete and verified
- The promote trigger (`router.push` with `dumpItemId`) is in place and ready for 04-05 to consume via `useLocalSearchParams` in `co-pilot.tsx`'s setup phase — `co-pilot.tsx` itself was read but not modified this plan, matching the plan's explicit "do not create a session here" boundary
- `sessionsRepo` grep-count of 0 in `brain-dump.tsx` is a durable acceptance check 04-05 can re-verify to confirm the boundary held
- No blockers for downstream plans

---
*Phase: 04-brain-dump*
*Completed: 2026-07-05*

## Self-Check: PASSED

Verified `src/app/brain-dump.tsx` and `src/app/__tests__/brainDumpItemRow.test.tsx` both present on disk; both commit hashes (`fab1392`, `57196de`) confirmed present in `git log --oneline`.
