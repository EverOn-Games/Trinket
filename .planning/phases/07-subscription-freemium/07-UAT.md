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
result: skipped
reason: Founder was already at/over the weekly limit from earlier live testing this week — under-limit behavior not observable until Monday refresh; covered by automated tests (freemiumGate.test.tsx "below the limit" case). Gate correctly appeared instead → folds into test 2.

### 2. At the limit, the gate is an offer — and creates nothing
expected: After 3 sessions this week, the next start attempt opens the paywall instead (calm copy: sessions refresh Monday + what keeps working; no "you've run out", no urgency styling). "Not now" returns to the setup screen and all buttons still work — pressing start again simply reopens the paywall.
result: pass (copy calm; Not now returns to live setup; no session created). Founder question re: returning to setup at limit folded into PINNED-07-01.

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

### PINNED-07-01: Gate placement — discuss + A/B in beta (product decision, founder-raised 2026-07-05)
- Founder observation during UAT: the gate fires at start-press, AFTER the user has set up the session — "the co-work seems available but we hit a paywall". Feels potentially unfriendly, though it is the committed-user route (higher payment intent).
- Current design rationale (D-01 family): no pre-announcing limits = no depletion UI anywhere; the cost is exactly this late surprise.
- Candidate B-arm for beta A/B: a single calm disclosure line on the Co-pilot setup screen when already at the limit (e.g. "Free sessions refresh Monday — you can still set one up with Plus"), before any setup effort is invested. Must stay a statement of fact, never a counter/meter.
- Instrumentation already in place: gate_shown / paywall_viewed / paywall_dismissed funnel. A/B needs only an arm flag added to those events' props (closed-enum token, privacy-safe).
- Status: pinned for post-beta-data discussion; NOT a launch blocker.
- Second founder observation (same UAT): "Not now" returns to the setup screen — correct per no-lockout principle, but at the limit that screen is a polite cul-de-sac ("why am I here if I can't start?"). Strengthens the B-arm: a calm disclosure line on setup would make the return destination self-explanatory.
