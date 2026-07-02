# Phase 2: Mascot Module - Research

**Researched:** 2026-07-02
**Domain:** React Native/Expo native-module integration (Lottie animation), client-side state-machine + scheduler logic, no backend surface
**Confidence:** HIGH (install/config path, marker-authoring path, RN core APIs) / MEDIUM (exact lottie-react-native imperative-API edge cases — verified against official docs but not executed on-device yet)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

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

### Deferred Ideas (OUT OF SCOPE)
- **iOS physical-device dev-client boot verification** — deliberately NOT closed this phase (D-03); remains a carried hard-gate blocker before Phase 9. First natural retry window: any phase where an EAS build or Mac access happens.
- **Custom font loading (Fraunces/Inter/JetBrains Mono)** — Phase 6 Onboarding is the leading candidate (first display-quality heading: "Hi. I'm glad you're here.").
- **`mascotGlowDeep` second glow token** — only when art concretely needs two glow intensities.
- **Settings screen UI for prominence** — Phase 8 (field ships now, UI later).
- **Final raccoon Lottie art** — pending from founder; drops into the placeholder slots with zero code changes.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|--------------------|
| MASC-01 | Mascot renders greeting, idle, presence, dozing, and acknowledge states via placeholder Lottie assets with final-art-compatible slot names | Standard Stack (`lottie-react-native` install path, no config plugin needed), Architecture Patterns Pattern 2 (minimal hand-authored placeholder JSON per state), Validation Architecture test map |
| MASC-02 | Idle state plays 3+ randomized micro-behaviors (blink, posture shift, glance) on randomized intervals | Architecture Patterns Pattern 1 (marker resolution from `require()`-d JSON, no native marker API exists), Code Examples (weighted-pick + interval functions), Pitfall 4 (scheduler pause/resume correctness) |
| MASC-03 | Mascot only reacts to user actions — it never initiates, prompts, or demands; no negative/sad/disappointed states exist in the asset set | Architecture Patterns Anti-Patterns, Validation Architecture (structural test guarding the `MascotState` union to exactly 5 values, mirroring the schema-denylist source-scan pattern) |
| MASC-04 | Mascot animates smoothly on low/mid-tier Android (single persistent LottieView, lazy-loaded loops under 300 KB each) | Standard Stack (New Architecture Fabric support confirmed, `.lottie`-format pitfall avoided), Asset & perf contract patterns (lazy `require()` + cache), Validation Architecture (size-gate script + Android device `checkpoint:human-verify`) |
</phase_requirements>

## Summary

