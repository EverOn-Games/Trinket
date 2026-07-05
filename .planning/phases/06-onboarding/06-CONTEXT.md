# Phase 6: Onboarding - Context

**Gathered:** 2026-07-05 (retroactive)
**Status:** Retroactive — built via founder-authorized direct development (GSD bypass), documented post-hoc

> **Retroactive note:** Built via the same founder-authorized direct-development bypass as Phases 5, 7, and 8. This CONTEXT.md reconstructs the decisions actually made from the shipped code, tests, and commit messages. No interactive discussion transcript exists for this phase.

<domain>
## Phase Boundary

A first-time user understands what Trinket is and reaches their first task within 3 skippable screens, without ever being asked for notification permission (ONBD-01): what-Trinket-is (with a clinical-care disclaimer), an optional first task, and meet-the-mascot. Skippable from any step. A one-way `onboardingComplete` flag gates the first-run redirect.

NOT in this phase: notification permission (deferred entirely to Starter's contextual ask, Phase 5), mic permission (deferred to Brain dump's contextual ask, Phase 4), account creation (Phase 7 introduces accounts only at purchase).

</domain>

<decisions>
## Implementation Decisions

> No interactive AskUserQuestion session occurred (direct-dev bypass). Decisions below are reconstructed from the shipped implementation.

### First-task variant (the one real product decision this phase made)
- **D-01 (retroactive):** The optional first task typed in step 2 becomes an INERT dump item (`dumpItemsRepo.create` with the same `classify()` categorization used by Brain dump proper) — it just sits in Brain dump, promotable later like any other item. **The alternative "straight into a Co-pilot session" variant was explicitly considered and rejected** (per the file's own header comment: "the 'straight into a session' variant was deliberately rejected as pressure at the very first moment"). This is the single clearest PDA-grammar decision in this phase: the app's first-ever act is an offer (a dump item sitting quietly, waiting to be promoted whenever the user chooses), never a demand (being pushed into a live session before they've even seen Home).
- **D-02 (retroactive):** An empty first-task field is treated as an equally valid, first-class answer ("Nothing right now" — no fallback-shame framing), not a failure state requiring extra confirmation.

### Skip and completion semantics
- **D-03 (retroactive):** Skipping and finishing set the exact same one-way `onboardingComplete` flag in `useSettingsStore` — both are first-class exits with identical downstream effect. Nothing is tracked about WHERE the user exited (no per-step skip analytics beyond the aggregate `skipped: boolean` on the single `onboarding_completed` event added later in Phase 8).
- **D-04 (retroactive):** The flag is one-way by construction (no reset path exists anywhere in the codebase) — it never re-triggers onboarding for a returning user, and absence/return never re-litigates the first-run experience (consistent with "warm re-entry always" — there is no re-entry friction to be warm about here because onboarding simply doesn't reappear).
- **D-05 (retroactive):** Skip is visible and identically styled on every one of the 3 steps (a single `Pressable` rendered above the step content, not per-step duplicated markup).

### Screen content
- **D-06 (retroactive):** Step 1 pairs the "what Trinket is" framing with the clinical-care disclaimer required by CLAUDE.md's regulatory-copy constraint (wellness positioning, not a medical device) — both live on the same first screen rather than a separate legal-only screen, keeping the 3-screen budget intact.
- **D-07 (retroactive):** Step 3 (meet the mascot) uses the `idle` mascot state (not `greeting`, which step 1 uses) — a small but deliberate variation so the two mascot appearances in one flow aren't visually identical.

</decisions>

<canonical_refs>
## Canonical References

### Product spec (primary)
- `.planning/source/trinket-dev-synthesis-v0.1.md` — onboarding framing, regulatory copy constraints (§2 Regulatory copy: "supports task initiation" allowed; "treats/cures/diagnoses" forbidden).
- `.planning/REQUIREMENTS.md` — ONBD-01 (line 52), the acceptance contract for this phase.
- `.planning/ROADMAP.md` — Phase 6 section: goal, Mode: mvp, 3 success criteria, UI hint: yes. Depends on Phase 2 (Mascot), Phase 3 (Co-pilot) per the roadmap's declared dependency — neither is actually invoked by onboarding's inert-dump-item variant (D-01), only the Mascot component is (Phase 2 dependency holds; the Phase 3 dependency was originally anticipated for a "straight into session" variant that was rejected).

### Data layer (existing, extended)
- `data/stores/useSettingsStore.ts` — `onboardingComplete` boolean + `setOnboardingComplete()` action added; schema denylist test extended for the new action.
- `src/features/brain-dump/classify.ts` (Phase 4) — reused as-is for the first-task's category.
- `data/repositories/dumpItems.ts` (`dumpItemsRepo`, Phase 1) — reused as-is, no new repository.

### Project constraints
- `CLAUDE.md` — shame-free (hard: no re-onboarding-as-punishment), PDA offer-grammar (hard: D-01's rejected straight-into-session variant), regulatory copy (hard: clinical-care disclaimer on step 1).

### Review artifact
- `.planning/BLITZ-REVIEW.md` — WR-03 (missing double-tap guards on `finish`/`handleFirstTask`, fixed) touches this phase's file directly.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets consumed
- `<Mascot />` component (Phase 2) — `greeting` state on step 1, `idle` state on step 3.
- `classify()` (Phase 4) — first-task categorization, identical call shape to Brain dump's own Save flow.
- `Screen` shell + `useTheme()` tokens + i18n `t()` pipeline — established pattern, no deviation.

### Integration points
- `src/app/index.tsx` (Home) — first-run redirect: if `!onboardingComplete`, `router.replace('/onboarding')` before rendering Home content.
- `data/stores/useSettingsStore.ts` — the one-way flag lives alongside `locale`/`notificationsOptIn`/`mascotProminence`, following the existing settings-store shape.

</code_context>

<deferred>
## Deferred Ideas

None specific to this phase — the scope is intentionally minimal (3 screens, one flag, one first-task variant decision).

</deferred>

---

*Phase: 06-onboarding*
*Context reconstructed: 2026-07-05 (retroactive, founder-authorized GSD bypass)*
