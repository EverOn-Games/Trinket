/**
 * Jest mock for react-native-purchases (Phase 7 / MONEY-01). The native
 * StoreKit/Play Billing binding cannot initialize under Jest's Node
 * environment, so every test that exercises the purchases seam (purchases.ts)
 * goes through this in-memory fake. Mirrors the manual-mock precedent of
 * __mocks__/expo-notifications.ts: only the API surface purchases.ts actually
 * calls, with call-inspectable jest.fn()s and per-test overrides.
 *
 * Default posture: an offering with weekly/monthly/annual packages and NO
 * active entitlement (purchase resolves without granting Plus). Tests override
 * getOfferings/purchasePackage/restorePurchases return values for the granted,
 * cancelled, and error paths. Real on-device purchase flows remain a
 * device-only verification — this mock only closes the seam's logic at Jest.
 */

// Minimal shapes matching the fields purchases.ts reads. `unknown`-typed
// helpers keep the mock free of the real @revenuecat type surface.
function makePackage(packageType: string, priceString: string): unknown {
  return {
    identifier: `$rc_${packageType.toLowerCase()}`,
    packageType,
    product: { identifier: `product_${packageType.toLowerCase()}`, priceString },
  };
}

export function makeCustomerInfo(
  activeEntitlements: string[] = [],
  managementURL: string | null = null
): unknown {
  const active: Record<string, unknown> = {};
  for (const id of activeEntitlements) {
    active[id] = { identifier: id, isActive: true };
  }
  return { entitlements: { active, all: active }, managementURL };
}

export const DEFAULT_PACKAGES = [
  makePackage('WEEKLY', '$5.99'),
  makePackage('MONTHLY', '$11.99'),
  makePackage('ANNUAL', '$79.00'),
];

const Purchases = {
  configure: jest.fn(() => undefined),
  getOfferings: jest.fn(async () => ({
    current: { availablePackages: DEFAULT_PACKAGES },
  })),
  purchasePackage: jest.fn(async () => ({
    customerInfo: makeCustomerInfo([]),
  })),
  restorePurchases: jest.fn(async () => makeCustomerInfo([])),
  getCustomerInfo: jest.fn(async () => makeCustomerInfo([])),
  // Tests grab the registered listener via .mock.calls[0][0] and fire it
  // directly to simulate RevenueCat pushing a customer-info update
  // (renewal, expiry, cross-device purchase).
  addCustomerInfoUpdateListener: jest.fn(),
};

export default Purchases;
