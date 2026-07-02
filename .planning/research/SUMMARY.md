# Project Research Summary

**Project:** Trinket — ADHD companion app (React Native + Expo)
**Domain:** ADHD companion / async body-doubling / focus app, local-first mobile (iOS + Android), freemium subscriptions, simultaneous PL + US launch
**Researched:** 2026-07-01
**Confidence:** MEDIUM-HIGH

## Executive Summary

Trinket is a mascot-driven, local-first ADHD companion app whose core differentiator — zero-scheduling, async, non-human body-doubling via an animated raccoon — has no direct equivalent among researched competitors (Tiimo, Forest, Finch, Focus Bear, Flow Club/Flown, Goblin Tools, Routinery). Experts building this category converge on the same table-stakes bar (low-friction text+voice capture, a visible-but-non-punishing focus timer, a character presence, opt-in reminders, a freemium paywall, offline-first correctness), and the research confirms Trinket's brief already covers all of it. The harder, more distinctive work is architectural and behavioral discipline: the entire product thesis (shame-free, PDA-aware, "companion not coach") must be enforced structurally — no streak fields in the data model, no negative mascot states in the asset set, AI restricted to input processing only — because every third-party SDK, template, and "best practice" default in the mobile ecosystem (notification copy, paywall templates, analytics dashboards) silently reintroduces the exact guilt/urgency mechanics Trinket exists to invert.

The recommended approach is: Expo SDK 56 (not the just-released 57) with New Architecture on by default, built from day one on EAS Build + `expo-dev-client` + Continuous Native Generation rather than Expo Go — because MMKV v4, RevenueCat, on-device STT, and any on-device classifier all require compiled native code and will hard-fail in Expo Go. Local storage is MMKV (repository pattern for collections, Zustand+persist for singleton settings), with a hand-rolled typed state machine for the 5-state mascot (XState is unnecessary at this scale), timestamp-derived (not counter-derived) session duration for backgrounding/force-quit correctness, and a rule-based keyword classifier for brain-dump categorization before reaching for an on-device ML model (ExecuTorch) — the 5-category taxonomy doesn't need embeddings until proven otherwise.

The single riskiest correctness gap is session-state persistence across backgrounding/force-quit/OS-kill, since Co-pilot is the activation event and the entire product promise ("the raccoon is there with me") breaks if a session silently vanishes — this must be built as core Co-pilot logic (write-on-start, derive-from-timestamp), not deferred to a hardening pass. The second-largest risk cluster is not technical but disciplinary: shame/streak/urgency patterns re-entering through vendor defaults (notification templates, paywall copy, analytics widgets) unless every third-party integration is treated as "starting point to rewrite," backed by structural guardrails (no streak field in the schema, no negative Lottie assets) rather than policy alone. Confidence is high on stack version facts and architecture patterns (multiple corroborating official sources), medium on STT library choice and on-device classification approach (fragmented/newer ecosystem), and medium-high on competitive feature landscape and pitfalls (cross-verified across 2+ independent sources per finding).

## Key Findings

### Recommended Stack

Full detail: `.planning/research/STACK.md`. The stack is largely fixed by the brief (MMKV, RevenueCat, Supabase, PostHog EU, Lottie), and the research's main contribution is sequencing and version-pinning guidance: start on Expo SDK 56 (not the one-day-old SDK 57) so the native-module ecosystem has time to catch up, commit to CNG + dev client from the first build step, and default to a zero-ML rule-based classifier for brain-dump categorization rather than pre-paying for a second on-device ML native module.

**Core technologies:**
- Expo SDK 56 + React Native 0.85 + React 19.2, New Architecture on (mandatory as of SDK 55+) — app framework, CNG/config plugins, EAS Build
- Expo Router (file-based) — navigation, default in current Expo templates, least boilerplate for a ~15-20 screen MVP
- `react-native-mmkv` v4 (Nitro Modules/JSI) + `zustand` v5 (persist middleware, MMKV adapter) — durable local storage + reactive state; repository layer for collections, Zustand-persist for settings singleton
- `@supabase/supabase-js` — auth, subscription mirror, opt-in encrypted backup only (minimal backend surface by design)
- `lottie-react-native` 7.3.x — mascot animation; requires native linking, not Expo-Go-compatible, watch for Android New Architecture edge cases
- `react-native-purchases` (RevenueCat) — subscriptions; runs in Preview/Mock mode in Expo Go, real purchases need dev client
- `posthog-react-native` — EU-hosted analytics; autocapture and Session Replay must be explicitly disabled, manual `track()` calls only
- `expo-speech-recognition` — on-device platform STT (iOS Speech / Android SpeechRecognizer); single-maintainer package, MEDIUM confidence, keep `@react-native-voice/voice` as documented fallback
- Rule-based keyword classifier (MVP) for brain-dump categorization; `react-native-executorch` on-device embeddings only if the spike shows keyword matching is inadequate
- `i18next` + `react-i18next` — required for CLDR-correct Polish plural forms (4 forms), rules out simpler i18n libraries

