# Trinket — Technical Innovation Summary

*Prepared for investment review. Every claim below maps to code in this repository; file
paths are cited so the architecture can be independently verified in technical due
diligence.*

---

## The one-sentence version

Trinket is the first ADHD companion app that translates a **2025 peer-reviewed HCI result
— asynchronous body doubling** (Ara et al. 2025, *arXiv:2509.12153*) — into a shipping
product, and enforces its clinical-adjacent ethics, its EU privacy posture, and its
regulatory limits **as automated, fail-closed build gates rather than as policy
documents**. The innovation is not a single feature; it is that the product's hardest
promises are compiled into the architecture, where they cannot silently rot.

## Why that is a technical claim, not a marketing one

Most wellness apps make three kinds of promise — "we protect your data," "we won't shame
you," "we're not a medical device" — and back them with a PDF and good intentions. Those
promises decay the moment a new engineer ships a plausible feature. Trinket's equivalents
are **executable**: a build that violates them does not compile. That shift — from
promise-as-intention to promise-as-invariant — is the spine of the technical story, and it
runs through all seven pillars below.

The application is built on a modern, single-codebase cross-platform foundation (Expo SDK
57 / React Native 0.86, New Architecture, TypeScript strict), ships iOS + Android + Polish
+ English from first release, and is backed by **300+ automated tests across ~30 suites**
gating every change (`npm run verify`).

---

## 1 — Research-to-product: the asynchronous body-double engine

**The idea.** "Body doubling" — starting a hard task in the low-stakes presence of another
person — is one of the few widely-reported ADHD interventions with real traction. Its
constraint is human: it requires scheduling another person. Ara et al. (2025) showed the
effect survives when the "double" is **asynchronous** — a felt presence, not a live human.
Trinket is a direct implementation of that finding: an animated raccoon mascot is the
asynchronous body double, and *starting a task in its presence* is the entire product
thesis. The activation metric is literally "first completed Co-pilot session."

**The engineering.** Turning "a felt presence" into code that doesn't feel like a nagging
Clippy is the hard part. It is implemented as a small, deliberately-constrained state
machine (`src/components/Mascot/`):

- **Exactly five states** — `greeting · idle · presence · dozing · acknowledge`
  (`src/components/Mascot/types.ts`). There is no sixth state, and critically **no negative
  state can ever exist**: `src/components/Mascot/__tests__/noNegativeStates.test.ts` reads
  the type source and fails the build if `sad`, `disappointed`, `waiting`, `nagging`,
  `angry`, or `upset` ever appears. The product's "presence, never pressure" grammar is a
  compile-time invariant, not a design guideline.
- **A single persistent Lottie surface.** State changes swap the animation *source* on one
  long-lived view and cross-fade opacity — never a two-instance mount/unmount that would
  restart at frame 0 or flash (`src/components/Mascot/Mascot.tsx`). Assets are lazily
  `require()`-d per state on first use to hold the performance budget.
- **Life without a heartbeat animation library.** `lottie-react-native` exposes no
  marker-name playback API, so Trinket parses the Bodymovin `markers` array itself
  (`markers.ts`) and drives idle "micro-behaviors" — weighted blink / glance / posture-shift
  (`useIdleScheduler.ts`) — on a self-scheduling timer. This is what makes the raccoon read
  as *alive and calm* rather than looping. Reduced-motion accessibility slows the whole
  scheduler automatically.

**Why it's defensible.** The mascot module is feature-agnostic and swappable: final
commissioned art drops into identical Lottie slots with zero code change
(`design/LOTTIE-SPEC.md` is the animator contract). The novelty is not "an app with a
mascot" — it is a research-grounded presence system whose interaction grammar is
structurally prevented from becoming coercive.

---

## 2 — Constraint-as-code: product ethics and EU regulation enforced by the build

This is the pillar most worth a technical reviewer's attention, because it is unusual in
consumer apps. Trinket's four hardest non-negotiables are enforced by **fail-closed CI
gates** wired into `npm run verify`. Each gate refuses to pass an empty scan — it cannot be
neutered by accidentally pointing it at nothing.

