/**
 * Unit tests for useElapsedSession — timestamp-derived elapsed/dozing hook with
 * AppState pause/resume of the render tick and a throttled heartbeat callback.
 *
 * Mocks react-native's AppState (addEventListener) since no native AppState
 * module is available under Jest — mirrors useReducedStimulus.test.ts's inline
 * jest.spyOn capture-the-handler idiom for AccessibilityInfo (this project has
 * no dedicated __mocks__/react-native AppState automock). Uses `await
 * renderHook(...)` / `await act(async () => ...)` / `await rerender(...)`
 * throughout, per useIdleScheduler.test.ts's established idiom for this
 * @testing-library/react-native version.
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
  // @react-native/jest-preset's own AppState mock (jest/mocks/AppState.js)
  // replaces `currentState` with a bare jest.fn(), not the string 'active' a
  // real foregrounded app would report — override it here so the hook's
  // mount-time `AppState.currentState === 'active'` check behaves as it would
  // on a real device.
  Object.defineProperty(AppState, 'currentState', {
    configurable: true,
    value: 'active',
  });
  return { fire: (state: string) => handler?.(state), remove };
}

describe('useElapsedSession', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('starts at 0 on mount and increments as fake time advances via the 1s tick', async () => {
    jest.setSystemTime(new Date('2026-07-03T10:00:00.000Z'));
    mockAppState();
    const startedAt = Date.now();

    const { result } = await renderHook(() => useElapsedSession(startedAt, jest.fn()));
    expect(result.current.elapsedMs).toBe(0);

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current.elapsedMs).toBe(3000);
  });

  it('clamps elapsedMs to 0 when the system clock is set before startedAt (T-03-02)', async () => {
    jest.setSystemTime(new Date('2026-07-03T10:00:00.000Z'));
    mockAppState();
    const startedAt = Date.now() + 60_000; // startedAt is "in the future" relative to now

    const { result } = await renderHook(() => useElapsedSession(startedAt, jest.fn()));

    expect(result.current.elapsedMs).toBe(0);
  });

  it('stops ticking while backgrounded and recomputes correctly on return to active', async () => {
    jest.setSystemTime(new Date('2026-07-03T10:00:00.000Z'));
    const { fire } = mockAppState();
    const startedAt = Date.now();

    const { result } = await renderHook(() => useElapsedSession(startedAt, jest.fn()));
    expect(result.current.elapsedMs).toBe(0);

    await act(async () => {
      fire('background');
      jest.setSystemTime(new Date('2026-07-03T10:20:00.000Z')); // +20 min
    });

    await act(async () => {
      fire('active');
    });

    expect(result.current.elapsedMs).toBe(20 * 60 * 1000);
  });

  it('is not dozing before 30 minutes and becomes dozing at/after 30 minutes with no touch', async () => {
    jest.setSystemTime(new Date('2026-07-03T10:00:00.000Z'));
    mockAppState();
    const startedAt = Date.now();

    const { result } = await renderHook(() => useElapsedSession(startedAt, jest.fn()));

    await act(async () => {
      jest.advanceTimersByTime(29 * 60 * 1000);
    });
    expect(result.current.isDozing).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(2 * 60 * 1000); // now well past 30 min, past wake grace too
    });
    expect(result.current.isDozing).toBe(true);
  });

  it('wake() returns to presence (not dozing) within the grace window after being dozing', async () => {
    jest.setSystemTime(new Date('2026-07-03T10:00:00.000Z'));
    mockAppState();
    const startedAt = Date.now();

    const { result } = await renderHook(() => useElapsedSession(startedAt, jest.fn()));

    await act(async () => {
      jest.advanceTimersByTime(31 * 60 * 1000);
    });
    expect(result.current.isDozing).toBe(true);

    await act(async () => {
      result.current.wake();
    });
    expect(result.current.isDozing).toBe(false);
  });

  it('fires onHeartbeat at most once per HEARTBEAT_INTERVAL_MS, not on every 1s tick', async () => {
    jest.setSystemTime(new Date('2026-07-03T10:00:00.000Z'));
    mockAppState();
    const startedAt = Date.now();
    const onHeartbeat = jest.fn();

    await renderHook(() => useElapsedSession(startedAt, onHeartbeat));
    // The tick fires immediately on mount ("never trust a stale value") and the
    // throttle's lastHeartbeatAtRef starts at 0, so this first tick always
    // clears the threshold and fires one immediate heartbeat.
    expect(onHeartbeat).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(44_000); // just under the next 45s boundary
    });
    expect(onHeartbeat).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(2_000); // crosses the next 45s boundary
    });
    expect(onHeartbeat).toHaveBeenCalledTimes(2);

    await act(async () => {
      jest.advanceTimersByTime(45_000); // one more interval
    });
    expect(onHeartbeat).toHaveBeenCalledTimes(3);
  });

  it('fires onHeartbeat once immediately on an active->background transition (in addition to the mount call)', async () => {
    jest.setSystemTime(new Date('2026-07-03T10:00:00.000Z'));
    const { fire } = mockAppState();
    const startedAt = Date.now();
    const onHeartbeat = jest.fn();

    await renderHook(() => useElapsedSession(startedAt, onHeartbeat));
    expect(onHeartbeat).toHaveBeenCalledTimes(1); // immediate mount call

    await act(async () => {
      jest.advanceTimersByTime(5_000); // well under the heartbeat interval
    });
    expect(onHeartbeat).toHaveBeenCalledTimes(1);

    await act(async () => {
      fire('background');
    });
    expect(onHeartbeat).toHaveBeenCalledTimes(2);
  });

  it('does not reset the interval when onHeartbeat identity changes across a host re-render', async () => {
    jest.setSystemTime(new Date('2026-07-03T10:00:00.000Z'));
    mockAppState();
    const startedAt = Date.now();
    const firstHeartbeat = jest.fn();
    const secondHeartbeat = jest.fn();

    const { rerender } = await renderHook(
      ({ onHeartbeat }: { onHeartbeat: (t: number) => void }) =>
        useElapsedSession(startedAt, onHeartbeat),
      { initialProps: { onHeartbeat: firstHeartbeat } }
    );
    expect(firstHeartbeat).toHaveBeenCalledTimes(1); // immediate mount call

    await act(async () => {
      jest.advanceTimersByTime(20_000);
    });
    await rerender({ onHeartbeat: secondHeartbeat });

    await act(async () => {
      jest.advanceTimersByTime(25_000); // crosses the 45s threshold from mount
    });

    // The latest (second) callback should be the one invoked for the 45s-boundary
    // heartbeat, proving the ref forwarded the new identity without resetting or
    // re-registering the interval — firstHeartbeat gets no further calls beyond
    // its one immediate mount-time call.
    expect(secondHeartbeat).toHaveBeenCalledTimes(1);
    expect(firstHeartbeat).toHaveBeenCalledTimes(1);
  });
});
