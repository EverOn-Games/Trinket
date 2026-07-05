/**
 * activeSessionRepo — single-key pointer marking the one currently-live session,
 * if any (never more than 0 or 1). Deliberately simpler than sessionsRepo's
 * per-record + index-key pattern (settings.ts's flat-blob shape is the closer
 * analog) since there is nothing to list.
 *
 * lastAliveAt is a liveness heartbeat, NOT an aggregate (D-09) — see the schema
 * denylist guard (data/repositories/__tests__/schema.denylist.test.ts).
 */
import { contentStorage } from '../mmkv';
import { notifyRepoChanged } from '../repoBus';
import type { ActiveSessionPointer } from '../types';

const KEY = 'activeSession:pointer';

function readPointer(): ActiveSessionPointer | undefined {
  const raw = contentStorage.getString(KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as ActiveSessionPointer;
  } catch {
    // T-03-01: mirror sessionsRepo's readRecord tolerance — a malformed pointer
    // (e.g. from an interrupted write) must not crash the app-boot reconciliation
    // sweep.
    return undefined;
  }
}

export const activeSessionRepo = {
  start(sessionId: string, startedAt: number, taskLabel?: string): void {
    const pointer: ActiveSessionPointer = { sessionId, startedAt, lastAliveAt: startedAt, taskLabel };
    contentStorage.set(KEY, JSON.stringify(pointer));
    notifyRepoChanged('activeSession');
  },

  // Deliberately NOT notified on heartbeat: lastAliveAt ticks every few
  // seconds during a live session, and re-rendering every subscriber on each
  // tick would be pure waste — subscribers care about the pointer appearing
  // or disappearing, not its liveness timestamp.
  heartbeat(lastAliveAt: number): void {
    const existing = readPointer();
    if (!existing) return;
    contentStorage.set(KEY, JSON.stringify({ ...existing, lastAliveAt }));
  },

  read(): ActiveSessionPointer | undefined {
    return readPointer();
  },

  clear(): void {
    contentStorage.remove(KEY);
    notifyRepoChanged('activeSession');
  },
};
