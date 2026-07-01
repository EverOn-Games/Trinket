# Pitfalls Research

**Domain:** ADHD companion / async-body-double focus app — React Native + Expo, local-first, freemium subscriptions, PL+US launch
**Researched:** 2026-07-01
**Confidence:** MEDIUM-HIGH (Context7 not available for these queries; findings cross-verified across 2+ independent sources per pitfall, RevenueCat/Apple/Expo official docs used where possible)

## Critical Pitfalls

### Pitfall 1: Session state loss on backgrounding, force-quit, or OS process death

**What goes wrong:**
The Co-pilot session (the activation event — the entire product thesis rests on it) loses its start time, elapsed duration, or existence entirely when the app is backgrounded for a while, force-quit by the user, or killed by the OS under memory pressure. User returns expecting the mascot "still there," gets a blank home screen or a session that silently vanished. For a body-doubling product, this is not a bug like any other — it directly breaks the core loop's promise ("the raccoon is there with me... regardless of duration").

**Why it happens:**
- React Native JS timers (`setInterval`/`setTimeout`) are paused when the app backgrounds and do not resume reliably; on iOS, apps get roughly 30 seconds of background execution by default before being suspended, and suspended apps can be killed outright by the OS at any time afterward with zero warning to JS code.
- Developers keep session state (start time, elapsed counter, mascot state) only in JS memory/React state instead of durable storage, assuming `AppState` listeners will always fire cleanly to persist on transition — they don't fire on hard force-quit or OS kill.
- Elapsed time is naively computed by counting ticks instead of deriving from a persisted absolute timestamp, so any missed tick (background, kill, resume) desyncs the displayed duration from wall-clock reality.

**How to avoid:**
- Persist session state (session id, `started_at` absolute timestamp, task label, source) to MMKV **the instant** a session starts — not on background transition, not debounced. Treat "session exists in storage" as the source of truth, not "session exists in memory."
- Compute elapsed time as `now - started_at` on every render/resume, never as an incrementing counter. This makes background/kill/resume irrelevant to correctness — the UI just re-derives the right number when it next paints.
- On app launch, always check MMKV for an open (no `ended_at`) session before rendering the home screen. If found, resume presence UI directly — per the PROJECT.md edge case, do this silently, with no "we noticed you were interrupted" messaging (that would itself be a shame-adjacent pattern).
- Do not rely on `AppState` background timers to run *logic* (e.g., "auto-doze after 30 min") while backgrounded — recompute state transitions (idle → dozing) from elapsed time when the app resumes to foreground, not via a timer that's expected to fire while suspended.
- Force-quit and low-memory-kill are the primary test cases, not the edge case: build a manual test checklist (start session → force quit → reopen; start session → background 10 min on real low-end Android → reopen) and run it every time session logic changes, not just once.

**Warning signs:**
- Session/elapsed-time state lives only in `useState`/`useReducer` with no MMKV write on session start.
- Elapsed time computed via `setInterval` incrementing a counter rather than `Date.now() - started_at`.
- No manual force-quit test in the QA routine for the Co-pilot phase.
- `AppState` listener treated as the only persistence trigger.

**Phase to address:**
Phase 3 (Co-pilot end-to-end) for the core mechanism; verified explicitly in Phase 9 (beta hardening — "offline correctness, state persistence, crash-free sessions" is already named in the build order, confirming this is a known-critical area).

---

### Pitfall 2: Expo managed workflow hits a native-module wall mid-project (MMKV, on-device STT wrappers)

