---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: ready_to_plan
stopped_at: "Quick task 260705-qg3: RevenueCat + PostHog EU env-gated wiring landed in code (250 tests green); pending: real keys + store/dashboard config + device UAT, MONEY-04 (Supabase), Phase 9 hardening. Native modules added → prebuild --clean required."
last_updated: "2026-07-05T19:30:00.000Z"
last_activity: 2026-07-05
progress:
  total_phases: 9
  completed_phases: 7
  total_plans: 22
  completed_plans: 22
  percent: 78
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-01)

**Core value:** A user who has been avoiding a task can open Trinket and actually start it in the mascot's presence — Co-pilot lowers the threshold to start.
**Current focus:** Phase 9 — Beta Hardening (Phase 7's RevenueCat integration remains partial and should be closed out before or during Phase 9)

## Current Position

Phase: 9
Plan: Not started
Status: Ready to plan
Last activity: 2026-07-05

Progress: [████████░░] 78%

**Honest phase status:** Phases 1-6 and 8 are fully complete. Phase 7 (Subscription Infrastructure + Freemium Gate) is CORE-COMPLETE ONLY — entitlements/gate/paywall/reference-pricing are done and tested, but real RevenueCat purchases (MONEY-01), offline restore-on-fresh-install (MONEY-03), and the account-at-purchase flow (MONEY-04) remain open pending RevenueCat keys, store product configuration, Supabase auth, and device verification. Phase 9 has not started. Phases 5, 6, 7, 8 were built via founder-authorized direct development bypassing the normal GSD plan/execute pipeline (no PLAN.md files exist for these phases) and were retro-documented on 2026-07-05 — see each phase's CONTEXT.md/SUMMARY.md for the reconstructed decision trail.

## Performance Metrics

**Velocity:**

- Total plans completed: 21
- Average duration: - min
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 6 | - | - |
| 2 | 5 | - | - |
| 3 | 4 | - | - |
| 4 | 6 | - | - |
| 5 | n/a (direct dev, not plan-tracked) | - | - |
| 6 | n/a (direct dev, not plan-tracked) | - | - |
| 7 | n/a (direct dev, not plan-tracked; core only) | - | - |
| 8 | n/a (direct dev, not plan-tracked) | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 01 P01 | 8 | 2 tasks | 53 files |
| Phase 01 P02 | 6min | 2 tasks | 8 files |
| Phase 01 P03 | 10min | 2 tasks | 7 files |
| Phase 01 P04 | 9min | 2 tasks | 8 files |
| Phase 01 P05 | ~7min | 2 tasks | 10 files |
| Phase 01 P06 | 113min | 3 tasks | 41 files |
| Phase 02 P01 | 10min | 3 tasks | 9 files |
| Phase 02 P02 | 4min | 3 tasks | 10 files |
| Phase 02 P03 | 8min | 3 tasks | 6 files |
| Phase 2 P04 | 32min | 2 tasks | 4 files |
| Phase 2 P05 | 33min | 3 tasks | 10 files |
| Phase 03 P01 | 8min | 3 tasks | 8 files |
| Phase 03 P02 | 15min | 3 tasks | 5 files |
| Phase 03 P03 | 13min | 3 tasks | 5 files |
| Phase 03 P04 | 16min | 2 tasks | 5 files |
| Phase 03 P05 | 6min | 2 tasks | 2 files |
| Phase 04 P01 | 8min | 2 tasks | 5 files |
| Phase 04 P02 | 12min | 2 tasks | 4 files |
| Phase 04 P03 | 6min | 2 tasks | 2 files |
| Phase 04 P04 | 6min | 2 tasks | 2 files |
| Phase 04 P05 | 9min | 2 tasks | 2 files |
| Phase 04 P06 | 12min | 3 tasks | 10 files |
| Phase 05 (Starter, direct dev) | unknown | 4 commits | 12 files |
| Phase 06 (Onboarding, direct dev) | unknown | 3 commits | 8 files |
| Phase 07 (Subscription, direct dev, core only) | unknown | 4 commits | 9 files |
| Phase 08 (Settings+Analytics, direct dev) | unknown | 3 commits | 13 files |
| Cross-phase blitz-review fix (05-08) | unknown | 1 commit | 11 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: Followed research SUMMARY.md's 9-phase build order (scaffold → mascot → co-pilot → brain dump → starter → onboarding → subscriptions → settings/analytics audit → beta hardening) as-is; dependency analysis was well-grounded, no adjustment needed.
- Roadmap: FND-03 (offline-first correctness) mapped to Phase 9 (Beta Hardening) rather than Phase 1, since it is a cross-cutting outcome that can only be verified once every feature exists — matches research's framing of Phase 9 as an offline-correctness sweep.
- Roadmap: ANLY-01/ANLY-02 mapped to Phase 8 (the formal allowlist/audit checkpoint) even though inline `track()` calls are expected to be added feature-by-feature starting in Phase 2, per research's "threaded through, audited late" guidance.
- [Phase 01]: Scaffolded Expo SDK 56 via create-expo-app default@sdk-56 template into repo root — Live template places routes under src/app/ (not app/) with a @/* path alias; later plans should target src/app/ paths
- [Phase 01]: Omitted newArchEnabled from app.json per RESEARCH.md, superseding CLAUDE.md's literal wording — New Architecture is mandatory/default on SDK 55+; the key is a documented no-op per Expo docs
- [Phase 01-02]: Installed eslint-config-expo (missing after Plan 01) via npx expo install for Task 2's flat-config composition — Task 2 requires composing eslint-config-expo's flat config; package was pre-approved in RESEARCH.md Package Legitimacy Audit
- [Phase 01-02]: Added @types/jest devDependency and tsconfig types:[jest] — Required to keep tsc --noEmit clean under strict mode with jest globals in setup/test files, per CLAUDE.md's TypeScript-strict hard constraint
- [Phase 01-03]: Followed RESEARCH.md Pattern C earthy anchor palette directly for darkTokens per CONTEXT.md's Claude's-discretion note - genuine attempt, not a gray placeholder
- [Phase 01-03]: Adjusted hex-literal gate scan globs from app/**,features/**,components/** to src/app/**,src/features/**,src/components/** to match the live SDK 56 template's src/ layout
- [Phase 01-03]: check-hex-literals.mjs currently exits 1 against 3 pre-existing scaffold-default hex literals (src/components/animated-icon.tsx, themed-text.tsx) - expected per plan text, deferred to Plan 06's screen replacement
- [Phase 01-04]: Reordered TDD task pair into RED (tests) then GREEN (implementation) commits since both tasks are tdd=true and the plan's literal implementation-then-tests order would not produce a genuine failing-test proof point
- [Phase 01-04]: Added __mocks__/expo-localization.ts + jest.mock registration as supporting test infra, mirroring the react-native-mmkv mock pattern, since getLocales() wraps a native module unavailable under Jest
- [Phase 01-05]: Reordered plan's two tasks into RED-then-GREEN commit sequence (both test files first, then all repo/store implementation) to satisfy the TDD gate — mirrors 01-04's precedent since Task 2's tests exercise Task 1's repos
- [Phase 01-05]: Mapped source synthesis section 6.2's snake_case data-model sketch to camelCase field names in data/types.ts, matching ARCHITECTURE.md's sessionsRepo reference example (taskLabel, startedAt, endedAt) rather than a literal snake_case port
- [Phase 01-05]: MMKV encryption (T-01-08) explicitly deferred to Phase 7 per RESEARCH.md, documented in data/mmkv.ts rather than silently skipped
- [Phase 01]: D-05 confirmed: bundle/package identifier is com.trinket.app, superseding provisional com.everon.trinket — Founder decision at the Plan 06 device-boot checkpoint; app belongs to a separate, not-yet-named business (brand-only identifier)
- [Phase 01]: Android device-boot verified on user hardware (Windows, npx expo run:android); iOS device-boot verification deferred to Phase 2-3, hard gate before Phase 9 — User elected not to spend an EAS cloud build at this checkpoint; aligns iOS verification with first platform-divergent (Lottie) native work
- [Phase 02-01]: mascotProminence typed via import of Mascot module's own MascotProminence union in data/types.ts, not a redeclared inline union — Avoids drift between the two definitions
- [Phase 02-01]: setMascotProminence excluded from schema.denylist.test.ts's action-function destructure — Matches existing setLocale/setNotificationsOptIn exclusion pattern, keeping the runtime probe scoped to persisted data only
- [Phase 02-02]: Installed lottie-react-native by explicit package name only, confirming reanimated (4.3.1) and worklets (0.8.3) pins were left untouched — Pitfall 3 mitigation, T-02-SC threat
- [Phase 02-02]: Hand-authored 5 placeholder Lottie assets as minimal Bodymovin JSON with distinct motion signatures per state; idle carries blink/glance/postureShift markers reusing RESEARCH.md Pattern 2's exact frame ranges — Claude's Discretion; avoids design-tool dependency, trivially controllable marker names
- [Phase 02-03]: Ref-forwarding via post-render useEffect (not render-body ref writes) to satisfy react-hooks/refs eslint rule in useIdleScheduler — Direct ref.current writes during render trip react-hooks/refs; consolidated into one latestRef synced in a dependency-less useEffect
- [Phase 02-03]: Injected fixed deterministic random (0.5) into useIdleScheduler.test.ts timing assertions instead of real Math.random() — Real Math.random draws occasionally summed under the fake-timer assertion window, producing a ~30% flake rate; fixed random makes fire counts exact
- [Phase 2]: Dropped the per-instance ref-based asset cache from the plan's literal wording in favor of require()'s own module-registry caching, to satisfy the react-hooks/refs ESLint rule
- [Phase 2]: Registered react-native-worklets' and react-native-reanimated's official Jest mocks in jest.setup.ts rather than a custom Jest resolver, which destabilized lottie-react-native's manual mock resolution
- [Phase 2]: mockLottieRef test assertions must import via the bare 'lottie-react-native' specifier, not a relative path into __mocks__/, to guarantee the same module instance Mascot.tsx resolves via jest.mock automock
- [Phase 02-05]: Greeting cadence uses a module-level in-memory flag only, never a persisted timestamp (D-07) — keeps schema denylist intent
- [Phase 02-05]: Root-caused device-checkpoint blink jolt to Lottie's instant, non-interpolated seek on play(start,end); fixed by anchoring marker-boundary scale and moving blink to opacity-only, with zero component-code changes
- [Phase 03-01]: Discretion constants fixed: 45s heartbeat interval, 60s wake-grace window, 12h D-11 staleness threshold (midpoints of CONTEXT.md's discretion bands), gated on lastAliveAt per amended D-11 — Consumed verbatim by Plan 03-02+ (session screen, root layout reconciliation hook); confirms RESEARCH.md Open Question 1's resolution
- [Phase 03-01]: lastTouchAt implemented as React state, not a ref, in useElapsedSession — TDD-caught bug: a ref mutation in wake() does not schedule a re-render, leaving isDozing stale until the next incidental tick
- [Phase 03-02]: Cross-test render leak in expo-router/testing-library: avoid asserting on a destination screen's content right after fireEvent.press in the same it() block — Home offer press test failed 3 unrelated subsequent tests when it also asserted post-navigation screen content; simplified to only assert session-count, verified navigation separately
- [Phase 03-02]: @testing-library/react-native v14's fireEvent is async and must be awaited on every call, including fireEvent.press/.changeText, in any chained interaction sequence — Un-awaited chained fireEvent calls caused overlapping act() warnings and a stale-state test failure (0 sessions created instead of 1)
- [Phase 03-02]: eslint-plugin-react-hooks' immutability check for Reanimated shared values is hook-declaration-order sensitive: mutate opacity.value in a useEffect declared BEFORE the useAnimatedStyle call reading it — Mirrors Mascot.tsx's existing hook order; declaring useAnimatedStyle first caused a false-positive immutability lint violation
- [Phase 03-03]: endSession (write + activeSessionRepo.clear + setFlowPhase('ending')) lives in the parent CoPilotScreen, not ActivePhase, since flowPhase/activeSession/sessionId already live there — ActivePhase keeps only its pre-existing isEndingSessionRef double-tap guard and calls the passed onEnd callback
- [Phase 03-03]: Mood glyph/value mapping (UI-SPEC Flag 5, Claude's discretion): 🙂=3 (good) / 😐=2 (okay) / 😣=1 (tough)
- [Phase 03-03]: Test navigation assertions use jest.spyOn(router, 'replace') on expo-router's shared imperative-api singleton rather than renderRouter's/screen's getPathname() — getPathname is Object.assign-attached onto the render Promise wrapper and does not survive @testing-library/react-native v14's async-render await unwrap
- [Phase 03-04]: Home independently re-verifies pointer liveness via reconcileActiveSession, not just pointer existence — React commits a component's first render before any effect in the tree fires, so Home's very first render is guaranteed to happen before _layout.tsx's useReconcileActiveSession effect runs
- [Phase 03-04]: STALE_THRESHOLD_MS (12h) defined and exported once from _layout.tsx, imported by index.tsx — satisfies the plan's grep-verifiable literal-constant requirement while avoiding a duplicated 12h literal across both files
- [Phase 03-04]: Home's post-Not-now state (dismissedActiveSession) is a plain boolean useState, not a re-read counter — this is what forces a re-render after Not now since activeSessionRepo.read() alone in the render body has no reactive subscription
- [Phase 03-05]: REVISES D-13 Pattern 3: acknowledge-animation completion no longer navigates Home; the ending moment persists until an explicit mood tap or Skip — 03-HUMAN-UAT.md Test 4 (major): the ~1500ms placeholder animation auto-dismissed the mood check before the user could tap anything
- [Phase 04-01]: Corrected classify.ts's tie-break logic beyond 04-PATTERNS.md's literal skeleton — Strict '>' alone only protects the zero-score 'someday' default from being displaced; added an equal-score-and-nonzero branch resetting to 'someday' so genuine ties between two nonzero-scoring categories resolve correctly per D-09/Pitfall 4
- [Phase 04]: Draft key literal 'draft:brainDump' (D-06) verified clean against all 8 schema-denylist stems
- [Phase 04]: PL category label 'Do zalatwienia' (errands) shipped as draft copy pending native-speaker review (UI-SPEC Flag 6)
- [Phase 04]: 04-03: isSavingRef guard resets on re-entering capture (Save is repeatable), unlike co-pilot's one-shot guard
- [Phase 04]: 04-03: showList recomputed live every render so D-12 empty-routing self-corrects for a future delete feature
- [Phase 04]: Combined promote button + quiet marker into the same DumpItemRow rewrite as chip/edit/delete (shared rowMode state machine); test file was the distinct Task 2 deliverable.
- [Phase 04]: Category-chip and section-header labels reuse identical brainDump.category.* i18n keys; item-row tests disambiguate via getByRole('button') rather than getByText.
- [Phase 04-05]: The dumpItemId useEffect depends only on [dumpItemId] (not flowPhase/resumablePointer) — Fires once per param and never re-triggers after flowPhase becomes active -- guards read at effect-run time via closure, mirroring ActivePhase's existing timeMode-only effect precedent.
- [Phase 04-06]: Voice augments the same text field via useVoiceCapture; permission denial + runtime STT errors fold into one combined available signal (UI-SPEC Flag 9).
- [Phase 04-06]: Recording-duration timer restructured to satisfy react-hooks/purity + react-hooks/set-state-in-effect: Date.now() only read from event handlers/interval callbacks, never during render.
- [Phases 5-8]: Founder-authorized direct development bypass — after Phase 4 completed, Phases 5 (Starter), 6 (Onboarding), 7 (Subscription/Freemium), and 8 (Settings/Analytics) were built directly on this branch without the normal `/gsd:plan-phase` → `/gsd:execute-phase` pipeline, to move faster once the established patterns (TDD pure-function core, contextual permission, timestamp-derived state, i18n-first copy) were proven across 4 prior phases. Retroactive CONTEXT.md/SUMMARY.md pairs were written post-hoc on 2026-07-05 for all four phases from git history and source inspection to keep the planning trail honest.
- [Phase 5]: Reminder scheduling uses replace-don't-orphan semantics (cancel any prior notificationId before scheduling a new one) plus an in-flight guard — added after a same-session code review (BLITZ-REVIEW.md) found a double-tap could orphan an uncancellable OS notification, a concrete PDA/shame-free violation class.
- [Phase 6]: Onboarding's optional first task becomes an inert Brain-dump item (via the existing classify() pipeline), never an auto-started Co-pilot session — the "straight into a session" variant was explicitly considered and rejected as pressure at the very first app moment a user experiences.
- [Phase 7]: Freemium tier/session-count is derived entirely from existing session timestamps at check time (Monday-anchored calendar week) — zero stored counters, consistent with the schema's no-aggregates constraint. Gated Co-pilot start affordances stay fully tappable (no greyed-out buttons); a tap while gated opens the paywall as an offer, never a disabled control — a deliberate shame-free departure from the industry-standard pattern.
- [Phase 7]: Purchases seam ships in REFERENCE mode (brief's exact PL/US pricing displayed, purchase()/restore() always resolve 'unavailable', honest "purchases aren't switched on" caption) — real RevenueCat wiring, App/Play Store product configuration, and Supabase auth-at-purchase are explicitly NOT done; MONEY-01/03/04 remain partial, only MONEY-02 is complete.
- [Phase 8]: Analytics ships as a transport-seam: a typed event allowlist (closed-enum properties only, no free-form strings representable) plus a runtime allowlist guard as defense-in-depth, with track() a silent no-op until a PostHog EU key exists. Every funnel event is instrumented at its real call site now so wiring the SDK later requires zero call-site changes.
- [Phases 5-8]: A consolidated code review (`.planning/BLITZ-REVIEW.md`) found 1 critical (reminder-orphan, fixed) + 6 warnings (all fixed: DST calendar math, two missing double-submit guards, Jest-mock enum drift, unguarded native-call error handling, unhandled reminders-off-sweep rejection) + hygiene (deleted an unused shame-copy-pattern i18n landmine, added missing PL plural forms, named a debounce constant) before this retro-documentation pass began. Full suite re-verified at 29 suites / 221 tests green (corrects an earlier "30 suites" claim in session notes to the actual on-disk count).

### Pending Todos

[From .planning/todos/pending/ — ideas captured during sessions]

None yet.

### Blockers/Concerns

[Issues that affect future work]

- Phase 4 (Brain Dump): STT library (`expo-speech-recognition`) is single-maintainer/MEDIUM confidence; Polish on-device language availability unverified — plan a device-matrix spike before committing further UI around voice as primary capture.
- Phase 4 (Brain Dump): rule-based vs. ExecuTorch classification is a judgment call flagged for explicit spike confirmation before escalating past keyword matching.
- Phase 7 (Subscriptions): RevenueCat↔Supabase webhook sync pattern and offline-entitlement edge cases are MEDIUM confidence; validate with explicit purchase-then-offline and offline-fresh-install test sequences.
- Phase 7 (Subscriptions): weekly-subscription-tier App/Play Store review carries real rejection/resubmission risk — budget calendar slack around this submission.
- iOS physical-device dev-client boot is NOT yet verified (deferred from Phase 1 Plan 06 checkpoint; Phase 2 context D-03 confirmed Android-only verification for the Lottie work) — retry when EAS/Mac access happens; hard gate before Phase 9 beta hardening can close.
- com.trinket.app package/bundle-ID uniqueness on Play Store / App Store is unproven until first store submission; if taken, a fallback identifier must be chosen at that time.
- Phase 7 (Subscriptions): RevenueCat SDK + env-gated wiring now IN CODE (quick task 260705-qg3, 2026-07-05) — `purchases.ts` configures/purchases/restores and writes the `plus` entitlement cache when `EXPO_PUBLIC_REVENUECAT_KEY` is set. STILL OPEN for MONEY-01/MONEY-03: the RevenueCat key itself, App/Play Store product + `plus` entitlement configuration, and device verification of real purchase + restore-on-fresh-install. MONEY-04 (Supabase account-at-purchase) remains fully unstarted (deferred). Native module added → `npx expo prebuild --clean` required before next device build.
- Phase 8 (Settings & Analytics): PostHog RN SDK + env-gated EU transport now IN CODE (quick task 260705-qg3, 2026-07-05) — `posthog.ts` attaches the EU-hosted, autocapture/replay-off client when `EXPO_PUBLIC_POSTHOG_API_KEY` is set; `track()` stays a no-op without it. ANLY-02's "appear in the EU-hosted dashboard" criterion is still unmet until the PostHog key lands and events are verified on the dashboard.
- Starter (Phase 5) real-device notification-delivery timing (OS-level Doze/battery-optimization delay) is unverified — code-verified only via Jest mock.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260702-jky | Fold Claude Design mockups (10 screens) into `design/DESIGN-SYSTEM.md` reference + persist mockups + refine dark theme token values to real brand palette (dark-only MVP) | 2026-07-02 | a64a457 | [260702-jky-fold-design-system-tokens](./quick/260702-jky-fold-design-system-tokens/) |
| 260705-qg3 | Wire RevenueCat (MONEY-01) + PostHog EU (ANLY-02) as env-gated drop-in integrations: real code paths that activate on `EXPO_PUBLIC_REVENUECAT_KEY` / `EXPO_PUBLIC_POSTHOG_API_KEY`, REFERENCE/no-op fallback with no key. Native SDKs installed (prebuild required); Jest mocks + wired-path tests; 250 tests green. Activation (keys/store/dashboard) + MONEY-04 still open. | 2026-07-05 | [wire-revenuecat-and-posthog-eu-env-gated](./quick/260705-qg3-wire-revenuecat-and-posthog-eu-env-gated/) |
| 260705-rbh | RevenueCat entitlement sync + purchase-grant dev diagnostics, from first device sandbox purchase (transaction landed in RC, app silent — entitlement id/attachment mismatch suspected). `purchases.ts`: `__DEV__` warns log expected-vs-actual entitlement ids on ungrated purchase/restore; startup `getCustomerInfo` sync + `addCustomerInfoUpdateListener` keep subscriptionCache honest both ways (missed grant self-heals, expiry downgrades); offline fetch failure leaves cache untouched. JS-only (no prebuild). 259 tests green. | 2026-07-05 | [revenuecat-entitlement-sync](./quick/260705-rbh-revenuecat-entitlement-sync-purchase-gra/) |

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-07-05T19:30:00.000Z
Stopped at: Quick task 260705-qg3 — RevenueCat (MONEY-01) + PostHog EU (ANLY-02) env-gated wiring landed in code, 250 tests green. Native SDKs installed (prebuild --clean required). Pending: real keys + App/Play Store product + PostHog EU key + dashboard/device verification; MONEY-04 (Supabase account-at-purchase) deferred; Phase 9 hardening not started.
Resume file: .planning/ROADMAP.md
