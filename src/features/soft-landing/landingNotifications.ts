/**
 * Soft landing notification plumbing (MECH-01, v0.2 §3). Reuses Starter's
 * plumbing posture wholesale: contextual permission (never at onboarding),
 * DST-safe calendar math, best-effort cancels, and the shame-free hard rules
 * — the notification is the user's own plan spoken back, informational,
 * never an imperative, never a "time to", never a re-engagement hook. No
 * "you ignored your landing" state exists anywhere.
 *
 * Two touches per landing, both low-salience:
 * - heads-up, `leadMinutes` before the moment ("In N minutes, by your plan")
 * - optional transition touch at the moment itself, strictly opt-in
 *
 * All timing math lives in computeLandingFireTimes() — pure and
 * clock-injected (computeFireDate/reconcileActiveSession precedent).
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import type { Landing } from '../../../data/types';

const ANDROID_CHANNEL_ID = 'soft-landings';

export type LandingFireTimes = {
  /** Absent when the runway moment is already in the past — a heads-up
   * about a moment that has passed would be noise, so it is silently
   * skipped (never an error, never a comment). */
  headsUpAt?: number;
  transitionAt: number;
};

export function computeLandingFireTimes(
  activityAt: number,
  leadMinutes: number,
  now: number
): LandingFireTimes {
  const headsUpAt = activityAt - leadMinutes * 60 * 1000;
  return headsUpAt > now ? { headsUpAt, transitionAt: activityAt } : { transitionAt: activityAt };
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    // Idempotent; required on Android 8+ before any notification can show.
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Soft landings',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

async function scheduleAt(title: string, body: string, fireAt: number): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(fireAt),
      channelId: Platform.OS === 'android' ? ANDROID_CHANNEL_ID : undefined,
    },
  });
}

/**
 * Schedule a landing's touch(es). Title is the user's OWN activity label;
 * bodies are localized informational lines passed in by the caller (i18n
 * lives host-side). Returns the OS ids for later cancel.
 */
export async function scheduleLandingNotifications(
  landing: Pick<Landing, 'activityLabel' | 'activityAt' | 'leadMinutes' | 'transitionTouch'>,
  copy: { headsUpBody: string; transitionBody: string },
  now: number
): Promise<{ headsUpNotificationId?: string; transitionNotificationId?: string }> {
  await ensureChannel();
  const times = computeLandingFireTimes(landing.activityAt, landing.leadMinutes, now);

  const result: { headsUpNotificationId?: string; transitionNotificationId?: string } = {};
  if (times.headsUpAt !== undefined) {
    result.headsUpNotificationId = await scheduleAt(
      landing.activityLabel,
      copy.headsUpBody,
      times.headsUpAt
    );
  }
  if (landing.transitionTouch) {
    result.transitionNotificationId = await scheduleAt(
      landing.activityLabel,
      copy.transitionBody,
      times.transitionAt
    );
  }
  return result;
}

/** Best-effort cancel of whichever touches a landing has scheduled. */
export async function cancelLandingNotifications(
  landing: Pick<Landing, 'headsUpNotificationId' | 'transitionNotificationId'>
): Promise<void> {
  for (const id of [landing.headsUpNotificationId, landing.transitionNotificationId]) {
    if (!id) continue;
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // A stale/already-fired id is unremarkable — cancel is best-effort.
    }
  }
}
