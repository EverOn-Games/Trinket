/**
 * Soft landing plumbing tests (MECH-01): pure fire-time math + scheduling
 * shape (expo-notifications globally mocked). The shame-free properties are
 * structural: a past runway moment is silently skipped (never an error), and
 * the transition touch only exists when opted into.
 */
import * as Notifications from 'expo-notifications';

import {
  computeLandingFireTimes,
  scheduleLandingNotifications,
  cancelLandingNotifications,
} from '../landingNotifications';

const NOW = new Date(2026, 6, 6, 12, 0, 0, 0).getTime();
const MIN = 60 * 1000;

describe('computeLandingFireTimes', () => {
  it('heads-up fires leadMinutes before the moment', () => {
    const times = computeLandingFireTimes(NOW + 60 * MIN, 10, NOW);
    expect(times).toEqual({ headsUpAt: NOW + 50 * MIN, transitionAt: NOW + 60 * MIN });
  });

  it('silently omits the heads-up when the runway moment has already passed', () => {
    const times = computeLandingFireTimes(NOW + 5 * MIN, 10, NOW);
    expect(times).toEqual({ transitionAt: NOW + 5 * MIN });
  });
});

describe('scheduleLandingNotifications', () => {
  beforeEach(() => jest.clearAllMocks());

  const copy = { headsUpBody: 'In 10 minutes — the switch you planned.', transitionBody: 'About now.' };

  it('schedules only the heads-up by default (transition touch is opt-in)', async () => {
    const ids = await scheduleLandingNotifications(
      { activityLabel: 'dinner', activityAt: NOW + 60 * MIN, leadMinutes: 10, transitionTouch: false },
      copy,
      NOW
    );

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(ids.headsUpNotificationId).toBeDefined();
    expect(ids.transitionNotificationId).toBeUndefined();
    // The title is the user's OWN words; the body is the informational line.
    const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(call.content).toEqual({ title: 'dinner', body: copy.headsUpBody });
  });

  it('schedules both touches when the transition touch is opted into', async () => {
    const ids = await scheduleLandingNotifications(
      { activityLabel: 'dinner', activityAt: NOW + 60 * MIN, leadMinutes: 10, transitionTouch: true },
      copy,
      NOW
    );

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    expect(ids.headsUpNotificationId).toBeDefined();
    expect(ids.transitionNotificationId).toBeDefined();
  });
});

describe('cancelLandingNotifications', () => {
  it('best-effort cancels whichever ids exist', async () => {
    await cancelLandingNotifications({
      headsUpNotificationId: 'a',
      transitionNotificationId: undefined,
    });
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('a');
  });
});
