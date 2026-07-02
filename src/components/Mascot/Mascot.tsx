/**
 * <Mascot /> — the public, feature-agnostic mascot module (MASC-01, MASC-02,
 * MASC-03, MASC-04).
 *
 * Owns exactly ONE persistent `LottieView` instance for the component's
 * entire lifetime; state transitions swap its `source` and play frame-range
 * segments on that single view rather than mounting a second instance — no
 * two-instance crossfade (02-UI-SPEC.md Transition contract, 02-RESEARCH.md
 * Anti-Patterns, MASC-04). A Reanimated opacity fade (120ms / 200ms under
 * reduced-stimulus) wraps state swaps on the container instead.
 *
 * State assets are lazily `require()`'d on first activation, never all 5
 * eagerly required at mount (MASC-04 perf contract, T-02-01 mitigation).
 * Re-entering a previously-seen state never re-decodes the JSON — this
 * relies on Metro/Node's own `require()` module registry caching the
 * resolved object by absolute path, rather than a manual per-instance ref
 * cache, since reading/writing a ref during render is disallowed by the
 * `react-hooks/refs` lint rule.
 *
 * An unrecognized `state` prop value clamps to 'idle' rather than crashing
 * (T-02-05, V5 input validation). A failed asset `require()` falls back to
 * the static `surfaceElevated` box (mirrors `MascotSlot`'s treatment) with a
 * dev-only `console.warn` — never user-facing error chrome (Copywriting
 * Contract).
 *
 * `accessibilityLabel` must be a host-translated, non-PII string (T-02-06) —
 * this module never calls t()/i18n itself; it only renders whatever string
 * the host passes down.
 *
 * MASC-03: this module renders only the 5 allowed states — no code path here
 * constructs a "sad"/"disappointed"/"waiting"/"nagging" state (structurally
 * guarded by ../__tests__/noNegativeStates.test.ts).
 */
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import LottieView, { type AnimationObject } from 'lottie-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '../../../theme';
import { resolveMarkers, type MascotAssetJSON, type MarkerRange } from './markers';
import { useIdleScheduler } from './useIdleScheduler';
import { useReducedStimulus } from './useReducedStimulus';
import type { MascotProminence, MascotProps, MascotSize, MascotState } from './types';

const ALLOWED_STATES: MascotState[] = ['greeting', 'idle', 'presence', 'dozing', 'acknowledge'];
const ONE_SHOT_STATES: MascotState[] = ['greeting', 'acknowledge'];

const SIZE_PRESETS: Record<MascotSize, number> = { lg: 220, md: 140, sm: 64 };

// 'hidden' has no size preset of its own (renders a 0-height wrapper below) —
// the 'sm' fallback here is never read in that branch.
const PROMINENCE_SIZE: Record<MascotProminence, MascotSize> = {
  prominent: 'lg',
  subtle: 'md',
  hidden: 'sm',
};

const PROMINENCE_OPACITY: Record<MascotProminence, number> = {
  prominent: 1,
  subtle: 0.85,
  hidden: 0,
};

// A require()-d Lottie/Bodymovin asset also carries `op` (out point, frames)
// and `fr` (frame rate) — used to size the one-shot completion timer and the
// idle micro-behavior "resume base loop" follow-up (Open Question 1,
// RESOLVED: setTimeout sized to known duration rather than depending on
// onAnimationFinish's segment-awareness).
type MascotAnimationAsset = MascotAssetJSON & {
  op?: number;
  fr?: number;
};

function clampState(state: MascotState | undefined): MascotState {
  if (state && ALLOWED_STATES.includes(state)) return state;
  return 'idle';
}

