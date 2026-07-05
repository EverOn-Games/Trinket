---
phase: 04-brain-dump
plan: 03
subsystem: ui
tags: [react-native, expo-router, sectionlist, i18next, jest, tdd]

# Dependency graph
requires:
  - phase: 04-brain-dump (plan 01)
    provides: "parseDumpText(raw) + classify(text, locale) pure functions"
  - phase: 04-brain-dump (plan 02)
    provides: "data/draft.ts (readBrainDumpDraft/writeBrainDumpDraft/clearBrainDumpDraft) + brainDump.* i18n copy"
provides:
  - "The load-bearing text-core Brain Dump screen: viewPhase 'capture'|'list' state machine replacing the stub"
  - "Capture -> parseDumpText -> classify -> dumpItemsRepo.create per line -> grouped SectionList end-to-end flow"
  - "groupByCategory(items) helper (fixed 5-category order, empty-suppressed)"
affects: [04-04, 04-05, 04-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-capture-session useRef double-tap guard reset on re-entering the phase (not permanent like co-pilot's isStartingSessionRef, since Save is repeatable within one screen mount)"
    - "Continuous empty-state routing: showList computed from live item count every render, not just an initial-mount check, so a future zero-items state falls back to capture automatically"

key-files:
  created:
    - src/app/__tests__/brainDumpCapture.test.tsx
  modified:
    - src/app/brain-dump.tsx

key-decisions:
  - "isSavingRef (double-tap guard) resets on enterCapture rather than staying permanently true, since Save is a repeatable in-screen action (co-pilot's equivalent guard is one-shot and never resets, which would not fit here)"
  - "showList = viewPhase === 'list' && items.length > 0 recomputed every render (not just at mount) so D-12's empty-state routing continuously self-corrects, anticipating 04-04's delete feature without needing extra plumbing later"
  - "No mic/voice UI elements added this plan (reserved for 04-06 per D-01 text-core-first) — capture view is fully usable and Jest-testable via text alone"

patterns-established:
  - "groupByCategory: fixed CATEGORY_ORDER map + filter-empty, mirrors co-pilot's dumpItems.length > 0 empty-suppression precedent, generalized to SectionList sections"

requirements-completed: [DUMP-01, DUMP-05]

# Metrics
duration: 6min
completed: 2026-07-05
---

# Phase 4 Plan 3: Brain Dump Text Capture + Grouped List Summary

**Rewrote the brain-dump stub into a viewPhase capture/list state machine: a single multiline field with draft auto-restore that parses+classifies+persists each non-blank line on Save, landing on a SectionList grouped by the 5 fixed categories with empty sections omitted.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-05T01:50:13Z (approx, prior plan's docs commit)
- **Completed:** 2026-07-05T01:53:48Z
- **Tasks:** 2 (TDD RED -> GREEN)
- **Files modified:** 2 (1 created, 1 rewritten)

## Accomplishments
- `src/app/brain-dump.tsx` rewritten from a themed shell stub into the full text-core capture + grouped-list screen (DUMP-01)
- Save handler wires `parseDumpText` -> `classify` -> `dumpItemsRepo.create` per non-blank line, with the draft cleared and the screen transitioning to the grouped list
- Whitespace-only Save is a provably silent no-op (zero items created, capture view stays put)
- `SectionList` grouped by `errands/work/home/people/someday` in fixed order, empty categories omitted, with a persistent capture-affordance header card always present
- Zero items (initial load, or a future last-item deletion) routes straight back to the capture view — computed live every render, not just at mount
- DUMP-05 non-regression verified: `src/app/index.tsx`'s `<Link href="/brain-dump">` is untouched

## Task Commits

Each task was committed atomically (TDD RED -> GREEN):

1. **Task 1: Failing happy-path capture->save->grouped-list test (RED)** - `2f0226a` (test)
2. **Task 2: Capture view + grouped SectionList (GREEN)** - `173ec2e` (feat)

**Plan metadata:** committed separately after this summary (docs commit)

## Files Created/Modified
- `src/app/__tests__/brainDumpCapture.test.tsx` - happy-path (3-line stream incl. one blank line -> 2 persisted categorized items, rendered under category sections) + whitespace-only no-op test, using `renderRouter`/awaited `fireEvent` per the `screens.test.tsx` precedent
- `src/app/brain-dump.tsx` - full rewrite: `viewPhase` state machine, `CapturePhase`/`ListPhase`/`DumpItemRow` components, `groupByCategory` helper, token-only styling, all copy via `t()`

## Decisions Made
- Double-tap guard (`isSavingRef`) resets on re-entering capture rather than staying permanently `true` for the screen's lifetime — co-pilot's `isStartingSessionRef` is a one-shot guard (a session, once started, never returns to setup in the same mount), but Brain Dump's Save is legitimately repeatable within one screen instance (capture -> list -> capture -> save again), so a permanent guard would silently break re-saving after the first capture session.
- `showList` is derived fresh every render (`viewPhase === 'list' && items.length > 0`) rather than only at the initial `useState` computation, so D-12's "zero items routes to capture" behavior continuously holds — this anticipates 04-04's delete feature (deleting the last item will fall back to capture automatically with no additional plumbing needed in that later plan).
- No mic/voice elements were added — this plan is exactly the text-core slice per D-01; the screen is fully usable and Jest-testable without STT, as required by the plan's notes.

## Deviations from Plan

None - plan executed exactly as written. Both `npm test -- --testPathPattern=brainDumpCapture` and the acceptance-criteria greps (`parseDumpText|classify|dumpItemsRepo.create|clearBrainDumpDraft` count 9, `SectionList` count 2, DUMP-05 Link intact) passed on the first implementation attempt; no auto-fixes were required.

## Known Stubs

None. The item row (`DumpItemRow`) intentionally renders only `item.text` with no category chip/edit/delete/promote affordances — this is explicitly scoped to 04-04 per the plan ("Keep the item row minimal here — category chips / delete / edit / promote are 04-04's job"), not a stub standing in for missing wiring. All data flows (capture -> classify -> persist -> render) are fully wired end-to-end.

## Threat Flags

None — this plan's only new surface (the capture `TextInput` -> `dumpItemsRepo`/draft-key write path) was already covered by the plan's own `<threat_model>` (T-04-03-DUP, T-04-03-INFO, T-04-03-CRASH, T-04-03-VALID), all mitigated/accepted as specified:
- T-04-03-DUP: `isSavingRef` double-tap guard implemented on Save.
- T-04-03-INFO: no `console.log`/analytics call anywhere in the file touches `item.text` or field content.
- T-04-03-CRASH: `readBrainDumpDraft()` already returns `''` on an absent/corrupt key (verified in 04-02), so draft restore on mount cannot crash.
- T-04-03-VALID: raw lines are rendered exclusively via RN `<Text>`, never interpolated into markup.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. No native dependency was added this plan (that arrives with 04-06's `expo-speech-recognition`), so no `expo prebuild --clean` note is needed here.

## Next Phase Readiness
- DUMP-01's capture->classify->persist->grouped-list loop is fully wired and Jest-verified; 04-04 can now extend `DumpItemRow` with the category-correction chip, edit, delete, and promote affordances without touching the `viewPhase` machine or Save handler
- `groupByCategory` and the `showList` empty-routing logic are ready to keep working unchanged once 04-04 adds item deletion
- No blockers for downstream plans; DUMP-01 and DUMP-05 are both satisfied and non-regressed

---
*Phase: 04-brain-dump*
*Completed: 2026-07-05*

## Self-Check: PASSED

All created/modified files verified present on disk (04-03-SUMMARY.md, src/app/brain-dump.tsx, src/app/__tests__/brainDumpCapture.test.tsx); both commit hashes (2f0226a, 173ec2e) verified present in git history.
