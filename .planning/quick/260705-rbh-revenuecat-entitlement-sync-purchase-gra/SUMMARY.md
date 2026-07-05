---
gsd_artifact: summary
quick_id: 260705-rbh
slug: revenuecat-entitlement-sync-purchase-gra
status: complete
completed: 2026-07-05
requirements: [MONEY-01, MONEY-03]
verify: "33 suites / 259 tests green (lint + hex + mascot-assets + typecheck + jest)"
---

# Summary: RevenueCat entitlement sync + purchase-grant diagnostics

## Trigger

First device sandbox purchase: transaction landed in RevenueCat, app showed
nothing. Root cause (by elimination): `purchase()` resolved with customerInfo
whose `entitlements.active` lacked the expected `plus` id → grant-only
`applyEntitlement` returned false → silent `'unavailable'` → paywall stayed
open. Dashboard-side fix is the user's (attach product to the `plus`
entitlement, or set `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT`); the code-side
gaps fixed here are the silence and the missing re-sync.

## What shipped (`src/features/subscription/purchases.ts`)

1. **Dev diagnostics** (`devWarn`, `__DEV__`-gated, markers.ts precedent):
   - Purchase/restore completing WITHOUT the expected entitlement logs the
     expected id, the ACTUAL active ids returned, and the dashboard fix hint
     — the exact info needed to diagnose this class of failure from Metro logs.
   - configure / offerings-fetch / customer-info-fetch / purchase / restore
     errors are all logged (production behavior unchanged: quiet fallback).
2. **Entitlement sync (closes the self-heal + expiry gap):**
   - `configurePurchases()` now registers
     `Purchases.addCustomerInfoUpdateListener(syncEntitlementFromCustomerInfo)`
     and fetches `getCustomerInfo()` once at startup.
   - Sync is authoritative both ways: active plus → cache `{tier:'plus'}`
     (a grant missed at purchase time self-heals on next launch or listener
     fire — including retroactively once the dashboard attachment is fixed);
     no active plus while cache says plus → cache `null` (expired/refunded
     downgrades quietly).
   - Fetch/listener errors leave the cache untouched — cached plus persists
     offline (MONEY-03), absent cache stays quietly free.
   - Purchase/restore results keep grant-only semantics (a failed purchase
     never downgrades an existing plus).
   - Side-loads are independently fault-tolerant: an offerings failure no
     longer skips the entitlement sync (and vice versa).

Mock: `addCustomerInfoUpdateListener` added. Tests: +5 (sync-up self-heal,
sync-down expiry, offline-leave-alone, listener both-ways, missing-entitlement
diagnostic). `npm run verify` → 33 suites / 259 tests green.

## Deployment note

JS-only change — **no prebuild needed**; pull + Metro reload on the device.
Once the RevenueCat dashboard has the product attached to the `plus`
entitlement, the EXISTING sandbox purchase should self-heal to Plus on next
app launch via the startup sync, without re-purchasing.