| Gate | File | What it makes impossible |
|---|---|---|
| **Copy-tone / regulatory** | `scripts/check-copy-tone.mjs` | Scans every EN + PL user-facing string against a curated denylist: shame/depletion framing, streak/pressure mechanics, urgency/scarcity, **demand grammar** ("you must" / "musisz"), and forbidden medical claims ("treats/cures/diagnoses/reduces symptoms/clinically proven"). Bilingual, with linguistic nuance — negation lookbehinds keep the product's *own* promises legal ("no streaks", "bez serii") while banning the affirmative form. |
| **Network isolation** | `scripts/check-network-isolation.mjs` | Bans `fetch`/`XMLHttpRequest`/`WebSocket`/`axios` anywhere in first-party code and confines the only two networked SDKs (RevenueCat, PostHog) to named "seam" files. The local-first guarantee is proven by grep, not by trust. |
| **Schema denylist** | `data/repositories/__tests__/schema.denylist.test.ts` | Asserts no `streak` / `daily` / `completionRate` / `diagnosis` / `adhd`-shaped field can enter any of the four data schemas — via both a runtime probe *and* a source scan that catches even unpopulated optional fields. "If a stat can only be used for pressure, it does not exist in the schema" is a passing test. |
| **Design-token integrity** | `scripts/check-hex-literals.mjs` | No color literal may exist outside `theme/`, keeping the design system swappable in one file. |
| **Performance budget** | `scripts/check-mascot-asset-size.mjs` | Enforces the per-animation size ceiling so the mascot stays lightweight on low-end devices. |

**Why this matters to an investor.** These gates convert the founder's product principles
into an asset that survives team growth, contractor work, and time. A late-night PR that
adds a guilt notification or a streak counter — the exact patterns every competitor uses —
does not merge. That is a **moat expressed as engineering**: the discipline is in the repo,
not in one person's head.

---

## 3 — Privacy by construction (GDPR Article 9)

ADHD-related behavior is **special-category health data** under GDPR Art. 9. Trinket is
architected so that the sensitive data largely never leaves the device, and so that leaking
it is *structurally* difficult rather than merely against policy.

- **Local-first storage.** All user content — task labels, brain-dump text, sessions,
  intentions — lives on-device in MMKV (`data/mmkv.ts`, the JSI/Nitro-backed engine). The
  network-isolation gate (Pillar 2) proves nothing in the core loop can phone home.
- **Analytics where content-leakage is unrepresentable.** The event schema
  (`src/analytics/events.ts`) is the privacy contract *in the type system*: every event
  property is a number, a boolean, or a **closed enum literal** — free-form strings are not
  a representable type, so user text physically cannot ride along on an analytics event. A
  runtime `SAFE_STRING_TOKENS` allowlist backs this as defense-in-depth. You cannot
  accidentally log a task title; the compiler rejects it.
- **EU residency, pinned at construction.** PostHog is hard-wired to `eu.i.posthog.com`
  with **autocapture off and session-replay off** (`src/analytics/posthog.ts`) — the two
  features that would implicitly capture screen content are disabled where the client is
  built, not left to configuration drift.
- **The app never asks for a diagnosis** and no schema field can store one (enforced by the
  denylist gate). This is deliberate positioning as a **wellness app, not a medical
  device** — reinforced by the regulatory copy gate.

This is "data protection by design and by default" (GDPR Art. 25) in the literal sense: the
protection is a property of the code's shape.

---

## 4 — On-device AI inside a principled AI boundary

In a market where "AI" usually means "we send your most vulnerable moments to a third-party
LLM," Trinket's stance is a differentiator and an ethical position, and it is enforced:

- **AI is used only for input processing, never to generate advice.** No LLM is called in
  the core loop. The mascot never "says" anything therapeutic; there is no generated
  coaching or encouragement text. This is a product thesis, not a cost decision.
- **On-device speech-to-text.** Voice capture for Brain Dump runs through
  `expo-speech-recognition` with `requiresOnDeviceRecognition: true`
  (`src/features/brain-dump/useVoiceCapture.ts`). Speech is transcribed on the device;
  audio is not shipped to a cloud recognizer. The hook is also a study in production
  robustness — contextual (not upfront) mic permission, graceful degradation to the text
  field on any failure, and an explicit fix for a **hot-mic-on-unmount privacy leak** caught
  in device UAT.
