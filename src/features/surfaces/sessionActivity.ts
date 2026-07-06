/**
 * Live Activity lifecycle seam (v0.2 §6b). The ONLY module that drives the
 * iOS session Live Activity — hosts call these functions and never touch
 * expo-widgets directly, so surface behavior stays in one place (the same
 * seam discipline as purchases.ts/posthog.ts).
 *
 * All access goes through widgetsRuntime.ts's containment boundary: platform
 * gate, EXPO_PUBLIC_DISABLE_SURFACES kill switch, and a lazy guarded load —
 * a missing/broken widgets native module loses the surface, never the app.
 * On top of that, every call here is failure-swallowed: a Live Activity
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
import { deepLinks } from '../../lib/deepLinks';
import { getSessionActivityFactory } from './widgetsRuntime';

export async function startSessionActivity(startedAt: number, taskLabel?: string): Promise<void> {
  const factory = getSessionActivityFactory();
  if (!factory) return;
  try {
    await endAllSessionActivities();
    factory.start({ startedAt, taskLabel: taskLabel ?? '' }, deepLinks.coPilot('liveActivity'));
  } catch {
    // Surface-only failure: the session itself is unaffected, stay quiet.
  }
}

export async function endAllSessionActivities(): Promise<void> {
  const factory = getSessionActivityFactory();
  if (!factory) return;
  try {
    for (const instance of factory.getInstances()) {
      await instance.end('immediate');
    }
  } catch {
    // Best-effort — an already-dead activity is unremarkable.
  }
}
