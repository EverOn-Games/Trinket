---
quick_id: 260713-tpu
slug: it-innovation-summary-for-funding-round
created: 2026-07-13
type: doc
---

# Quick Task: IT innovation summary for funding round

## Goal

Produce a funding-round-ready **Technical Innovation Summary** (`docs/INNOVATION-SUMMARY.md`)
that explains Trinket's IT solutions and their application in the app, framed to make the
case for technical innovation to investors and their technical due-diligence advisors.

## Constraints (what makes this credible, not marketing)

- **Every claim maps to real, shipped code** — cite file paths so due diligence can verify.
- **Honest maturity** — distinguish shipped/verified from pending (RevenueCat live keys,
  PostHog dashboard, real-device STT/notification timing) rather than overstating.
- **Connect technical choices to business moat** where the link is real (shame-free =
  cleaner data + a moat guilt-based rivals can't copy; constraints-as-code = verifiable
  promises).
- Doc-only change: no source files touched, so `npm run verify` behavior is unaffected.

## Scope

Single new file: `docs/INNOVATION-SUMMARY.md`. Innovation pillars grounded in codebase:

1. Research-to-product: the asynchronous body-double engine (mascot state machine,
   `src/components/Mascot/*`, implements Ara et al. 2025 arXiv:2509.12153).
2. Constraint-as-code / compliance-as-CI: the fail-closed gates
   (`scripts/check-copy-tone.mjs`, `check-network-isolation.mjs`, `check-hex-literals.mjs`,
   `check-mascot-asset-size.mjs`, `data/repositories/__tests__/schema.denylist.test.ts`).
3. Privacy by construction / GDPR Art. 9 (local-first MMKV, type-level analytics allowlist
   `src/analytics/events.ts`, EU-pinned PostHog `src/analytics/posthog.ts`, no diagnosis field).
4. On-device AI inside a principled AI boundary (`useVoiceCapture.ts` on-device STT,
   `classify.ts` rule-based PL/EN classifier, no LLM in the core loop).
5. Correctness engineering: session survival (`useElapsedSession.ts`,
   `reconcileActiveSession.ts` — timestamp-derived, heartbeat, silent reconciliation).
6. Modern cross-platform foundation (Expo SDK 57 / RN 0.86 New Architecture / CNG,
   native surfaces with crash containment `widgetsRuntime.ts`, i18n PL+EN CLDR plurals).
7. Shame-free economics encoded in the schema (`entitlements.ts` counterless freemium,
   `data/types.ts` no-aggregates data model).

## Verification

- `docs/INNOVATION-SUMMARY.md` exists, reads coherently for a non-Trinket technical reader.
- Spot-check each cited file path resolves to the claim made.
- Atomic commit on branch `claude/it-solutions-innovation-summary-hqtxpm`, pushed.
