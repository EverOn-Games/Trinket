# Roadmap: Trinket

## Overview

Trinket ships as a vertical-slice MVP: infrastructure and the mascot come first because every other feature depends on them, then the Co-pilot activation event is built end-to-end and correctness-hardened immediately (not deferred), then Brain dump and Starter round out the three core mechanics, then onboarding stitches the first-run path together, then subscription infrastructure gates the now-complete core loop, then settings and an analytics audit close the loop on user control and funnel visibility, and a narrow beta-hardening pass verifies offline correctness and shame-free discipline across everything already built. The order follows the dependency chain identified in research: native infrastructure before any feature code, the mascot before any screen that hosts it, Co-pilot before the features that feed it, and the paywall only after there is a complete core loop worth gating.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Scaffold & Foundations** - Native infrastructure, local persistence, theming, and localization are in place on real devices (completed 2026-07-02)
- [x] **Phase 2: Mascot Module** - The raccoon mascot exists as a reusable, feature-agnostic presence module (completed 2026-07-02)
- [x] **Phase 3: Co-pilot End-to-End** - A user can start and always warmly finish an async body-doubling session, surviving backgrounding and force-quit (completed 2026-07-03)
- [ ] **Phase 4: Brain Dump** - A user can capture and categorize tasks by text or voice and promote any into a session
- [ ] **Phase 5: Starter** - A user can pair a personal cue with a tiny first action to pre-commit to starting
- [ ] **Phase 6: Onboarding** - A first-time user reaches their first task within 3 skippable screens
- [ ] **Phase 7: Subscription Infrastructure + Freemium Gate** - A user can subscribe or continue on a genuinely usable free tier, correctly online or offline
- [ ] **Phase 8: Settings & Analytics Audit** - A user controls locale/notifications/subscription state; the team sees funnel data with no content payloads
- [ ] **Phase 9: Beta Hardening** - The app is verified offline-correct, performant on real low-end hardware, and free of shame/urgency language

## Phase Details

### Phase 1: Scaffold & Foundations

**Goal**: The app boots on real iOS and Android devices with all native infrastructure, local persistence, theming, and localization in place, ready for feature development.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: FND-01, FND-02, FND-04, FND-05
**Success Criteria** (what must be TRUE):

  1. App builds and launches on a physical iOS device and a physical Android device via EAS dev-client (not Expo Go)
  2. Sessions, dump items, intentions, and settings each have a working MMKV-backed repository with no streak or daily-aggregate fields anywhere in the schema
  3. Every screen shell renders its copy from PL/EN string files, including correct Polish plural forms, with zero hardcoded strings
  4. Every screen renders in the dark-mode earthy theme using a token module structured for one-to-one swap when final design assets arrive

**Plans**: 6 plans
Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Scaffold SDK 56 + native infra + EAS/app config (FND-01)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Test + lint harness: jest-expo, MMKV mock, i18next no-literal-string (Wave 0)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03-PLAN.md — Earthy dark theme token module + hex-literal gate (FND-04)
- [x] 01-04-PLAN.md — i18n: PL/EN, CLDR Polish plurals, device-locale resolution (FND-05)
- [x] 01-05-PLAN.md — MMKV repositories for 4 collections + schema denylist guard (FND-02)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 01-06-PLAN.md — Home-hub app shell + walking-skeleton slice + device-boot checkpoint (FND-01/04/05)

**UI hint**: yes

### Phase 2: Mascot Module

**Goal**: The raccoon mascot exists as a reusable, feature-agnostic module that can express presence across any screen that hosts it.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: MASC-01, MASC-02, MASC-03, MASC-04
**Success Criteria** (what must be TRUE):

  1. Mascot renders greeting, idle, presence, dozing, and acknowledge states using placeholder Lottie assets with final-art-compatible slot names
  2. In idle state, 3+ distinct micro-behaviors (blink, posture shift, glance) play on randomized intervals
  3. Mascot never animates a prompt, demand, or disappointed/negative expression — no such asset exists in the set to trigger
  4. Mascot animates without visible stutter or frame drop on a real low/mid-tier Android device

**Plans**: 5 plans
Plans:

**Wave 1**

- [x] 02-01-PLAN.md — Contracts: mascotGlow token, Mascot type API, mascotProminence settings field
- [x] 02-02-PLAN.md — Native install (lottie-react-native), Jest mock, 300KB size gate, 5 placeholder assets

**Wave 2** *(blocked on Wave 1)*

