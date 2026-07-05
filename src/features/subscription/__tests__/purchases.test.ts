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

describe('purchases seam — management URL', () => {
  it('falls back to the store subscriptions page with no key', async () => {
    const { purchases } = setup();
    await expect(purchases.getManagementUrl()).resolves.toMatch(/account\/subscriptions/);
  });

  it('returns RevenueCat managementURL when the customer has one', async () => {
    const { purchases, Purchases, makeCustomerInfo } = setup(KEY);
    Purchases.getCustomerInfo.mockResolvedValue(
      makeCustomerInfo(['plus'], 'https://rc.example/manage')
    );
    await expect(purchases.getManagementUrl()).resolves.toBe('https://rc.example/manage');
  });

  it('falls back to the store page when the fetch fails (offline)', async () => {
    const { purchases, Purchases } = setup(KEY);
    Purchases.getCustomerInfo.mockRejectedValue(new Error('offline'));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await expect(purchases.getManagementUrl()).resolves.toMatch(/account\/subscriptions/);
    warnSpy.mockRestore();
  });
});

describe('purchases seam — entitlement sync (key present)', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    // Sync diagnostics are dev-only console.warn noise by design (markers.ts
    // precedent); silence + capture them here.
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('self-heals a missed grant: startup sync finds an active plus and caches it', async () => {
    const { purchases, Purchases, makeCustomerInfo, useSettingsStore } = setup(KEY);
    Purchases.getCustomerInfo.mockResolvedValueOnce(makeCustomerInfo(['plus']));

    await purchases.configurePurchases();

    expect(useSettingsStore.getState().subscriptionCache).toEqual({ tier: 'plus' });
  });

  it('downgrades an expired subscription: cached plus + no active entitlement → free', async () => {
    const { purchases, useSettingsStore } = setup(KEY);
    useSettingsStore.setState({ subscriptionCache: { tier: 'plus' } });
    // Default getCustomerInfo resolves with no active entitlements.

    await purchases.configurePurchases();

    expect(useSettingsStore.getState().subscriptionCache).toBeNull();
  });

  it('leaves the cache untouched when the customer-info fetch fails (offline posture)', async () => {
    const { purchases, Purchases, useSettingsStore } = setup(KEY);
    useSettingsStore.setState({ subscriptionCache: { tier: 'plus' } });
    Purchases.getCustomerInfo.mockRejectedValueOnce(new Error('offline'));

    await purchases.configurePurchases();

    expect(useSettingsStore.getState().subscriptionCache).toEqual({ tier: 'plus' });
  });

  it('registers a customer-info listener that keeps the cache honest both ways', async () => {
    const { purchases, Purchases, makeCustomerInfo, useSettingsStore } = setup(KEY);
    await purchases.configurePurchases();

    expect(Purchases.addCustomerInfoUpdateListener).toHaveBeenCalledTimes(1);
    const listener = Purchases.addCustomerInfoUpdateListener.mock.calls[0][0] as (
      info: unknown
    ) => void;

    listener(makeCustomerInfo(['plus']));
    expect(useSettingsStore.getState().subscriptionCache).toEqual({ tier: 'plus' });

    listener(makeCustomerInfo([]));
    expect(useSettingsStore.getState().subscriptionCache).toBeNull();
  });

  it('a purchase completing without the expected entitlement logs the actual ids (dev diagnostic)', async () => {
    const { purchases, Purchases, makeCustomerInfo } = setup(KEY);
    Purchases.purchasePackage.mockResolvedValueOnce({
      customerInfo: makeCustomerInfo(['premium_wrongly_named']),
    });

    await expect(purchases.purchase('annual')).resolves.toBe('unavailable');

    const warned = warnSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(warned).toContain("entitlement 'plus' is not active");
    expect(warned).toContain('premium_wrongly_named');
  });
});
