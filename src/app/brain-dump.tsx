/**
 * Brain dump screen shell (D-04, DUMP-05). Reachable directly from home.
 * No capture logic yet — that lands in Phase 4.
 */
import { StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { useTheme } from '../../theme';

export default function BrainDumpScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  // Flattened (never an array) — see Screen.tsx's comment on expo-router's
  // <Slot> shim rejecting array `style` props on a route's child elements.
  const titleStyle = StyleSheet.flatten([
    styles.title,
    { color: theme.colors.textPrimary, fontSize: theme.typography.scale.display },
  ]);

  return (
    <Screen>
      <Text style={titleStyle}>{t('brainDump.title')}</Text>
      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.scale.body }}>
        {t('brainDump.description')}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontWeight: '600',
  },
});
