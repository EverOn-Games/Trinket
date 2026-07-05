/**
 * Starter screen route tests (START-01..04). Mirrors brainDumpCapture.test.tsx's
 * routeContext + contentStorage.clearAll() pattern; every fireEvent is awaited
 * (RNTL v14 async fireEvent precedent).
 */
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import * as Notifications from 'expo-notifications';

import { contentStorage } from '../../../data/mmkv';
import { intentionsRepo } from '../../../data/repositories/intentions';
import { useSettingsStore } from '../../../data/stores/useSettingsStore';
import en from '../../../i18n/locales/en.json';

import RootLayout from '../_layout';
import StarterScreen from '../starter';

const routeContext = {
  _layout: RootLayout,
  starter: StarterScreen,
};

describe('Starter two-step builder (START-01/02/04)', () => {
  beforeEach(() => {
    contentStorage.clearAll();
    jest.clearAllMocks();
  });

  it('builds a when/then intention in exactly two steps and saves it', async () => {
    await renderRouter(routeContext, { initialUrl: '/starter' });

    // Empty state lands straight in the builder — step 1 (cue).
    expect(screen.getByText(en.starter.builder.cueHeading)).toBeTruthy();
    // The static coaching copy for the tiny first step belongs to step 2,
    // not step 1.
    expect(screen.queryByText(en.starter.builder.actionSubcopy)).toBeNull();

    // Library chip pre-fills the editable cue field (START-02: grouped
    // time/place/event library is rendered).
    expect(screen.getByText(en.starter.cues.time.label)).toBeTruthy();
    expect(screen.getByText(en.starter.cues.place.label)).toBeTruthy();
    expect(screen.getByText(en.starter.cues.event.label)).toBeTruthy();
    await fireEvent.press(screen.getByText(en.starter.cues.time.morningCoffee));
    await fireEvent.press(screen.getByText(en.starter.builder.cueNext));

    // Step 2 (action) with the START-04 tiny-first-step coaching copy.
    expect(screen.getByText(en.starter.builder.actionHeading)).toBeTruthy();
    expect(screen.getByText(en.starter.builder.actionSubcopy)).toBeTruthy();
    const actionInput = screen.getByPlaceholderText(en.starter.builder.actionPlaceholder);
    await fireEvent.changeText(actionInput, 'put my running shoes by the door');
    await fireEvent.press(screen.getByText(en.starter.builder.save));

    const intentions = intentionsRepo.list();
    expect(intentions).toHaveLength(1);
    expect(intentions[0].cueText).toBe(en.starter.cues.time.morningCoffee);
    expect(intentions[0].actionText).toBe('put my running shoes by the door');
    // No reminder unless explicitly asked for (START-03 is optional).
    expect(intentions[0].notifyAt).toBeUndefined();

    // The saved card is on screen.
    expect(await screen.findByText('put my running shoes by the door')).toBeTruthy();
  });

  it('a typed cue always wins over the library (pick OR type)', async () => {
    await renderRouter(routeContext, { initialUrl: '/starter' });

    const cueInput = screen.getByPlaceholderText(en.starter.builder.cuePlaceholder);
    await fireEvent.changeText(cueInput, 'when I close the laptop');
    await fireEvent.press(screen.getByText(en.starter.builder.cueNext));
    const actionInput = screen.getByPlaceholderText(en.starter.builder.actionPlaceholder);
    await fireEvent.changeText(actionInput, 'stretch for ten seconds');
    await fireEvent.press(screen.getByText(en.starter.builder.save));

    expect(intentionsRepo.list()[0].cueText).toBe('when I close the laptop');
  });
});

