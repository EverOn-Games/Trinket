---
status: pending
phase: 07-subscription-freemium
source: [07-SUMMARY.md]
started: 2026-07-05T00:00:00Z
updated: 2026-07-05T00:00:00Z
---

## Current Test

[queued — runs after 06-UAT]

## Tests

### 1. Under the weekly limit, nothing changed
expected: With fewer than 3 Co-pilot sessions started this week, starting a session works exactly as before — no gate, no counter, no "sessions remaining" anywhere in the UI.
result: [pending]

### 2. At the limit, the gate is an offer — and creates nothing
expected: After 3 sessions this week, the next start attempt opens the paywall instead (calm copy: sessions refresh Monday + what keeps working; no "you've run out", no urgency styling). "Not now" returns to the setup screen and all buttons still work — pressing start again simply reopens the paywall.
result: [pending]

### 3. Paywall content honest in reference mode
expected: Paywall shows 3 plans (weekly/monthly/annual) with your locale's pricing, annual note, a quiet caption that purchases aren't switched on yet, a Restore link, and "Not now". Choosing a plan does nothing silently harmful — no fake purchase, no charge.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0

## Gaps

[none yet]
