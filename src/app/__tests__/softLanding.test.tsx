/**
 * Soft landing screen tests (MECH-01, v0.2 §3): user-configured landing →
 * saved + scheduled + structural event; permission denial keeps the typed
 * form intact with a quiet caption and saves nothing; remove cancels the
 * scheduled touches; the reminders-off sweep in Settings also withdraws
 * landing touches (fields cleared, landings kept).
 */
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import * as Notifications from 'expo-notifications';

import { router } from 'expo-router';

import { setAnalyticsTransport } from '../../analytics/analytics';
import { dumpItemsRepo } from '../../../data/repositories/dumpItems';
import { contentStorage } from '../../../data/mmkv';
import { landingsRepo } from '../../../data/repositories/landings';
import { useSettingsStore } from '../../../data/stores/useSettingsStore';
import en from '../../../i18n/locales/en.json';

import RootLayout from '../_layout';
import HomeScreen from '../index';
import SoftLandingScreen from '../soft-landing';
import SettingsScreen from '../settings';
import BrainDumpScreen from '../brain-dump';
import CoPilotScreen from '../co-pilot';

const routeContext = {
  _layout: RootLayout,
  index: HomeScreen,
  'soft-landing': SoftLandingScreen,
  settings: SettingsScreen,
  'brain-dump': BrainDumpScreen,
  'co-pilot': CoPilotScreen,
};

describe('Soft landing (MECH-01)', () => {
  let sent: Array<{ event: string; props: Record<string, unknown> }>;

  beforeEach(() => {
    contentStorage.clearAll();
    jest.clearAllMocks();
    useSettingsStore.setState({ onboardingComplete: true, notificationsOptIn: false });
    sent = [];
    setAnalyticsTransport((event, props) => sent.push({ event, props }));
  });

  afterEach(() => {
    setAnalyticsTransport(null);
  });

  async function fillAndSave(label = 'dinner with everyone') {
    await renderRouter(routeContext, { initialUrl: '/soft-landing' });
    await fireEvent.changeText(
      screen.getByPlaceholderText(en.softLanding.form.activityPlaceholder),
      label
    );
    await fireEvent.press(screen.getByText(en.softLanding.form.save));
  }

  it('saves a landing, schedules the heads-up, and fires the structural event', async () => {
    await fillAndSave();

    const landings = landingsRepo.list();
    expect(landings).toHaveLength(1);
    expect(landings[0].activityLabel).toBe('dinner with everyone');
    expect(landings[0].leadMinutes).toBe(10); // default runway chip
    expect(landings[0].transitionTouch).toBe(false);
    expect(landings[0].headsUpNotificationId).toBeDefined();
    expect(landings[0].activityAt).toBeGreaterThan(Date.now());

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(sent.filter((e) => e.event === 'landing_scheduled')).toEqual([
      { event: 'landing_scheduled', props: { leadMinutes: 10, transitionTouch: false } },
    ]);
    // Contextual grant flips the app-level opt-in (Starter precedent).
    expect(useSettingsStore.getState().notificationsOptIn).toBe(true);
  });

  it('the transition touch is opt-in and schedules a second quiet note', async () => {
    await renderRouter(routeContext, { initialUrl: '/soft-landing' });
    await fireEvent.changeText(
      screen.getByPlaceholderText(en.softLanding.form.activityPlaceholder),
      'the gym'
    );
    await fireEvent.press(screen.getByText(en.softLanding.form.transitionTouch));
    await fireEvent.press(screen.getByText(en.softLanding.form.save));

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    expect(landingsRepo.list()[0].transitionNotificationId).toBeDefined();
  });

  it('permission denial saves nothing, keeps the typed label, shows the quiet caption', async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      granted: false,
    });

    await fillAndSave('call with Marta');

    expect(landingsRepo.list()).toHaveLength(0);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(screen.getByText(en.softLanding.form.unavailable)).toBeTruthy();
    // The typed label survives — nothing the user made is thrown away.
    expect(screen.getByDisplayValue('call with Marta')).toBeTruthy();
  });

  it('an empty label quietly saves nothing', async () => {
    await renderRouter(routeContext, { initialUrl: '/soft-landing' });
    await fireEvent.press(screen.getByText(en.softLanding.form.save));

    expect(landingsRepo.list()).toHaveLength(0);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('removing a landing cancels its scheduled touches', async () => {
    await fillAndSave();
    await fireEvent.press(screen.getByText(en.softLanding.list.remove));

    expect(landingsRepo.list()).toHaveLength(0);
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalled();
  });

  it('arriving from a task pre-fills the activity and stamps sourceTaskId on save (§3 entry)', async () => {
    const item = dumpItemsRepo.create({ text: 'email Marta', category: 'work' });
    await renderRouter(routeContext, {
      initialUrl: `/soft-landing?prefillLabel=${encodeURIComponent(item.text)}&sourceTaskId=${item.id}`,
    });

    expect(screen.getByDisplayValue('email Marta')).toBeTruthy();
    await fireEvent.press(screen.getByText(en.softLanding.form.save));

    const landing = landingsRepo.list()[0];
    expect(landing.activityLabel).toBe('email Marta');
    expect(landing.sourceTaskId).toBe(item.id);
  });

  it('the brain-dump row offers a soft-landing entry that hands off pre-filled', async () => {
    const item = dumpItemsRepo.create({ text: 'call the bank', category: 'errands' });
    const pushSpy = jest.spyOn(router, 'push').mockImplementation(() => undefined);
    await renderRouter(routeContext, { initialUrl: '/brain-dump' });

    await fireEvent.press(screen.getByText(en.brainDump.item.softLanding));

    expect(pushSpy).toHaveBeenCalledWith({
      pathname: '/soft-landing',
      params: { prefillLabel: 'call the bank', sourceTaskId: item.id },
    });
    pushSpy.mockRestore();
  });

  it('the active session offers a quiet soft-landing route (§3 "from a session")', async () => {
    useSettingsStore.setState({ subscriptionCache: { tier: 'plus' } });
    const pushSpy = jest.spyOn(router, 'push').mockImplementation(() => undefined);
    await renderRouter(routeContext, { initialUrl: '/co-pilot' });
    await fireEvent.press(screen.getByText(en.coPilot.setup.justWork.label));

    await fireEvent.press(screen.getByText(en.coPilot.active.softLandingLink));

    expect(pushSpy).toHaveBeenCalledWith('/soft-landing');
    pushSpy.mockRestore();
  });

  it('the Settings reminders-off sweep withdraws landing touches but keeps the landings', async () => {
    landingsRepo.create({
      activityLabel: 'dinner',
      leadMinutes: 10,
      activityAt: Date.now() + 60 * 60 * 1000,
      transitionTouch: false,
      headsUpNotificationId: 'landing-note-1',
    });
    useSettingsStore.setState({ notificationsOptIn: true });

    await renderRouter(routeContext, { initialUrl: '/settings' });
    await fireEvent.press(screen.getByText(en.settings.notifications.toggleOff));

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('landing-note-1');
    const landing = landingsRepo.list()[0];
    expect(landing).toBeDefined();
    expect(landing.headsUpNotificationId).toBeUndefined();
  });
});
