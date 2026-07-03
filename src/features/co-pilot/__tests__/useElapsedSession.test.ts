/**
 * Unit tests for useElapsedSession — timestamp-derived elapsed/dozing hook with
 * AppState pause/resume of the render tick and a throttled heartbeat callback.
 *
 * Mocks react-native's AppState (addEventListener) since no native AppState
 * module is available under Jest — mirrors useReducedStimulus.test.ts's inline
 * jest.spyOn capture-the-handler idiom for AccessibilityInfo (this project has
 * no dedicated __mocks__/react-native AppState automock).
 */
import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { useElapsedSession } from '../useElapsedSession';

function mockAppState(): { fire: (state: string) => void; remove: jest.Mock } {
  let handler: ((state: string) => void) | undefined;
  const remove = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((
    _event: string,
    nextHandler: (state: string) => void
  ) => {
    handler = nextHandler;
    return { remove };
  }) as unknown as typeof AppState.addEventListener);
  return { fire: (state: string) => handler?.(state), remove };
}

describe('useElapsedSession', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('starts at 0 on mount and increments as fake time advances via the 1s tick', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-03T10:00:00.000Z'));
    mockAppState();
    const startedAt = Date.now();

    const { result } = renderHook(() => useElapsedSession(startedAt, jest.fn()));
    expect(result.current.elapsedMs).toBe(0);

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current.elapsedMs).toBe(3000);
  });

  it('clamps elapsedMs to 0 when the system clock is set before startedAt (T-03-02)', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-03T10:00:00.000Z'));
    mockAppState();
    const startedAt = Date.now() + 60_000; // startedAt is "in the future" relative to now

    const { result } = renderHook(() => useElapsedSession(startedAt, jest.fn()));

    expect(result.current.elapsedMs).toBe(0);
  });

  it('stops ticking while backgrounded and recomputes correctly on return to active', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-03T10:00:00.000Z'));
    const { fire } = mockAppState();
    const startedAt = Date.now();

    const { result } = renderHook(() => useElapsedSession(startedAt, jest.fn()));
    expect(result.current.elapsedMs).toBe(0);

    act(() => {
      fire('background');
      jest.setSystemTime(new Date('2026-07-03T10:20:00.000Z')); // +20 min
    });

    act(() => {
      fire('active');
    });

    expect(result.current.elapsedMs).toBe(20 * 60 * 1000);
  });

  it('is not dozing before 30 minutes and becomes dozing at/after 30 minutes with no touch', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-03T10:00:00.000Z'));
    mockAppState();
    const startedAt = Date.now();

    const { result } = renderHook(() => useElapsedSession(startedAt, jest.fn()));

    act(() => {
      jest.advanceTimersByTime(29 * 60 * 1000);
    });
    expect(result.current.isDozing).toBe(false);

    act(() => {
      jest.advanceTimersByTime(2 * 60 * 1000); // now well past 30 min, past wake grace too
    });
    expect(result.current.isDozing).toBe(true);
  });

  it('wake() returns to presence (not dozing) within the grace window after being dozing', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-03T10:00:00.000Z'));
    mockAppState();
    const startedAt = Date.now();

    const { result } = renderHook(() => useElapsedSession(startedAt, jest.fn()));

    act(() => {
      jest.advanceTimersByTime(31 * 60 * 1000);
    });
    expect(result.current.isDozing).toBe(true);

    act(() => {
      result.current.wake();
    });
    expect(result.current.isDozing).toBe(false);
  });

  it('fires onHeartbeat at most once per HEARTBEAT_INTERVAL_MS, not on every 1s tick', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-03T10:00:00.000Z'));
    mockAppState();
    const startedAt = Date.now();
    const onHeartbeat = jest.fn();

    renderHook(() => useElapsedSession(startedAt, onHeartbeat));

    act(() => {
      jest.advanceTimersByTime(44_000); // just under 45s
    });
    expect(onHeartbeat).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(2_000); // crosses 45s
    });
    expect(onHeartbeat).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(45_000); // one more interval
    });
    expect(onHeartbeat).toHaveBeenCalledTimes(2);
  });

  it('fires onHeartbeat once immediately on an active->background transition', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-03T10:00:00.000Z'));
    const { fire } = mockAppState();
    const startedAt = Date.now();
    const onHeartbeat = jest.fn();

    renderHook(() => useElapsedSession(startedAt, onHeartbeat));

    act(() => {
      jest.advanceTimersByTime(5_000); // well under the heartbeat interval
    });
    expect(onHeartbeat).not.toHaveBeenCalled();

    act(() => {
      fire('background');
    });
    expect(onHeartbeat).toHaveBeenCalledTimes(1);
  });

  it('does not reset the interval when onHeartbeat identity changes across a host re-render', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-03T10:00:00.000Z'));
    mockAppState();
    const startedAt = Date.now();
    const firstHeartbeat = jest.fn();
    const secondHeartbeat = jest.fn();

    const { rerender } = renderHook(
      ({ onHeartbeat }: { onHeartbeat: (t: number) => void }) =>
        useElapsedSession(startedAt, onHeartbeat),
      { initialProps: { onHeartbeat: firstHeartbeat } }
    );

    act(() => {
      jest.advanceTimersByTime(20_000);
    });
    rerender({ onHeartbeat: secondHeartbeat });

    act(() => {
      jest.advanceTimersByTime(25_000); // crosses the 45s threshold from mount
    });

    // The latest (second) callback should be the one invoked, proving the ref
    // forwarded the new identity without resetting/re-registering the interval.
    expect(secondHeartbeat).toHaveBeenCalledTimes(1);
    expect(firstHeartbeat).not.toHaveBeenCalled();
  });
});
