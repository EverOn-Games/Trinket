---
gsd_artifact: summary
quick_id: 260705-t50
slug: paywall-restore-purchase-quiet-outcome-f
status: complete
completed: 2026-07-05
requirements: [MONEY-01, MONEY-03]
verify: "33 suites / 260 tests green (lint + hex + mascot-assets + typecheck + jest)"
---

# Summary: Paywall restore/purchase quiet outcome feedback

## Trigger

Device UAT: tapping "Restore purchases" with no restorable entitlement did
literally nothing — the tier-level quiet-fallback posture had leaked into
button feedback, where silence reads as a dead control.

## What shipped (`src/app/paywall.tsx` + i18n)

- Calm outcome notice under the buttons, live mode only (reference mode keeps
  its existing static caption): restore → `'unavailable'` shows
  `paywall.notice.restoreNone` ("We couldn't find a subscription to restore on
  this account."); purchase → `'unavailable'` shows `paywall.notice.purchaseIssue`
  ("The store couldn't finish that just now — nothing was charged.").
  `'cancelled'` stays noticeless — the user did the cancelling, no commentary.
  A granted result still quietly dismisses (unchanged).
- `busy` state disables Choose/Restore while a call is in flight (double-tap
  guard, same class as the isSavingRef precedents).
- EN + PL keys (PL warm/plain/gender-neutral). Copy states facts, no urgency,
  no blame.
- Tests: restore-none notice, live-mode purchase-issue notice, cancelled
  stays noticeless. 33 suites / 260 tests green. JS-only — no prebuild.
