/**
 * intentionsRepo — per-record + index-key CRUD, namespaced under `intention:*`.
 * Identical CRUD contract to sessionsRepo/dumpItemsRepo (see
 * data/repositories/sessions.ts for the annotated reference implementation).
 *
 * MEMORY-FIRST (device UAT 2026-07-05): reads serve from an in-memory map
 * hydrated once from MMKV; writes update the map AND write through to MMKV.
 * See data/repoCache.ts for the full rationale.
 */
import { contentStorage } from '../mmkv';
import { notifyRepoChanged } from '../repoBus';
import { registerRepoCacheReset } from '../repoCache';
import { newId } from '../../lib/id';
import type { Intention } from '../types';

const NAMESPACE = 'intention';
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

function readRecord(id: string): Intention | undefined {
  const raw = contentStorage.getString(recordKey(id));
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as Intention;
  } catch {
    return undefined;
  }
}

let cache: Map<string, Intention> | null = null;
let cacheOrder: string[] = [];

function ensureCache(): Map<string, Intention> {
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

export const intentionsRepo = {
  create(input: Omit<Intention, 'id' | 'createdAt'>): Intention {
    const map = ensureCache();
    const intention: Intention = { ...input, id: newId(), createdAt: Date.now() };
    map.set(intention.id, intention);
    cacheOrder = [...cacheOrder, intention.id];
    contentStorage.set(recordKey(intention.id), JSON.stringify(intention));
    writeIndex(cacheOrder);
    notifyRepoChanged('intention');
    return intention;
  },

  get(id: string): Intention | undefined {
    return ensureCache().get(id);
  },

  list(): Intention[] {
    const map = ensureCache();
    return cacheOrder
      .map((id) => map.get(id))
      .filter((record): record is Intention => record !== undefined);
  },

  update(id: string, patch: Partial<Omit<Intention, 'id'>>): Intention | undefined {
    const map = ensureCache();
    const existing = map.get(id);
    if (!existing) return undefined;
    const updated: Intention = { ...existing, ...patch };
    map.set(id, updated);
    contentStorage.set(recordKey(id), JSON.stringify(updated));
    notifyRepoChanged('intention');
    return updated;
  },

  remove(id: string): void {
    const map = ensureCache();
    map.delete(id);
    cacheOrder = cacheOrder.filter((existingId) => existingId !== id);
    contentStorage.remove(recordKey(id));
    writeIndex(cacheOrder);
    notifyRepoChanged('intention');
  },
};