- **Categorization with zero model download and zero inference cost.** Brain-dump items are
  sorted into five fixed categories by a deterministic, offline, hand-tuned **PL + EN
  keyword classifier** (`src/features/brain-dump/classify.ts`) — with correct tie-breaking
  (genuine ties resolve to `someday`, never to whichever category was checked first). For a
  feature explicitly scoped as *one-tap-correctable suggestions*, this is the right-sized
  tool: trivially debuggable, instant, works on a plane, and adds no ML supply chain. The
  architecture leaves a clean escalation path (on-device embeddings) if quality ever demands
  it — the category field doesn't care which system produced it.

The headline for a technical audience: **"no LLM touches your content" is a verifiable
architectural claim here**, not a privacy-policy sentence.

---

## 5 — Correctness engineering where it actually counts

The activation event is a focus session. A session that silently loses time — or worse,
greets the returning user with "you abandoned your session" — would break both the core
value and the shame-free promise. Trinket treats session survival as a correctness problem,
not a UI nicety:

- **Time is derived from timestamps, never from an in-memory counter**
  (`src/features/co-pilot/useElapsedSession.ts`). Elapsed time is `Date.now() - startedAt`,
  recomputed per tick, so it stays correct across backgrounding and OS suspension (where JS
  timers are throttled or killed). The display tick pauses when backgrounded and resyncs
  instantly on return.
- **A liveness heartbeat plus silent cold-launch reconciliation.** A single `lastAliveAt`
  pointer is updated on a heartbeat; on next launch, `reconcileActiveSession.ts` decides —
  as a pure, unit-tested function — whether to show a warm "resume" card or to *silently*
  close a session the OS force-quit, **with no mention of the interruption**. Shame-free
  design extends even into crash recovery.
- **Defensive against the real world:** backward clock-skew is clamped to zero (never a
  negative timer), and the screen is held awake during an active session and released at
  dozing to spare the battery (`expo-keep-awake`, tag-scoped).

These are the unglamorous correctness details that separate a demo from a product, and they
are covered by tests.

---

## 6 — A modern cross-platform foundation, hardened for production

- **One codebase, two platforms, two languages, from day one.** Expo SDK 57 / React Native
  0.86 on the **New Architecture** (Fabric + TurboModules), React 19.2, TypeScript 6 strict,
  React Compiler enabled. Native code is generated via Continuous Native Generation (CNG) —
  no hand-maintained `ios/`/`android/` folders to drift — and built with EAS.
- **Internationalization with real linguistic depth.** i18next drives PL + EN from the
  first screen, with **CLDR-correct Polish pluralization (four plural forms)** — and both
  languages pass the shame-free copy gate, so the warm, non-coercive register holds in
  translation, not just in English.
- **Native surfaces with crash containment.** iOS home-screen widgets and **Live Activities**
  (via official `expo-widgets`) and Android widgets are implemented so the session timer
  ticks on the Lock Screen with *zero* update calls. Crucially, the native-module boundary
  is wrapped in a lazy, guarded, memoized loader with a kill switch
  (`src/features/surfaces/widgetsRuntime.ts`): a misconfigured or broken surface **loses the
  surface, never crashes the app**. This is the kind of production maturity that shows up
  only after real device testing.

---

## 7 — Shame-free economics: a business model that can't betray the user

The revenue model is designed to be *incapable* of contradicting the product's ethics:

- **Freemium computed from timestamps, not counters.** The free tier (3 sessions/week,
  Monday-anchored) is derived at check time from existing session timestamps
  (`src/features/subscription/entitlements.ts`) — **zero stored counters**, so the
  no-aggregates schema constraint stays intact and there is no "sessions remaining" number
  to weaponize into pressure.
- **Gated affordances stay tappable.** A user at their limit sees a live button that opens
  the paywall as an *offer*, never a greyed-out disabled control — a deliberate, shame-free
  departure from the industry-standard pattern.
- **Billing lives with the store.** RevenueCat entitlements are checked cache-first and work
  offline; the sensitive core loop never depends on a network round-trip to function.