function loadAsset(state: MascotState): MascotAnimationAsset {
  switch (state) {
    case 'greeting':
      return require('../../../assets/mascot/mascot_greeting.json') as MascotAnimationAsset;
    case 'presence':
      return require('../../../assets/mascot/mascot_presence.json') as MascotAnimationAsset;
    case 'dozing':
      return require('../../../assets/mascot/mascot_dozing.json') as MascotAnimationAsset;
    case 'acknowledge':
      return require('../../../assets/mascot/mascot_acknowledge.json') as MascotAnimationAsset;
    case 'idle':
    default:
      // Defensive fallback (V5): `state` is already clamped to one of the 5
      // literals before this is called, but this keeps the switch total and
      // doubles as defense-in-depth against a future non-exhaustive edit.
      return require('../../../assets/mascot/mascot_idle.json') as MascotAnimationAsset;
  }
}

function loadAssetSafe(state: MascotState): MascotAnimationAsset | undefined {
  try {
    return loadAsset(state);
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      // Dev-only warning, never user-facing — a broken/missing asset must
      // fail loud in logs, degrading to the static fallback box below, not
      // crash the app (Copywriting Contract's Error state rule).
      console.warn(`Mascot: failed to load asset for state "${state}"`, err);
    }
    return undefined;
  }
}

