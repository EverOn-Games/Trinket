/**
 * Live Activity lifecycle seam (v0.2 §6b). The ONLY module that drives the
 * iOS session Live Activity — hosts call these three functions and never
 * touch expo-widgets directly, so surface behavior stays in one place
 * (the same seam discipline as purchases.ts/posthog.ts).
 *
 * Every call is platform-guarded and failure-swallowed: a Live Activity
 * hiccup (unsupported device, user disabled Live Activities, OS budget)
 * must never touch the session itself — the session's source of truth is
 * MMKV timestamps, and this surface is a mirror, never an owner.
 *
 * Lifecycle contract:
 * - start at beginSession (one activity; any stale instances are ended
 *   first — replace-don't-orphan, the reminder-scheduling lesson)
 * - end at endSession (immediate dismissal — the warm ending happens
 *   in-app, not on the lock screen)
 * - sweep at cold launch when no live session pointer exists (a force-quit
 *   mid-session leaves an orphan activity; reconciliation kills it quietly)
 */
import { Platform } from 'react-native';

import TrinketSessionActivity from '../../../widgets/TrinketSessionActivity';
import { deepLinks } from '../../lib/deepLinks';

export async function startSessionActivity(startedAt: number, taskLabel?: string): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    await endAllSessionActivities();
    TrinketSessionActivity.start(
      { startedAt, taskLabel: taskLabel ?? '' },
      deepLinks.coPilot('liveActivity')
    );
  } catch {
    // Surface-only failure: the session itself is unaffected, stay quiet.
  }
}

export async function endAllSessionActivities(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    for (const instance of TrinketSessionActivity.getInstances()) {
      await instance.end('immediate');
    }
  } catch {
    // Best-effort — an already-dead activity is unremarkable.
  }
}
