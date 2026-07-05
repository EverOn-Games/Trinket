/**
 * Settings screen (SETT-01): locale override, notification opt-in, mascot
 * prominence, and a quiet subscription-state row. Every control is an
 * immediate, reversible choice — no save button, no confirmation friction.
 *
 * Locale: chips call i18n.changeLanguage(); the RootLayout write-through
 * listener (usePersistLocaleOnChange, WR-02) persists it to the settings
 * store — this screen never writes the store directly for locale.
 *
 * Reminders: toggling OFF quietly cancels every scheduled intention reminder
 * (their cards simply lose the reminder line — the starters themselves are
 * untouched). Toggling ON only re-allows offers; the OS permission ask stays
 * contextual at the next scheduling attempt (START-03 posture).
 *
 * Subscription: informational only — the free-tier line is a calm statement
 * of what's included ("sessions refresh Monday"), never a depletion warning.
 */
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import type { MascotProminence } from '@/components/Mascot/types';
import { cancelIntentionNotification } from '@/features/starter/intentionNotifications';
import { getTier } from '@/features/subscription/entitlements';
import { useTheme } from '../../theme';
import { intentionsRepo } from '../../data/repositories/intentions';
import { useSettingsStore } from '../../data/stores/useSettingsStore';
import type { Locale } from '../../data/types';

const LOCALES: readonly Locale[] = ['en', 'pl'];
const PROMINENCES: readonly MascotProminence[] = ['prominent', 'subtle', 'hidden'];

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const router = useRouter();

  const notificationsOptIn = useSettingsStore((s) => s.notificationsOptIn);
  const setNotificationsOptIn = useSettingsStore((s) => s.setNotificationsOptIn);
  const mascotProminence = useSettingsStore((s) => s.mascotProminence);
  const setMascotProminence = useSettingsStore((s) => s.setMascotProminence);

  // Tier is a cheap derived read; the version bump only exists because
  // repo/cache writes aren't reactive (brain-dump precedent).
  const [, setVersion] = useState(0);
  const tier = getTier();

  const handleNotificationsToggle = async (next: boolean) => {
    setNotificationsOptIn(next);
    if (!next) {
      // Quietly withdraw every scheduled reminder — the intentions themselves
      // are untouched, nothing is lost, nothing comments on it.
      for (const intention of intentionsRepo.list()) {
        if (intention.notificationId) {
          await cancelIntentionNotification(intention.notificationId);
          intentionsRepo.update(intention.id, { notifyAt: undefined, notificationId: undefined });
        }
      }
      setVersion((v) => v + 1);
    }
  };

  const titleStyle = StyleSheet.flatten([
    styles.title,
    { color: theme.colors.textPrimary, fontSize: theme.typography.scale.display },
  ]);
  const rowLabelStyle = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.scale.caption,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.2,
  };
  const subcopyStyle = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.scale.caption,
  };
  const bodyStyle = {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.scale.body,
  };
  const chipRowStyle = StyleSheet.flatten([styles.chipsRow, { gap: theme.spacing.sm }]);
  const chipStyle = (selected: boolean) =>
    StyleSheet.flatten([
      styles.tapTarget,
      styles.chip,
      {
        backgroundColor: selected ? theme.colors.accent : theme.colors.surfaceElevated,
        borderRadius: theme.radii.pill,
      },
    ]);
  const chipLabelStyle = (selected: boolean) => ({
    color: selected ? theme.colors.background : theme.colors.textPrimary,
    fontSize: theme.typography.scale.caption,
    fontWeight: '600' as const,
  });

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: theme.spacing.lg }}>
        <Text style={titleStyle}>{t('settings.title')}</Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.scale.body }}>
          {t('settings.description')}
        </Text>

        <View style={{ gap: theme.spacing.sm }}>
          <Text style={rowLabelStyle}>{t('settings.language.label')}</Text>
          <View style={chipRowStyle}>
            {LOCALES.map((locale) => {
              const selected = i18n.language === locale;
              return (
                <Pressable
                  key={locale}
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => i18n.changeLanguage(locale)}
                  style={chipStyle(selected)}
                >
                  <Text style={chipLabelStyle(selected)}>{t(`settings.language.${locale}`)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <Text style={rowLabelStyle}>{t('settings.notifications.label')}</Text>
          <View style={chipRowStyle}>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => handleNotificationsToggle(true)}
              style={chipStyle(notificationsOptIn)}
            >
              <Text style={chipLabelStyle(notificationsOptIn)}>
                {t('settings.notifications.toggleOn')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => handleNotificationsToggle(false)}
              style={chipStyle(!notificationsOptIn)}
            >
              <Text style={chipLabelStyle(!notificationsOptIn)}>
                {t('settings.notifications.toggleOff')}
              </Text>
            </Pressable>
          </View>
          <Text style={subcopyStyle}>
            {notificationsOptIn
              ? t('settings.notifications.subOn')
              : t('settings.notifications.subOff')}
          </Text>
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <Text style={rowLabelStyle}>{t('settings.mascotRow.label')}</Text>
          <View style={chipRowStyle}>
            {PROMINENCES.map((prominence) => {
              const selected = mascotProminence === prominence;
              return (
                <Pressable
                  key={prominence}
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => setMascotProminence(prominence)}
                  style={chipStyle(selected)}
                >
                  <Text style={chipLabelStyle(selected)}>
                    {t(`settings.mascotRow.${prominence}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <Text style={rowLabelStyle}>{t('settings.subscription.label')}</Text>
          <Text style={bodyStyle}>
            {tier === 'plus'
              ? t('settings.subscription.plusTier')
              : t('settings.subscription.freeTier')}
          </Text>
          <Text style={subcopyStyle}>
            {tier === 'plus'
              ? t('settings.subscription.plusSub')
              : t('settings.subscription.freeSub')}
          </Text>
          {tier === 'free' && (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/paywall', params: { trigger: 'settings' } })}
              style={styles.tapTarget}
            >
              <Text style={{ color: theme.colors.accent, fontSize: theme.typography.scale.body }}>
                {t('settings.subscription.seePlans')}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontWeight: '600',
  },
  tapTarget: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 16,
  },
});
