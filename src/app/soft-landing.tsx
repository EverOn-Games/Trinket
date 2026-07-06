/**
 * Soft landing screen (MECH-01, v0.2 §3): the user configures a heads-up
 * that a planned change of activity is approaching — their own plan spoken
 * back at the time they chose, with the runway they chose. Informational
 * only: no imperative copy, no "time to", no completion tracking, no state
 * for an ignored landing (swiping the notification away simply ends it).
 *
 * Time entry reuses Starter's day+slot chip pattern (no native picker) and
 * its DST-safe computeFireDate; scheduling reuses the Starter-precedent
 * plumbing via landingNotifications.ts. Permission is asked contextually at
 * save (ONBD-01 posture). A denial keeps the form intact with a quiet
 * caption — nothing typed is ever thrown away, nothing errors.
 */
import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import {
  computeFireDate,
  ensureNotificationPermission,
  type ReminderDay,
} from '@/features/starter/intentionNotifications';
import {
  cancelLandingNotifications,
  scheduleLandingNotifications,
} from '@/features/soft-landing/landingNotifications';
import { useTheme } from '../../theme';
import { landingsRepo } from '../../data/repositories/landings';
import { useRepoVersion } from '../../data/repoBus';
import { useSettingsStore } from '../../data/stores/useSettingsStore';
import { track } from '../analytics/analytics';
import type { Landing } from '../../data/types';

// Same slot grid as Starter (starter.tsx) — familiar, picker-free.
const TIME_SLOTS = [
  { labelKey: 'softLanding.slotMorning', hour: 9 },
  { labelKey: 'softLanding.slotMidday', hour: 12 },
  { labelKey: 'softLanding.slotEvening', hour: 18 },
  { labelKey: 'softLanding.slotNight', hour: 21 },
] as const;

// Runway suggestions only — v0.2 §3: "runway lengths are suggestions,
// freely set". Chips cover the common cases; no custom input at v1.
const RUNWAY_MINUTES = [5, 10, 15, 30] as const;

// Landings whose moment is more than this far gone are quietly removed on
// mount — deletion, not completion tracking (nothing records whether the
// user acted on them).
const EXPIRY_GRACE_MS = 60 * 60 * 1000;

