/**
 * Bridge tests (MECH-02, v0.2 spec §4): after the warm ending resolves, the
 * Bridge is OFFERED as one path among equals (declining is one tap, costless,
 * straight Home). Accepting enters the user-paced ritual (breathing beat via
 * the companion's presence loop + a self-compassion line from the localized
 * library), then the handoff triad: bridge into a session (≤3 un-promoted
 * dump items, newest first), set up a starter, or just close. Also reachable
 * standalone at /bridge (no offer stage — the user summoned it).
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
import BridgeScreen from '../bridge';

const routeContext = {
  _layout: RootLayout,
  index: HomeScreen,
  'co-pilot': CoPilotScreen,
  bridge: BridgeScreen,
};

const COMPASSION_LINES = Object.values(en.bridge.lines);

async function runSessionToBridgeOffer() {
  await renderRouter(routeContext, { initialUrl: '/co-pilot' });
  await fireEvent.press(screen.getByText(en.coPilot.setup.justWork.label));
  await fireEvent.press(screen.getByText(en.coPilot.active.endButton));
  await fireEvent.press(screen.getByText(en.coPilot.ending.moodCheck.skip));
  expect(screen.getByText(en.bridge.offer.heading)).toBeTruthy();
}

async function enterRitualHandoff() {
  await runSessionToBridgeOffer();
  await fireEvent.press(screen.getByText(en.bridge.offer.begin));
  // Landing step: the self-compassion line comes from the fixed library.
  expect(screen.getByText(en.bridge.ritual.landing)).toBeTruthy();
  const lineShown = COMPASSION_LINES.some((line) => screen.queryByText(line) !== null);
  expect(lineShown).toBe(true);
  await fireEvent.press(screen.getByText(en.bridge.ritual.continue));
  expect(screen.getByText(en.bridge.handoff.heading)).toBeTruthy();
}

describe('Bridge (MECH-02, v0.2 §4)', () => {
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

  it('offers the bridge after every ending — even with zero dump items', async () => {
    await runSessionToBridgeOffer();
    expect(screen.getByText(en.bridge.offer.decline)).toBeTruthy();
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it('declining is one tap, costless, straight Home', async () => {
    await runSessionToBridgeOffer();
    await fireEvent.press(screen.getByText(en.bridge.offer.decline));

    expect(replaceSpy).toHaveBeenCalledWith('/');
    expect(sent.filter((e) => e.event === 'bridge_next')).toEqual([
      { event: 'bridge_next', props: { nextAction: 'none' } },
    ]);
  });

  it('the ritual is user-paced: landing + library line, then the handoff triad', async () => {
    dumpItemsRepo.create({ text: 'email Marta', category: 'work' });
    await enterRitualHandoff();

    expect(screen.getByText('email Marta')).toBeTruthy();
    expect(screen.getByText(en.bridge.handoff.starter)).toBeTruthy();
    expect(screen.getByText(en.bridge.handoff.close)).toBeTruthy();
  });

  it('handoff offers at most 3 un-promoted items, newest first', async () => {
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

    await enterRitualHandoff();

    expect(screen.getByText('sort the shelf')).toBeTruthy();
    expect(screen.getByText('call the bank')).toBeTruthy();
    expect(screen.getByText('email Marta')).toBeTruthy();
    expect(screen.queryByText('water the plants')).toBeNull();
  });

  it('an item tap bridges straight into the next session and marks it promoted', async () => {
    const item = dumpItemsRepo.create({ text: 'email Marta', category: 'work' });
    await enterRitualHandoff();
    await fireEvent.press(screen.getByText('email Marta'));

    expect(screen.getByText(en.coPilot.active.endButton)).toBeTruthy();
    const sessions = sessionsRepo.list();
    expect(sessions).toHaveLength(2);
    const next = sessions.find((s) => s.taskLabel === 'email Marta');
    expect(dumpItemsRepo.get(item.id)?.promotedTaskId).toBe(next?.id);
    expect(sent.filter((e) => e.event === 'bridge_next')).toEqual([
      { event: 'bridge_next', props: { nextAction: 'session' } },
    ]);
  });

  it('the starter handoff opens the starter builder', async () => {
    await enterRitualHandoff();
    await fireEvent.press(screen.getByText(en.bridge.handoff.starter));

    expect(replaceSpy).toHaveBeenCalledWith('/starter');
    expect(sent.filter((e) => e.event === 'bridge_next')).toEqual([
      { event: 'bridge_next', props: { nextAction: 'starter' } },
    ]);
  });

  it('standalone /bridge starts at the ritual (no offer — the user summoned it)', async () => {
    const item = dumpItemsRepo.create({ text: 'email Marta', category: 'work' });
    await renderRouter(routeContext, { initialUrl: '/bridge' });

    expect(screen.getByText(en.bridge.ritual.landing)).toBeTruthy();
    expect(screen.queryByText(en.bridge.offer.heading)).toBeNull();

    await fireEvent.press(screen.getByText(en.bridge.ritual.continue));
    await fireEvent.press(screen.getByText('email Marta'));

    // Standalone rides the gate-aware promote param into co-pilot.
    expect(replaceSpy).toHaveBeenCalledWith({
      pathname: '/co-pilot',
      params: { dumpItemId: item.id },
    });
  });
});
