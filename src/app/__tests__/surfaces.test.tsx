/**
 * Out-of-app surface tests (v0.2 §6a/6b, scoped build): the Live Activity
 * mirrors the session lifecycle exactly (start on begin, end on end, orphan
 * sweep at cold launch when nothing is live), and deep-link arrivals from a
 * surface fire the §9 attribution event. The surface never owns the session
 * — every assertion here is about the mirror, with the session state as the
 * source of truth.
 */
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { setAnalyticsTransport } from '../../analytics/analytics';
import { contentStorage } from '../../../data/mmkv';
import { activeSessionRepo } from '../../../data/repositories/activeSession';
import { useSettingsStore } from '../../../data/stores/useSettingsStore';
import en from '../../../i18n/locales/en.json';

import RootLayout from '../_layout';
import HomeScreen from '../index';
import CoPilotScreen from '../co-pilot';

const { liveActivityInstances } = jest.requireMock(
  'expo-widgets'
) as typeof import('../../../__mocks__/expo-widgets');

const routeContext = {
  _layout: RootLayout,
  index: HomeScreen,
  'co-pilot': CoPilotScreen,
};

describe('Session Live Activity mirror (§6b)', () => {
  let sent: Array<{ event: string; props: Record<string, unknown> }>;

  beforeEach(() => {
    contentStorage.clearAll();
    jest.clearAllMocks();
    liveActivityInstances.length = 0;
    useSettingsStore.setState({ onboardingComplete: true, subscriptionCache: { tier: 'plus' } });
    sent = [];
    setAnalyticsTransport((event, props) => sent.push({ event, props }));
  });

  afterEach(() => {
    setAnalyticsTransport(null);
  });

  it('starts an activity when a session starts, carrying startedAt and the resume deep link', async () => {
    await renderRouter(routeContext, { initialUrl: '/co-pilot' });
    await fireEvent.press(screen.getByText(en.coPilot.setup.justWork.label));

    expect(liveActivityInstances).toHaveLength(1);
    const instance = liveActivityInstances[0];
    expect((instance.props as { startedAt: number }).startedAt).toBeGreaterThan(0);
    expect(instance.url).toBe('trinket:///co-pilot?entry=liveActivity');
    expect(instance.ended).toBe(false);
  });

  it('ends the activity when the session ends', async () => {
    await renderRouter(routeContext, { initialUrl: '/co-pilot' });
    await fireEvent.press(screen.getByText(en.coPilot.setup.justWork.label));
    await fireEvent.press(screen.getByText(en.coPilot.active.endButton));

    expect(liveActivityInstances[0].ended).toBe(true);
    expect(liveActivityInstances[0].end).toHaveBeenCalledWith('immediate');
  });

  it('sweeps orphaned activities at cold launch when no session is live', async () => {
    // Simulate a force-quit that left an activity behind: an instance exists
    // but no active-session pointer does.
    liveActivityInstances.push({
      props: { startedAt: Date.now() - 1000, taskLabel: '' },
      ended: false,
      update: jest.fn(),
      end: jest.fn(async function (this: void) {
        liveActivityInstances[0].ended = true;
      }),
    });
    expect(activeSessionRepo.read()).toBeUndefined();

    await renderRouter(routeContext, { initialUrl: '/' });

    expect(liveActivityInstances[0].end).toHaveBeenCalled();
  });

  it('a live session at cold launch keeps its activity (the session genuinely continues)', async () => {
    activeSessionRepo.start('live-session', Date.now() - 60_000, 'still going');
    activeSessionRepo.heartbeat(Date.now());
    liveActivityInstances.push({
      props: { startedAt: Date.now() - 60_000, taskLabel: 'still going' },
      ended: false,
      update: jest.fn(),
      end: jest.fn(),
    });

    await renderRouter(routeContext, { initialUrl: '/' });

    expect(liveActivityInstances[0].end).not.toHaveBeenCalled();
  });

  it('a widget deep-link arrival fires the §9 attribution event, garbage does not', async () => {
    await renderRouter(routeContext, { initialUrl: '/co-pilot?entry=widget' });
    expect(sent.filter((e) => e.event === 'surface_entry')).toEqual([
      { event: 'surface_entry', props: { surface: 'widget' } },
    ]);
  });

  it('a hand-typed garbage entry param is a silent no-op', async () => {
    await renderRouter(routeContext, { initialUrl: '/co-pilot?entry=evil' });
    expect(sent.filter((e) => e.event === 'surface_entry')).toEqual([]);
  });
});
