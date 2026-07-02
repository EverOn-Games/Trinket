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
    const { locale, notificationsOptIn, subscriptionCache } = useSettingsStore.getState();
    return { locale, notificationsOptIn, subscriptionCache };
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
    return settingsRepo.get();
  },
};
