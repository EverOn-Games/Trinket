---
gsd_artifact: summary
quick_id: 260705-unb
slug: phase-9-pre-work-copy-tone-gate-offline-
status: complete
completed: 2026-07-05
requirements: [FND-03]
verify: "33 suites / 262 tests green; all four gates (hex, copy, network, mascot-assets) clean"
---

# Summary: Phase 9 pre-work — copy-tone gate, offline seam sweep, EAS env docs

Three deliverables, three atomic commits, while Play Console setup churns
founder-side. These pre-cover the in-container halves of Phase 9 criteria 4
and 1; the phase itself still needs its device-side verification when it
formally runs.

## 1. Copy-tone gate (`scripts/check-copy-tone.mjs`, `lint:copy`)

Phase 9 criterion 4 as a repeatable fail-closed gate rather than a one-off
read: every string in `i18n/locales/{en,pl}.json` scanned against curated
EN+PL patterns — shame/depletion framing, streak/pressure mechanics,
urgency/scarcity, demand grammar, forbidden medical/regulatory claims.
Negated product-promise mentions ("no streaks", "bez serii", "Nie spiesz
się") stay legal via lookbehinds — the first dry run flagged "Nie spiesz
się" ("take your time") and taught the gate the negation rule. Mentioning
ADHD stays allowed; treating-claims do not. 346 strings currently clean;
RED-proofed (seeded "run out / act now / last chance" → 3 violations,
exit 1). Store-listing copy is out-of-repo — audit at submission time.

## 2. Network-isolation gate + transport hardening (`lint:network`)

Phase 9 criterion 1 (FND-03) code half as a structural invariant:
`scripts/check-network-isolation.mjs` bans direct network primitives
(fetch/XMLHttpRequest/WebSocket/axios) in all first-party code and confines
networked SDK imports to their seams (purchases.ts, posthog.ts;
@supabase/supabase-js allowed nowhere until MONEY-04 builds its seam).
RED-proofed with a seeded fetch(). First dry run caught the stale PostHog
drop-in comment block in analytics.ts (implemented since) — replaced with a
pointer. Runtime hardening: the PostHog transport callback try/catches
capture() so a throwing client can never propagate through track() into a
UI call site (tested).

## 3. `docs/release-env.md`

Defuses the ".env.local doesn't travel to EAS" landmine: exact
`eas env:create` commands for the three EXPO_PUBLIC keys, goog_/appl_-vs-
test_ key rules (Test Store key in a store build = review rejection + SDK
crash), and a pre-submission checklist with a live-pricing smoke check.

## Still device-/founder-side (unchanged)

Play Console + RC Play app setup, real-store purchase/restore verification,
PostHog EU dashboard event confirmation (ANLY-02 close), iOS pipeline,
MONEY-04.
