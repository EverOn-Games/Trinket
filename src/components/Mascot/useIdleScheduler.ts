/**
 * Weighted, pausable idle micro-behavior scheduler (MASC-02, Pitfall 4).
 *
 * Exposes two pure, independently-testable helpers (`pickWeightedMicroBehavior`,
 * `nextIdleIntervalMs`, both accepting an injectable `random` for deterministic
 * tests) plus a `useIdleScheduler` hook that, while `active`, schedules the next
 * micro-behavior via `setTimeout`, weighted-picks a marker on fire, calls `onPlay`
 * with its frame range, then re-schedules. The effect depends on `active` and
 * clears its pending timeout in cleanup whenever `active` flips false, so a
 * previously-scheduled timer can never fire mid one-shot state (Pitfall 4).
 *
 * Follows i18n/useLocale.ts's named-return/no-default-export hook convention;
 * this hook has no meaningful return value (internal orchestration only).
 */
import { useEffect, useRef } from 'react';

import type { MarkerRange } from './markers';

export type MicroBehavior = 'blink' | 'glance' | 'postureShift';

const WEIGHTS: [MicroBehavior, number][] = [
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

export function nextIdleIntervalMs(
  reducedStimulus: boolean,
  random: () => number = Math.random
): number {
  const [min, max] = reducedStimulus ? [12000, 24000] : [4000, 9000];
  return min + random() * (max - min);
}

export type UseIdleSchedulerOptions = {
  active: boolean;
  reducedStimulus: boolean;
  markers: Record<string, MarkerRange>;
  onPlay: (range: MarkerRange) => void;
  random?: () => number;
};

export function useIdleScheduler({
  active,
  reducedStimulus,
  markers,
  onPlay,
  random = Math.random,
}: UseIdleSchedulerOptions): void {
  // Ref-forward latest values so the scheduling effect only needs to depend on
  // `active`/`reducedStimulus` (Pitfall 4) without re-creating timers on every
  // markers/onPlay identity change from the host's render. Refs are written in
  // an effect (post-render), never during render itself.
  const latestRef = useRef({ markers, onPlay, random });
  useEffect(() => {
    latestRef.current = { markers, onPlay, random };
  });

  useEffect(() => {
    if (!active) return undefined;

    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleNext = () => {
      const delay = nextIdleIntervalMs(reducedStimulus, latestRef.current.random);
      timeoutId = setTimeout(() => {
        const behavior = pickWeightedMicroBehavior(latestRef.current.random);
        const range = latestRef.current.markers[behavior];
        if (range) {
          latestRef.current.onPlay(range);
        }
        scheduleNext();
      }, delay);
    };

    scheduleNext();

    // Pitfall 4: clear the pending timeout on every `active`/`reducedStimulus`
    // change (including the transition to non-idle) so a stale timer can never
    // fire during a one-shot greeting/acknowledge animation.
    return () => clearTimeout(timeoutId);
  }, [active, reducedStimulus]);
}
