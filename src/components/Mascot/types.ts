/**
 * Public type contract for the reusable `<Mascot />` module (MASC-01, MASC-03).
 *
 * Every later Phase 2+ plan imports this contract rather than re-deriving it. The
 * `MascotState` union is pinned to exactly 5 values by design — there is no sixth
 * state, and no "sad"/"disappointed"/"waiting"/"nagging" state may ever be added
 * (MASC-03, D-01). This is guarded mechanically by
 * `src/components/Mascot/__tests__/noNegativeStates.test.ts`, which fails the build
 * if the union in this file's source ever contains anything other than these 5
 * literals.
 *
 * See `.planning/phases/02-mascot-module/02-UI-SPEC.md`'s "Public component API"
 * section for the source of truth this file implements.
 */

export type MascotState = 'greeting' | 'idle' | 'presence' | 'dozing' | 'acknowledge';

export type MascotProminence = 'prominent' | 'subtle' | 'hidden';

// lg=220, md=140, sm=64 — optional explicit override; else derived from prominence
// (prominent -> lg, subtle -> md).
export type MascotSize = 'lg' | 'md' | 'sm';

export type MascotProps = {
  state?: MascotState; // default 'idle'
  prominence?: MascotProminence; // default 'prominent'
  size?: MascotSize; // optional; else derived from prominence
  reducedStimulus?: boolean; // default: OS AccessibilityInfo.isReduceMotionEnabled()
  accessibilityLabel: string; // required — host-translated, per current state
  onStateAnimationComplete?: (state: MascotState) => void; // fires once a one-shot finishes
  testID?: string;
  // Deliberately no `style` prop — locks the visual contract to the token-driven
  // size presets; a host wraps this module in its own layout container instead.
};
