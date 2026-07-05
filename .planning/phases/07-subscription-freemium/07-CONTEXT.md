# Phase 7: Subscription Infrastructure + Freemium Gate - Context

**Gathered:** 2026-07-05 (retroactive)
**Status:** Retroactive — built via founder-authorized direct development (GSD bypass), documented post-hoc. **CORE-COMPLETE / PARTIAL** — see Honest Status below.

> **Retroactive note:** Built via the same founder-authorized direct-development bypass as Phases 5, 6, and 8. This CONTEXT.md reconstructs the decisions actually made from the shipped code, tests, and commit messages. No interactive discussion transcript exists for this phase.

<domain>
## Phase Boundary

A user can subscribe to a paid tier or continue indefinitely on a genuinely usable free tier, with entitlements behaving correctly online or offline (MONEY-01..04). This phase delivers: entitlement/tier resolution derived from session timestamps (no counters), a session-start freemium gate, a paywall screen (offer-not-wall), and a reference-mode purchases seam shaped for a drop-in RevenueCat swap.

**Honest status — this phase is NOT fully complete:**
- MONEY-02 (free tier = unlimited Brain dump + 3 Co-pilot sessions/week, shame-free gate copy) — **DONE**, code-verified.
- MONEY-01 (real subscription purchase via RevenueCat, market-specific pricing through the actual store) — **PARTIAL**. Pricing display and offering-shaped seam exist; actual StoreKit/Play Billing purchases require a RevenueCat API key, configured store products, and a device — none of which exist yet.
- MONEY-03 (offline/unknown → free tier default; restore works on fresh install) — **PARTIAL**. The offline-default-free logic is done and unit-tested; the "restore works on a fresh install" half needs a real RevenueCat account + device, unverified.
- MONEY-04 (no account required for the core loop; Supabase auth introduced only at purchase/restore) — **trivially satisfied today** (there is no account system at all yet, so naturally no account is required), but the actual purchase-time account-creation flow this requirement describes is **unbuilt**. This is a "vacuously true, not actually delivered" status and must not be read as complete.

</domain>

<decisions>
## Implementation Decisions

> No interactive AskUserQuestion session occurred (direct-dev bypass). Decisions below are reconstructed from the shipped implementation and its own header comments, which are unusually explicit about intent in this phase.

