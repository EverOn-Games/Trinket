/**
 * Co-pilot screen shell (D-04). Session-flow stub only — no session logic yet,
 * that lands in Phase 3 (PILOT-*).
 */
import { StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { useTheme } from '../../theme';

export default function CoPilotScreen() {
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
        {t('coPilot.title')}
      </Text>
      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.scale.body }}>
        {t('coPilot.description')}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontWeight: '600',
  },
});
