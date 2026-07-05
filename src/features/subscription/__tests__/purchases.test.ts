/**
 * Purchases seam tests (MONEY-01/03). Two worlds, selected by the presence of
 * EXPO_PUBLIC_REVENUECAT_KEY at module load:
 *  - No key → REFERENCE mode: reference pricing, purchase()/restore() resolve
 *    'unavailable', nothing configured, tier untouched (the shipped behavior).
 *  - Key present → real RevenueCat path (react-native-purchases mocked):
 *    configure + live pricing, granted entitlement writes { tier: 'plus' },
 *    cancel → 'cancelled', any error → 'unavailable' with the tier left free.
 *
 * Each case (re)loads the module with a controlled env key via jest.resetModules
 * so the module-load-time key read and the module's offering cache are fresh.
 */

const KEY = 'appl_testrevenuecatkey';

type PurchasesModule = typeof import('../purchases');
type RnPurchasesMock = typeof import('../../../../__mocks__/react-native-purchases');

function setup(key?: string): {
  purchases: PurchasesModule;
  Purchases: RnPurchasesMock['default'];
  makeCustomerInfo: RnPurchasesMock['makeCustomerInfo'];
  useSettingsStore: typeof import('../../../../data/stores/useSettingsStore').useSettingsStore;
} {
  jest.resetModules();
  if (key === undefined) delete process.env.EXPO_PUBLIC_REVENUECAT_KEY;
  else process.env.EXPO_PUBLIC_REVENUECAT_KEY = key;

  const rn = require('react-native-purchases') as RnPurchasesMock & {
    default: RnPurchasesMock['default'];
  };
  const purchases = require('../purchases') as PurchasesModule;
  const { useSettingsStore } =
    require('../../../../data/stores/useSettingsStore') as typeof import('../../../../data/stores/useSettingsStore');

  return {
    purchases,
    Purchases: rn.default,
    makeCustomerInfo: rn.makeCustomerInfo,
    useSettingsStore,
  };
}

afterEach(() => {
  delete process.env.EXPO_PUBLIC_REVENUECAT_KEY;
});

describe('purchases seam — REFERENCE mode (no key)', () => {
  it('reports purchasing unavailable', () => {
    const { purchases } = setup();
    expect(purchases.isPurchasingAvailable()).toBe(false);
  });

  it('returns the brief reference pricing per market', () => {
    const { purchases } = setup();
    expect(purchases.getPlanOptions('en')).toEqual([
      { id: 'weekly', priceLabel: '$5.99' },
      { id: 'monthly', priceLabel: '$11.99' },
      { id: 'annual', priceLabel: '$79' },
    ]);
    expect(purchases.getPlanOptions('pl')).toEqual([
      { id: 'weekly', priceLabel: '9,99 zł' },
      { id: 'monthly', priceLabel: '24,99 zł' },
      { id: 'annual', priceLabel: '199 zł' },
    ]);
  });

  it('purchase() and restore() resolve unavailable without touching the SDK or tier', async () => {
    const { purchases, Purchases, useSettingsStore } = setup();
    await expect(purchases.purchase('annual')).resolves.toBe('unavailable');
    await expect(purchases.restore()).resolves.toBe('unavailable');
    expect(Purchases.configure).not.toHaveBeenCalled();
    expect(useSettingsStore.getState().subscriptionCache).toBeNull();
  });
});

describe('purchases seam — RevenueCat wired (key present)', () => {
  it('reports purchasing available', () => {
    const { purchases } = setup(KEY);
    expect(purchases.isPurchasingAvailable()).toBe(true);
  });

  it('configures with the key and surfaces live store pricing in fixed order', async () => {
    const { purchases, Purchases } = setup(KEY);
    await purchases.configurePurchases();
    expect(Purchases.configure).toHaveBeenCalledWith({ apiKey: KEY });
    expect(purchases.getPlanOptions('en')).toEqual([
      { id: 'weekly', priceLabel: '$5.99' },
      { id: 'monthly', priceLabel: '$11.99' },
      { id: 'annual', priceLabel: '$79.00' },
    ]);
  });

  it('grants plus and caches { tier: "plus" } on a successful purchase', async () => {
    const { purchases, Purchases, makeCustomerInfo, useSettingsStore } = setup(KEY);
    Purchases.purchasePackage.mockResolvedValueOnce({
      customerInfo: makeCustomerInfo(['plus']),
    });

    await expect(purchases.purchase('annual')).resolves.toBe('purchased');
    expect(useSettingsStore.getState().subscriptionCache).toEqual({ tier: 'plus' });
  });

  it('leaves tier free when a purchase completes without the plus entitlement', async () => {
    const { purchases, useSettingsStore } = setup(KEY);
    // Default mock resolves with no active entitlements.
    await expect(purchases.purchase('annual')).resolves.toBe('unavailable');
    expect(useSettingsStore.getState().subscriptionCache).toBeNull();
  });

  it('maps a user cancellation to "cancelled" and never charges the tier', async () => {
    const { purchases, Purchases, useSettingsStore } = setup(KEY);
    Purchases.purchasePackage.mockRejectedValueOnce({ userCancelled: true });

    await expect(purchases.purchase('monthly')).resolves.toBe('cancelled');
    expect(useSettingsStore.getState().subscriptionCache).toBeNull();
  });

  it('maps any other purchase error to "unavailable", quietly (tier stays free)', async () => {
    const { purchases, Purchases, useSettingsStore } = setup(KEY);
    Purchases.purchasePackage.mockRejectedValueOnce(new Error('store down'));

    await expect(purchases.purchase('weekly')).resolves.toBe('unavailable');
    expect(useSettingsStore.getState().subscriptionCache).toBeNull();
  });

  it('returns "unavailable" when the requested plan has no offering package', async () => {
    const { purchases, Purchases } = setup(KEY);
    Purchases.getOfferings.mockResolvedValueOnce({ current: { availablePackages: [] } });
    await expect(purchases.purchase('annual')).resolves.toBe('unavailable');
  });

  it('restores an existing plus entitlement into the cache', async () => {
    const { purchases, Purchases, makeCustomerInfo, useSettingsStore } = setup(KEY);
    Purchases.restorePurchases.mockResolvedValueOnce(makeCustomerInfo(['plus']));

    await expect(purchases.restore()).resolves.toBe('purchased');
    expect(useSettingsStore.getState().subscriptionCache).toEqual({ tier: 'plus' });
  });

  it('restore with nothing to restore stays "unavailable" and free', async () => {
    const { purchases, useSettingsStore } = setup(KEY);
    await expect(purchases.restore()).resolves.toBe('unavailable');
    expect(useSettingsStore.getState().subscriptionCache).toBeNull();
  });
});
