/**
 * sessionsRepo — per-record + index-key CRUD over contentStorage, namespaced under
 * `session:*` so it never collides with dumpItems/intentions sharing the same
 * MMKV instance. Follows ARCHITECTURE.md Pattern 2's sessionsRepo reference.
 *
 * A session's creation timestamp IS `startedAt` (no separate createdAt field) — see
 * data/types.ts.
 */
import { contentStorage } from '../mmkv';
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

export const sessionsRepo = {
  create(input: Omit<Session, 'id' | 'startedAt'>): Session {
    const session: Session = { id: newId(), startedAt: Date.now(), ...input };
    contentStorage.set(recordKey(session.id), JSON.stringify(session));
    writeIndex([...readIndex(), session.id]);
    return session;
  },

  get(id: string): Session | undefined {
    return readRecord(id);
  },

  list(): Session[] {
    return readIndex()
      .map((id) => readRecord(id))
      .filter((record): record is Session => record !== undefined);
  },

  update(id: string, patch: Partial<Omit<Session, 'id'>>): Session | undefined {
    const existing = readRecord(id);
    if (!existing) return undefined;
    const updated: Session = { ...existing, ...patch };
    contentStorage.set(recordKey(id), JSON.stringify(updated));
    return updated;
  },

  remove(id: string): void {
    contentStorage.remove(recordKey(id));
    writeIndex(readIndex().filter((existingId) => existingId !== id));
  },
};
