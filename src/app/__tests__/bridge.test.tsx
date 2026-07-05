/**
 * Bridge v0 tests (MECH-02): after the warm ending resolves (mood tap or
 * Skip — both equal), a quiet "Anything next?" offer appears IF un-promoted
 * brain-dump items exist: up to 3 items newest-first, plus an equal-weight
 * warm exit. Zero candidates → straight Home, no empty offer. An item tap
 * rides the existing gate-aware promote path and marks the item promoted.
 */
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { router } from 'expo-router';

import { setAnalyticsTransport } from '../../analytics/analytics';
import { contentStorage } from '../../../data/mmkv';
import { dumpItemsRepo } from '../../../data/repositories/dumpItems';
import { sessionsRepo } from '../../../data/repositories/sessions';
import { useSettingsStore } from '../../../data/stores/useSettingsStore';
import en from '../../../i18n/locales/en.json';

import RootLayout from '../_layout';
import HomeScreen from '../index';
import CoPilotScreen from '../co-pilot';

const routeContext = {
  _layout: RootLayout,
  index: HomeScreen,
  'co-pilot': CoPilotScreen,
};

async function runSessionToEnding() {
  await renderRouter(routeContext, { initialUrl: '/co-pilot' });
  await fireEvent.press(screen.getByText(en.coPilot.setup.justWork.label));
  await fireEvent.press(screen.getByText(en.coPilot.active.endButton));
  expect(screen.getByText(en.coPilot.ending.acknowledgment)).toBeTruthy();
}

describe('Bridge v0 (MECH-02)', () => {
  let sent: Array<{ event: string; props: Record<string, unknown> }>;
  let replaceSpy: jest.SpyInstance;

  beforeEach(() => {
    contentStorage.clearAll();
    jest.clearAllMocks();
    useSettingsStore.setState({ onboardingComplete: true, subscriptionCache: { tier: 'plus' } });
    sent = [];
    setAnalyticsTransport((event, props) => sent.push({ event, props }));
    replaceSpy = jest.spyOn(router, 'replace').mockImplementation(() => undefined);
  });

  afterEach(() => {
    setAnalyticsTransport(null);
    replaceSpy.mockRestore();
  });

  it('offers up to 3 un-promoted items newest-first after Skip', async () => {
    // Explicit createdAt spacing — four create() calls land in the same
    // Date.now() millisecond, which would make "newest-first" a tie.
    const seed = [
      ['water the plants', 'home'],
      ['email Marta', 'work'],
      ['call the bank', 'errands'],
      ['sort the shelf', 'someday'],
    ] as const;
    seed.forEach(([text, category], i) => {
      const item = dumpItemsRepo.create({ text, category });
      dumpItemsRepo.update(item.id, { createdAt: 1000 + i });
    });

    await runSessionToEnding();
    await fireEvent.press(screen.getByText(en.coPilot.ending.moodCheck.skip));

    expect(screen.getByText(en.coPilot.bridge.heading)).toBeTruthy();
    expect(screen.getByText(en.coPilot.bridge.done)).toBeTruthy();
    // Newest 3 only — the oldest item is not offered.
    expect(screen.getByText('sort the shelf')).toBeTruthy();
    expect(screen.getByText('call the bank')).toBeTruthy();
    expect(screen.getByText('email Marta')).toBeTruthy();
    expect(screen.queryByText('water the plants')).toBeNull();
    // The bridge is a beat, not a navigation: Home not reached yet.
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it('a mood tap reaches the same bridge (both ending exits are equal)', async () => {
    dumpItemsRepo.create({ text: 'email Marta', category: 'work' });

    await runSessionToEnding();
    await fireEvent.press(screen.getByText(en.coPilot.ending.moodCheck.good));

    expect(screen.getByText(en.coPilot.bridge.heading)).toBeTruthy();
  });

  it('goes straight Home with zero un-promoted items — no empty offer', async () => {
    const item = dumpItemsRepo.create({ text: 'already running', category: 'work' });
    dumpItemsRepo.update(item.id, { promotedTaskId: 'some-session' });

    await runSessionToEnding();
    await fireEvent.press(screen.getByText(en.coPilot.ending.moodCheck.skip));

    expect(replaceSpy).toHaveBeenCalledWith('/');
    expect(screen.queryByText(en.coPilot.bridge.heading)).toBeNull();
  });

  it('"done for now" exits Home and reports startedNext=false', async () => {
    dumpItemsRepo.create({ text: 'email Marta', category: 'work' });

    await runSessionToEnding();
    await fireEvent.press(screen.getByText(en.coPilot.ending.moodCheck.skip));
    await fireEvent.press(screen.getByText(en.coPilot.bridge.done));

    expect(replaceSpy).toHaveBeenCalledWith('/');
    const bridgeEvents = sent.filter((e) => e.event === 'bridge_next');
    expect(bridgeEvents).toEqual([{ event: 'bridge_next', props: { startedNext: false } }]);
  });

  it('an item tap starts the next session on the spot and marks the item promoted', async () => {
    const item = dumpItemsRepo.create({ text: 'email Marta', category: 'work' });

    await runSessionToEnding();
    await fireEvent.press(screen.getByText(en.coPilot.ending.moodCheck.skip));
    await fireEvent.press(screen.getByText('email Marta'));

    // Back in an active session, no navigation — the bridge bridged.
    expect(screen.getByText(en.coPilot.active.endButton)).toBeTruthy();
    expect(replaceSpy).not.toHaveBeenCalled();

    const sessions = sessionsRepo.list();
    expect(sessions).toHaveLength(2);
    const next = sessions.find((s) => s.taskLabel === 'email Marta');
    expect(next).toBeDefined();
    expect(dumpItemsRepo.get(item.id)?.promotedTaskId).toBe(next?.id);

    expect(sent.filter((e) => e.event === 'bridge_next')).toEqual([
      { event: 'bridge_next', props: { startedNext: true } },
    ]);
  });
});
