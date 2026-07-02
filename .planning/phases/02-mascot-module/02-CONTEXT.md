# Phase 2: Mascot Module - Context

**Gathered:** 2026-07-02
**Status:** Ready for planning

<domain>
## Phase Boundary

The raccoon mascot exists as a reusable, feature-agnostic `<Mascot />` module that can express presence across any screen that hosts it. It renders 5 animation states (greeting, idle, presence, dozing, acknowledge) via placeholder Lottie assets with final-art-compatible slot names, plays 3+ randomized idle micro-behaviors, structurally cannot prompt/demand/show negative expressions (MASC-03), and animates smoothly on low/mid-tier Android with a single persistent LottieView and lazy-loaded loops under 300 KB each (MASC-01..04).

This phase builds the module and its assets/contracts — it does NOT wire the mascot into feature flows (Co-pilot presence/dozing triggers are Phase 3; Settings prominence UI is Phase 8).

</domain>

<decisions>
## Implementation Decisions

### Placeholder art style
- **D-01:** Placeholder Lottie loops are **abstract geometric** — a soft "breathing" orb/blob using the `mascotGlow` amber (`#F2C988`), with a distinct shape/motion per state. Unmistakably temporary, calm, on-brand. NOT a raccoon-suggestive silhouette, NOT sourced CC animations.
- **D-02:** Placeholders must be authored with the exact 5 slot filenames (`assets/mascot/mascot_<state>.json`) and the 3 idle marker names (`blink`, `glance`, `postureShift`) from the UI-SPEC, so the founder's final raccoon art is a pure drop-in replacement with zero code changes.

### iOS verification scope
- **D-03:** Phase 2 is **Android-only for device verification** — Lottie smoothness (MASC-04, roadmap success criterion 4) is verified on the user's real Android hardware. The iOS physical-device dev-client boot gate stays **deferred** (remains a hard gate before Phase 9; carry the blocker forward in STATE.md — do not close it this phase).
- **D-04:** The plan must explicitly include the native-module steps: `npx expo install lottie-react-native`, `npx expo prebuild --clean`, and an Android dev-client rebuild. The phase completion message must include the "run `npx expo prebuild --clean` after pulling" note (CLAUDE.md agent rule — native inputs change this phase).

### Prominence persistence
- **D-05:** Add `mascotProminence: 'prominent' | 'subtle' | 'hidden'` (default `'prominent'`) to the **existing Phase 1 `settings` MMKV repo/store this phase**. The module itself never reads the setting (stays feature-agnostic); hosts read it and pass the `prominence` prop. The Settings screen UI to change it lands in Phase 8 — only the field + default ship now.

### UI-SPEC flag deferrals (all accepted as recommended)
- **D-06:** Custom font loading (Fraunces/Inter/JetBrains Mono via expo-font) is **deferred out of Phase 2** — module renders no text; `fontFamily: 'System'` unchanged. Revisit at Phase 6 Onboarding.
- **D-07:** Greeting re-trigger cadence is a **host decision using an in-memory app-session flag** (greet once per cold launch). Never a persisted "last greeted at" timestamp — that would be a disguised daily-aggregate field the Phase 1 schema denylist test exists to catch.
- **D-08:** Only `colors.mascotGlow: '#F2C988'` is added to `theme/tokens.ts` this phase. `mascotGlowDeep` (`#E8B05C`) is NOT pre-added — only if placeholder/final `presence` art gives a concrete reason for two glow intensities.

### Claude's Discretion
- Placeholder animation authoring approach (hand-authored JSON, After Effects/Bodymovin, or programmatic generation) — whatever reliably produces <300 KB assets with the required markers.
- Micro-behavior scheduler implementation details (hook vs. internal component logic), within the UI-SPEC's interval/weighting contract.
- Test strategy for animation states (the LottieView will need mocking under Jest, mirroring the Phase 1 native-module mock precedent).
- Exact Reanimated usage for the 120ms/200ms transition fade.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design contract (primary)
- `.planning/phases/02-mascot-module/02-UI-SPEC.md` — APPROVED UI design contract: state→slot mapping with triggers, idle micro-behavior markers/intervals/weights, prominence scale, public `MascotProps` API, transition contract (single persistent LottieView + 120ms fade), asset & perf contract (<300 KB, lazy load, size-gate script), reduced-stimulus contract, accessibility label copy. Decisions there are LOCKED.

