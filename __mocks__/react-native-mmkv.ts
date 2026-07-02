/**
 * In-memory fake of the react-native-mmkv v4 surface, used exclusively under Jest.
 *
 * MMKV v4 is built on Nitro Modules (JSI) and cannot initialize inside Jest's Node test
 * environment ("Failed to get NitroModules" — see 01-RESEARCH.md Pitfall 1 /
 * github.com/mrousavy/react-native-mmkv/issues/945). This mock lets repository logic
 * (CRUD correctness, index management, schema shape) be unit-tested without the real
 * native binding. Actual on-device persistence must be verified separately on hardware.
 */

type MMKVPrimitive = string | number | boolean;

export interface MMKVConfiguration {
  id: string;
  encryptionKey?: string;
  encryptionType?: string;
}

export class MMKV {
  private readonly store = new Map<string, MMKVPrimitive>();

  set(key: string, value: MMKVPrimitive): void {
    this.store.set(key, value);
  }

  getString(key: string): string | undefined {
    const value = this.store.get(key);
    return typeof value === 'string' ? value : undefined;
  }

  getBoolean(key: string): boolean | undefined {
    const value = this.store.get(key);
    return typeof value === 'boolean' ? value : undefined;
  }

  getNumber(key: string): number | undefined {
    const value = this.store.get(key);
    return typeof value === 'number' ? value : undefined;
  }

  remove(key: string): void {
    this.store.delete(key);
  }

  contains(key: string): boolean {
    return this.store.has(key);
  }

  getAllKeys(): string[] {
    return Array.from(this.store.keys());
  }

  clearAll(): void {
    this.store.clear();
  }
}

// Distinct `id` values must yield independent stores; the same `id` must return the
// same underlying store across calls, mirroring real MMKV's per-id singleton behavior.
const instancesById = new Map<string, MMKV>();

export function createMMKV(config: MMKVConfiguration): MMKV {
  const existing = instancesById.get(config.id);
  if (existing) {
    return existing;
  }

  const instance = new MMKV();
  instancesById.set(config.id, instance);
  return instance;
}
