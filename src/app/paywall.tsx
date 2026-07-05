/**
 * Paywall (MONEY-01/02/03) — always an OFFER, never a wall. Reached from the
 * session-start gate (trigger=gate) or Settings (trigger=settings); "Not now"
 * is always present and always works. Gate copy states a calm calendar fact
 * ("they refresh Monday") and immediately reaffirms what keeps working —
 * never "you've run out", never a countdown, no urgency styling.
 *
 * Plans come from the purchases seam (reference pricing until RevenueCat
 * lands); in reference mode a quiet caption says purchases aren't switched on
 * — the buttons never silently fail or charge.
 */
import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import {
  getPlanOptions,
  isPurchasingAvailable,
  purchase,
  restore,
  type PlanId,
} from '@/features/subscription/purchases';
import { useTheme } from '../../theme';
import { track } from '../analytics/analytics';
import type { Locale } from '../../data/types';

export default function PaywallScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ trigger?: string }>();
  const trigger: 'gate' | 'settings' = params.trigger === 'gate' ? 'gate' : 'settings';

  const locale: Locale = i18n.language === 'pl' ? 'pl' : 'en';
  const plans = getPlanOptions(locale);
  const purchasingAvailable = isPurchasingAvailable();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('annual');

  // paywall_viewed once per mount (structural trigger token only).
  const viewedRef = useRef(false);
  useEffect(() => {
    if (!viewedRef.current) {
      viewedRef.current = true;
      track('paywall_viewed', { trigger });
    }
  }, [trigger]);

  const handleNotNow = () => {
    track('paywall_dismissed', { trigger });
    router.back();
  };

  const handleChoose = async () => {
    // Reference mode resolves 'unavailable' — the caption below already says
    // so; nothing else happens, nothing charges (MONEY-03 honesty posture).
    // With RevenueCat live, a granted purchase quietly closes the offer (the
    // gate is already lifted via subscriptionCache); 'cancelled'/'unavailable'
    // stay on-screen with no error theater.
    const result = await purchase(selectedPlan);
    if (result === 'purchased') router.back();
  };

  const handleRestore = async () => {
    const result = await restore();
    if (result === 'purchased') router.back();
  };

  const titleStyle = StyleSheet.flatten([
    styles.title,
    { color: theme.colors.textPrimary, fontSize: theme.typography.scale.display },
  ]);
  const leadStyle = {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.scale.title,
    fontWeight: '600' as const,
  };
  const bodyStyle = {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.scale.body,
    lineHeight: theme.typography.scale.body * 1.5,
  };
  const quietStyle = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.scale.caption,
  };
  const planCardStyle = (selected: boolean) =>
    StyleSheet.flatten([
      styles.planCard,
      {
        backgroundColor: selected ? theme.colors.surfaceElevated : theme.colors.surface,
        borderColor: selected ? theme.colors.accent : theme.colors.border,
        borderRadius: theme.radii.lg,
        gap: theme.spacing.xs,
      },
    ]);
  const planNameStyle = {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.scale.body,
    fontWeight: '600' as const,
  };
  const priceStyle = {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.scale.title,
    fontWeight: '600' as const,
  };
  const chooseStyle = StyleSheet.flatten([
    styles.tapTarget,
    styles.primaryPill,
    { backgroundColor: theme.colors.accent, borderRadius: theme.radii.pill },
  ]);
  const chooseLabelStyle = {
    color: theme.colors.background,
    fontSize: theme.typography.scale.body,
    fontWeight: '600' as const,
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: theme.spacing.lg }}>
        <Text style={titleStyle}>{t('paywall.title')}</Text>

        {trigger === 'gate' ? (
          <View style={{ gap: theme.spacing.sm }}>
            <Text style={leadStyle}>{t('paywall.gateLead')}</Text>
            <Text style={bodyStyle}>{t('paywall.gateSub')}</Text>
          </View>
        ) : (
          <Text style={leadStyle}>{t('paywall.settingsLead')}</Text>
        )}

        <Text style={bodyStyle}>{t('paywall.included')}</Text>

        <View style={{ gap: theme.spacing.sm }}>
          {plans.map((plan) => {
            const selected = selectedPlan === plan.id;
            return (
              <Pressable
                key={plan.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setSelectedPlan(plan.id)}
                style={planCardStyle(selected)}
              >
                <Text style={planNameStyle}>{t(`paywall.plan.${plan.id}`)}</Text>
                <Text style={priceStyle}>{plan.priceLabel}</Text>
                {plan.id === 'annual' && (
                  <Text style={quietStyle}>{t('paywall.plan.annualNote')}</Text>
                )}
              </Pressable>
            );
          })}
        </View>

        <Pressable accessibilityRole="button" onPress={handleChoose} style={chooseStyle}>
          <Text style={chooseLabelStyle}>
            {t('paywall.choose', { plan: t(`paywall.plan.${selectedPlan}`) })}
          </Text>
        </Pressable>

        {!purchasingAvailable && <Text style={quietStyle}>{t('paywall.unavailable')}</Text>}

        <Pressable accessibilityRole="button" onPress={handleNotNow} style={styles.tapTarget}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.scale.body }}>
            {t('paywall.notNow')}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={handleRestore} style={styles.tapTarget}>
          <Text style={quietStyle}>{t('paywall.restore')}</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontWeight: '600',
  },
  planCard: {
    borderWidth: 1,
    padding: 16,
  },
  tapTarget: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryPill: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
});
