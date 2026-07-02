/**
 * Unit tests for useIdleScheduler (MASC-02, Pitfall 4).
 *
 * Covers: pickWeightedMicroBehavior boundary-exact weighting, nextIdleIntervalMs
 * bounded ranges, the scheduler firing onPlay while active on fake timers, and the
 * scheduler pausing (clearing its pending timeout) the moment `active` flips false.
 */

import { act, renderHook } from '@testing-library/react-native';

import type { MarkerRange } from '../markers';
import { nextIdleIntervalMs, pickWeightedMicroBehavior, useIdleScheduler } from '../useIdleScheduler';

describe('pickWeightedMicroBehavior', () => {
  it('returns blink below the 0.5 boundary', () => {
    expect(pickWeightedMicroBehavior(() => 0)).toBe('blink');
    expect(pickWeightedMicroBehavior(() => 0.49999)).toBe('blink');
  });

  it('returns glance in [0.5, 0.8)', () => {
    expect(pickWeightedMicroBehavior(() => 0.5)).toBe('glance');
    expect(pickWeightedMicroBehavior(() => 0.79999)).toBe('glance');
  });

  it('returns postureShift at/above 0.8', () => {
    expect(pickWeightedMicroBehavior(() => 0.8)).toBe('postureShift');
    expect(pickWeightedMicroBehavior(() => 0.99999)).toBe('postureShift');
  });
});

describe('nextIdleIntervalMs', () => {
  it('returns a value within [4000, 9000) when not reduced-stimulus', () => {
    for (const roll of [0, 0.25, 0.5, 0.75, 0.999999]) {
      const value = nextIdleIntervalMs(false, () => roll);
      expect(value).toBeGreaterThanOrEqual(4000);
      expect(value).toBeLessThan(9000);
    }
  });

  it('returns a value within [12000, 24000) when reduced-stimulus', () => {
    for (const roll of [0, 0.25, 0.5, 0.75, 0.999999]) {
      const value = nextIdleIntervalMs(true, () => roll);
      expect(value).toBeGreaterThanOrEqual(12000);
      expect(value).toBeLessThan(24000);
    }
  });
});

describe('useIdleScheduler', () => {
  const markers: Record<string, MarkerRange> = {
    blink: { startFrame: 60, endFrame: 72 },
    glance: { startFrame: 120, endFrame: 150 },
    postureShift: { startFrame: 200, endFrame: 245 },
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Fixed midpoint roll -> nextIdleIntervalMs(false, () => 0.5) === 6500ms exactly,
  // deterministically. Using real Math.random() here would make "exactly once per
  // 9000ms window" flaky whenever two consecutive random draws happened to sum to
  // under 9000ms (e.g. 4200ms + 4300ms) — an injected fixed random keeps interval
  // timing exact and the test non-flaky, per RESEARCH.md's injectable-RNG pattern.
  const fixedRandom = () => 0.5;

  it('fires onPlay with a valid marker range exactly once per interval while active', async () => {
    const onPlay = jest.fn();

    await renderHook(() =>
      useIdleScheduler({ active: true, reducedStimulus: false, markers, onPlay, random: fixedRandom })
    );

    await act(async () => {
      jest.advanceTimersByTime(9000);
    });
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(Object.values(markers)).toContainEqual(onPlay.mock.calls[0][0]);

    await act(async () => {
      jest.advanceTimersByTime(6500);
    });
    expect(onPlay).toHaveBeenCalledTimes(2);
  });

  it('does not fire onPlay while inactive, and resumes when active again (Pitfall 4)', async () => {
    const onPlay = jest.fn();

    const { rerender } = await renderHook(
      (props: { active: boolean }) =>
        useIdleScheduler({
          active: props.active,
          reducedStimulus: false,
          markers,
          onPlay,
          random: fixedRandom,
        }),
      { initialProps: { active: true } }
    );

    await rerender({ active: false });

    await act(async () => {
      jest.advanceTimersByTime(20000);
    });
    expect(onPlay).not.toHaveBeenCalled();

    await rerender({ active: true });

    await act(async () => {
      jest.advanceTimersByTime(6500);
    });
    expect(onPlay).toHaveBeenCalledTimes(1);
  });
});
