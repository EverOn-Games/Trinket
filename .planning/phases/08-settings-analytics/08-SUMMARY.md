---
phase: 08-settings-analytics
plan: retroactive
subsystem: settings-analytics
tags: [analytics, allowlist, i18n, jest, typescript, posthog-seam]

# Dependency graph
requires:
  - phase: 05-starter
    provides: "cancelIntentionNotification, reused for the reminders-off sweep"
  - phase: 07-subscription-freemium
    provides: "shame-free gate copy register, reused for the plan row's tone"
provides:
  - "src/app/settings.tsx — locale, reminders, mascot prominence, plan row"
  - "src/analytics/events.ts — typed event allowlist (ANLY-01)"
  - "src/analytics/analytics.ts — no-op track() transport seam + runtime content guard"
  - "Funnel instrumentation call sites across _layout.tsx, co-pilot.tsx, onboarding.tsx, starter.tsx, brain-dump.tsx"
affects: [09-beta-hardening]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Transport-seam analytics: typed allowlist + no-op track() until a real SDK key exists, so instrumentation ships ahead of the vendor integration"
    - "Type-level + runtime-guard double enforcement against content payloads (closed enums at the type layer, allowlist scan at runtime)"

key-files:
  created:
    - src/analytics/events.ts
    - src/analytics/analytics.ts
    - src/analytics/__tests__/analytics.test.ts
    - src/app/__tests__/settings.test.tsx
  modified:
    - src/app/settings.tsx
    - src/app/_layout.tsx
    - src/app/co-pilot.tsx
    - src/app/onboarding.tsx
    - src/app/starter.tsx
    - src/app/brain-dump.tsx
    - i18n/locales/en.json
    - i18n/locales/pl.json

key-decisions:
  - "track() is a silent no-op until a PostHog EU transport is wired; the drop-in (host, autocapture-off, replay-never) is documented in-module, not deferred as an open question"
  - "Every analytics event property is typed to number/boolean/closed-string-enum — free-form strings are structurally unrepresentable, so content cannot ride along even by mistake"
  - "A runtime allowlist guard (event names + string tokens) sits beneath the type system as defense-in-depth"
  - "Reminders-off actively cancels every intention's live OS notification via a sweep, not just a future-suppression flag"
  - "D7/D30 retention aggregation is deliberately NOT computed on-device — app_opened recurrence is the raw signal, aggregation happens backend-side once one exists"

patterns-established:
  - "Transport-seam pattern for any future analytics/telemetry vendor: build the typed, tested, inert instrumentation layer before the SDK key exists"

requirements-completed: [SETT-01, ANLY-01]

# Metrics
duration: unknown (built outside per-plan tracking; direct-dev session)
completed: 2026-07-05
status: CODE-COMPLETE / analytics transport pending PostHog EU key
---

# Phase 8: Settings & Analytics Audit Summary

**Settings screen (locale/reminders/mascot-prominence/plan) plus a typed, allowlisted, structurally-content-free analytics transport seam instrumented across the full funnel and inert until a PostHog EU key exists**

## Retroactive Notice

This phase was built via founder-authorized direct development, bypassing the normal `/gsd:plan-phase` → `/gsd:execute-plan` pipeline (no PLAN.md files exist). This SUMMARY was written after the fact from git history and source inspection.

## Honest Status

| Requirement | Status | Detail |
|---|---|---|
| SETT-01 | **Complete** | Locale, notification opt-in, and subscription-state visibility all live on one Settings screen. Code-verified, tested. |
| ANLY-01 | **Complete at the code layer** | Typed allowlist + runtime guard enforced; no analytics SDK installed at all, so autocapture/session-replay are structurally absent (stronger than merely "disabled"). |
| ANLY-02 | **PARTIAL** | Every named funnel event (activation, session lifecycle, brain dump, promote, starter, reminder, gate/paywall) is instrumented at its real call site and is inert (`track()` no-ops). Nothing has reached an actual dashboard — no PostHog project/key exists yet. Do not mark ANLY-02 complete. |

## Accomplishments

- `src/app/settings.tsx`: locale chips (write-through listener reuse), reminders on/off with an active per-intention cancel sweep, mascot prominence chips (first UI surface for the Phase 2 field), plan row with shame-free copy + "See plans" link.
- `src/analytics/events.ts`: `AnalyticsEvents` typed map (11 event types), `ALLOWED_EVENT_NAMES`, `SAFE_STRING_TOKENS` — the entire privacy contract as one file.
- `src/analytics/analytics.ts`: `track()` no-op transport with a runtime guard dropping unknown events and non-token strings.
- Funnel instrumented at real call sites: `app_opened`, `onboarding_completed`, `session_started`, `session_completed` (the activation event), `brain_dump_saved`, `item_promoted`, `starter_created`, `reminder_scheduled`, `gate_shown`, `paywall_viewed`, `paywall_dismissed`.

## Commits

Located via `git log --oneline --grep="(08)"` plus the shared cross-phase fix commit:

