---
gsd_artifact: plan
quick_id: 260705-t50
slug: paywall-restore-purchase-quiet-outcome-f
created: 2026-07-05
mode: quick
requirements: [MONEY-01, MONEY-03]
---

# Quick Task: Paywall restore/purchase quiet outcome feedback

## Trigger (device UAT finding)

Tapping "Restore purchases" with no restorable entitlement (or a store
failure) does literally nothing — the designed quiet-fallback left the user
with zero signal that the tap even registered. "Silent" is right for the
tier posture; it's wrong for a button the user just pressed.

## Tasks

1. `paywall.tsx`: add a calm outcome notice — restore → `'unavailable'` shows
   "couldn't find a subscription to restore"; purchase → `'unavailable'` (only
   when purchasing IS available — reference mode keeps its existing static
   caption) shows "store couldn't finish that just now". `'cancelled'` stays
   noticeless (the user did the cancelling). Buttons disabled while a call is
   in flight (double-tap guard, same class as isSavingRef precedents). Notice
   copy: offers/states facts, no urgency, no blame (PDA/shame-free).
2. i18n: `paywall.notice.restoreNone` / `paywall.notice.purchaseIssue` in
   en+pl (PL warm/plain/gender-neutral).
3. Tests in `paywallPurchase.test.tsx` for both notices + cancelled-stays-quiet.
4. `npm run verify` green; SUMMARY + STATE row; commit + push. JS-only.
