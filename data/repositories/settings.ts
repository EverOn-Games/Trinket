/**
 * settingsRepo — a thin typed accessor over useSettingsStore, giving callers a
 * repository-shaped seam consistent with sessionsRepo/dumpItemsRepo/intentionsRepo
 * even though settings itself is a Zustand-persist singleton, not a per-record
 * collection (see data/stores/useSettingsStore.ts).
 */
import { useSettingsStore } from '../stores/useSettingsStore';
import type { SettingsState } from '../types';

export const settingsRepo = {
  get(): SettingsState {
    const { locale, notificationsOptIn, subscriptionCache, mascotProminence } =
      useSettingsStore.getState();
    return { locale, notificationsOptIn, subscriptionCache, mascotProminence };
  },

  update(patch: Partial<SettingsState>): SettingsState {
    if (patch.locale !== undefined) {
      useSettingsStore.getState().setLocale(patch.locale);
    }
    if (patch.notificationsOptIn !== undefined) {
      useSettingsStore.getState().setNotificationsOptIn(patch.notificationsOptIn);
    }
    if (patch.subscriptionCache !== undefined) {
      useSettingsStore.setState({ subscriptionCache: patch.subscriptionCache });
    }
    if (patch.mascotProminence !== undefined) {
      useSettingsStore.getState().setMascotProminence(patch.mascotProminence);
    }
    return settingsRepo.get();
  },
};
