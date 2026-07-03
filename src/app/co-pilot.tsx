/**
 * Co-pilot screen (D-01..D-03, D-16, PILOT-01). A single route driving a
 * `flowPhase` state machine: `setup` (three equal-weight entry paths, D-01)
 * -> `active` (mascot presence/dozing + subtle timer + single End, D-04/05/07
 * — filled in by this plan's Task 3) -> `ending` (warm acknowledgment + mood
 * check, Plan 03-03).
 *
 * Nothing is persisted until a path is chosen on the setup screen (Pattern 1)
 * — the length-intent chips are ephemeral component state, never written to
 * `sessionsRepo` (D-03). Re-entering this route while a session is already
 * live resumes the active phase directly instead of starting a new one
 * (D-16) via the `flowPhase`/`activeSession` initializers below, which read
 * the Plan 03-01 `activeSessionRepo` pointer synchronously on mount.
 */
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { useTheme } from '../../theme';
import { activeSessionRepo } from '../../data/repositories/activeSession';
import { sessionsRepo } from '../../data/repositories/sessions';
import { dumpItemsRepo } from '../../data/repositories/dumpItems';
import type { DumpItem, Session } from '../../data/types';

type LiveSession = {
  sessionId: string;
  startedAt: number;
  taskLabel?: string;
};

// D-03: preset length-intent suggestions, 25 pre-highlighted by default.
// Never round-tripped through sessionsRepo — display-only, local state.
const LENGTH_CHIP_VALUES = [15, 25, 45, 90];

export default function CoPilotScreen() {
  // D-16 / Open Question 2: reading the pointer synchronously in the
  // initializer (not an effect) means a re-entered route lands on the
  // active phase on its very first render, never flashing 'setup' first.
  const [flowPhase, setFlowPhase] = useState<'setup' | 'active' | 'ending'>(() =>
    activeSessionRepo.read() ? 'active' : 'setup'
  );
  const [activeSession, setActiveSession] = useState<LiveSession | null>(() => {
    const pointer = activeSessionRepo.read();
    if (!pointer) return null;
    return { sessionId: pointer.sessionId, startedAt: pointer.startedAt, taskLabel: pointer.taskLabel };
  });
  // D-03: ephemeral UI state only — held here (not in sessionsRepo) so it can
  // be forwarded into the active phase's countdown display without ever
  // becoming a schema field.
  const [lengthIntentMin, setLengthIntentMin] = useState<number | null>(25);

  // Shared across all three start affordances (WR-04/T-03-05) — only one of
  // one-liner/just-work/dump-item may ever create a session for a single
  // rapid multi-tap.
  const isStartingSessionRef = useRef(false);

  const beginSession = (session: Session) => {
    activeSessionRepo.start(session.id, session.startedAt, session.taskLabel);
    setActiveSession({ sessionId: session.id, startedAt: session.startedAt, taskLabel: session.taskLabel });
    setFlowPhase('active');
  };

  const startFromOneLiner = (text: string) => {
    if (isStartingSessionRef.current) return;
    isStartingSessionRef.current = true;
    const trimmed = text.trim();
    const session = sessionsRepo.create({ source: 'quick', taskLabel: trimmed.length > 0 ? trimmed : undefined });
    beginSession(session);
  };

  const startFromDumpItem = (item: DumpItem) => {
    if (isStartingSessionRef.current) return;
    isStartingSessionRef.current = true;
    const session = sessionsRepo.create({ source: 'dump', taskLabel: item.text });
    dumpItemsRepo.update(item.id, { promotedTaskId: session.id });
    beginSession(session);
  };

  const startOpen = () => {
    if (isStartingSessionRef.current) return;
    isStartingSessionRef.current = true;
    const session = sessionsRepo.create({ source: 'open' });
    beginSession(session);
  };

  return (
    <Screen>
      {flowPhase === 'active' && activeSession ? (
        // Task 3 fills this in with mascot presence/dozing, the subtle
        // timestamp-derived timer, and the single End button (D-04/05/07).
        <ActivePhasePlaceholder session={activeSession} />
      ) : (
        <SetupPhase
          lengthIntentMin={lengthIntentMin}
          onSelectLengthIntent={setLengthIntentMin}
          onStartOneLiner={startFromOneLiner}
          onStartDumpItem={startFromDumpItem}
          onStartOpen={startOpen}
        />
      )}
    </Screen>
  );
}

