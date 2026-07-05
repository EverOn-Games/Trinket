---
gsd_artifact: plan
quick_id: 260705-w3n
slug: manage-subscription-link-in-settings-via
created: 2026-07-05
mode: quick
requirements: [MONEY-01, SETT-01]
---

# Quick Task: Manage-subscription link in Settings

## Trigger

Founder: without accounts, users need a route to manage/cancel their
subscription. Billing always lives with the store (true even with accounts);
both stores expect subscription apps to link to their management surface.

## Tasks

1. `purchases.ts` seam: `getManagementUrl(): Promise<string>` — RevenueCat
   `customerInfo.managementURL` when available; falls back to the platform's
   store-subscriptions URL (Platform.select) with no key / on any error.
   Store knowledge stays in the seam; never throws.
2. `settings.tsx`: when tier is plus, a quiet "Manage subscription" row under
   the plan text → `Linking.openURL(await getManagementUrl())`, swallowing
   open failures. Offer-shaped label, no urgency.
3. i18n en+pl (`settings.subscription.manage`); copy gate stays green.
4. Tests: seam (no-key fallback, RC url passthrough, error fallback — mock
   `makeCustomerInfo` gains a managementURL param) + settings (plus tier
   shows the row; press opens a URL via spied Linking).
5. `npm run verify` green; SUMMARY + STATE row; commit + push. JS-only.
