---
gsd_artifact: plan
quick_id: 260705-qg3
slug: wire-revenuecat-and-posthog-eu-env-gated
created: 2026-07-05
mode: quick
requirements: [MONEY-01, MONEY-03, ANLY-02]
---

# Quick Task: Wire RevenueCat + PostHog EU (env-gated drop-in)

## Goal

Close out the two deliberately-inert Phase 7/8 seams so they light up the
moment real keys land on a dev machine — **without** requiring keys, a
device, or a prebuild in this container. Deliverable is *drop-in-ready
wiring*, not activated integrations.

- **RevenueCat (MONEY-01, half of MONEY-03):** `purchases.ts` gains a real
  RevenueCat path that activates when `EXPO_PUBLIC_REVENUECAT_KEY` is present
  and falls back to today's REFERENCE mode otherwise. On a granted `plus`
  entitlement it writes `subscriptionCache = { tier: 'plus' }`; any error /
  unknown state leaves the tier free, quietly (offline posture preserved by
  `entitlements.getTier`).
- **PostHog EU (ANLY-02 transport):** a new `src/analytics/posthog.ts` builds
  the EU-hosted client (autocapture + session replay OFF) and attaches it via
  `setAnalyticsTransport` — only when `EXPO_PUBLIC_POSTHOG_API_KEY` is present.
  Wired into `_layout.tsx` startup. No key → `track()` stays a no-op.

Supabase account-at-purchase (MONEY-04) is **out of scope** (deferred).

## Constraints honored

- No hex literals / no literal JSX strings introduced (none needed — pure logic).
- No streak/daily/diagnosis schema fields; new `setSubscriptionCache` action is
  excluded from the denylist runtime probe like the other setters.
- Native modules added ⇒ **`npx expo prebuild --clean` required after pulling.**

## Tasks

1. **deps** — `expo install react-native-purchases posthog-react-native
   expo-file-system expo-application react-native-svg`; add any required config
   plugins to `app.json`. Commit lockfile + app.json.
2. **RevenueCat wiring** — rewrite `purchases.ts` (env-gated configure /
   getPlanOptions-live-or-reference / purchase / restore); add typed
   `subscriptionCache` + `setSubscriptionCache` to the settings store; update
   the denylist test exclusion; add `__mocks__/react-native-purchases.ts` +
   `purchases.test.ts`.
3. **PostHog wiring** — add `src/analytics/posthog.ts`; call it from
   `_layout.tsx` startup; add `__mocks__/posthog-react-native.ts` +
   `posthog.test.ts`.
4. **verify + docs** — `npm run verify` green; SUMMARY.md; STATE.md Quick Tasks
   row + Blockers update (transport now wired, awaiting key only).

## Verification

- `npm run verify` fully green (lint + hex + mascot-assets + typecheck + jest).
- No-key path: `isPurchasingAvailable() === false`, `purchase()/restore()`
  resolve `'unavailable'`, `track()` no-op — unchanged behavior proven by tests.
- Key-present path (mocked): configure called with EU host / apiKey; a granted
  entitlement writes `{ tier: 'plus' }`; cancel → `'cancelled'`; error → free.
