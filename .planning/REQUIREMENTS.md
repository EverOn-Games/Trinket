# Requirements: Trinket

**Defined:** 2026-07-02
**Core Value:** A user who has been avoiding a task can open Trinket and actually start it in the mascot's presence — Co-pilot lowers the threshold to start.

## v1 Requirements

Requirements for the MVP (beta-ready build). Each maps to roadmap phases.

### Foundation

- [ ] **FND-01**: App runs on iOS and Android from a single Expo codebase (SDK 56, New Architecture, TypeScript strict) with an EAS Build + dev-client + prebuild workflow from day one
- [ ] **FND-02**: All user content (dump items, intentions, sessions, settings) persists locally in MMKV with no daily aggregates and no streak fields in the schema
- [ ] **FND-03**: User can use every core feature fully offline; only purchase/restore requires network
- [ ] **FND-04**: App ships a dark-mode theme token module (earthy palette, soft rounded, night-cozy) structured for one-to-one replacement when the external design system lands
- [ ] **FND-05**: Every screen renders in Polish and English from localized string files with CLDR-correct Polish plurals; no hardcoded copy

### Mascot

- [ ] **MASC-01**: Mascot renders greeting, idle, presence, dozing, and acknowledge states via placeholder Lottie assets with final-art-compatible slot names
- [ ] **MASC-02**: Idle state plays 3+ randomized micro-behaviors (blink, posture shift, glance) on randomized intervals
- [ ] **MASC-03**: Mascot only reacts to user actions — it never initiates, prompts, or demands; no negative/sad/disappointed states exist in the asset set
- [ ] **MASC-04**: Mascot animates smoothly on low/mid-tier Android (single persistent LottieView, lazy-loaded loops under 300 KB each)

### Co-pilot

- [ ] **PILOT-01**: User can start a session from a Brain dump item, a typed one-liner, or as an open "just work" session — three equal paths
- [ ] **PILOT-02**: User can optionally set a session length intent (25 min default suggestion, freely adjustable); ending early is a completed session, never an abandoned one
- [ ] **PILOT-03**: Session screen shows the mascot in presence state, subtle elapsed time (no countdown pressure unless user chose one), and a single End button
- [ ] **PILOT-04**: Mascot may doze after ~30 minutes of session time and wakes on touch or session end
- [ ] **PILOT-05**: Ending a session always plays a warm acknowledgment, with an optional skippable one-tap mood check (3 emoji levels)
- [ ] **PILOT-06**: A session survives app backgrounding, force-quit, and OS kill — elapsed time is derived from persisted timestamps, and orphaned sessions are silently reconciled at next launch with zero mention
- [ ] **PILOT-07**: Session history exists as a quiet log — no statistics dashboards, no completion rates, no daily boundaries

### Brain Dump

- [ ] **DUMP-01**: User can dump one to thirty items in a single free-text stream, separated by newlines
- [ ] **DUMP-02**: User can capture items by voice via on-device platform speech-to-text, with graceful fallback to text when STT is unavailable
- [ ] **DUMP-03**: Captured items receive suggested category tags (errands, work, home, people, someday) via on-device rule-based classification, changeable with one tap
- [ ] **DUMP-04**: Items are inert by default — no due dates, no reminders, no badges; an item can be promoted to a Co-pilot session task with one tap
- [ ] **DUMP-05**: Brain dump is reachable in at most 2 taps from anywhere in the app

### Starter

- [ ] **START-01**: User can build a "when X, then Y" implementation intention in two steps: situation cue, then first physical action
- [ ] **START-02**: User can pick cues from a localized (PL/EN) library grouped by time-based, place-based, and event-based cues
- [ ] **START-03**: A saved intention card can optionally fire a single notification at a user-chosen time, phrased in the user's own words, never as an app demand
- [ ] **START-04**: Static UI copy (not AI) coaches the action to be a tiny physical first step, not the whole task

### Onboarding

- [ ] **ONBD-01**: New user sees at most 3 skippable screens (what Trinket is, pick your first task, meet the mascot) with no notification permission request

### Monetization

- [ ] **MONEY-01**: User can subscribe via weekly, monthly, or annual tiers with market-specific pricing (PL: 9,99/24,99/199 PLN; US: 5.99/11.99/79 USD) through RevenueCat
- [ ] **MONEY-02**: Free tier includes unlimited Brain dump and 3 Co-pilot sessions per week, gated with shame-free copy ("sessions refresh Monday", never "you've run out")
- [ ] **MONEY-03**: Entitlements behave correctly offline — unknown entitlement defaults to free tier with no alarming copy, and restore purchases works on fresh installs
- [ ] **MONEY-04**: No account is required to use the core loop; Supabase auth is introduced only for purchase/restore/subscription state

### Settings

- [ ] **SETT-01**: User can change locale, manage notification opt-in, and view subscription state from a settings screen

### Analytics

- [ ] **ANLY-01**: Analytics events are pseudonymous, EU-hosted, and carry no content payloads — enforced by a typed event allowlist, with autocapture and session replay disabled
- [ ] **ANLY-02**: Activation and retention funnel events (install → first completed Co-pilot session, D7/D30 opens) are instrumented before beta

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Mechanics

- **MECH-01**: Soft landing mechanic (post-launch Phase 1)
- **MECH-02**: Bridge transition mechanic (post-launch Phase 1)

### Platform Presence

- **PRES-01**: Home screen widget (static mascot art + one-tap session start)
- **PRES-02**: Android-only floating overlay companion (post-PMF bet, iOS parity gap accepted)

### Polish & Expansion

- **POLI-01**: Light mode
- **POLI-02**: Opt-in encrypted backup via Supabase
- **POLI-03**: Mascot customization / content packs (purchase-gated only, never engagement-gated)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Streaks, day chains, streak counters | Forbidden by shame-free constraint — retention killer for this audience, not a feature |
| Punitive/decay mechanics (HP loss, wilting mascot, sad-because-you-left states) | Forest's most-praised mechanic is the exact pattern Trinket inverts; no negative assets exist by construction |
| Guilt notifications, "we missed you", inactivity references | Warm re-entry after absence IS the retention mechanic |
| AI-generated advice, coaching, or encouragement text | AI boundary is the product thesis and positioning wedge; AI is input-processing only |
| Statistics dashboards, completion rates, progress pressure | History is a quiet log; if a stat can only be used for pressure it doesn't exist |
| Lock-screen presence (both known workarounds) | Accessibility-API hack faces 2026 Play policy shutdown; full lock-screen replacement demands scary permissions and an OEM-fragility treadmill |
| Live Activities / Dynamic Island | Phase 1+ at earliest; time-limited, purpose-bound, hardware-fragmented |
| Social/community features | Not core to the loop; cohort visibility risks public guilt mechanics |
| App/distraction blocking | Conflicts with pull-not-push PDA grammar and native-module constraint — permanent anti-feature |
| Diagnosis status field anywhere in the data model | GDPR Article 9; the app never asks and cannot store it |
| Medical/therapeutic claims in any copy | Wellness positioning; "treats/cures/diagnoses/clinically proven" forbidden until RCT publishes and counsel reviews |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| (populated by roadmap) | | |

**Coverage:**
- v1 requirements: 30 total
- Mapped to phases: 0
- Unmapped: 30 ⚠️ (roadmap pending)

---
*Requirements defined: 2026-07-02*
*Last updated: 2026-07-02 after initial definition*
