---
phase: 02-mascot-module
reviewed: 2026-07-02T23:20:59Z
depth: standard
files_reviewed: 29
files_reviewed_list:
  - __mocks__/lottie-react-native.tsx
  - assets/mascot/mascot_acknowledge.json
  - assets/mascot/mascot_dozing.json
  - assets/mascot/mascot_greeting.json
  - assets/mascot/mascot_idle.json
  - assets/mascot/mascot_presence.json
  - data/repositories/__tests__/repositories.test.ts
  - data/repositories/__tests__/schema.denylist.test.ts
  - data/repositories/settings.ts
  - data/stores/useSettingsStore.ts
  - data/types.ts
  - i18n/locales/en.json
  - i18n/locales/pl.json
  - jest.setup.ts
  - scripts/check-mascot-asset-size.mjs
  - src/app/__tests__/screens.test.tsx
  - src/app/index.tsx
  - src/components/Mascot/Mascot.tsx
  - src/components/Mascot/__tests__/Mascot.test.tsx
  - src/components/Mascot/__tests__/markers.test.ts
  - src/components/Mascot/__tests__/noNegativeStates.test.ts
  - src/components/Mascot/__tests__/useIdleScheduler.test.ts
  - src/components/Mascot/__tests__/useReducedStimulus.test.ts
  - src/components/Mascot/markers.ts
  - src/components/Mascot/types.ts
  - src/components/Mascot/useIdleScheduler.ts
  - src/components/Mascot/useReducedStimulus.ts
  - theme/__tests__/tokens.test.ts
  - theme/tokens.ts
findings:
  critical: 0
  warning: 4
  info: 5
  total: 9
status: issues_found
---

# Phase 2: Code Review Report

**Reviewed:** 2026-07-02T23:20:59Z
**Depth:** standard
**Files Reviewed:** 29
**Status:** issues_found

## Summary

Reviewed the Phase 2 Mascot module (public `<Mascot />` component, marker resolution, idle scheduler, reduced-stimulus hook, settings plumbing for `mascotProminence`, Home screen wiring, i18n copy, and the Lottie asset-size/test infrastructure) against the project's hard constraints: PDA-aware/shame-free copy grammar, token-only styling, i18next-only copy, the schema denylist, the <300KB Lottie asset budget, TypeScript strict mode, and the MASC-04 single-persistent-LottieView/lazy-load contract.

`npx tsc --noEmit`, the full Jest suite (61/61 passing), `lint:hex`, and `lint:mascot-assets` all pass cleanly against the current tree, and the `noNegativeStates`/`schema.denylist` structural guards correctly enforce the 5-state union and the pressure/diagnosis field denylist. No hardcoded secrets, no `eval`/injection surface, no hex literals outside `theme/`, no literal user-facing strings outside `t()` in the reviewed screens, and no regulatory-copy violations were found in `en.json`/`pl.json`.

No Critical/security/data-loss findings were identified. Four Warning-level correctness/robustness issues were found, centered on timer lifecycle management in the idle micro-behavior loop, a non-reactive settings read on Home, a documented-but-violated "single persistent instance" contract when prominence toggles to/from `hidden`, and a missing double-press guard on session creation. Five Info-level maintainability items round out the report (dead code left over from the `MascotSlot` → `Mascot` migration, duplicated micro-behavior name literals, an incomplete Polish plural set, a defeated type-check via double-cast, and an untested failure-fallback render path).

## Warnings

### WR-01: Idle micro-behavior "resume" timer is never cancelled, and can restart playback on a different (already-swapped) Lottie asset

**File:** `src/components/Mascot/Mascot.tsx:145-165`
**Issue:** `handleIdleMicroBehavior` schedules a raw `setTimeout(() => { lottieRef.current?.play(); }, segmentDurationMs)` after every idle micro-behavior fire, to resume the base idle loop once the blink/glance/postureShift segment finishes. This timer is not tracked in a ref, not cleared on unmount, and not cleared when `currentState` changes away from `'idle'` mid-segment (e.g. the user presses "Start a session?" a few hundred ms after a micro-behavior begins playing).

Because the module intentionally keeps a single persistent `LottieView` instance across state changes (MASC-04), `lottieRef.current` is still the *same* mounted instance when this stale timeout eventually fires — it is now displaying `presence`/`dozing`/`acknowledge`'s `source`, not the idle asset the timer was scheduled for. The unconditional `lottieRef.current?.play()` call will restart whatever animation is *currently* on screen from its beginning, producing a visible playback glitch/reset that is disconnected from the current state — directly undercutting the mascot's "ambient, continuous presence" value proposition during exactly the moment (session start) the product cares most about.

`useIdleScheduler`'s own outer scheduling timer is correctly cleaned up on `active`/`reducedStimulus` change (Pitfall 4), but this inner "resume" timer lives entirely in `Mascot.tsx`, outside that cleanup path, and has none of its own.