function formatClock(epochMs: number): string {
  const d = new Date(epochMs);
  const hh = String(d.getHours());
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function SoftLandingScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  useRepoVersion('landing');
  const [nowAtMount] = useState(() => Date.now());

  // Lazy expiry sweep, mount-once (an effect, never a render-body mutation —
  // repo writes notify subscribers). Quiet deletion of long-past landings;
  // best-effort notification cancel for hygiene. This is cleanup, not
  // completion tracking — nothing records whether a landing was acted on.
  useEffect(() => {
    for (const landing of landingsRepo.list()) {
      if (landing.activityAt < nowAtMount - EXPIRY_GRACE_MS) {
        void cancelLandingNotifications(landing);
        landingsRepo.remove(landing.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-once sweep against the mount-time clock
  }, []);

  // §3 entry points "from a task / a session": arriving with prefillLabel
  // seeds the activity field (the task's own words); sourceTaskId is stored
  // on the landing created from THIS arrival only — it clears after the
  // first save so a second landing set up in the same visit isn't silently
  // attributed to the earlier task.
  const params = useLocalSearchParams<{ prefillLabel?: string; sourceTaskId?: string }>();
  const [activityLabel, setActivityLabel] = useState(() =>
    typeof params.prefillLabel === 'string' ? params.prefillLabel : ''
  );
  const [sourceTaskId, setSourceTaskId] = useState<string | undefined>(() =>
    typeof params.sourceTaskId === 'string' ? params.sourceTaskId : undefined
  );
  const [day, setDay] = useState<ReminderDay>('today');
  const [slotHour, setSlotHour] = useState<number>(18);
  const [leadMinutes, setLeadMinutes] = useState<number>(10);
  const [transitionTouch, setTransitionTouch] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const upcoming = landingsRepo
    .list()
    .filter((l) => l.activityAt >= nowAtMount - EXPIRY_GRACE_MS)
    .sort((a, b) => a.activityAt - b.activityAt);

  const handleSave = async () => {
    const trimmed = activityLabel.trim();
    if (trimmed.length === 0 || isSaving) return;
    setIsSaving(true);
    try {
      const granted = await ensureNotificationPermission();
      if (!granted) {
        // Quiet unavailable caption; the form (and the typed label) stays.
        setUnavailable(true);
        return;
      }
      useSettingsStore.getState().setNotificationsOptIn(true);
      setUnavailable(false);

      const now = Date.now();
      const activityAt = computeFireDate(day, slotHour, 0, now);
      const ids = await scheduleLandingNotifications(
        { activityLabel: trimmed, activityAt, leadMinutes, transitionTouch },
        {
          headsUpBody: t('softLanding.notify.headsUp', { count: leadMinutes }),
          transitionBody: t('softLanding.notify.transition'),
        },
        now
      );
      landingsRepo.create({
        activityLabel: trimmed,
        sourceTaskId,
        leadMinutes,
        activityAt,
        transitionTouch,
        ...ids,
      });
      setSourceTaskId(undefined);
      track('landing_scheduled', { leadMinutes, transitionTouch });
      setActivityLabel('');
      setTransitionTouch(false);
    } catch {
      // Scheduling hiccups degrade to the same quiet caption — never an error state.
      setUnavailable(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (landing: Landing) => {
    await cancelLandingNotifications(landing);
    landingsRepo.remove(landing.id);
  };

  const sectionHeadingStyle = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.scale.caption,
    fontWeight: '600' as const,
  };
  const bodyStyle = {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.scale.body,
  };
  const quietStyle = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.scale.caption,
  };
  const inputStyle = StyleSheet.flatten([
    styles.input,
    {
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.surfaceElevated,
      borderRadius: theme.radii.lg,
      fontSize: theme.typography.scale.body,
    },
  ]);
  const chipStyle = (selected: boolean) =>
    StyleSheet.flatten([
      styles.chip,
      {
        backgroundColor: selected ? theme.colors.accent : theme.colors.surfaceElevated,
        borderRadius: theme.radii.pill,
      },
    ]);
  const chipLabelStyle = (selected: boolean) => ({
    color: selected ? theme.colors.onAccent : theme.colors.textPrimary,
    fontSize: theme.typography.scale.caption,
    fontWeight: '600' as const,
  });
  const saveStyle = StyleSheet.flatten([
    styles.tapTarget,
    styles.savePill,
    { backgroundColor: theme.colors.accent, borderRadius: theme.radii.pill },
  ]);
  const rowStyle = StyleSheet.flatten([
    styles.landingRow,
    { backgroundColor: theme.colors.surface, borderRadius: theme.radii.lg },
  ]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: theme.spacing.lg }}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.typography.scale.display,
            fontWeight: '600',
          }}
        >
          {t('softLanding.title')}
        </Text>
        <Text style={bodyStyle}>{t('softLanding.description')}</Text>

        <View style={{ gap: theme.spacing.sm }}>
          <Text style={sectionHeadingStyle}>{t('softLanding.form.activityHeading')}</Text>
          <TextInput
            value={activityLabel}
            onChangeText={setActivityLabel}
            placeholder={t('softLanding.form.activityPlaceholder')}
            placeholderTextColor={theme.colors.textSecondary}
            style={inputStyle}
            accessibilityLabel={t('softLanding.form.activityHeading')}
          />
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <Text style={sectionHeadingStyle}>{t('softLanding.form.whenHeading')}</Text>
          <View style={styles.chipRow}>
            {(['today', 'tomorrow'] as const).map((d) => (
              <Pressable
                key={d}
                accessibilityRole="button"
                onPress={() => setDay(d)}
                style={chipStyle(day === d)}
              >
                <Text style={chipLabelStyle(day === d)}>
                  {t(d === 'today' ? 'softLanding.dayToday' : 'softLanding.dayTomorrow')}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.chipRow}>
            {TIME_SLOTS.map((slot) => (
              <Pressable
                key={slot.hour}
                accessibilityRole="button"
                onPress={() => setSlotHour(slot.hour)}
                style={chipStyle(slotHour === slot.hour)}
              >
                <Text style={chipLabelStyle(slotHour === slot.hour)}>{t(slot.labelKey)}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <Text style={sectionHeadingStyle}>{t('softLanding.form.runwayHeading')}</Text>
          <Text style={quietStyle}>{t('softLanding.form.runwaySub')}</Text>
          <View style={styles.chipRow}>
            {RUNWAY_MINUTES.map((minutes) => (
              <Pressable
                key={minutes}
                accessibilityRole="button"
                onPress={() => setLeadMinutes(minutes)}
                style={chipStyle(leadMinutes === minutes)}
              >
                <Text style={chipLabelStyle(leadMinutes === minutes)}>
                  {t('softLanding.form.runwayChip', { minutes })}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: transitionTouch }}
          onPress={() => setTransitionTouch((v) => !v)}
          style={chipStyle(transitionTouch)}
        >
          <Text style={chipLabelStyle(transitionTouch)}>
            {t('softLanding.form.transitionTouch')}
          </Text>
        </Pressable>

        <Pressable accessibilityRole="button" onPress={handleSave} style={saveStyle}>
          <Text
            style={{
              color: theme.colors.onAccent,
              fontSize: theme.typography.scale.body,
              fontWeight: '600',
            }}
          >
            {t('softLanding.form.save')}
          </Text>
        </Pressable>

        {unavailable && <Text style={quietStyle}>{t('softLanding.form.unavailable')}</Text>}

        {upcoming.length > 0 && (
          <View style={{ gap: theme.spacing.sm }}>
            <Text style={sectionHeadingStyle}>{t('softLanding.list.heading')}</Text>
            {upcoming.map((landing) => (
              <View key={landing.id} style={rowStyle}>
                <View style={styles.landingRowText}>
                  <Text style={bodyStyle} numberOfLines={2}>
                    {landing.activityLabel}
                  </Text>
                  <Text style={quietStyle}>
                    {t('softLanding.list.when', {
                      time: formatClock(landing.activityAt),
                      minutes: landing.leadMinutes,
                    })}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => handleRemove(landing)}
                  style={styles.tapTarget}
                >
                  <Text style={quietStyle}>{t('softLanding.list.remove')}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapTarget: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savePill: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  landingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  landingRowText: {
    flex: 1,
    gap: 4,
  },
});