describe('Starter reminder (START-03) + delete', () => {
  beforeEach(() => {
    contentStorage.clearAll();
    jest.clearAllMocks();
    intentionsRepo.create({ cueText: 'when I get home', actionText: 'fill the water bottle' });
  });

  it('schedules ONE self-worded reminder contextually and stores the handle', async () => {
    await renderRouter(routeContext, { initialUrl: '/starter' });

    // Permission is NOT requested on mount — only on the explicit ask
    // (contextual permission, START-03/ONBD-01).
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText(en.starter.notify.offer));
    await fireEvent.press(screen.getByText(en.starter.notify.dayTomorrow));
    await fireEvent.press(screen.getByText(en.starter.notify.slotMorning));
    await fireEvent.press(screen.getByText(en.starter.notify.confirm));

    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(call.content.title).toBe('when I get home');
    expect(call.content.body).toBe('fill the water bottle');

    const stored = intentionsRepo.list()[0];
    expect(stored.notificationId).toBe('mock-notification-id');
    expect(stored.notifyAt).toBeGreaterThan(Date.now());
    // Granting the contextual ask flips the settings opt-in.
    expect(useSettingsStore.getState().notificationsOptIn).toBe(true);

    // Remove reminder cancels and clears — the intention itself survives.
    await fireEvent.press(await screen.findByText(en.starter.notify.remove));
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'mock-notification-id'
    );
    const after = intentionsRepo.list()[0];
    expect(after.notifyAt).toBeUndefined();
    expect(after.notificationId).toBeUndefined();
    expect(after.actionText).toBe('fill the water bottle');
  });

  it('re-scheduling replaces the previous reminder — never orphans one (BLITZ-REVIEW critical)', async () => {
    (Notifications.scheduleNotificationAsync as jest.Mock)
      .mockResolvedValueOnce('first-id')
      .mockResolvedValueOnce('second-id');
    await renderRouter(routeContext, { initialUrl: '/starter' });

    // First schedule.
    await fireEvent.press(screen.getByText(en.starter.notify.offer));
    await fireEvent.press(screen.getByText(en.starter.notify.confirm));
    expect(intentionsRepo.list()[0].notificationId).toBe('first-id');

    // Remove + re-add via the offer again isn't needed — schedule directly a
    // second time (simulating any path that re-schedules): the FIRST OS
    // notification must be cancelled, not orphaned.
    await fireEvent.press(await screen.findByText(en.starter.notify.remove));
    await fireEvent.press(screen.getByText(en.starter.notify.offer));
    await fireEvent.press(screen.getByText(en.starter.notify.confirm));

    expect(intentionsRepo.list()[0].notificationId).toBe('second-id');
    // Every id that ever existed was either replaced-after-cancel or removed —
    // cancel was called for 'first-id' (via remove) and nothing dangles.
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('first-id');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
  });

  it('"Change the time" reopens the picker and replaces the reminder in one flow (UAT-05-02)', async () => {
    (Notifications.scheduleNotificationAsync as jest.Mock)
      .mockResolvedValueOnce('first-id')
      .mockResolvedValueOnce('second-id');
    await renderRouter(routeContext, { initialUrl: '/starter' });

    await fireEvent.press(screen.getByText(en.starter.notify.offer));
    await fireEvent.press(screen.getByText(en.starter.notify.confirm));
    expect(intentionsRepo.list()[0].notificationId).toBe('first-id');

    // One tap to change: no remove-then-re-add dance required.
    await fireEvent.press(await screen.findByText(en.starter.notify.changeTime));
    await fireEvent.press(screen.getByText(en.starter.notify.slotEvening));
    await fireEvent.press(screen.getByText(en.starter.notify.confirm));

    // The old OS notification was cancelled (replace-don't-orphan), the new
    // handle is stored, exactly two schedules total.
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('first-id');
    expect(intentionsRepo.list()[0].notificationId).toBe('second-id');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
  });

  it('a denied permission is a quiet unavailability, never an error, and stores nothing', async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      granted: false,
    });
    await renderRouter(routeContext, { initialUrl: '/starter' });

    await fireEvent.press(screen.getByText(en.starter.notify.offer));
    await fireEvent.press(screen.getByText(en.starter.notify.confirm));

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(intentionsRepo.list()[0].notifyAt).toBeUndefined();
    expect(await screen.findByText(en.starter.notify.unavailable)).toBeTruthy();
    // The intention card is still fully present — nothing lost.
    expect(screen.getByText('fill the water bottle')).toBeTruthy();
  });

  it('delete asks with shame-free framing and Keep it declines', async () => {
    await renderRouter(routeContext, { initialUrl: '/starter' });

    await fireEvent.press(screen.getByText(en.starter.cards.delete));
    expect(screen.getByText(en.starter.cards.deleteConfirmHeading)).toBeTruthy();
    await fireEvent.press(screen.getByText(en.starter.cards.deleteKeep));
    expect(intentionsRepo.list()).toHaveLength(1);

    await fireEvent.press(screen.getByText(en.starter.cards.delete));
    await fireEvent.press(screen.getByText(en.starter.cards.deleteConfirm));
    expect(intentionsRepo.list()).toHaveLength(0);
  });
});
