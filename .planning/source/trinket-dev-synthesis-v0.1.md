# Trinket. Development Synthesis for MVP

**Version:** v0.1, June 2026
**Purpose:** Primary briefing document for Claude Code sessions building the Trinket MVP. Contains product vision, hard constraints, MVP scope, mechanic specifications, technical architecture, and validation targets. Treat the constraints in section 2 as non-negotiable.

**Companion documents:**
- `trinket-design-synthesis-v0.1.md` (design research, reference apps, forbidden mechanics rationale)
- `trinket-model-biznesowy-v0.4.xlsx` (financial model, base case parameters)
- `trinket-wniosek-draft-v0.6.md` (full business plan, Polish)
- Claude Design output: 10 dark-mode UI mockups + extractable design system

---

## 1. Product overview

Trinket is a mobile companion app for adults with ADHD. It supports the two hardest moments of an ADHD day: **starting a task** and **transitioning between tasks**.

The core differentiator is an animated mascot acting as an **asynchronous body double**: the user starts a difficult task in the mascot's presence, without scheduling a session with another human. This implements the finding of Ara et al. (2025, arXiv:2509.12153) that an animated companion produces effects comparable to a human body double, both significantly better than working alone.

- **Platforms:** iOS + Android, single codebase
- **Markets:** Poland + USA simultaneously from day 1
- **Languages:** Polish + English from first release
- **Positioning:** wellness app, NOT a medical device. No therapeutic claims anywhere in UI copy, store listings, or notifications
- **Launch target:** public release Q4 2026; closed beta cohorts in incubation month 3-4

## 2. Hard constraints (non-negotiable)

These come from the product thesis, the target population's psychology, and regulatory positioning. Violating any of these is a bug, regardless of how standard the pattern is in other apps.

### 2.1 Shame-free design
- **No streak mechanics.** No visible day chains, no "you broke your streak," no streak counters anywhere
- **No punitive mechanics.** Nothing is ever lost due to absence: no HP loss, no decaying progress, no wilting or sad-because-you-left mascot states
- **Re-entry after absence is always warm.** A user returning after 3 weeks sees a happy greeting, never a backlog report, guilt copy, or "we missed you" pressure
- **No guilt-driven notifications.** Notifications are opt-in, minimal, and never reference missed sessions or inactivity duration

### 2.2 PDA-aware interaction grammar
A meaningful share of the target population experiences demand avoidance (PDA): direct demands, even friendly ones, trigger resistance. Therefore:
- The mascot **never issues demands, prompts, or calls to action**. It does not say "let's get started!", "time to focus!", or "you should..."
- The mascot is **present, not directive**. It reacts to what the user does; it does not initiate
- UI copy offers, never instructs. "Start a session?" is acceptable as a button label; a mascot speech bubble saying "Start a session!" is not

### 2.3 AI boundary
- AI is used **only for input processing**: speech-to-text and semantic categorization in Brain dump
- AI **never generates advice, coaching responses, encouragement text, or any therapeutic output**
- No LLM calls in the core loop. If a feature idea requires generated text shown to the user as guidance, it is out of scope by design, not by budget

