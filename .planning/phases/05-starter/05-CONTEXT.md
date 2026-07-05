# Phase 5: Starter - Context

**Gathered:** 2026-07-05 (retroactive)
**Status:** Retroactive — built via founder-authorized direct development (GSD bypass), documented post-hoc

> **Retroactive note:** This phase was NOT planned or executed through the normal `/gsd:plan-phase` → `/gsd:execute-phase` pipeline. The founder authorized direct development for Phases 5-8 in this session to move faster once the Phase 1-4 vertical slices had proven the established patterns (TDD pure-function core, contextual permission, timestamp-derived state, i18n-first copy, token-only styling). This CONTEXT.md reconstructs the decisions actually made from the shipped code, tests, and commit messages, so the planning trail stays honest and future phases can still cite it via the normal dependency-graph mechanism. No interactive discussion transcript exists for this phase.

<domain>
## Phase Boundary

A user can pre-commit to starting a task by pairing a personal cue with a tiny first physical action (START-01..04): a two-step "when X, then Y" builder, a localized PL/EN cue library grouped by time/place/event, an optional single self-worded reminder notification requested contextually (not during onboarding), and static coaching copy that keeps the action tiny.

NOT in this phase: onboarding UI (Phase 6), freemium gating of Starter itself (Starter stayed ungated — only Co-pilot session starts are gated per Phase 7), settings-level reminder bulk-toggle UI (Phase 8, though the cancel-sweep this phase's data shape enables lives there).

</domain>

<decisions>
## Implementation Decisions

> No interactive AskUserQuestion session occurred (direct-dev bypass). Decisions below are reconstructed from the shipped implementation and commit messages, not from a discussion log.

### Builder flow
- **D-01 (retroactive):** Exactly two steps, matching START-01 literally: step 1 picks-or-types a cue (library chips prefill an editable text field — the user can always override with their own words), step 2 names a tiny first physical action. No step 3; static copy on step 2 coaches "tiny first step, not the whole task" (START-04).
- **D-02 (retroactive):** Cue library (`src/features/starter/cues.ts`) is data-only — three fixed groups (`time`, `place`, `event`), 3 entries each, all resolved through i18n keys under `starter.cues.<group>.*`, mirroring the established keyword-list-as-data pattern from `src/features/brain-dump/keywords.ts` (Phase 4 precedent, cited directly in the file's own header comment).
- **D-03 (retroactive):** Saved intentions render as cards with a shame-free delete (no confirmation-shame copy) and an optional reminder row.

### Reminder / notification design
- **D-04 (retroactive):** The reminder is a SINGLE optional notification per intention (START-03), never recurring, never a re-engagement hook. Content is the user's OWN words reflected back — cue text becomes the notification title, action text becomes the body — never an app-authored exhortation ("don't forget!" language explicitly rejected by design).
- **D-05 (retroactive):** Permission is requested CONTEXTUALLY, only at the moment the user taps to schedule a reminder from a saved intention card — never on mount, never during onboarding (this constrains Phase 6's ONBD-01 "zero permission requests" requirement, built one phase later but consistent with it).
- **D-06 (retroactive):** Scheduling choice is day + time-slot chips (`today`/`tomorrow` + hour slot), not a native date/time picker — kept in the same lightweight chip-based interaction grammar as the rest of the app rather than introducing a new native picker dependency.
- **D-07 (retroactive):** `computeFireDate` is a pure, clock-injected function (`(day, hour, minute, now) => epochMs`), mirroring the `reconcileActiveSession` pure-function precedent from Phase 3 — testable without mocking `Date.now()` globally. Originally implemented with fixed `+24h` millisecond rollover; corrected during the same-session blitz-review to calendar-math rollover (`setDate(+1)` then re-pin hour/minute) after BLITZ-REVIEW WR-01 identified a DST-transition bug (a fixed 24h offset shifts the fire time by an hour across Poland's March/October DST boundary). The corrected version ships in the final commit.
- **D-08 (retroactive):** Cancellation is symmetric and always available: delete-intention, remove-reminder, and (added in Phase 8) the settings reminders-off sweep all resolve to the same `cancelIntentionNotification(notificationId)` call. A same-session code review (BLITZ-REVIEW CR-01) found that a double-tap on "Remind me then" could orphan a first-scheduled OS notification (the second call's write wins, first id is lost from storage, becomes uncancellable) — fixed in the same session with an in-flight guard AND replace-don't-orphan semantics (a prior `notificationId` is explicitly cancelled before a new one is scheduled), plus a regression test. This was flagged as a **critical PDA-violation-class bug** (an app-originated notification the user cannot stop) and is the single most important correctness fix in this phase.

### Native dependency
- **D-09 (retroactive):** `expo-notifications` added as the first new native dependency since Phase 4's `expo-speech-recognition` — requires `npx expo prebuild --clean` after pulling this phase's changes (app.json plugin entry added). `tsc --noEmit` was folded permanently into `npm run verify` in the same commit, closing the class of async-API-shape bug (sync-vs-async mismatch) that bit Phase 4's `useVoiceCapture`.

</decisions>

<canonical_refs>
## Canonical References

### Product spec (primary)
- `.planning/source/trinket-dev-synthesis-v0.1.md` §4.3 (Starter mechanic spec, implementation-intention framing). §2 hard constraints (PDA grammar, shame-free), §5.2 mascot rules (not directly touched this phase).
- `.planning/REQUIREMENTS.md` — START-01..04 (lines 45-48), the acceptance contract for this phase.
- `.planning/ROADMAP.md` — Phase 5 section: goal, Mode: mvp, 4 success criteria, UI hint: yes.

### Data layer (existing, extended)
- `data/types.ts` — `Intention` gains `notifyAt?`/`notificationId?` plumbing fields (no streak/aggregate shape; passes the schema denylist test).
- `data/repositories/__tests__/schema.denylist.test.ts` — extended for the new fields and the Phase 6 settings store action.

### Project constraints
- `CLAUDE.md` — shame-free (hard), PDA offer-grammar (hard: reminder content is the user's own words, never a command), token-only styling, i18next-only copy, `npm run verify` bundle (now includes `typecheck`).

### Review artifact
- `.planning/BLITZ-REVIEW.md` — CR-01 (reminder orphan, critical, fixed), WR-01 (DST calendar math, fixed), WR-02 (Save double-submit guard, fixed), WR-04 (Jest mock `AndroidImportance` value drift, fixed), WR-06 (unguarded native scheduling call, fixed) all touch this phase's files directly.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets consumed
- `src/features/brain-dump/keywords.ts` pattern (keyword-list-as-data) → directly mirrored by `cues.ts`.
- `reconcileActiveSession.ts` pure-function-with-injected-clock pattern (Phase 3) → directly mirrored by `computeFireDate`.
- Contextual-permission posture from `useVoiceCapture` (Phase 4 D-03) → directly mirrored by `ensureNotificationPermission`.
- `__mocks__/` pattern → `__mocks__/expo-notifications.ts` added, registered in `jest.setup.ts`.

### Integration points
- `data/repositories/intentions.ts` (`intentionsRepo`) — existing Phase 1 repository, extended with the two new fields; Starter added no new repository.
- `src/app/settings.tsx` (Phase 8, built later in the same session) — reminders-off toggle sweeps every intention's `notificationId` through `cancelIntentionNotification`.

</code_context>

<deferred>
## Deferred Ideas

- Native date/time picker for reminder scheduling — chip-based day+slot picker chosen instead; revisit if beta feedback wants finer-grained times.
- Real device notification-delivery timing verification (does the OS fire at the exact scheduled instant, does Doze/battery-optimization delay it) — code-verified only; a device task, tracked as a UAT gap in this plan's SUMMARY.

</deferred>

---

*Phase: 05-starter*
*Context reconstructed: 2026-07-05 (retroactive, founder-authorized GSD bypass)*
