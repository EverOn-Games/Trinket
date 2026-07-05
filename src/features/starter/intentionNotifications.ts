/**
 * Intention notification plumbing (START-03): one optional local notification
 * per intention, fired once at a user-chosen time, worded as the user's own
 * cue/action back to them — never an app demand, never recurring, never a
 * re-engagement hook (shame-free hard constraint).
 *
 * Permission is requested CONTEXTUALLY — only from ensureNotificationPermission()
 * at the moment the user asks for a reminder, never on mount or during
 * onboarding (ONBD-01). Mirrors useVoiceCapture's contextual-mic-permission
 * posture (Phase 4 D-03).
 *
 * All timing math lives in computeFireDate() — a pure, clock-injected function
 * (reconcileActiveSession precedent) so past-time rollover is unit-testable.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export type ReminderDay = 'today' | 'tomorrow';

const ANDROID_CHANNEL_ID = 'starter-reminders';

/**
 * Resolve a (day, hour, minute) choice into an epoch-ms fire time.
 * If "today" at hour:minute is already in the past relative to `now`,
 * rolls silently to tomorrow — a reminder in the past is never scheduled
 * and never surfaces an error (no punitive feedback).
 */
export function computeFireDate(
  day: ReminderDay,
  hour: number,
  minute: number,
  now: number
): number {
  const base = new Date(now);
  base.setHours(hour, minute, 0, 0);
  if (day === 'tomorrow' || base.getTime() <= now) {
    // Calendar-advance the DATE, then re-pin the wall-clock time — a fixed
    // +24h in milliseconds would shift the reminder by an hour across a DST
    // transition (BLITZ-REVIEW; same calendar-math discipline as
    // entitlements.ts startOfCurrentWeek).
    base.setDate(base.getDate() + 1);
    base.setHours(hour, minute, 0, 0);
  }
  return base.getTime();
}

/**
 * Contextual permission ask (START-03). Returns whether notifications are
 * granted. Callers flip settings.notificationsOptIn on grant; a denial is a
 * quiet "reminders unavailable" state host-side, never an error.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const { granted } = await Notifications.requestPermissionsAsync();
    return granted;
  } catch {
    // Treat any native failure exactly like a denial — text-only fallback,
    // no crash, no error state (T-01-10 tolerance posture).
    return false;
  }
}

/**
 * Schedule the intention's single reminder. Title/body are the user's OWN
 * words (cue → title, action → body) — no app voice, no exhortation, no
 * "don't forget!" framing. Returns the OS notification id for later cancel.
 */
export async function scheduleIntentionNotification(
  cueText: string,
  actionText: string,
  fireAt: number
): Promise<string> {
  if (Platform.OS === 'android') {
    // Idempotent; required on Android 8+ before any notification can show.
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Starter reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  return Notifications.scheduleNotificationAsync({
    content: {
      title: cueText,
      body: actionText,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(fireAt),
      channelId: Platform.OS === 'android' ? ANDROID_CHANNEL_ID : undefined,
    },
  });
}

/** Cancel a previously scheduled reminder (remove-reminder / delete-intention). */
export async function cancelIntentionNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // A stale/already-fired id is unremarkable — cancel is best-effort.
  }
}
