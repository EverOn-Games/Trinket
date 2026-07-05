/**
 * Intention notification plumbing tests (START-03). computeFireDate is a pure,
 * clock-injected function (reconcileActiveSession precedent); the schedule/
 * permission paths run against the __mocks__/expo-notifications fake.
 */
import * as Notifications from 'expo-notifications';

import {
  cancelIntentionNotification,
  computeFireDate,
  ensureNotificationPermission,
  scheduleIntentionNotification,
} from '../intentionNotifications';

describe('computeFireDate (pure, clock-injected)', () => {
  // A fixed reference: 2026-07-03 12:00:00 local.
  const NOON = new Date(2026, 6, 3, 12, 0, 0, 0).getTime();

  it('today at a future hour schedules today', () => {
    const fireAt = computeFireDate('today', 18, 0, NOON);
    const d = new Date(fireAt);
    expect(d.getDate()).toBe(3);
    expect(d.getHours()).toBe(18);
  });

  it('today at a past hour silently rolls to tomorrow — never schedules in the past', () => {
    const fireAt = computeFireDate('today', 9, 0, NOON);
    expect(fireAt).toBeGreaterThan(NOON);
    expect(new Date(fireAt).getDate()).toBe(4);
    expect(new Date(fireAt).getHours()).toBe(9);
  });

  it('tomorrow always lands on the next day', () => {
    const fireAt = computeFireDate('tomorrow', 18, 0, NOON);
    expect(new Date(fireAt).getDate()).toBe(4);
    expect(new Date(fireAt).getHours()).toBe(18);
  });
});

describe('permission + scheduling (mocked native module)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ensureNotificationPermission returns the granted flag', async () => {
    await expect(ensureNotificationPermission()).resolves.toBe(true);

    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      granted: false,
    });
    await expect(ensureNotificationPermission()).resolves.toBe(false);
  });

  it('treats a native permission failure exactly like a denial — never throws', async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockRejectedValueOnce(
      new Error('native unavailable')
    );
    await expect(ensureNotificationPermission()).resolves.toBe(false);
  });

  it("schedules with the user's OWN words (cue → title, action → body) and returns the OS id", async () => {
    const id = await scheduleIntentionNotification(
      'when I sit down with my coffee',
      'open the document and write one sentence',
      Date.now() + 60_000
    );
    expect(id).toBe('mock-notification-id');

    const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(call.content.title).toBe('when I sit down with my coffee');
    expect(call.content.body).toBe('open the document and write one sentence');
    // No app-voice framing anywhere in the payload — the content is exactly
    // and only the user's words (START-03, PDA grammar).
    expect(JSON.stringify(call.content)).not.toMatch(/remember|don't forget|you should/i);
  });

  it('cancel is best-effort — a stale id never throws', async () => {
    (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockRejectedValueOnce(
      new Error('already fired')
    );
    await expect(cancelIntentionNotification('stale-id')).resolves.toBeUndefined();
  });
});
