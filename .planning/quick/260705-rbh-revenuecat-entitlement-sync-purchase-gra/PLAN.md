---
gsd_artifact: plan
quick_id: 260705-rbh
slug: revenuecat-entitlement-sync-purchase-gra
created: 2026-07-05
mode: quick
requirements: [MONEY-01, MONEY-03]
---

# Quick Task: RevenueCat entitlement sync + purchase-grant diagnostics

## Trigger (device UAT finding)

First real sandbox test purchase: the transaction appeared in the RevenueCat
sandbox but the app didn't react. Diagnosis: `purchase()` resolved with a
customerInfo whose `entitlements.active` did not contain the expected `plus`
id (dashboard id mismatch or product-not-attached), so `applyEntitlement`
returned false → silent `'unavailable'` → paywall stayed open. Two code gaps
made this worse than it needed to be:

1. **Zero dev diagnostics** on the exact failure surface — nothing tells the
   developer which entitlement ids actually came back.
2. **No entitlement re-sync, ever** — a grant missed at purchase time never
   self-heals, and an expired/refunded subscription keeps `plus` forever.

## Tasks

1. `purchases.ts`:
   - `__DEV__`-gated `console.warn` diagnostics (markers.ts fail-loud-in-dev
     precedent): purchase/restore completing WITHOUT the expected entitlement
     logs expected id vs actual active ids + the dashboard fix hint; caught
     errors on configure/offerings/purchase/restore paths are logged.
   - Entitlement sync: after configure, register
     `Purchases.addCustomerInfoUpdateListener(syncEntitlementFromCustomerInfo)`
     and fetch `getCustomerInfo()` once. Sync is authoritative both ways:
     active plus → cache `{tier:'plus'}`; no plus → cache `null` (downgrade).
     Fetch/listener errors leave the cache untouched (MONEY-03 offline
     posture: cached plus persists offline). Purchase/restore results keep
     grant-only semantics (a failed purchase never downgrades).
2. `__mocks__/react-native-purchases.ts`: add `addCustomerInfoUpdateListener`.
3. `purchases.test.ts`: sync-up (self-heal at launch), sync-down (expiry),
   offline-leave-alone, listener registration + firing, and the
   missing-entitlement diagnostic (console.warn spy).
4. `npm run verify` green; SUMMARY + STATE row; commit + push. JS-only change
   — no prebuild needed on the device, Metro reload suffices.
