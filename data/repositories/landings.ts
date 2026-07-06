/**
 * landingsRepo — per-record + index-key CRUD, namespaced under `landing:*`.
 * Identical CRUD contract to sessionsRepo/dumpItemsRepo/intentionsRepo (see
 * data/repositories/sessions.ts for the annotated reference implementation).
 *
 * MEMORY-FIRST: reads serve from an in-memory map hydrated once from MMKV;
 * writes update the map AND write through to MMKV. See data/repoCache.ts.
 *
 * Soft landing constraint (v0.2 §3): no completion tracking lives here or
 * anywhere — a landing is a plan reflected back, never a scorecard. Expired
 * landings are lazily removed by the screen, which is deletion, not
 * recording.
 */
import { contentStorage } from '../mmkv';
import { notifyRepoChanged } from '../repoBus';
import { registerRepoCacheReset } from '../repoCache';
import { newId } from '../../lib/id';
import type { Landing } from '../types';

const NAMESPACE = 'landing';
const INDEX_KEY = `${NAMESPACE}:index`;
const recordKey = (id: string) => `${NAMESPACE}:${id}`;

function readIndex(): string[] {
  const raw = contentStorage.getString(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function writeIndex(ids: string[]): void {
  contentStorage.set(INDEX_KEY, JSON.stringify(ids));
}

function readRecord(id: string): Landing | undefined {
  const raw = contentStorage.getString(recordKey(id));
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as Landing;
  } catch {
    return undefined;
  }
}

let cache: Map<string, Landing> | null = null;
let cacheOrder: string[] = [];

function ensureCache(): Map<string, Landing> {
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

export const landingsRepo = {
  create(input: Omit<Landing, 'id' | 'createdAt'>): Landing {
    const map = ensureCache();
    const landing: Landing = { ...input, id: newId(), createdAt: Date.now() };
    map.set(landing.id, landing);
    cacheOrder = [...cacheOrder, landing.id];
    contentStorage.set(recordKey(landing.id), JSON.stringify(landing));
    writeIndex(cacheOrder);
    notifyRepoChanged('landing');
    return landing;
  },

  get(id: string): Landing | undefined {
    return ensureCache().get(id);
  },

  list(): Landing[] {
    const map = ensureCache();
    return cacheOrder
      .map((id) => map.get(id))
      .filter((record): record is Landing => record !== undefined);
  },

  update(id: string, patch: Partial<Omit<Landing, 'id'>>): Landing | undefined {
    const map = ensureCache();
    const existing = map.get(id);
    if (!existing) return undefined;
    const updated: Landing = { ...existing, ...patch };
    map.set(id, updated);
    contentStorage.set(recordKey(id), JSON.stringify(updated));
    notifyRepoChanged('landing');
    return updated;
  },

  remove(id: string): void {
    const map = ensureCache();
    map.delete(id);
    cacheOrder = cacheOrder.filter((existingId) => existingId !== id);
    contentStorage.remove(recordKey(id));
    writeIndex(cacheOrder);
    notifyRepoChanged('landing');
  },
};