**What goes wrong:**
Teams start in classic "Expo Go" managed workflow, build for weeks, then discover a required native module (`react-native-mmkv` is the explicit named dependency in this project's stack) is not supported in Expo Go at all — it requires a custom native binary. The team then scrambles to migrate infrastructure mid-project, sometimes conflated with "ejecting," causing schedule risk right when other native pieces (STT, RevenueCat) are also landing.

**Why it happens:**
- "Managed workflow" is often misread as "no native code, ever," when Expo's actual model since SDK 50+ is Continuous Native Generation (CNG): native `ios/`/`android/` directories are generated from `app.json`/config plugins via `expo prebuild`, and a custom dev client (`expo-dev-client`, built with EAS Build) replaces Expo Go for any native module. This is still "managed" in Expo's own terminology — it is not ejecting (ejecting means giving up CNG and hand-managing native folders permanently) — but teams that only ever used Expo Go don't know the distinction and treat discovering it as an emergency.
- MMKV specifically throws a hard runtime error in Expo Go ("react-native-mmkv is not supported in Expo Go! Use EAS") — it cannot be worked around, only migrated past.
- RevenueCat is more forgiving (it publishes an Expo-compatible path), so teams sometimes verify "our stack works with Expo" using RevenueCat alone and don't hit the wall until MMKV or STT integration lands later, deep into feature work.

**How to avoid:**
- Do not attempt this project in Expo Go at all. Since MMKV is a fixed, non-negotiable stack choice (per PROJECT.md), set up EAS Build + `expo-dev-client` + `expo prebuild` (CNG) as the baseline dev workflow starting in Phase 1 (project scaffold), before any feature code. This turns "will we hit the wall" into a non-question.
- Keep `ios/`/`android/` out of version control (CNG-generated, regenerated via `expo prebuild --clean`) and drive all native config through `app.json`/config plugins, so upgrading Expo SDK versions doesn't require manually reconciling hand-edited native folders.
- Audit every "well-maintained community" native module against Expo's config-plugin/New Architecture compatibility *before* adding it to the stack (MMKV, the chosen STT wrapper, Lottie, RevenueCat) — do this in Phase 1, not when the feature is due.
- Never hand-edit generated native directories directly; if custom native code is unavoidable, write a config plugin so `prebuild --clean` doesn't silently discard the change.

**Warning signs:**
- Dev workflow still uses the plain Expo Go app from the App/Play Store rather than a custom dev client.
- `ios/` or `android/` directories are absent from `.gitignore` inconsistently (sign nobody has decided CNG vs. bare).
- A native module is added to `package.json` without first checking its Expo Go / config-plugin compatibility.

**Phase to address:**
Phase 1 (project scaffold) — set up EAS + dev client + prebuild before any feature work. Re-verify at Phase 2 (mascot/Lottie) and whenever the STT module (Phase 4, Brain dump) is selected.

---

### Pitfall 3: Lottie memory leaks and frame-rate collapse on low-end Android

**What goes wrong:**
The mascot — present through nearly the entire app (idle, presence, dozing, acknowledge loops) — causes visible stutter (reports as low as 5-6 FPS on some Android devices vs. smooth iOS) or a steadily climbing memory footprint that eventually crashes the app, specifically on low/mid-range Android hardware, which is a meaningfully large share of the Polish and general Android market. Because the mascot is *always on screen*, this isn't a peripheral animation bug — it's a permanent tax on every screen in the app.

**Why it happens:**
- `lottie-react-native`'s default Android rendering path is measurably more CPU/memory expensive than alternatives (community benchmarks show ~76% higher CPU and ~41% higher memory vs. RLottie-based rendering at comparable visual output).
- Components that mount/unmount the Lottie view repeatedly (e.g., re-rendering the mascot on every state-machine transition instead of keeping one persistent view and swapping the source) leak memory on unmount — documented as a known issue where Android doesn't reliably release the animation's memory when the component unmounts.
- Bundling Lottie JSON files directly in the JS bundle (rather than as platform assets) slows app start and increases baseline memory before any animation even plays.
- Complex vector-heavy Lottie exports (gradients, mattes, many shape layers) from design tools are not optimized for mobile playback by default — the design source (external Claude Design assets, later real commissioned art) can bloat well past the intended budget if delivered without a mobile-performance pass.

**How to avoid:**
- Hold "each loop under 300 KB" (already a stated constraint in PROJECT.md) as a hard gate at asset delivery, not just a target — validate every placeholder and every final mascot asset against this before merging.
- Architect the mascot as a single persistent `LottieView` per screen that swaps its animation source/segment on state transitions, rather than mounting/unmounting Lottie components as the state machine changes states — this avoids the Android unmount memory-leak pattern entirely.
- Load Lottie JSON as lazy platform assets (not bundled in the JS bundle) per the existing constraint ("Lottie loops loaded lazily").
- Establish an early performance baseline on an actual low/mid-range Android device (not a flagship, not only a simulator) during Phase 2 (mascot module), and re-test at Phase 9 hardening. Simulators and iOS testing alone will hide this class of bug completely.
- If frame-rate issues persist after asset optimization, evaluate an RLottie-backed renderer as a fallback before accepting degraded Android UX — but treat this as a contingency, not a Phase 2 default, since it adds a native dependency.

**Warning signs:**
- Mascot state transitions remount the Lottie component (new `key` prop, conditional render swap) instead of reusing one instance.
- No physical low-end Android device in the test matrix — only simulators/emulators or flagship devices.
- Asset file sizes not checked against the 300 KB budget before merge.
- Memory profiler not run across a long session (30+ min, to include the dozing loop) during QA.

**Phase to address:**
Phase 2 (mascot module) for architecture; verified continuously through Phase 3 (Co-pilot, where the mascot runs longest) and explicitly retested in Phase 9 (beta hardening).

---

### Pitfall 4: RevenueCat/StoreKit sandbox testing gives false confidence; offline entitlement gaps break the freemium gate

**What goes wrong:**
The team tests the paywall and freemium gate exclusively in sandbox/TestFlight, ships, and then discovers in production that: prices/metadata shown in sandbox don't match real store data (sandbox is explicitly unstable for this), grace-period and billing-retry states were never actually exercised, or — more critically for this app's design — the "3 sessions/week, refreshes Monday" gate either fails open (grants access it shouldn't) or fails closed (denies a legitimate paying user their unlimited sessions) when the device is offline, because entitlement state wasn't fetched and cached before the user went offline.

**Why it happens:**
- RevenueCat's offline entitlements feature requires the app to have successfully launched at least once with RevenueCat's servers reachable so it can cache entitlement data locally; a user who purchases and then immediately goes offline (or a fresh install that never got a first online launch) has no valid offline entitlement cache to check against.
- One-time/consumable purchases are explicitly *not* supported in offline mode by RevenueCat (only subscription entitlements verified via StoreKit 2 are) — if the freemium model ever adds any one-time unlock, this class of purchase silently cannot be verified offline at all.
- Sandbox transactions can take 30-60 seconds to register, leading developers to "fix" a false bug by retrying rapidly, masking real timing issues that would surface in production.
- Grace periods and billing-retry states (the exact moment a subscriber's card fails and they're in a retry window) cannot be tested in platform sandboxes at all — only via StoreKit Configuration files (Xcode) or RevenueCat's Test Store — so teams that only used sandbox ship with an untested "is this user actually still entitled" edge case that determines gate behavior for real lapsed subscribers.

**How to avoid:**
- Given the product's local-first, offline-first constraint ("fully functional offline except purchase/restore"), explicitly design the free-session-count check to work from the **locally cached** entitlement state, and define — before building the gate — what happens when that cache is stale or absent (default to the free tier's 3-session limit, never to unlimited, to avoid revenue leakage; but never show punitive/shame copy for this, per the shame-free constraint — a neutral "reconnect to verify premium" state, not a "your subscription failed" alarm).
- Test using StoreKit Configuration files in Xcode (for grace period/billing-retry simulation) and RevenueCat's Test Store (for fast, non-flaky purchase-flow iteration) in addition to, not instead of, real sandbox and TestFlight passes.
- Explicitly test the "purchase while online, immediately go offline, restart app" sequence and the "fresh install, no network on first launch, attempt purchase" sequence — these are the two scenarios most likely to be missed and most likely to break the gate.
- Because gate copy must stay shame-free ("sessions refresh Monday," never "you've run out"), write the offline/entitlement-unknown state's copy at design time alongside the gate's happy-path copy, not as an afterthought bug fix — an ambiguous entitlement state is exactly the kind of edge case where engineers reach for alarming default copy under time pressure.

**Warning signs:**
- No test plan step for "purchase, then force offline, then reopen app."
- Grace period / billing retry behavior has never been exercised outside of reading RevenueCat's docs.
- Gate-denial copy differs between the "confirmed free tier, 0 sessions left" case and the "can't verify entitlement, assuming free tier" case — if these produce different (harsher) copy, that's a shame-free violation waiting to surface in exactly the confusing moment a real user is offline.

**Phase to address:**
Phase 7 (subscription infra + freemium gate) for implementation; Phase 9 (beta hardening) for the offline/edge-case test pass.

---

### Pitfall 5: i18n retrofitted late, or Polish plural/grammatical-case rules handled with a simplistic singular/plural library

**What goes wrong:**
Two related failure modes: (1) teams build screens with hardcoded English strings intending to "add i18n later," which turns into an expensive full-codebase hunt for string literals once dozens of screens exist; (2) even with i18n wired up from day one, a naive `count === 1 ? singular : plural` pattern breaks Polish, which has multiple plural forms (1, 2-4, 5+, and different forms again for certain constructions) — producing grammatically broken copy in exactly the "warm, plain Polish register" the product depends on for its PL market credibility.

**Why it happens:**
- Retrofitting i18n after the fact requires walking every component to find and wrap string literals — genuinely tedious and error-prone even with codemod tooling, and some strings (dynamic content, alerts, native module callback text) get missed even after automated passes.
- English-first development habits (write the copy inline, translate later) are the path of least resistance under deadline pressure, and nothing enforces the discipline of `t('key')` calls unless it's a lint rule from day one.
- Most JS i18n setups default to a two-form plural model (English-style) unless the library and its config explicitly use ICU MessageFormat / CLDR plural rules, which Polish requires for anything with a count (session counts, "X sessions remaining," "Y minutes").

**How to avoid:**
- Set up the i18n skeleton in Phase 1 (already planned per build order) with a linter rule (e.g., an ESLint rule flagging raw string literals in JSX) that fails CI on hardcoded UI copy from the very first screen — enforce, don't just provide the tooling.
- Choose an i18n library with native ICU MessageFormat/CLDR plural support (e.g., i18next with the ICU plugin, or FormatJS) rather than a minimal key-value library, specifically because Polish plural rules are non-trivial (this matters most for "sessions refresh Monday" / "X sessions left" copy — precisely the freemium gate language that must also stay shame-free).
- Write and test the Polish plural forms explicitly during copy review, not just during a translator handoff — a native Polish speaker should review actual rendered plural strings (0, 1, 2, 5, 22 sessions) before beta, not just the English source.
- Treat "no hardcoded copy" (already a stated hard constraint) as a Phase 1 CI gate, not a beta-hardening cleanup task.

**Warning signs:**
- Any PR merges a new screen with a raw string in JSX rather than a translation key.
- i18n library config uses simple boolean/count branching instead of CLDR plural categories.
- Polish strings only reviewed by machine translation or a non-native speaker before beta.

**Phase to address:**
Phase 1 (i18n skeleton + CI lint rule) for prevention; every subsequent feature phase (3-8) for compliance; Phase 6 (onboarding) and Phase 7 (gate copy) are highest-risk since they carry the most shame-adjacent language.

---

### Pitfall 6: On-device STT reliability and Polish locale support diverge sharply between iOS and Android

**What goes wrong:**
Brain dump's voice capture works well in testing (usually done on a recent iPhone) but degrades badly on real Android hardware or for Polish specifically: on-device speech recognition may not be available for Polish on a given OS version, may require a model download that hasn't happened yet (silent failure or long delay on first use), or may behave inconsistently across Android manufacturers' SpeechRecognizer implementations (Samsung and others customize behavior). The result is a core input path (voice capture, explicitly called out as AI's only sanctioned surface in this product) that quietly underperforms for exactly the audience — busy, avoidant, benefiting from low-friction capture — who most needs it to just work.

