/**
 * History screen (D-04, PILOT-07 spirit). Walking-skeleton read side (Task 2):
 * reads sessionsRepo.list() and renders each persisted session as a plain
 * chronological entry — a quiet log, no statistics, no completion rate, no
 * daily boundaries.
 */
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { useTheme } from '../../theme';
import { sessionsRepo } from '../../data/repositories/sessions';
import type { Session } from '../../data/types';

function SessionRow({ session }: { session: Session }) {
  const { t } = useTranslation();
  const theme = useTheme();

  const rowStyle = StyleSheet.flatten([styles.row, { borderColor: theme.colors.border }]);
  const labelStyle = StyleSheet.flatten([
    styles.label,
    { color: theme.colors.textPrimary, fontSize: theme.typography.scale.body },
  ]);
  const timestampStyle = StyleSheet.flatten([
    styles.timestamp,
    { color: theme.colors.textSecondary, fontSize: theme.typography.scale.caption },
  ]);

  return (
    <View style={rowStyle}>
      <Text style={labelStyle}>{session.taskLabel ?? t('history.sessionFallbackLabel')}</Text>
      <Text style={timestampStyle}>{new Date(session.startedAt).toLocaleString()}</Text>
    </View>
  );
}

export default function HistoryScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  // Quiet log, newest first — plain chronological entries only, per PILOT-07
  // ("history is a quiet log"): no scores, no completion rate, no daily
  // grouping.
  const sessions = [...sessionsRepo.list()].reverse();

  const titleStyle = StyleSheet.flatten([
    styles.title,
    { color: theme.colors.textPrimary, fontSize: theme.typography.scale.display },
  ]);

  return (
    <Screen>
      <Text style={titleStyle}>{t('history.title')}</Text>
      <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.scale.body }}>
        {t('history.description')}
      </Text>

      {sessions.length === 0 ? (
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.scale.body }}>
          {t('history.emptyState')}
        </Text>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(session) => session.id}
          renderItem={({ item }) => <SessionRow session={item} />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontWeight: '600',
  },
  row: {
    borderBottomWidth: 1,
    paddingVertical: 12,
    gap: 4,
  },
  label: {},
  timestamp: {},
});
