# Feature Research

**Domain:** ADHD companion / focus / body-doubling mobile app
**Researched:** 2026-07-01
**Confidence:** MEDIUM-HIGH (competitive landscape verified across multiple independent sources per app; Trinket's constraint-derived anti-features are HIGH confidence, sourced directly from product docs)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users in this category assume exist. Missing these makes Trinket feel unfinished next to Tiimo, Forest, Finch, Focus Bear, and Routinery — all of which ship them today.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Low-friction task/thought capture (text + voice) | Every reference app (Tiimo, Goblin Tools, Routinery) leads with fast capture; typing is itself a barrier for ADHD users, so voice is not optional-nice, it's expected | MEDIUM | Trinket: Brain dump. Platform-native STT (no cloud LLM) keeps this inside the AI boundary |
| Focus/session timer with visible but non-punishing elapsed time | Core mechanic of Forest, Tiimo, Endel, Focus Bear — the category's foundational loop | LOW | Trinket: Co-pilot session screen. Countdown pressure must be opt-in, not default (see Anti-Features) |
| Visual-first, low-text UI (color, icons, cards over dense lists) | Tiimo won iPhone App of the Year 2025 specifically for this; it has moved from differentiator to baseline expectation in the category | MEDIUM | Design-system cost, not engineering cost; already directed by dev synthesis (dark mode, rounded shapes, earthy palette) |
| A character/companion presence, not a bare utility UI | Finch (bird), Carrot Weather, Forest (tree) all show that character-driven engagement outperforms plain productivity chrome in this audience | MEDIUM-HIGH | Trinket's mascot IS the product; this line item is inherited automatically, not bolted on |
| Opt-in notifications/reminders | Routinery's voice alerts, Focus Bear's "Late No More" — users expect *some* nudge capability even if off by default | LOW-MEDIUM | Trinket: Starter's single optional self-worded notification; must stay non-directive (see Constraints) |
| A quiet history/log of activity | Even minimal-stats apps like Goblin Tools implicitly let users see what they did; total absence of any record feels broken | LOW | Trinket: sessions logged locally, no dashboard, no streak framing — satisfies expectation without violating shame-free constraint |
| Short, personalized-feeling onboarding | Every competitor onboards with some setup (Tiimo's setup flow, Finch's pet-naming, Focus Bear's routine builder); zero onboarding reads as unfinished | LOW-MEDIUM | Trinket: 3 screens max per dev synthesis — tension with "personalization expectation" is real and intentionally resolved toward brevity given low friction tolerance in this population |
| Freemium model with a genuinely usable free tier | Every competitor researched (Tiimo, Forest, Focus Bear, Finch) uses tiered/freemium pricing with a real free tier, not a locked demo | MEDIUM | Trinket: unlimited Brain dump + 3 Co-pilot sessions/week free. RevenueCat integration is table-stakes infrastructure for this category, not a differentiator |
| Cross-session state persistence (backgrounding, force-quit) | Users expect a session-based app to survive interruption without losing state — basic mobile app hygiene, and doubly true for a distractible audience prone to app-switching mid-task | LOW-MEDIUM | Trinket: explicit requirement; offline-first correctness is baseline for this category, not a selling point |

### Differentiators (Competitive Advantage)

Features that set Trinket apart from the reference set. These map directly to the "companion + shame-free re-entry" wedge identified against Tiimo, and to gaps in the live-body-doubling category (Focusmate, Flow Club, Flown, Cave Day, ND Hive).

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Asynchronous mascot body-doubling (Co-pilot) | Every live body-doubling competitor (Focusmate, Flow Club, Flown, Cave Day, ND Hive, Deepwrk) requires scheduling a slot with a stranger or a group — friction that defeats the point for someone who needs to start *right now*. Trinket is the only entry in the researched set offering always-available, zero-scheduling, non-human presence backed by peer-reviewed evidence (Ara et al. 2025) that an animated companion approaches human-body-double effectiveness | HIGH | This is the core innovation and activation event; build first and best per dev synthesis |
| Shame-free, warm re-entry after any absence gap | Forest kills the tree on early exit; Finch's bird visibly needs care; most habit apps show backlogs or broken streaks. No researched competitor guarantees a warm return with zero cost after a multi-week gap | MEDIUM | Requires "no negative states" to be an asset-level guarantee (not just a policy) — the state machine literally cannot render disappointment |
| PDA-aware non-directive mascot grammar | Finch's bird nudges for care tasks, Focus Bear "nudges you back on track," Routinery voice-announces the next task — all directive by design. A companion that only reacts and never initiates is unclaimed territory in the researched set | MEDIUM | Behavioral constraint, cheap to build correctly from day one, expensive to retrofit — front-load this in mascot spec and copywriting guidelines |
| Implementation-intention builder (Starter) as a first-class mechanic | None of the researched competitors (Tiimo's AI planner, Goblin Tools' task breakdown, Routinery's routine builder) implement "when X, then Y" cue-action pairing as a discrete, research-backed mechanic — Goblin Tools breaks tasks into steps but doesn't anchor the *start* to a situational cue | MEDIUM | Backed by implementation-intention research (~doubles follow-through); differentiates from Goblin Tools' step-breakdown approach, which addresses a different failure point (task too big) than Starter's (can't bridge into starting) |
| Restraint as a trust feature: AI limited to input processing only | Tiimo's AI Co-Planner, Focus Bear's AI relevance detection, and GetMotivated.ai's "AI coaching" all generate user-facing guidance text. Trinket explicitly refuses this — for a population wary of being told what to do, "the app doesn't try to coach you" is a marketable trust signal, not a limitation | LOW (as a constraint; the harder work is resisting scope creep) | Directly informs positioning copy: "companion, not coach" |
| Local-first privacy with no diagnosis-status field in the data model | Health/wellness apps in this space routinely ask for diagnosis or symptom severity for "personalization." Trinket's refusal to collect or store this (GDPR Art. 9-aware) is differentiating for a population that has reason to distrust data practices around mental-health-adjacent apps | LOW-MEDIUM | Architectural decision, not a feature UI — but worth surfacing in store listing and onboarding copy as a stated commitment |
| Un-scored mood check-in (skippable, no history pressure) | Finch's mood tracking feeds visible growth/reward mechanics; MacroFactor-style shame-free data collection (clean, non-gamed) is the model Trinket should follow instead | LOW | One-tap, 3-emoji, optional, at session end only — deliberately smaller in scope than Finch's daily mood/journal system |

### Anti-Features (Commonly Requested, Often Problematic)

Patterns that are standard, even celebrated, elsewhere in this category but are explicitly excluded for Trinket. Several map directly to mechanics identified in the design-pattern synthesis as "the videos celebrate these, Trinket must invert them."

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Streak counters / "protect your streak" | Standard growth mechanic (Snapchat, most habit trackers); investors and growth advisors will ask why it's missing | Converts a missed day into an identity loss; the exact dynamic that produces guilt spirals in the ADHD population Trinket serves | Quiet local session log with no chain-counting; celebrate what happened, never track what didn't |
| Dying/wilting/decaying companion state (Forest's tree, Finch's neglected-pet visual) | Rated the single strongest engagement pattern in the reference material; object permanence plus stakes drives daily opens | Mechanically identical to Trinket's own engine (living companion + object permanence) but weaponized against the user — punishes absence, the opposite of "re-entry is always warm" | Mascot idles contentedly regardless of gap length; no negative animation exists in the asset set, so it cannot be added later by accident |
| Public/cohort absence visibility (Ladder-style group streak boards) | Strong retention driver in fitness-adjacent apps; social accountability is a real mechanism | Public guilt — absence made visible to strangers is shaming with extra steps, incompatible with a shame-free thesis and with an audience where social anxiety commonly co-occurs with ADHD | None needed; Co-pilot's "presence" already supplies the felt sense of not-alone without exposing absence data to anyone |
| Reward/growth tied to task-completion frequency (Finch's energy-to-grow-your-pet loop, Forest's coins-for-streaks) | Classic gamification; "number go up" reliably increases session frequency in the short term | Reward contingent on compliance creates a shame surface on the flip side — no reward when the user doesn't/can't act, which reintroduces guilt through the back door | Mascot's natural, non-scored reactions only; nothing is unlocked, earned, or withheld based on behavior |
| Guilt/nag notifications referencing missed sessions or days since last open | Common re-engagement lever (most habit and fitness apps default to this) | Directly violates the shame-free constraint; also likely to trigger demand-avoidant resistance rather than compliance in the PDA-affected share of the audience | Opt-in notifications only reference the user's own stated intent (Starter's self-worded cue), never inactivity duration |
| Session/statistics dashboards (completion %, weekly totals, "advanced statistics" as in Forest Premium) | Perceived as premium value-add; users who like tracking will ask for it | Any stat that can be used for self-judgment becomes pressure; the data model explicitly excludes daily aggregates and streak fields so this can't quietly reappear via a stats screen | History stays a quiet, unscored log; no aggregation views in MVP |
| AI-generated coaching, encouragement, or advice text (Tiimo's AI Co-Planner output, Focus Bear/GetMotivated-style AI coaching, Goblin Tools' "Judge"/"Professor" interpretive tools) | Feels like a value differentiator and is trivial to build with current LLMs; strong current-year trend across the category | Violates the AI boundary constraint outright — generated therapeutic-adjacent text from an unaccountable model is a product-thesis and liability line Trinket has deliberately drawn | AI restricted to STT transcription and semantic categorization of brain-dump text only; all user-facing guidance copy is static and human-written |
| Live/scheduled human body-doubling (Focusmate-style slot booking, Flow Club/Flown facilitator sessions) | The best-evidenced form of body doubling and the model most existing "body doubling apps" use | Requires scheduling and showing up to a human-attended session — exactly the kind of commitment friction that defeats a user who needs to start *right now*, and adds a whole live-infrastructure surface (video, hosts, moderation) outside MVP scope | Async mascot presence: zero scheduling, always available, private |
| Cross-device distraction/app blocking (Focus Bear's site/app blocking across OSes) | Directly addresses a real ADHD pain point (compulsive app-switching) and is a well-loved Focus Bear feature | Restriction/blocking is a control mechanic — for a demand-avoidant-aware design, being blocked from something reads as being told what to do, and it requires native OS integration outside the "no native modules beyond well-maintained community ones" constraint | Presence-based pull (a companion worth returning to) instead of enforcement; leave blocking to other apps in the user's toolkit |
| Reward-gated mascot customization (cosmetic unlocks tied to engagement, à la Finch's pride-flag/mobility-aid unlocks) | Popular retention lever; customization is a proven differentiator for character-driven apps (Carrot, Finch) | Any customization gated behind usage becomes a disguised streak/compliance reward | If customization ships post-MVP, gate it behind purchase/choice only, never behind session frequency or absence-free days |
| Diagnosis-status or symptom-severity onboarding questions (common "personalize your plan" pattern in wellness apps) | Feels like standard personalization UX (Calm's "what brings you here?" pattern) and improves perceived relevance | ADHD status is health-adjacent data under GDPR Art. 9; the app is positioned as wellness, not diagnostic, and no data model field may store this | Personalization limited to task/preference inputs (first task, cue library selection) — never diagnosis or clinical framing |
| Default hard countdown timers | Pomodoro-style countdown is the category default (Forest, Endel Focus Timer) | A ticking countdown is itself a pressure mechanic for a population sensitive to time pressure and demand; ending early can read as failure under a countdown frame | Elapsed time shown subtly by default; countdown available only if the user opts in, and stopping early is always framed as a completed session, not an abandoned one |

## Feature Dependencies

```
[Mascot module: state machine] ──requires──> [Co-pilot session screen] (presence state needs somewhere to render)

[Co-pilot] ──enhanced-by──> [Brain dump] (task selection can pull from dump items, but quick one-liner and "just work" are equal, unblocked paths)

[Starter] ──enhanced-by──> [Brain dump] (can originate from a dump item, but also stands alone from home)

[Starter: notification] ──requires──> [Settings: notification opt-in]

[Freemium gate] ──requires──> [Sessions data model] (weekly session count must exist before a 3-sessions/week free limit can be enforced)

[Brain dump: semantic categorization] ──enhances──> [Brain dump: capture] (capture works standalone; categorization is a suggestion layer, not a blocker)

[Onboarding: "pick your first task"] ──requires──> [Brain dump or quick-entry capture] (must exist before onboarding can route to it)

[Analytics funnel instrumentation] ──requires──> [Co-pilot + Brain dump + Starter] (events need the mechanics to exist before they can be tracked)

[Any reward/gamification feature] ──conflicts──> [Shame-free design constraint]
[Streaks / stats dashboards] ──conflicts──> [No-daily-aggregates data model]
[Distraction blocking / enforcement] ──conflicts──> [PDA-aware, pull-not-push grammar]
[AI-generated coaching text] ──conflicts──> [AI boundary constraint]
```

### Dependency Notes

- **Co-pilot requires the Mascot module:** the presence screen has no content without the state machine (greeting/idle/presence/dozing/acknowledge) existing first — this is why mascot placeholder assets are built before Co-pilot in the proposed build order.
- **Freemium gate requires the sessions data model:** the weekly 3-session free cap can't be enforced or displayed without a `sessions` table and a way to count "this week" without introducing a daily/weekly aggregate that could later be repurposed for streak-style pressure — the schema needs to support counting without exposing a user-facing streak.
- **Brain dump enhances but does not gate Co-pilot:** deliberately three equal entry paths (dump item / one-liner / open session) so Brain dump adoption isn't a precondition for the activation event.
- **Reward/gamification, dashboards, blocking, and AI-coaching all conflict with hard constraints:** these aren't features to sequence later — they are structurally excluded and should be treated as guardrails in code review, not backlog items.

## MVP Definition

### Launch With (v1)

Minimum viable product — matches the "Active" requirements already scoped in PROJECT.md, cross-validated against the competitive set above.

- [ ] Co-pilot (async body doubling, end to end) — the activation event; no researched competitor offers zero-scheduling async companion presence, so this is the wedge and must ship first
- [ ] Brain dump (text + voice capture, semantic category suggestions, inert by default) — table-stakes capture, differentiated by refusing due dates/badges/urgency signals
- [ ] Starter (implementation-intention builder) — differentiator not found elsewhere in the researched set; completes the "start a task" and "bridge into it" loop
- [ ] Mascot module (placeholder Lottie states, no negative states in the asset set) — table stakes for character-driven engagement in this category, and the asset-level guarantee that shame-free design can't regress
- [ ] Onboarding (3 screens max, skippable) — table stakes, deliberately shorter than category norm given low friction tolerance
- [ ] Subscription infrastructure (RevenueCat, shame-free gate copy) — table stakes; every competitor researched runs freemium
- [ ] Localization (PL + EN from screen one) — required for stated simultaneous PL/US launch, not deferrable
- [ ] Settings (locale, notification opt-in, subscription state) — baseline mobile app hygiene
- [ ] Analytics (privacy-first, pseudonymous, no content payloads) — must be instrumented pre-beta per validation targets
- [ ] Offline-first correctness — table stakes; distractible audience frequently backgrounds/force-quits mid-task

### Add After Validation (v1.x)

- [ ] Soft landing and Bridge mechanics — the other 2 of 5 originally-scoped mechanics; add once Co-pilot/Brain dump/Starter loop is validated (activation >40%, D7 >25%)
- [ ] Light mode — timing deliberately deferred; add if beta feedback or platform analytics show demand
- [ ] Home screen widget (static mascot art + one-tap session start) — both platforms support non-animated widgets today; adds a lower-friction entry point once core loop is proven
- [ ] Opt-in encrypted backup — can ship post-MVP without blocking core loop validation

### Future Consideration (v2+)

- [ ] Mascot customization / content packs / seasonal expressions — explicitly out of scope; revisit only with purchase-gated (never engagement-gated) unlock design to avoid becoming a disguised reward mechanic
- [ ] Android-only floating/overlay companion — technically feasible on Android only (SYSTEM_ALERT_WINDOW); iOS parity gap makes this a post-PMF platform-specific bet, not a v1/v1.x candidate
- [ ] Any social or community layer — not core to the loop per current scope; body-doubling competitors that lean into community (Deepwrk, ND Hive) trade off against the "always-private, always-available" positioning that differentiates Trinket from them

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Co-pilot (async body doubling) | HIGH | HIGH | P1 |
| Brain dump (capture + categorization) | HIGH | MEDIUM | P1 |
| Starter (implementation intentions) | MEDIUM-HIGH | MEDIUM | P1 |
| Mascot state machine (placeholder assets) | HIGH | MEDIUM-HIGH | P1 |
| Onboarding (3 screens) | MEDIUM | LOW | P1 |
| Subscription infra + freemium gate | MEDIUM (enables business) | MEDIUM | P1 |
| Localization PL/EN | HIGH (market requirement) | LOW-MEDIUM | P1 |
| Offline-first persistence | HIGH | MEDIUM | P1 |
| Analytics (privacy-first funnel) | MEDIUM (invisible to user, critical to team) | LOW-MEDIUM | P1 |
| Soft landing mechanic | MEDIUM | MEDIUM | P2 |
| Bridge mechanic | MEDIUM | MEDIUM | P2 |
| Light mode | LOW-MEDIUM | MEDIUM | P2 |
| Home screen widget (static) | MEDIUM | MEDIUM | P2 |
| Opt-in encrypted backup | LOW-MEDIUM | MEDIUM | P2 |
| Mascot customization | LOW (nice-to-have, risk of misuse) | MEDIUM | P3 |
| Android overlay companion | LOW-MEDIUM | HIGH | P3 |
| Social/community features | LOW (conflicts with positioning) | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature dimension | Tiimo | Forest | Finch | Focus Bear | Flow Club / Flown | Goblin Tools | Routinery | Trinket's Approach |
|---|---|---|---|---|---|---|---|---|
| Task/thought capture | Visual timeline, AI subtask breakdown, 3,000+ colors | None (pure timer) | Daily task/goal list tied to pet growth | Routine builder, not free-form capture | None (goal stated verbally per session) | Magic ToDo AI breakdown with "spiciness" slider | Routine/habit sequencing, not free capture | Brain dump: free text + voice, inert by default, no urgency metadata |
| Focus/session support | Countdown timer anchored to schedule | Pomodoro/stopwatch, tree grows while focused | Loosely tied to task completion, not a dedicated timer | Routine-guided timer with call-aware breaks | Live, human-hosted, scheduled sessions (video) | None | Voice-guided routine timer with pause/skip/auto-next | Co-pilot: async mascot presence, elapsed time subtle by default, no scheduling |
| Companion/character | None (utility UI) | Tree (dies if you leave early) | Bird pet (visibly needs care, unlocks cosmetics via tasks) | None (utility UI, coaching tone) | Human host, not a character | None (utility UI) | None (plant badge reward, not a character) | Calm raccoon mascot; reacts only, never initiates, no negative states possible |
| Gamification/rewards | Minimal | Coins, streaks, species unlocks tied to consistency | Energy/growth tied to task-completion frequency, cosmetic unlocks | Minimal (routine completion, not scored) | None | None | Plant badge reward system, streak-adjacent tracking | None; mascot reactions are natural, unscored, never withheld |
| Notifications | Schedule-based reminders | Standard reminders | Pet-care nudges | High-intensity "Late No More" alerts, call-aware | Session-time reminders (opt-in booking) | None (stateless tool) | Voice-announced task transitions | Single opt-in, self-worded notification per Starter intention only; never references absence |
| Body-doubling model | None | None | None (solo pet care) | None (blocking/routines, not doubling) | Live, scheduled, human-hosted or peer-matched | None | None | Async, zero-scheduling, mascot-based (unique in researched set) |
| AI use | AI Co-Planner generates schedules/subtasks (user-facing guidance) | None | None | AI relevance detection for blocking | None (human-hosted) | AI generates task breakdowns and tone rewrites (user-facing) | None | AI restricted to STT + semantic categorization only; never generates guidance text |
| Privacy/data stance | Standard cloud sync, AI processes user text | Standard | Standard, gamifies mood/task data | Standard | Standard (live video) | Web version fully local option; app version standard | Standard | Local-first (MMKV), minimal account-scoped cloud sync, no diagnosis field, no content in analytics |
| Pricing model | Freemium, $7.99/mo or $79.99/yr Pro | Free w/ ads, $1.99 one-time to remove ads, premium subscription for group mode/stats | Freemium subscription | Free 7-day trial then subscription, fair-pricing option | Subscription, per-session or membership | Free web, ~$3.99 one-time (mobile) | Freemium subscription | Freemium: unlimited Brain dump + 3 Co-pilot sessions/week free; three paid tiers (weekly/monthly/annual), shame-free gate copy |

## Sources

- [Tiimo — Visual Planner for Every Neurotype](https://www.tiimoapp.com/) — official site, features and positioning (App of the Year 2025)
- [Tiimo product page](https://www.tiimoapp.com/product) — AI planning, focus timer, cross-device features
- [Tiimo FAQ](https://www.tiimoapp.com/faq) — pricing/trial mechanics
- [Why Tiimo isn't fully free but will always be ad-free](https://www.tiimoapp.com/resource-hub/why-tiimo-went-freemium) — freemium philosophy, official
- [Finch: Self-Care Pet — App Store](https://apps.apple.com/us/app/finch-self-care-pet/id1528595748) — official app listing, feature description
- [Reset ADHD — Finch Self Care App](https://www.resetadhd.com/adhd-resource-hub/finch-self-care) — ADHD-specific usage analysis
- [Forest — The #1 Focus App](https://forestapp.cc/) — official site, pomodoro/tree mechanic, premium tiers
- [Forest — App Store listing](https://apps.apple.com/us/app/forest-focus-for-productivity/id866450515) — pricing and feature confirmation
- [Focus Bear — Focus & Productivity App for ADHD Brains](https://www.focusbear.io/) — official site, routine/blocking features
- [Focus Bear FAQs](https://www.focusbear.io/faqs) — pricing, platform availability
- [Focus Bear blog — Habit Tracker designed for people with ADHD](https://www.focusbear.io/blog-post/focus-bear-habit-tracker-designed-for-people-with-adhd) — routine-guidance vs. checkbox tracking distinction
- [Flow Club](https://www.flow.club/) — official site, live body-doubling model
- [FLOWN](https://flown.com/) — official site, facilitated/live session model
- [FLOWN — 16 body doubling apps for ADHD and focus](https://flown.com/blog/adhd/best-body-doubling-apps) — comparative landscape of live body-doubling competitors (Focusmate, Cave Day, ND Hive, Deepwrk, etc.)
- [Goblin Tools](https://goblin.tools/) and [Goblin Tools — App Store](https://apps.apple.com/us/app/goblin-tools-adhd-planner/id6479981873) — Magic ToDo breakdown, AI-generated interpretive tools, pricing model
- [Endel](https://endel.io/) and [Endel — Focus](https://endel.io/focus) — generative soundscape + focus timer feature set
- [Routinery](https://www.routinery.app/) — official site, voice-guided routine builder
- [Routinery — how Routinery helps ADHD](https://www.routinery.app/blog/how-routinery-helps-adhd) — ADHD-specific design rationale
- Internal: `.planning/PROJECT.md`, `.planning/source/trinket-dev-synthesis-v0.1.md`, `.planning/source/trinket-design-pattern-synthesis-v0.1.md` — hard constraints, MVP scope, and the explicit "patterns to invert" mapping (Forest, Ladder, Snapchat, Robin Hood, MacroFactor) that anchors the anti-features list

---
*Feature research for: ADHD companion / focus / body-doubling mobile app*
*Researched: 2026-07-01*