**The strategic point** (validated by the MacroFactor precedent the team cites): shame-free
design produces cleaner behavioral data and a retention mechanic — *warm re-entry after an
inevitable absence* — that guilt-based competitors **cannot copy without gutting the streak
mechanics their engagement depends on**. The economics and the ethics reinforce each other
rather than fighting.

---

## Why the whole is more defensible than the parts

Any one of these could be replicated by a well-funded competitor. What is hard to copy is
the **combination held together by enforcement**: a research-grounded presence model, whose
ethical and regulatory constraints are compiled into fail-closed gates, over a
privacy-by-construction data architecture, with AI deliberately kept at the input boundary,
funded by economics that structurally cannot betray the user.

A competitor pivoting an existing streak-and-notification productivity app toward this
posture would have to **remove** the mechanics driving their current engagement numbers and
**re-architect** around invariants they have no incentive to adopt. Trinket's constraints
are not a tax it pays — they are the moat, and they are already in the repository.

---

## Build maturity — an honest status (as of 2026-07-13)

Credibility in due diligence comes from precision about what is done versus in flight.

| Area | Status |
|---|---|
| Core loop: Co-pilot session, Brain Dump (+ on-device voice), Starter, Soft Landing, Bridge | **Shipped, code-verified** (all 5 of 5 designed mechanics exist) |
| Mascot state machine + placeholder raccoon art | **Shipped**; final commissioned Lottie art drops into identical slots |
| Local-first data layer, privacy analytics allowlist, all five CI gates | **Shipped, enforced in `npm run verify`** (300+ tests green) |
| Cross-platform foundation, i18n (PL/EN), native widgets + Live Activities | **Shipped**; iOS device build gated on EAS/Mac access |
| Freemium gate + reference-pricing paywall + entitlements | **Shipped, tested** |
| RevenueCat live purchases | Verified against RevenueCat **Test Store**; real Play/App Store product config + production keys pending |
| PostHog EU analytics | **Wired in code** (EU-pinned, autocapture/replay off); live dashboard pending a production key |
| On-device Polish STT + notification-delivery timing on real hardware | Verified via test mocks; **physical-device confirmation pending** |

Timeline context: closed beta cohorts (PL via ATTENTIO + US) targeted for incubation months
3–4; public release target Q4 2026. Validation targets: activation > 40% (first completed
session within 48h), D7 retention > 25%, D30 > 12%.

---

## Appendix — where to verify each claim

| Claim | Primary source in repo |
|---|---|
| Async body double, 5-state presence machine, no negative states | `src/components/Mascot/` (`types.ts`, `Mascot.tsx`, `markers.ts`, `useIdleScheduler.ts`, `__tests__/noNegativeStates.test.ts`) |
| Compliance-as-code gates | `scripts/check-copy-tone.mjs`, `scripts/check-network-isolation.mjs`, `scripts/check-hex-literals.mjs`, `scripts/check-mascot-asset-size.mjs`, `data/repositories/__tests__/schema.denylist.test.ts`; wired in `package.json` → `verify` |
| Privacy by construction | `data/mmkv.ts`, `src/analytics/events.ts`, `src/analytics/posthog.ts`, `data/types.ts` |
| On-device AI / AI boundary | `src/features/brain-dump/useVoiceCapture.ts`, `src/features/brain-dump/classify.ts`, `src/features/brain-dump/keywords.ts` |
| Session-survival correctness | `src/features/co-pilot/useElapsedSession.ts`, `src/features/co-pilot/reconcileActiveSession.ts` |
| Cross-platform foundation, native surfaces | `app.json`, `package.json`, `widgets/`, `src/features/surfaces/widgetsRuntime.ts` |
| Shame-free economics | `src/features/subscription/entitlements.ts`, `data/types.ts` |
| Product thesis, constraints, research base | `.planning/PROJECT.md`, `.planning/research/ARCHITECTURE.md` |

*The scientific basis for the core mechanic is Ara et al. (2025), "asynchronous body
doubling," arXiv:2509.12153, cited as the product's implementation reference in
`.planning/PROJECT.md`.*
