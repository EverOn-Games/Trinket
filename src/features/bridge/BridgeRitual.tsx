/**
 * BridgeRitual (MECH-02, v0.2 spec §4) — the short optional ritual easing the
 * gap between finishing one thing and starting the next (Wakelin et al. 2022,
 * self-compassion). Two user-paced steps, nothing auto-advances (D-13):
 *
 * 1. "landing": the companion in presence state (its breath-glow loop IS the
 *    breathing beat — shown, never commanded; no imperative copy exists
 *    here), plus one self-compassion line from the fixed localized library
 *    (i18n/locales = the version-controlled library the spec asks for),
 *    picked at mount so it rotates without any persistence.
 * 2. "handoff": a quiet tiny-first-action framing plus the spec's triad —
 *    up to 3 un-promoted brain-dump items (newest first) to bridge into a
 *    session, "set up a starter", or "just close". Every exit is equal.
 *
 * Constraint watch (spec §4): nothing here is persisted — no bridge history,
 * no completed flag, no counter. The ritual is available when wanted and
 * invisible when not. Both hosts (the post-session co-pilot beat and the
 * standalone /bridge route) render this same component; only the handoff
 * callbacks differ.
 */
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Mascot } from '@/components/Mascot/Mascot';
import { useTheme } from '../../../theme';
import { dumpItemsRepo } from '../../../data/repositories/dumpItems';
import type { DumpItem } from '../../../data/types';

const COMPASSION_LINE_COUNT = 5;
const MAX_HANDOFF_ITEMS = 3;

export function BridgeRitual({
  onPickItem,
  onStarter,
  onClose,
}: {
  onPickItem: (item: DumpItem) => void;
  onStarter: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  const [step, setStep] = useState<'landing' | 'handoff'>('landing');

  // Lazy initializers (react-hooks/purity — the nowAtMount precedent): the
  // compassion line rotates per encounter with zero persistence, and the
  // item list is snapshotted once so it can't shift mid-ritual.
  const [lineKey] = useState(
    () => `bridge.lines.l${1 + Math.floor(Math.random() * COMPASSION_LINE_COUNT)}`
  );
  const [items] = useState<DumpItem[]>(() =>
    dumpItemsRepo
      .list()
      .filter((item) => item.promotedTaskId === undefined)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, MAX_HANDOFF_ITEMS)
  );

  // Single-fire guard for the two navigation exits (starter/close). Item
  // taps deliberately stay re-tappable: a gated tap opens the paywall as an
  // offer and starts nothing — "Not now" must return to a live handoff.
  const isLeavingRef = useRef(false);
  const leaveWith = (exit: () => void) => {
    if (isLeavingRef.current) return;
    isLeavingRef.current = true;
    exit();
  };

  const headingStyle = {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.scale.title,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  };
  const lineStyle = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.scale.body,
    lineHeight: theme.typography.scale.body * 1.6,
    textAlign: 'center' as const,
  };
  const continueStyle = StyleSheet.flatten([
    styles.tapTarget,
    styles.pill,
    { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radii.pill },
  ]);
  const continueLabelStyle = {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.scale.body,
    fontWeight: '600' as const,
  };
  const itemButtonStyle = StyleSheet.flatten([
    styles.tapTarget,
    styles.itemButton,
    { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radii.lg },
  ]);
  const itemLabelStyle = {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.scale.body,
  };
  const quietExitStyle = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.scale.body,
  };

  if (step === 'landing') {
    return (
      <View style={StyleSheet.flatten([styles.container, { gap: theme.spacing.lg }])}>
        <Mascot
          state="presence"
          prominence="prominent"
          accessibilityLabel={t('mascot.accessibility.presence')}
        />
        <Text style={headingStyle}>{t('bridge.ritual.landing')}</Text>
        <Text style={lineStyle}>{t(lineKey)}</Text>
        <Pressable accessibilityRole="button" onPress={() => setStep('handoff')} style={continueStyle}>
          <Text style={continueLabelStyle}>{t('bridge.ritual.continue')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={StyleSheet.flatten([styles.container, { gap: theme.spacing.lg }])}>
      <Mascot
        state="idle"
        prominence="subtle"
        accessibilityLabel={t('mascot.accessibility.idle')}
      />
      <Text style={headingStyle}>{t('bridge.handoff.heading')}</Text>
      <Text style={lineStyle}>{t('bridge.handoff.framing')}</Text>

      {items.length > 0 && (
        <View style={{ gap: theme.spacing.sm, alignSelf: 'stretch' }}>
          {items.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => onPickItem(item)}
              style={itemButtonStyle}
            >
              <Text style={itemLabelStyle} numberOfLines={2}>
                {item.text}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        onPress={() => leaveWith(onStarter)}
        style={styles.tapTarget}
      >
        <Text style={{ color: theme.colors.accent, fontSize: theme.typography.scale.body }}>
          {t('bridge.handoff.starter')}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => leaveWith(onClose)}
        style={styles.tapTarget}
      >
        <Text style={quietExitStyle}>{t('bridge.handoff.close')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapTarget: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  itemButton: {
    alignSelf: 'stretch',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
  },
});