### Design system
- `design/DESIGN-SYSTEM.md` — landed palette/typography reference, dual-accent rule (terracotta = action, amber = mascot-only), constraint watch-items.
- `design/mockups/62e728e6-Copilot___session_active.html` — mascot presence state in context (dark screen).
- `design/mockups/01341ce6-Home.html` — mascot on the Home hub.
- `design/mockups/fae1f5f8-Settings___profile.html` — "Mascot · Presence · Prominent" settings row the prominence field maps to.

### Project constraints
- `CLAUDE.md` — PDA-aware interaction grammar (mascot never demands/prompts — hard), shame-free design (hard), Lottie loops lazy + <300 KB (hard), token-only styling via `useTheme()`, i18next-only copy, prebuild convention + agent rule for native-input changes.
- `.planning/REQUIREMENTS.md` — MASC-01..04 (lines 20-23).
- `.planning/ROADMAP.md` — Phase 2 section: goal, Mode: mvp, 4 success criteria.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/MascotSlot.tsx` — Phase 1 placeholder integration seam this module replaces/absorbs; its rounded `surfaceElevated` box becomes the module's loading/error fallback treatment; its `accessibilityLabel` prop pattern carries into `MascotProps`.
- `theme/tokens.ts` + `useTheme()` — landed dark tokens; `mascotGlow` gets added here (the one type change this phase).
- Phase 1 `settings` MMKV repo + Zustand-persist singleton — receives the `mascotProminence` field (D-05).
- `scripts/check-hex-literals.mjs` — fail-closed gate pattern to mirror for the new Lottie asset size-check script (fail build if any `assets/mascot/*.json` > 300 KB).
- `__mocks__/` native-module mock precedent (expo-localization, react-native-mmkv) — pattern for mocking `lottie-react-native` under Jest.
- `i18n/locales/{en,pl}.json` — accessibility label keys land under a new `mascot.accessibility.*` namespace; Polish register is warm/plain/gender-neutral.

### Established Patterns
- Token-only styling enforced by `npm run lint:hex` (fail-closed) — `#F2C988` may only appear in `theme/tokens.ts`.
- ESLint `i18next/no-literal-string` — any label copy must go through `t()` keys (module receives translated strings via props; keys live host-side).
- Repositories-over-MMKV data access; schema denylist test structurally forbids streak/daily-aggregate/diagnosis fields — D-07's no-persisted-greeting-timestamp decision protects this.
- TDD RED→GREEN commit pairing precedent from Phase 1 (01-04/01-05) where tests exercise implementation.
- `npm run verify` (eslint + hex gate + jest) is the verification bundle; `npm run android:fresh` exists for prebuild+run.

### Integration Points
- Home screen (`src/app/` route from Plan 01-06) currently mounts `MascotSlot` — Phase 2 swaps it for the real `<Mascot />` in idle state (greeting on cold launch per D-07).
- `lottie-react-native` is a NET-NEW native dependency: `npx expo install`, config check for New Architecture compatibility, `npx expo prebuild --clean`, Android dev-client rebuild — first native change since scaffold.
- Phase 3 (Co-pilot) will drive `presence`/`dozing`/`acknowledge` via the `state` prop + `onStateAnimationComplete`; Phase 8 (Settings) will surface `mascotProminence`. This phase only ships the contracts they consume.

</code_context>

<specifics>
## Specific Ideas

- Placeholder aesthetic: "soft breathing orb/blob" in the amber `mascotGlow` tone — calm, ambient, distinctly non-demanding; each state gets a distinct motion signature (e.g. greeting = brief rise/bloom, idle = slow breathe, presence = steady warm pulse, dozing = slower/dimmer breathe, acknowledge = single gentle bounce/settle) so state transitions are visible even with abstract art.
- The module must feel like "the mascot's habitat is the app" — it never visually demands attention; micro-behaviors are noticed, not announced.

</specifics>

<deferred>
## Deferred Ideas

- **iOS physical-device dev-client boot verification** — deliberately NOT closed this phase (D-03); remains a carried hard-gate blocker before Phase 9. First natural retry window: any phase where an EAS build or Mac access happens.
- **Custom font loading (Fraunces/Inter/JetBrains Mono)** — Phase 6 Onboarding is the leading candidate (first display-quality heading: "Hi. I'm glad you're here.").
- **`mascotGlowDeep` second glow token** — only when art concretely needs two glow intensities.
- **Settings screen UI for prominence** — Phase 8 (field ships now, UI later).
- **Final raccoon Lottie art** — pending from founder; drops into the placeholder slots with zero code changes.

</deferred>

---

*Phase: 02-mascot-module*
*Context gathered: 2026-07-02*
