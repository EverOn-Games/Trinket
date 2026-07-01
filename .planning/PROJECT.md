# Trinket

## What This Is

Trinket is a mobile companion app for adults with ADHD (iOS + Android, single React Native codebase, Polish + English from first release). It supports the two hardest moments of an ADHD day: **starting a task** and **transitioning between tasks**. The core differentiator is an animated raccoon mascot acting as an **asynchronous body double** — the user starts a difficult task in the mascot's presence without scheduling a session with another human (implements Ara et al. 2025, arXiv:2509.12153). Positioned as a wellness app, NOT a medical device.

## Core Value

A user who has been avoiding a task can open Trinket and actually start it in the mascot's presence — **Co-pilot lowers the threshold to start**. The activation event is the first completed Co-pilot session; everything else in the app supports it.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Co-pilot: async body-doubling session, end to end (task pick / quick one-liner / open session → presence screen with mascot → warm acknowledgment on end, regardless of duration or completion)
- [ ] Brain dump: free text + on-device voice capture, multi-item, semantic category suggestions (errands/work/home/people/someday), items inert by default, one-tap promotion to Co-pilot task
- [ ] Starter: two-step "when X, then Y" implementation-intention builder with localized cue library and optional single self-worded notification
- [ ] Mascot module: placeholder Lottie assets driving the MVP state machine (greeting, idle with 3+ micro-behaviors, presence, dozing, acknowledge); no negative states exist in the asset set
- [ ] Onboarding: 3 screens max (what Trinket is, pick your first task, meet the mascot), skippable
- [ ] Subscription infrastructure: RevenueCat over StoreKit 2 / Play Billing, three tiers per market (PL: 9,99/24,99/199 PLN; US: 5.99/11.99/79 USD), free tier = unlimited Brain dump + 3 Co-pilot sessions/week, shame-free gate copy ("sessions refresh Monday", never "you've run out")
- [ ] Localization: i18n from the first screen, PL + EN string files, no hardcoded copy, warm plain Polish register
- [ ] Settings: locale, notification opt-in, subscription state
- [ ] Analytics: privacy-first, EU-hosted, pseudonymous event tracking with no content payloads; funnel events instrumented before beta
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
*Last updated: 2026-07-01 after initialization*
