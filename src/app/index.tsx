/**
 * Home-hub screen (D-03, D-04, DUMP-05).
 *
 * The mascot's habitat: the real <Mascot />, greeting once per cold launch
 * then resting in idle (MASC-01, D-07), a primary "Start a session?" offer
 * (offer grammar — never a command), a prominent secondary Brain dump entry
 * reachable directly from home, and navigation to Starter, History, and
 * Settings. No tab bar (D-03).
 */
import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { Mascot } from '@/components/Mascot/Mascot';
import type { MascotState } from '@/components/Mascot/types';
import { useTheme } from '../../theme';
import { sessionsRepo } from '../../data/repositories/sessions';
import { useSettingsStore } from '../../data/stores/useSettingsStore';

// D-07: greeting cadence lives in a plain module-level, in-memory flag —
// NEVER persisted (no settingsRepo/useSettingsStore write, no
// lastGreetedAt/greetedAt field anywhere). This resets on cold app launch
// (fresh JS module evaluation) and stays true for the remainder of the app
// session, so the mascot greets once per cold launch then rests in idle.
let hasGreetedThisSession = false;

export default function HomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();

  const [mascotState, setMascotState] = useState<MascotState>(() =>
    hasGreetedThisSession ? 'idle' : 'greeting'
  );
  // Reactive subscription (WR-02), not a one-time settingsRepo.get() snapshot
  // — Home must re-render when mascotProminence changes elsewhere (Phase 8
  // Settings screen).
  const mascotProminence = useSettingsStore((s) => s.mascotProminence);

  const handleMascotGreetingComplete = () => {
    hasGreetedThisSession = true;
    setMascotState('idle');
  };

  // Walking-skeleton write side (Task 2): the offer is the thinnest possible
  // real session record (just a start timestamp + source) — full session
  // lifecycle (timers, dozing, warm ending) is Phase 3 (PILOT-*).
  const handleStartSession = () => {
    sessionsRepo.create({ source: 'quick' });
    router.push('/co-pilot');
  };

  // Every style below is flattened to a single object (never an array) —
  // expo-router's internal <Slot> shim throws when a route's root child (or
  // a <Link asChild> child) receives an array `style` prop (see
  // node_modules/expo-router/build/ui/Slot.js).
  const titleStyle = StyleSheet.flatten([
    styles.title,
    { color: theme.colors.textPrimary, fontSize: theme.typography.scale.display },
  ]);
  const primaryOfferStyle = StyleSheet.flatten([
    styles.primaryOffer,
    { backgroundColor: theme.colors.accent, borderRadius: theme.radii.pill },
  ]);
  const primaryOfferLabelStyle = StyleSheet.flatten([
    styles.primaryOfferLabel,
    { color: theme.colors.background, fontSize: theme.typography.scale.title },
  ]);
  const secondaryOfferStyle = StyleSheet.flatten([
    styles.secondaryOffer,
    { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radii.md },
  ]);
  const linkRowStyle = StyleSheet.flatten([styles.linkRow, { gap: theme.spacing.lg }]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: theme.spacing.lg }}>
        <Mascot
          state={mascotState}
          prominence={mascotProminence}
          accessibilityLabel={t(`mascot.accessibility.${mascotState}`)}
          onStateAnimationComplete={handleMascotGreetingComplete}
        />

        <Text style={titleStyle}>{t('home.title')}</Text>

        <Pressable accessibilityRole="button" onPress={handleStartSession} style={primaryOfferStyle}>
          <Text style={primaryOfferLabelStyle}>{t('home.startSessionOffer')}</Text>
        </Pressable>

        <Link href="/brain-dump" asChild>
          <Pressable accessibilityRole="button" style={secondaryOfferStyle}>
            <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.scale.body }}>
              {t('home.brainDumpOffer')}
            </Text>
          </Pressable>
        </Link>

        <View style={linkRowStyle}>
          <Link href="/starter">
            <Text style={{ color: theme.colors.accent }}>{t('home.starterLink')}</Text>
          </Link>
          <Link href="/history">
            <Text style={{ color: theme.colors.accent }}>{t('home.historyLink')}</Text>
          </Link>
          <Link href="/settings">
            <Text style={{ color: theme.colors.accent }}>{t('home.settingsLink')}</Text>
          </Link>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontWeight: '600',
  },
  primaryOffer: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  primaryOfferLabel: {
    textAlign: 'center',
    fontWeight: '600',
  },
  secondaryOffer: {
    padding: 16,
  },
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
