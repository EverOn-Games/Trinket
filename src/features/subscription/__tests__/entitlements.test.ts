/**
 * Entitlements tests (MONEY-02/03 core): Monday-anchored weekly window
 * derived from session timestamps (never stored), offline-default-free tier,
 * and the start-time-only gate.
 */
import { contentStorage } from '../../../../data/mmkv';
import { sessionsRepo } from '../../../../data/repositories/sessions';
import { useSettingsStore } from '../../../../data/stores/useSettingsStore';
import type { SubscriptionCache } from '../../../../data/types';
import {
  FREE_WEEKLY_SESSION_LIMIT,
  canStartSession,
  getTier,
  sessionsStartedThisWeek,
  startOfCurrentWeek,
} from '../entitlements';

// 2026-07-03 is a Friday; the containing week's Monday is 2026-06-29.
const FRIDAY_NOON = new Date(2026, 6, 3, 12, 0, 0, 0).getTime();
const MONDAY_THIS_WEEK = new Date(2026, 5, 29, 0, 0, 0, 0).getTime();

function seedSessionAt(startedAt: number) {
  const session = sessionsRepo.create({ source: 'open' });
  sessionsRepo.update(session.id, { startedAt, endedAt: startedAt + 60000 });
}

describe('startOfCurrentWeek', () => {
  it('anchors to Monday 00:00 local', () => {
    expect(startOfCurrentWeek(FRIDAY_NOON)).toBe(MONDAY_THIS_WEEK);
  });

  it('a Monday belongs to its own week, a Sunday to the previous Monday', () => {
    const mondayMorning = new Date(2026, 5, 29, 8, 0, 0, 0).getTime();
    expect(startOfCurrentWeek(mondayMorning)).toBe(MONDAY_THIS_WEEK);
    const sundayNight = new Date(2026, 6, 5, 23, 30, 0, 0).getTime();
    expect(startOfCurrentWeek(sundayNight)).toBe(MONDAY_THIS_WEEK);
  });
});

describe('weekly session window (derived, never stored)', () => {
  beforeEach(() => {
    contentStorage.clearAll();
    useSettingsStore.setState({ subscriptionCache: null });
  });

  it('counts only sessions started since Monday', () => {
    seedSessionAt(MONDAY_THIS_WEEK - 1); // last week — refreshed away
    seedSessionAt(MONDAY_THIS_WEEK + 1000);
    seedSessionAt(FRIDAY_NOON - 1000);
    expect(sessionsStartedThisWeek(FRIDAY_NOON)).toBe(2);
  });

  it('free tier can start below the limit and is gated at it — "sessions refresh Monday"', () => {
    for (let i = 0; i < FREE_WEEKLY_SESSION_LIMIT - 1; i++) {
      seedSessionAt(MONDAY_THIS_WEEK + 1000 + i);
    }
    expect(canStartSession(FRIDAY_NOON)).toBe(true);

    seedSessionAt(MONDAY_THIS_WEEK + 5000);
    expect(canStartSession(FRIDAY_NOON)).toBe(false);

    // The following Monday, the same sessions no longer count — nothing was
    // reset or deleted; the window simply moved.
    const nextMonday = new Date(2026, 6, 6, 0, 0, 1, 0).getTime();
    expect(canStartSession(nextMonday)).toBe(true);
  });

  it('plus tier is never gated', () => {
    useSettingsStore.setState({ subscriptionCache: { tier: 'plus' } });
    for (let i = 0; i < FREE_WEEKLY_SESSION_LIMIT + 3; i++) {
      seedSessionAt(MONDAY_THIS_WEEK + 1000 + i);
    }
    expect(canStartSession(FRIDAY_NOON)).toBe(true);
  });
});

describe('getTier — offline/unknown defaults to free with no drama (MONEY-03)', () => {
  it.each([
    ['absent', null],
    ['malformed string', 'plus'],
    ['malformed object', { tear: 'plus' }],
    ['unknown tier value', { tier: 'diamond' }],
  ])('%s cache → free', (_label, cache) => {
    // Cast through unknown on purpose: these shapes model CORRUPTED / older
    // persisted MMKV values the store's type would never produce, which is
    // exactly what getTier's runtime guard must survive (MONEY-03).
    useSettingsStore.setState({ subscriptionCache: cache as unknown as SubscriptionCache });
    expect(getTier()).toBe('free');
  });

  it('a positively cached plus entitlement → plus', () => {
    useSettingsStore.setState({ subscriptionCache: { tier: 'plus' } });
    expect(getTier()).toBe('plus');
  });
});
