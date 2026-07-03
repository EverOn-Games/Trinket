/**
 * reconcileActiveSession — pure cold-launch reconciliation decision function
 * (D-11/D-12). Mirrors useIdleScheduler.ts's pickWeightedMicroBehavior /
 * nextIdleIntervalMs shape: explicit inputs in, deterministic discriminated-union
 * output out, no MMKV/React import, no Date.now() read internally — trivially
 * unit-testable with plain Jest it() blocks and zero mocks.
 */
import type { ActiveSessionPointer } from '../../../data/types';

export type ReconcileAction =
  | { kind: 'none' }
  | { kind: 'keep-live' } // D-11: Home may render the resume card
  | { kind: 'reconcile-stale'; endedAt: number }; // D-12: silent close

export function reconcileActiveSession(
  pointer: ActiveSessionPointer | undefined,
  now: number,
  thresholdMs: number
): ReconcileAction {
  if (!pointer) return { kind: 'none' };
  // Gate on lastAliveAt (last CONFIRMED alive), not startedAt (total duration) —
  // amended D-11 / RESEARCH.md Pitfall 3. A long foregrounded session that
  // force-quit minutes ago must still show the resume card even if startedAt is
  // far older than thresholdMs. A `<=` comparison also means backward clock
  // skew (now < lastAliveAt, a negative diff) always resolves to keep-live,
  // never crashing or reconciling away a live session (T-03-02).
  if (now - pointer.lastAliveAt <= thresholdMs) return { kind: 'keep-live' };
  return { kind: 'reconcile-stale', endedAt: pointer.lastAliveAt };
}
