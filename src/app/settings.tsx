/**
 * Settings screen shell (D-04). Locale/notification/subscription controls are
 * Phase 8 (SETT-01) — this is a titled placeholder only.
 */
import { StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { useTheme } from '../../theme';

export default function SettingsScreen() {
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
        {t('settings.title')}
      </Text>
      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.scale.body }}>
        {t('settings.description')}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontWeight: '600',
  },
});