**Fix:**
```tsx
const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

const handleIdleMicroBehavior = (range: MarkerRange) => {
  lottieRef.current?.play(range.startFrame, range.endFrame);

  const idleFr = asset?.fr ?? 30;
  const segmentFrames = range.endFrame - range.startFrame;
  const segmentDurationMs = idleFr > 0 ? (segmentFrames / idleFr) * 1000 : 0;

  clearTimeout(resumeTimeoutRef.current);
  resumeTimeoutRef.current = setTimeout(() => {
    lottieRef.current?.play();
  }, segmentDurationMs);
};

// Clear the pending "resume" timer whenever we leave idle (or unmount) so a
// stale timer can never call play() on a different state's asset.
useEffect(() => {
  if (currentState !== 'idle') {
    clearTimeout(resumeTimeoutRef.current);
  }
  return () => clearTimeout(resumeTimeoutRef.current);
}, [currentState]);
```

### WR-02: Home screen reads `mascotProminence` via a non-reactive Zustand snapshot, so it won't update when the setting changes elsewhere

**File:** `src/app/index.tsx:78`
**Issue:** `<Mascot prominence={settingsRepo.get().mascotProminence} .../>` calls `settingsRepo.get()`, which internally calls `useSettingsStore.getState()` — a one-time snapshot read, not a subscription. Home only re-renders (and thus re-reads this value) when something else changes its own local state (e.g. `mascotState`). If `mascotProminence` is changed elsewhere while Home is mounted (the Settings screen landing in Phase 8 is explicitly planned to do exactly this per `02-CONTEXT.md`/`data/stores/useSettingsStore.ts`), Home will keep rendering the stale prominence value until an unrelated re-render happens to occur. This is a latent bug in already-shipped code that will surface as soon as the Phase 8 Settings toggle exists, and is easy to miss now because nothing currently changes `mascotProminence` at runtime.
**Fix:** Subscribe to the store slice instead of taking a static snapshot:
```tsx
import { useSettingsStore } from '../../data/stores/useSettingsStore';
// ...
const mascotProminence = useSettingsStore((s) => s.mascotProminence);
// ...
<Mascot prominence={mascotProminence} ... />
```

### WR-03: Toggling `prominence` to/from `'hidden'` unmounts and remounts the LottieView, contradicting the module's documented single-persistent-instance contract

**File:** `src/components/Mascot/Mascot.tsx:218-222` (compare with the module doc comment at lines 4-10)
**Issue:** The module's own header comment states: "Owns exactly ONE persistent `LottieView` instance for the component's entire lifetime; state transitions swap its `source`... rather than mounting a second instance." In practice, when `prominence === 'hidden'` the component returns an entirely different element (`<View style={styles.hidden} />`) instead of the `<Animated.View><LottieView/></Animated.View>` tree. Flipping prominence from `'hidden'` back to `'prominent'`/`'subtle'` therefore mounts a *brand-new* `LottieView` (a fresh `ref`, fresh native view, `autoPlay` restarting from frame 0) rather than continuing the one persistent instance the header comment promises. The `<Mascot /> single persistent LottieView (MASC-04)` test in `Mascot.test.tsx` only exercises non-hidden state transitions, so this gap isn't caught by the existing suite. The same remount also happens on the (defensive, currently unreachable) `!asset` fallback branch.

This matters because the whole point of the single-instance contract is animation continuity — the mascot's constancy of presence. A user toggling prominence (once Phase 8 ships that control) will see the mascot animation always restart from frame 0 rather than resuming, which is inconsistent with how every other transition in this module is designed to behave.
**Fix:** Either (a) keep the `Animated.View`/`LottieView` tree mounted unconditionally and use `opacity: 0`/pointer-events-none plus zero layout size for the hidden case instead of swapping element trees, so the same `LottieView` instance survives prominence toggles too; or (b) if the remount is intentionally acceptable for `hidden` (since nothing is visible anyway), narrow the header comment's claim to explicitly scope "persistent instance" to state transitions only, so the contract as documented doesn't overstate what the code guarantees.

### WR-04: `handleStartSession` has no guard against rapid double-press, risking duplicate session records

**File:** `src/app/index.tsx:46-49`
**Issue:** `handleStartSession` unconditionally calls `sessionsRepo.create({ source: 'quick' })` then `router.push('/co-pilot')` on every `Pressable` press. A fast double-tap (common with touch UI, and more likely with the exact ADHD-adjacent user population this app targets) before navigation completes will create two persisted `Session` records for a single user intent, with no dedupe/debounce anywhere in the reviewed code.
**Fix:** Guard with a ref-based in-flight flag (or disable the pressable once pressed until navigation occurs):
```tsx
const isStartingRef = useRef(false);
const handleStartSession = () => {
  if (isStartingRef.current) return;
  isStartingRef.current = true;
  sessionsRepo.create({ source: 'quick' });
  router.push('/co-pilot');
};
```

