---
quick_id: 260713-tpu
slug: it-innovation-summary-for-funding-round
status: complete
completed: 2026-07-13
type: doc
files_changed: 1
---

# Summary: IT innovation summary for funding round

## What was delivered

`docs/INNOVATION-SUMMARY.md` — a funding-round-ready Technical Innovation Summary for
investors and their technical due-diligence advisors. Organized around a single thesis
(**Trinket compiles its hardest product/ethical/regulatory promises into the architecture
as fail-closed invariants, rather than backing them with policy**) and seven evidence-backed
pillars:

1. Research-to-product — the asynchronous body-double engine (implements Ara et al. 2025,
   arXiv:2509.12153) as a structurally-constrained 5-state mascot machine.
2. Constraint-as-code — five fail-closed CI gates enforcing copy tone/regulatory limits,
   network isolation, the no-aggregates schema, design-token integrity, and asset budget.
3. Privacy by construction (GDPR Art. 9) — local-first MMKV, a type-level analytics
   allowlist where content-leakage is unrepresentable, EU-pinned PostHog, no diagnosis field.
4. On-device AI inside a principled AI boundary — on-device STT, rule-based PL/EN classifier,
   no LLM in the core loop.
5. Correctness engineering — timestamp-derived sessions surviving force-quit via heartbeat +
   silent reconciliation.
6. Modern cross-platform foundation — Expo SDK 57 / RN 0.86 New Architecture / CNG, PL+EN
   CLDR i18n, native surfaces with crash containment.
7. Shame-free economics — counterless freemium and tappable gated affordances; the moat
   argument (constraints guilt-based rivals can't copy).

Includes an **honest build-maturity table** (shipped/verified vs. pending: RevenueCat live
keys, PostHog dashboard, real-device STT/notification timing) and an appendix mapping every
claim to its source file for due-diligence verification.

## Approach

Grounded entirely in a first-hand read of the codebase (mascot module, the gate scripts,
analytics allowlist, entitlements, session-survival hooks, data schema, app.json) — no
claim is asserted that isn't backed by a cited file. Written for a technical-but-external
reader; confident in framing, precise about maturity.

## Verification

- Doc-only change under `docs/`; no source, i18n, or theme files touched, so the five
  `npm run verify` gates are unaffected (none scan `docs/` or `.planning/`).
- Cited file paths spot-checked against the claims they support.

## Notes / follow-ups (optional)

- A polished, self-contained visual version (one-page HTML for a data room / deck) can be
  produced on request from this same content.
- Refresh the maturity table once RevenueCat production keys, the PostHog EU key, and
  real-device STT verification land.
