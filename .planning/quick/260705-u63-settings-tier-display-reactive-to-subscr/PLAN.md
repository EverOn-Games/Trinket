---
gsd_artifact: plan
quick_id: 260705-u63
slug: settings-tier-display-reactive-to-subscr
created: 2026-07-05
mode: quick
requirements: [MONEY-01, SETT-01]
---

# Quick Task: Settings tier display reactive to subscriptionCache

## Trigger (device UAT finding)

Full purchase loop now works (fresh sandbox purchase → entitlement granted →
paywall dismissed back to Settings) — but Settings still showed "Free" until
remounted (home → back). Cause: `settings.tsx:44` reads `getTier()`
imperatively at render; Settings stays mounted under the pushed paywall and
nothing subscribes it to `subscriptionCache` changes.

## Tasks

1. `entitlements.ts`: extract `tierFromCache(cache)` (same defensive guard);
   `getTier()` delegates to it; add `useTier(): Tier` — a zustand-subscribed
   selector for render-time display.
2. `settings.tsx`: `const tier = useTier()` (drop the imperative read).
3. Test (settings.test.tsx): render free → flip `subscriptionCache` to plus
   in `act()` WITHOUT remount → plus row appears (the exact device repro).
4. `npm run verify` green; SUMMARY + STATE row; commit + push. JS-only.