- [x] 02-03-PLAN.md — Mascot logic: marker resolution, idle scheduler, reduced-stimulus (TDD)

**Wave 3** *(blocked on Wave 2)*

- [x] 02-04-PLAN.md — <Mascot /> component: single LottieView, fade, prominence, safe degradation (TDD)

**Wave 4** *(blocked on Wave 3)*

- [x] 02-05-PLAN.md — Host wiring: i18n labels, swap into Home, Android device smoothness checkpoint

**UI hint**: yes

### Phase 3: Co-pilot End-to-End

**Goal**: A user who has been avoiding a task can start a session in the mascot's presence and always receive a warm ending, regardless of duration, interruption, or completion.
**Mode:** mvp
**Depends on**: Phase 1, Phase 2
**Requirements**: PILOT-01, PILOT-02, PILOT-03, PILOT-04, PILOT-05, PILOT-06, PILOT-07
**Success Criteria** (what must be TRUE):

  1. User can start a session from a Brain-dump item, a typed one-liner, or an open "just work" entry, with an optional freely-adjustable length intent (25-min default suggestion)
  2. Session screen shows the mascot in presence state (dozing after ~30 minutes of session time and waking on touch or session end), subtle elapsed time, and a single End button, with no countdown pressure unless the user opted into one
  3. Ending a session early or in full always plays a warm acknowledgment, with a skippable one-tap 3-level mood check
  4. Force-quitting or backgrounding the app mid-session and reopening it later silently reconciles elapsed time from persisted timestamps with zero mention of the interruption
  5. Session history displays as a plain chronological log with no statistics, completion rates, or daily boundaries

**Plans**: 4 plans
Plans:

**Wave 1**

- [x] 03-01-PLAN.md — Session-lifecycle logic foundation: activeSession pointer repo, useElapsedSession hook, reconcileActiveSession pure fn (TDD)

**Wave 2** *(blocked on Wave 1)*

- [x] 03-02-PLAN.md — Co-pilot setup + active screen: three equal start paths, mascot presence/dozing, subtle timer, single End; Home entry refactor

**Wave 3** *(blocked on Wave 2)*

- [x] 03-03-PLAN.md — Warm ending (acknowledge + skippable 3-level mood check) + quiet History log (duration + mood)

**Wave 4** *(blocked on Wave 3)*

- [x] 03-04-PLAN.md — Interruption survival: cold-launch reconciliation sweep + Home resume card
**UI hint**: yes

### Phase 4: Brain Dump

**Goal**: A user can offload multiple tasks by text or voice in seconds and optionally promote any one straight into a Co-pilot session.
**Mode:** mvp
**Depends on**: Phase 1, Phase 3
**Requirements**: DUMP-01, DUMP-02, DUMP-03, DUMP-04, DUMP-05
**Success Criteria** (what must be TRUE):

  1. User can type 1-30 items in one free-text stream separated by newlines and see them saved as separate items
  2. User can capture items by voice via on-device speech-to-text, with automatic fallback to text entry when STT is unavailable
  3. Each captured item shows a suggested category (errands/work/home/people/someday) from on-device rule-based classification, changeable with one tap
  4. Items carry no due dates, reminders, or badges by default; any item can become a Co-pilot task in one tap
  5. Brain dump capture screen is reachable in at most 2 taps from anywhere in the app

**Plans**: 6 plans
Plans:

**Wave 1**

- [x] 04-01-PLAN.md — Pure classifier + newline parser (TDD) (DUMP-01, DUMP-03)
- [x] 04-02-PLAN.md — Draft-persistence MMKV wrapper + text/list/item i18n copy (DUMP-01)

**Wave 2** *(blocked on Wave 1)*

- [x] 04-03-PLAN.md — Text capture view + grouped SectionList; Save→parse→classify→persist (DUMP-01, DUMP-05)

**Wave 3** *(blocked on Wave 2)*

- [ ] 04-04-PLAN.md — Item row: inline category chips, edit, delete, promote button + quiet marker (DUMP-03, DUMP-04)
- [ ] 04-05-PLAN.md — Co-pilot dumpItemId promote hand-off (reuse beginSession) + route test (DUMP-04)

**Wave 4** *(blocked on Wave 3)*

- [ ] 04-06-PLAN.md — Voice slice: expo-speech-recognition install/config/mock + isolated hook + capture wiring + graceful fallback (DUMP-02)
**UI hint**: yes

### Phase 5: Starter

