/**
 * Entitlements (MONEY-02/03 core): tier resolution + the free-tier weekly
 * session window, computed ENTIRELY from existing session timestamps at
 * check time — no counters, no stored aggregates, nothing the schema
 * denylist guards against. The week is Monday 00:00 local ("sessions refresh
 * Monday" — a calm calendar fact, not a countdown).
 *
 * Offline/unknown posture (MONEY-03): anything that isn't a positively
 * cached paid entitlement is the free tier — with no alarming copy anywhere.
 * RevenueCat wiring (Phase 7 full) populates subscriptionCache; this module
 * doesn't care which system wrote it.
 *
 * The gate itself is checked ONLY at session start (never mid-session,
 * never against history), and the limit constant is deliberately one line —
 * a beta-tunable number, not an architecture.
 */
import { sessionsRepo } from '../../../data/repositories/sessions';
import { useSettingsStore } from '../../../data/stores/useSettingsStore';

export type Tier = 'free' | 'plus';

export const FREE_WEEKLY_SESSION_LIMIT = 3;

/** Monday 00:00.000 local time for the week containing `now`. */
export function startOfCurrentWeek(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  // getDay(): Sun=0..Sat=6 → days since Monday (Mon=0..Sun=6).
  const daysSinceMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - daysSinceMonday); // DST-safe via calendar math
  return d.getTime();
}

/** Derived at read time from startedAt timestamps — never stored. */
export function sessionsStartedThisWeek(now: number): number {
  const weekStart = startOfCurrentWeek(now);
  return sessionsRepo.list().filter((s) => s.startedAt >= weekStart).length;
}

/**
 * Positively-cached paid entitlement → plus; everything else (absent,
 * malformed, offline-unknown) → free, quietly (MONEY-03).
 */
export function getTier(): Tier {
  const cache = useSettingsStore.getState().subscriptionCache;
  if (
    typeof cache === 'object' &&
    cache !== null &&
    (cache as { tier?: unknown }).tier === 'plus'
  ) {
    return 'plus';
  }
  return 'free';
}

export function canStartSession(now: number): boolean {
  if (getTier() === 'plus') return true;
  return sessionsStartedThisWeek(now) < FREE_WEEKLY_SESSION_LIMIT;
}
