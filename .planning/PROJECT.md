# Trinket

## What This Is

Trinket is a mobile companion app for adults with ADHD (iOS + Android, single React Native codebase, Polish + English from first release). It supports the two hardest moments of an ADHD day: **starting a task** and **transitioning between tasks**. The core differentiator is an animated raccoon mascot acting as an **asynchronous body double** — the user starts a difficult task in the mascot's presence without scheduling a session with another human (implements Ara et al. 2025, arXiv:2509.12153). Positioned as a wellness app, NOT a medical device.

## Core Value

A user who has been avoiding a task can open Trinket and actually start it in the mascot's presence — **Co-pilot lowers the threshold to start**. The activation event is the first completed Co-pilot session; everything else in the app supports it.

## Requirements

### Validated

- ✓ Foundation: Expo SDK 56 scaffold (New Architecture, TS strict, dev-client/prebuild workflow), MMKV repositories for all four collections with schema denylist guard, dark earthy theme token module with hex-literal gate — Phase 1
- ✓ Localization: i18n from the first screen, PL + EN string files, CLDR-correct Polish plurals, no hardcoded copy (lint-enforced), device-locale resolution with persisted override seam — Phase 1
- ✓ Mascot module: reusable feature-agnostic `<Mascot />` with placeholder Lottie assets driving the MVP state machine (greeting, idle with 3 micro-behaviors, presence, dozing, acknowledge), structurally no negative states, single persistent LottieView, Android device-verified smooth — Phase 2
- ✓ Co-pilot end-to-end: async body-doubling session, three equal start paths (dump item / one-liner / open) with optional non-persisted length intent, presence/dozing active screen with subtle timestamp-derived timer and single End, warm always-same acknowledgment + skippable 3-level mood check, force-quit/background survival via `lastAliveAt` heartbeat + silent cold-launch reconciliation (warm resume card for live sessions, no interruption language), quiet chronological history — Phase 3 (code-verified 18/18; device UAT tracked in 03-HUMAN-UAT.md)
- ✓ Brain dump: single-field "dump it all" text capture (draft auto-restore, newline-split, no cap) + voice-augment via on-device `expo-speech-recognition` (text-core so it never depends on STT; contextual mic permission; graceful fallback), pure rule-based PL/EN keyword classifier (5 categories, ties→someday), grouped-by-category list with inline chip re-categorize / edit / shame-free delete, one-tap promote reusing Co-pilot `beginSession` (marks, never consumes) — Phase 4 (code-verified 12/12, 174 tests; 2 code-review criticals caught+fixed — hot-mic-on-unmount + dead promote button; real Polish on-device STT is a device task tracked in 04-HUMAN-UAT.md; **requires `npx expo prebuild --clean` after pulling** — first native dep since Phase 2)
- ✓ Starter (code-verified): two-step "when X, then Y" builder, localized PL/EN cue library (time/place/event), optional single self-worded reminder via `expo-notifications` (replace-don't-orphan scheduling, contextual permission ask) — Phase 5 (built via founder-authorized direct dev, retro-documented 2026-07-05; **requires `npx expo prebuild --clean` after pulling** — new native dep; real device notification-delivery timing unverified)
- ✓ Onboarding (code-verified): 3 skippable screens (what-Trinket-is + disclaimer, optional first task → inert dump item, meet the mascot), one-way flag, zero permission requests — Phase 6 (built via founder-authorized direct dev, retro-documented 2026-07-05)
- ✓ Settings (code-verified): locale, notification opt-in with cancel sweep, mascot prominence, plan row — Phase 8 (built via founder-authorized direct dev, retro-documented 2026-07-05)
- ✓ Analytics (code layer only): typed event allowlist + runtime content guard, funnel instrumented at every real call site, `track()` a documented no-op until a PostHog EU key exists — Phase 8 (built via founder-authorized direct dev, retro-documented 2026-07-05; **dashboard delivery unverified — no SDK/key installed**)

### Active

- [ ] Subscription infrastructure (core gate+paywall+entitlements done; RevenueCat integration pending keys): entitlements/session-start gate/reference-mode paywall shipped and tested (Phase 7, code-verified, built via founder-authorized direct dev, retro-documented 2026-07-05); real RevenueCat purchases, App/Play Store product configuration, offline-restore-on-fresh-install, and the Supabase account-at-purchase flow all remain unbuilt
- [ ] Offline-first correctness: fully functional offline except purchase/restore; session state persists across backgrounding and force-quit

### Out of Scope

- Soft landing and Bridge mechanics — Phase 1 post-launch, per MVP scope (3 of 5 mechanics)
- Light mode — dark mode is the only mode at MVP; light-mode timing is an open decision
- Home screen widgets, system overlays, Live Activities — Phase 1+; all system-presence features are native work and the mascot-presence analysis concluded gentle in-app presence beats intrusive presence for this audience
- Lock-screen presence — both known workarounds (accessibility overlay, full lock-screen replacement) are policy/maintenance traps; permanently rejected
- Social or community features — not core to the loop
- Mascot customization, content packs, seasonal expressions — post-MVP
- Any gamified rewards beyond the mascot's natural reactions — reward contingent on compliance creates shame surface
- Streaks, punitive mechanics, guilt notifications, decaying/wilting states — forbidden by design (see Constraints); these are bugs, not features
- AI-generated advice, coaching, or encouragement text — AI boundary is a product thesis, not a budget limit
- Session summary dashboards with statistics pressure — history is a quiet log

## Context

**Source documents** (committed under `.planning/source/`):
- `trinket-dev-synthesis-v0.1.md` — primary briefing: vision, hard constraints, mechanic specs, architecture, build order. Section 2 constraints are non-negotiable.
- `trinket-mascot-presence-design-v0.1.md` — platform feasibility of "ever-present" mascot; resolution: companion-not-coach, in-app presence only for MVP
- `trinket-design-pattern-synthesis-v0.1.md` — competitive mapping: Tiimo made visual-first ADHD design table stakes; Trinket's wedge is the companion layer + shame-free re-entry; Forest's dying-tree mechanic is the exact pattern to invert

**Design inputs:** 10 dark-mode UI mockups + extractable design system exist externally (Claude Design) but are not yet in this repo. Theme tokens will be derived from the written visual direction (soft rounded shapes, earthy palette, night-time cozy atmosphere, hand-drawn quality — the mascot is a calm night-shift raccoon and the UI is its habitat) and structured for one-to-one replacement when the real design system lands. Final mascot art is commissioned externally; development proceeds against placeholder Lottie files with identical state machine and slot names.

**Research base:** async body doubling (Ara et al. 2025), implementation intentions (~doubles follow-through), self-compassion / shame-free design (MacroFactor precedent: shame-free produces cleaner data and a moat guilt-based rivals can't copy).

**Audience psychology that shapes everything:** a meaningful share of users have demand-avoidant (PDA) traits, and you cannot identify which users — so the safe design must work for both. Re-entry after absence is the actual retention mechanic: the gap is inevitable; making the return feel good and cost nothing beats trying to prevent the gap.

**Timeline context:** closed beta cohorts (20-30 PL via ATTENTIO + 20-30 US) in incubation months 3-4; public release target Q4 2026. Funnel events must be instrumented before beta, not after.

**Validation targets:** activation >40% (first completed Co-pilot session within 48h of install), D7 retention >25%, D30 >12%, install→paying conversion 2.0-2.3%, qualitative "Co-pilot lowers my threshold to start" in beta interviews.

## Constraints

- **Shame-free design (hard)**: No streak mechanics, no punitive mechanics, nothing lost due to absence, warm re-entry always, no guilt notifications — violating this is a bug regardless of how standard the pattern is elsewhere
- **PDA-aware interaction grammar (hard)**: The mascot never issues demands, prompts, or calls to action; it is present, not directive; UI copy offers ("Start a session?" button) but never instructs (no mascot speech bubble commands)
- **AI boundary (hard)**: AI only for input processing (speech-to-text, brain-dump categorization); never generates advice, coaching, encouragement, or any therapeutic output; no LLM calls in the core loop
- **Privacy / GDPR Art. 9 (hard)**: Local-first — user content lives on device in MMKV; cloud sync minimal and account-scoped (subscription state, identity, opt-in backup); analytics carry no content payloads; the app never asks diagnosis status and no data model field stores it
- **Regulatory copy (hard)**: "supports task initiation" allowed; "treats/cures/diagnoses/reduces ADHD symptoms/clinically proven" forbidden in all UI copy, store listings, and notifications
- **Tech stack (fixed)**: React Native + Expo (managed workflow as long as feasible), TypeScript strict, MMKV local storage, Supabase backend (minimal surface), Lottie animations, RevenueCat subscriptions, PostHog EU (or equivalent) analytics, platform-native STT (iOS Speech framework / Android SpeechRecognizer, on-device preferred)
- **Data model**: no daily aggregates, no streak fields — if a stat can only be used for pressure, it does not exist in the schema; no daily boundaries (sessions crossing midnight are unremarkable)
- **Performance**: Lottie loops loaded lazily, each under 300 KB target
- **Platforms**: everything MVP stays inside the app process; no native modules beyond well-maintained community ones

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Companion, not coach | PDA analysis: an ever-present prompting mascot is worst-case for demand-avoidant users; presence must be pull, never push | — Pending |
| MVP = 3 of 5 mechanics (Co-pilot, Brain dump, Starter) | Co-pilot is the activation event; Soft landing and Bridge deferred to post-launch | — Pending |
| Build against placeholder mascot assets | External commission in progress; identical state machine + Lottie slot names let final art drop in | — Pending |
| Dark mode only at MVP | Design system is dark; light-mode timing an open decision, do not block | — Pending |
| No LLM in the core loop | Anti-AI-coaching thesis is the positioning wedge and the ethical stance | — Pending |
| In-app presence only; no widgets/overlays/lock screen at MVP | Feasibility analysis: iOS forbids overlays, lock-screen workarounds are traps, and low-demand design makes intrusive presence counterproductive anyway | — Pending |
| Theme derived from written visual direction, swappable tokens | Design system assets not yet in repo; structure `theme/` for one-to-one token replacement | — Pending |
| Full MVP scope in this milestone (build order 1–9) | Dev synthesis build order ends at beta hardening; that is the deliverable | — Pending |
| Vertical MVP phase structure | Co-pilot end-to-end first (activation event), other mechanics as end-to-end slices after | — Pending |
| Semantic categorization: prefer on-device, spike early | Minimal API call (text only, no identifiers) acceptable fallback | — Pending |
| Bundle/package identifier `com.trinket.app` | Founder decision at Phase 1 checkpoint: app belongs to a separate, not-yet-named business, so identifier is brand-only (supersedes provisional `com.everon.trinket`); uniqueness proven only at first store submission | ✓ Good |
| iOS device verification deferred to Phase 2–3 | Founder decision: don't spend EAS builds before iOS-specific risk exists (first Lottie work); hard gate before Phase 9 beta hardening | — Pending |
| GSD bypass for Phases 5-8 (Starter, Onboarding, Subscription, Settings+Analytics) | Founder-authorized direct development after Phase 4 proved the established patterns across 4 vertical slices; sped up delivery of the remaining feature phases; retro-documented (CONTEXT.md + SUMMARY.md per phase) on 2026-07-05 to keep the planning trail honest, including a same-session consolidated code review (`.planning/BLITZ-REVIEW.md`) that caught and fixed 1 critical + 6 warnings before this documentation pass | ✓ Good (Phase 7 core only — RevenueCat integration still pending) |
| Freemium tier = brief's 3 sessions/week, Monday-anchored refresh, derived from timestamps | Locks MONEY-02 exactly to the source synthesis's spec; zero stored counters keeps the no-aggregates schema constraint intact; gated affordances stay tappable (no greyed-out buttons) as a deliberate shame-free departure from the industry-standard disabled-button pattern | ✓ Good |
| Onboarding's first-task variant = inert Brain-dump item, never an auto-started session | The "straight into a session" alternative was explicitly considered and rejected as pressure at the very first app moment a user experiences — PDA-grammar consistency from the first tap | ✓ Good |
| Analytics ships as a transport-seam (typed allowlist + no-op `track()`) ahead of any SDK key | Lets funnel instrumentation land and be tested now, with the actual PostHog EU wiring becoming a one-file swap later — avoids blocking Phase 8's code completion on external account setup | ✓ Good (transport still pending PostHog key) |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-05 after retroactively documenting Phases 5-8 (Starter, Onboarding, Subscription Infrastructure + Freemium Gate, Settings & Analytics), which were built via founder-authorized direct development bypassing the normal GSD plan/execute pipeline. Starter, Onboarding, Settings, and the analytics code layer are code-verified complete (29 suites / 221 tests green across the full repo). Subscription infrastructure is CORE-COMPLETE ONLY — entitlements/gate/paywall/reference-pricing work and are tested, but real RevenueCat purchases, offline restore-on-fresh-install, and the Supabase account-at-purchase flow remain unbuilt (MONEY-01/03/04 open); analytics dashboard delivery is unverified pending a PostHog EU key (ANLY-02 open). A same-session consolidated code review (`.planning/BLITZ-REVIEW.md`) found and fixed 1 critical (reminder-orphan PDA violation) + 6 warnings before this documentation pass. NOTE: `expo-notifications` added in Phase 5 — `npx expo prebuild --clean` required after pulling, in addition to the standing `expo-speech-recognition` prebuild note from Phase 4.*
