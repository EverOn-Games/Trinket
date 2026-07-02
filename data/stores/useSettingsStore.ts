/**
 * useSettingsStore — the settings singleton. Unlike the three growing collections
 * (sessions/dumpItems/intentions), settings is a single small blob that's cheap to
 * rehydrate whole, so it uses Zustand's `persist` middleware over an MMKV-backed
 * `StateStorage` adapter rather than the repository-over-index pattern.
 *
 * Source: mrousavy/react-native-mmkv's WRAPPER_ZUSTAND_PERSIST_MIDDLEWARE.md pattern
 * (01-RESEARCH.md Architecture Patterns Pattern B). `createJSONStorage` is used to
 * adapt the raw string-based StateStorage into zustand's typed PersistStorage<S>
 * contract, avoiding an `any` cast on the `storage` option.
 */
import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { settingsStorage } from '../mmkv';
import type { Locale } from '../types';

const mmkvStateStorage: StateStorage = {
  setItem: (name, value) => settingsStorage.set(name, value),
  getItem: (name) => settingsStorage.getString(name) ?? null,
  removeItem: (name) => settingsStorage.remove(name),
};

export interface SettingsStoreState {
  locale: Locale;
  notificationsOptIn: boolean;
  subscriptionCache: unknown; // typed placeholder, populated in Phase 7
  setLocale: (locale: Locale) => void;
  setNotificationsOptIn: (notificationsOptIn: boolean) => void;
}

export const useSettingsStore = create<SettingsStoreState>()(
  persist(
    (set) => ({
      // Default locale 'en' — i18n resolves the real initial value at boot
      // (resolveInitialLocale, D-07) and writes it here via setLocale.
      locale: 'en',
      notificationsOptIn: false,
      subscriptionCache: null,
      setLocale: (locale) => set({ locale }),
      setNotificationsOptIn: (notificationsOptIn) => set({ notificationsOptIn }),
    }),
    {
      name: 'settings',
      storage: createJSONStorage<SettingsStoreState>(() => mmkvStateStorage),
    }
  )
);
