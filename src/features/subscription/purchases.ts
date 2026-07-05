/**
 * Purchases seam (MONEY-01/03). Until a RevenueCat public SDK key exists
 * (EXPO_PUBLIC_REVENUECAT_KEY), this module runs in REFERENCE mode: offerings
 * show the brief's configured market pricing so the paywall is fully
 * designable/testable, while purchase()/restore() resolve 'unavailable' and
 * the paywall renders a quiet, honest caption instead of a buy flow.
 *
 * The interface is offering-shaped so the RevenueCat swap changes ONLY this
 * file — the paywall reads {id, priceLabel} and never cares which system
 * produced them.
 *
 * RevenueCat drop-in (when the key lands):
 *   npx expo install react-native-purchases   // native — prebuild required
 *   Purchases.configure({ apiKey: process.env.EXPO_PUBLIC_REVENUECAT_KEY! });
 *   getOfferings() → map current offering's availablePackages to PlanOption[]
 *   purchase(planId) → Purchases.purchasePackage(...); on entitlement grant:
 *     useSettingsStore.getState() write of subscriptionCache = { tier: 'plus' }
 *   restore() → Purchases.restorePurchases(); same cache write on success.
 * Keep the offline posture: any error/unknown → tier stays free, quietly
 * (entitlements.ts getTier already enforces this).
 */
import type { Locale } from '../../../data/types';

export type PlanId = 'weekly' | 'monthly' | 'annual';

export type PlanOption = {
  id: PlanId;
  /** Store-localized price string (RevenueCat later; brief's reference now). */
  priceLabel: string;
};

/** MONEY-01 reference pricing per market (source synthesis §6.3). */
export function getPlanOptions(locale: Locale): PlanOption[] {
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

export function isPurchasingAvailable(): boolean {
  // Flips to a real capability check when react-native-purchases is wired.
  return false;
}

export type PurchaseResult = 'purchased' | 'unavailable' | 'cancelled';

export async function purchase(_planId: PlanId): Promise<PurchaseResult> {
  return 'unavailable';
}

export async function restore(): Promise<PurchaseResult> {
  return 'unavailable';
}
