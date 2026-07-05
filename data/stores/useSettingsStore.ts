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
import type { MascotProminence } from '../../src/components/Mascot/types';

const mmkvStateStorage: StateStorage = {
  setItem: (name, value) => settingsStorage.set(name, value),
  getItem: (name) => settingsStorage.getString(name) ?? null,
  removeItem: (name) => settingsStorage.remove(name),
};

export interface SettingsStoreState {
  locale: Locale;
  // Explicit first-boot sentinel (WR-01): true once a locale has actually been
  // resolved/persisted, independent of whether the `settings` persist key exists
  // in storage for some unrelated reason (e.g. a future write of
  // subscriptionCache before this flag is set). Do not infer "locale resolved"
  // from key presence — see src/app/_layout.tsx's usePersistResolvedLocale.
  localeResolved: boolean;
  notificationsOptIn: boolean;
  subscriptionCache: unknown; // typed placeholder, populated in Phase 7
  // Default 'prominent' for every new install (UI-SPEC Presence prominence levels).
  // The Settings screen to change this doesn't land until Phase 8; this field gives
  // the Mascot module a real value to read via host-provided prop from day one.
  mascotProminence: MascotProminence;
  // First-run gate (ONBD-01): true once onboarding has been completed OR
  // skipped — both are equally valid exits (skippable from any screen, no
  // pressure to finish). A one-way welcome flag, not a streak/engagement
  // field; it never resets on absence.
  onboardingComplete: boolean;
  setLocale: (locale: Locale) => void;
  setNotificationsOptIn: (notificationsOptIn: boolean) => void;
  setMascotProminence: (mascotProminence: MascotProminence) => void;
  setOnboardingComplete: () => void;
}

export const useSettingsStore = create<SettingsStoreState>()(
  persist(
    (set) => ({
      // Default locale 'en' — i18n resolves the real initial value at boot
      // (resolveInitialLocale, D-07) and writes it here via setLocale.
      locale: 'en',
      localeResolved: false,
      notificationsOptIn: false,
      subscriptionCache: null,
      mascotProminence: 'prominent',
      onboardingComplete: false,
      // Setting a locale always marks resolution complete — this is the only
      // place localeResolved flips to true (WR-01).
      setLocale: (locale) => set({ locale, localeResolved: true }),
      setNotificationsOptIn: (notificationsOptIn) => set({ notificationsOptIn }),
      setMascotProminence: (mascotProminence) => set({ mascotProminence }),
      setOnboardingComplete: () => set({ onboardingComplete: true }),
    }),
    {
      name: 'settings',
      storage: createJSONStorage<SettingsStoreState>(() => mmkvStateStorage),
    }
  )
);
