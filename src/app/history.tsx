/**
 * History screen (D-04, D-15, PILOT-07). Reads sessionsRepo.list() and
 * renders each persisted session as a plain chronological row — a quiet log,
 * no statistics, no completion rate, no daily boundaries/grouping. Task 3
 * (Plan 03-03) extends each row with a per-session duration (floored at
 * "Under a minute" so a session never reads as "0 min") and the ending
 * moment's own mood glyph, trailing, only when present.
 */
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { useTheme } from '../../theme';
import { sessionsRepo } from '../../data/repositories/sessions';
import type { Session } from '../../data/types';

// Mirrors co-pilot.tsx's ending-moment mood↔glyph mapping (UI-SPEC Flag 5,
// Claude's discretion): 3=🙂 / 2=😐 / 1=😣. Glyph only here — the word label
// was already given once, at capture time.
const MOOD_GLYPHS: Record<1 | 2 | 3, string> = { 3: '🙂', 2: '😐', 1: '😣' };

function SessionRow({ session }: { session: Session }) {
  const { t } = useTranslation();
  const theme = useTheme();

  // A session still in progress (no endedAt — shouldn't normally reach
  // History, but this keeps the row well-defined regardless) derives against
  // a "now" fallback. Read via a useState lazy initializer (mirrors
  // useElapsedSession.ts's own `useState(() => Date.now())` precedent),
  // never a bare `Date.now()` call in the render body itself — calling an
  // impure function directly during render is a purity violation
  // (react-hooks/purity), and this row's data doesn't need to tick live.
  const [nowFallback] = useState(() => Date.now());
  const durationMs = (session.endedAt ?? nowFallback) - session.startedAt;
  const durationMinutes = Math.floor(durationMs / 60000);
  const durationText =
    durationMs < 60000
      ? t('history.durationLessThanMinute')
      : t('history.duration', { count: durationMinutes });

  const rowStyle = StyleSheet.flatten([styles.row, { borderColor: theme.colors.border }]);
  const mainLineStyle = StyleSheet.flatten([styles.mainLine, { gap: theme.spacing.sm }]);
  const labelStyle = StyleSheet.flatten([
    styles.label,
    { color: theme.colors.textPrimary, fontSize: theme.typography.scale.body },
  ]);
  const metaLineStyle = StyleSheet.flatten([styles.metaLine, { gap: theme.spacing.sm }]);
  const timestampStyle = StyleSheet.flatten([
    styles.timestamp,
    { color: theme.colors.textSecondary, fontSize: theme.typography.scale.caption },
  ]);
  const durationStyle = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.scale.caption,
  };

  return (
    <View style={rowStyle}>
      <View style={mainLineStyle}>
        <Text style={labelStyle}>{session.taskLabel ?? t('history.sessionFallbackLabel')}</Text>
        {session.mood !== undefined && <Text style={styles.moodGlyph}>{MOOD_GLYPHS[session.mood]}</Text>}
      </View>
      <View style={metaLineStyle}>
        <Text style={timestampStyle}>{new Date(session.startedAt).toLocaleString()}</Text>
        <Text style={durationStyle}>{durationText}</Text>
      </View>
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
  mainLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moodGlyph: {
    fontSize: 16,
  },
});