**Why it happens:**
- iOS's on-device Speech framework recognition supports a limited language set (roughly 10 languages on-device as of recent research) and may fall back to network-based recognition for less common combinations or when the on-device model hasn't finished downloading — a state invisible to the developer unless explicitly checked.
- Android's `SpeechRecognizer` is a system service backed by whatever the device manufacturer/Google app provides; availability, language support, and behavior are not guaranteed uniform across the Android device population the way `expect` is with a single-vendor API.
- Teams verify STT on one or two development devices (typically newer, Google-services-complete Android phones and current iPhones) and never test the actual low/mid-range, possibly Google-Play-Services-limited Android devices that make up a large share of real users, especially in the Polish market.
- RECORD_AUDIO permission handling (denial, "don't ask again," revocation via OS settings after initial grant) is often only handled for the happy path, leaving Brain dump silently broken for the not-uncommon case of a user who denied the permission or revoked it later.

**How to avoid:**
- Explicitly check on-device Polish language/model availability at runtime (both platforms expose availability queries) before offering voice capture as an option, and design a graceful text-first fallback (the free-text field already exists per spec) rather than a hard error when voice isn't available.
- Test STT specifically on: an older/lower-tier Android device, a device without full Google Play Services parity if the PL beta cohort might include such devices, and with the device's OS language set to Polish (not just the app locale) since STT often keys off device/system locale rather than app locale.
- Handle the on-device-model-not-yet-downloaded state explicitly (show a "getting ready" state or fall back to text) rather than presenting the mic button as available and having it silently fail or hang.
- Build explicit permission-denied and permission-revoked-later states for Brain dump's voice button (route to text input, with a non-alarming, non-repetitive nudge toward Settings) — since PDA-aware, shame-free constraints apply here too, this must not read as a demand or a failure message.
- Prefer the platform-native STT APIs as specified (not a cloud LLM) but budget explicit spike time in Phase 4 to validate real-device Polish recognition quality before committing further UI/UX around voice as a primary capture method.

**Warning signs:**
- STT tested only on the primary developer's personal device.
- No runtime check for on-device language availability before showing the mic button.
- No handling for RECORD_AUDIO permission denial beyond a generic system alert.
- Device locale (not just in-app language setting) never varied during QA.

**Phase to address:**
Phase 4 (Brain dump — capture first) for the spike and fallback design; Phase 9 for cross-device hardening.

---

### Pitfall 7: Analytics event payloads leak content or use IDs that aren't actually pseudonymous under GDPR Article 9

**What goes wrong:**
An engineer under deadline pressure adds a debugging-convenience field to an analytics event — the brain-dump item's text, the task label typed into a quick Co-pilot session, or the mood-check value tied to a session timestamp — thinking of it as harmless product-analytics enrichment. Because ADHD status is health-adjacent and the product's entire audience is self-selected as needing ADHD support, session/mood/task-content data that can be tied back to a user is functionally sensitive personal data under GDPR Article 9, even if the user ID itself is a random UUID. Separately, teams sometimes believe "we use a pseudonymous ID" fully discharges GDPR obligations — it does not remove Article 9 obligations if the underlying data category is still sensitive and re-identifiable.

