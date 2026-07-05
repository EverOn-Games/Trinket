# Phase 8: Settings & Analytics Audit - Context

**Gathered:** 2026-07-05 (retroactive)
**Status:** Retroactive — built via founder-authorized direct development (GSD bypass), documented post-hoc. **CODE-COMPLETE / analytics transport pending key.**

> **Retroactive note:** Built via the same founder-authorized direct-development bypass as Phases 5, 6, and 7. This CONTEXT.md reconstructs the decisions actually made from the shipped code, tests, and commit messages. No interactive discussion transcript exists for this phase.

<domain>
## Phase Boundary

A user can control locale, notifications, and subscription state from one place (SETT-01); the team can see activation/retention funnel data without ever seeing user content (ANLY-01/02). This phase delivers: the Settings screen (locale chips, reminders on/off with a cancel sweep, mascot prominence chips, plan row), a typed analytics event allowlist with a runtime content filter, and funnel instrumentation call sites threaded through every feature phase built so far.

**Honest status:**
- SETT-01 — **DONE**, code-verified.
- ANLY-01 (typed allowlist, no content payloads, autocapture/replay disabled) — **DONE at the code layer**. There is literally no analytics SDK installed yet, so autocapture/session-replay are structurally impossible (not just "disabled" — absent). The allowlist and runtime guard are real and tested.
- ANLY-02 (funnel events fire correctly and appear in the EU-hosted dashboard) — **PARTIAL**. Every named funnel event is instrumented and inert (`track()` is a no-op transport). Nothing has been verified to reach an actual PostHog EU dashboard because no PostHog key/project exists yet.

</domain>

<decisions>
## Implementation Decisions

> No interactive AskUserQuestion session occurred (direct-dev bypass). Decisions below are reconstructed from the shipped implementation and its own header comments.

### Settings screen
- **D-01 (retroactive):** Locale change rides the existing Phase 1 write-through listener pattern (referred to in the commit message as "the WR-02 listener" — i.e. reusing an established reactive-write mechanism rather than introducing a new one).
- **D-02 (retroactive):** Reminders-off is not just a flag flip — it actively sweeps every `Intention` with a live `notificationId` through `cancelIntentionNotification` and clears `notifyAt`/`notificationId`, so turning reminders off actually cancels outstanding OS notifications rather than merely suppressing future ones. Intentions themselves are untouched (only the reminder linkage is cleared).
- **D-03 (retroactive):** Mascot-prominence chips write live to the Phase 2 `mascotProminence` settings field — Settings is the first UI surface to expose this field to the user (Phase 2 built the field and the Mascot component's consumption of it, but no settings control existed until now).
- **D-04 (retroactive):** The plan row states free-tier inclusions calmly ("sessions refresh Monday") rather than a countdown/remaining-count display — directly reusing Phase 7's shame-free gate copy register rather than inventing new subscription-status language.

### Analytics
- **D-05 (retroactive):** `track()` is a silent no-op until a real transport (PostHog EU) is wired — the module's own header comment documents the drop-in exactly: `eu.i.posthog.com` host, autocapture off, session replay never. This is a deliberate "build the seam now, wire the SDK later" sequencing choice, not an oversight.
- **D-06 (retroactive):** Every event property is typed to numbers, booleans, or closed string-literal enums (`AnalyticsEvents` in `src/analytics/events.ts`) — free-form strings are structurally unrepresentable in the type system, so task text/cues/transcripts categorically cannot ride along even by future-developer mistake.
- **D-07 (retroactive):** A runtime guard (`SAFE_STRING_TOKENS` allowlist + `Object.entries` scan in `analytics.ts`) sits BENEATH the type-level guarantee as defense-in-depth — drops any event name not in `ALLOWED_EVENT_NAMES` and any string property value not in the token allowlist, even if a future caller somehow bypasses TypeScript (e.g., via `as any`).
- **D-08 (retroactive):** Funnel events instrumented at their real call sites across every phase built so far: `app_opened` (`_layout.tsx`, cold launch), `onboarding_completed` (Phase 6), `session_started`/`session_completed` (Phase 3's `co-pilot.tsx` — `session_completed` is explicitly named as the activation event), `brain_dump_saved` (Phase 4), `item_promoted` (Phase 4), `starter_created`/`reminder_scheduled` (Phase 5), `gate_shown`/`paywall_viewed`/`paywall_dismissed` (Phase 7). D7/D30 retention is deliberately NOT computed on-device (per `events.ts`'s own comment: "computed by the analytics backend, never on-device") — `app_opened` recurrence is the raw signal; the aggregation happens downstream once a real backend exists.

</decisions>

<canonical_refs>
## Canonical References

### Product spec (primary)
- `.planning/source/trinket-dev-synthesis-v0.1.md` §7 — analytics/privacy posture, activation/retention validation targets (activation >40%, D7 >25%, D30 >12%).
- `.planning/REQUIREMENTS.md` — SETT-01, ANLY-01, ANLY-02 (lines 63, 67-68).
- `.planning/ROADMAP.md` — Phase 8 section: goal, Mode: mvp, 3 success criteria, depends on Phase 5 + Phase 7, UI hint: yes.

### Data layer (existing, extended)
- `data/stores/useSettingsStore.ts` — `mascotProminence`, `notificationsOptIn`, `locale` all pre-existing (Phases 1/2/5); Settings screen is the first consumer-facing UI for all of them together.
- `data/repositories/intentions.ts` (`intentionsRepo`) — read/write for the reminders-off sweep.

### Project constraints
- `CLAUDE.md` — Privacy/GDPR Art. 9 (hard: no content payloads, PostHog EU host explicitly named), analytics carry no content payloads (hard, directly implements the type-level + runtime-guard double enforcement in D-06/D-07).

### Review artifact
- `.planning/BLITZ-REVIEW.md` — WR-05 (reminders-off loop had no error handling, fixed), IN-01 (dead `setVersion` call, left as info-only/not fixed), IN-02 (unused `sessionsRemaining_*` depletion-copy landmine, deleted), IN-03 (missing PL `_other` plural forms, added) all touch this phase's files.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets consumed
- `useSettingsStore` locale/notification/mascot-prominence fields (Phases 1/2/5) — Settings is the aggregation UI, not the origin, of all of these.
- `cancelIntentionNotification` (Phase 5) — reused verbatim for the reminders-off sweep.
- Phase 7's gate copy register — reused for the plan row's tone.

### Integration points
- `src/app/_layout.tsx` — `app_opened` fired on cold launch.
- `src/app/co-pilot.tsx`, `src/app/onboarding.tsx`, `src/app/starter.tsx`, `src/app/brain-dump.tsx` — each gained `track()` call sites for their respective funnel events.

</code_context>

<deferred>
## Deferred Ideas

- PostHog EU SDK installation + key configuration — deferred until a PostHog project exists; the drop-in path is fully documented in `analytics.ts`'s own header comment.
- Live dashboard verification of activation/D7/D30 funnels — cannot happen until the transport is wired; this is the literal blocker for ANLY-02's "appear in the EU-hosted analytics dashboard" success criterion.

</deferred>

---

*Phase: 08-settings-analytics*
*Context reconstructed: 2026-07-05 (retroactive, founder-authorized GSD bypass)*