export function Mascot({
  state,
  prominence = 'prominent',
  size,
  reducedStimulus: reducedStimulusProp,
  accessibilityLabel,
  onStateAnimationComplete,
  testID,
}: MascotProps) {
  const theme = useTheme();
  const { reducedStimulus } = useReducedStimulus(reducedStimulusProp);
  const currentState = clampState(state);

  const lottieRef = useRef<LottieView>(null);

  // Lazily `require()`'d per state on first activation (MASC-04 perf
  // contract). No manual per-instance ref-cache is layered on top: Metro/Node's
  // own `require()` module registry already caches the resolved JSON object by
  // absolute path after the first load, so re-entering a previously-seen state
  // never re-decodes the JSON — reading/writing a ref during render to
  // duplicate that caching would violate the `react-hooks/refs` rule (refs may
  // only be read/written outside render: effects, event handlers, callbacks).
  const asset = useMemo(() => loadAssetSafe(currentState), [currentState]);

  // Idle marker frame-range lookup — only computed while idle is (or becomes)
  // the active state, matching the lazy-load contract. Reuses `asset` (already
  // the idle asset whenever currentState === 'idle') instead of a second
  // require()/ref-cache lookup.
  const idleMarkers = useMemo((): Record<string, MarkerRange> => {
    if (currentState !== 'idle' || !asset) return {};
    return resolveMarkers(asset);
  }, [currentState, asset]);

  // Tracks the pending "resume base idle loop" timeout scheduled below, so a
  // stale timer from an idle micro-behavior segment can never fire after
  // currentState has moved on to presence/dozing/acknowledge and call
  // .play() on the persistent LottieView ref while it displays a different
  // state's asset (WR-01).
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleIdleMicroBehavior = (range: MarkerRange) => {
    // Ref reads here happen inside an event-callback body (invoked later, by
    // the scheduler's timer) — not during render — so this is a sanctioned
    // ref access, unlike the removed render-phase ref-cache above.
    lottieRef.current?.play(range.startFrame, range.endFrame);

    // Resume the base idle loop once the micro-behavior segment finishes
    // (02-RESEARCH.md architecture diagram: "on completion... resume the
    // base idle loop"). Segment duration is derived from the marker's own
    // frame range and the idle asset's frame rate, mirroring the one-shot
    // completion timing approach below (Open Question 1, RESOLVED). `asset`
    // is the idle asset whenever this fires (the scheduler is only active
    // while currentState === 'idle').
    const idleFr = asset?.fr ?? 30;
    const segmentFrames = range.endFrame - range.startFrame;
    const segmentDurationMs = idleFr > 0 ? (segmentFrames / idleFr) * 1000 : 0;

    clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => {
      // Guard against a stale fire that survived a state change slipping
      // through between clearTimeout calls (belt-and-suspenders alongside
      // the currentState effect below).
      if (currentState === 'idle') {
        lottieRef.current?.play();
      }
    }, segmentDurationMs);
  };

  // Clear the pending "resume" timer whenever we leave idle (or unmount) so
  // a stale timer can never call play() on a different state's asset
  // (WR-01).
  useEffect(() => {
    if (currentState !== 'idle') {
      clearTimeout(resumeTimeoutRef.current);
    }
    return () => clearTimeout(resumeTimeoutRef.current);
  }, [currentState]);

  // MASC-02: idle micro-behaviors never fire during a one-shot state, and
  // the scheduler is fully paused (not just visually) while prominence is
  // 'hidden' (UI-SPEC's prominence table: "n/a (scheduler paused)").
  useIdleScheduler({
    active: currentState === 'idle' && prominence !== 'hidden',
    reducedStimulus,
    markers: idleMarkers,
    onPlay: handleIdleMicroBehavior,
  });

  // One-shot completion (greeting/acknowledge) — setTimeout sized to the
  // asset's own op/fr duration (Open Question 1, RESOLVED) rather than
  // depending on onAnimationFinish's segment-awareness. onStateAnimationComplete
  // is read via a ref (not a dependency) so an unrelated host re-render never
  // resets the pending timer (mirrors useIdleScheduler.ts's Pitfall-4-style
  // ref-forwarding, applied here to avoid the equivalent one-shot bug).
  const latestOnCompleteRef = useRef(onStateAnimationComplete);
  useEffect(() => {
    latestOnCompleteRef.current = onStateAnimationComplete;
  });

  useEffect(() => {
    if (!ONE_SHOT_STATES.includes(currentState) || !asset) return undefined;

    const opField = asset.op ?? 0;
    const frField = asset.fr ?? 30;
    const durationMs = frField > 0 ? (opField / frField) * 1000 : 0;

    const timeoutId = setTimeout(() => {
      latestOnCompleteRef.current?.(currentState);
    }, durationMs);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only re-run when currentState changes; onStateAnimationComplete/asset read via ref/cache to avoid resetting the timer on unrelated host re-renders
  }, [currentState]);

  // Reanimated opacity fade wrapper — 120ms normal / 200ms reduced-stimulus,
  // re-fades on every state prop change (02-RESEARCH.md Reanimated example).
  const opacity = useSharedValue(1);
  const fadeDurationMs = reducedStimulus ? 200 : 120;
  useEffect(() => {
    opacity.value = 0;
    opacity.value = withTiming(1, { duration: fadeDurationMs });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: re-fade on every state change only
  }, [currentState]);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const resolvedSize = size ?? PROMINENCE_SIZE[prominence];
  const dimension = SIZE_PRESETS[resolvedSize];
  const targetOpacity = PROMINENCE_OPACITY[prominence];

  if (prominence === 'hidden') {
    // Renders nothing visible; state/scheduler logic above keeps running so
    // re-enabling prominence resumes seamlessly with no re-greeting.
    return <View testID={testID} style={styles.hidden} />;
  }

  if (!asset) {
    const fallbackStyle = StyleSheet.flatten([
      styles.fallback,
      {
        width: dimension,
        height: dimension,
        backgroundColor: theme.colors.surfaceElevated,
        borderColor: theme.colors.border,
        borderRadius: theme.radii.lg,
      },
    ]);
    return (
      <View testID={testID} accessible accessibilityLabel={accessibilityLabel} style={fallbackStyle} />
    );
  }

  return (
    <Animated.View
      testID={testID}
      accessible
      accessibilityLabel={accessibilityLabel}
      style={[{ width: dimension, height: dimension, opacity: targetOpacity }, fadeStyle]}
    >
      <LottieView
        ref={lottieRef}
        // MascotAnimationAsset only types the fields this module reads
        // (markers/op/fr); the real Lottie/Bodymovin JSON shape satisfies
        // lottie-react-native's fuller AnimationObject at runtime.
        source={asset as unknown as AnimationObject}
        loop={!ONE_SHOT_STATES.includes(currentState)}
        autoPlay
        style={styles.lottie}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hidden: {
    width: 0,
    height: 0,
  },
  fallback: {
    borderWidth: 1,
  },
  lottie: {
    width: '100%',
    height: '100%',
  },
});
