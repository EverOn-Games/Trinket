/**
 * History screen shell (D-04). Titled placeholder only in Task 1 — Task 2
 * wires the real sessionsRepo.list() read (the walking-skeleton read side).
 */
import { StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { useTheme } from '../../theme';

export default function HistoryScreen() {
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
        {t('history.title')}
      </Text>
      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.scale.body }}>
        {t('history.description')}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontWeight: '600',
  },
});