### Expected Features

Full detail: `.planning/research/FEATURES.md`. Every researched competitor in this category ships the same table-stakes set; Trinket's differentiation is concentrated in three mechanics (Co-pilot, shame-free re-entry, Starter) plus a set of hard exclusions (streaks, decay states, guilt notifications, stats dashboards, AI-generated coaching) that are structurally, not just editorially, enforced.

**Must have (table stakes):**
- Low-friction text + voice capture (Brain dump)
- Visible-but-non-punishing focus timer (Co-pilot), countdown opt-in only, never default
- Character/companion presence (the mascot is the product, not bolted on)
- Opt-in, non-directive reminders (Starter's single notification)
- Quiet, unscored activity log (no dashboards, no streak framing)
- Short (3-screen max), skippable onboarding
- Freemium with a genuinely usable free tier (unlimited Brain dump + 3 Co-pilot sessions/week)
- Cross-session persistence surviving backgrounding/force-quit

**Should have (competitive differentiators):**
- Async, zero-scheduling mascot body-doubling (Co-pilot) — no researched competitor offers this; build first and best
- Shame-free warm re-entry after any absence gap, guaranteed at the asset level (no negative mascot states exist)
- PDA-aware, non-directive mascot grammar — reacts only, never initiates or nudges
- Implementation-intention builder (Starter) — unclaimed mechanic in the researched competitive set
- "AI restricted to input processing only" as a marketable trust signal, not a limitation
- No diagnosis-status field anywhere in the data model (GDPR Art. 9-aware by design)

**Defer (v2+):**
- Soft landing and Bridge mechanics (the other 2 of 5 originally-scoped mechanics)
- Light mode, home-screen widget, opt-in encrypted backup
- Mascot customization/content packs (purchase-gated only, never engagement-gated, if ever built)
- Android-only overlay companion, any social/community layer

### Architecture Approach

Full detail: `.planning/research/ARCHITECTURE.md`. The architecture is a strict layered local-first design where everything except purchase/restore and opt-in backup must function fully offline, enforced by module boundaries (only `purchasesService` and `backupService` hold live network clients). Feature code is organized as vertical slices (`co-pilot/`, `brain-dump/`, `starter/`) rather than horizontal layers, with the mascot as a standalone, feature-agnostic module consumed by multiple screens.

**Major components:**
1. UI Layer (`app/`, expo-router) — thin route composition only, no business logic
2. Mascot Module — hand-rolled typed state machine (5 states: greeting/idle/presence/dozing/acknowledge), exposes only imperative event triggers, never reaches into feature stores
3. Feature Modules (`co-pilot/`, `brain-dump/`, `starter/`) — vertical slices, each owning its own screens/logic/repo calls
4. Repository + Zustand Store layers over MMKV — repositories are the durable source of truth (per-record keys for collections), Zustand stores are a disposable reactive cache that can always be rebuilt from MMKV
5. External Services boundary — RevenueCat, Supabase, platform STT, PostHog EU; the only code permitted to touch the network, isolated behind typed service interfaces

Key pattern: session duration must be derived from persisted `startedAt`/`endedAt` timestamps, never from an in-memory timer, with a boot-time reconciliation pass that silently finalizes any orphaned "open" session — this is the architectural backbone that makes the Co-pilot activation event survive backgrounding and force-quit.

### Critical Pitfalls

Full detail: `.planning/research/PITFALLS.md` (10 pitfalls documented). Top risks:

1. **Session state loss on backgrounding/force-quit/OS kill** — the single highest-stakes bug in the app, since it directly breaks the Co-pilot activation event's core promise. Avoid by writing session state to MMKV at session *start* (not end), deriving elapsed time from `Date.now() - startedAt`, and silently reconciling orphaned sessions on boot with zero "we noticed you were interrupted" messaging.
2. **Expo Go native-module wall** — MMKV, RevenueCat, and STT all require compiled native code and hard-fail in Expo Go. Avoid by committing to EAS Build + `expo-dev-client` + CNG (`expo prebuild`) from Phase 1, before any feature code, not as a mid-project migration.
3. **Lottie memory leaks / frame-rate collapse on low-end Android** — the mascot is on-screen almost continuously, so this is a permanent tax, not a peripheral bug. Avoid with a single persistent `LottieView` (swap source, never remount), lazy-loaded assets under the 300 KB budget, and mandatory real low/mid-tier Android device testing (not simulators, not flagships) starting in the mascot phase.
4. **Offline entitlement / RevenueCat sandbox false confidence** — the freemium gate must define explicit behavior for "entitlement unknown while offline" (default to free tier, never alarming copy) and be tested with purchase-then-offline and offline-fresh-install sequences, not just sandbox happy paths.
5. **Shame/streak/pressure mechanics re-entering via vendor defaults** — notification templates, paywall copy, and analytics dashboard widgets all default to urgency/streak framing industry-wide; avoid via a living forbidden-pattern checklist applied to every third-party template and copy string, plus structural guardrails (no streak field in the schema, no negative mascot assets) so the violation is impossible to implement, not just discouraged.

Additional documented pitfalls: i18n retrofit pain / naive Polish pluralization, on-device STT Polish-locale/Android-fragmentation gaps, analytics content leakage under GDPR Article 9, App/Play Store review risk from implied medical claims or subscription-disclosure gaps, and premature notification-permission requests burning the one-shot iOS prompt.

## Implications for Roadmap

Based on combined research, the source synthesis's 9-step build order is directionally sound and should anchor the roadmap, with three refinements the architecture and pitfalls research both independently surface: (1) all four local repositories should be scaffolded together in Phase 1, not introduced piecemeal per-feature, since Co-pilot references `dump_items` before Brain dump's UI exists; (2) analytics instrumentation must be a continuous, in-line concern across every feature phase, not a discrete late phase, both for schedule reasons (PROJECT.md requires funnel events pre-beta) and privacy reasons (retrofitting invites content-payload leaks); (3) session-persistence correctness is a Phase 3 (Co-pilot) deliverable, not a Phase 9 (hardening) deliverable — hardening should be an audit/polish pass that finds few bugs if Phase 3 was built correctly.

### Phase 1: Scaffold & Foundations
**Rationale:** Every native dependency in the stack (MMKV, RevenueCat, STT, Lottie) requires CNG + dev client from day one; retrofitting this mid-project is the #2 pitfall by cost. i18n and analytics scaffolding must also exist before the first screen to prevent retrofit pain (pitfall #5) and enable inline instrumentation later.
**Delivers:** Expo SDK 56 project with New Architecture, TypeScript strict mode, EAS Build + `expo-dev-client` + `expo prebuild` workflow, Expo Router shell, theme token skeleton, i18n skeleton (i18next + CLDR plural config + CI lint rule against hardcoded strings), all four MMKV repositories (`sessions`, `dumpItems`, `intentions`, `settings`), and an `analyticsService` module (SDK init + typed event map, no call sites yet).
**Addresses:** Offline-first persistence, localization (table stakes)
**Avoids:** Expo Go native-module wall (Pitfall 2), i18n retrofit pain (Pitfall 5)

### Phase 2: Mascot Module
**Rationale:** Both Co-pilot's presence screen and the home screen's idle state need the mascot before they can render meaningful content; it must be built as a standalone, feature-agnostic module to remain reusable and swappable for final art later.
**Delivers:** Typed 5-state mascot state machine (greeting/idle/presence/dozing/acknowledge), placeholder Lottie assets (single persistent `LottieView`, lazy-loaded, under 300 KB/loop), no negative-state assets in the set by construction.
**Uses:** `lottie-react-native`, hand-rolled reducer (not XState) per Architecture Pattern 1
**Implements:** Mascot Module component boundary
**Avoids:** Lottie memory/frame-rate collapse on low-end Android (Pitfall 3) — establish a real low/mid-tier Android performance baseline here, not later

### Phase 3: Co-pilot End-to-End (activation event)
**Rationale:** This is the product's core wedge and no researched competitor offers it — it should be built first and best, ahead of every other feature. Session-persistence correctness must be established here, not deferred.
**Delivers:** Full async body-doubling session flow (task selection → presence → dozing → acknowledge), timestamp-derived elapsed time, MMKV write-on-start with boot-time reconciliation for force-quit/kill, session gate stubbed to "always allowed" (real subscription gate wired in Phase 7).
**Addresses:** Co-pilot (P1, HIGH value/HIGH cost per Feature Prioritization Matrix)
**Avoids:** Session state loss on backgrounding/force-quit (Pitfall 1) — the single highest-stakes correctness gap in the app

### Phase 4: Brain Dump (capture + categorization)
**Rationale:** Capture is standalone and testable before adding categorization; text-first fallback must exist before voice is trusted as primary, given documented STT/Polish-locale fragmentation risk.
**Delivers:** Text + voice capture (`expo-speech-recognition`), rule-based keyword categorization into 5 fixed categories (spike to confirm quality before considering ExecuTorch escalation), runtime on-device-language-availability checks with graceful text fallback.
**Addresses:** Brain dump capture + categorization (table stakes + differentiator: no due dates/urgency metadata)
**Avoids:** On-device STT Polish/Android fragmentation (Pitfall 6) — spike and device-matrix testing required here, not assumed

### Phase 5: Starter (implementation-intention builder)
**Rationale:** Depends on the `intentions` repository (already scaffolded Phase 1) and optionally a Brain dump entry point (Phase 4); this is also where the single notification permission should be contextually requested — never during onboarding.
**Delivers:** "When X, then Y" cue-action builder, optional single self-worded notification with soft-ask pre-permission pattern.
**Addresses:** Starter (P1 differentiator, unclaimed mechanic per Feature research)
**Avoids:** Premature notification-permission request burning the one-shot iOS prompt (Pitfall 10)

### Phase 6: Onboarding
**Rationale:** Depends on home screen/mascot (Phase 2/3) and Co-pilot's task-selection existing, since "pick your first task" is one of the three screens. Must explicitly exclude any notification-permission ask.
**Delivers:** 3-screen, skippable onboarding flow routing to first task selection.
**Addresses:** Onboarding (table stakes, deliberately shorter than category norm)
**Avoids:** Notification permission requested too early (Pitfall 10); shame-adjacent copy patterns (Pitfall 9) — apply the forbidden-pattern checklist here first, since onboarding is high-risk for imported "standard" engagement copy

### Phase 7: Subscription Infrastructure + Freemium Gate
**Rationale:** Hooks into the exact Co-pilot session-start call site established in Phase 3; requires Supabase auth for `app_user_id` linking, introduced here (not earlier) since no account is required for core-loop use.
**Delivers:** RevenueCat integration, Supabase auth + webhook-mirrored subscription state, offline-capable local entitlement cache, shame-free gate copy including an explicit non-alarming "entitlement unknown" state, store subscription-disclosure UX (cancellation reachable in 1-2 taps, terms shown pre-purchase).
**Addresses:** Freemium gate (table stakes, enables business model)
**Avoids:** RevenueCat/StoreKit sandbox false confidence and offline entitlement gaps (Pitfall 4); App/Play Store review risk from subscription disclosure (Pitfall 8)

### Phase 8: Settings, Notification Opt-in, Analytics Instrumentation Audit
**Rationale:** By this point, `track()` call sites should already be distributed inline across Phases 2-7 per the Phase 1 refinement; this phase is where the analytics event schema is formally allowlisted and audited, not where instrumentation begins.
**Delivers:** Settings screen (locale, notification opt-in, subscription state), typed analytics event allowlist with automated lint/test enforcement against content-bearing variables, opt-in funnel tracking for the Starter notification ask.
**Addresses:** Settings, analytics (table stakes, invisible to user but critical to team)
**Avoids:** Analytics content leakage / GDPR Article 9 exposure (Pitfall 7)

### Phase 9: Beta Hardening
**Rationale:** Should be an audit/polish pass, not where correctness is first established — if Phase 3's session-persistence work and Phase 1's i18n/native-module scaffolding were done correctly, this phase should find few structural bugs.
**Delivers:** Offline-correctness sweep (purchase-then-offline, fresh-install-offline sequences), cross-device STT/Lottie performance verification on real low/mid-tier Android hardware with system locale set to Polish, full "Looks Done But Isn't" checklist pass (force-quit resume, subscription restore on fresh install, shame-free copy audit across store listings/notifications/templates), pre-submission App/Play Store compliance checklist.
**Addresses:** Cross-cutting quality bar for launch readiness
**Avoids:** Nearly all 10 pitfalls resurface here as verification gates, not discovery points

### Phase Ordering Rationale

- Native-module infrastructure (Phase 1) must precede all feature work because MMKV, RevenueCat, and STT are non-negotiable, Expo-Go-incompatible dependencies — sequencing this first eliminates the highest-cost pitfall category (mid-project workflow migration) entirely.
- The mascot (Phase 2) precedes Co-pilot (Phase 3) because the presence screen has no content without the state machine, and precedes onboarding (Phase 6) and home-screen idle rendering for the same reason.
- Co-pilot is sequenced before Brain dump and Starter despite Brain dump's "enhances but does not gate" relationship, because it is the activation event and the wedge against every researched competitor — validating it first de-risks the product thesis earliest.
- Subscription infrastructure (Phase 7) is deliberately late — after Co-pilot, Brain dump, and Starter exist — because the gate hooks into an already-built session-start call site, and no account should be required to experience the core loop, consistent with the shame-free/low-friction positioning.
- Analytics instrumentation is threaded through Phases 2-7 inline (not a discrete phase) per Architecture Anti-Pattern 4, with Phase 8 serving only as the schema-allowlisting and audit checkpoint — this avoids both the schedule risk of retrofitting and the privacy risk of ad-hoc content-bearing properties creeping in under deadline pressure.
- Hardening (Phase 9) is scoped narrowly as verification, because pitfalls research confirms nearly every critical risk (session persistence, Lottie performance, offline entitlement, STT locale gaps) has an earlier, feature-specific phase where it must actually be solved.

### Research Flags

Phases likely needing deeper research during planning (`/gsd:plan-phase --research-phase <N>`):
- **Phase 4 (Brain Dump):** STT library choice is MEDIUM confidence (single-maintainer `expo-speech-recognition` package) and Polish on-device language/model availability is unverified in practice — needs a device-matrix spike before committing further UI around voice as primary capture.
- **Phase 7 (Subscription Infrastructure):** RevenueCat↔Supabase webhook sync pattern and offline-entitlement edge cases are MEDIUM confidence (synthesized from vendor docs + community consensus, no single canonical source); subscription-disclosure requirements for weekly-priced tiers carry real App/Play Store review risk that should be re-verified against current platform policy at implementation time.
- **Phase 4 (categorization sub-scope):** the rule-based-vs-ExecuTorch decision is a product judgment call flagged for explicit spike confirmation, not a settled library choice.

Phases with standard, well-documented patterns (skip research-phase):
- **Phase 1 (Scaffold):** Expo SDK/CNG/dev-client workflow, MMKV repository pattern, and i18next CLDR pluralization are all HIGH confidence with official/multiply-corroborated sources.
- **Phase 2 (Mascot):** Hand-rolled state machine pattern is well-documented and appropriately sized; main risk (Lottie Android performance) is a testing/architecture discipline issue, not a research gap.
- **Phase 3 (Co-pilot):** Timestamp-based session lifecycle pattern is HIGH confidence, corroborated by an official React Native issue-tracker source confirming the platform-throttling behavior driving the design.
- **Phase 6 (Onboarding), Phase 8 (Settings/Analytics):** Established patterns; the risk here is copy/discipline (shame-free enforcement), not technical uncertainty.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH for versions/compatibility (verified via npm registry + official changelogs); MEDIUM for on-device classification approach; LOW for STT library choice (fragmented, single-maintainer ecosystem) |
| Features | MEDIUM-HIGH — competitive landscape verified across multiple independent sources per app; Trinket's anti-features are HIGH confidence, sourced directly from product docs |
| Architecture | HIGH for navigation/state/MMKV/timer patterns (multiple corroborating official sources); MEDIUM for RevenueCat↔Supabase sync pattern and XState-vs-hand-rolled sizing judgment (no single canonical source) |
| Pitfalls | MEDIUM-HIGH — Context7 unavailable for these queries; every pitfall cross-verified across 2+ independent sources, official RevenueCat/Apple/Expo/GitHub-issue-tracker docs used where possible |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **STT library maturity (`expo-speech-recognition`):** single-maintainer package — verify recent commit activity and open-issue volume at Phase 4 integration time, with `@react-native-voice/voice` as a documented fallback if instability surfaces.
- **On-device classification model size/latency (ExecuTorch, if escalated):** model file size and first-load latency were not confirmed in available docs — must be measured in the Phase 4 spike before committing to this path over the rule-based default.
- **Expo SDK 56 vs 57 timing:** SDK 57 shipped one day before this research and is framed as a same-day, no-breaking-changes upgrade, but third-party native modules (RevenueCat, MMKV, STT, ExecuTorch) won't have explicit SDK-57-tested releases at project start — re-evaluate the bump after the first 2-3 native modules are integrated and confirmed stable on SDK 56.
- **RevenueCat/Supabase webhook sync edge cases:** eventual-consistency window between purchase and cross-device reflection is architecturally acceptable but untested in this project's specific flow — validate during Phase 7 with the explicit purchase-then-offline and offline-fresh-install test sequences named in Pitfalls research.
- **Weekly-subscription-tier App/Play Store review risk:** budget calendar slack for at least one review rejection/resubmission cycle around subscription review specifically — common even for compliant apps with weekly pricing tiers, should not threaten the launch date if planned for.
- **Custom paywall UI vs RevenueCat's prebuilt `react-native-purchases-ui`:** flagged as a low-stakes decision deferred to design-system availability — resolve during Phase 7 planning once visual identity assets exist.

## Sources

### Primary (HIGH confidence)
- Official Expo changelogs (`expo.dev/changelog/sdk-54` through `sdk-57`) — SDK/RN versions, breaking changes
- npm registry (queried directly 2026-07-01) — ground-truth published versions for all core dependencies
- `github.com/mrousavy/react-native-mmkv` official docs + issues — v4 Nitro Modules requirement, Expo Go incompatibility, Zustand wrapper pattern
- `github.com/RevenueCat/react-native-purchases` official docs — min RN version, Expo/config-plugin support, Preview API Mode
- `docs.expo.dev/router/`, `docs.expo.dev/workflow/continuous-native-generation/`, `docs.expo.dev/guides/adopting-prebuild/` — official Expo Router and CNG documentation
- `facebook/react-native` issue #38711 — confirms JS-timer background-throttling behavior driving the timestamp-based session pattern
- `zustand.docs.pmnd.rs` official comparison docs
- i18next official docs — Polish CLDR plural forms (`_one`/`_few`/`_many`/`_other`)
- `developer.apple.com/app-store/review/guidelines/`, `support.google.com` Health apps declaration form — platform review policy

### Secondary (MEDIUM confidence)
- `posthog.com/docs/libraries/react-native`, PostHog GDPR/privacy docs — EU host config, autocapture/session-replay risk, cross-referenced with a known RN/iOS masking GitHub issue
- `software-mansion-react-native-executorch.mintlify.app`, `executorch.swmansion.com` — ExecuTorch setup and model requirements; no confirmed example matching Trinket's exact 5-category use case
- `github.com/jamsch/expo-speech-recognition` — single-maintainer package, verify activity at integration time
- Community Supabase+MMKV adapter tutorials — converging pattern, not officially documented by Supabase
- `revenuecat.com/docs` (sandbox testing, offline entitlements, Test Store) and `revenuecat.com/blog` — official but synthesized with community RN/Expo integration guides for the specific webhook-sync pattern
- Competitor product sites and app-store listings (Tiimo, Forest, Finch, Focus Bear, Flow Club, FLOWN, Goblin Tools, Routinery, Endel) — feature landscape and pricing models
- `gdprsummary.com`, `posthog.com/docs/data/anonymous-vs-identified-events` — Article 9 pseudonymization risk analysis

### Tertiary (LOW confidence)
- Single-source community benchmarks on Lottie Android CPU/memory overhead vs. RLottie — directionally useful, not independently re-verified
- `github.com/alphacep/vosk-api` — noted as an alternative offline STT with Polish support, not adopted, informational only

---
*Research completed: 2026-07-01*
*Ready for roadmap: yes*
