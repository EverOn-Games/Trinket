---
gsd_artifact: summary
quick_id: 260705-qg3
slug: wire-revenuecat-and-posthog-eu-env-gated
status: complete
completed: 2026-07-05
requirements: [MONEY-01, MONEY-03, ANLY-02]
commits:
  - "chore(deps): add react-native-purchases + posthog-react-native (+peers)"
  - "feat(subscription+analytics): env-gated RevenueCat + PostHog EU wiring"
verify: "32 suites / 250 tests green (lint + hex + mascot-assets + typecheck + jest)"
---

# Summary: Wire RevenueCat + PostHog EU (env-gated drop-in)

## What shipped

Both previously-inert Phase 7/8 seams are now **drop-in-ready wiring** — real
code paths that activate the moment a key is present in the env, with today's
REFERENCE/no-op behavior preserved exactly when it isn't. Nothing is
device-verified (no keys, no store/Supabase config, no device in this
container); this is the code half only.

### RevenueCat (`src/features/subscription/purchases.ts`) — MONEY-01, part of MONEY-03
- Gated on `EXPO_PUBLIC_REVENUECAT_KEY`. With no key: `isPurchasingAvailable()`
  is `false`, `getPlanOptions()` returns the brief's reference pricing,
  `purchase()`/`restore()` resolve `'unavailable'` — unchanged shipped behavior.
- With a key: `configurePurchases()` (called at startup) configures RevenueCat
  and warms **live store pricing** (`getPlanOptions` returns live-or-reference,
  weekly→monthly→annual). `purchase(planId)` buys the matching offering package
  and writes `subscriptionCache = { tier: 'plus' }` **only** on a granted
  `plus` entitlement (id overridable via `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT`).
  Offline posture held on every path: user cancel → `'cancelled'`, any other
  error / absent entitlement → `'unavailable'`, tier left free, quietly.
- `subscriptionCache` is now typed (`data/types.ts` `SubscriptionCache`) with a
  `setSubscriptionCache` store action (excluded from the denylist runtime probe
  like the other setters). The paywall needed **zero changes** — it already
  read the offering-shaped seam.

### PostHog EU (`src/analytics/posthog.ts`) — ANLY-02 transport
- Gated on `EXPO_PUBLIC_POSTHOG_API_KEY`. `initPostHogTransport()` builds the
  EU-hosted client (`host: https://eu.i.posthog.com`, `captureAppLifecycleEvents:
  false`, `enableSessionReplay: false`) and attaches it via
  `setAnalyticsTransport`. No key → `track()` stays the silent no-op it was.
- `analytics.ts`/`events.ts` untouched: the content-stripping allowlist guard
  still runs on the way to the transport (verified end-to-end in the test).

### Startup + tests
- `_layout.tsx` attaches both once at boot (`useStartupIntegrations`, ordered
  before `useTrackAppOpened` so the first `app_opened` is captured when a key
  exists). Neither ever throws — a purchases/analytics init failure can't break
  boot.
- Jest mocks: `__mocks__/react-native-purchases.ts` (offerings + customer-info
  builders) and `__mocks__/posthog-react-native.ts` (records constructed
  clients), registered in `jest.setup.ts`. New suites `purchases.test.ts` (11)
  and `posthog.test.ts` (5) cover both no-key and key-present paths.

## Verification
`npm run verify` → **32 suites / 250 tests green** (was 234). lint, hex gate,
mascot-asset gate, and `tsc --noEmit` all clean.

## ⚠ After pulling
Native modules were added (`react-native-purchases`, `posthog-react-native` +
peers `expo-file-system`, `expo-application`, `react-native-svg`). **Run
`npx expo prebuild --clean`** before the next device build. Neither package
ships an Expo config plugin — `app.json` is unchanged.

## Explicitly NOT done (still open, unchanged by this task)
- **Activation**: no RevenueCat key, no App/Play Store product + `plus`
  entitlement configuration, no PostHog EU key → real purchases and dashboard
  events remain unverified. Add the env keys on a dev machine and the paths
  light up with no code change.
- **MONEY-04** (Supabase account-at-purchase / restore) — deferred, out of scope.
- Device UAT of the real purchase + restore-on-fresh-install flow, and events
  landing in the EU dashboard.
