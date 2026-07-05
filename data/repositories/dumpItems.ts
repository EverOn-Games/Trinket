/**
 * dumpItemsRepo — per-record + index-key CRUD, namespaced under `dumpItem:*`.
 * Identical CRUD contract to sessionsRepo/intentionsRepo (see
 * data/repositories/sessions.ts for the annotated reference implementation).
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
import type { DumpItem } from '../types';

const NAMESPACE = 'dumpItem';
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

function readRecord(id: string): DumpItem | undefined {
  const raw = contentStorage.getString(recordKey(id));
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as DumpItem;
  } catch {
    return undefined;
  }
}

// In-memory source of truth for reads. `null` = not hydrated yet; hydration
// happens lazily on first access (cold-launch reads are safe — staleness only
// ever followed a same-session write).
let cache: Map<string, DumpItem> | null = null;
let cacheOrder: string[] = [];

function ensureCache(): Map<string, DumpItem> {
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

export const dumpItemsRepo = {
  create(input: Omit<DumpItem, 'id' | 'createdAt'>): DumpItem {
    const map = ensureCache();
    const item: DumpItem = { ...input, id: newId(), createdAt: Date.now() };
    map.set(item.id, item);
    cacheOrder = [...cacheOrder, item.id];
    contentStorage.set(recordKey(item.id), JSON.stringify(item));
    writeIndex(cacheOrder);
    notifyRepoChanged('dumpItem');
    return item;
  },

  get(id: string): DumpItem | undefined {
    return ensureCache().get(id);
  },

  list(): DumpItem[] {
    const map = ensureCache();
    return cacheOrder
      .map((id) => map.get(id))
      .filter((record): record is DumpItem => record !== undefined);
  },

  update(id: string, patch: Partial<Omit<DumpItem, 'id'>>): DumpItem | undefined {
    const map = ensureCache();
    const existing = map.get(id);
    if (!existing) return undefined;
    const updated: DumpItem = { ...existing, ...patch };
    map.set(id, updated);
    contentStorage.set(recordKey(id), JSON.stringify(updated));
    notifyRepoChanged('dumpItem');
    return updated;
  },

  remove(id: string): void {
    const map = ensureCache();
    map.delete(id);
    cacheOrder = cacheOrder.filter((existingId) => existingId !== id);
    contentStorage.remove(recordKey(id));
    writeIndex(cacheOrder);
    notifyRepoChanged('dumpItem');
  },
};
