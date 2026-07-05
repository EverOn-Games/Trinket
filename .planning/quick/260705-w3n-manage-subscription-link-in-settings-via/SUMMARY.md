---
gsd_artifact: summary
quick_id: 260705-w3n
slug: manage-subscription-link-in-settings-via
status: complete
completed: 2026-07-05
requirements: [MONEY-01, SETT-01]
verify: "33 suites / 267 tests green; all gates clean"
---

# Summary: Manage-subscription link in Settings

Founder concern: without accounts, users need a route to manage/cancel.
Billing always lives with the store (true even with a future MONEY-04
account system), so the correct affordance is a link to the store's
management surface.

- `purchases.ts`: `getManagementUrl()` — RevenueCat `customerInfo.managementURL`
  when available, platform store-subscriptions URL fallback (no key /
  offline / error). Never throws, never null; store knowledge stays in the
  seam. Mock's `makeCustomerInfo` gained a managementURL param.
- `settings.tsx`: plus tier shows a quiet "Manage subscription" row (mirrors
  the free tier's "See plans" styling) → `Linking.openURL`, open failures
  swallowed.
- i18n en+pl (`settings.subscription.manage`); copy gate green (348 strings).
- Tests: seam fallback/passthrough/offline + settings row shown-for-plus /
  hidden-for-free / opens https URL.

JS-only — Metro reload, no prebuild.
