/**
 * Home-hub screen (D-03, D-04, DUMP-05).
 *
 * The mascot's habitat: a MascotSlot placeholder, a primary "Start a
 * session?" offer (offer grammar — never a command), a prominent secondary
 * Brain dump entry reachable directly from home, and navigation to Starter,
 * History, and Settings. No tab bar (D-03).
 */
import { Link, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { MascotSlot } from '@/components/MascotSlot';
import { useTheme } from '../../theme';

export default function HomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();

  const handleStartSession = () => {
    router.push('/co-pilot');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: theme.spacing.lg }}>
        <MascotSlot accessibilityLabel={t('home.mascotSlotLabel')} />

        <Text
          style={[
            styles.title,
            { color: theme.colors.textPrimary, fontSize: theme.typography.scale.display },
          ]}
        >
          {t('home.title')}
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={handleStartSession}
          style={[
            styles.primaryOffer,
            { backgroundColor: theme.colors.accent, borderRadius: theme.radii.pill },
          ]}
        >
          <Text
            style={[
              styles.primaryOfferLabel,
              { color: theme.colors.background, fontSize: theme.typography.scale.title },
            ]}
          >
            {t('home.startSessionOffer')}
          </Text>
        </Pressable>

        <Link href="/brain-dump" asChild>
          <Pressable
            accessibilityRole="button"
            style={[
              styles.secondaryOffer,
              { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radii.md },
            ]}
          >
            <Text
              style={{ color: theme.colors.textPrimary, fontSize: theme.typography.scale.body }}
            >
              {t('home.brainDumpOffer')}
            </Text>
          </Pressable>
        </Link>

        <View style={[styles.linkRow, { gap: theme.spacing.lg }]}>
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
