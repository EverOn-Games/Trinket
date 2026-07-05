---
gsd_artifact: summary
quick_id: 260705-u63
slug: settings-tier-display-reactive-to-subscr
status: complete
completed: 2026-07-05
requirements: [MONEY-01, SETT-01]
verify: "33 suites / 261 tests green (lint + hex + mascot-assets + typecheck + jest)"
---

# Summary: Settings tier display reactive to subscriptionCache

## Trigger

Device UAT: full purchase loop now works (fresh sandbox purchase → entitlement
granted → paywall auto-dismissed back to Settings) — but the "Your plan" row
kept showing Free until the screen was remounted (home → back).

## Cause

`settings.tsx` read the tier with an imperative `getTier()` call at render
time. Settings stays mounted beneath the pushed paywall, and nothing
subscribed it to `subscriptionCache`, so the granted purchase's store write
never re-rendered the row.

## What shipped

- `entitlements.ts`: extracted `tierFromCache(cache)` (same defensive
  malformed-cache guard); `getTier()` delegates (still the right call for
  event-time checks like the session-start gate); new `useTier()` hook
  subscribes via the zustand selector for render-time display.
- `settings.tsx` uses `useTier()`.
- Regression test: render free → flip `subscriptionCache` in `await act()`
  WITHOUT remount → plus row appears. RED-proofed (fails against the old
  `getTier()` read, passes with `useTier()`). Note: RNTL v14 requires the
  async `await act(async ...)` form — sync `act()` did not flush the update.

33 suites / 261 tests green. JS-only — no prebuild.