**Goal**: A user can pre-commit to starting a task by pairing a personal cue with a tiny first physical action.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: START-01, START-02, START-03, START-04
**Success Criteria** (what must be TRUE):

  1. User can build a "when X, then Y" intention in exactly two steps: pick a situation cue, then name a first physical action
  2. User can pick cues from a localized (PL/EN) library grouped by time-based, place-based, and event-based categories
  3. User can optionally attach a single self-worded notification to a saved intention, with the permission ask happening contextually here, not during onboarding
  4. Static UI copy visibly coaches the action to be a tiny first step, not the whole task

**Plans**: TBD
**UI hint**: yes

### Phase 6: Onboarding

**Goal**: A first-time user understands what Trinket is and reaches their first task within 3 skippable screens, without ever being asked for notification permission.
**Mode:** mvp
**Depends on**: Phase 2, Phase 3
**Requirements**: ONBD-01
**Success Criteria** (what must be TRUE):

  1. New user sees at most 3 screens: what Trinket is, pick your first task, meet the mascot
  2. User can skip onboarding from any screen and land directly in the app
  3. No notification permission dialog appears anywhere during onboarding

**Plans**: TBD
**UI hint**: yes

### Phase 7: Subscription Infrastructure + Freemium Gate

**Goal**: A user can subscribe to a paid tier or continue indefinitely on a genuinely usable free tier, with entitlements behaving correctly online or offline.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: MONEY-01, MONEY-02, MONEY-03, MONEY-04
**Success Criteria** (what must be TRUE):

  1. User can subscribe via weekly, monthly, or annual tiers with correct market-specific pricing (PL or US) through RevenueCat
  2. Free-tier user gets unlimited Brain dump and exactly 3 Co-pilot sessions/week; hitting the limit shows shame-free gate copy ("sessions refresh Monday", never "you've run out")
  3. A user offline with an unknown entitlement state defaults to free tier with no alarming copy, and restore purchases works correctly on a fresh install
  4. User can use the full core loop (Co-pilot, Brain dump, Starter) with no account; an account is introduced only at purchase or restore

**Plans**: TBD

### Phase 8: Settings & Analytics Audit

**Goal**: A user can control locale, notifications, and subscription state from one place, and the team can see activation/retention funnel data without ever seeing user content.
**Mode:** mvp
**Depends on**: Phase 5, Phase 7
**Requirements**: SETT-01, ANLY-01, ANLY-02
**Success Criteria** (what must be TRUE):

  1. User can change locale, toggle notification opt-in, and view current subscription state from a Settings screen
  2. Every analytics event fired by the app matches a typed allowlist and carries no content payloads, with autocapture and session replay confirmed disabled
  3. Activation (install → first completed Co-pilot session) and D7/D30 retention events fire correctly and appear in the EU-hosted analytics dashboard

**Plans**: TBD
**UI hint**: yes

### Phase 9: Beta Hardening

**Goal**: The app is ready for closed beta — correct fully offline, performant on real low-end hardware, and free of shame/urgency language anywhere in the product.
**Mode:** mvp
**Depends on**: Phase 1, Phase 2, Phase 3, Phase 4, Phase 5, Phase 6, Phase 7, Phase 8
**Requirements**: FND-03
**Success Criteria** (what must be TRUE):

  1. Every core feature (Co-pilot, Brain dump, Starter, Settings) works correctly with the network fully off, including a fresh install with no connectivity
  2. Purchase-then-offline and offline-fresh-install entitlement sequences behave as designed (free-tier fallback, no alarming copy)
  3. STT and Lottie animation both perform correctly on a real low/mid-tier Android device with system locale set to Polish
  4. A full copy audit across onboarding, notifications, gate messaging, and store listings confirms zero shame/streak/urgency language and zero medical claims
  5. Force-quit session resume and subscription restore on a fresh install both verified working end-to-end

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Scaffold & Foundations | 6/6 | Complete    | 2026-07-02 |
| 2. Mascot Module | 5/5 | Complete    | 2026-07-02 |
| 3. Co-pilot End-to-End | 5/5 | Complete   | 2026-07-03 |
| 4. Brain Dump | 3/6 | In Progress|  |
| 5. Starter | 0/TBD | Not started | - |
| 6. Onboarding | 0/TBD | Not started | - |
| 7. Subscription Infrastructure + Freemium Gate | 0/TBD | Not started | - |
| 8. Settings & Analytics Audit | 0/TBD | Not started | - |
| 9. Beta Hardening | 0/TBD | Not started | - |
