/**
 * dumpItemsRepo — per-record + index-key CRUD over contentStorage, namespaced under
 * `dumpItem:*`. Identical CRUD contract to sessionsRepo/intentionsRepo (see
 * data/repositories/sessions.ts for the annotated reference implementation).
 */
import { contentStorage } from '../mmkv';
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

export const dumpItemsRepo = {
  create(input: Omit<DumpItem, 'id' | 'createdAt'>): DumpItem {
    const item: DumpItem = { id: newId(), createdAt: Date.now(), ...input };
    contentStorage.set(recordKey(item.id), JSON.stringify(item));
    writeIndex([...readIndex(), item.id]);
    return item;
  },

  get(id: string): DumpItem | undefined {
    return readRecord(id);
  },

  list(): DumpItem[] {
    return readIndex()
      .map((id) => readRecord(id))
      .filter((record): record is DumpItem => record !== undefined);
  },

  update(id: string, patch: Partial<Omit<DumpItem, 'id'>>): DumpItem | undefined {
    const existing = readRecord(id);
    if (!existing) return undefined;
    const updated: DumpItem = { ...existing, ...patch };
    contentStorage.set(recordKey(id), JSON.stringify(updated));
    return updated;
  },

  remove(id: string): void {
    contentStorage.remove(recordKey(id));
    writeIndex(readIndex().filter((existingId) => existingId !== id));
  },
};
