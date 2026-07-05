/**
 * Purchases seam (MONEY-01/03). Env-gated drop-in: when a RevenueCat public
 * SDK key exists (EXPO_PUBLIC_REVENUECAT_KEY) the real RevenueCat path is
 * live — live store pricing, real purchase/restore, entitlement writes into
 * subscriptionCache. With no key the module stays in REFERENCE mode exactly
 * as before: the brief's configured market pricing shows so the paywall is
 * fully designable/testable, purchase()/restore() resolve 'unavailable', and
 * the paywall renders a quiet, honest caption instead of a buy flow.
 *
 * Offline posture (MONEY-03) is preserved on every path: any error, cancel,
 * or absent entitlement leaves the tier free, quietly — entitlements.getTier
 * only promotes to 'plus' when subscriptionCache is a positively-cached
 * { tier: 'plus' }, which is written here ONLY on a granted entitlement.
 *
 * The react-native-purchases import is a normal static import; it is a no-op
 * at runtime until a key is present (nothing calls Purchases.*), and under
 * Jest it resolves to __mocks__/react-native-purchases.ts (registered in
 * jest.setup.ts), so importing this module never touches the native binding.
 *
 * Store product configuration (the weekly/monthly/annual packages and a
 * `plus` entitlement in the RevenueCat dashboard) plus a device build remain
 * required to VERIFY real purchases — this file is the code half only.
 */
import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';

import type { Locale } from '../../../data/types';
import { useSettingsStore } from '../../../data/stores/useSettingsStore';

export type PlanId = 'weekly' | 'monthly' | 'annual';

export type PlanOption = {
  id: PlanId;
  /** Store-localized price string (live RevenueCat, or the brief's reference). */
  priceLabel: string;
};

export type PurchaseResult = 'purchased' | 'unavailable' | 'cancelled';

const REVENUECAT_KEY = process.env.EXPO_PUBLIC_REVENUECAT_KEY ?? '';

/**
 * Entitlement identifier configured in the RevenueCat dashboard that grants
 * Plus. Overridable via env so the dashboard's naming isn't hard-coded here;
 * defaults to 'plus'.
 */
const PLUS_ENTITLEMENT_ID = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT ?? 'plus';

/** Fixed display order the paywall expects (weekly → monthly → annual). */
const PLAN_ORDER: readonly PlanId[] = ['weekly', 'monthly', 'annual'];

// Live offering state, populated by configurePurchases()/refreshOfferings()
// when a key is present. cachedPlans drives display pricing; cachedPackages is
// what purchase() actually buys. Both stay null in reference mode.
let configured = false;
let cachedPlans: PlanOption[] | null = null;
let cachedPackages: PurchasesPackage[] | null = null;

/** RevenueCat's PACKAGE_TYPE is a string enum — map its values to our PlanId. */
function packageTypeToPlanId(packageType: string): PlanId | null {
  switch (packageType) {
    case 'WEEKLY':
      return 'weekly';
    case 'MONTHLY':
      return 'monthly';
    case 'ANNUAL':
      return 'annual';
    default:
      return null;
  }
}

/** MONEY-01 reference pricing per market (source synthesis §6.3). */
function referencePlanOptions(locale: Locale): PlanOption[] {
  if (locale === 'pl') {
    return [
      { id: 'weekly', priceLabel: '9,99 zł' },
      { id: 'monthly', priceLabel: '24,99 zł' },
      { id: 'annual', priceLabel: '199 zł' },
    ];
  }
  return [
    { id: 'weekly', priceLabel: '$5.99' },
    { id: 'monthly', priceLabel: '$11.99' },
    { id: 'annual', priceLabel: '$79' },
  ];
}

/**
 * Live store pricing when a key + offerings are available, otherwise the
 * brief's reference pricing. Stays synchronous so the paywall renders without
 * awaiting — configurePurchases() warms the live cache at startup.
 */
export function getPlanOptions(locale: Locale): PlanOption[] {
  return cachedPlans ?? referencePlanOptions(locale);
}

/**
 * True when a RevenueCat key is present — the paywall shows a real buy flow
 * rather than the "purchases aren't switched on" caption. Configuration itself
 * is ensured lazily inside purchase()/restore(), so this doesn't depend on the
 * async warm-up having finished.
 */
export function isPurchasingAvailable(): boolean {
  return REVENUECAT_KEY !== '';
}

async function refreshOfferings(): Promise<void> {
  const offerings = await Purchases.getOfferings();
  const packages = offerings.current?.availablePackages ?? [];
  const plans: PlanOption[] = [];
  for (const pkg of packages) {
    const id = packageTypeToPlanId(pkg.packageType);
    if (id) plans.push({ id, priceLabel: pkg.product.priceString });
  }
  if (plans.length > 0) {
    plans.sort((a, b) => PLAN_ORDER.indexOf(a.id) - PLAN_ORDER.indexOf(b.id));
    cachedPlans = plans;
    cachedPackages = packages;
  }
}

/**
 * Idempotent RevenueCat configuration + live-pricing warm-up. Safe to call at
 * every startup; a no-op with no key. Never throws — any failure just leaves
 * the module in reference mode.
 */
export async function configurePurchases(): Promise<void> {
  if (!REVENUECAT_KEY || configured) return;
  try {
    Purchases.configure({ apiKey: REVENUECAT_KEY });
    configured = true;
    await refreshOfferings();
  } catch {
    // Stay in reference mode; startup must never break on a purchases error.
  }
}

function hasPlusEntitlement(customerInfo: CustomerInfo): boolean {
  return Boolean(customerInfo.entitlements.active[PLUS_ENTITLEMENT_ID]);
}

function applyEntitlement(customerInfo: CustomerInfo): boolean {
  if (hasPlusEntitlement(customerInfo)) {
    useSettingsStore.getState().setSubscriptionCache({ tier: 'plus' });
    return true;
  }
  return false;
}

function isUserCancelled(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { userCancelled?: boolean }).userCancelled === true
  );
}

function findPackage(planId: PlanId): PurchasesPackage | undefined {
  return (cachedPackages ?? []).find((pkg) => packageTypeToPlanId(pkg.packageType) === planId);
}

export async function purchase(planId: PlanId): Promise<PurchaseResult> {
  if (!REVENUECAT_KEY) return 'unavailable';
  try {
    await configurePurchases();
    if (!cachedPackages) await refreshOfferings();
    const pkg = findPackage(planId);
    if (!pkg) return 'unavailable';
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return applyEntitlement(customerInfo) ? 'purchased' : 'unavailable';
  } catch (error) {
    // User backing out is a calm 'cancelled'; anything else stays quietly
    // 'unavailable' with the tier untouched (free) — no alarming copy.
    return isUserCancelled(error) ? 'cancelled' : 'unavailable';
  }
}

export async function restore(): Promise<PurchaseResult> {
  if (!REVENUECAT_KEY) return 'unavailable';
  try {
    await configurePurchases();
    const customerInfo = await Purchases.restorePurchases();
    return applyEntitlement(customerInfo) ? 'purchased' : 'unavailable';
  } catch (error) {
    return isUserCancelled(error) ? 'cancelled' : 'unavailable';
  }
}
