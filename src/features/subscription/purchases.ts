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
import { Platform } from 'react-native';
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

// Dev-only diagnostics, never user-facing (markers.ts precedent: a broken
// integration must fail loud in logs, not silently in production). The
// device UAT that motivated this: a sandbox purchase landed in RevenueCat
// but the app showed nothing, because the granted entitlement id didn't
// match — and nothing said so anywhere.
function devWarn(message: string, error?: unknown): void {
  if (__DEV__) {
    if (error === undefined) console.warn(`purchases: ${message}`);
    else console.warn(`purchases: ${message}`, error);
  }
}

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

function hasPlusEntitlement(customerInfo: CustomerInfo): boolean {
  return Boolean(customerInfo.entitlements.active[PLUS_ENTITLEMENT_ID]);
}

/**
 * Authoritative two-way sync: RevenueCat's current customer info decides the
 * cache. Active plus → { tier: 'plus' } (a grant missed at purchase time
 * self-heals on the next launch/listener fire); no plus → null (an expired or
 * refunded subscription downgrades back to free, quietly). Only ever called
 * with a successfully-FETCHED customerInfo — offline/error paths never reach
 * here, so a cached plus persists offline (MONEY-03).
 */
function syncEntitlementFromCustomerInfo(customerInfo: CustomerInfo): void {
  const { subscriptionCache, setSubscriptionCache } = useSettingsStore.getState();
  const cachedPlus = subscriptionCache?.tier === 'plus';
  if (hasPlusEntitlement(customerInfo)) {
    if (!cachedPlus) setSubscriptionCache({ tier: 'plus' });
  } else if (cachedPlus) {
    devWarn(`entitlement '${PLUS_ENTITLEMENT_ID}' no longer active — cache downgraded to free`);
    setSubscriptionCache(null);
  }
}

/**
 * Idempotent RevenueCat configuration + live-pricing warm-up + entitlement
 * sync. Safe to call at every startup; a no-op with no key. Never throws —
 * any failure just leaves the module in reference mode / the cache untouched.
 */
export async function configurePurchases(): Promise<void> {
  if (!REVENUECAT_KEY || configured) return;
  try {
    Purchases.configure({ apiKey: REVENUECAT_KEY });
    Purchases.addCustomerInfoUpdateListener(syncEntitlementFromCustomerInfo);
    configured = true;
  } catch (error) {
    devWarn('configure failed — staying in reference mode', error);
    return;
  }
  // Each side-load tolerates failure independently: a pricing fetch failing
  // must not block the entitlement self-heal, or vice versa.
  try {
    await refreshOfferings();
  } catch (error) {
    devWarn('offerings fetch failed — reference pricing stays', error);
  }
  try {
    syncEntitlementFromCustomerInfo(await Purchases.getCustomerInfo());
  } catch (error) {
    // Offline/unknown → cache untouched: a cached plus keeps working offline,
    // an absent cache stays quietly free (MONEY-03).
    devWarn('customer info fetch failed — entitlement cache left as-is', error);
  }
}

function applyEntitlement(customerInfo: CustomerInfo): boolean {
  if (hasPlusEntitlement(customerInfo)) {
    useSettingsStore.getState().setSubscriptionCache({ tier: 'plus' });
    return true;
  }
  // The transaction went through but the expected entitlement isn't active —
  // this is a RevenueCat dashboard wiring problem, and the ids in this log
  // are exactly what's needed to fix it.
  devWarn(
    `transaction completed but entitlement '${PLUS_ENTITLEMENT_ID}' is not active. ` +
      `Active entitlements: [${Object.keys(customerInfo.entitlements.active).join(', ')}]. ` +
      `Attach the product to the '${PLUS_ENTITLEMENT_ID}' entitlement in the RevenueCat ` +
      `dashboard, or set EXPO_PUBLIC_REVENUECAT_ENTITLEMENT to the id you configured.`
  );
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
    if (isUserCancelled(error)) return 'cancelled';
    devWarn('purchase failed', error);
    return 'unavailable';
  }
}

/**
 * Where the user manages/cancels their subscription. Billing always lives
 * with the store — even a future account system (MONEY-04) wouldn't move it —
 * so this resolves RevenueCat's per-platform managementURL when available and
 * otherwise falls back to the platform's own subscriptions page. Never
 * throws, never returns null: the Settings row must always lead somewhere
 * honest.
 */
const STORE_SUBSCRIPTIONS_URL = Platform.select({
  ios: 'https://apps.apple.com/account/subscriptions',
  default: 'https://play.google.com/store/account/subscriptions',
});

export async function getManagementUrl(): Promise<string> {
  if (!REVENUECAT_KEY) return STORE_SUBSCRIPTIONS_URL;
  try {
    await configurePurchases();
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.managementURL ?? STORE_SUBSCRIPTIONS_URL;
  } catch (error) {
    devWarn('management URL fetch failed — falling back to the store page', error);
    return STORE_SUBSCRIPTIONS_URL;
  }
}

export async function restore(): Promise<PurchaseResult> {
  if (!REVENUECAT_KEY) return 'unavailable';
  try {
    await configurePurchases();
    const customerInfo = await Purchases.restorePurchases();
    return applyEntitlement(customerInfo) ? 'purchased' : 'unavailable';
  } catch (error) {
    if (isUserCancelled(error)) return 'cancelled';
    devWarn('restore failed', error);
    return 'unavailable';
  }
}
