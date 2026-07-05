/**
 * Starter screen (START-01..04). A two-step "when X, then Y" implementation-
 * intention builder — step 1 picks or types a situation cue (localized library
 * grouped time/place/event, START-02), step 2 names a tiny first physical
 * action (static coaching copy, START-04) — plus saved intention cards with an
 * optional single self-worded reminder (START-03).
 *
 * Copy offers, never instructs; the reminder is the user's own words back to
 * them (cue → title, action → body), one-shot, never recurring. Notification
 * permission is asked contextually at the moment a reminder is requested —
 * never on mount, never during onboarding (ONBD-01).
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { CUE_GROUPS, CUE_LIBRARY } from '@/features/starter/cues';
import {
  cancelIntentionNotification,
  computeFireDate,
  ensureNotificationPermission,
  scheduleIntentionNotification,
  type ReminderDay,
} from '@/features/starter/intentionNotifications';
import { useTheme } from '../../theme';
import { track } from '../analytics/analytics';
import { intentionsRepo } from '../../data/repositories/intentions';
import { useSettingsStore } from '../../data/stores/useSettingsStore';
import type { Intention } from '../../data/types';

// Reminder time slots (START-03 "user-chosen time" via day + slot chips —
// chip-based, not a native picker, to stay dependency-free). Hour values pair
// with the times embedded in the starter.notify.slot* i18n labels.
const REMINDER_SLOTS = [
  { labelKey: 'starter.notify.slotMorning', hour: 9 },
  { labelKey: 'starter.notify.slotMidday', hour: 12 },
  { labelKey: 'starter.notify.slotEvening', hour: 18 },
  { labelKey: 'starter.notify.slotNight', hour: 21 },
] as const;

export default function StarterScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  // Repo read in the render body (brain-dump/history precedent); `version`
  // bumps re-render after each mutation since MMKV writes are not reactive.
  const [version, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);
  const intentions = [...intentionsRepo.list()].reverse();

  // First visit with nothing saved lands straight in the builder (the empty
  // state IS the builder — mirrors brain-dump's empty→capture routing, D-12
  // precedent). `version` is deliberately unused here beyond re-render fuel.
  const [building, setBuilding] = useState(() => intentionsRepo.list().length === 0);

  const handleSaved = () => {
    setBuilding(false);
    bump();
  };

  const titleStyle = StyleSheet.flatten([
    styles.title,
    { color: theme.colors.textPrimary, fontSize: theme.typography.scale.display },
  ]);
  const newStarterStyle = StyleSheet.flatten([
    styles.tapTarget,
    styles.primaryPill,
    { backgroundColor: theme.colors.accent, borderRadius: theme.radii.pill },
  ]);
  const newStarterLabelStyle = {
    color: theme.colors.background,
    fontSize: theme.typography.scale.body,
    fontWeight: '600' as const,
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: theme.spacing.lg }}>
        <Text style={titleStyle}>{t('starter.title')}</Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.scale.body }}>
          {t('starter.description')}
        </Text>

        {building ? (
          <IntentionBuilder onSaved={handleSaved} />
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              onPress={() => setBuilding(true)}
              style={newStarterStyle}
            >
              <Text style={newStarterLabelStyle}>{t('starter.builder.newStarter')}</Text>
            </Pressable>

            {intentions.length === 0 ? (
              <Text
                style={{ color: theme.colors.textSecondary, fontSize: theme.typography.scale.body }}
              >
                {t('starter.cards.emptyLead')}
              </Text>
            ) : (
              intentions.map((intention) => (
                <IntentionCard key={`${intention.id}:${version}`} intention={intention} onChanged={bump} />
              ))
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

// Two-step builder (START-01): cue, then action. Each step is one decision;
// the library chips only pre-fill the editable field — typing always wins.
function IntentionBuilder({ onSaved }: { onSaved: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();

  const [step, setStep] = useState<'cue' | 'action'>('cue');
  const [cueText, setCueText] = useState('');
  const [actionText, setActionText] = useState('');

  const cueReady = cueText.trim().length > 0;
  const actionReady = actionText.trim().length > 0;

  const handleSave = () => {
    if (!actionReady) return;
    intentionsRepo.create({ cueText: cueText.trim(), actionText: actionText.trim() });
    track('starter_created', {});
    onSaved();
  };

  const headingStyle = {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.scale.title,
    fontWeight: '600' as const,
  };
  const subcopyStyle = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.scale.caption,
  };
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
  const groupLabelStyle = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.scale.caption,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.2,
  };
  const chipRowStyle = StyleSheet.flatten([styles.chipsRow, { gap: theme.spacing.sm }]);
  const forwardStyle = (enabled: boolean) =>
    StyleSheet.flatten([
      styles.tapTarget,
      styles.primaryPill,
      {
        backgroundColor: enabled ? theme.colors.accent : theme.colors.surfaceElevated,
        borderRadius: theme.radii.pill,
      },
    ]);
  const forwardLabelStyle = (enabled: boolean) => ({
    color: enabled ? theme.colors.background : theme.colors.textSecondary,
    fontSize: theme.typography.scale.body,
    fontWeight: '600' as const,
  });
  const quietLinkStyle = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.scale.body,
  };

  if (step === 'cue') {
    return (
      <View style={{ gap: theme.spacing.md }}>
        <Text style={headingStyle}>{t('starter.builder.cueHeading')}</Text>
        <Text style={subcopyStyle}>{t('starter.builder.cueSubcopy')}</Text>
        <TextInput
          value={cueText}
          onChangeText={setCueText}
          placeholder={t('starter.builder.cuePlaceholder')}
          placeholderTextColor={theme.colors.textSecondary}
          style={inputStyle}
        />

        <Text style={subcopyStyle}>{t('starter.cues.orPick')}</Text>
        {CUE_GROUPS.map((group) => (
          <View key={group} style={{ gap: theme.spacing.sm }}>
            <Text style={groupLabelStyle}>{t(`starter.cues.${group}.label`)}</Text>
            <View style={chipRowStyle}>
              {CUE_LIBRARY[group].map((cueKey) => {
                const selected = cueText === t(cueKey);
                return (
                  <Pressable
                    key={cueKey}
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => setCueText(t(cueKey))}
                    style={StyleSheet.flatten([
                      styles.tapTarget,
                      styles.chip,
                      {
                        backgroundColor: selected ? theme.colors.accent : theme.colors.surfaceElevated,
                        borderRadius: theme.radii.pill,
                      },
                    ])}
                  >
                    <Text
                      style={{
                        color: selected ? theme.colors.background : theme.colors.textPrimary,
                        fontSize: theme.typography.scale.caption,
                      }}
                    >
                      {t(cueKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !cueReady }}
          disabled={!cueReady}
          onPress={() => setStep('action')}
          style={forwardStyle(cueReady)}
        >
          <Text style={forwardLabelStyle(cueReady)}>{t('starter.builder.cueNext')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ gap: theme.spacing.md }}>
      <Text style={subcopyStyle}>
        {t('starter.cards.whenLabel')} {cueText.trim()}
      </Text>
      <Text style={headingStyle}>{t('starter.builder.actionHeading')}</Text>
      <Text style={subcopyStyle}>{t('starter.builder.actionSubcopy')}</Text>
      <TextInput
        value={actionText}
        onChangeText={setActionText}
        placeholder={t('starter.builder.actionPlaceholder')}
        placeholderTextColor={theme.colors.textSecondary}
        style={inputStyle}
      />
      <Text style={subcopyStyle}>{t('starter.builder.actionExample')}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !actionReady }}
        disabled={!actionReady}
        onPress={handleSave}
        style={forwardStyle(actionReady)}
      >
        <Text style={forwardLabelStyle(actionReady)}>{t('starter.builder.save')}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => setStep('cue')} style={styles.tapTarget}>
        <Text style={quietLinkStyle}>{t('starter.builder.back')}</Text>
      </Pressable>
    </View>
  );
}

// A saved intention card: the user's own "when X, then Y" plus the optional
// single reminder. rowMode keeps delete-confirm / reminder-picker mutually
// exclusive (brain-dump DumpItemRow precedent).
function IntentionCard({ intention, onChanged }: { intention: Intention; onChanged: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const setNotificationsOptIn = useSettingsStore((s) => s.setNotificationsOptIn);

  const [rowMode, setRowMode] = useState<'idle' | 'delete' | 'notify'>('idle');
  const [reminderDay, setReminderDay] = useState<ReminderDay>('today');
  const [slotHour, setSlotHour] = useState<number>(18);
  const [notifyUnavailable, setNotifyUnavailable] = useState(false);

  const handleDelete = async () => {
    if (intention.notificationId) {
      await cancelIntentionNotification(intention.notificationId);
    }
    intentionsRepo.remove(intention.id);
    onChanged();
  };

  const handleScheduleReminder = async () => {
    const granted = await ensureNotificationPermission();
    if (!granted) {
      // Quiet unavailability, never an error state — the starter itself is
      // saved and untouched regardless (START-03 / shame-free).
      setNotifyUnavailable(true);
      setRowMode('idle');
      return;
    }
    setNotificationsOptIn(true);
    const fireAt = computeFireDate(reminderDay, slotHour, 0, Date.now());
    const notificationId = await scheduleIntentionNotification(
      intention.cueText,
      intention.actionText,
      fireAt
    );
    intentionsRepo.update(intention.id, { notifyAt: fireAt, notificationId });
    track('reminder_scheduled', { dayChosen: reminderDay });
    setRowMode('idle');
    onChanged();
  };

  const handleRemoveReminder = async () => {
    if (intention.notificationId) {
      await cancelIntentionNotification(intention.notificationId);
    }
    intentionsRepo.update(intention.id, { notifyAt: undefined, notificationId: undefined });
    onChanged();
  };

  const cardStyle = StyleSheet.flatten([
    styles.card,
    { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radii.lg },
  ]);
  const whenLineStyle = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.scale.caption,
  };
  const cueStyle = {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.scale.body,
    fontWeight: '600' as const,
  };
  const actionStyle = {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.scale.body,
  };
  const quietActionStyle = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.scale.caption,
  };
  const chipRowStyle = StyleSheet.flatten([styles.chipsRow, { gap: theme.spacing.sm }]);
  const chipStyle = (selected: boolean) =>
    StyleSheet.flatten([
      styles.tapTarget,
      styles.chip,
      {
        backgroundColor: selected ? theme.colors.accent : theme.colors.surface,
        borderRadius: theme.radii.pill,
      },
    ]);
  const chipLabelStyle = (selected: boolean) => ({
    color: selected ? theme.colors.background : theme.colors.textPrimary,
    fontSize: theme.typography.scale.caption,
  });

  return (
    <View style={cardStyle}>
      <Text style={whenLineStyle}>{t('starter.cards.whenLabel')}</Text>
      <Text style={cueStyle}>{intention.cueText}</Text>
      <Text style={whenLineStyle}>{t('starter.cards.thenLabel')}</Text>
      <Text style={actionStyle}>{intention.actionText}</Text>

      {rowMode === 'idle' && (
        <View style={{ gap: theme.spacing.sm }}>
          {intention.notifyAt !== undefined ? (
            <>
              <Text style={quietActionStyle}>
                {t('starter.notify.scheduledAt', {
                  when: new Date(intention.notifyAt).toLocaleString(),
                })}
              </Text>
              <Pressable accessibilityRole="button" onPress={handleRemoveReminder} style={styles.tapTarget}>
                <Text style={quietActionStyle}>{t('starter.notify.remove')}</Text>
              </Pressable>
            </>
          ) : notifyUnavailable ? (
            <Text style={quietActionStyle}>{t('starter.notify.unavailable')}</Text>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => setRowMode('notify')}
              style={styles.tapTarget}
            >
              <Text style={quietActionStyle}>{t('starter.notify.offer')}</Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={() => setRowMode('delete')}
            style={styles.tapTarget}
          >
            <Text style={quietActionStyle}>{t('starter.cards.delete')}</Text>
          </Pressable>
        </View>
      )}

      {rowMode === 'delete' && (
        <View style={{ gap: theme.spacing.sm }}>
          <Text style={actionStyle}>{t('starter.cards.deleteConfirmHeading')}</Text>
          <View style={chipRowStyle}>
            <Pressable accessibilityRole="button" onPress={handleDelete} style={styles.tapTarget}>
              <Text style={actionStyle}>{t('starter.cards.deleteConfirm')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setRowMode('idle')}
              style={styles.tapTarget}
            >
              <Text style={quietActionStyle}>{t('starter.cards.deleteKeep')}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {rowMode === 'notify' && (
        <View style={{ gap: theme.spacing.sm }}>
          <Text style={quietActionStyle}>{t('starter.notify.subcopy')}</Text>
          <View style={chipRowStyle}>
            {(['today', 'tomorrow'] as const).map((day) => (
              <Pressable
                key={day}
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setReminderDay(day)}
                style={chipStyle(reminderDay === day)}
              >
                <Text style={chipLabelStyle(reminderDay === day)}>
                  {t(day === 'today' ? 'starter.notify.dayToday' : 'starter.notify.dayTomorrow')}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={chipRowStyle}>
            {REMINDER_SLOTS.map((slot) => (
              <Pressable
                key={slot.labelKey}
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setSlotHour(slot.hour)}
                style={chipStyle(slotHour === slot.hour)}
              >
                <Text style={chipLabelStyle(slotHour === slot.hour)}>{t(slot.labelKey)}</Text>
              </Pressable>
            ))}
          </View>
          <View style={chipRowStyle}>
            <Pressable
              accessibilityRole="button"
              onPress={handleScheduleReminder}
              style={StyleSheet.flatten([
                styles.tapTarget,
                styles.primaryPill,
                { backgroundColor: theme.colors.accent, borderRadius: theme.radii.pill },
              ])}
            >
              <Text
                style={{
                  color: theme.colors.background,
                  fontSize: theme.typography.scale.caption,
                  fontWeight: '600',
                }}
              >
                {t('starter.notify.confirm')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setRowMode('idle')}
              style={styles.tapTarget}
            >
              <Text style={quietActionStyle}>{t('starter.notify.notNow')}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
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
  primaryPill: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 16,
  },
  card: {
    padding: 16,
    gap: 6,
  },
});
