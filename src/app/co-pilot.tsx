/**
 * Co-pilot screen (D-01..D-07, D-16, PILOT-01..04). A single route driving a
 * `flowPhase` state machine: `setup` (three equal-weight entry paths, D-01)
 * -> `active` (mascot presence/dozing + subtle timer + single End, D-04/05/07)
 * -> `ending` (warm acknowledgment + mood check, Plan 03-03).
 *
 * Nothing is persisted until a path is chosen on the setup screen (Pattern 1)
 * — the length-intent chips are ephemeral component state, never written to
 * `sessionsRepo` (D-03). Re-entering this route while a session is already
 * live resumes the active phase directly instead of starting a new one
 * (D-16) via the `flowPhase`/`activeSession` initializers below, which read
 * the Plan 03-01 `activeSessionRepo` pointer synchronously on mount.
 */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Screen } from '@/components/Screen';
import { Mascot } from '@/components/Mascot/Mascot';
import { useTheme } from '../../theme';
import { activeSessionRepo } from '../../data/repositories/activeSession';
import { sessionsRepo } from '../../data/repositories/sessions';
import { dumpItemsRepo } from '../../data/repositories/dumpItems';
import { useElapsedSession } from '@/features/co-pilot/useElapsedSession';
import type { DumpItem, Session } from '../../data/types';

type LiveSession = {
  sessionId: string;
  startedAt: number;
  taskLabel?: string;
};

// D-03: preset length-intent suggestions, 25 pre-highlighted by default.
// Never round-tripped through sessionsRepo — display-only, local state.
const LENGTH_CHIP_VALUES = [15, 25, 45, 90];
const CROSSFADE_MS = 325; // mirrors Mascot.tsx's opacity-fade idiom, within the 300-350ms band

function crossfadeDurationMs(): number {
  return CROSSFADE_MS;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

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
        <ActivePhase session={activeSession} lengthIntentMin={lengthIntentMin} />
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

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('coPilot.setup.justWork.label')}
        onPress={onStartOpen}
        style={justWorkCardStyle}
      >
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

// Active session screen: mascot presence/dozing (D-04, D-07), a subtle
// timestamp-derived timer with opt-in countdown (D-05, D-06), and the single
// End button (D-04). The ending moment itself (warm acknowledgment + mood
// check, D-13) lands in Plan 03-03 — End is a quiet-close stub here.
function ActivePhase({
  session,
  lengthIntentMin,
}: {
  session: LiveSession;
  lengthIntentMin: number | null;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();

  const { elapsedMs, isDozing, wake } = useElapsedSession(session.startedAt, (lastAliveAt) =>
    activeSessionRepo.heartbeat(lastAliveAt)
  );

  const [timeMode, setTimeMode] = useState<'elapsed' | 'remaining'>('elapsed');
  const [countdownRetired, setCountdownRetired] = useState(false);

  // D-06: the crossfade back to elapsed at zero, and any manual toggle, both
  // go through this shared opacity animation — mirrors Mascot.tsx's own
  // "set to 0, withTiming back to 1 on every state change" idiom.
  const opacity = useSharedValue(1);

  const remainingMs =
    lengthIntentMin != null ? Math.max(0, lengthIntentMin * 60 * 1000 - elapsedMs) : 0;

  // D-06: no sound, no vibration, no color change, no mascot reaction when a
  // countdown reaches zero — silently fall back to a plain elapsed count-up
  // and permanently retire the toggle for the rest of the session. Adjusting
  // state directly during render (not inside an effect) is the React-endorsed
  // pattern for state derived purely from this render's own inputs — it
  // never touches the Reanimated shared value, so it stays a plain,
  // side-effect-free state update; the crossfade itself is driven by the
  // effect below, which reacts to the resulting `timeMode` change.
  if (timeMode === 'remaining' && lengthIntentMin != null && !countdownRetired && remainingMs <= 0) {
    setTimeMode('elapsed');
    setCountdownRetired(true);
  }

  // D-06 crossfade: mirrors Mascot.tsx's own "opacity.value = 0, withTiming
  // back to 1" idiom, re-fading on every `timeMode` change regardless of
  // whether it came from the manual toggle below or the auto-retire above.
  useEffect(() => {
    opacity.value = 0;
    opacity.value = withTiming(1, { duration: crossfadeDurationMs() });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: re-fade on every timeMode change only, mirrors Mascot.tsx's currentState-only effect
  }, [timeMode]);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const canToggleTimeMode = lengthIntentMin != null && !countdownRetired;
  const handleNumeralPress = () => {
    if (!canToggleTimeMode) return;
    setTimeMode((mode) => (mode === 'elapsed' ? 'remaining' : 'elapsed'));
  };

  // T-03-05: a dedicated ref, distinct from the setup phase's
  // isStartingSessionRef — that ref is already permanently `true` once a
  // session has started, so reusing it here would leave End permanently
  // disabled. This one only guards against a double-tap on End itself.
  const isEndingSessionRef = useRef(false);
  const handleEnd = () => {
    if (isEndingSessionRef.current) return;
    isEndingSessionRef.current = true;
    // Quiet-close stub (D-13's warm acknowledgment + mood check land in
    // Plan 03-03) — ending here is still always a completed session, never
    // an "abandoned" one, regardless of duration (D-14).
    sessionsRepo.update(session.sessionId, { endedAt: Date.now() });
    activeSessionRepo.clear();
    router.replace('/');
  };

  const kickerStyle = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.scale.caption,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.2,
  };
  const taskLabelStyle = {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.scale.body,
  };
  const timerStyle: TextStyle = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.scale.title,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  };
  const timeModeCaptionStyle = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.scale.caption,
  };
  const endButtonStyle = StyleSheet.flatten([
    styles.endButton,
    { backgroundColor: theme.colors.accent, borderRadius: theme.radii.pill },
  ]);
  const endButtonLabelStyle = {
    color: theme.colors.background,
    fontSize: theme.typography.scale.body,
    fontWeight: '600' as const,
  };

  const activeContainerStyle = StyleSheet.flatten([styles.activeContainer, { gap: theme.spacing.lg }]);

  return (
    <View style={activeContainerStyle}>
      <Text style={kickerStyle}>{t('coPilot.active.kicker')}</Text>

      <Text style={taskLabelStyle}>{session.taskLabel ?? t('coPilot.setup.justWork.label')}</Text>

      <Pressable onPress={wake}>
        <Mascot
          state={isDozing ? 'dozing' : 'presence'}
          prominence="prominent"
          accessibilityLabel={t(`mascot.accessibility.${isDozing ? 'dozing' : 'presence'}`)}
        />
      </Pressable>

      <Animated.View style={[styles.timerBlock, fadeStyle]}>
        <Pressable accessibilityRole="button" disabled={!canToggleTimeMode} onPress={handleNumeralPress}>
          <Text style={timerStyle}>{formatDuration(timeMode === 'remaining' ? remainingMs : elapsedMs)}</Text>
        </Pressable>
        {lengthIntentMin != null && !countdownRetired && (
          <Text style={timeModeCaptionStyle}>{t(`coPilot.active.timeMode.${timeMode}`)}</Text>
        )}
      </Animated.View>

      <Pressable accessibilityRole="button" onPress={handleEnd} style={endButtonStyle}>
        <Text style={endButtonLabelStyle}>{t('coPilot.active.endButton')}</Text>
      </Pressable>
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
  timerBlock: {
    alignItems: 'center',
    gap: 4,
  },
  endButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginTop: 8,
  },
});