### 2.4 Privacy architecture (GDPR Article 9)
- **Local-first:** user content (tasks, brain dumps, session history) lives on device in MMKV
- Cloud sync is **minimal and account-scoped**: subscription state, account identity, opt-in backup only
- Analytics are event-based, pseudonymous, GDPR-compliant, with no content payloads (event "brain_dump_created" yes; the dump's text never)
- ADHD status is health-adjacent data. The app never asks for diagnosis status, and no data model field stores it

### 2.5 Regulatory copy boundary
Allowed: "supports task initiation," "designed for neurodivergent minds," "based on validated behavioral techniques."
Forbidden: "treats," "cures," "diagnoses," "reduces ADHD symptoms," "clinically proven" (until our own RCT publishes, and even then reviewed by counsel first).

## 3. MVP scope

### 3.1 In scope (3 of 5 mechanics)

**Co-pilot** (Pilot) is the core innovation and the activation event. Build it first and best.

**Brain dump** (Spis myśli) and **Starter** (Startująca myśl) complete the MVP loop.

Plus: mascot with basic animated states, onboarding, subscription infrastructure, PL/EN localization, settings, and the free/premium gate.

### 3.2 Explicitly out of scope for MVP
- Soft landing and Bridge mechanics (Phase 1, post-launch)
- Light mode (dark mode is default and only mode at MVP; decision pending on light mode timing)
- Home screen widgets, system overlays, Live Activities (Phase 1+; see platform notes 6.4)
- Social or community features
- Mascot customization, content packs, seasonal expressions
- Any form of gamified rewards beyond the mascot's natural reactions

## 4. Mechanic specifications

### 4.1 Co-pilot (async body doubling)

**User story:** "I have a task I've been avoiding for two hours. I open Trinket, pick the task, and start a session. The raccoon is there with me. I work. It occasionally reacts. When I stop, it acknowledges me warmly, regardless of whether I finished."

**Flow:**
1. Entry point: primary action on home screen
2. Task selection: pick from Brain dump items, or type a quick one-liner, or start a "just work" session with no named task (all three paths equal, no friction ranking)
3. Optional session length intent (25 min default suggestion, freely adjustable, no penalty for stopping early; a session that ends early is a completed session, not an abandoned one)
4. Session screen: mascot in calm presence state, elapsed time (subtle, not a countdown pressure timer unless user chose one), single End button
5. During session: mascot idle behaviors on randomized intervals (blink, small posture shift, slow look around). If session exceeds ~30 min, mascot may doze (this is charm, not a signal)
6. End of session: mascot reaction (warm acknowledgment animation), optional one-tap mood check ("how was it?" with 3 emoji-level options, skippable), session logged locally
7. No session summary screens with statistics pressure. History exists in a quiet log, not a dashboard

**Edge cases:**
- App backgrounded during session: session continues; on return, mascot is still there (state persisted)
- Session crosses midnight: irrelevant, no daily boundaries exist in the data model
- User force-quits mid-session: on next open, no mention of the interrupted session

### 4.2 Brain dump

**User story:** "My head is full. I open Brain dump, speak or type everything out in one stream, and it's out of my head. Later, the items are grouped so I can find them."

**Flow:**
1. Entry: prominent secondary action, also reachable in max 2 taps from anywhere
2. Capture: free text field + voice input button (on-device speech-to-text where available; platform STT APIs, not a cloud LLM)
3. Items separated by newline or spoken pauses; user can dump one item or thirty
4. Semantic categorization: after capture, items get suggested category tags (errands, work, home, people, someday). Implementation: lightweight on-device classification or a minimal API call that sends only the item text for classification with no user identifiers; prefer on-device. Categories are suggestions the user can change with one tap
5. Items are inert by default. No due dates, no reminders, no red badges. An item can be promoted to a Co-pilot session task with one tap

### 4.3 Starter (implementation intentions)

**User story:** "I know what I need to do but can't bridge into it. Starter walks me through building a 'when X, then Y' plan, which research says roughly doubles follow-through."

**Flow:**
1. Entry: from home or from a Brain dump item
2. Dialog builds the intention in two steps: pick or type the situation cue ("when I sit down with coffee," "when I close this app," "after lunch"), then the first physical action ("I will open the document and write one sentence")
3. Library of starter cue suggestions (localized PL/EN), grouped by time-based, place-based, and event-based cues
4. Output is a saved intention card. Optional single notification at a user-chosen time, phrased as the user's own words back to them, never as an app demand
5. First-action framing: the Y in "when X then Y" is coached (via static UI copy, not AI) to be a tiny physical action, not the whole task

## 5. Mascot specification

Character design is being commissioned (external designer, in progress). Develop against a **placeholder** with identical state machine and Lottie slot names so final assets drop in.

### 5.1 MVP state machine

```
        ┌────────────┐
        │  greeting   │  app open, returns to idle after play
        └─────┬──────┘
              v
        ┌────────────┐   randomized micro-behaviors
   ┌───>│    idle     │──── blink / shift / glance ───┐
   │    └─────┬──────┘                                │
   │          │ session start                         │
   │          v                                       │
   │    ┌────────────┐   >30 min                      │
   │    │  presence   │────────> dozing (loops,       │
   │    └─────┬──────┘           wakes on touch/end)  │
   │          │ session end                           │
   │          v                                       │
   │    ┌────────────┐                                │
   └────│ acknowledge │<───────────────────────────────┘
        └────────────┘   warm reaction, then idle
```

States for MVP: `greeting`, `idle` (with 3+ micro-behavior variants), `presence`, `dozing`, `acknowledge`. All Lottie JSON, loaded lazily, each loop under 300 KB target.

### 5.2 Behavioral rules
- Reactions follow user actions; the mascot never initiates interaction
- No negative states exist. There is no sad, disappointed, or lonely animation in the asset set, so the codebase cannot express one
- Doze is neutral-cozy, not a commentary on session length

## 6. Technical architecture

### 6.1 Stack
- **App:** React Native + Expo (managed workflow as long as feasible), TypeScript strict
- **Local storage:** MMKV for user content and app state
- **Backend:** Supabase (auth, subscription state mirror, opt-in encrypted backup). Keep the backend surface minimal; the app must be fully functional offline except purchase and restore
- **Animations:** Lottie (lottie-react-native)
- **Subscriptions:** RevenueCat over StoreKit 2 / Play Billing (three tiers per market, see 6.3)
- **Analytics:** privacy-first, EU-hosted or self-hosted (PostHog EU or equivalent), pseudonymous IDs, no content payloads
- **Speech-to-text:** platform-native APIs (iOS Speech framework, Android SpeechRecognizer) via a maintained RN module; on-device preferred where OS supports it

### 6.2 Data model sketch (local)
- `dump_items`: id, text, category, created_at, promoted_task_id?
- `intentions`: id, cue_text, action_text, notify_at?, created_at
- `sessions`: id, task_label?, source (dump | quick | open), started_at, ended_at, mood?
- `settings`: locale, notifications_optin, subscription_cache
No daily aggregates, no streak fields. If a stat can only be used for pressure, it does not exist in the schema.

### 6.3 Pricing configuration
| Tier | Poland | USA |
|---|---|---|
| Weekly | 9,99 PLN | 5.99 USD |
| Monthly | 24,99 PLN | 11.99 USD |
| Annual | 199 PLN | 79 USD |

Freemium gate (initial proposal, validate in beta): free tier includes Brain dump unlimited + 3 Co-pilot sessions per week; premium unlocks unlimited sessions, Starter library full set, backup. Gate copy must remain shame-free (no "you've run out" framing; "sessions refresh Monday" neutral phrasing).

### 6.4 Platform notes
- iOS prohibits rendering outside the app sandbox; Android allows overlays (SYSTEM_ALERT_WINDOW). Any floating-companion ambitions are Android-only and post-MVP
- Interactive widgets exist on both platforms but do not support continuously animated content. Widget = static mascot art + one-tap session start, Phase 1
- Keep everything MVP inside the app process; no native modules beyond well-maintained community ones

### 6.5 Localization
- i18n from the first screen; string files PL + EN, no hardcoded copy
- Polish copy register: warm, plain, no corporate tone, no anglicisms where a natural Polish word exists
- Date/number formats per locale; prices via store-provided localized values

## 7. Design system

Claude Design has delivered 10 dark-mode screens and an extractable design system (colors, typography, components). Extract tokens into a `theme/` module before building screens. Dark mode is the only mode at MVP. Landing page layout exists separately and is out of app scope.

Visual tone anchors: soft rounded shapes, earthy palette, night-time cozy atmosphere, hand-drawn quality. The mascot is a calm night-shift raccoon; UI should feel like its habitat.

## 8. Validation targets (beta + launch)

| Metric | Target | Definition |
|---|---|---|
| Activation | > 40% | first completed Co-pilot session within 48h of install |
| D7 retention | > 25% | any app open on day 7 |
| D30 retention | > 12% | any app open on day 30 |
| Conversion | 2.0-2.3% | install to paying, cumulative |
| Qualitative | self-reported | "Co-pilot lowers my threshold to start" in beta interviews |

Beta cohorts: 20-30 users via ATTENTIO (PL) + 20-30 via online communities (US), incubation months 3-4. Instrument the funnel events before beta, not after.

## 9. Build order proposal

1. Project scaffold: Expo + TS strict + theme extraction from design system + i18n skeleton + MMKV layer
2. Mascot module with placeholder Lottie states and the state machine (section 5.1)
3. Co-pilot end to end (the activation event; everything else supports it)
4. Brain dump (capture first, categorization second)
5. Starter
6. Onboarding (3 screens max: what Trinket is, pick your first task, meet the mascot; skippable)
7. Subscription infra + freemium gate
8. Analytics events + settings + notification opt-in
9. Beta hardening: offline correctness, state persistence, crash-free sessions

## 10. Open decisions (do not block on these)

- Final mascot design delivery date (external commission in progress; placeholder until then)
- Light mode timing (Phase 0 skip vs Phase 1.5)
- Exact freemium gate boundaries (validate in beta)
- Backup encryption approach (opt-in backup can ship post-MVP if needed)
- Semantic categorization: on-device model vs minimal API (spike early, prefer on-device)

---

*Trinket development synthesis v0.1, June 2026*
*EverOn Games sp. z o.o. / Trinket founding team*
