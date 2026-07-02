/**
 * Starter screen shell (D-04). Implementation-intention builder stub only —
 * no builder logic yet, that lands in Phase 5.
 */
import { StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { useTheme } from '../../theme';

export default function StarterScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Screen>
      <Text
        style={[
          styles.title,
          { color: theme.colors.textPrimary, fontSize: theme.typography.scale.display },
        ]}
      >
        {t('starter.title')}
      </Text>
      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.scale.body }}>
        {t('starter.description')}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontWeight: '600',
  },
});
