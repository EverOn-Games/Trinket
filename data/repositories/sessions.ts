/**
 * sessionsRepo — per-record + index-key CRUD, namespaced under `session:*` so
 * it never collides with dumpItems/intentions sharing the same MMKV instance.
 * Follows ARCHITECTURE.md Pattern 2's sessionsRepo reference.
 *
 * A session's creation timestamp IS `startedAt` (no separate createdAt field)
 * — see data/types.ts.
 *
 * MEMORY-FIRST (device UAT 2026-07-05): reads serve from an in-memory map
 * hydrated once from MMKV; writes update the map AND write through to MMKV.
 * On-device MMKV v4 reads were stale for a window after a write, freezing
 * mounted lists — see data/repoCache.ts for the full rationale.
 */
import { contentStorage } from '../mmkv';
import { notifyRepoChanged } from '../repoBus';
import { registerRepoCacheReset } from '../repoCache';
import { newId } from '../../lib/id';
import type { Session } from '../types';

const NAMESPACE = 'session';
const INDEX_KEY = `${NAMESPACE}:index`;
const recordKey = (id: string) => `${NAMESPACE}:${id}`;

function readIndex(): string[] {
  const raw = contentStorage.getString(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    // T-01-10: tolerate malformed JSON in the index key rather than crash.
    return [];
  }
}

function writeIndex(ids: string[]): void {
  contentStorage.set(INDEX_KEY, JSON.stringify(ids));
}

function readRecord(id: string): Session | undefined {
  const raw = contentStorage.getString(recordKey(id));
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    // T-01-10: tolerate malformed JSON in a record key rather than crash list()/get().
    return undefined;
  }
}

let cache: Map<string, Session> | null = null;
let cacheOrder: string[] = [];

function ensureCache(): Map<string, Session> {
  if (cache === null) {
    cache = new Map();
    cacheOrder = readIndex();
    for (const id of cacheOrder) {
      const record = readRecord(id);
      if (record) cache.set(id, record);
    }
  }
  return cache;
}

registerRepoCacheReset(() => {
  cache = null;
  cacheOrder = [];
});

export const sessionsRepo = {
  create(input: Omit<Session, 'id' | 'startedAt'>): Session {
    const map = ensureCache();
    const session: Session = { ...input, id: newId(), startedAt: Date.now() };
    map.set(session.id, session);
    cacheOrder = [...cacheOrder, session.id];
    contentStorage.set(recordKey(session.id), JSON.stringify(session));
    writeIndex(cacheOrder);
    notifyRepoChanged('session');
    return session;
  },

  get(id: string): Session | undefined {
    return ensureCache().get(id);
  },

  list(): Session[] {
    const map = ensureCache();
    return cacheOrder
      .map((id) => map.get(id))
      .filter((record): record is Session => record !== undefined);
  },

  update(id: string, patch: Partial<Omit<Session, 'id'>>): Session | undefined {
    const map = ensureCache();
    const existing = map.get(id);
    if (!existing) return undefined;
    const updated: Session = { ...existing, ...patch };
    map.set(id, updated);
    contentStorage.set(recordKey(id), JSON.stringify(updated));
    notifyRepoChanged('session');
    return updated;
  },

  remove(id: string): void {
    const map = ensureCache();
    map.delete(id);
    cacheOrder = cacheOrder.filter((existingId) => existingId !== id);
    contentStorage.remove(recordKey(id));
    writeIndex(cacheOrder);
    notifyRepoChanged('session');
  },
};
