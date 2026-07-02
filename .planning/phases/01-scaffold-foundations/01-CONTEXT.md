# Phase 1: Scaffold & Foundations - Context

**Gathered:** 2026-07-02
**Status:** Ready for planning

<domain>
## Phase Boundary

The app boots on real iOS and Android devices via EAS dev-client (not Expo Go) with all native infrastructure in place: Expo SDK 56 + New Architecture + TypeScript strict, MMKV-backed repositories for all four collections (`sessions`, `dumpItems`, `intentions`, `settings`) with no streak/daily-aggregate fields, a dark-mode earthy theme token module structured for one-to-one swap, PL/EN i18n with CLDR-correct Polish plurals and zero hardcoded strings, and a navigable route skeleton. Feature behavior (Co-pilot sessions, brain dump capture, etc.) belongs to later phases — Phase 1 delivers the habitat, not the inhabitants.

Requirements: FND-01, FND-02, FND-04, FND-05.

</domain>

<decisions>
## Implementation Decisions

> Interactive discussion was unavailable in this remote session (AskUserQuestion permission stream closed; user instructed to continue). All four identified gray areas were resolved by Claude with recommended defaults. Any of these can be overridden before `/gsd:plan-phase 1` by editing this file.

### Theme fidelity
- **D-01:** Build a genuine attempt at the written visual direction now — earthy palette, night-time cozy atmosphere, soft rounded shapes, dark mode only — not a neutral gray placeholder. Rationale: the UI is "the mascot's habitat"; screens composed against a neutral scaffold would invite rework in every later phase.
- **D-02:** Every visual value (color, radius, spacing, typography scale, elevation) lives in the `theme/` token module; components consume tokens only, never literals. When the external Claude Design system arrives, the swap must be a token-file replacement, not a component refactor. Enforce via lint rule or code-review convention against hex literals outside `theme/`.

### App shell layout
- **D-03:** Home-hub, not a tab bar. Home screen is the mascot's habitat: mascot area (placeholder box in Phase 1, real module in Phase 2), primary "Start a session?" action (Co-pilot), prominent secondary Brain dump access, with Starter, quiet history log, and Settings reachable from home. Rationale: dev synthesis names Co-pilot as THE primary home action; a tab bar flattens that hierarchy and adds chrome.
- **D-04:** Phase 1 ships the Expo Router skeleton with placeholder screens: `home`, `co-pilot` (session flow stub), `brain-dump`, `starter`, `history`, `settings`. Placeholders render themed, localized shells (proving FND-04/FND-05 on every screen) but no feature logic. Brain dump's ≤2-taps-from-anywhere requirement (DUMP-05) constrains the skeleton: it must be directly reachable from home level, not nested.

### App identity
- **D-05:** Display name "Trinket", Expo slug `trinket`, bundle/package identifier `com.trinket.app` — CONFIRMED. Founder decision made at the Phase 1 (Plan 06) device-boot checkpoint, superseding the provisional `com.everon.trinket` value (the app belongs to a separate, not-yet-named business, so the identifier is brand-only rather than derived from EverOn Games sp. z o.o.). Caveat: Play package-name and iOS bundle-ID uniqueness are only definitively proven at first store submission — if either is taken, a fallback identifier will need to be chosen then.
- **D-06:** EAS configuration (`eas.json` with development/preview/production profiles) is committed in Phase 1, but cloud builds require the user's Expo account login — local `expo prebuild` + `expo run:ios` / `run:android` must work without EAS credentials so development is never blocked.

### Locale behavior
- **D-07:** First launch resolves locale from the device: system language Polish → PL, anything else → EN. No language-picker screen at first launch (friction). Resolved locale persists to the `settings` repository.
- **D-08:** The i18n layer (i18next) supports runtime locale switching from day one; the user-facing override control ships with the Phase 8 settings screen (SETT-01). Polish plural forms use i18next's CLDR rules (`_one`/`_few`/`_many`/`_other`) — no hand-rolled pluralization.

### Claude's Discretion
- Exact token names/values for the earthy palette (deep night blues/greens, warm amber accents — anchor to "calm night-shift raccoon habitat"; final values swap later anyway)
- MMKV instance layout (single vs. per-domain instances), repository interface shape, Zustand wiring — follow research ARCHITECTURE.md patterns
- Whether to add the no-hardcoded-strings i18n lint rule as ESLint custom rule vs. CI grep — whichever is cheapest to maintain
- Folder structure details, provided feature code is organized as vertical slices per research (co-pilot/, brain-dump/, starter/ arrive in later phases)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product brief (constraints are non-negotiable)
- `.planning/source/trinket-dev-synthesis-v0.1.md` §2 (hard constraints), §6 (technical architecture, data model sketch, localization), §7 (design system / visual tone anchors)

### Research (stack versions, patterns, pitfalls)
- `.planning/research/STACK.md` — exact library choices and versions (Expo SDK 56, react-native-mmkv v4 + nitro-modules, zustand 5, i18next 26 + react-i18next 17, expo-localization); resolve versions via `npx expo install`, not raw npm
- `.planning/research/ARCHITECTURE.md` — repository-over-MMKV layering (per-record keys for collections, Zustand-persist for settings), module boundaries, vertical-slice folder structure
- `.planning/research/PITFALLS.md` — Pitfall 2 (Expo Go native-module wall → dev-client from day one) and Pitfall 5 (i18n retrofit pain → lint from first screen) are Phase 1's assigned pitfalls
- `.planning/research/SUMMARY.md` §Phase 1 — phase-scoped synthesis of the above

### Project instruction file
- `CLAUDE.md` — stack table with version compatibility notes (MMKV v4 requires `react-native-nitro-modules` peer; PostHog peers installed later)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield repository containing only `.planning/` and `CLAUDE.md`. Phase 1 creates the first code.

### Established Patterns
- None in code yet. Patterns to establish here (they become precedent for all later phases): token-only styling, repository-over-MMKV data access, translation-key-only copy, vertical-slice feature folders.

### Integration Points
- `.planning/source/trinket-dev-synthesis-v0.1.md` §6.2 defines the data model sketch the repositories must implement (`dump_items`, `intentions`, `sessions`, `settings`) — schema field names should match it.
- Phase 2 (Mascot) will mount into the home screen's mascot area; leave an explicit slot component.
- Phase 7 introduces Supabase auth — no Supabase client or account concept in Phase 1.

</code_context>

<specifics>
## Specific Ideas

- Visual tone anchors from the brief: "soft rounded shapes, earthy palette, night-time cozy atmosphere, hand-drawn quality. The mascot is a calm night-shift raccoon; UI should feel like its habitat."
- Gate copy grammar established project-wide: UI offers ("Start a session?"), never instructs — applies to placeholder copy written in this phase too.
- Data model dogma: "if a stat can only be used for pressure, it does not exist in the schema" — success criterion 2 checks for absence of streak/daily-aggregate fields.

</specifics>

<deferred>
## Deferred Ideas

- Light mode theming — v2 (POLI-01); token module should not hard-assume dark-only in its type shape, but no light values are authored now.
- Language-picker onboarding screen — rejected for friction; manual locale override arrives with Phase 8 settings.
- None other — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Scaffold & Foundations*
*Context gathered: 2026-07-02*
