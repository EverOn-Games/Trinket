---
phase: 07-subscription-freemium
plan: retroactive
subsystem: subscription
tags: [entitlements, freemium, revenuecat-seam, jest, typescript]

# Dependency graph
requires:
  - phase: 01-scaffold-foundations
    provides: "sessionsRepo, useSettingsStore.subscriptionCache field"
  - phase: 03-co-pilot-end-to-end
    provides: "co-pilot.tsx start-session call sites (all 3 paths) that the gate wraps"
provides:
  - "src/features/subscription/entitlements.ts — tier resolution + Monday-anchored weekly session window (derived, no counters)"
  - "src/features/subscription/purchases.ts — offering-shaped seam, reference-mode pricing, purchase/restore resolve 'unavailable'"
  - "src/app/paywall.tsx — offer-not-wall paywall screen"
  - "Freemium gate wired into src/app/co-pilot.tsx (all 3 start paths + dumpItemId auto-start effect)"
  - "Settings 'See plans' link"
affects: [08-settings-analytics, 09-beta-hardening]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Entitlement/counter derivation from existing timestamps at read time — no stored aggregates"
    - "Offering-shaped seam (purchases.ts) so a real SDK swap touches one file"
    - "No-greyed-buttons monetization gate: gated affordances stay tappable, tap opens an offer (paywall), never a disabled control"

key-files:
  created:
    - src/features/subscription/entitlements.ts
    - src/features/subscription/purchases.ts
    - src/app/paywall.tsx
    - src/features/subscription/__tests__/entitlements.test.ts
    - src/app/__tests__/freemiumGate.test.tsx
  modified:
    - src/app/co-pilot.tsx
    - src/app/settings.tsx
    - i18n/locales/en.json
    - i18n/locales/pl.json

key-decisions:
  - "Gate at session-start only (never mid-session, never against history); tier from a POSITIVELY cached paid entitlement only, everything else quietly resolves free (MONEY-03 posture)"
  - "No greyed-out buttons on gate hit — gated affordances stay tappable and open the paywall as an offer, a deliberate departure from the industry-standard disabled-button pattern to honor the shame-free constraint"
  - "Reference-mode pricing hardcodes the brief's exact PL/US numbers as display strings; purchase()/restore() always resolve 'unavailable' until a RevenueCat key exists"
  - "Freemium gate debounce (800ms) reuses the brain-dump promote-button precedent so a user backing out of the paywall isn't stuck with a dead re-tap for the debounce window"

patterns-established:
  - "Entitlement derivation-not-storage: any future gated resource should compute its state from existing timestamped records, never a stored counter"

requirements-completed: [MONEY-02]

# Metrics
duration: unknown (built outside per-plan tracking; direct-dev session)
completed: 2026-07-05
status: CORE-COMPLETE / PARTIAL — see Honest Status
---

# Phase 7: Subscription Infrastructure + Freemium Gate Summary

**Session-start freemium gate (3 free Co-pilot sessions/week, Monday-anchored, derived from timestamps) with an offer-not-wall paywall and a RevenueCat-shaped purchases seam running in reference/inert mode**

## Retroactive Notice

This phase was built via founder-authorized direct development, bypassing the normal `/gsd:plan-phase` → `/gsd:execute-plan` pipeline (no PLAN.md files exist). This SUMMARY was written after the fact from git history and source inspection.

## HONEST STATUS — this phase is NOT fully complete

| Requirement | Status | Detail |
|---|---|---|
| MONEY-02 | **Complete** | Free tier = unlimited Brain dump + 3 Co-pilot sessions/week; gate copy is shame-free ("sessions refresh Monday"). Code-verified, tested. |
| MONEY-01 | **PARTIAL** | Reference-mode pricing display matches the brief exactly; NO real RevenueCat SDK, API key, or store product configuration exists — real purchases are unbuilt. |
| MONEY-03 | **PARTIAL** | Offline/unknown-defaults-to-free logic is done and unit-tested; the "restore purchases works on a fresh install" half needs a real RevenueCat account + device — unverified. |
| MONEY-04 | **PARTIAL (vacuously true only)** | No account system exists at all yet, so trivially "no account is required for the core loop" — but the actual "account introduced only at purchase/restore" flow this requirement describes has zero Supabase auth wiring. Do not read this as delivered. |

**Do not mark MONEY-01, MONEY-03, or MONEY-04 as complete in REQUIREMENTS.md.** Only MONEY-02 is checked off by this phase.

## Accomplishments

