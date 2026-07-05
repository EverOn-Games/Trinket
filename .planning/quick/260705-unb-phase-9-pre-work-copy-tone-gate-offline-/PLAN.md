---
gsd_artifact: plan
quick_id: 260705-unb
slug: phase-9-pre-work-copy-tone-gate-offline-
created: 2026-07-05
mode: quick
requirements: [FND-03]
---

# Quick Task: Phase 9 pre-work — copy-tone gate, offline seam sweep, EAS env docs

## Goal

Start the in-container half of Phase 9 (Beta Hardening) while Play Console /
store setup churns on the founder side. Three deliverables, three atomic
commits:

1. **Copy-tone gate** (Phase 9 criterion 4, repeatable): `scripts/
   check-copy-tone.mjs` — fail-closed scan of `i18n/locales/*.json` against
   shame/streak/urgency stems and forbidden medical/regulatory claims
   (EN + PL patterns), wired into `npm run verify` as `lint:copy` alongside
   the hex gate. Reports file + JSON key path + matched pattern. Curated
   stems only (no false-positive-prone words); store listings get audited at
   submission time — this gate owns the in-app copy surface.
2. **Offline seam sweep** (criterion 1, code half): `scripts/
   check-network-isolation.mjs` — asserts (a) zero direct network primitives
   (fetch/XMLHttpRequest/WebSocket/axios) in first-party code, (b) the
   networked SDK imports stay confined to their seam modules
   (react-native-purchases → purchases.ts; posthog-react-native →
   posthog.ts; @supabase/supabase-js → nowhere yet). Wired into verify as
   `lint:network`. Plus one runtime hardening fix: wrap the PostHog transport
   callback so a synchronously-throwing capture() can never propagate into a
   UI call site's track().
3. **EAS env docs** (landmine defusal): `docs/release-env.md` — the exact
   `eas env:create` commands for the three EXPO_PUBLIC keys, which key type
   belongs in which build profile, and the test_-key rejection warning.

## Verification

`npm run verify` green including the two new gates; both gates RED-proofed
(seeded violation makes them exit 1).
