# Walking Skeleton — Trinket

**Phase:** 1
**Generated:** 2026-07-02

## Capability Proven End-to-End

On a dev-client build, a user opens Trinket, lands on a dark-themed, PL/EN-localized home-hub, taps the "Start a session?" offer which writes a real session record to MMKV via `sessionsRepo`, and opens the History screen to see that persisted session listed — proving scaffold + routing + theme + i18n + MMKV persistence + one real UI interaction end-to-end.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Expo SDK 56 (RN 0.85, React 19.2), New Architecture (default, no `newArchEnabled` flag) | Pinned by CLAUDE.md; SDK 57 not yet native-module-tested at project start. New Arch is mandatory on SDK 55+; the flag is a no-op and omitted per Expo docs. |
| Build model | CNG (`expo prebuild`) + `expo-dev-client` + EAS Build from day one; never Expo Go past scaffold | Every native module (MMKV v4, later RevenueCat/STT/Lottie) hard-fails in Expo Go. ios/ and android/ are gitignored build artifacts, never hand-edited. |
| Language / navigation | TypeScript strict (extends expo/tsconfig.base) + Expo Router (file-based, home-hub not tabs) | Router pre-wired by `default@sdk-56` template. Home-hub keeps Co-pilot as THE primary action (D-03); tabs would flatten that hierarchy. |
| Data layer | react-native-mmkv v4 (`createMMKV`, NOT `new MMKV()`) + nitro-modules; per-record + index-key repositories for collections; Zustand `persist` over an MMKV StateStorage adapter for the settings singleton | ARCHITECTURE.md Pattern 2. No streak/daily-aggregate/diagnosis fields — enforced by a schema denylist test. No daily boundaries. |
| Theme | Hand-authored `theme/tokens.ts` (earthy night-cozy dark palette) consumed only via `useTheme()`; custom ThemeProvider (not React Navigation's) | D-01/D-02: token-only styling so the future Claude Design system swap is a one-file replacement. A hex-literal gate enforces color-values-only-in-theme. Type shape is light-mode-ready (deferred POLI-01). |
| i18n | i18next 26 + react-i18next 17 + expo-localization; JSON v4 (no compatibilityJSON) for CLDR Polish plurals; device-locale resolution at boot (pl if system Polish, else en; no picker); runtime switch ready | FND-05 + D-07/D-08. eslint-plugin-i18next `no-literal-string` mechanically forbids hardcoded copy from the first screen (Pitfall 5). |
| Auth / backend | NONE in Phase 1 | Supabase auth is introduced only at Phase 7 (purchase/restore). No account concept, no network in the core loop. |
| MMKV encryption | Deferred to Phase 7 (documented, not silently skipped) | No sensitive data (auth tokens) exists yet; encryption is defense-in-depth added alongside the Supabase session-token adapter (RESEARCH Security Domain V6). |
| Directory layout | Vertical-slice-ready: `app/` (routes), `data/` (mmkv, repositories, stores), `theme/`, `i18n/`, `lib/`, `components/` | Feature folders (co-pilot/, brain-dump/, starter/) arrive in later phases; cross-cutting concerns (theme, i18n, data) are owned by neither a feature nor a screen. |

## Stack Touched in Phase 1

- [x] Project scaffold (framework, build config, lint, test runner) — Plans 01, 02
- [x] Routing — six real home-hub routes via Expo Router — Plan 06
- [x] Database — real MMKV read AND write via repositories (sessions/dumpItems/intentions/settings) — Plan 05, exercised in Plan 06
- [x] UI — the home "Start a session?" offer writes a real session; History reads it — Plan 06
- [x] Deployment — `eas.json` dev/preview/production profiles committed; documented local + EAS dev-client build path (device boot is a human checkpoint) — Plans 01, 06

## Out of Scope (Deferred to Later Slices)

- Real mascot animation — `components/MascotSlot.tsx` is only a placeholder box; the Lottie mascot module is Phase 2 (MASC-*).
- Any session lifecycle logic (timers, dozing, mood check, force-quit reconciliation) — Phase 3 (PILOT-*). Phase 1 writes only a minimal session record to prove persistence.
- Brain dump capture (text/voice/classification) — Phase 4. Phase 1 ships only the reachable placeholder screen.
- Starter intention builder — Phase 5.
- Onboarding screens — Phase 6.
- Subscriptions, Supabase auth, RevenueCat — Phase 7.
- Settings controls (locale override UI, notification toggle UI) + analytics allowlist — Phase 8 (the i18n runtime switch + settings store exist; the UI does not).
- Offline-correctness sweep, performance on low-end hardware, copy audit — Phase 9.
- MMKV encryption + expo-secure-store — Phase 7.
- Light mode theming — v2 (POLI-01); token type shape is ready, no light values authored.

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- Phase 2: Mascot module renders greeting/idle/presence/dozing/acknowledge states into `MascotSlot`.
- Phase 3: Co-pilot end-to-end session (start from three paths, presence, warm ending, force-quit reconciliation) on the `sessions` repository.
- Phase 4: Brain dump capture (text + on-device STT + rule-based categorization) on the `dumpItems` repository, promotable into a session.
- Phase 5: Starter implementation-intention builder on the `intentions` repository.
- Phase 6: Onboarding (<=3 skippable screens) stitching the first-run path.
- Phase 7: Subscription infrastructure + freemium gate (RevenueCat + Supabase auth introduced here).
- Phase 8: Settings screen + analytics allowlist/audit.
- Phase 9: Beta hardening (offline correctness, low-end performance, copy audit).
