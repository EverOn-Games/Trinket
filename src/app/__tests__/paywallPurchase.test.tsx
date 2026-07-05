/**
 * Paywall purchase-outcome tests (MONEY-01/03): with RevenueCat live, a
 * granted purchase or restore quietly closes the offer (router.back) — the
 * gate is already lifted via subscriptionCache; a cancel or unavailable
 * result stays on-screen with no error theater.
 *
 * The purchases seam is module-mocked here (not env-driven) so this file
 * tests ONLY the screen's reaction to each PurchaseResult; the seam's own
 * env-gating and entitlement writes are covered in
 * src/features/subscription/__tests__/purchases.test.ts.
 */
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { router } from 'expo-router';

import { contentStorage } from '../../../data/mmkv';
import { useSettingsStore } from '../../../data/stores/useSettingsStore';
import en from '../../../i18n/locales/en.json';

import PaywallScreen from '../paywall';
import HomeScreen from '../index';

import { purchase, restore } from '@/features/subscription/purchases';

jest.mock('@/features/subscription/purchases', () => ({
  getPlanOptions: () => [
    { id: 'weekly', priceLabel: '$5.99' },
    { id: 'monthly', priceLabel: '$11.99' },
    { id: 'annual', priceLabel: '$79.00' },
  ],
  isPurchasingAvailable: () => true,
  purchase: jest.fn(async () => 'unavailable'),
  restore: jest.fn(async () => 'unavailable'),
}));

const purchaseMock = purchase as jest.MockedFunction<typeof purchase>;
const restoreMock = restore as jest.MockedFunction<typeof restore>;

const routeContext = {
  index: HomeScreen,
  paywall: PaywallScreen,
};

describe('Paywall reaction to purchase outcomes', () => {
  let backSpy: jest.SpyInstance;

  beforeEach(() => {
    contentStorage.clearAll();
    jest.clearAllMocks();
    useSettingsStore.setState({ onboardingComplete: true, subscriptionCache: null });
    backSpy = jest.spyOn(router, 'back').mockImplementation(() => undefined);
  });

  afterEach(() => {
    backSpy.mockRestore();
  });

  it('a granted purchase quietly closes the offer', async () => {
    purchaseMock.mockResolvedValueOnce('purchased');
    await renderRouter(routeContext, { initialUrl: '/paywall' });

    await fireEvent.press(
      screen.getByText(en.paywall.choose.replace('{{plan}}', en.paywall.plan.annual))
    );

    expect(purchaseMock).toHaveBeenCalledWith('annual');
    expect(backSpy).toHaveBeenCalled();
  });

  it('a cancelled purchase stays on-screen with no error theater and no notice', async () => {
    purchaseMock.mockResolvedValueOnce('cancelled');
    await renderRouter(routeContext, { initialUrl: '/paywall' });

    await fireEvent.press(
      screen.getByText(en.paywall.choose.replace('{{plan}}', en.paywall.plan.annual))
    );

    expect(backSpy).not.toHaveBeenCalled();
    // The offer is simply still there — Not now remains available, unchanged,
    // and the user's own cancel gets no commentary of any kind.
    expect(screen.getByText(en.paywall.notNow)).toBeTruthy();
    expect(screen.queryByText(en.paywall.notice.purchaseIssue)).toBeNull();
    expect(screen.queryByText(en.paywall.notice.restoreNone)).toBeNull();
  });

  it('a live-mode failed purchase states the fact calmly under the buttons', async () => {
    // Default purchaseMock resolves 'unavailable'.
    await renderRouter(routeContext, { initialUrl: '/paywall' });

    await fireEvent.press(
      screen.getByText(en.paywall.choose.replace('{{plan}}', en.paywall.plan.annual))
    );

    expect(backSpy).not.toHaveBeenCalled();
    expect(screen.getByText(en.paywall.notice.purchaseIssue)).toBeTruthy();
  });

  it('a successful restore quietly closes the offer', async () => {
    restoreMock.mockResolvedValueOnce('purchased');
    await renderRouter(routeContext, { initialUrl: '/paywall' });

    await fireEvent.press(screen.getByText(en.paywall.restore));

    expect(backSpy).toHaveBeenCalled();
  });

  it('a restore with nothing to restore says so calmly and stays on-screen', async () => {
    await renderRouter(routeContext, { initialUrl: '/paywall' });

    await fireEvent.press(screen.getByText(en.paywall.restore));

    expect(backSpy).not.toHaveBeenCalled();
    expect(screen.getByText(en.paywall.notNow)).toBeTruthy();
    // Device UAT 2026-07-05: a Restore tap must visibly land — a quiet stated
    // fact, not silence (and not an alarm).
    expect(screen.getByText(en.paywall.notice.restoreNone)).toBeTruthy();
  });
});