function SetupPhase({
  lengthIntentMin,
  onSelectLengthIntent,
  onStartOneLiner,
  onStartDumpItem,
  onStartOpen,
}: {
  lengthIntentMin: number | null;
  onSelectLengthIntent: (min: number | null) => void;
  onStartOneLiner: (text: string) => void;
  onStartDumpItem: (item: DumpItem) => void;
  onStartOpen: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  const [oneLinerText, setOneLinerText] = useState('');
  // Once focused, the "Start" affordance stays enabled even if focus later
  // moves (e.g. onto the affordance itself) — gating on live focus alone
  // would race the blur that fires just before the button's own press
  // registers on some platforms. D-01/UI-SPEC only requires "enabled once
  // the field has focus", not "only while focused" (Claude's discretion).
  const [hasFocusedOneLiner, setHasFocusedOneLiner] = useState(false);

  const dumpItems = dumpItemsRepo.list();

  const titleStyle = StyleSheet.flatten([
    styles.title,
    { color: theme.colors.textPrimary, fontSize: theme.typography.scale.display },
  ]);
  const subheadingStyle = StyleSheet.flatten([
    { color: theme.colors.textSecondary, fontSize: theme.typography.scale.body },
  ]);
  const sectionLabelStyle = StyleSheet.flatten([
    styles.sectionLabel,
    {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.scale.caption,
    },
  ]);
  const inputStyle = StyleSheet.flatten([
    styles.input,
    {
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.md,
      fontSize: theme.typography.scale.body,
    },
  ]);
  const oneLinerCtaStyle = StyleSheet.flatten([
    styles.tapTarget,
    styles.oneLinerCta,
    {
      backgroundColor: hasFocusedOneLiner ? theme.colors.accent : theme.colors.surfaceElevated,
      borderRadius: theme.radii.pill,
    },
  ]);
  const oneLinerCtaLabelStyle = {
    color: hasFocusedOneLiner ? theme.colors.background : theme.colors.textSecondary,
    fontSize: theme.typography.scale.body,
    fontWeight: '600' as const,
  };
  const justWorkCardStyle = StyleSheet.flatten([
    styles.card,
    { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radii.lg },
  ]);
  const justWorkLabelStyle = {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.scale.body,
    fontWeight: '600' as const,
  };
  const justWorkSubcopyStyle = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.scale.caption,
  };
  const dumpRowStyle = StyleSheet.flatten([
    styles.tapTarget,
    styles.card,
    { backgroundColor: theme.colors.surface, borderRadius: theme.radii.md },
  ]);
  const dumpRowTextStyle = { color: theme.colors.textPrimary, fontSize: theme.typography.scale.body };
  const chipsRowStyle = StyleSheet.flatten([styles.chipsRow, { gap: theme.spacing.sm }]);
  const captionStyle = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.scale.caption,
  };

  return (
    <ScrollView contentContainerStyle={{ gap: theme.spacing.lg }}>
      <Text style={titleStyle}>{t('coPilot.title')}</Text>
      <Text style={subheadingStyle}>{t('coPilot.setup.subheading')}</Text>

      <View style={{ gap: theme.spacing.sm }}>
        <Text style={sectionLabelStyle}>{t('coPilot.setup.oneLiner.label')}</Text>
        <TextInput
          value={oneLinerText}
          onChangeText={setOneLinerText}
          onFocus={() => setHasFocusedOneLiner(true)}
          placeholder={t('coPilot.setup.oneLiner.placeholder')}
          placeholderTextColor={theme.colors.textSecondary}
          onSubmitEditing={() => onStartOneLiner(oneLinerText)}
          returnKeyType="done"
          style={inputStyle}
        />
        <Pressable
          accessibilityRole="button"
          disabled={!hasFocusedOneLiner}
          onPress={() => onStartOneLiner(oneLinerText)}
          style={oneLinerCtaStyle}
        >
          <Text style={oneLinerCtaLabelStyle}>{t('coPilot.setup.oneLiner.cta')}</Text>
        </Pressable>
      </View>

      <Pressable accessibilityRole="button" onPress={onStartOpen} style={justWorkCardStyle}>
        <Text style={justWorkLabelStyle}>{t('coPilot.setup.justWork.label')}</Text>
        <Text style={justWorkSubcopyStyle}>{t('coPilot.setup.justWork.subcopy')}</Text>
      </Pressable>

      {dumpItems.length > 0 && (
        <View style={{ gap: theme.spacing.sm }}>
          <Text style={sectionLabelStyle}>{t('coPilot.setup.dumpPicker.heading')}</Text>
          {dumpItems.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => onStartDumpItem(item)}
              style={dumpRowStyle}
            >
              <Text style={dumpRowTextStyle}>{item.text}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={{ gap: theme.spacing.sm }}>
        <Text style={sectionLabelStyle}>{t('coPilot.setup.lengthIntent.heading')}</Text>
        <View style={chipsRowStyle}>
          {LENGTH_CHIP_VALUES.map((minutes) => {
            const selected = lengthIntentMin === minutes;
            const chipStyle = StyleSheet.flatten([
              styles.tapTarget,
              styles.chip,
              { backgroundColor: selected ? theme.colors.accent : theme.colors.surfaceElevated, borderRadius: theme.radii.pill },
            ]);
            const chipLabelStyle = {
              color: selected ? theme.colors.background : theme.colors.textPrimary,
              fontSize: theme.typography.scale.caption,
              fontWeight: '600' as const,
            };
            return (
              <Pressable
                key={minutes}
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => onSelectLengthIntent(minutes)}
                style={chipStyle}
              >
                <Text style={chipLabelStyle}>{t('coPilot.setup.lengthChip', { count: minutes })}</Text>
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => onSelectLengthIntent(null)}
            style={StyleSheet.flatten([
              styles.tapTarget,
              styles.chip,
              {
                backgroundColor: lengthIntentMin === null ? theme.colors.accent : theme.colors.surfaceElevated,
                borderRadius: theme.radii.pill,
              },
            ])}
          >
            <Text
              style={{
                color: lengthIntentMin === null ? theme.colors.background : theme.colors.textPrimary,
                fontSize: theme.typography.scale.caption,
                fontWeight: '600',
              }}
            >
              {t('coPilot.setup.lengthChip.noTimer')}
            </Text>
          </Pressable>
        </View>
        <Text style={captionStyle}>{t('coPilot.setup.lengthIntent.caption')}</Text>
      </View>
    </ScrollView>
  );
}

// Minimal stand-in for the active phase — Task 3 replaces this with the
// mascot presence/dozing host, the subtle timestamp-derived timer (with
// opt-in countdown), and the single End button (D-04, D-05, D-06, D-07).
function ActivePhasePlaceholder({ session }: { session: LiveSession }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const taskLabelStyle = { color: theme.colors.textPrimary, fontSize: theme.typography.scale.body };

  return (
    <View style={styles.activeContainer}>
      <Text style={taskLabelStyle}>{session.taskLabel ?? t('coPilot.setup.justWork.label')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontWeight: '600',
  },
  sectionLabel: {
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tapTarget: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  oneLinerCta: {
    alignSelf: 'flex-start',
    paddingHorizontal: 24,
  },
  card: {
    padding: 16,
    gap: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 16,
  },
  activeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
