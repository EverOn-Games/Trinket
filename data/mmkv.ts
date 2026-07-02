/**
 * MMKV v4 instance factory. Uses `createMMKV()`, never `new MMKV()` (v4 breaking
 * change — see 01-RESEARCH.md Architecture Patterns Pattern B / Anti-Patterns).
 *
 * Two logical instances:
 * - contentStorage: the three growing collections (sessions, dumpItems, intentions),
 *   each namespaced by per-record keys + an index key (see data/repositories/*).
 * - settingsStorage: the single settings blob, backed by Zustand's persist middleware
 *   (see data/stores/useSettingsStore.ts).
 *
 * Encryption (T-01-08): deliberately deferred, not silently skipped. No sensitive
 * data (auth tokens) exists until Phase 7's Supabase session adapter lands — an
 * `encryptionKey` + expo-secure-store pairing is planned for that phase alongside
 * the auth storage adapter, per 01-RESEARCH.md Security Domain V6 and this plan's
 * threat_model (T-01-08, disposition: accept (deferred)).
 */
import { createMMKV } from 'react-native-mmkv';

export const contentStorage = createMMKV({ id: 'trinket-content' });
export const settingsStorage = createMMKV({ id: 'trinket-settings' });