Phase 2 adds exactly one net-new native dependency, `lottie-react-native@7.3.8`, to an Expo SDK 56 / New Architecture / TypeScript-strict project that has no prior native-module additions since scaffold (MMKV and Reanimated are already present from Phase 1's baseline template, but Reanimated has never actually been used in app code yet). The library needs no Expo config plugin and no `app.json` entry — it is a standard autolinked native module, confirmed by inspecting its published npm tarball (no `app.plugin.js`, no `expo` field in `package.json`). Install path is exactly what D-04 already specifies: `npx expo install lottie-react-native`, `npx expo prebuild --clean`, then an Android dev-client rebuild (`npm run android:fresh` already exists for this).

The single hardest technical question in this phase — how to play the three named idle markers (`blink`, `glance`, `postureShift`) — resolves cleanly once one fact is established: **`lottie-react-native`'s public JS API has no marker-name-aware playback method.** The only imperative playback control is `play(startFrame, endFrame)` with numeric frame arguments (plus `pause`/`resume`/`reset`). There is no documented `getAnimationMarkers()`. This is not a blocker, because the placeholder (and eventually final) Lottie JSON is `require()`-d as a plain JS object in Metro's bundler — the standard Lottie/Bodymovin `markers` array (`{ cm: <name>, tm: <start frame>, dr: <duration in frames> }`) is present directly on that imported object in JS memory. The module's own code reads `source.markers` at mount time, builds a `{ blink: [start,end], glance: [start,end], postureShift: [start,end] }` lookup, and calls the numeric `play(start, end)` API — no native marker API is needed at all. This pattern only works because we control asset authoring (D-02 requires exact marker names); the final-art drop-in must preserve the same `markers` array shape or the same lookup breaks silently (documented as a pitfall below).

CLAUDE.md's flagged risk ("`.lottie` file format rendering issues... as recently as SDK 53") is real but does not apply to this phase's asset choice: the confirmed New-Architecture-on-Android bug (`lottie-react-native` issue #1394) is specific to the binary `.lottie` (dotLottie/zip) format being mis-parsed as JSON when loaded via `require()` under Fabric — it does not affect plain `.json` Lottie files, which is exactly what D-02 and the UI-SPEC already specify (`mascot_<state>.json`). Recommend explicitly avoiding the `.lottie` format for this reason, not just for simplicity.

Reanimated (`react-native-reanimated@4.3.1` + `react-native-worklets@0.8.3`) is already an installed dependency (pulled in by the SDK 56 template) but unused in app code so far — this phase is its first real usage, for the 120ms/200ms opacity fade. No manual Babel plugin wiring is needed: `babel-preset-expo` auto-applies `react-native-worklets/plugin` whenever `react-native-worklets` is present in `node_modules`, and the project has no custom `babel.config.js` overriding that default — confirmed by its absence in the repo root.

**Primary recommendation:** Build `<Mascot />` as a single component owning one persistent `LottieView` ref, a small internal `useIdleScheduler` hook (setTimeout-based, re-scheduling on each fire, paused during one-shot states), a marker-lookup table derived once per loaded idle asset via `source.markers`, and a Reanimated `useAnimatedStyle` opacity wrapper around the `LottieView` container for state-transition fades. Author all 5 placeholder assets as hand-written minimal Bodymovin JSON (simple shape layers, keyframed opacity/scale/position) — each will be well under 1KB, nowhere near the 300KB gate, making the size-check script important for the *future* final-art swap, not for placeholders.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Mascot state rendering (Lottie playback) | Client (RN component, JS+native UI thread) | — | Pure on-device rendering; no server round-trip exists or is needed |
| Idle micro-behavior scheduling (interval/weight logic) | Client (component-local hook, JS thread) | — | Timer-driven, ephemeral, resets on unmount; no persistence requirement |
| Marker frame-range resolution | Client (build-time via Metro `require()` + runtime JS read of `source.markers`) | Static Assets (bundled JSON) | Metro bundles the JSON as a JS object at build time; no native/backend involvement |
| `mascotProminence` setting | Local Storage (MMKV via existing `settings` Zustand-persist store) | Client (host reads + passes prop) | Extends Phase 1's already-landed local-first settings singleton; module itself never reads storage directly (feature-agnostic contract) |
| Reduced-stimulus signal | OS (AccessibilityInfo, device-level) | Client (Settings toggle, in-app override) | Combines an OS-level signal with an app-level explicit override via logical OR, per UI-SPEC |
| Transition fade (Reanimated) | Client (UI thread via worklets) | — | Cosmetic-only client animation; no cross-tier dependency |
| Asset lazy-loading + caching | Client (component instance memory) + Static Assets (bundle) | — | `require()` per state on first activation, cached in a ref map for instance lifetime, per UI-SPEC's perf contract |

No Frontend-Server/API/Backend tier involvement exists in this phase by design — MASC-01..04 and the UI-SPEC are explicitly a pure client-side module with zero network/backend surface.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|---------------|
| `lottie-react-native` | `7.3.8` [VERIFIED: npm registry, `npm view lottie-react-native version`, 2026-07-02] | Renders the 5 state Lottie JSON assets on a single persistent `LottieView`, exposes imperative `play(startFrame, endFrame)`/`pause`/`resume`/`reset` | Already fixed by CLAUDE.md's stack table and D-04; this is the maintained successor to the original `airbnb/lottie-react-native` (now under the `lottie-react-native` GitHub org), New Architecture (Fabric) support merged since v6 (PR #910, Android fabric functional; iOS fabric added in a later release), actively released as recently as 2026-05-14 |
| `react-native-reanimated` | `4.3.1` (already installed) [VERIFIED: package.json] | Drives the 120ms/200ms container opacity fade on state transitions | Already present from SDK 56 template; zero-new-dependency choice explicitly favored by CONTEXT.md's "Claude's Discretion" note on Reanimated usage — using it over plain `Animated` avoids a second animation mental model for a codebase that already ships the library |
| `react-native-worklets` | `0.8.3` (already installed, peer of Reanimated 4) [VERIFIED: package.json] | Required peer for Reanimated 4's worklet execution model (split out of `react-native-reanimated` itself as of v4) | Already installed; `babel-preset-expo` auto-wires `react-native-worklets/plugin` when this package is present and no custom `babel.config.js` overrides the default — confirmed no `babel.config.js` exists in this repo |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-native` core `AccessibilityInfo` | bundled with RN 0.85 | `isReduceMotionEnabled()` + `addEventListener('reduceMotionChanged', ...)` for the OS-level half of the reduced-stimulus contract | Standard, long-stable RN core API — no separate package needed [CITED: reactnative.dev/docs/accessibilityinfo] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-authored placeholder JSON | After Effects + Bodymovin plugin export | AE/Bodymovin produces a "real" export pipeline but requires a design tool this project doesn't have installed/licensed; hand-authored minimal JSON is trivially smaller, trivially controllable for marker names, and Claude's Discretion explicitly allows this approach |
| Plain `.json` Lottie assets | `.lottie` (dotLottie zip) format via `@lottiefiles/dotlottie-react` (optional peer) | `.lottie` hits a confirmed New-Architecture-on-Android bug (`require()`-loaded `.lottie` mis-parsed as JSON, issue #1394) — plain `.json` sidesteps this entirely and matches D-02's filenames already |
| Reanimated for the fade | Plain RN `Animated` API | Reanimated is already installed and runs the fade on the UI thread (no JS-thread jank risk under a loaded idle-scheduler timer); `Animated` would avoid touching Reanimated for the first time, but the discretion note in CONTEXT.md already leans Reanimated and it's zero marginal dependency cost |
| setTimeout-based idle scheduler | `react-native-reanimated`'s `withDelay`/worklet-driven scheduling | The scheduler drives **business logic** (which marker to play next, JS-side `LottieView.play()` calls) — this must run on the JS thread regardless, so plain `setTimeout`/`setInterval` inside a hook is simpler and avoids mixing UI-thread worklets with JS-thread imperative Lottie calls |

**Installation:**
```bash
npx expo install lottie-react-native
npx expo prebuild --clean
npm run android:fresh
```

**Version verification:** `npm view lottie-react-native version` → `7.3.8`, published 2026-05-14 (per npm registry `time.modified`). No newer version exists as of research date. `react-native-reanimated@4.3.1` and `react-native-worklets@0.8.3` are already pinned in `package.json` — do not `expo install` these again unless a version mismatch warning appears; `expo install` will otherwise silently attempt to "correct" already-compatible versions.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|--------------|-----------|-------------|
| `lottie-react-native` | npm | 9 years (first published 2017-02-01) | high (long-standing, widely used RN Lottie wrapper; exact weekly count not queried) | github.com/lottie-react-native/lottie-react-native | OK | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

slopcheck 0.6.1 was installed and run successfully (`slopcheck scan --pkg npm lottie-react-native --json` → `"status": "OK"`). This package was already a fixed/named dependency in CLAUDE.md (not discovered via this session's WebSearch), and its identity/version was independently confirmed via `npm view` (registry ground truth) plus a direct fetch of its official GitHub repository and published npm tarball contents — so it qualifies for `[VERIFIED: npm registry]` per the provenance rule, not merely `[ASSUMED]`.

## Architecture Patterns

### System Architecture Diagram

```
Host screen (e.g. src/app/index.tsx)
  │
  │  passes props: state, prominence, reducedStimulus, accessibilityLabel, onStateAnimationComplete
  ▼
<Mascot />  (src/components/Mascot/Mascot.tsx)
  │
  ├─► useReducedStimulus()  ──► AccessibilityInfo.isReduceMotionEnabled() + change listener
  │                              (OR'd with host-passed reducedStimulus prop)
  │
  ├─► useMascotAssets()  ──► lazy require('@/assets/mascot/mascot_<state>.json') per state,
  │                           cached in a useRef map keyed by MascotState (loaded once per instance)
  │
  ├─► useIdleScheduler(active: state === 'idle', reducedStimulus)
  │       │
  │       │  every 4-9s (normal) / 12-24s (reduced-stimulus):
  │       │  weighted-random pick from [blink 50%, glance 30%, postureShift 20%]
  │       ▼
  │   lottieRef.current.play(marker.startFrame, marker.endFrame)
  │       │
  │       │  (marker frame ranges resolved once from the loaded idle
  │       │   asset's `markers` array: { blink: [s,e], glance: [s,e], postureShift: [s,e] })
  │       ▼
  │   on completion (via onAnimationFinish or a timed fallback), resume the base idle loop
  │
  ├─► <Animated.View style={fadeStyle}>          ◄── Reanimated useAnimatedStyle,
  │     └─► <LottieView ref={lottieRef}               opacity 0→1 over 120ms (200ms reduced-stimulus)
  │           source={currentAsset}                    on every state prop change
  │           loop={state !== 'greeting' && state !== 'acknowledge'}
  │           autoPlay
  │           onAnimationFinish={...}
  │         />
  │   </Animated.View>
  │
  └─► prominence === 'hidden' → renders null height-0 wrapper, but scheduler/state logic
      keeps running internally (module still "tracks its logical state")
```

### Recommended Project Structure
```
src/components/Mascot/
├── Mascot.tsx              # public component, MascotProps contract, single LottieView owner
├── useIdleScheduler.ts      # interval + weighted-marker-pick hook, pausable
├── useReducedStimulus.ts    # AccessibilityInfo OR host-prop combiner hook
├── markers.ts               # reads a loaded Lottie asset's `markers` array into {name: [start,end]}
├── types.ts                 # MascotState, MascotProminence, MascotSize, MascotProps
└── __tests__/
    ├── Mascot.test.tsx
    ├── useIdleScheduler.test.ts
    └── markers.test.ts
assets/mascot/
├── mascot_greeting.json
├── mascot_idle.json         # carries the markers array (blink/glance/postureShift)
├── mascot_presence.json
├── mascot_dozing.json
└── mascot_acknowledge.json
scripts/
└── check-mascot-asset-size.mjs   # mirrors check-hex-literals.mjs's fail-closed pattern
__mocks__/
└── lottie-react-native.tsx  # View stub + ref methods (play/pause/resume/reset) as jest.fn()
```

### Pattern 1: Marker lookup from a `require()`-d Lottie JSON

**What:** Read the standard Lottie `markers` array directly off the imported JSON object (no native API call) to resolve named segments to numeric frame ranges.
**When to use:** Any time `lottie-react-native`'s `play(startFrame, endFrame)` needs to target a named section of a single continuous asset (this phase's idle micro-behaviors).
**Example:**
```typescript
// Source: synthesized from lottiefiles.github.io/lottie-docs/schema/ (markers schema)
// + github.com/lottie-react-native/lottie-react-native/blob/master/docs/api.md
// (confirmed play(startFrame, endFrame) is the only frame-range playback API —
// no marker-name-aware method exists in the public JS API).

type MascotAssetJSON = {
  markers?: Array<{ cm: string; tm: number; dr: number }>;
  // ...other Lottie/Bodymovin fields (v, fr, ip, op, w, h, layers, assets)
};

type MarkerRange = { startFrame: number; endFrame: number };

export function resolveMarkers(asset: MascotAssetJSON): Record<string, MarkerRange> {
  const table: Record<string, MarkerRange> = {};
  for (const marker of asset.markers ?? []) {
    table[marker.cm] = { startFrame: marker.tm, endFrame: marker.tm + marker.dr };
  }
  return table;
}

// Usage inside the idle scheduler:
const markers = resolveMarkers(idleAsset); // { blink: {...}, glance: {...}, postureShift: {...} }
const { startFrame, endFrame } = markers.blink;
lottieRef.current?.play(startFrame, endFrame);
```

### Pattern 2: Minimal hand-authored Lottie JSON (placeholder assets)

**What:** A valid, tiny Bodymovin-schema JSON that Metro/Lottie-Android/Lottie-iOS can render without any design tool.
**When to use:** Authoring all 5 placeholder assets this phase (D-01, geometric "breathing orb").
**Example:**
```json
// Source: synthesized from lottiefiles.github.io/lottie-docs/schema/ (minimal required
// top-level fields: w, h, fr, ip, op, layers) — a "breathing" idle loop with one
// scale-keyframed ellipse shape layer and a markers array for blink/glance/postureShift.
{
  "v": "5.9.0",
  "fr": 30,
  "ip": 0,
  "op": 300,
  "w": 220,
  "h": 220,
  "nm": "mascot_idle",
  "markers": [
    { "cm": "blink", "tm": 60, "dr": 12 },
    { "cm": "glance", "tm": 120, "dr": 30 },
    { "cm": "postureShift", "tm": 200, "dr": 45 }
  ],
  "layers": [
    {
      "ddd": 0,
      "ty": 4,
      "nm": "orb",
      "ip": 0,
      "op": 300,
      "st": 0,
      "ks": {
        "o": { "a": 0, "k": 100 },
        "p": { "a": 0, "k": [110, 110, 0] },
        "s": {
          "a": 1,
          "k": [
            { "t": 0, "s": [90, 90, 100] },
            { "t": 90, "s": [105, 105, 100] },
            { "t": 180, "s": [90, 90, 100] },
            { "t": 300, "s": [90, 90, 100] }
          ]
        }
      },
      "shapes": [
        {
          "ty": "el",
          "p": { "a": 0, "k": [0, 0] },
          "s": { "a": 0, "k": [160, 160] }
        },
        {
          "ty": "fl",
          "c": { "a": 0, "k": [0.949, 0.788, 0.533, 1] },
          "o": { "a": 0, "k": 100 }
        }
      ]
    }
  ]
}
```
Notes: `c` (fill color) is an RGBA 0-1 array — `[0.949, 0.788, 0.533, 1]` is `#F2C988` (`mascotGlow`) converted to 0-1 float. **This hex value belongs inside the Lottie JSON asset file, not in component/screen `.tsx` code** — `scripts/check-hex-literals.mjs` only scans `src/app/**/*.tsx`, `src/features/**/*.tsx`, `src/components/**/*.tsx`, so embedding the color inside `assets/mascot/*.json` does not trip the hex-literal gate and does not need a token reference (JSON can't import from `theme/tokens.ts`) — document this as an accepted, deliberate exception in the plan, not an oversight.

### Pattern 3: Jest mock for `lottie-react-native`

**What:** A `View` stub exposing the imperative ref API as `jest.fn()`s, mirroring the existing `__mocks__/react-native-mmkv.ts` / `__mocks__/expo-localization.ts` precedent.
**When to use:** Every test that renders `<Mascot />` or exercises the idle scheduler against a mocked `LottieView`.
**Example:**
```typescript
// __mocks__/lottie-react-native.tsx
// Source: pattern mirrors __mocks__/react-native-mmkv.ts's forwardRef+jest.fn() shape;
// LottieView's real imperative API (play/pause/resume/reset) confirmed via
// github.com/lottie-react-native/lottie-react-native/blob/master/docs/api.md
import { forwardRef, useImperativeHandle } from 'react';
import { View, type ViewProps } from 'react-native';

export type LottieViewProps = ViewProps & {
  source: unknown;
  loop?: boolean;
  autoPlay?: boolean;
  onAnimationFinish?: (isCancelled: boolean) => void;
};

export type LottieViewRef = {
  play: jest.Mock;
  pause: jest.Mock;
  resume: jest.Mock;
  reset: jest.Mock;
};

const LottieView = forwardRef<LottieViewRef, LottieViewProps>((props, ref) => {
  useImperativeHandle(ref, () => ({
    play: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    reset: jest.fn(),
  }));
  return <View testID="lottie-view-mock" {...props} />;
});

export default LottieView;
```
Register with `jest.mock('lottie-react-native')` in `jest.setup.ts`, alongside the existing `react-native-mmkv`/`expo-localization` mock registrations.

### Anti-Patterns to Avoid
- **Two mounted `LottieView` instances for a crossfade:** UI-SPEC explicitly forbids this (MASC-04's single-persistent-view contract) — use the `Animated.View` opacity wrapper pattern above instead, never a second `<LottieView>`.
- **Reading markers via a native method that doesn't exist:** do not write code that calls `lottieRef.current.getAnimationMarkers()` or similar — it is not part of the public API and will throw/be `undefined`. Read `source.markers` in JS instead (Pattern 1).
- **Persisting "next micro-behavior due at" as a timestamp:** the scheduler's interval state should live in a `useRef`/component-local timer, never written to MMKV — matches D-07's "no persisted last-X timestamp" precedent and avoids a disguised daily-aggregate-adjacent field.
- **Eagerly `require()`-ing all 5 state JSONs at module import time:** violates the lazy-load perf contract (MASC-04) even though placeholder files are tiny — the final art may not be, and the pattern must be right from day one so the artist's drop-in doesn't silently break the lazy-load contract.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Lottie JSON rendering/playback engine | A custom SVG/Skia animation renderer | `lottie-react-native`'s native `LottieView` | Already the fixed stack choice (CLAUDE.md); reinventing frame-accurate vector animation playback is enormous scope for a module whose job is "render 5 small loops" |
| Weighted-random selection | A bespoke probability library | A ~10-line manual weighted-pick function (cumulative-weight array + `Math.random()`) | 3 fixed items with fixed weights (50/30/20) is too small a problem to justify a dependency; hand-rolling a *generic* weighted-random utility is fine, hand-rolling a *statistics library* is not needed |
| Reduced-motion OS detection | A custom native module polling accessibility settings | `AccessibilityInfo.isReduceMotionEnabled()` (RN core) | Already a first-class RN API; no gap to fill |

**Key insight:** This phase's complexity is almost entirely in *orchestration* (scheduler timing, marker lookup, transition sequencing), not in needing new libraries — the two libraries required (`lottie-react-native`, already-installed `react-native-reanimated`) are both already fixed/available; nearly everything else is small, testable, hand-written glue code, which is appropriate given the phase's contract is narrow and well-specified by the UI-SPEC.

## Common Pitfalls

### Pitfall 1: `.lottie` (dotLottie) format silently breaks on Android New Architecture
**What goes wrong:** A `.lottie` binary asset loaded via `require()` gets its resolved bundler URL passed to `setAnimationFromUrl()`, which assumes JSON and throws `Use JsonReader.setLenient(true) to accept malformed JSON at path $` because the file is actually a ZIP archive.
**Why it happens:** Confirmed open issue `lottie-react-native/lottie-react-native#1394` — the New Architecture asset-resolution path doesn't sniff for ZIP magic bytes before attempting JSON parse.
**How to avoid:** Never introduce `.lottie` assets in this module — D-02 and the UI-SPEC already specify plain `.json`, which sidesteps this bug entirely. Document this explicitly as *why*, not just *what*, so a future contributor doesn't "upgrade" to `.lottie` for file-size reasons without knowing this risk.
**Warning signs:** A "malformed JSON" crash log immediately after adding any `.lottie` file, specifically on Android with New Architecture enabled (which is unconditional on SDK 55+, so effectively always).

### Pitfall 2: Marker lookup breaks silently if final art renames or drops markers
**What goes wrong:** If the founder's final raccoon art JSON either renames `blink`/`glance`/`postureShift` or the export tool encodes marker names as JSON-stringified `cm` values (e.g. `cm: '{"name":"blink"}'` — a real pattern seen from some LottieFiles-originated exports) rather than a plain string, `resolveMarkers()` silently returns an empty/wrong lookup and the scheduler has no valid frame ranges to play — `play(undefined, undefined)` either no-ops or throws.
**Why it happens:** The Lottie/Bodymovin spec doesn't rigidly standardize marker comment encoding across every export tool; different After Effects plugin versions have historically wrapped marker names differently.
**How to avoid:** Write `resolveMarkers()` defensively — attempt `JSON.parse(marker.cm).name` first, fall back to the raw `marker.cm` string if parsing fails — and add a unit test asserting both encodings resolve correctly. Add a runtime `console.warn` (never user-facing) if a required marker name (`blink`/`glance`/`postureShift`) is missing after asset load, so a broken final-art drop-in fails loud in dev logs, not silently in production.
**Warning signs:** Idle micro-behaviors stop firing (or throw) immediately after swapping in new `mascot_idle.json` art with no code changes.

### Pitfall 3: `expo install` "correcting" already-pinned Reanimated/Worklets versions
**What goes wrong:** Running `npx expo install lottie-react-native` is safe, but running a blanket `npx expo install` (no package name) or `npx expo install --check` afterward may flag `react-native-reanimated`/`react-native-worklets` as version-mismatched against SDK 56's expected range and offer to "fix" them, potentially downgrading/upgrading versions that were deliberately pinned by the original template scaffold.
**Why it happens:** `expo install`'s compatibility table is a general SDK-wide recommendation, not aware of a project's specific already-verified-working pin.
**How to avoid:** Install `lottie-react-native` by explicit name only (`npx expo install lottie-react-native`), never a bare `npx expo install` sweep, during this phase.
**Warning signs:** `package.json` diff shows unrelated version bumps to `react-native-reanimated`/`react-native-worklets` after running the install command.

### Pitfall 4: Idle scheduler firing during a one-shot state, causing overlapping playback
**What goes wrong:** If the `setTimeout` scheduling loop isn't explicitly paused when `state` transitions away from `'idle'` (e.g. to `'greeting'` or `'acknowledge'`), a previously-scheduled micro-behavior timer can fire mid-one-shot and call `play()` against the wrong loaded asset (or against a `LottieView` mid-transition), producing visible glitching — directly undermining MASC-04's smoothness requirement.
**Why it happens:** `setTimeout` IDs scheduled while `idle` was active don't automatically know the component's `state` changed by the time they fire, unless the effect explicitly clears/re-derives on every `state` change.
**How to avoid:** `useIdleScheduler`'s effect must depend on `state` (or an explicit `active` boolean derived from it) and clear the pending timeout in its cleanup function every time `state` changes away from `'idle'`, matching UI-SPEC's explicit "micro-behaviors never fire during a `greeting`/`acknowledge` one-shot" contract. Unit-test this transition directly (mount in idle, advance timers, switch to `greeting`, advance timers again, assert `play()` was not called with idle-marker frame ranges during the one-shot window).
**Warning signs:** Flaky/rare-looking glitch reports that don't reproduce consistently — timer-race pitfalls are load/timing-dependent and easy to miss in casual manual testing.

## Code Examples

### Weighted-random micro-behavior pick
```typescript
// Source: hand-rolled per UI-SPEC's weights (blink 50%, glance 30%, postureShift 20%)
type MicroBehavior = 'blink' | 'glance' | 'postureShift';

const WEIGHTS: Array<[MicroBehavior, number]> = [
  ['blink', 0.5],
  ['glance', 0.3],
  ['postureShift', 0.2],
];

export function pickWeightedMicroBehavior(random: () => number = Math.random): MicroBehavior {
  const roll = random();
  let cumulative = 0;
  for (const [behavior, weight] of WEIGHTS) {
    cumulative += weight;
    if (roll < cumulative) return behavior;
  }
  return WEIGHTS[WEIGHTS.length - 1][0]; // floating-point fallback
}
```
Accepting an injectable `random` function (defaulting to `Math.random`) makes the weight distribution itself unit-testable deterministically (seed a fake RNG returning fixed values, assert the expected behavior is picked at each boundary) without flaky statistical assertions over many runs.

### Randomized interval selection
```typescript
// Source: hand-rolled per UI-SPEC's 4000-9000ms (normal) / 12000-24000ms (reduced-stimulus)
export function nextIdleIntervalMs(reducedStimulus: boolean, random: () => number = Math.random): number {
  const [min, max] = reducedStimulus ? [12000, 24000] : [4000, 9000];
  return min + random() * (max - min);
}
```

### Reanimated opacity fade wrapper
```typescript
// Source: synthesized from docs.swmansion.com/react-native-reanimated (useSharedValue,
// useAnimatedStyle, withTiming — stable, long-established Reanimated 3/4 API surface)
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';

function useFadeOnStateChange(state: string, reducedStimulus: boolean) {
  const opacity = useSharedValue(1);
  const durationMs = reducedStimulus ? 200 : 120;

  useEffect(() => {
    opacity.value = 0;
    opacity.value = withTiming(1, { duration: durationMs });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: re-fade on every state change
  }, [state]);

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-------------------|---------------|--------|
| `airbnb/lottie-react-native` (original org) | `lottie-react-native/lottie-react-native` (community-maintained fork/continuation) | ongoing since Airbnb stepped back from active maintenance | The package name on npm (`lottie-react-native`) is unchanged; only the GitHub org/maintainers moved — install command is identical, no migration action needed |
| `react-native-reanimated/plugin` Babel plugin | `react-native-worklets/plugin` | Reanimated v4 split worklets into a standalone package | Already correctly resolved in this project — `react-native-worklets` is installed and `babel-preset-expo` auto-applies the new plugin path; no manual `babel.config.js` edit needed unless a future SDK bump removes that auto-wiring |

**Deprecated/outdated:**
- Legacy Architecture (`newArchEnabled: false`) — not a supported configuration on SDK 55+ (already documented in CLAUDE.md); every recommendation in this document assumes New Architecture is always on.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | `lottie-react-native`'s New Architecture Fabric support (Android + iOS) is stable enough in `7.3.8` for a small looping-shape-layer asset, with no additional Fabric-specific configuration beyond standard autolinking | Standard Stack, Architecture Patterns | If iOS Fabric support has residual rough edges, D-03 already defers iOS device verification out of this phase, so the immediate risk is scoped to Android only — low practical risk this phase, but flag before Phase 9's iOS gate closes |
| A2 | The `markers` array survives unmodified through Metro's JSON `require()` bundling (no stripping of "unknown" Lottie fields) | Architecture Patterns Pattern 1 | If Metro or a JSON transform strips fields it doesn't recognize, marker lookup would return an empty table at runtime — mitigated by writing a unit test that imports the actual placeholder asset and asserts `markers` is present and non-empty, which will fail loudly in CI rather than silently in production if this assumption is wrong |
| A3 | A hand-authored minimal Bodymovin JSON (Pattern 2's shape) renders correctly on both `lottie-android` and `lottie-ios` without needing fields beyond the minimal schema shown | Architecture Patterns Pattern 2 | If a required-but-undocumented field is missing, the placeholder may fail to render (falls back to the static `surfaceElevated` box per the Copywriting Contract's error-state rule — a *safe* failure mode, not a crash, but still needs the Android device checkpoint to confirm) |

## Open Questions

1. **Does `onAnimationFinish` fire for `play(startFrame, endFrame)` segment playback the same way it does for full-loop playback, or does it only fire for the asset's own declared `op` (out point)?**
   - What we know: `onAnimationFinish` is documented as a prop for full animation completion; the API doc excerpt available didn't clarify segment-specific firing behavior.
   - What's unclear: whether the idle scheduler can rely on `onAnimationFinish` to know a micro-behavior segment finished playing (to resume the base loop), or whether it must use a `setTimeout` sized to the marker's known duration (`dr` in frames ÷ `fr` frame rate) instead.
   - Recommendation: default to the `setTimeout`-based approach (duration is already known from the marker's own `dr`/`fr` at authoring time — no need to depend on an animation-finish callback's segment-awareness at all), and treat `onAnimationFinish` as reserved for the one-shot `greeting`/`acknowledge` full-play completion only, where it unambiguously applies. Confirm behavior empirically during the Android device checkpoint if timing feels off.

2. **Exact weekly-download / community-health figures for `lottie-react-native` were not queried** (Package Legitimacy Audit's Downloads column is qualitative, not a verified number).
   - What we know: 9-year-old package, actively released (May 2026), the de facto standard Lottie wrapper for React Native, already named in CLAUDE.md's fixed stack.
   - What's unclear: precise current weekly download count (not fetched this session).
   - Recommendation: not needed for planning — package identity/legitimacy is already well-established via age, GitHub org activity, and slopcheck's OK verdict; a numeric download count would not change any decision here.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `jest` `~29.7.0` via `jest-expo` `~56.0.5` (already configured, `jest.config.js` + `jest.setup.ts`) |
| Config file | `/home/user/Trinket/jest.config.js` |
| Quick run command | `npm test -- --testPathPattern=Mascot` |
| Full suite command | `npm test` (aliased inside `npm run verify`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|--------------|
| MASC-01 | `<Mascot />` renders each of the 5 states via the correct `mascot_<state>.json` slot, calling `LottieView`'s mocked `source` prop with the right asset | unit (RTL render + mock assertions) | `npm test -- Mascot.test.tsx` | ❌ Wave 0 |
| MASC-01 | `onStateAnimationComplete('greeting')` / `('acknowledge')` fires after the mocked one-shot completes | unit | `npm test -- Mascot.test.tsx` | ❌ Wave 0 |
| MASC-02 | `useIdleScheduler` fires a micro-behavior within the 4-9s (normal) / 12-24s (reduced-stimulus) window, using fake timers | unit | `npm test -- useIdleScheduler.test.ts` | ❌ Wave 0 |
| MASC-02 | `pickWeightedMicroBehavior` respects the 50/30/20 weight boundaries deterministically (injected fake RNG) | unit | `npm test -- useIdleScheduler.test.ts` (or a dedicated `weightedPick.test.ts`) | ❌ Wave 0 |
| MASC-02 | Scheduler pauses while `state` is `greeting`/`acknowledge` and resumes on return to `idle` (Pitfall 4) | unit (fake timers, state transition sequence) | `npm test -- useIdleScheduler.test.ts` | ❌ Wave 0 |
| MASC-03 | Structural test: `MascotState` type union has exactly the 5 allowed values, and a grep/AST-level guard confirms no 6th state string literal exists in `Mascot.tsx`/`types.ts` | unit (type-level + source-scan test, mirroring `schema.denylist.test.ts`'s source-scan pattern) | `npm test -- Mascot.test.tsx` (or a dedicated `noNegativeStates.test.ts`) | ❌ Wave 0 |
| MASC-04 | Asset size gate: every `assets/mascot/*.json` is under 300KB | unit/script (fail-closed, mirrors `check-hex-literals.mjs`) | `node scripts/check-mascot-asset-size.mjs` | ❌ Wave 0 |
| MASC-04 | Only one `<LottieView>` is ever mounted per `<Mascot />` instance, including mid-transition (render + rapid state-prop changes, assert mock call count / instance count) | unit (RTL) | `npm test -- Mascot.test.tsx` | ❌ Wave 0 |
| MASC-04 | Smoothness on real low/mid-tier Android hardware | manual (human checkpoint, not automatable) | N/A — `checkpoint:human-verify` on Android device per D-03/D-04 | N/A |
| D-05 | `mascotProminence` field added to `settings` store/repo with default `'prominent'`, and the schema denylist test still passes with the new field present | unit (extend existing `repositories.test.ts` + `schema.denylist.test.ts` already cover this shape) | `npm test -- repositories.test.ts schema.denylist.test.ts` | ✅ (files exist, extend coverage) |

### Sampling Rate
- **Per task commit:** `npm test -- --testPathPattern=Mascot` (or the specific new test file for that task)
- **Per wave merge:** `npm test` (full suite) + `node scripts/check-mascot-asset-size.mjs`
- **Phase gate:** `npm run verify` (eslint + hex gate + full jest suite) green, plus the Android device `checkpoint:human-verify` for MASC-04's smoothness criterion, before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/Mascot/__tests__/Mascot.test.tsx` — covers MASC-01, MASC-03, MASC-04 (single-instance contract)
- [ ] `src/components/Mascot/__tests__/useIdleScheduler.test.ts` — covers MASC-02 (interval, weighting, pause/resume)
- [ ] `src/components/Mascot/__tests__/markers.test.ts` — covers Pattern 1's `resolveMarkers()` (plain-string and JSON-stringified `cm` encodings, per Pitfall 2)
- [ ] `__mocks__/lottie-react-native.tsx` — new native-module mock, registered in `jest.setup.ts` (`jest.mock('lottie-react-native')`)
- [ ] `scripts/check-mascot-asset-size.mjs` — new fail-closed size-gate script, wired into `npm run verify`
- [ ] `assets/mascot/*.json` (5 files) — placeholder assets must exist before any test that `require()`s real asset paths (tests can also use fixture JSON instead of the real files where isolation is preferable — planner's call)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|--------------------|
| V2 Authentication | no | Module has no auth surface |
| V3 Session Management | no | No session concept in this module |
| V4 Access Control | no | No access-control surface |
| V5 Input Validation | yes (narrow) | `MascotProps.state`/`prominence`/`size` are TypeScript union types checked at compile time; at runtime, an unrecognized `state` value (e.g. a future host bug passing a raw string) should fall back to `idle` rather than crash — validate/clamp unknown values defensively in the component, don't trust the prop blindly even though TS narrows it |
| V6 Cryptography | no | No cryptographic operations in this module |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|------------------------|
| Malformed/oversized bundled asset causing OOM or long parse stalls on low-end Android | Denial of Service (local, not network-triggered) | The 300KB size gate (MASC-04) directly bounds this; lazy-loading per state (not eager-loading all 5) further bounds worst-case memory pressure |
| A future host accidentally passing untranslated/PII-bearing text into `accessibilityLabel` | Information Disclosure (low severity — screen-reader-only surface) | Not this module's responsibility to enforce (host-supplied per the Copywriting Contract), but worth a one-line note in the component's doc comment reiterating the host must pass only i18next-translated, non-PII strings |

This phase has no network/backend/data-persistence attack surface beyond the single new `mascotProminence` local settings field, which is already covered by the existing schema denylist guard (no sensitive/diagnostic data risk).

## Sources

### Primary (HIGH confidence)
- `npm view lottie-react-native version` / `versions` / `peerDependencies` / `peerDependenciesMeta` / `time.created` / `time.modified` — registry ground truth, queried 2026-07-02
- `npm pack lottie-react-native@7.3.8` tarball inspection — confirmed no `app.plugin.js`, no `expo` field in `package.json` (no config plugin needed)
- Direct read of this repo: `package.json`, `theme/tokens.ts`, `data/types.ts`, `data/repositories/settings.ts`, `data/stores/useSettingsStore.ts`, `data/repositories/__tests__/schema.denylist.test.ts`, `jest.config.js`, `jest.setup.ts`, `__mocks__/react-native-mmkv.ts`, `src/components/MascotSlot.tsx`, `src/app/index.tsx`, `src/app/__tests__/screens.test.tsx`, `scripts/check-hex-literals.mjs`, `tsconfig.json` — confirmed existing project structure/patterns/conventions
- `slopcheck scan --pkg npm lottie-react-native --json` (slopcheck 0.6.1) — `"status": "OK"`, no flags

### Secondary (MEDIUM confidence)
- `github.com/lottie-react-native/lottie-react-native/blob/master/docs/api.md` (fetched) — `play(startFrame, endFrame)`, `pause`/`resume`/`reset`, full documented props list, no marker-name-aware API found
- `github.com/lottie-react-native/lottie-react-native/issues/1394` (WebSearch, cross-referenced) — confirmed `.lottie`-on-New-Architecture-Android bug, root cause, and that it is specific to the dotLottie zip format, not plain JSON
- `github.com/lottie-react-native/lottie-react-native/pull/910` (fetched) — New Architecture/Fabric support merge, Android functional, iOS added in a later release
- `lottiefiles.github.io/lottie-docs/schema/` (fetched) — minimal required top-level composition fields, markers array schema, minimal shape-layer schema
- `reactnative.dev/docs/accessibilityinfo` (WebSearch, cross-referenced against training knowledge) — `isReduceMotionEnabled()`, `addEventListener('reduceMotionChanged', ...)`, `EventSubscription.remove()` pattern
- `docs.swmansion.com/react-native-reanimated` + GitHub issue `software-mansion/react-native-reanimated#8231` (WebSearch) — confirms `react-native-worklets/plugin` replaced `react-native-reanimated/plugin`, and that `babel-preset-expo` auto-applies it when `react-native-worklets` is installed

### Tertiary (LOW confidence)
- None retained as authoritative — all findings above were cross-verified against at least one primary/secondary source before inclusion. The only unverified figure (exact download counts, Open Question 2) is explicitly flagged as not needed for planning rather than presented as fact.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — version, install path, and config-plugin-absence all confirmed via registry + tarball inspection, not just training knowledge
- Architecture: MEDIUM-HIGH — the marker-resolution pattern (Pattern 1) is a synthesis of confirmed facts (no native marker API + standard Lottie JSON schema) rather than a documented "official" recipe found verbatim in any single source; flagged accordingly, with a defensive-coding pitfall (Pitfall 2) and an Assumptions Log entry (A2) covering the residual risk
- Pitfalls: HIGH for Pitfall 1 (directly sourced from a specific, confirmed GitHub issue) and MEDIUM for Pitfalls 2-4 (reasoned from confirmed API/behavior facts, not independently reproduced on-device this session)

**Research date:** 2026-07-02
**Valid until:** 2026-08-01 (30 days — `lottie-react-native` and Reanimated are both actively maintained but not fast-moving in ways that would invalidate the install path or marker-authoring approach within this window)