## Info

### IN-01: Dead code left over from the `MascotSlot` → `Mascot` migration

**File:** `src/components/MascotSlot.tsx` (whole file); `i18n/locales/en.json:4`, `i18n/locales/pl.json:4` (`home.mascotSlotLabel`)
**Issue:** `src/app/index.tsx` now renders the real `<Mascot />` instead of `<MascotSlot />` (confirmed by `screens.test.tsx`'s "not the MascotSlot placeholder" test), but `MascotSlot.tsx` itself was never deleted and is no longer imported anywhere in `src/`. Its companion translation key `home.mascotSlotLabel` is likewise orphaned in both locale files — it was `MascotSlot`'s caller-supplied accessibility label and has no remaining reader.
**Fix:** Delete `src/components/MascotSlot.tsx` and remove `home.mascotSlotLabel` from `i18n/locales/en.json` and `i18n/locales/pl.json` (and re-run the i18n key-usage check, if one exists, to confirm no other stale keys remain).

### IN-02: Micro-behavior names are duplicated across two files with no shared source of truth

**File:** `src/components/Mascot/markers.ts:24` (`REQUIRED_MARKER_NAMES`); `src/components/Mascot/useIdleScheduler.ts:19-25` (`MicroBehavior` type, `WEIGHTS`)
**Issue:** The three micro-behavior names (`'blink'`, `'glance'`, `'postureShift'`) are independently hardcoded in both files. There is no compiler-enforced link between `MicroBehavior`'s literal union and `REQUIRED_MARKER_NAMES`'s string array — adding, renaming, or removing a micro-behavior requires remembering to update both files in sync, and nothing will fail to compile if one is missed (only the dev-only `console.warn` in `markers.ts` would eventually surface a mismatch, at runtime, in dev builds only).
**Fix:** Derive one from the other, e.g. export `MicroBehavior` from `useIdleScheduler.ts` and have `markers.ts` do `const REQUIRED_MARKER_NAMES: MicroBehavior[] = ['blink', 'glance', 'postureShift'];` with a type-level assertion, or hoist the literal tuple into a single shared module both files import.

### IN-03: Polish `sessionsRemaining` plural set omits the CLDR `_other` form

**File:** `i18n/locales/pl.json:33-35`
**Issue:** `pl.json` declares `sessionsRemaining_one`/`_few`/`_many` but no `_other`, whereas Polish CLDR pluralization defines four categories (`one`/`few`/`many`/`other`). `en.json` only needs `_one`/`_other` and has both. This key is not currently referenced by any reviewed screen or component, so the gap has no observable effect today, but if/when this key is wired up, i18next will have no fallback translation for any count that doesn't resolve to `one`/`few`/`many` (e.g. non-integer counts, if ever produced).
**Fix:** Add `"sessionsRemaining_other": "{{count}} sesji pozostałych w tym tygodniu"` to `pl.json` for completeness before this key is wired to a screen.

### IN-04: `source={asset as unknown as AnimationObject}` fully defeats type-checking for the Lottie source prop

**File:** `src/components/Mascot/Mascot.tsx:252`
**Issue:** The double cast (`unknown` bridge) is documented as deliberate ("`MascotAnimationAsset` only types the fields this module reads... the real Lottie/Bodymovin JSON shape satisfies `lottie-react-native`'s fuller `AnimationObject` at runtime"), but it means TypeScript strict mode provides zero protection here — any future change to what `lottie-react-native` expects of `AnimationObject`, or any accidental narrowing of `MascotAnimationAsset`, will not be caught at compile time.
**Fix:** Not blocking, but consider narrowing to a single-step cast against a locally-defined structural subset of `AnimationObject` (rather than routing through `unknown`), so at least a partial shape-check survives; or add a small runtime assertion in a dev-only branch that the asset has the fields `AnimationObject` consumers actually need (`v`, `layers`, etc.).

### IN-05: No test exercises the asset-load-failure fallback render path

**File:** `src/components/Mascot/Mascot.tsx:98-110, 224-238`
**Issue:** `loadAssetSafe` catches a `require()` failure and returns `undefined`, which the component renders as a static `surfaceElevated` fallback box. No test in `Mascot.test.tsx` (or elsewhere in the reviewed suite) forces `loadAsset`/`require` to throw and asserts the fallback box renders with the correct `accessibilityLabel`/token-derived styling. This is currently unreachable in practice (all 5 bundled assets exist), but it is a real, documented code path (explicitly called out as mirroring `MascotSlot`'s treatment) that ships with zero coverage.
**Fix:** Add a test that mocks `jest.mock('../../../../assets/mascot/mascot_idle.json', () => { throw new Error('missing'); })` (or equivalent module-factory mock) for one state and asserts the fallback `View` renders instead of `lottie-view-mock`.

---

_Reviewed: 2026-07-02T23:20:59Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