**Why it happens:**
- Analytics SDKs (PostHog and similar) make it trivial to attach arbitrary properties to any event call, so "just add this field, it'll help debug the funnel" is a one-line change with no natural friction stopping it.
- Pseudonymization is often conflated with anonymization; replacing a name with a random ID reduces *some* risk but does not, by itself, change the legal data category of what's attached to that ID — a pseudonymous ID plus "user completed 3 sessions about their ADHD medication task" is still sensitive, re-identifiable data tied to a person.
- Funnel-instrumentation work under time pressure (explicitly required "before beta, not after" per PROJECT.md) increases the chance that content fields get bundled into events for expedience, then never get audited before the instrumentation ships.

**How to avoid:**
- Write an explicit allowlist of permitted event properties (event name, coarse category like "brain_dump_created" or "session_started", duration bucket, source enum, locale, subscription tier) as a schema/type, and make it structurally hard to attach free-text or content fields to events — e.g., a typed analytics wrapper function that only accepts the allowlisted shape, not a generic `track(event, anyProps)` passthrough.
- Treat this allowlist as a Phase 8 (analytics events) design artifact reviewed before any event is wired up, not a retroactive audit.
- Confirm the pseudonymous ID scheme cannot be trivially correlated back to identity via the Supabase account layer in a way that reunites "anonymous" analytics with "identified" account data unless that specific linkage is a deliberate, minimized design decision (e.g., for subscription-state sync only).
- Since the app already commits to "no content payloads" as a hard constraint, add an automated check (unit test or lint rule scanning analytics call sites) that fails if a call passes a value from a known content-bearing variable (task text, dump text, mood free-text if ever added) — a policy stated in a document is not enforcement; codify it.
- Do not let mood-check values, task labels, or brain-dump categories become analytics properties even in aggregate-seeming form (e.g., don't log "task label length" or "mood value" as a property) without confirming they can't function as a fingerprint or sensitive-inference vector.

**Warning signs:**
- Any analytics `track()` call passes a variable that also flows into MMKV content storage.
- No automated test or lint guarding the analytics event schema.
- Event property list not reviewed against Article 9 categories before Phase 8 ships.

**Phase to address:**
Phase 8 (analytics events + settings + notification opt-in) — design the schema before instrumenting; enforce via automated check, not manual review alone.

---

### Pitfall 8: App Store / Play Store review risk from implied medical claims or non-compliant subscription disclosure

**What goes wrong:**
Despite the explicit "wellness app, not medical device" positioning and the documented forbidden-words list, review risk creeps in through channels the core team doesn't directly author: App Store/Play Store *listing* copy (written by marketing, not engineering), screenshot captions, App Store category selection, or ASO keyword choices that imply diagnosis/treatment. Separately, subscription flows that don't meet platform-specific disclosure rules (clear price/term disclosure before purchase, in-app cancellation reachable within very few taps, confirmation before charging) risk outright rejection or forced resubmission cycles that cost calendar time right before a launch window.

**Why it happens:**
- The forbidden-copy list (treats/cures/diagnoses/reduces symptoms/clinically proven) is usually enforced in in-app UI copy review, but store listings, screenshots, and app category metadata are often produced in a separate workflow (marketing/ASO) that doesn't go through the same review gate.
- "Designed for neurodivergent minds" and "based on validated behavioral techniques" are approved phrasings per the constraints doc, but the line to "proven to help ADHD" or a category selection like Medical (vs. Health & Fitness / Lifestyle) can be crossed by someone optimizing for discoverability without realizing the regulatory implication.
- Both platforms require specific subscription-disclosure UX (clear terms, easy cancellation, confirmation) independent of general App Review Guidelines, and freemium apps with weekly-priced tiers (this product's PLN 9.99/week and USD 5.99/week tiers) draw extra scrutiny because weekly subscriptions are a known area of past platform abuse crackdowns.
- Google Play increasingly requires explicit "Health apps declaration" disclosures for apps that could be construed as health-related, even ones not claiming diagnosis/treatment — missing this declaration on an app that's ADHD-adjacent is a plausible rejection vector even for a compliant app.

**How to avoid:**
- Extend the forbidden-copy review (already established for in-app UI) explicitly to store listing text, screenshots/screenshot captions, app category selection, and ASO keywords — put this on the same review checklist, owned by the same person who owns the in-app copy constraint, before each submission.
- Select App Store/Play Store categories deliberately (Health & Fitness/Lifestyle framing, not Medical), and complete Google Play's Health apps declaration form accurately and conservatively regardless of whether it's clearly required, since Play's health-app policy scope has been expanding.
- Build the subscription UX (cancellation path, price/term disclosure, purchase confirmation) to the stricter of the two platforms' requirements from the start (Phase 7) rather than discovering platform-specific gaps during review — confirm cancellation is reachable within 1-2 taps and terms are shown before the purchase sheet, not just inside settings.
- Given weekly pricing tiers exist in this model, budget schedule slack for at least one review rejection/resubmission cycle around subscription review specifically — this is common even for fully compliant apps with weekly tiers, and should not be treated as a surprise that threatens the Q4 2026 launch date.
- Have counsel or a compliance-aware reviewer sign off on the actual submitted store listing copy, not just the in-app copy, before each submission — this is explicitly called out as needed even for the *approved* phrasings in the source doc ("even then reviewed by counsel first").

**Warning signs:**
- Store listing copy drafted by marketing without being run against the same forbidden-words list as in-app UI.
- App category set to anything in a "Medical" classification.
- No dedicated pre-submission checklist item for subscription disclosure UX (cancellation tap count, price/term visibility).
- Play Health apps declaration not filled out because "we're not a health app."

**Phase to address:**
Phase 7 (subscription infra) for disclosure UX; ongoing through Phase 9/launch prep for store listing and category review — treat as a pre-submission checklist, not a one-time Phase 7 task.

---

### Pitfall 9: Shame/streak/pressure mechanics re-enter through "standard" library defaults, templates, or copy patterns

**What goes wrong:**
The product's hardest constraint (no streaks, no punitive mechanics, no guilt notifications, no negative mascot states) gets violated not through a deliberate feature decision but through defaults baked into third-party tooling or copy patterns borrowed from generic mobile UX playbooks: a notification library's example templates default to "You haven't opened the app in 3 days!" re-engagement copy; a celebration/confetti Lottie pack pairs "success" states with implicit frequency ("5 sessions this week!" counters); an analytics dashboard template (PostHog or similar) ships with a default "streak"/retention-heatmap widget that someone repurposes as an in-app feature; a paywall template from RevenueCat's example gallery uses urgency/loss-framing copy ("Don't lose your progress!") that's standard SaaS practice but is exactly the forbidden pattern here.

**Why it happens:**
- Nearly all growth/engagement tooling in the broader mobile ecosystem is built assuming streaks, urgency, and loss-aversion are desirable — because for most products they are. This app is a deliberate inversion of that norm, so every "best practice" default from a notification SDK, paywall template, or growth-analytics tool is a landmine unless explicitly re-authored.
- Copy borrowed from competitor research, onboarding-flow inspiration, or AI-assisted copywriting (ironically, given the AI boundary is about in-product AI, not development-time tooling) tends to default to standard engagement patterns unless someone explicitly checks each string against the shame-free/PDA-aware constraints.
- These violations are easy to miss because they don't look like "streak features" in the obvious sense — a retention percentage shown to the *team* internally is fine, but if a library's default component renders something structurally similar in-app (a calendar heatmap, a "current streak: 4" badge inside a settings screen "for fun"), it can ship without anyone flagging it as the forbidden pattern it structurally is.
- Forest and similar competitor apps normalize exactly this pattern (dying tree = punitive mechanic) as "engaging gamification," so any competitive-inspiration pass during design risks importing patterns this product has specifically positioned itself against ("Forest's dying-tree mechanic is the exact pattern to invert" — already identified in PROJECT.md).

**How to avoid:**
- Maintain a living checklist of specifically forbidden UI/copy patterns (streak counters/badges, "X day chain," loss-framed paywall copy, "we missed you" re-engagement notification copy, any negative/sad/disappointed mascot rendering, calendar heatmaps, frequency-tied celebration triggers) and run every new screen, every third-party template, and every notification/paywall copy string against it before merge — not just at design review, but as an explicit PR checklist item.
- When adopting any third-party template (RevenueCat paywall templates, notification SDK example copy, analytics dashboard components), treat the vendor's default copy/UX as a starting point to be rewritten, never as ship-ready — audit specifically for urgency, loss-framing, streak/frequency counters, and negative-state visuals.
- Keep the mascot's animation asset library structurally incapable of expressing negative states (already a stated design decision: "no negative states exist in the asset set") — this is the strongest possible prevention because it makes the violation impossible to implement accidentally, not just discouraged. Apply the same logic elsewhere where feasible: don't build a streak *field* in the data model at all (already a stated constraint), so no future feature can compute one even by accident.
- Route all notification copy (Starter's optional single notification, any future re-engagement idea) through the same forbidden-copy review as in-app UI and store listings — treat notification copy as first-class regulated/constrained copy, not an operational afterthought exempt from design review.

**Warning signs:**
- A new library/SDK is integrated and its example/template copy ships unmodified.
- A "for fun" internal stat (streak, day count, frequency badge) shows up in a settings or history screen without a design-constraint review.
- Data model gains any field that could only be used for frequency/streak pressure (per PROJECT.md, this is already a bright-line rule — "if a stat can only be used for pressure, it does not exist in the schema").

**Phase to address:**
Ongoing across all phases (2 through 8), but especially acute at Phase 6 (onboarding copy), Phase 7 (paywall/gate copy and any third-party paywall templates), and Phase 8 (notification copy) — recommend a named "shame-free/PDA-aware copy review" gate on every PR touching user-facing copy or third-party UI templates, not a one-time audit.

---

### Pitfall 10: Notification permission requested too early, permanently suppressing opt-in

**What goes wrong:**
The app asks for OS-level notification permission during onboarding (a common default pattern), before the user has experienced any value from the app. The user, having no context for why notifications matter yet, denies it — and on iOS in particular, that denial is effectively permanent for that install (the app can only send the user to Settings; it cannot re-prompt the native OS dialog after a first denial). Given the product's own design already limits notifications to a single optional, user-authored reminder in Starter, an early blanket "enable notifications?" ask (common boilerplate in RN starter templates and onboarding-flow examples) squanders the one narrow, valuable use case the feature actually has.

**Why it happens:**
- Native notification-permission boilerplate (and Expo's own quickstart examples) often prompts for permission at app launch or during onboarding because that's the simplest place to put the call, not because it's the best time for the user.
- Onboarding is capped at 3 screens for this product specifically to reduce friction, which creates pressure to "just ask for everything upfront" rather than deferring the ask to the moment it's contextually relevant (when the user is actually building a Starter intention and choosing to add a reminder).
- Developers underestimate that a denied permission is a one-way door on iOS — there's no "ask me again next week" native retry; the only recovery path is the user manually visiting Settings, which essentially never happens organically.

**How to avoid:**
- Do not request notification permission during onboarding (Phase 6) at all. Defer the OS prompt to the exact moment in Starter (Phase 5) where the user has chosen to set a reminder for their own self-worded intention — permission requested in direct service of an action the user just initiated, not speculatively.
- Use a soft-ask/pre-permission pattern: a custom in-app explanation of what the notification will contain (the user's own words, at the user's chosen time — not a generic "stay on track!" message) with an explicit skip option, shown before the native OS dialog fires. This lets a "not now" simply mean "ask again next time," instead of burning the one native prompt on a premature no.
- Because this product's notification is singular and self-authored (not a recurring engagement nudge), frame the soft-ask copy around that specific, narrow value ("Trinket will remind you, once, in your own words") rather than generic notification marketing copy — this is also a shame-free/PDA-aware compliance point, not just a conversion-optimization one.
- Track opt-in rate and denial context (which screen, which flow) as an analytics funnel event (fits within Phase 8's funnel instrumentation) so the team can see if the deferred-ask strategy is actually working before beta feedback arrives.

**Warning signs:**
- Any call to request notification permission fires before or during the 3-screen onboarding flow.
- No custom pre-permission explanation screen shown before the native OS dialog.
- Notification copy at the ask point is generic rather than specific to the single reminder use case.

**Phase to address:**
Phase 6 (onboarding) — explicitly exclude notification permission from onboarding; Phase 5 (Starter) — implement the contextual, deferred ask; Phase 8 — instrument opt-in funnel tracking.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|------------------|
| Storing session elapsed time as an incrementing counter instead of deriving from `started_at` timestamp | Faster to write initially | Silently desyncs after any background/kill/resume cycle — breaks the core loop | Never |
| Using Expo Go instead of a custom dev client during early scaffolding | Faster iteration loop for pure-JS screens in week 1 | Forces a disruptive mid-project migration once MMKV/STT/RevenueCat land | Acceptable only for the very first days before any native dependency is touched, and only if the team commits to migrating before Phase 2 |
| Hardcoding a handful of "just get it working" English strings while other i18n plumbing is built | Slightly faster early screens | Compounds into a full-codebase string hunt later; Polish plural forms retrofitted late are especially error-prone | Never, once the i18n skeleton exists (Phase 1) — no exceptions even for placeholder screens |
| Adding a convenient debug field (task text, mood value) to an analytics event during development | Faster local debugging | GDPR Article 9 exposure risk once shipped; hard to retroactively purge from an analytics vendor's warehouse | Never in code that reaches a build shared outside the local dev machine — use local console logging instead |
| Using a vendor's default paywall/notification template copy unmodified while validating the integration works | Faster to verify the plumbing (purchase flow, permission flow) end-to-end | Risk of shipping shame/urgency-framed copy if the "temporary" template copy isn't swapped before release | Acceptable only in an internal dev build never seen by beta users; must be replaced before any TestFlight/beta build |
| Skipping the low-end Android device test pass for Lottie/mascot work because flagship devices "run fine" | Faster QA cycle during active development | Frame-rate/memory issues surface only in production on the devices most of the target audience actually owns | Never past Phase 2 — at minimum spot-check on one low/mid-tier Android device before merging mascot state-machine changes |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|------------------|-------------------|
| Expo + `react-native-mmkv` | Assuming MMKV works in Expo Go; discovering the hard runtime error mid-project | Set up EAS Build + `expo-dev-client` + `expo prebuild` (CNG) from Phase 1, before any MMKV code is written |
| RevenueCat + StoreKit sandbox | Trusting sandbox prices/metadata and treating a passing sandbox test as production-ready | Use StoreKit Configuration files (Xcode) and RevenueCat's Test Store for grace-period/billing-retry and fast-iteration testing; verify actual purchase flow (not prices) in sandbox; always do a final real-money-adjacent TestFlight pass |
| RevenueCat offline entitlements | Assuming entitlement checks always work offline, including for a user who purchased and immediately lost connectivity, or a fresh install with no prior online launch | Design an explicit "entitlement unknown, default to free tier, no alarming copy" state; test purchase-then-offline and offline-fresh-install sequences specifically |
| Platform STT (iOS Speech framework / Android SpeechRecognizer) | Testing only on one high-end device per platform, missing Polish on-device model availability gaps and Android manufacturer variance | Runtime-check on-device language availability before offering voice capture; test on low/mid-tier Android and with device system locale set to Polish, not just app locale |
| PostHog (or equivalent) analytics | Passing free-form content variables into `track()` calls for debugging convenience | Wrap analytics calls in a typed function that only accepts an allowlisted event-property schema; forbid raw content fields structurally, not just by policy |
| Supabase (minimal backend surface) | Cloud-sync surface creep — a feature quietly starts syncing content (task text, brain-dump items) to Supabase because "it's easier than local-only sync logic" | Enforce the local-first boundary explicitly per feature: only subscription state, account identity, and opt-in backup are allowed to touch Supabase; treat any new sync target as requiring an explicit constraint-review sign-off |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| Lottie component remounted on every mascot state-machine transition | Rising memory usage over a session, visible stutter, eventual crash on Android | Use one persistent `LottieView`, swap animation source/segment instead of remounting | Noticeable after ~10-15 min continuous use on low/mid-tier Android; severe by 30+ min sessions (which the product explicitly supports via the dozing state) |
| Lottie JSON bundled in the JS bundle instead of loaded as lazy platform assets | Slower app cold start, higher baseline memory even before animation plays | Load Lottie assets lazily per platform (already a stated constraint); verify bundler config actually achieves this, don't just assume it | Immediately noticeable on any low-end device; compounds as more mascot states/assets are added |
| MMKV storing large or unbounded blobs (e.g., unbounded brain-dump history, session log) without any pruning strategy | Slower read/write over time, larger backup payloads if opt-in backup is added later | Design the local data model with realistic growth in mind even though no daily aggregates/streak fields exist; consider what "quiet log" history looks like after a year of use | Becomes noticeable once a real user has months of session/brain-dump history — a beta cohort running only weeks won't surface this |
| Brain dump list rendering without virtualization once item count grows | Scroll jank once a user has accumulated many dump items across categories | Use a virtualized list (FlashList or equivalent) from the start for Brain dump's item list, not a plain `.map()` render, even though MVP item counts will be small | Likely fine through beta's short usage window; breaks for real long-term users with hundreds of dump items |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Treating a pseudonymous analytics ID as sufficient to exit GDPR Article 9 scope entirely | Regulatory exposure — sensitive, re-identifiable, ADHD-adjacent behavioral data processed without the required Article 9 condition alongside the Article 6 legal basis | Explicitly document the Article 6 legal basis *and* Article 9 condition (or confirm, and structurally enforce via the event allowlist, that no Article-9-relevant content ever reaches analytics in the first place) |
| Content (task text, brain-dump text, mood value) leaking into analytics event properties | Same as above, plus reputational risk specific to a product whose entire trust proposition is "we never ask your diagnosis status and never store it" | Typed analytics wrapper with an allowlisted property schema; automated lint/test catching content-variable misuse |
| Supabase account/backup layer inadvertently becoming queryable/joinable with analytics data | Re-identification risk — even if analytics IDs are pseudonymous, if they can be joined to Supabase's account-scoped identity data, the pseudonymization is defeated in practice | Keep analytics ID space and Supabase account ID space deliberately non-trivial to join; document explicitly if/when a join is ever intentionally required (e.g., subscription-state check) and scope that narrowly |
| Opt-in backup (if/when built) implemented without clarity on what "encrypted" means (at rest on Supabase vs. end-to-end/user-key-only) | User content (task text, brain-dump items) exposed to backend operators or breach risk beyond what the local-first promise implies | Defer backup encryption approach to an explicit design decision (already flagged as an open decision, correctly deferred) rather than defaulting to unencrypted "just get it stored" implementation if backup ships before the design decision is finalized |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| Requesting notification permission during onboarding | Permanent (iOS) denial of the one legitimate future use case (Starter's self-authored reminder) | Defer the ask to the exact moment the user opts into a Starter reminder; use a soft-ask explanation first |
| Session ending mid-way looking or feeling like an "abandoned"/incomplete state in any UI copy or animation | Undermines the explicit design decision that "a session that ends early is a completed session, not an abandoned one" — risks reintroducing shame through the back door of ambiguous UI state, not explicit copy | Ensure the acknowledge-state animation and any post-session copy is identical in warmth regardless of duration or whether a task was "finished" |
| Freemium gate copy diverging between the "confirmed 0 sessions left" state and an "entitlement unknown/offline" state | A user hitting an ambiguous entitlement edge case (see Pitfall 4) gets harsher, more alarming copy than the designed shame-free gate message, precisely when they're already confused about why the app is behaving oddly | Design and copy-review the offline/ambiguous-entitlement state with the same shame-free bar as the designed happy-path gate copy |
| Brain dump voice capture failing silently (permission denied, STT unavailable, Polish model not downloaded) with no graceful fallback | User assumes the feature is broken or gives up on voice capture entirely, losing the low-friction capture the mechanic exists to provide | Explicit fallback to text input with a calm, non-alarming inline message, not a generic system error or silence |
| Re-entry after a long absence (weeks) surfacing any element that reads as a report of the gap (badge count, "it's been a while," visual dust/decay) | Directly undermines the stated retention thesis — "the gap is inevitable; making the return feel good and cost nothing beats trying to prevent the gap" | Audit every screen a returning user might see first (home screen, mascot greeting, any counters) specifically for absence-duration leakage, not just explicit copy |

## "Looks Done But Isn't" Checklist

- [ ] **Co-pilot session persistence:** Often missing a force-quit test — verify by force-quitting mid-session on a real device and confirming silent, correct resume on reopen (no interrupted-session messaging, correct elapsed time).
- [ ] **Offline-first correctness:** Often missing the "purchase while online, then go offline" and "fresh install with no network on first launch" sequences — verify both explicitly, not just "app works with airplane mode on after a normal launch."
- [ ] **i18n coverage:** Often missing dynamically-rendered strings (native module callback text, system alert copy, error states) even after a codemod pass — verify by switching device system language to Polish (not just in-app locale setting) and walking every screen, including error/edge states.
- [ ] **Subscription restore flow:** Often missing on a fresh install (not just "resume after logout") — verify "install app, restore purchase, no prior local data" as a distinct test case from "existing user reopens app."
- [ ] **STT permission/availability fallback:** Often missing the "permission denied," "permission revoked after initial grant," and "on-device Polish model not yet available" states — verify each renders a calm fallback to text input, not a generic error or dead mic button.
- [ ] **Shame-free copy audit:** Often missing store-listing copy, notification copy, and third-party template copy (paywall, onboarding boilerplate) in the review — verify the same forbidden-words/pattern checklist used for in-app UI is explicitly applied to these surfaces too.
- [ ] **Analytics event schema:** Often missing an actual enforced allowlist (as opposed to a policy stated in a doc) — verify with an automated test that attempting to pass a content-bearing variable into a tracked event fails CI.
- [ ] **Low-end Android performance:** Often missing from the test matrix entirely if the team develops primarily on iOS or flagship Android — verify mascot-heavy screens (Co-pilot presence, dozing) on an actual low/mid-tier Android device before each release candidate.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|----------------|------------------|
| Session state loss discovered post-launch | MEDIUM | Ship a hotfix moving session persistence to write-on-start (if not already) rather than write-on-background; add server-side or client analytics to quantify how often it occurred before the fix, to gauge activation-metric impact |
| Expo Go / native-module wall hit mid-project | MEDIUM-HIGH | Migrate to EAS Build + custom dev client + `expo prebuild`; budget several days of CI/build-pipeline rework; this is a workflow migration, not a full eject, so existing JS code is largely unaffected |
| Lottie performance issues found late (beta feedback) | MEDIUM | Re-architect mascot rendering to a single persistent `LottieView` with source-swapping; re-export/optimize assets against the 300 KB budget; consider RLottie-backed renderer only if optimization alone is insufficient |
| Hardcoded strings discovered pre-beta | MEDIUM | Run an automated codemod pass (e.g., i18next-cli's instrument/localize commands) to wrap remaining literals, then manually verify Polish plural forms render correctly rather than trusting automated wrapping alone |
| Analytics content-payload leak discovered post-launch | HIGH | Requires coordinated fix: patch the event immediately, then work with the analytics vendor to purge or anonymize already-collected data for the affected event property, document the incident for GDPR accountability records, and add the automated allowlist enforcement that should have existed from the start |
| Shame/streak-pattern violation found in a shipped build (e.g., a vendor template's default copy) | LOW-MEDIUM | Patch copy in the next release; because no streak data exists in the schema (by design), there's no data-migration cost — this is purely a copy/UI fix, which is exactly why the "no pressure fields in the schema" constraint pays off during recovery, not just prevention |
| App Store/Play rejection over subscription disclosure or store-listing copy | MEDIUM | Revise the specific flagged copy/UX per reviewer feedback and resubmit; budget calendar slack (this is common enough for weekly-tier subscription apps to treat as an expected step, not an emergency) |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|--------------------|----------------|
| Session state loss on background/force-quit/OS kill | Phase 3 (Co-pilot end-to-end) | Manual force-quit/background test checklist run at every Co-pilot logic change; re-verified in Phase 9 |
| Expo native-module wall (MMKV et al.) | Phase 1 (project scaffold) | Confirm EAS + dev client + prebuild workflow is in place before any MMKV/native code is written; no team member uses plain Expo Go for development |
| Lottie memory/performance on low-end Android | Phase 2 (mascot module) | Memory/FPS profiling on a real low/mid-tier Android device; re-tested in Phase 3 (longest mascot runtime) and Phase 9 |
| RevenueCat/StoreKit sandbox gaps + offline entitlement gate | Phase 7 (subscription infra + freemium gate) | Explicit test cases: purchase-then-offline, offline-fresh-install, grace-period simulation via StoreKit Config files; re-verified Phase 9 |
| i18n retrofit pain / Polish plural handling | Phase 1 (i18n skeleton + CI lint rule) | CI fails on hardcoded JSX string literals; native Polish speaker reviews rendered plural forms before beta |
| On-device STT reliability / Polish locale gaps | Phase 4 (Brain dump) | Runtime availability check + fallback UX; tested on low/mid-tier Android and with device locale set to Polish |
| Analytics content leakage / pseudonymous-ID Article 9 gap | Phase 8 (analytics events) | Typed allowlisted event schema; automated test blocking content-variable misuse |
| App Store/Play review risk (medical claims, subscription disclosure) | Phase 7 (subscription UX) + pre-submission checklist | Forbidden-copy checklist explicitly extended to store listing, screenshots, category selection; subscription disclosure UX (cancellation tap count, price/term visibility) verified against both platforms' requirements |
| Shame/streak mechanics via library/template defaults | Ongoing, Phases 2-8 | PR-level "shame-free/PDA-aware copy review" gate on any user-facing copy or third-party UI template; data model reviewed for any field that could only serve pressure/frequency purposes |
| Notification permission requested too early | Phase 6 (onboarding, exclusion) / Phase 5 (Starter, contextual ask) | Confirm no permission request fires during onboarding; soft-ask pattern implemented at the Starter reminder moment; opt-in funnel tracked in Phase 8 |

## Sources

- [IOS App should not be killed in background state — react-native-background-timer issue #272](https://github.com/ocetnik/react-native-background-timer/issues/272)
- [Efficiently Managing Timers in a React Native App — DEV Community](https://dev.to/shivampawar/efficiently-managing-timers-in-a-react-native-app-overcoming-background-foreground-timer-state-issues-map)
- [[iOS] JS Timers (setTimeout) don't fire when app is launched in background — facebook/react-native #38711](https://github.com/facebook/react-native/issues/38711)
- [Error: react-native-mmkv is not supported in Expo Go! — mrousavy/react-native-mmkv #638](https://github.com/mrousavy/react-native-mmkv/issues/638)
- [In-App Purchases with Expo React Native — RevenueCat](https://www.revenuecat.com/blog/using-revenuecat-with-expos-managed-workflow/)
- [Continuous Native Generation (CNG) — Expo Documentation](https://docs.expo.dev/workflow/continuous-native-generation/)
- [Adopt Prebuild — Expo Documentation](https://docs.expo.dev/guides/adopting-prebuild/)
- [Extremely slow Android animation — lottie-react-native/lottie-react-native #1006](https://github.com/lottie-react-native/lottie-react-native/issues/1006)
- [memory leak while unmounting the lottie component — lottie-react-native/lottie-react-native #1010](https://github.com/lottie-react-native/lottie-react-native/issues/1010)
- [Boost Your React Native App Start Time: Stop Shipping Lottie JSON Incorrectly — DEV Community](https://dev.to/retyui/boost-your-react-native-app-start-time-stop-shipping-lottie-json-incorrectly-2074)
- [GitHub - hannojg/react-native-rlottie](https://github.com/skillnation/react-native-rlottie)
- [Sandbox Testing — RevenueCat Docs](https://www.revenuecat.com/docs/test-and-launch/sandbox)
- [Introducing Offline Entitlements — RevenueCat Engineering Blog](https://www.revenuecat.com/blog/engineering/introducing-offline-entitlements/)
- [Simplify in-app purchase unit testing with RevenueCat's Test Store](https://www.revenuecat.com/blog/engineering/testing-test-store/)
- [From Hardcoded Strings to Global-Ready — Locize Blog](https://www.locize.com/blog/i18next-cli-instrument/)
- [Speech recognition using the Speech framework — Kamil Tustanowski, Medium](https://medium.com/@kamil.tustanowski/speech-recognition-using-the-speech-framework-72d31f4f344a)
- [Available Languages in On-device Speech Recognition on iOS in 2022 — Toru Furuya, Medium](https://medium.com/@toru_furuya/available-languages-in-on-device-speech-recognition-on-ios-in-2022-8c6383fac9f2)
- [GitHub - alphacep/vosk-api (offline speech recognition, 20+ languages including Polish)](https://github.com/alphacep/vosk-api)
- [PostHog & GDPR compliance — PostHog Docs](https://posthog.com/docs/privacy/gdpr-compliance)
- [GDPR Sensitive Data: How to Handle Article 9 Data — GDPR Summary](https://www.gdprsummary.com/gdpr-sensitive-personal-data/)
- [Anonymous vs identified events — PostHog Docs](https://posthog.com/docs/data/anonymous-vs-identified-events)
- [App Review Guidelines — Apple Developer](https://developer.apple.com/app-store/review/guidelines/)
- [Provide information for the Health apps declaration form — Google Play Console Help](https://support.google.com/googleplay/android-developer/answer/14738291?hl=en)
- [How to Improve Push Notification Opt-In Rates: 8 Proven Strategies — Plotline](https://www.plotline.so/blog/how-to-improve-push-notification-opt-in-rates)
- [Increase opt-ins with the Pre-Permission — Notificare](https://notificare.com/blog/2019/05/23/Increase-opt-ins-with-the-Pre-Permission/)
- [Best Alternatives to Forest App for ADHD — getinflow.io](https://www.getinflow.io/post/best-alternatives-forest-app-adhd)
- [Gamified To Do List Apps ADHD Brains Actually Stick With — AFFiNE](https://affine.pro/blog/gamified-to-do-list-apps-adhd)
- Project source: `.planning/PROJECT.md`, `.planning/source/trinket-dev-synthesis-v0.1.md` (hard constraints, build order, mascot state machine)

---
*Pitfalls research for: ADHD companion / focus-timer / freemium React Native app (Trinket)*
*Researched: 2026-07-01*
