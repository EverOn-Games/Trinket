/**
 * useElapsedSession — timestamp-derived elapsed/dozing hook for the Co-pilot
 * active session screen (D-05, D-07, D-08). Elapsed time and dozing are pure
 * derivations of `Date.now() - startedAt`, recomputed on every render tick —
 * never an in-memory accumulating counter. The render tick pauses entirely
 * while the app is backgrounded (AppState !== 'active') since there is nothing
 * to render when the screen isn't visible, and JS timers are unreliable in the
 * background anyway (Pitfall 2) — on return to 'active' the tick fires
 * immediately so the displayed value is never stale.
 *
 * Follows useIdleScheduler.ts's ref-forwarding pattern for onHeartbeat so a
 * changed callback identity on host re-render never resets the interval.
 */
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

const TICK_MS = 1000;
const DOZE_AFTER_MS = 30 * 60 * 1000;
const WAKE_GRACE_MS = 60 * 1000; // Claude's discretion within D-07's "wakes on touch" spec
const HEARTBEAT_INTERVAL_MS = 45 * 1000; // Claude's discretion within D-09's 30-60s band

export type UseElapsedSessionResult = {
  elapsedMs: number;
  isDozing: boolean;
  wake: () => void;
};

export function useElapsedSession(
  startedAt: number,
  onHeartbeat: (lastAliveAt: number) => void
): UseElapsedSessionResult {
  const [now, setNow] = useState(() => Date.now());
  // lastTouchAt directly drives the rendered isDozing value (D-07's wake-on-touch),
  // so it must be state, not a ref — a ref mutation alone would not schedule a
  // re-render, leaving isDozing stale until the next 1s tick happened to fire.
  const [lastTouchAt, setLastTouchAt] = useState(startedAt);
  const lastHeartbeatAtRef = useRef(0);

  // Ref-forward the latest onHeartbeat so the mount effect below never needs
  // it as a dependency (mirrors useIdleScheduler.ts's latestRef pattern) —
  // written post-render in its own effect, never during render itself.
  const onHeartbeatRef = useRef(onHeartbeat);
  useEffect(() => {
    onHeartbeatRef.current = onHeartbeat;
  });

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (current - lastHeartbeatAtRef.current >= HEARTBEAT_INTERVAL_MS) {
        lastHeartbeatAtRef.current = current;
        onHeartbeatRef.current(current);
      }
    };

    const startTicking = () => {
      tick(); // immediate recompute on (re)start — never trust a stale value
      intervalId = setInterval(tick, TICK_MS);
    };
    const stopTicking = () => {
      if (intervalId) clearInterval(intervalId);
    };

    if (AppState.currentState === 'active') startTicking();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        startTicking();
      } else {
        stopTicking();
        // Tighter heartbeat bound right before backgrounding (D-09) — don't
        // wait for the next 45s tick, which may never come if the OS kills
        // the process while backgrounded.
        const current = Date.now();
        lastHeartbeatAtRef.current = current;
        onHeartbeatRef.current(current);
      }
    });

    return () => {
      stopTicking();
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onHeartbeat forwarded via ref; startedAt is stable for the hook's lifetime
  }, []);

  // T-03-02: clamp backward clock skew to 0 — never a negative elapsed value.
  const elapsedMs = Math.max(0, now - startedAt);
  const isDozing = elapsedMs >= DOZE_AFTER_MS && now - lastTouchAt >= WAKE_GRACE_MS;

  return {
    elapsedMs,
    isDozing,
    wake: () => {
      setLastTouchAt(Date.now());
    },
  };
}