- `src/features/subscription/entitlements.ts`: `getTier()`, `startOfCurrentWeek()` (DST-safe calendar math), `sessionsStartedThisWeek()`, `canStartSession()` — all derived from `sessionsRepo` timestamps at check time, zero stored counters.
- `src/features/subscription/purchases.ts`: `getPlanOptions(locale)` (brief's exact PL/US reference pricing), `isPurchasingAvailable()` (currently `false`), `purchase()`/`restore()` (currently always `'unavailable'`) — an offering-shaped seam documented for a one-file RevenueCat swap.
- `src/app/paywall.tsx`: offer-not-wall screen, "Not now" always present, restore link always offered, honest "purchases aren't switched on" caption in reference mode.
- Gate wired into `src/app/co-pilot.tsx` on all 3 session-start paths and the `dumpItemId` auto-start effect, before any persistence; debounced re-push (no dead buttons on return).
- Settings "See plans" link (`src/app/settings.tsx`).

## Commits

Located via `git log --oneline --grep="(07)"` plus the shared cross-phase fix commit:

1. `e60fa8b` — feat(07): entitlements core — tier resolution + Monday-anchored weekly window
2. `639507a` — feat(07): paywall screen + purchases seam (reference mode)
3. `1b808aa` — feat(07): session-start freemium gate + settings See-plans link
4. `ec0fadb` — test(07): gate-at-limit, offer-dismiss round-trip, plus bypass, paywall + pricing coverage
5. `8b357b2` — fix(05-08): blitz-review findings (no findings specific to this phase's own logic beyond IN-04, an uncommented-but-not-fixed magic number)

No standalone `docs(07)` completion commit exists (retroactive).

## Files Created/Modified

- `src/features/subscription/entitlements.ts` — tier + weekly window derivation
- `src/features/subscription/purchases.ts` — reference-mode pricing/purchase/restore seam
- `src/app/paywall.tsx` — paywall screen
- `src/app/co-pilot.tsx` — gate wiring (all 3 paths + dumpItemId effect)
- `src/app/settings.tsx` — See-plans link
- `src/features/subscription/__tests__/entitlements.test.ts` — tier/window unit tests
- `src/app/__tests__/freemiumGate.test.tsx` — gate-at-limit, dismiss round-trip, plus-tier bypass, paywall/pricing coverage
- `i18n/locales/{en,pl}.json` — `paywall.*` / gate copy

## Test Evidence

- `src/features/subscription/__tests__/entitlements.test.ts` — 8 tests per the session's own accounting.
- `src/app/__tests__/freemiumGate.test.tsx` — 6 tests per the session's own accounting.
- Full repo suite verified during this retro-documentation pass: `npx jest` → **29 suites / 221 tests, all green.**

## Deviations from Plan

No PLAN.md existed to deviate from (direct-dev bypass). The same-session blitz code review found this phase's gate-wiring and inert-purchase-mode logic clean:

> "the freemium gate correctly fires on all three session-start affordances *and* the `dumpItemId` auto-start effect (traced explicitly); Resume of a live session never re-enters the gate ... the `paywall.tsx` purchase/restore functions are truly inert in reference mode." — BLITZ-REVIEW.md Summary

The only finding touching this phase (IN-04, the uncommented 800ms debounce constant) was assessed as low-severity and left undocumented-but-functional rather than fixed.

**Total deviations:** 0 requiring a fix in this phase.
**Impact:** N/A.

## Known Stubs

- `purchases.ts`'s `purchase()`/`restore()` are intentional stubs that always resolve `'unavailable'` — this is a documented, honest reference-mode posture (not a hidden gap), explained in-module and in this SUMMARY's Honest Status table. Full RevenueCat wiring is the tracked next step, not a silent omission.
- `getPlanOptions()` returns hardcoded display strings rather than live store-fetched prices — also intentional and documented.

## User Setup Required

**Real purchases require, before this phase can be marked fully complete:**
- A RevenueCat project + `EXPO_PUBLIC_REVENUECAT_KEY`.
- App Store Connect / Play Console product configuration for weekly/monthly/annual tiers matching the brief's pricing.
- `npx expo install react-native-purchases` + `npx expo prebuild --clean` (native dependency, not yet installed).
- Supabase auth wiring for the account-at-purchase flow (MONEY-04).
- Device-level purchase-then-offline and offline-fresh-install verification (carried forward to Phase 9 per STATE.md's existing blocker list).

## Next Phase Readiness

- MONEY-02 is code-complete and safe to check off.
- The purchases seam is genuinely swap-ready — `entitlements.ts` doesn't care which system writes `subscriptionCache`, so wiring RevenueCat later requires no changes to the gate or entitlement logic.
- Phase 9 (Beta Hardening) must NOT assume MONEY-01/03/04 are done; its offline-correctness sweep should explicitly re-verify entitlement behavior once RevenueCat is wired, not just re-confirm today's reference-mode behavior.

---
*Phase: 07-subscription-freemium*
*Completed: 2026-07-05 (core); MONEY-01/03/04 remain open*

## Self-Check: PASSED

Verified via `git log --oneline --all | grep -E "e60fa8b|639507a|1b808aa|ec0fadb|8b357b2"` — all 5 commit hashes present. Verified via `ls`: `src/features/subscription/entitlements.ts`, `src/features/subscription/purchases.ts`, `src/app/paywall.tsx` all present on disk. Verified via `npx jest`: 29 suites / 221 tests green.