### Entitlement model
- **D-01 (retroactive):** Tier and weekly session count are derived ENTIRELY from existing `sessionsRepo` timestamps at check time — no counters, no stored aggregates, nothing the schema denylist test would flag. `startOfCurrentWeek(now)` computes Monday 00:00 local via calendar math (`setDate`, not ms arithmetic — explicitly commented as "DST-safe via calendar math," and later cited by name as the pattern Starter's `computeFireDate` should have followed from the start).
- **D-02 (retroactive):** `FREE_WEEKLY_SESSION_LIMIT = 3` is a single exported constant, deliberately "a beta-tunable number, not an architecture" (direct quote from the module header).
- **D-03 (retroactive):** `getTier()` only returns `'plus'` for a POSITIVELY cached paid entitlement (`subscriptionCache.tier === 'plus'`); anything else — absent, malformed, offline-unknown — quietly resolves to `'free'`. This is the entire MONEY-03 offline posture: no special-cased "unknown" state that could produce alarming copy, just the free-tier default.
- **D-04 (retroactive):** The gate (`canStartSession`) is checked ONLY at session start, never mid-session and never against historical totals — consistent with the product's "no retroactive punishment" ethos.

### Gate UX (shame-free enforcement)
- **D-05 (retroactive):** Gated Co-pilot start affordances remain fully tappable at all times — **no greyed-out buttons**. Tapping while gated opens the paywall as an offer (`paywall_viewed({ trigger: 'gate' })`), never a disabled/dead control. This is a direct, deliberate implementation of the shame-free hard constraint applied to a monetization surface, where the industry-standard pattern (grey out + tooltip) would have been the shame-inducing default.
- **D-06 (retroactive):** The gate check (`gateBlocksStart`) runs before ANY persistence on all three Co-pilot start paths (dump-item promote, one-liner, open "just work") AND the `dumpItemId` auto-start effect — traced explicitly by the same-session code review and confirmed to have no bypass path.
- **D-07 (retroactive):** The paywall push after a gate hit is debounced (`gateResetTimeoutRef`, 800ms) rather than latched permanently, so a user who backs out and re-taps isn't stuck with a dead button — a deliberate reuse of the "brain-dump promote button" debounce precedent (per the commit message), though the constant itself was uncommented until the same-session review flagged it (BLITZ-REVIEW IN-04, left as a documented magic number rather than extracted, judged low-severity).

### Paywall content & pricing
- **D-08 (retroactive):** Paywall copy is calm calendar fact ("sessions refresh Monday") that reaffirms what still works, never depletion language ("you've run out", countdown framing) — matches MONEY-02's literal requirement and CLAUDE.md's forbidden-copy list.
- **D-09 (retroactive):** Pricing shown is REFERENCE-mode: `getPlanOptions(locale)` returns the brief's exact configured numbers (PL: 9,99/24,99/199 zł; US: $5.99/$11.99/$79) hardcoded as display strings — not fetched from a real RevenueCat offering, since no key exists yet. The module is offering-shaped (`{id, priceLabel}`) specifically so the real RevenueCat swap touches only `purchases.ts`.
- **D-10 (retroactive):** `purchase()`/`restore()` always resolve `'unavailable'` in reference mode; the paywall shows an honest "purchases aren't switched on" caption rather than silently pretending to work or throwing an error. "Restore" link is always present regardless (MONEY-03's requirement that restore always be offered), even though it currently always resolves unavailable.
- **D-11 (retroactive):** "Not now" is always present on the paywall — an offer, never a wall the user is trapped behind.

</decisions>

<canonical_refs>
## Canonical References

### Product spec (primary)
- `.planning/source/trinket-dev-synthesis-v0.1.md` §6.3 — monetization/pricing spec (source of the exact PL/US numbers in D-09).
- `.planning/REQUIREMENTS.md` — MONEY-01 (market pricing) exactly reproduces the brief's PL 9,99/24,99/199 PLN and US 5.99/11.99/79 USD figures — confirmed matching in `purchases.ts`.
- `.planning/ROADMAP.md` — Phase 7 section: goal, Mode: mvp, 4 success criteria, depends on Phase 3.

### Data layer (existing, extended)
- `data/stores/useSettingsStore.ts` — `subscriptionCache` field, read (never written by this phase's code — no RevenueCat SDK yet to write it).
- `data/repositories/sessions.ts` (`sessionsRepo`, Phase 1/3) — read-only source for entitlement derivation; no new repository added.

### Project constraints
- `CLAUDE.md` — shame-free (hard: D-05's no-greyed-buttons decision directly implements this against the industry-standard pattern), RevenueCat named explicitly as the fixed subscription stack, MMKV encryption for session tokens deferred (per Phase 1 `data/mmkv.ts` note) — still applies once Supabase auth lands.

### Review artifact
- `.planning/BLITZ-REVIEW.md` — reviewer explicitly traced the gate across all 3 start paths + the auto-start effect and found it clean (no bypass); IN-04 (uncommented 800ms magic number) is the only finding touching this phase specifically, left as low-severity/undocumented rather than fixed.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets consumed
- `sessionsRepo` (Phase 1/3) — read-only, no schema change.
- `useSettingsStore` (Phase 1) — `subscriptionCache` field read.
- `co-pilot.tsx`'s existing `isStartingSessionRef`/debounce idioms (Phase 3) — the gate's debounce pattern is a direct descendant.

### Integration points
- `src/app/co-pilot.tsx` — `gateBlocksStart()` called before all 3 start paths + the dumpItemId effect.
- `src/app/settings.tsx` (Phase 8) — "See plans" link opens the paywall with `trigger: 'settings'`.
- `src/analytics/events.ts` (Phase 8) — `gate_shown`, `paywall_viewed`, `paywall_dismissed` events defined for this phase's funnel.

### What's genuinely missing for full MONEY-01/03/04
- No `react-native-purchases` (RevenueCat SDK) installed — this phase added zero new native dependencies; the purchases seam is pure TypeScript.
- No RevenueCat project/API key configured.
- No App Store Connect / Play Console product configuration for the weekly/monthly/annual tiers.
- No Supabase auth integration at all (MONEY-04's "account only at purchase" flow has nothing to attach to yet).
- No device-level purchase/restore verification.

</code_context>

<deferred>
## Deferred Ideas

- Full RevenueCat SDK integration — deferred until a RevenueCat project + API key exist; the drop-in path is fully documented in `purchases.ts`'s own header comment so the swap is mechanical when the key lands.
- Supabase auth (account-at-purchase flow) — no Supabase client wired anywhere yet; this is real remaining work, not a formality.
- Weekly-subscription-tier App/Play Store review risk — flagged in STATE.md's carried-forward blockers; unaddressed until first submission.

</deferred>

---

*Phase: 07-subscription-freemium*
*Context reconstructed: 2026-07-05 (retroactive, founder-authorized GSD bypass)*
