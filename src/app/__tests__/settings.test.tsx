/**
 * Settings screen tests (SETT-01): locale switch persists through the
 * RootLayout write-through listener, reminder opt-out quietly cancels
 * scheduled intention reminders, prominence chips write the store, and the
 * subscription row states the free tier calmly.
 */
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import * as Notifications from 'expo-notifications';

import i18n from '../../../i18n';
import { contentStorage } from '../../../data/mmkv';
import { intentionsRepo } from '../../../data/repositories/intentions';
import { useSettingsStore } from '../../../data/stores/useSettingsStore';
import en from '../../../i18n/locales/en.json';

import RootLayout from '../_layout';
import SettingsScreen from '../settings';

const routeContext = {
  _layout: RootLayout,
  settings: SettingsScreen,
};

describe('Settings (SETT-01)', () => {
  beforeEach(async () => {
    contentStorage.clearAll();
    jest.clearAllMocks();
    useSettingsStore.setState({
      onboardingComplete: true,
      notificationsOptIn: false,
      mascotProminence: 'prominent',
      subscriptionCache: null,
      locale: 'en',
      localeResolved: true,
      themeMode: 'system',
    });
    await i18n.changeLanguage('en');
  });

  it('locale chip switches the runtime language and persists to the store (WR-02 listener)', async () => {
    await renderRouter(routeContext, { initialUrl: '/settings' });

    await fireEvent.press(screen.getByText(en.settings.language.pl));

    expect(i18n.language).toBe('pl');
    expect(useSettingsStore.getState().locale).toBe('pl');
  });

  it('turning reminders off quietly cancels scheduled intention reminders — the intentions survive', async () => {
    const withReminder = intentionsRepo.create({
      cueText: 'when I get home',
      actionText: 'fill the water bottle',
    });
    intentionsRepo.update(withReminder.id, {
      notifyAt: Date.now() + 3600000,
      notificationId: 'scheduled-1',
    });
    useSettingsStore.setState({ notificationsOptIn: true });

    await renderRouter(routeContext, { initialUrl: '/settings' });
    await fireEvent.press(screen.getByText(en.settings.notifications.toggleOff));

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('scheduled-1');
    const after = intentionsRepo.list()[0];
    expect(after.notifyAt).toBeUndefined();
    expect(after.notificationId).toBeUndefined();
    expect(after.actionText).toBe('fill the water bottle'); // untouched
    expect(useSettingsStore.getState().notificationsOptIn).toBe(false);
  });

  it('turning reminders on only re-allows offers — no OS permission ask here (contextual posture)', async () => {
    await renderRouter(routeContext, { initialUrl: '/settings' });

    await fireEvent.press(screen.getByText(en.settings.notifications.toggleOn));

    expect(useSettingsStore.getState().notificationsOptIn).toBe(true);
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('mascot prominence chips write the store (Home reads it reactively)', async () => {
    await renderRouter(routeContext, { initialUrl: '/settings' });

    await fireEvent.press(screen.getByText(en.settings.mascotRow.subtle));
    expect(useSettingsStore.getState().mascotProminence).toBe('subtle');

    await fireEvent.press(screen.getByText(en.settings.mascotRow.hidden));
    expect(useSettingsStore.getState().mascotProminence).toBe('hidden');
  });

  it('subscription row states the free tier as a calm inclusion list, never a depletion warning', async () => {
    await renderRouter(routeContext, { initialUrl: '/settings' });

    expect(screen.getByText(en.settings.subscription.freeTier)).toBeTruthy();
    const sub = en.settings.subscription.freeSub;
    expect(screen.getByText(sub)).toBeTruthy();
    // Copy law: refresh framing, not depletion framing.
    expect(sub).toMatch(/refresh Monday/);
    expect(sub).not.toMatch(/run out|left|remaining|only/i);
  });

  it('a cached plus entitlement shows the plus row', async () => {
    useSettingsStore.setState({ subscriptionCache: { tier: 'plus' } });
    await renderRouter(routeContext, { initialUrl: '/settings' });

    expect(screen.getByText(en.settings.subscription.plusTier)).toBeTruthy();
  });

  it('appearance chips write the themeMode override (POLI-01)', async () => {
    await renderRouter(routeContext, { initialUrl: '/settings' });

    await fireEvent.press(screen.getByText(en.settings.appearance.light));
    expect(useSettingsStore.getState().themeMode).toBe('light');

    await fireEvent.press(screen.getByText(en.settings.appearance.dark));
    expect(useSettingsStore.getState().themeMode).toBe('dark');

    await fireEvent.press(screen.getByText(en.settings.appearance.system));
    expect(useSettingsStore.getState().themeMode).toBe('system');
  });

  it('plus tier shows a manage-subscription link that opens the store management page', async () => {
    useSettingsStore.setState({ subscriptionCache: { tier: 'plus' } });
    const openSpy = jest
      .spyOn(require('react-native').Linking, 'openURL')
      .mockResolvedValue(true);
    await renderRouter(routeContext, { initialUrl: '/settings' });

    await fireEvent.press(screen.getByText(en.settings.subscription.manage));

    // Billing lives with the store — the row must always lead somewhere real
    // (RevenueCat managementURL or the store subscriptions page fallback).
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(String(openSpy.mock.calls[0][0])).toMatch(/^https:\/\//);
    openSpy.mockRestore();
  });

  it('free tier shows no manage-subscription link', async () => {
    await renderRouter(routeContext, { initialUrl: '/settings' });
    expect(screen.queryByText(en.settings.subscription.manage)).toBeNull();
  });

  it('the tier row updates live when a purchase grants while Settings is mounted', async () => {
    // Device UAT 2026-07-05: Settings sits mounted under the pushed paywall;
    // a granted purchase updated subscriptionCache but the row kept showing
    // "Free" until a remount. The display must subscribe, not snapshot.
    await renderRouter(routeContext, { initialUrl: '/settings' });
    expect(screen.getByText(en.settings.subscription.freeTier)).toBeTruthy();

    // v14's async act, matching the codebase's awaited-fireEvent convention.
    await act(async () => {
      useSettingsStore.setState({ subscriptionCache: { tier: 'plus' } });
    });

    expect(screen.getByText(en.settings.subscription.plusTier)).toBeTruthy();
    expect(screen.queryByText(en.settings.subscription.freeTier)).toBeNull();
  });
});
