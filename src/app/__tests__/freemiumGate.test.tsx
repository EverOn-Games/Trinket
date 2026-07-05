/**
 * Freemium gate + paywall tests (MONEY-01/02/03): gate at session start only,
 * offer-not-wall paywall, "Not now" always works, plus tier bypasses, and the
 * gate funnel events fire with structural props only.
 */
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { setAnalyticsTransport } from '../../analytics/analytics';
import { contentStorage } from '../../../data/mmkv';
import { sessionsRepo } from '../../../data/repositories/sessions';
import { useSettingsStore } from '../../../data/stores/useSettingsStore';
import { FREE_WEEKLY_SESSION_LIMIT } from '../../features/subscription/entitlements';
import en from '../../../i18n/locales/en.json';

import RootLayout from '../_layout';
import HomeScreen from '../index';
import CoPilotScreen from '../co-pilot';
import PaywallScreen from '../paywall';
import SettingsScreen from '../settings';

const routeContext = {
  _layout: RootLayout,
  index: HomeScreen,
  'co-pilot': CoPilotScreen,
  paywall: PaywallScreen,
  settings: SettingsScreen,
};

function seedSessionsThisWeek(count: number) {
  for (let i = 0; i < count; i++) {
    const s = sessionsRepo.create({ source: 'open' });
    // startedAt = now (well inside the current week); ended a minute later.
    sessionsRepo.update(s.id, { endedAt: s.startedAt + 60000 });
  }
}

describe('Freemium gate (MONEY-02)', () => {
  let sent: Array<{ event: string; props: Record<string, unknown> }>;

  beforeEach(() => {
    contentStorage.clearAll();
    jest.clearAllMocks();
    useSettingsStore.setState({ onboardingComplete: true, subscriptionCache: null });
    sent = [];
    setAnalyticsTransport((event, props) => sent.push({ event, props }));
  });

  afterEach(() => {
    setAnalyticsTransport(null);
  });

  it('below the limit, starting works exactly as before — no gate anywhere', async () => {
    seedSessionsThisWeek(FREE_WEEKLY_SESSION_LIMIT - 1);
    await renderRouter(routeContext, { initialUrl: '/co-pilot' });

    await fireEvent.press(screen.getByText(en.coPilot.setup.justWork.label));

    expect(sessionsRepo.list()).toHaveLength(FREE_WEEKLY_SESSION_LIMIT);
    expect(screen.getByText(en.coPilot.active.endButton)).toBeTruthy();
    expect(sent.some((e) => e.event === 'gate_shown')).toBe(false);
  });

  it('at the limit, a start attempt opens the paywall as an offer and creates NOTHING', async () => {
    seedSessionsThisWeek(FREE_WEEKLY_SESSION_LIMIT);
    await renderRouter(routeContext, { initialUrl: '/co-pilot' });

    await fireEvent.press(screen.getByText(en.coPilot.setup.justWork.label));

    // No session was created or started.
    expect(sessionsRepo.list()).toHaveLength(FREE_WEEKLY_SESSION_LIMIT);
    // The paywall is showing, with the calm refresh framing and Not now.
    expect(await screen.findByText(en.paywall.gateLead)).toBeTruthy();
    expect(screen.getByText(en.paywall.notNow)).toBeTruthy();
    // Copy law: never depletion language.
    expect(en.paywall.gateLead).not.toMatch(/run out|used up|no more/i);
    // Funnel: gate_shown then paywall_viewed, structural props only.
    const gate = sent.find((e) => e.event === 'gate_shown');
    expect(gate?.props).toEqual({ sessionsThisWeek: FREE_WEEKLY_SESSION_LIMIT });
    const viewed = sent.find((e) => e.event === 'paywall_viewed');
    expect(viewed?.props).toEqual({ trigger: 'gate' });
  });

  it('"Not now" dismisses back to the setup screen, which is still fully rendered (no dead buttons)', async () => {
    seedSessionsThisWeek(FREE_WEEKLY_SESSION_LIMIT);
    await renderRouter(routeContext, { initialUrl: '/co-pilot' });

    await fireEvent.press(screen.getByText(en.coPilot.setup.justWork.label));
    await fireEvent.press(await screen.findByText(en.paywall.notNow));

    // Back on setup; the offers are present and pressable (a second gated
    // press simply reopens the paywall — nothing latched).
    expect(await screen.findByText(en.coPilot.setup.justWork.label)).toBeTruthy();
    expect(sent.find((e) => e.event === 'paywall_dismissed')?.props).toEqual({
      trigger: 'gate',
    });
  });

  it('plus tier is never gated', async () => {
    useSettingsStore.setState({ subscriptionCache: { tier: 'plus' } });
    seedSessionsThisWeek(FREE_WEEKLY_SESSION_LIMIT + 2);
    await renderRouter(routeContext, { initialUrl: '/co-pilot' });

    await fireEvent.press(screen.getByText(en.coPilot.setup.justWork.label));

    expect(screen.getByText(en.coPilot.active.endButton)).toBeTruthy();
    expect(sent.some((e) => e.event === 'gate_shown')).toBe(false);
  });
});

describe('Paywall screen (MONEY-01/03)', () => {
  beforeEach(() => {
    contentStorage.clearAll();
    useSettingsStore.setState({ onboardingComplete: true, subscriptionCache: null });
  });

  it('shows all three plans with market pricing and the honest reference-mode caption', async () => {
    await renderRouter(routeContext, { initialUrl: '/paywall?trigger=settings' });

    expect(screen.getByText(en.paywall.plan.weekly)).toBeTruthy();
    expect(screen.getByText(en.paywall.plan.monthly)).toBeTruthy();
    expect(screen.getByText(en.paywall.plan.annual)).toBeTruthy();
    // EN locale → US reference pricing (MONEY-01).
    expect(screen.getByText('$5.99')).toBeTruthy();
    expect(screen.getByText('$11.99')).toBeTruthy();
    expect(screen.getByText('$79')).toBeTruthy();
    // Purchases not wired yet → the quiet honesty caption is present.
    expect(screen.getByText(en.paywall.unavailable)).toBeTruthy();
    // Restore is always offered (MONEY-03).
    expect(screen.getByText(en.paywall.restore)).toBeTruthy();
  });

  it('settings shows a quiet See plans link for the free tier', async () => {
    await renderRouter(routeContext, { initialUrl: '/settings' });

    await fireEvent.press(screen.getByText(en.settings.subscription.seePlans));
    expect(await screen.findByText(en.paywall.settingsLead)).toBeTruthy();
  });
});