1. `1dd5a94` — feat(08): typed analytics allowlist + no-content transport seam
2. `42040b1` — feat(08): settings screen — locale, reminders, mascot presence, plan row
3. `501ee63` — feat(08): instrument the activation/retention funnel call sites
4. `8b357b2` — fix(05-08): blitz-review findings (this phase's share: reminders-off sweep hardened with try/catch per-intention — WR-05; deleted the unused `sessionsRemaining_*` depletion-copy landmine — IN-02; added PL `_other` plural forms — IN-03)

No standalone `docs(08)` completion commit exists (retroactive).

## Files Created/Modified

- `src/analytics/events.ts` — typed event allowlist
- `src/analytics/analytics.ts` — no-op transport + runtime guard
- `src/analytics/__tests__/analytics.test.ts` — allowlist/guard coverage
- `src/app/settings.tsx` — the settings screen itself
- `src/app/__tests__/settings.test.tsx` — settings coverage
- `src/app/_layout.tsx`, `src/app/co-pilot.tsx`, `src/app/onboarding.tsx`, `src/app/starter.tsx`, `src/app/brain-dump.tsx` — funnel `track()` call sites
- `i18n/locales/{en,pl}.json` — `settings.*` copy

## Test Evidence

- `src/app/__tests__/settings.test.tsx` — 6 tests per the session's own accounting.
- `src/analytics/__tests__/analytics.test.ts` — 6 tests per the session's own accounting.
- Full repo suite verified during this retro-documentation pass: `npx jest` → **29 suites / 221 tests, all green** (the task brief's own claim of "30 suites" does not match the verified count on disk at retro-documentation time — 29 is the honest, re-verified number, see Self-Check below).

## Deviations from Plan

No PLAN.md existed to deviate from (direct-dev bypass). The relevant "deviation-equivalent" record is the same-session blitz code review:

### Auto-fixed Issues (via BLITZ-REVIEW, same session)

**1. [Bug] Reminders-off sweep had no error handling — partial-failure could leave ghost reminders active while the UI claimed "Off"**
- **Found during:** Same-session code review (BLITZ-REVIEW WR-05)
- **Fix:** Loop body wrapped so a single failed `intentionsRepo.update` doesn't abandon the remaining sweep; a rejection no longer becomes an unhandled promise rejection.
- **Files modified:** `src/app/settings.tsx`
- **Committed in:** `8b357b2`

**2. [Hygiene] Unused `sessionsRemaining_*` i18n keys directly embodied the forbidden depletion-copy pattern**
- **Found during:** BLITZ-REVIEW IN-02
- **Fix:** Deleted from both locale files; the plurals test was retargeted to the real `history.duration_*` keys instead.
- **Files modified:** `i18n/locales/en.json`, `i18n/locales/pl.json`, `i18n/__tests__/plurals.test.ts`
- **Committed in:** `8b357b2`

**3. [Hygiene] Polish plural set missing `_other` forms**
- **Found during:** BLITZ-REVIEW IN-03
- **Fix:** Added `_other` forms for count-based keys.
- **Files modified:** `i18n/locales/pl.json`
- **Committed in:** `8b357b2`

**Not fixed (assessed as info-only, left as-is):**
- IN-01: `settings.tsx`'s dead `setVersion` bump after the reminders-off loop has no visible effect on that screen — left in place, documented as dead weight rather than removed, since it's harmless and removing it was judged lower priority than the correctness fixes above.

---

**Total deviations:** 2 auto-fixed (1 bug, 1 hygiene-with-test-retarget) + 1 hygiene addition, via same-session review, all fixed before this retro-documentation pass began. 1 info-level item left unfixed by deliberate judgment call.
**Impact:** Necessary for correctness (WR-05) and to remove a forbidden-copy landmine (IN-02). No scope creep.

## Known Stubs

- `track()` in `src/analytics/analytics.ts` is an intentional no-op stub — every call site is real and wired, but no bytes leave the device. This is documented in-module (PostHog EU drop-in instructions) and is the literal reason ANLY-02 is PARTIAL, not a hidden gap.

## Threat Flags

None beyond what's already covered by the existing `<threat_model>` — this phase's new surface (Settings UI, analytics transport) introduces no new network endpoints (transport is a no-op), no new auth paths, and no schema changes at a trust boundary.

## User Setup Required

**Before ANLY-02 can be marked complete:**
- A PostHog EU project + API key, set at init as `host: 'https://eu.i.posthog.com'` (cannot be changed after project connection — must be set correctly the first time).
- Confirm autocapture disabled and Session Replay never enabled at the PostHog dashboard level once the SDK is wired (currently moot — no SDK installed at all).
- Live dashboard verification that activation (`session_completed` after install) and `app_opened` recurrence (for D7/D30) actually appear once wired.

## Next Phase Readiness

- SETT-01 and ANLY-01 are safe to check off.
- ANLY-02 must stay open until a real PostHog transport exists and dashboard delivery is verified — Phase 9 (Beta Hardening) should not assume funnel data is actually flowing anywhere yet.
- The analytics allowlist (`events.ts`) is the single source of truth for what the app may ever emit — any future phase adding a new tracked event must add it here first, keeping the type-level content guarantee intact.

---
*Phase: 08-settings-analytics*
*Completed: 2026-07-05 (code layer); analytics transport pending PostHog EU key*

## Self-Check: PASSED

Verified via `git log --oneline --all | grep -E "1dd5a94|42040b1|501ee63|8b357b2"` — all 4 commit hashes present. Verified via `ls`: `src/analytics/events.ts`, `src/analytics/analytics.ts`, `src/app/settings.tsx` all present on disk. Verified via `npx jest`: 29 suites / 221 tests green (re-verified count; corrects the task brief's "30 suites" figure to the actual on-disk total).
