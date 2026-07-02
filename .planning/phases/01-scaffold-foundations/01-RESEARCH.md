# Phase 1: Scaffold & Foundations - Research

**Researched:** 2026-07-02
**Domain:** Expo/React Native project scaffolding — CNG native infra, MMKV local storage, i18next localization, Expo Router shell, theme tokens
**Confidence:** HIGH (scaffold commands, package versions, MMKV v4 API, New Architecture status — all verified via `npm view` + official docs fetched this session) / MEDIUM (exact `expo prebuild` behavior on a Linux sandbox without Xcode/Android SDK — reasoned from documented CNG mechanics, not executed end-to-end in this session) / LOW (light-mode-safe token *shape*, since no external design system exists yet — Claude's-discretion territory per CONTEXT.md)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Theme fidelity**
- **D-01:** Build a genuine attempt at the written visual direction now — earthy palette, night-time cozy atmosphere, soft rounded shapes, dark mode only — not a neutral gray placeholder. Rationale: the UI is "the mascot's habitat"; screens composed against a neutral scaffold would invite rework in every later phase.
- **D-02:** Every visual value (color, radius, spacing, typography scale, elevation) lives in the `theme/` token module; components consume tokens only, never literals. When the external Claude Design system arrives, the swap must be a token-file replacement, not a component refactor. Enforce via lint rule or code-review convention against hex literals outside `theme/`.

**App shell layout**
- **D-03:** Home-hub, not a tab bar. Home screen is the mascot's habitat: mascot area (placeholder box in Phase 1, real module in Phase 2), primary "Start a session?" action (Co-pilot), prominent secondary Brain dump access, with Starter, quiet history log, and Settings reachable from home. Rationale: dev synthesis names Co-pilot as THE primary home action; a tab bar flattens that hierarchy and adds chrome.
- **D-04:** Phase 1 ships the Expo Router skeleton with placeholder screens: `home`, `co-pilot` (session flow stub), `brain-dump`, `starter`, `history`, `settings`. Placeholders render themed, localized shells (proving FND-04/FND-05 on every screen) but no feature logic. Brain dump's ≤2-taps-from-anywhere requirement (DUMP-05) constrains the skeleton: it must be directly reachable from home level, not nested.

**App identity**
- **D-05:** Display name "Trinket", Expo slug `trinket`, bundle/package identifier `com.everon.trinket` (derived from EverOn Games sp. z o.o.). ⚠ PENDING USER CONFIRMATION — identifiers are painful to change after store submission but cheap to change before it; confirm with the founder before any TestFlight/Play upload. Do not block Phase 1 on this.
- **D-06:** EAS configuration (`eas.json` with development/preview/production profiles) is committed in Phase 1, but cloud builds require the user's Expo account login — local `expo prebuild` + `expo run:ios` / `run:android` must work without EAS credentials so development is never blocked.

**Locale behavior**
- **D-07:** First launch resolves locale from the device: system language Polish → PL, anything else → EN. No language-picker screen at first launch (friction). Resolved locale persists to the `settings` repository.
- **D-08:** The i18n layer (i18next) supports runtime locale switching from day one; the user-facing override control ships with the Phase 8 settings screen (SETT-01). Polish plural forms use i18next's CLDR rules (`_one`/`_few`/`_many`/`_other`) — no hand-rolled pluralization.

### Claude's Discretion
- Exact token names/values for the earthy palette (deep night blues/greens, warm amber accents — anchor to "calm night-shift raccoon habitat"; final values swap later anyway)
- MMKV instance layout (single vs. per-domain instances), repository interface shape, Zustand wiring — follow research ARCHITECTURE.md patterns
- Whether to add the no-hardcoded-strings i18n lint rule as ESLint custom rule vs. CI grep — whichever is cheapest to maintain
- Folder structure details, provided feature code is organized as vertical slices per research (co-pilot/, brain-dump/, starter/ arrive in later phases)

### Deferred Ideas (OUT OF SCOPE)
- Light mode theming — v2 (POLI-01); token module should not hard-assume dark-only in its type shape, but no light values are authored now.
- Language-picker onboarding screen — rejected for friction; manual locale override arrives with Phase 8 settings.
- None other — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FND-01 | App runs on iOS and Android from a single Expo codebase (SDK 56, New Architecture, TypeScript strict) with an EAS Build + dev-client + prebuild workflow from day one | §Standard Stack (exact scaffold command pinning SDK 56 via `default@sdk-56` template), §Architecture Patterns Pattern A (CNG/dev-client sequencing), §Environment Availability (sandbox vs. device split), §Validation Architecture |
| FND-02 | All user content (dump items, intentions, sessions, settings) persists locally in MMKV with no daily aggregates and no streak fields in the schema | §Architecture Patterns Pattern B (repository-over-MMKV, v4 `createMMKV()` API), §Code Examples, §Common Pitfalls (Jest/NitroModules), §Don't Hand-Roll |
| FND-04 | App ships a dark-mode theme token module (earthy palette, soft rounded, night-cozy) structured for one-to-one replacement when the external design system lands | §Architecture Patterns Pattern C (token module shape), §Code Examples |
| FND-05 | Every screen renders in Polish and English from localized string files with CLDR-correct Polish plurals; no hardcoded copy | §Architecture Patterns Pattern D (i18next init, CLDR v4 JSON format), §Code Examples (Polish plural block), §Common Pitfalls (i18n retrofit), §Don't Hand-Roll (ESLint plugin) |
</phase_requirements>

## Summary

Phase 1 has one dominant risk and it is sequencing, not technology: every native module this project needs (MMKV, later RevenueCat/STT/Lottie) is Expo-Go-incompatible, so the scaffold must be born on `expo-dev-client` + CNG (`expo prebuild`), never Expo Go, from the very first commit. The concrete scaffold command is `npx create-expo-app@latest trinket --template default@sdk-56 --yes` — this single command pins the project to Expo SDK 56 (dist-tag `sdk-56` → `expo-template-default@56.0.27`, verified live against the npm registry this session) **and** pre-wires Expo Router + TypeScript in one step, which is a meaningfully better starting point than the project-level STACK.md's `blank-typescript` + manual router setup (that template ships with no router at all). This is a current, dated finding: `create-expo-app@latest` with no `--template` flag currently produces an SDK 54 project during the SDK 57 transition window, so the explicit `--template default@sdk-56` flag is not optional polish — it is the only reliable way to land on SDK 56 today.

React Native MMKV v4 introduces a real API surface change from what most training-data-era tutorials show: instances are created with `createMMKV({ id, encryptionKey? })`, not `new MMKV()`. It has no Expo config plugin — `npx expo install react-native-mmkv react-native-nitro-modules` followed by `expo prebuild` is sufficient — but it has a known, currently-unresolved Jest incompatibility (`Failed to get NitroModules`) because Nitro Modules cannot initialize in a Node test environment. Repository unit tests must run against an in-memory mock of the MMKV interface, not the real native binding; the actual on-device persistence claim in success criterion 2 can only be verified on a physical device or dev-client build, which this sandboxed Linux CI-like environment cannot produce (no Xcode, no Android SDK, no physical devices detected).

For localization, i18next 26.x defaults to JSON format v4, which maps directly onto CLDR plural categories (`_one`/`_few`/`_many`/`_other`) via `Intl.PluralRules` — no `compatibilityJSON: 'v3'` override and no ICU plugin are needed; older tutorials recommending `compatibilityJSON: 'v3'` are describing pre-v21 defaults and would be actively wrong to follow here. `eslint-plugin-i18next`'s `no-literal-string` rule (v6.1.5, actively maintained, flat-config-compatible, matching ESLint 10.x that ships with SDK 56 templates) is the cheapest mechanical enforcement for FND-05's zero-hardcoded-copy requirement and should be wired in at scaffold time, not deferred.

One correction to CLAUDE.md's stack guidance surfaced during this research: SDK 55+ has New Architecture permanently on with no way to disable it, and Expo's own docs now recommend *removing* `newArchEnabled` from `app.json` entirely rather than setting it to `true`, since a stale `false` value is silently ignored and the key only invites confusion going forward. Do not add it to `app.json`.

**Primary recommendation:** Scaffold with `create-expo-app@latest --template default@sdk-56 --yes` (Router + TS pre-wired), immediately add `expo-dev-client` + `expo-build-properties`, install MMKV v4 + nitro-modules + zustand + i18next stack via `npx expo install`, commit `eas.json` with three profiles (validated by JSON shape only, since EAS login is unavailable in this sandbox), and treat "app boots on a real device via dev-client" as the one success criterion this research environment cannot itself verify — every other success criterion (repository schema, i18n coverage, theme token discipline, TypeScript strict compile) has an automatable check described in Validation Architecture below.

## Architectural Responsibility Map

> Adapted for a mobile (not web-tiered) architecture per ARCHITECTURE.md's system overview. Tiers here are: **Native Build Layer** (EAS/CNG/dev-client — how the app gets compiled and onto a device), **App Runtime** (React Native JS + Expo Router, in-process), **Local Persistence** (MMKV), **Cross-Cutting** (theme, i18n — consumed by every screen, owned by neither a feature nor a data layer).

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Native module compilation & device deployment | Native Build Layer (EAS + CNG) | — | MMKV v4/RevenueCat/STT/Lottie all require compiled native code; this is infrastructure the app runtime depends on but does not own |
| Navigation / screen shell | App Runtime (Expo Router) | — | File-based routes are pure JS/React, no native dependency of their own |
| User content persistence (sessions/dumpItems/intentions/settings) | Local Persistence (MMKV repositories) | App Runtime (Zustand cache) | Repositories are the durable source of truth; Zustand is a disposable reactive mirror per ARCHITECTURE.md Pattern 2 |
| Visual design tokens | Cross-Cutting (`theme/`) | App Runtime (consumed via `useTheme()`) | Must be swappable independent of any single screen or feature — owned by neither |
| Copy / translated strings | Cross-Cutting (`i18n/`) | App Runtime (consumed via `useTranslation()`) | Same reasoning as theme — every screen is a consumer, no screen owns the string data |
| Build configuration (`app.json`, `eas.json`) | Native Build Layer | — | Governs what native binary gets produced; not part of the JS runtime |

## Project Constraints (from CLAUDE.md)

Directives extracted from `./CLAUDE.md` that bind this phase's plan (same authority as locked CONTEXT.md decisions):

- Use Expo tooling, config plugins, and CNG (`expo prebuild`) instead of hand-editing `ios/`/`android/`. **Never** run `expo eject` or hand-maintain native folders.
- Build with EAS Build + `expo-dev-client` from day one of scaffolding (build order step 1) — not a later migration.
- Expo Go is acceptable only for the first hour of UI/theme/i18n scaffolding, before any native module (MMKV) lands.
- Expo SDK **56** (`~56.0.13`), not SDK 57 — third-party native modules are not yet SDK-57-tested at project start (still true as of this research date; see State of the Art below for the one-day-old status of SDK 57).
- New Architecture is mandatory and default — every native dependency must be New-Architecture-compatible (not opt-in, hard requirement).
- TypeScript `strict: true` extending `"expo/tsconfig.base"`.
- `react-native-mmkv` v4 (`4.3.x`) + `react-native-nitro-modules` peer — hard Expo-Go break, requires prebuild + dev client from the moment it's added.
- Zustand v5 + a thin MMKV-backed `StateStorage` adapter for the settings singleton; **do not** use Zustand-persist for the growing collections (sessions/dumpItems/intentions) — those get the repository pattern.
- `i18next` 26.x + `react-i18next` 17.x + `expo-localization` — CLDR-based Polish pluralization is a hard requirement, rules out simpler i18n libraries.
- Do **not** add `@react-native-async-storage/async-storage` as a second storage engine (not needed until Phase 7's Supabase adapter, and even then a thin MMKV adapter is preferred over adding AsyncStorage).
- Do not add `react-native-mmkv-storage` (the older, unrelated `ammarahm-ed` package) — confirm any MMKV install resolves to `mrousavy/react-native-mmkv`.
- No native modules beyond well-maintained community ones; keep everything MVP inside the app process.
- GSD workflow enforcement: file-changing work in this repo should route through a GSD command (`/gsd-execute-phase`, etc.), not ad hoc edits — this binds the *execution* of this phase's plan, not the research itself.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `expo` | `56.0.13` (dist-tag `sdk-56`) [VERIFIED: npm registry, fetched 2026-07-02] | App framework, CNG, config plugins, EAS | Confirmed still resolvable and current via `npm view expo dist-tags` — `sdk-56: 56.0.13`, distinct from `latest: 57.0.1`. Pin explicitly; do not let tooling drift to 57 mid-scaffold. |
| `expo-template-default` | `56.0.27` (dist-tag `sdk-56`) [VERIFIED: npm registry + official docs.expo.dev/more/create-expo, fetched 2026-07-02] | The `--template default@sdk-56` scaffold template — ships Expo Router + TypeScript pre-wired | Confirmed the SDK-56-pinned template line is actively maintained (v56.0.27, newer than the `expo` package's own 56.0.13, indicating template-only patch releases continue) — not a stale/abandoned branch. |
| `react-native` | 0.85 (bundled by `expo@56.0.13`) | Core runtime | Do not install separately; resolved transitively by `expo install`. |
| `expo-router` | `~56.x` matching SDK, ships in `default@sdk-56` template | File-based navigation | Pre-wired by the `default` template — no manual `@react-navigation/native` wiring needed. Note: SDK 56 decoupled Router's public API from re-exporting `@react-navigation/*` directly in application code; build the theme provider as a custom `theme/ThemeProvider.tsx` (per Pattern C below) rather than relying on Router to re-export React Navigation's `DarkTheme`/`ThemeProvider` — sidesteps an unconfirmed import-path detail entirely. |
| `typescript` | `6.0.3` current stable [VERIFIED: npm registry] | Type safety, strict mode | Matches CLAUDE.md's `~5.9.2` minimum / `6.0.x` target. Extend `"expo/tsconfig.base"` (ships inside the `expo` package as `tsconfig.base.json`, confirmed present via package file listing) and set `"strict": true`. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `expo-dev-client` | `57.0.4` line, resolve via `npx expo install` against the pinned SDK 56 (`expo install` will select the SDK-56-compatible version automatically) [VERIFIED: npm registry] | Enables dev builds with custom native code | Install immediately after scaffold, before MMKV — the moment any native module is planned. |
| `expo-build-properties` | resolve via `npx expo install` (config-plugin-only package, no independent runtime version concern) | Config plugin for native build tuning (e.g., minSdkVersion) | Install alongside `expo-dev-client`; needed if any later phase requires native build property overrides (RevenueCat/ExecuTorch minimums). |
| `react-native-mmkv` | `4.3.2` [VERIFIED: official GitHub README, fetched 2026-07-02 + npm registry] | Local-first storage — all four repositories | v4 rebuilt on Nitro Modules; **API is `createMMKV()`, not `new MMKV()`** — this is a v3→v4 breaking change many blog posts/training data will get wrong. No Expo config plugin needed; standard `expo install` + `expo prebuild` suffices. |
| `react-native-nitro-modules` | `0.36.1` [VERIFIED: npm registry + official MMKV docs] | Required peer for MMKV v4's JSI/Nitro bridging | `peerDependencies: { react: '*', 'react-native': '*' }` — let `expo install` resolve the compatible version; do not pin manually. |
| `zustand` | `5.0.14` [VERIFIED: npm registry] | Reactive in-memory state, MMKV-backed `persist` for the `settings` singleton only | Official MMKV docs ship the exact `StateStorage` adapter shape (see Code Examples) — copy it directly, don't reinvent. |
| `i18next` | `26.3.4` [VERIFIED: official i18next.com docs, fetched 2026-07-02] | Core i18n engine | v4 JSON format (default since v21) natively implements CLDR plural categories via `Intl.PluralRules` — Polish's 4 forms (`_one`/`_few`/`_many`/`_other`) work with zero extra config. |
| `react-i18next` | `17.0.8` [VERIFIED: npm registry] | React bindings (`useTranslation`) | Standard pairing; hooks-based API. |
| `expo-localization` | `57.0.0` line, resolve via `npx expo install` [VERIFIED: official docs.expo.dev/versions/latest/sdk/localization] | Device locale detection (`getLocales()`) | Returns `languageTag` (e.g. `"pl-PL"`) and `languageCode` (e.g. `"pl"`) — use `languageCode === 'pl'` for the D-07 PL/EN resolution rule. |
| `eslint-config-expo` | `57.0.0` line, resolve via `npx expo install` or the scaffold's default lint config [VERIFIED: npm registry] | Base ESLint flat config for Expo/TS/React | Ships with SDK 56+ templates by default; peers on `eslint >= 8.10` (project will get ESLint 10.x transitively). |
| `eslint-plugin-i18next` | `6.1.5`, updated 2026-06-28 (5 days before this research date — actively maintained) [VERIFIED: npm registry + official GitHub README] | ESLint rule (`no-literal-string`) flagging hardcoded JSX text | Flat-config compatible (`eslint-plugin-i18next.configs['flat/recommended']`), matching ESLint 10.x. This is the mechanical enforcement for FND-05's "zero hardcoded copy" requirement — cheaper than a custom rule or CI grep per CONTEXT.md's discretion note. |
| `jest-expo` | `57.0.0` line, resolve via `npx expo install` [VERIFIED: npm registry] | Jest preset mocking native Expo SDK internals | Needed for Validation Architecture's unit test layer (repository logic, i18n plural rendering). |
| `@testing-library/react-native` | `14.0.1` [VERIFIED: npm registry] | Component-level testing utilities | Optional for Phase 1 (mostly placeholder shells) but worth installing now so later phases don't retrofit test tooling. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `default@sdk-56` scaffold template | `blank-typescript` + manual `expo-router` install (STACK.md's original snippet) | Both land on the same end state, but `default@sdk-56` gets there in one command with Router pre-wired and pre-tested against that exact SDK combination by the Expo team, vs. hand-assembling the same pieces and risking a version mismatch during manual `expo install expo-router`. Prefer `default@sdk-56`. |
| Custom `theme/ThemeProvider.tsx` | React Navigation's `ThemeProvider`/`DarkTheme` re-exported via `expo-router` | D-02 already requires a project-owned token module regardless; relying on Router's re-export surface adds an unconfirmed-in-this-session import-path dependency for no benefit, since the app is dark-mode-only anyway (no light/dark runtime switching to delegate to React Navigation). |
| `eslint-plugin-i18next` | Custom ESLint rule, or CI grep for raw JSX text | CONTEXT.md leaves this as Claude's discretion, "whichever is cheapest to maintain" — `eslint-plugin-i18next` is a maintained, current (updated 5 days ago) off-the-shelf rule; a hand-rolled rule or grep script is more maintenance for equivalent coverage. |

**Installation:**
```bash
# Scaffold — pins SDK 56 AND pre-wires Expo Router + TypeScript in one step
npx create-expo-app@latest trinket --template default@sdk-56 --yes
cd trinket

# Dev client + native build tuning (before ANY other native module)
npx expo install expo-dev-client expo-build-properties

# Local storage
npx expo install react-native-mmkv react-native-nitro-modules
npm install zustand

# i18n
npm install i18next react-i18next
npx expo install expo-localization

# Lint enforcement for zero-hardcoded-copy (FND-05)
npm install -D eslint-plugin-i18next

# Test tooling (Validation Architecture, Wave 0)
npx expo install jest-expo jest @testing-library/react-native

# After any native module addition, regenerate native projects:
npx expo prebuild --clean
```

**Version verification:** All versions above were checked live against the npm registry on 2026-07-02 (`npm view <pkg> version` / `dist-tags`). `expo@56.0.13` and `expo-template-default@56.0.27` are both confirmed current on the `sdk-56` dist-tag as of this research date — the same day the project-level STACK.md was researched (2026-07-01), so no drift has occurred. Re-verify at plan-execution time if more than a few days elapse, since `expo` itself is publishing patch releases on the `sdk-56` tag actively (56.0.6 → 56.0.13 across roughly six weeks).

## Package Legitimacy Audit

All 13 packages below were scanned with `slopcheck scan` against a synthetic `package.json`, explicitly on the **npm** ecosystem (the default PyPI-scoped scan incorrectly flagged all of them as `[SLOP]` — this is the documented cross-ecosystem-confusion trap the legitimacy protocol warns about, not a real finding; re-running with npm-scoped detection resolved it cleanly).

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `expo` | npm | years (est.) | very high | github.com/expo/expo | [OK] | Approved |
| `react-native-mmkv` | npm | years (est.) | very high | github.com/mrousavy/react-native-mmkv | [OK] | Approved |
| `react-native-nitro-modules` | npm | ~1-2 yrs (est.) | high (peer of MMKV v4) | github.com/mrousavy/nitro | [OK] | Approved |
| `zustand` | npm | years (est.) | very high | github.com/pmndrs/zustand | [OK] | Approved |
| `expo-router` | npm | years (est.) | very high | github.com/expo/expo | [OK] | Approved |
| `expo-localization` | npm | years (est.) | high | github.com/expo/expo | [OK] | Approved |
| `expo-dev-client` | npm | years (est.) | very high | github.com/expo/expo | [OK] — flagged as "name ends with -client, classic LLM naming pattern" but explicitly confirmed established | Approved |
| `expo-build-properties` | npm | years (est.) | high | github.com/expo/expo | [OK] | Approved |
| `i18next` | npm | years (est.) | very high | github.com/i18next/i18next | [OK] | Approved |
| `react-i18next` | npm | years (est.) | very high | github.com/i18next/react-i18next | [OK] | Approved |
| `eslint-config-expo` | npm | years (est.) | high | github.com/expo/expo | [OK] | Approved |
| `eslint-plugin-i18next` | npm | years (est.) | moderate, actively updated (5 days before research date) | github.com/edvardchen/eslint-plugin-i18next | [OK] | Approved |
| `typescript` | npm | years (est.) | very high | github.com/microsoft/TypeScript | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none (the initial `[SLOP]` verdicts were a PyPI-ecosystem misdetection artifact, corrected by forcing npm-ecosystem scanning; not a genuine finding — see note above)
**Packages flagged as suspicious [SUS]:** none

No `postinstall` scripts were checked individually in this pass (`npm view <pkg> scripts.postinstall`) — recommend the planner add this as a one-line check during the actual `npm install` step for MMKV and nitro-modules specifically, since both compile native code and a malicious postinstall would be a meaningful risk vector; no signal in this research suggests either package has one beyond standard Expo autolinking, which is expected and benign.

## Architecture Patterns

### System Architecture Diagram

```
                    ┌─────────────────────────────────────┐
                    │         Native Build Layer            │
                    │  app.json/eas.json → expo prebuild    │
                    │  → ios/ android/ (generated,          │
                    │  gitignored) → EAS Build or            │
                    │  `expo run:ios`/`run:android`          │
                    │  → dev-client binary on device         │
                    └───────────────┬───────────────────────┘
                                    │ installs & launches
                                    v
┌───────────────────────────────────────────────────────────────────┐
│                   App Runtime (JS, in dev-client)                   │
│                                                                       │
│  app/_layout.tsx  ── mounts ──>  ThemeProvider ── wraps ──> I18nGate │
│       │                                                    │         │
│       │ (Expo Router file-based routes)                    │         │
│       v                                                    v         │
│  app/home.tsx  app/co-pilot.tsx  app/brain-dump.tsx  ...  screens    │
│       │ each screen: useTheme() for tokens, useTranslation() for copy│
│       │                                                               │
│       v                                                               │
│  data/stores/*  (Zustand — reactive cache, optional at Phase 1)      │
│       │                                                               │
│       v                                                               │
│  data/repositories/*  (sessions, dumpItems, intentions, settings)    │
│       │  createMMKV({id}) — typed CRUD functions                     │
│       v                                                               │
└───────┼───────────────────────────────────────────────────────────┘
        v
┌───────────────────────────────────┐
│   Local Storage — MMKV instances    │
│  content: sessions/dumpItems/       │
│           intentions (per-record)   │
│  settings: locale/notif/subscription│
│            (single blob)            │
└─────────────────────────────────────┘
```

A reader tracing the app-boot use case: EAS/CNG produces a device binary → app launches → root layout mounts theme + i18n providers before any screen → Expo Router renders the requested route → the screen reads tokens/copy from the cross-cutting providers and (for Phase 1's walking-skeleton slice) performs one real repository read/write against MMKV to prove the storage layer end-to-end.

### Recommended Project Structure

```
trinket/
├── app/                          # expo-router routes (from `default@sdk-56` template, then extended)
│   ├── _layout.tsx                # root: ThemeProvider + i18n init + font/asset gate
│   ├── home.tsx                    # mascot placeholder box, "Start a session?" CTA
│   ├── co-pilot.tsx                # session flow stub (placeholder shell)
│   ├── brain-dump.tsx              # reachable in ≤2 taps per DUMP-05 constraint
│   ├── starter.tsx
│   ├── history.tsx
│   └── settings.tsx
│
├── data/
│   ├── mmkv.ts                     # createMMKV() instance factory (contentStorage, settingsStorage)
│   ├── repositories/
│   │   ├── sessions.ts
│   │   ├── dumpItems.ts
│   │   ├── intentions.ts
│   │   └── settings.ts
│   └── stores/
│       └── useSettingsStore.ts     # only store needed at Phase 1 (Zustand+persist singleton)
│
├── theme/
│   ├── tokens.ts                    # colors, spacing, radii, typography — hand-authored earthy palette
│   ├── ThemeProvider.tsx
│   └── useTheme.ts
│
├── i18n/
│   ├── index.ts                     # i18next init + expo-localization device detection + persistence
│   ├── locales/
│   │   ├── en.json
│   │   └── pl.json
│   └── useLocale.ts                 # thin wrapper exposing current locale + setter (runtime switch, D-08)
│
├── lib/                              # id generation, date helpers (crypto.randomUUID, etc.)
│
├── app.json                          # name/slug/bundle IDs/userInterfaceStyle:"dark"/plugins
├── eas.json                           # development/preview/production profiles
├── eslint.config.js                   # eslint-config-expo + eslint-plugin-i18next flat config
├── tsconfig.json                      # extends expo/tsconfig.base, strict: true
└── jest.config.js                     # preset: jest-expo (Wave 0 gap — not scaffolded by default)
```

### Pattern A: CNG-first scaffold sequencing (no Expo Go past the first commit)

**What:** Scaffold, then immediately install `expo-dev-client`, then install every other native module (MMKV) before writing feature code — never open the project in the plain Expo Go app once MMKV is in `package.json`.

**When to use:** Always, for this project — MMKV is a hard, non-negotiable dependency and it throws a hard runtime error in Expo Go (`react-native-mmkv is not supported in Expo Go!`).

**Example:**
```bash
# Source: docs.expo.dev/more/create-expo (fetched 2026-07-02) + docs.expo.dev/workflow/continuous-native-generation
npx create-expo-app@latest trinket --template default@sdk-56 --yes
cd trinket
npx expo install expo-dev-client expo-build-properties
npx expo install react-native-mmkv react-native-nitro-modules
npx expo prebuild --clean
# Then, on a machine with Xcode or Android SDK:
npx expo run:ios     # or: npx expo run:android
```

### Pattern B: Repository layer over MMKV v4 (`createMMKV`, not `new MMKV()`)

**What:** Per-record-keyed MMKV storage for the three growing collections, accessed only through typed repository functions; a single JSON-blob instance for the `settings` singleton, wired through Zustand's `persist` middleware.

**When to use:** Collections (`sessions`, `dumpItems`, `intentions`) get the repository pattern (ARCHITECTURE.md Pattern 2); `settings` gets the Zustand-persist-over-MMKV pattern since it's a small, whole-blob-rehydratable singleton.

**Example:**
```typescript
// Source: github.com/mrousavy/react-native-mmkv README (fetched 2026-07-02) — confirms v4 API is createMMKV(), not `new MMKV()`
// data/mmkv.ts
import { createMMKV } from 'react-native-mmkv';

export const contentStorage = createMMKV({ id: 'trinket-content' });
export const settingsStorage = createMMKV({ id: 'trinket-settings' });
```

```typescript
// Source: raw.githubusercontent.com/mrousavy/react-native-mmkv/main/docs/WRAPPER_ZUSTAND_PERSIST_MIDDLEWARE.md (fetched 2026-07-02)
// data/stores/useSettingsStore.ts
import { create } from 'zustand';
import { persist, type StateStorage } from 'zustand/middleware';
import { settingsStorage } from '../mmkv';

const zustandMMKVStorage: StateStorage = {
  setItem: (name, value) => settingsStorage.set(name, value),
  getItem: (name) => settingsStorage.getString(name) ?? null,
  removeItem: (name) => settingsStorage.remove(name),
};

type SettingsState = {
  locale: 'pl' | 'en';
  notificationsOptIn: boolean;
  subscriptionCache: unknown; // populated Phase 7; typed placeholder now
};

export const useSettingsStore = create(
  persist<SettingsState>(
    () => ({ locale: 'en', notificationsOptIn: false, subscriptionCache: null }),
    { name: 'settings', storage: { getItem: zustandMMKVStorage.getItem, setItem: zustandMMKVStorage.setItem, removeItem: zustandMMKVStorage.removeItem } as any }
  )
);
```
Note: `sessions`/`dumpItems`/`intentions` repositories follow ARCHITECTURE.md's `sessionsRepo` example directly (per-record keys + an index key) — that example is already verified against this same v4 API shape (`.set()`/`.getString()` calls on a `createMMKV()`-produced instance), so no changes are needed to that pattern, only to how the instance itself is constructed.

### Pattern C: Theme token module for one-to-one swap

**What:** A single typed `tokens.ts` object (colors, spacing, radii, typography, elevation) consumed everywhere through a `useTheme()` hook — never imported directly by component files. The type shape should not hard-assume dark-only (per the Deferred Ideas note), even though only dark values are authored now.

**Example:**
```typescript
// theme/tokens.ts
export type ThemeTokens = {
  colors: {
    background: string; surface: string; surfaceElevated: string;
    textPrimary: string; textSecondary: string;
    accent: string; accentMuted: string;
    border: string;
  };
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number };
  radii: { sm: number; md: number; lg: number; pill: number };
  typography: {
    fontFamily: string;
    scale: { caption: number; body: number; title: number; display: number };
  };
  elevation: { none: number; low: number; medium: number };
};

// Earthy/night-cozy anchor values — final values swap when Claude Design tokens land (D-01/D-02)
export const darkTokens: ThemeTokens = {
  colors: {
    background: '#14120F',      // near-black warm brown
    surface: '#1F1B16',
    surfaceElevated: '#2A241D',
    textPrimary: '#F2E9DC',
    textSecondary: '#B8AC97',
    accent: '#D89B4A',          // warm amber
    accentMuted: '#8C6B3A',
    border: '#3A3229',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radii: { sm: 8, md: 16, lg: 24, pill: 999 },
  typography: { fontFamily: 'System', scale: { caption: 12, body: 16, title: 20, display: 28 } },
  elevation: { none: 0, low: 2, medium: 6 },
};
```

```typescript
// theme/ThemeProvider.tsx — custom provider, not React Navigation's, per Alternatives Considered
import { createContext, useContext, type PropsWithChildren } from 'react';
import { darkTokens, type ThemeTokens } from './tokens';

const ThemeContext = createContext<ThemeTokens>(darkTokens);
export const ThemeProvider = ({ children }: PropsWithChildren) => (
  <ThemeContext.Provider value={darkTokens}>{children}</ThemeContext.Provider>
);
export const useTheme = () => useContext(ThemeContext);
```

Set `"userInterfaceStyle": "dark"` in `app.json` so native chrome (status bar, system dialogs) also stays dark-locked — this is the native-level counterpart to the JS-level `ThemeProvider` always supplying `darkTokens`.

### Pattern D: i18next init with CLDR Polish plurals, zero `compatibilityJSON` override needed

**What:** Initialize i18next with `initReactI18next`, resources loaded from `pl.json`/`en.json`, locale resolved once at boot from `expo-localization`'s `getLocales()` and persisted to the settings store.

**Example:**
```typescript
// Source: i18next.com/translation-function/plurals (fetched 2026-07-02) — v4 JSON format is the v21+ default, no compatibilityJSON override needed
// i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import en from './locales/en.json';
import pl from './locales/pl.json';

function resolveInitialLocale(): 'pl' | 'en' {
  const primary = getLocales()[0]?.languageCode;
  return primary === 'pl' ? 'pl' : 'en'; // D-07: PL if system is Polish, else EN — no picker
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, pl: { translation: pl } },
  lng: resolveInitialLocale(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  // No compatibilityJSON needed — i18next 26.x defaults to JSON format v4 (CLDR plural categories)
});

export default i18n;
```

```json
// i18n/locales/pl.json — Source: i18next.com/misc/json-format (fetched 2026-07-02)
{
  "sessionsRemaining_zero": "Brak sesji w tym tygodniu",
  "sessionsRemaining_one": "{{count}} sesja pozostała w tym tygodniu",
  "sessionsRemaining_few": "{{count}} sesje pozostałe w tym tygodniu",
  "sessionsRemaining_many": "{{count}} sesji pozostałych w tym tygodniu"
}
```
`_few` applies to counts ending in 2-4 (except 12-14); `_many` applies to 0 and 5+ and teens; `t('sessionsRemaining', { count: n })` selects the right form automatically via `Intl.PluralRules` — the `count` variable name is mandatory (i18next will not pluralize without it).

### Anti-Patterns to Avoid
- **Setting `newArchEnabled` in `app.json`:** As of SDK 55+, New Architecture cannot be disabled and the field is silently ignored — Expo's own docs recommend removing it entirely to avoid confusion, not setting it to `true`. Contradicts CLAUDE.md's literal instruction to "pin it deliberately"; this research supersedes that instruction with a current, verified finding — flagged in Assumptions Log.
- **Using `new MMKV()`:** v3 API, will fail against the installed v4 package. Use `createMMKV()`.
- **Relying on `create-expo-app@latest` with no `--template` flag:** currently produces an SDK 54 project during the SDK 57 transition window (verified against official docs this session) — always pass `--template default@sdk-56` explicitly.
- **Testing MMKV repositories against the real native module in Jest:** Nitro Modules cannot initialize in Node — will throw `Failed to get NitroModules`. Mock the storage interface for unit tests (see Validation Architecture).
- **`compatibilityJSON: 'v3'` in i18next config:** describes pre-v21 defaults; unnecessary and would disable the native CLDR plural handling this project depends on for Polish.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Polish plural forms (`_one`/`_few`/`_many`/`_other`) | A custom `count === 1 ? ... : count < 5 ? ... : ...` branch function | i18next's built-in JSON v4 pluralization (`Intl.PluralRules`-backed) | Polish plural category boundaries are non-trivial (12-14 are `_many` despite ending in 2-4) — this is exactly the class of rule a hand-rolled branch gets subtly wrong, and i18next already implements it correctly with zero extra code. |
| MMKV↔Zustand persistence bridging | A custom AsyncStorage-shaped wrapper from scratch | The documented `StateStorage` adapter from MMKV's own repo (`WRAPPER_ZUSTAND_PERSIST_MIDDLEWARE.md`) | It's a ~10-line, officially-documented pattern; reinventing it risks subtle bugs (e.g., wrong null-coalescing on `getString()`) for zero benefit. |
| Design tokens / theming system | A general-purpose theming library (Tamagui, Restyle, styled-components theme provider) | A single hand-authored `tokens.ts` + `useTheme()` hook (Pattern C) | The requirement is specifically "one file swap" (D-02) for ~5 token categories — a full design-system library is disproportionate scaffolding for what is, at MVP scope, a static token object. |
| Hardcoded-string enforcement | A custom ESLint rule from scratch, or a hand-rolled CI grep script | `eslint-plugin-i18next`'s `no-literal-string` rule | Actively maintained (updated 5 days before this research), flat-config-ready, purpose-built for exactly this enforcement — CONTEXT.md explicitly frames this as "whichever is cheapest," and an off-the-shelf plugin is cheaper than either alternative. |

**Key insight:** Every item on this list is a well-solved problem in the current library ecosystem; the actual differentiated engineering work in this phase is sequencing (native-module-first, before any screen work) and discipline enforcement (token-only styling, translation-key-only copy), not writing new infrastructure.

## Common Pitfalls

### Pitfall 1: `react-native-mmkv` v4 cannot run inside Jest
**What goes wrong:** Any unit test that imports a repository module (which imports `data/mmkv.ts`, which calls `createMMKV()`) throws `Failed to get NitroModules: The native 'NitroModules' Turbo/Native-Module could not be found` when run under Jest's default Node test environment.
**Why it happens:** Nitro Modules (MMKV v4's JSI bridge) require a running native runtime; Jest's Node environment has none. This is a currently-open, unresolved GitHub issue (`mrousavy/react-native-mmkv#945`, opened Oct 2025, no maintainer fix as of this research) [CITED: github.com/mrousavy/react-native-mmkv/issues/945].
**How to avoid:** `jest.mock('react-native-mmkv', ...)` with an in-memory `Map`-backed fake implementing `createMMKV`/`.set()`/`.getString()`/`.remove()`, so repository *logic* (index management, CRUD correctness, schema shape) is unit-testable without the real native binding. The actual on-device persistence guarantee must be verified separately, on a real device or dev-client build (see Validation Architecture).
**Warning signs:** A freshly-scaffolded Jest config with no `jest.mock` for `react-native-mmkv` will fail on the very first repository test — treat this as expected and add the mock at Wave 0, not as a bug to chase.

### Pitfall 2: `create-expo-app@latest` without `--template` silently targets a stale SDK
**What goes wrong:** Running the scaffold command without an explicit template/SDK pin produces an SDK 54 project — two major versions behind the SDK 56 target — with no error or obvious warning.
**Why it happens:** Documented, dated, transitional behavior: "During the SDK 57 transition period, `create-expo-app@latest` without the `--template` flag creates an SDK 54 project" [CITED: docs.expo.dev/more/create-expo, fetched 2026-07-02].
**How to avoid:** Always pass `--template default@sdk-56` explicitly. Verify post-scaffold with `npx expo config --type public | grep sdkVersion` or by checking `package.json`'s `"expo"` version resolves to the `56.x` line before installing anything else.
**Warning signs:** `package.json` shows `"expo": "^54.x.x"` or `"57.x.x"` after running the bare scaffold command.

### Pitfall 3 (inherited from project PITFALLS.md, phase-specific instance): `newArchEnabled` cargo-culted into `app.json`
**What goes wrong:** Following CLAUDE.md's literal wording ("pin it deliberately") and adding `"newArchEnabled": true` to `app.json`.
**Why it happens:** CLAUDE.md predates this phase's research and reflects an earlier-SDK mental model where the flag was meaningful.
**How to avoid:** Omit the field entirely. It is a no-op on SDK 55+ and Expo's own docs recommend removing stale occurrences to avoid confusion [CITED: docs.expo.dev/guides/new-architecture, fetched 2026-07-02].
**Warning signs:** None functionally (the app will behave identically either way) — this is purely a config-hygiene/future-confusion risk, not a runtime bug.

### Pitfall 4 (inherited from PITFALLS.md #2, prevention verification for this phase): Expo Go used past the first hour
**What goes wrong:** A team member opens the project in the plain Expo Go app after MMKV lands in `package.json`, hits the hard native-module error, and treats it as a bug rather than expected behavior.
**How to avoid:** Per Pattern A, install `expo-dev-client` immediately after scaffold, before MMKV. No plan task in this phase should reference "run in Expo Go" once the MMKV install task is complete.

## Code Examples

### `app.json` shape for this phase
```json
{
  "expo": {
    "name": "Trinket",
    "slug": "trinket",
    "scheme": "trinket",
    "userInterfaceStyle": "dark",
    "ios": {
      "bundleIdentifier": "com.everon.trinket",
      "supportsTablet": false
    },
    "android": {
      "package": "com.everon.trinket"
    },
    "plugins": [
      "expo-router",
      "expo-localization"
    ]
  }
}
```
Source: docs.expo.dev/versions/latest/config/app (fetched 2026-07-02) for `ios.bundleIdentifier`/`android.package`/`locales` shape; docs.expo.dev/develop/user-interface/color-themes for `userInterfaceStyle: "dark"` restricting the app to dark theme at the native level. Do not add `newArchEnabled` (see Anti-Patterns). `expo-build-properties` and `expo-dev-client` do not require plugin entries beyond what `expo install` wires automatically for the default template — confirm with `npx expo config --type public` after each install.

### `eas.json` — three profiles, D-06 compliant
```json
{
  "cli": { "version": ">= 20.5.1", "appVersionSource": "remote" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "ios": { "simulator": false }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "distribution": "store"
    }
  }
}
```
Source: docs.expo.dev/eas/json (fetched 2026-07-02). This file is committed and JSON-schema-valid regardless of EAS login state (see Environment Availability) — cloud build *execution* is what requires the user's Expo account, not the file's existence or correctness. `expo run:ios`/`expo run:android` (D-06's local-workflow requirement) do not read `eas.json` at all — they build directly from the CNG-generated `ios/`/`android/` folders.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `new MMKV({ id })` constructor | `createMMKV({ id })` factory function | react-native-mmkv v4 (Nitro Modules rewrite) | Any training-data-era or pre-v4 tutorial code will not compile against the pinned `4.3.2` version. |
| `compatibilityJSON: 'v3'` in i18next config | No override needed; v4 JSON format (CLDR plurals) is default | i18next v21.0.0+ | Tutorials written before v21 (a large fraction of search results) will recommend an unnecessary, actively-counterproductive config override for this project's Polish plural requirement. |
| `expo eject` / bare workflow for native modules | `expo prebuild` (CNG) — regenerate, don't hand-maintain, `ios`/`android` | Standard since Expo SDK 50+, reaffirmed by SDK 55+'s mandatory New Architecture | CLAUDE.md already reflects this; verified still current. |
| `newArchEnabled` as a meaningful toggle | Removed as a functional setting; New Architecture is permanently on, flag is a no-op | SDK 55 (New Architecture became mandatory, no opt-out) | CLAUDE.md's "pin it deliberately" instruction is now slightly stale — this research supersedes it (see Assumptions Log / Anti-Patterns). |
| `create-expo-app@latest` (no template) reliably tracking `latest` SDK | Currently pinned to SDK 54 during the SDK 57 transition window | Observed live, 2026-07-02 (dated, transitional — may resolve itself once SDK 57 stabilizes) | Explicit `--template default@sdk-56` is required regardless of when this transition window ends, since the project target is SDK 56 either way. |

**Deprecated/outdated:** `blank-typescript` template as the Phase 1 starting point (still functional, just requires more manual assembly than `default@sdk-56`, which already includes Router).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `newArchEnabled` should be omitted from `app.json` rather than set to `true`, contradicting CLAUDE.md's literal wording | Anti-Patterns, Pitfall 3, Code Examples | LOW — functionally identical either way per official docs (the field is ignored); worst case is a harmless, slightly-confusing extra config line if this research's reading is wrong. Verified via a direct WebFetch of `docs.expo.dev/guides/new-architecture` this session, so confidence is HIGH this claim is correct, but flagging per protocol since it overrides an explicit CLAUDE.md instruction. |
| A2 | `create-expo-app@latest` without `--template` currently defaults to SDK 54 (not 56 or 57) | Standard Stack, Pitfall 2 | LOW-MEDIUM — this is a dated, transitional claim from a single WebFetch of official docs; if the transition window has closed by plan-execution time, the bare command might behave differently. The mitigation (always pass `--template default@sdk-56` explicitly) is correct regardless of whether this specific claim about the fallback behavior is still true — it makes the fallback behavior irrelevant. |
| A3 | Earthy palette hex values in Pattern C (`#14120F`, `#D89B4A`, etc.) are illustrative anchors, not derived from any design source | Architecture Patterns Pattern C | LOW — CONTEXT.md explicitly delegates exact token values to Claude's discretion and states final values swap later anyway; risk is purely aesthetic, not structural. |
| A4 | Custom `theme/ThemeProvider.tsx` (not React Navigation's `DarkTheme`/`ThemeProvider` re-exported via `expo-router`) is the safer integration point | Standard Stack Alternatives, Pattern C | LOW — avoids depending on an unconfirmed-in-this-session import-path detail (SDK 56's `expo-router`/`@react-navigation` decoupling); a custom provider is strictly simpler for a dark-only app and matches D-02's "token-file replacement" requirement more directly than delegating to a navigation library's theme system. |
| A5 | No `postinstall` script audit was performed per-package (Step 4 of the Package Legitimacy Gate) | Package Legitimacy Audit | LOW — MMKV and nitro-modules both compile native code via standard Expo autolinking (expected, benign); recommend the planner add a one-line `npm view <pkg> scripts.postinstall` check as a task-level guard during actual install, not blocking Phase 1 planning. |

## Open Questions (RESOLVED)

1. **RESOLVED (via plan coverage — 01-01 Task 2 runs `npx expo prebuild --clean` in the sandbox and records the actual outcome in its SUMMARY, per this question's own recommendation.)** **Does `expo prebuild` succeed for the iOS target on this Linux sandbox, or does it require macOS/Xcode even for the config-generation step (not the actual native compile)?**
   - What we know: CNG's `expo prebuild` generates the `ios/`/`android/` project structure from `app.json`+plugins; this is documented as a cross-platform JS/config operation, not requiring Xcode itself.
   - What's unclear: Whether CocoaPods (`pod install`), which typically runs as part of `prebuild`'s iOS step, requires a macOS/Ruby toolchain not present in this sandbox — this was not executed end-to-end in this research session (no project was actually scaffolded and prebuilt).
   - Recommendation: The planner should scope a Wave 0/Wave 1 task that runs `npx expo prebuild --clean` in the actual sandbox and records what succeeds vs. fails, rather than assuming success — this directly informs which parts of FND-01 can be verified automatically vs. deferred to the user's machine (see Environment Availability below for the current best-guess split).

2. **RESOLVED (non-blocking by design — 01-01 Task 1's verify accepts any `56.x` patch via regex; exact resolved version is recorded post-scaffold.)** **Will `--template default@sdk-56` produce a project whose `package.json` `"expo"` entry is exactly `56.0.13`, or could it resolve to a slightly different 56.x patch?**
   - What we know: The template package (`expo-template-default@56.0.27`) and the `expo` package itself (`56.0.13` on the `sdk-56` tag) are versioned independently; the template's own internal `package.json` pins whatever `expo` version was current when that template patch was cut.
   - What's unclear: Exact patch-level `expo` version the scaffolded project will land on without re-running the command at execution time.
   - Recommendation: Non-blocking — any `56.x.x` patch satisfies FND-01's "SDK 56" requirement; the planner should verify the exact resolved version post-scaffold rather than assume `56.0.13` precisely.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All tooling | ✓ | v22.22.2 | — |
| npm | Package install | ✓ | 10.9.7 | — |
| git | Version control | ✓ | 2.43.0 | — |
| Java (JDK) | Android native build toolchain | ✓ | present (`/usr/bin/java`) | — |
| Android SDK / `adb` | `expo run:android`, physical/emulator Android testing | ✗ | — | Use EAS cloud build for Android APKs (requires user's `eas login`, deferred to user's machine); or user installs Android Studio/SDK locally |
| Xcode / `xcodebuild` | `expo run:ios`, iOS Simulator, local iOS builds | ✗ (Linux sandbox — Xcode is macOS-only, no Linux fallback exists) | — | EAS cloud build for iOS (`eas build --platform ios`, requires user's Expo account + Apple Developer enrollment) — this is not optional-with-fallback for iOS specifically, since no Linux-native alternative exists for compiling iOS binaries |
| Watchman | Metro bundler file-watching (performance) | ✗ | — | Metro functions without it, just slower on large file trees — not blocking for MVP-scale project |
| EAS CLI | `eas build`, `eas.json` execution | partially — resolvable via `npx eas-cli@20.5.1` but requires interactive `eas login`, which cannot complete in this non-interactive sandbox | 20.5.1 (npm-confirmed) | User runs `eas login` + cloud builds on their own machine; `eas.json`'s JSON correctness is verifiable in-sandbox without login |
| Physical iOS device | Success criterion 1 (real-device dev-client boot) | ✗ | — | None — this is explicitly out of scope for automated verification in this environment; must happen on the user's hardware |
| Physical Android device | Success criterion 1 (real-device dev-client boot) | ✗ | — | None — same as above; an Android emulator would need the Android SDK, also unavailable here |

**Missing dependencies with no fallback:**
- Physical iOS and Android devices for success criterion 1's actual boot verification — this is a hard split point between what this research/planning environment can verify and what requires the user's own hardware or an EAS cloud build the user must trigger and monitor.
- Xcode/iOS local compilation — no Linux-native substitute exists; iOS builds are EAS-cloud-only or Mac-only, full stop.

**Missing dependencies with fallback:**
- Android SDK/`adb` — EAS cloud build substitutes for local `expo run:android`, though still requires the user's EAS login outside this sandbox.
- Watchman — Metro runs without it, just slower.
- EAS CLI authentication — the CLI binary itself resolves fine via npx; only the interactive login step is blocked here, and it's a one-time, user-side action.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest via `jest-expo` preset (57.0.x line) — **not yet installed**, this is a Wave 0 task |
| Config file | `jest.config.js` — does not exist yet (greenfield repo) |
| Quick run command | `npx jest --watchAll=false` |
| Full suite command | `npx jest --watchAll=false --coverage` (small surface at Phase 1, full suite ≈ quick run) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FND-01 | TypeScript compiles under `strict: true` | static | `npx tsc --noEmit` | ✅ (tsconfig from scaffold) |
| FND-01 | Expo config/dependency compatibility (no version mismatches) | smoke | `npx expo-doctor` | ✅ once project scaffolded |
| FND-01 | `eas.json` is schema-valid with development/preview/production profiles | static | `npx eas config --profile development` (validates without requiring login for local schema parse — confirm at execution time; if this specific subcommand does require auth, fall back to plain `jq . eas.json` for JSON-validity only) | ❌ Wave 0 |
| FND-01 | App actually boots on a real iOS/Android device via dev-client | manual-only | — | N/A — **cannot be automated in this sandbox** (see Environment Availability); this is the one success criterion requiring the user's hardware or a monitored EAS cloud build |
| FND-02 | `sessionsRepo`/`dumpItemsRepo`/`intentionsRepo`/`settingsRepo` CRUD works correctly (create/get/list/update) | unit | `npx jest data/repositories --watchAll=false` (against mocked `react-native-mmkv`, per Pitfall 1) | ❌ Wave 0 |
| FND-02 | No streak/daily-aggregate field exists anywhere in the four schemas | static/unit | A small `npx jest data/repositories/__schema__.test.ts` asserting the TS type's key set excludes a denylist (`streak`, `dailyCount`, `lastActiveDate`, etc.) — cheap, high-value, catches accidental additions in later phases too | ❌ Wave 0 |
| FND-04 | Every screen renders using `useTheme()` tokens, zero hex literals outside `theme/tokens.ts` | static | A grep-based Jest test or small Node script scanning `app/**/*.tsx` and `features/**/*.tsx` for `#[0-9a-fA-F]{3,8}` outside `theme/` | ❌ Wave 0 |
| FND-04 | Dark-mode visual rendering actually looks like the earthy palette (subjective) | manual-only | — | N/A — visual review, not automatable; can be spot-checked via `expo start` in a simulator/emulator if one becomes available, otherwise deferred to device verification |
| FND-05 | Zero raw string literals in JSX (no hardcoded copy) | static | `npx eslint . ` (with `eslint-plugin-i18next`'s `no-literal-string` rule enabled) | ❌ Wave 0 (rule not yet configured) |
| FND-05 | Polish plural forms render correctly for counts 0, 1, 2, 5, 22 | unit | `npx jest i18n --watchAll=false` — assert `i18n.t('sessionsRemaining', {count: n})` against expected Polish strings for each `n` | ❌ Wave 0 |
| FND-05 | Locale resolves to `pl` when device system language is Polish, `en` otherwise, with no picker shown | unit | `npx jest i18n/resolveInitialLocale --watchAll=false` against a mocked `expo-localization` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx tsc --noEmit && npx eslint . && npx jest --watchAll=false` (fast — Phase 1's test surface is small)
- **Per wave merge:** same as above plus `npx expo-doctor`
- **Phase gate:** Full suite green, plus the manual-only device-boot criterion explicitly signed off by the user before `/gsd:verify-work` closes Phase 1 — this cannot be machine-verified and must be tracked as an explicit human checkpoint, not silently skipped.

### Wave 0 Gaps
- [ ] `jest.config.js` — `preset: 'jest-expo'`, needs a `jest.mock('react-native-mmkv', ...)` setup file (Pitfall 1)
- [ ] `data/repositories/__mocks__/react-native-mmkv.ts` (or an equivalent setup-file mock) — in-memory fake implementing `createMMKV`/`.set()`/`.getString()`/`.remove()`
- [ ] `data/repositories/__schema__.test.ts` — denylist check for streak/daily-aggregate fields
- [ ] `eslint.config.js` wiring `eslint-plugin-i18next`'s `no-literal-string` flat-config rule
- [ ] `i18n/index.test.ts` — Polish plural render assertions + locale-resolution unit test
- [ ] Framework install: `npx expo install jest-expo jest @testing-library/react-native` and `npm install -D eslint-plugin-i18next`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | No auth exists until Phase 7 (Supabase) — out of scope this phase |
| V3 Session Management | No | Same as above |
| V4 Access Control | No | Single-user, on-device data; no access-control surface at Phase 1 |
| V5 Input Validation | Minimal | Phase 1 screens are placeholder shells with no real free-text capture yet (that arrives Phase 4); repository functions should still validate shape at the TypeScript type level (no `any` payloads accepted into `.create()`/`.update()`) as a forward-looking discipline, not a blocking control this phase |
| V6 Cryptography | Yes | MMKV supports optional `encryptionKey`/`encryptionType` at instance creation (`createMMKV({ id, encryptionKey, encryptionType: 'AES-256' })`, confirmed via official docs this session). No sensitive data (auth tokens) exists yet at Phase 1, so encrypting the `settings` instance now is a defense-in-depth choice, not a hard requirement — flagged as Claude's discretion (MMKV instance layout) per CONTEXT.md. If deferred, document explicitly that encryption is added in Phase 7 alongside the Supabase session-token adapter, not silently skipped. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| Local device compromise / physical access exposing MMKV-stored content | Information Disclosure | Optional MMKV `encryptionKey` (AES-128 default, AES-256 available), with the key itself held in `expo-secure-store` (iOS Keychain / Android Keystore-backed) rather than hardcoded — deferred to Phase 7 per STACK.md's existing guidance for the Supabase session token, but nothing prevents adopting it for `settings`/`content` storage earlier if the planner chooses |
| Config-plugin/postinstall supply-chain risk (native-compiling packages) | Tampering | Verify no unexpected `postinstall` scripts on `react-native-mmkv`/`react-native-nitro-modules` before installing (Package Legitimacy Audit A5) |
| Accidental sensitive-field addition to the local schema (e.g., a diagnosis-status field, per project's GDPR Art. 9 constraint) | Information Disclosure / regulatory | Enforced structurally per FND-02's denylist test (Validation Architecture) — extend the denylist to also block any field name resembling `diagnosis`/`adhd_status` as a forward-looking guard, even though Phase 1's schemas don't include one today |

## Sources

### Primary (HIGH confidence)
- `docs.expo.dev/more/create-expo` (fetched 2026-07-02) — template names, `--template default@sdk-56` syntax, current SDK-54-fallback transitional behavior, `--yes`/`--no-install` flags
- `docs.expo.dev/guides/new-architecture` (fetched 2026-07-02) — New Architecture mandatory since SDK 55, `newArchEnabled` is a no-op, recommendation to remove it
- `docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough` (fetched 2026-07-02) — `npm install expo@^56.0.0` + `expo install --fix` pinning mechanism
- `docs.expo.dev/versions/latest/sdk/localization` (fetched 2026-07-02) — `getLocales()` shape, `languageCode`/`languageTag`
- `docs.expo.dev/eas/json` (fetched 2026-07-02) — `eas.json` development/preview/production profile shape
- `docs.expo.dev/versions/latest/config/app`, `docs.expo.dev/develop/user-interface/color-themes`, `docs.expo.dev/guides/localization` (WebSearch, cross-referenced 2026-07-02) — `bundleIdentifier`/`package`/`userInterfaceStyle`/`locales` app.json keys
- `github.com/mrousavy/react-native-mmkv` README (fetched 2026-07-02) — v4 `createMMKV()` API, no config plugin needed, multi-instance/encryption options
- `github.com/mrousavy/react-native-mmkv/blob/main/docs/WRAPPER_ZUSTAND_PERSIST_MIDDLEWARE.md` (fetched 2026-07-02) — exact Zustand `StateStorage` adapter code
- `github.com/mrousavy/react-native-mmkv/issues/945` (fetched 2026-07-02) — Jest/NitroModules incompatibility, unresolved as of research date
- `i18next.com/translation-function/plurals`, `i18next.com/misc/json-format` (fetched 2026-07-02) — JSON format v4 default since v21, CLDR plural category behavior, exact `_one`/`_few`/`_many`/`_other` semantics
- `github.com/edvardchen/eslint-plugin-i18next` (fetched 2026-07-02) — `no-literal-string` rule, flat-config setup
- npm registry, queried live 2026-07-02: `expo`, `expo-template-default`, `react-native-mmkv`, `react-native-nitro-modules`, `zustand`, `i18next`, `react-i18next`, `expo-localization`, `expo-router`, `expo-dev-client`, `eslint-config-expo`, `eslint-plugin-i18next`, `typescript`, `jest-expo`, `@testing-library/react-native`, `eas-cli`, `expo-doctor` — all version/dist-tag facts in this document
- `slopcheck` v0.6.1 scan (executed 2026-07-02, npm-ecosystem-scoped) — 13/13 packages `[OK]`, no `[SLOP]`/`[SUS]` findings

### Secondary (MEDIUM confidence)
- Project-level `.planning/research/STACK.md`, `.planning/research/ARCHITECTURE.md`, `.planning/research/PITFALLS.md` (2026-07-01) — inherited stack/architecture/pitfall baselines this phase research extends and, in two places (scaffold template choice, `newArchEnabled` handling), refines with dated corrections

### Tertiary (LOW confidence)
- WebSearch results on general i18next/Expo Router setup patterns (2026-07-02) — used only to identify which official docs to fetch next; not cited directly as authoritative where an official source was subsequently confirmed

## Metadata

**Confidence breakdown:**
- Standard stack (versions, scaffold command): HIGH — every version/command verified live against npm registry and official docs this session
- Architecture (repository/theme/i18n patterns): HIGH — directly sourced from official MMKV/i18next docs plus the already-verified project ARCHITECTURE.md
- Pitfalls (Jest/MMKV, SDK-54-fallback, `newArchEnabled`): HIGH — each backed by a specific official-source fetch or the live npm registry, not training-data recall
- Validation architecture (test mapping): MEDIUM — the test *shapes* are standard, but no project exists yet to execute against, so exact command behavior (e.g., `eas config --profile development`'s auth requirement) is reasoned, not executed, in this session
- Environment availability (sandbox capability split): HIGH for what's absent (directly probed: no `xcodebuild`, no `adb`, no `watchman`), MEDIUM for exactly how far `expo prebuild` gets on this Linux sandbox before failing (not executed end-to-end)

**Research date:** 2026-07-02
**Valid until:** ~14 days (Expo's `sdk-56` dist-tag is patching roughly weekly; the SDK-57-transition `create-expo-app` fallback behavior is explicitly noted as transitional and may change without notice) — re-verify package versions and the bare-scaffold-command behavior if plan execution is delayed past mid-July 2026.

---
*Phase 1 research for: Trinket (ADHD companion app, React Native + Expo)*
*Researched: 2026-07-02*
