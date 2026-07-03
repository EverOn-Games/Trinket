/**
 * Unit tests for reconcileActiveSession — pure cold-launch reconciliation
 * decision function (D-11/D-12). Plain describe/it blocks, no renderHook, no
 * mocks — construct pointer objects directly, matching useIdleScheduler.test.ts's
 * no-mock pure-helper idiom.
 */
import { reconcileActiveSession } from '../reconcileActiveSession';

const THRESHOLD_MS = 12 * 60 * 60 * 1000; // 12h, Claude's discretion within the 8-24h band

describe('reconcileActiveSession', () => {
  it('returns none when there is no pointer', () => {
    const now = Date.parse('2026-07-03T12:00:00.000Z');
    expect(reconcileActiveSession(undefined, now, THRESHOLD_MS)).toEqual({ kind: 'none' });
  });

  it('keeps a session live when lastAliveAt is recent, even if startedAt is old (Pitfall 3)', () => {
    const now = Date.parse('2026-07-03T12:00:00.000Z');
    const pointer = {
      sessionId: 'x',
      startedAt: now - 20 * 60 * 60 * 1000, // 20h ago
      lastAliveAt: now - 10 * 60 * 1000, // 10 min ago
    };
    expect(reconcileActiveSession(pointer, now, THRESHOLD_MS)).toEqual({ kind: 'keep-live' });
  });

  it('silently reconciles when lastAliveAt itself is stale', () => {
    const now = Date.parse('2026-07-03T12:00:00.000Z');
    const pointer = {
      sessionId: 'x',
      startedAt: now - 13 * 60 * 60 * 1000,
      lastAliveAt: now - 13 * 60 * 60 * 1000,
    };
    expect(reconcileActiveSession(pointer, now, THRESHOLD_MS)).toEqual({
      kind: 'reconcile-stale',
      endedAt: pointer.lastAliveAt,
    });
  });

  it('never gates on startedAt directly: a fresh startedAt with a stale lastAliveAt still reconciles', () => {
    const now = Date.parse('2026-07-03T12:00:00.000Z');
    const pointer = {
      sessionId: 'x',
      startedAt: now - 30 * 60 * 1000, // only 30 min ago
      lastAliveAt: now - 13 * 60 * 60 * 1000, // but heartbeat is 13h stale (e.g. clock jump)
    };
    expect(reconcileActiveSession(pointer, now, THRESHOLD_MS)).toEqual({
      kind: 'reconcile-stale',
      endedAt: pointer.lastAliveAt,
    });
  });

  it('treats backward clock skew (now < lastAliveAt) as keep-live, never crashing or reconciling away a live session (T-03-02)', () => {
    const lastAliveAt = Date.parse('2026-07-03T12:00:00.000Z');
    const now = lastAliveAt - 5 * 60 * 1000; // "now" is 5 min before lastAliveAt
    const pointer = {
      sessionId: 'x',
      startedAt: lastAliveAt - 60 * 60 * 1000,
      lastAliveAt,
    };
    expect(reconcileActiveSession(pointer, now, THRESHOLD_MS)).toEqual({ kind: 'keep-live' });
  });
});
