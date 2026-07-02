<!-- GSD:project-start source:PROJECT.md -->
## Project

**Trinket**

Trinket is a mobile companion app for adults with ADHD (iOS + Android, single React Native codebase, Polish + English from first release). It supports the two hardest moments of an ADHD day: **starting a task** and **transitioning between tasks**. The core differentiator is an animated raccoon mascot acting as an **asynchronous body double** — the user starts a difficult task in the mascot's presence without scheduling a session with another human (implements Ara et al. 2025, arXiv:2509.12153). Positioned as a wellness app, NOT a medical device.

**Core Value:** A user who has been avoiding a task can open Trinket and actually start it in the mascot's presence — **Co-pilot lowers the threshold to start**. The activation event is the first completed Co-pilot session; everything else in the app supports it.

### Constraints

- **Shame-free design (hard)**: No streak mechanics, no punitive mechanics, nothing lost due to absence, warm re-entry always, no guilt notifications — violating this is a bug regardless of how standard the pattern is elsewhere
- **PDA-aware interaction grammar (hard)**: The mascot never issues demands, prompts, or calls to action; it is present, not directive; UI copy offers ("Start a session?" button) but never instructs (no mascot speech bubble commands)
- **AI boundary (hard)**: AI only for input processing (speech-to-text, brain-dump categorization); never generates advice, coaching, encouragement, or any therapeutic output; no LLM calls in the core loop
- **Privacy / GDPR Art. 9 (hard)**: Local-first — user content lives on device in MMKV; cloud sync minimal and account-scoped (subscription state, identity, opt-in backup); analytics carry no content payloads; the app never asks diagnosis status and no data model field stores it
- **Regulatory copy (hard)**: "supports task initiation" allowed; "treats/cures/diagnoses/reduces ADHD symptoms/clinically proven" forbidden in all UI copy, store listings, and notifications
- **Tech stack (fixed)**: React Native + Expo (managed workflow as long as feasible), TypeScript strict, MMKV local storage, Supabase backend (minimal surface), Lottie animations, RevenueCat subscriptions, PostHog EU (or equivalent) analytics, platform-native STT (iOS Speech framework / Android SpeechRecognizer, on-device preferred)
- **Data model**: no daily aggregates, no streak fields — if a stat can only be used for pressure, it does not exist in the schema; no daily boundaries (sessions crossing midnight are unremarkable)
- **Performance**: Lottie loops loaded lazily, each under 300 KB target
- **Platforms**: everything MVP stays inside the app process; no native modules beyond well-maintained community ones
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## The one thing to internalize before anything else
- Use Expo tooling, config plugins, and Continuous Native Generation (CNG / `expo prebuild`) instead of hand-editing `ios/`/`android/` — this is what "managed" means in 2026, not "no native code."
- Never run `expo eject` or maintain native folders by hand — commit to CNG.
- Build with **EAS Build + a custom dev client** (`expo-dev-client`) from day one of scaffolding (build order step 1), not as a later migration.
- Expo Go remains useful only for the first hour of UI/theme/i18n scaffolding before any native module lands (build order step 1, before step 2's Lottie work in some cases). Budget for dev-client builds starting essentially immediately.
## Recommended Stack
### Core Framework
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Expo SDK | **56** (`~56.0.13`) | App framework, CNG, config plugins, EAS | SDK 57 (`57.0.1`) shipped 2026-06-30 — one day before this research date. It is described by Expo as a small, non-breaking, "easiest upgrade ever" bump from 56 (RN 0.86, no breaking changes from 0.85), so it is *architecturally* safe, but third-party native modules (RevenueCat, MMKV, STT libraries, ExecuTorch) will not have explicit SDK-57-tested releases yet at project start. SDK 56 (released 2026-05-21, ~6 weeks old) is the pragmatic floor: New Architecture default, RN 0.85, React 19.2, stable long enough for the dependency ecosystem to catch up. Re-evaluate the SDK 57 bump after the first 2-3 native modules are integrated and confirmed stable — it should be a same-day upgrade given the "no breaking changes" framing. HIGH confidence on version facts (official changelogs), MEDIUM on "which SDK to start on" (a judgment call, not a hard requirement). |
| React Native | 0.85 (bundled by Expo SDK 56) | Core runtime | Don't install separately — pinned by `expo install`. New Architecture (Fabric + TurboModules) is the *default* as of SDK 55+; Legacy Architecture support was removed entirely in SDK 55. Every native dependency below must be New-Architecture-compatible — this is now a hard requirement, not an opt-in. |
| React | 19.2 | UI library | Bundled by Expo; do not pin independently. |
| TypeScript | `~5.9.2` minimum, project should use current stable (`6.0.x`) — **strict mode on** | Type safety per brief's hard requirement | Expo's own templates moved to TS 6.0.x with SDK 56. `strict: true` plus `"expo/tsconfig.base"` as the extended base (ships with `expo` package) is the standard starting `tsconfig.json`. |
| Expo Router | version matching SDK (`~56.x`, file-based) | Navigation | Bundled and the default in current Expo templates; note SDK 56 decoupled `expo-router`'s public API from a hard `react-navigation` re-export requirement (a codemod is provided for the import-path change) — it still uses React Navigation internally. Use file-based routing over manually wiring `@react-navigation/native` — it's the path of least resistance and least boilerplate for a ~15-20 screen MVP, and it's what new Expo projects scaffold with by default. CONFIDENCE: HIGH that it's the default; MEDIUM that it's strictly *better* than bare React Navigation for this project's needs — either works, Router is just less code to own. |
### Local Storage & State
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `react-native-mmkv` | `4.3.x` | Local-first storage — `dump_items`, `intentions`, `sessions`, `settings` per the data model | Fixed by the brief. **v4 is a hard Expo-managed-workflow break**: it is rebuilt on Nitro Modules (JSI), requires the peer dependency `react-native-nitro-modules`, needs New Architecture, and explicitly **does not run in Expo Go** ("Failed to get NitroModules" is the exact error you'll hit). Requires `npx expo prebuild` + dev client from the moment it's added (build order step 1). HIGH confidence, multiple corroborating GitHub issues and official docs. |
| `react-native-nitro-modules` | latest matching MMKV v4's peer requirement | Required peer dependency for MMKV v4's JSI bridging | Install alongside MMKV; version-match to the SDK per `expo install` resolution — don't pin manually, let `expo install` pick the compatible version. |
| `zustand` | `5.0.x` | In-memory app/UI state, with `persist` middleware backed by MMKV for state that needs to survive restarts | Not in the brief explicitly, but needed — MMKV is a key-value store, not a reactive state layer. Zustand + a thin MMKV storage adapter (a well-documented ~15-line pattern; MMKV's own repo ships a reference implementation at `docs/WRAPPER_ZUSTAND_PERSIST_MIDDLEWARE.md`) is the lightest-weight combination that avoids Redux ceremony and keeps bundle size down. MEDIUM confidence — this is a standard community pattern, not an official Expo/Meta recommendation, but very widely used and well-suited to a small local-first schema (4 tables, no relational complexity). |
| Supabase auth storage adapter | custom (~20 lines) | Bridge `@supabase/supabase-js`'s expected `AsyncStorage`-shaped interface to MMKV | `supabase-js` expects a storage object with `getItem`/`setItem`/`removeItem`. Do not add `@react-native-async-storage/async-storage` as a second storage engine just for Supabase — write a small MMKV-backed adapter implementing that interface instead, and encrypt the MMKV instance holding the session token (see Security section). Established pattern, MEDIUM confidence (community-documented, not officially blessed by Supabase, but the interface contract is simple and stable). |
### Backend
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@supabase/supabase-js` | `2.110.x` | Auth, subscription-state mirror, opt-in encrypted backup | Fixed by the brief; keep the backend surface exactly as scoped — auth + subscription cache + opt-in backup, nothing else. No realtime subscriptions, no Postgres row-level app logic needed for MVP. Standard JS client works fine in RN with the storage adapter above; no RN-specific Supabase package is needed. |
### Animation
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `lottie-react-native` | `7.3.x` (`7.3.8` current) | Mascot state-machine animations (greeting/idle/presence/dozing/acknowledge) | Fixed by the brief. Requires native linking (AirBnB's `lottie-ios`/`lottie-android` under the hood) — **not Expo-Go-compatible**, needs prebuild/dev client, same as MMKV. Has an Expo config plugin as of recent majors; still confirm `newArchEnabled: true` compatibility per-version since there have been open GitHub issues around New Architecture edge cases on Android (`.lottie` file format rendering) as recently as SDK 53. Test each Lottie asset drop on both platforms after any Expo SDK bump, not just at integration time — this is the module most likely to silently regress on an SDK upgrade. |
### Subscriptions
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `react-native-purchases` (RevenueCat) | `10.4.x` | StoreKit 2 / Play Billing subscription management, entitlements, three-tier pricing per market | Fixed by the brief. Minimum RN version required: 0.73.0 (well below this project's 0.85, no issue). **Not Expo-Go-compatible for real purchases** — ships a "Preview API Mode" that mocks the native calls when it detects Expo Go, so UI/logic can be built without a dev client, but real StoreKit/Play Billing calls require `expo-dev-client` + EAS Build. Has an official Expo config plugin and documented CNG setup. |
| `react-native-purchases-ui` | matching major (`10.x`) | Prebuilt RevenueCat paywall components | Optional — use if the design system doesn't require fully custom paywall screens; given the product has a specific shame-free, warm visual identity, evaluate whether the prebuilt paywall UI fits or whether a custom screen driven by RevenueCat's `Offerings` API is worth the extra build time. Lean toward custom given how central tone is to this product's differentiation — LOW-stakes decision, defer to design system availability. |
| `expo-dev-client` | matching SDK (`~56.x`) | Enables development builds with custom native code | Required the moment MMKV, RevenueCat, STT, or the on-device classifier is added — i.e., immediately (build order step 1-2). Not optional. |
### Analytics
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `posthog-react-native` | `4.54.x` | Privacy-first, EU-hosted, pseudonymous event analytics, no content payloads | Fixed by the brief (PostHog EU named explicitly). Set `host: 'https://eu.i.posthog.com'` at init — this is the entire EU-residency configuration; the region cannot be changed after the project is connected, so get it right at setup time. **Explicitly disable autocapture and do not enable Session Replay.** Autocapture and session replay are exactly the kind of implicit content-adjacent capture the brief's "no content payloads" constraint is designed to prevent (session replay records view hierarchies/screen content by default, even with text-masking on — and there are open GitHub issues about masking behaving inconsistently on RN/iOS). Use **only manual `posthog.capture(eventName, properties)` calls** for the specific funnel events named in the brief (activation, session start/end, brain-dump created, etc.), with properties that are structural/behavioral only (event names, durations, booleans) — never text content. HIGH confidence on EU host config, HIGH confidence on the recommendation to disable autocapture/replay for this product's privacy posture. |
| `@posthog/react-native-plugin`, `expo-application`, `expo-device`, `expo-file-system`, `expo-localization`, `react-native-safe-area-context`, `react-native-svg` (`>=15.0.0`) | matching peer ranges | Required peer dependencies of `posthog-react-native` | Install via `expo install` so versions resolve against the SDK; several of these (expo-localization, expo-device) are also needed independently for i18n and STT permission handling, so there's no waste here. |
### Speech-to-Text
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `expo-speech-recognition` (published as both `expo-speech-recognition` and `@jamsch/expo-speech-recognition`) | latest (actively maintained into 2026) | Brain dump voice capture via iOS `SFSpeechRecognizer` and Android `SpeechRecognizer`, matching the brief's exact requirement | This is the best fit for an Expo-centric project: it ships its own Expo config plugin (handles the Android manifest package-visibility entry for `com.google.android.googlequicksearchbox` and both platforms' permission strings declaratively in `app.json`), exposes an explicit **on-device recognition option** (`requiresOnDeviceRecognition` on iOS; Android's on-device path depends on OS/device support), and mirrors the Web Speech API shape for code-reuse discipline. **Not Expo-Go-compatible** (native STT frameworks require compiled code) — needs prebuild/dev client like everything else here. CONFIDENCE: MEDIUM. This is a single-maintainer package; verify recent commit activity and open-issue volume at integration time (build order step 4) before committing, and have a fallback plan. |
| Fallback candidate: `@react-native-voice/voice` | — | Older, more widely known alternative | Do not default to this — community reports describe it as showing maintenance gaps relative to newer New-Architecture-first alternatives, and it historically leans on internet-dependent recognition on Android rather than exposing an explicit on-device flag. Keep as a documented fallback only if `expo-speech-recognition` proves unstable during the Brain Dump build phase. |
| What NOT to use | — | — | Do not reach for a cloud STT API (Whisper API, Google Cloud Speech-to-Text, etc.) as the primary path — it directly contradicts the brief's "on-device preferred," adds a network dependency to a feature that should work offline, and turns speech content into a payload crossing the network, which sits uncomfortably next to the "no content payloads" analytics constraint even though it's a different data flow. Platform-native on-device STT is both the privacy-correct and product-correct (offline-first) choice. |
### On-Device Semantic Categorization (Brain Dump)
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Recommended for MVP: rule-based / keyword classifier (no ML dependency)** | n/a | Suggest one of 5 fixed categories (errands/work/home/people/someday) for each brain-dump item | Given there are only **5 fixed categories**, not an open taxonomy, a hand-tuned keyword/regex classifier (PL + EN keyword lists per category, simple scoring, ties broken toward "someday") is honestly the right MVP answer: zero native dependencies, zero model download/bundle size, zero inference latency, trivially offline, trivially debuggable, and easy to get "good enough" for a feature explicitly scoped as *suggestions the user can change with one tap* (brief section 4.2) — it does not need to be right, it needs to not be annoying. This avoids adding a second on-device ML native module (on top of STT) during the MVP build, which is real integration/testing surface area for a feature with an explicit low bar. CONFIDENCE: MEDIUM-HIGH as a product judgment call, not a library-verification finding — flag this recommendation for explicit confirmation against the "spike early, prefer on-device" open decision in the source doc (section 10). |
| **If the rule-based approach proves insufficient in the spike: `react-native-executorch`** (Software Mansion) | actively developed, requires New Architecture | On-device text embeddings for zero-shot/similarity-based classification (e.g., `ALL_MINILM_L6_V2`, 384-dim sentence embeddings) | If keyword matching demonstrably underperforms (e.g., fails badly on Polish free-form phrasing), this is the credible on-device escalation path: embed the item text and each category label, classify by cosine similarity — no training data or fine-tuning needed. Maintained by Software Mansion (a recognized React Native core-contributor shop), supports iOS + Android, ships an Expo setup guide. **Hard requirements**: New Architecture mandatory (will not run on Legacy Architecture at all), needs `expo prebuild` + dev client, plus companion packages (`@react-native-executorch/expo-resource-fetcher`, `expo-file-system`, `expo-asset`) to fetch/cache the model file on-device. Model file size was not confirmed in available docs — budget time in the spike to measure actual `.pte` model size and first-load latency before committing, since a multi-tens-of-MB model download on first run has UX and offline-availability implications for a local-first app. CONFIDENCE: MEDIUM — the library and API exist and are documented, but this specific use case (5-category short-text classification) was not found demonstrated in an official example; treat as the *fallback spike*, not the MVP default. |
| What NOT to use | — | — | Do not reach for a cloud LLM/classification API as the primary path — the brief explicitly names this "AI boundary" territory and mandates on-device-first with only a minimal, identifier-free text-only API call as a fallback of last resort. Do not add TensorFlow Lite (`react-native-fast-tflite`) as a separate toolchain alongside ExecuTorch — pick one on-device ML runtime if you need one at all; ExecuTorch is the more actively-evolving, RN-native-feeling option in 2026 and has purpose-built text-embedding support, whereas `react-native-fast-tflite` requires you to source/convert your own classification model with no off-the-shelf embedding model story. |
| Minimal API fallback (if on-device is spiked and rejected) | — | Text-only classification call, no identifiers | Per the brief: send only the item text, no user ID, no device ID, no other payload. This is explicitly the *fallback*, not the plan — treat any API integration here as a last resort documented in the spike's findings, and keep the request/response shape trivial enough to swap for an on-device model later without a data-model change (the category field doesn't care which system produced it). |
### Localization (i18n)
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `i18next` | `26.3.x` | Core i18n engine | Industry-standard, CLDR-based pluralization out of the box — critical for Polish, which has **4 plural forms** (`_one`, `_few`, `_many`, `_other`), correctly handled by i18next's CLDR plural rules without custom code. This alone rules out simpler libraries (e.g., `i18n-js`) that don't implement CLDR plural categories natively. |
| `react-i18next` | `17.0.x` | React bindings (`useTranslation` hook) | The standard pairing with i18next for React/React Native; hooks-based API fits function-component codebase conventions. |
| `expo-localization` | matching SDK (`~56.x`) | Detect device locale/region on first launch | Needed to pick a sensible default (PL vs EN) before the user makes an explicit choice, per the brief's "i18n from the first screen" requirement. Also a peer dependency of `posthog-react-native`, so no extra weight added. |
| What NOT to use | — | — | Avoid `react-intl`/FormatJS unless the team already has ICU MessageFormat experience — it's a heavier, extraction-workflow-oriented tool better suited to large enterprise translation pipelines than a 2-language (PL/EN) consumer app with a small, hand-maintained string set. i18next's plugin ecosystem and simpler mental model win here. |
### Notifications
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `expo-notifications` | matching SDK (`~56.x`) | Local, opt-in, single-notification-per-intention scheduling (Starter mechanic) | This is purely **local** notification scheduling per the brief (no push/remote notifications needed for MVP — nothing in scope requires server-triggered pushes). Good news: local notifications continue to work inside Expo Go for early prototyping, unlike remote push (removed from Expo Go on Android since SDK 53) — but since the project will already be on a dev client for MMKV/RevenueCat/STT by the time Starter is built (build order step 5), this distinction barely matters in practice. No config-plugin gymnastics needed beyond the standard permission strings in `app.json`. |
## Installation
# Scaffold (build order step 1)
# Ensure New Architecture is explicit (default on SDK 56, but pin it deliberately)
# app.json: { "expo": { "newArchEnabled": true, "plugins": [...] } }
# Local storage
# Backend
# Animation
# Subscriptions
# Analytics
# Speech-to-text
# i18n
# Notifications
# After any native module addition:
# Dev dependencies
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Navigation | Expo Router (file-based) | `@react-navigation/native` directly | Both work fine; Router is less boilerplate and is what current Expo templates scaffold by default. Not a strong opinion — switch if the team has strong existing React Navigation conventions. |
| State management | Zustand + MMKV adapter | Redux Toolkit, Jotai, React Context | Redux is unnecessary ceremony for a 4-table local-first schema. Jotai is a reasonable alternative but has less-established MMKV integration precedent than Zustand's official documented pattern. |
| STT | `expo-speech-recognition` | `@react-native-voice/voice` | Older library, weaker New Architecture story, less explicit on-device control. Kept as documented fallback. |
| STT | `expo-speech-recognition` | Whisper on-device (via ExecuTorch) or cloud Whisper API | Whisper-on-device is heavier (larger model, more battery/CPU) than using the OS's own STT for what's fundamentally short dictation bursts; cloud Whisper violates the on-device-preferred / no-content-payload posture. Platform-native STT is simpler and is literally what the brief specifies. |
| On-device classification | Rule-based keyword classifier (MVP) | `react-native-executorch` text embeddings | Escalate only if the spike shows keyword matching is inadequate — don't pre-pay the integration cost of a second ML native module before proving it's needed. |
| On-device classification | ExecuTorch (if escalating) | `react-native-fast-tflite` + custom-converted model | ExecuTorch has an off-the-shelf embedding model story (`ALL_MINILM_L6_V2`) and is the more actively-maintained, RN-idiomatic option in 2026; TFLite path requires sourcing/converting your own model with no ready-made small classification/embedding model bundled. |
| i18n | i18next + react-i18next | `react-intl` / FormatJS | Heavier tooling oriented at large enterprise extraction pipelines; not proportionate to a hand-maintained 2-language string set. |
| Local storage for Supabase session | MMKV + custom adapter | `@react-native-async-storage/async-storage` (Supabase's documented default) | Adding AsyncStorage as a second storage engine purely for Supabase auth tokens duplicates a native dependency the brief already excludes MMKV from replacing; a ~20-line adapter avoids the extra native module entirely. |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Expo Go as the primary dev loop past project scaffolding | MMKV v4, RevenueCat, on-device STT, and any on-device ML classifier all require compiled native code and will hard-fail in Expo Go | `expo-dev-client` + EAS Build (or local `expo run:ios`/`run:android`) from build order step 1-2 onward |
| `expo eject` / hand-maintained native folders | Throws away Expo's config-plugin/CNG upgrade story, which is exactly the mechanism that made all of the above native modules installable "the managed way" | `expo prebuild` (regenerate `ios/`/`android/` from config, treat them as build artifacts, not source) |
| Legacy Architecture / `newArchEnabled: false` | Removed entirely as of SDK 55; not a supported configuration on SDK 56/57. Every native module recommended here (MMKV v4, ExecuTorch, current Lottie/RevenueCat majors) either requires or strongly prefers New Architecture | New Architecture (the SDK default — just don't turn it off) |
| Cloud LLM/API calls for brain-dump categorization or STT as the *primary* path | Directly contradicts the brief's AI boundary (input-processing-only, on-device-preferred) and the no-content-payload privacy posture | On-device platform STT; on-device or rule-based classification, with a minimal identifier-free API call only as documented fallback |
| PostHog autocapture / Session Replay | Captures view-hierarchy/screen content by default (with known masking inconsistencies on RN/iOS) — incompatible with the brief's "no content payloads" analytics constraint | Manual `posthog.capture()` calls for the specific named funnel events only, with structural (non-content) properties |
| AsyncStorage as a second storage engine alongside MMKV | Redundant native dependency solely to satisfy Supabase's default expectation | Thin MMKV-backed adapter implementing the `getItem`/`setItem`/`removeItem` contract |
| `react-native-mmkv-storage` (the older, separate `ammarahm-ed` package) | Different project from `mrousavy/react-native-mmkv` (the one the brief and this stack mean by "MMKV") — do not confuse the two when installing; the `mrousavy` package is the actively maintained, JSI/Nitro-based, industry-standard one | `react-native-mmkv` (mrousavy) |
## Stack Patterns by Variant
- Ship the rule-based classifier for MVP, no ML native module at all
- Revisit ExecuTorch post-launch only if user feedback shows categorization quality is a real complaint
- Fast-follow the SDK 56 → 57 bump early (before too much native-module-specific config accumulates) — Expo's own framing is that it should be a same-day, no-breaking-changes upgrade
- No stack implication — this is a design-token/theming concern (already flagged as swappable in `theme/`), not a new dependency
## Version Compatibility
| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `expo@~56.0.13` | `react-native@0.85`, `react@19.2`, `typescript@~5.9.2` minimum (6.0.x scaffolded by default) | Always resolve via `npx expo install <pkg>`, not raw `npm install`, for any Expo-adjacent or Expo-SDK package — it pins the version compatible with the installed SDK. |
| `react-native-mmkv@4.3.x` | `react-native-nitro-modules` (peer, matching version), New Architecture only | Not usable in Expo Go under any configuration; requires prebuild + dev client. |
| `react-native-purchases@10.4.x` | `react-native >= 0.73.0` | Well below project's 0.85 floor — no compatibility risk from this direction. Runs in Preview/Mock mode in Expo Go; real purchases need dev client. |
| `posthog-react-native@4.54.x` | `@react-native-async-storage/async-storage >= 1.0.0`, `@react-navigation/native >= 5.0.0`, `expo-application/expo-device/expo-file-system/expo-localization`, `react-native-safe-area-context`, `react-native-svg >= 15.0.0` | Note the `@react-native-async-storage/async-storage` peer dependency here is for PostHog's *own* internal persistence (queueing events, feature flags), separate from the Supabase session-storage decision above — this one is fine to let PostHog manage internally; don't try to redirect PostHog's internal storage to MMKV, it's not worth the friction for analytics-queue data. |
| `react-native-executorch` | New Architecture **mandatory** (hard fail on Legacy) | Consistent with the rest of the stack once on SDK 55+, but worth stating explicitly since it's the least forgiving dependency in this list if New Architecture is ever accidentally disabled. |
| `i18next@26.x` / `react-i18next@17.x` | No React Native version coupling — pure JS | No native-module risk at all; safe to upgrade independently of Expo SDK bumps. |
## Sources
- Official Expo changelogs (fetched directly): `expo.dev/changelog/sdk-54`, `sdk-55`, `sdk-56`, `sdk-57` — SDK version, React Native version, release dates, breaking changes. HIGH confidence.
- npm registry (`npm view`, queried directly 2026-07-01) — current published versions for `expo`, `react-native`, `react`, `react-native-mmkv`, `lottie-react-native`, `react-native-purchases`, `posthog-react-native`, `@supabase/supabase-js`, `expo-notifications`, `i18next`, `react-i18next`, `expo-localization`, `zustand`, `expo-router`, `typescript`. HIGH confidence — this is ground truth, not a secondary source.
- `github.com/RevenueCat/react-native-purchases` (fetched) — min RN version, Expo/config-plugin support, Preview API Mode in Expo Go. HIGH confidence.
- `posthog.com/docs/libraries/react-native`, PostHog session-replay/autocapture/privacy docs (WebSearch, cross-referenced) — EU host config, default masking behavior, known RN/iOS masking GitHub issue. MEDIUM-HIGH confidence (official docs + corroborating GitHub issue).
- `github.com/mrousavy/react-native-mmkv` issues and docs (WebSearch + Context7 listing) — v4 Nitro Modules requirement, Expo Go incompatibility, Zustand integration doc. HIGH confidence (multiple corroborating GitHub issues).
- `github.com/jamsch/expo-speech-recognition` (WebSearch) — config plugin, on-device recognition option, install instructions. MEDIUM confidence (single-maintainer package, verify activity at integration time).
- `software-mansion-react-native-executorch.mintlify.app`, `executorch.swmansion.com` (WebFetch) — available embedding models, Expo setup requirements, New Architecture requirement. MEDIUM confidence (official docs, but no confirmed example matching this exact 5-category use case).
- i18next official docs + WebSearch cross-reference (Polish CLDR plural forms, `_one`/`_few`/`_many`/`_other`). HIGH confidence.
- Supabase + MMKV community pattern (WebSearch, multiple independent tutorials converging on the same adapter shape). MEDIUM confidence — community pattern, not officially documented by Supabase.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
