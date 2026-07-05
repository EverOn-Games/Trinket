/**
 * Onboarding (ONBD-01): at most 3 screens — what Trinket is, pick your first
 * task, meet the mascot — skippable from EVERY step, with zero permission
 * requests anywhere (notification permission is asked contextually in
 * Starter, mic permission in Brain dump — never here).
 *
 * The optional first task becomes an inert dump item (no due date, no
 * reminder) and the user lands on Home with the mascot and the session offer
 * visible — the app's first-ever act is an offer, never a demand (PDA
 * grammar; the "straight into a session" variant was deliberately rejected
 * as pressure at the very first moment).
 *
 * Skipping and finishing are equally valid exits: both set the same one-way
 * onboardingComplete flag. Nothing is tracked about WHERE the user exited.
 */
import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { Mascot } from '@/components/Mascot/Mascot';
import { classify } from '@/features/brain-dump/classify';
import { useTheme } from '../../theme';
import { dumpItemsRepo } from '../../data/repositories/dumpItems';
import { useSettingsStore } from '../../data/stores/useSettingsStore';
import { track } from '../analytics/analytics';

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const locale = useSettingsStore((s) => s.locale);
  const setOnboardingComplete = useSettingsStore((s) => s.setOnboardingComplete);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [firstTaskText, setFirstTaskText] = useState('');
  const [firstTaskCreated, setFirstTaskCreated] = useState(false);

  // BLITZ-REVIEW: single-fire latches — a double-tap on Skip/Done must not
  // double-track or double-navigate, and a double-tap on the step-2 button
  // must not create the first task twice. Plain latches are safe: this
  // screen is replace()'d away and never revisited.
  const isFinishingRef = useRef(false);
  const hasHandledFirstTaskRef = useRef(false);

  const finish = (skipped: boolean) => {
    if (isFinishingRef.current) return;
    isFinishingRef.current = true;
    setOnboardingComplete();
    // Structural funnel datum only (ANLY-02): which exit + whether a first
    // task exists — never the task itself.
    track('onboarding_completed', { skipped, firstTaskCreated });
    router.replace('/');
  };

  // Step 2 → 3: a non-empty task becomes ONE inert dump item (D-15-style:
  // it just sits in Brain dump, promotable later). Empty is equally fine —
  // "Nothing right now" is a first-class answer, not a fallback.
  const handleFirstTask = () => {
    if (hasHandledFirstTaskRef.current) return;
    hasHandledFirstTaskRef.current = true;
    const trimmed = firstTaskText.trim();
    if (trimmed.length > 0) {
      dumpItemsRepo.create({ text: trimmed, category: classify(trimmed, locale) });
      setFirstTaskCreated(true);
    }
    setStep(3);
  };

  const titleStyle = StyleSheet.flatten([
    styles.title,
    { color: theme.colors.textPrimary, fontSize: theme.typography.scale.display },
  ]);
  const bodyStyle = {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.scale.body,
    lineHeight: theme.typography.scale.body * 1.5,
  };
  const quietStyle = {
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
  const primaryStyle = StyleSheet.flatten([
    styles.tapTarget,
    styles.primaryPill,
    { backgroundColor: theme.colors.accent, borderRadius: theme.radii.pill },
  ]);
  const primaryLabelStyle = {
    color: theme.colors.background,
    fontSize: theme.typography.scale.body,
    fontWeight: '600' as const,
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: theme.spacing.lg }}>
        {/* ONBD-01: skippable from any screen — always visible, always quiet. */}
        <Pressable accessibilityRole="button" onPress={() => finish(true)} style={styles.skip}>
          <Text style={quietStyle}>{t('onboarding.skip')}</Text>
        </Pressable>

        {step === 1 && (
          <View style={{ gap: theme.spacing.md }}>
            <Mascot
              state="greeting"
              prominence="prominent"
              accessibilityLabel={t('mascot.accessibility.greeting')}
            />
            <Text style={titleStyle}>{t('onboarding.step1.title')}</Text>
            <Text style={bodyStyle}>{t('onboarding.step1.body')}</Text>
            <Text style={quietStyle}>{t('onboarding.step1.disclaimer')}</Text>
            <Pressable accessibilityRole="button" onPress={() => setStep(2)} style={primaryStyle}>
              <Text style={primaryLabelStyle}>{t('onboarding.step1.begin')}</Text>
            </Pressable>
          </View>
        )}

        {step === 2 && (
          <View style={{ gap: theme.spacing.md }}>
            <Text style={titleStyle}>{t('onboarding.step2.heading')}</Text>
            <Text style={bodyStyle}>{t('onboarding.step2.subcopy')}</Text>
            <TextInput
              value={firstTaskText}
              onChangeText={setFirstTaskText}
              placeholder={t('onboarding.step2.placeholder')}
              placeholderTextColor={theme.colors.textSecondary}
              style={inputStyle}
            />
            <Pressable accessibilityRole="button" onPress={handleFirstTask} style={primaryStyle}>
              <Text style={primaryLabelStyle}>
                {firstTaskText.trim().length > 0
                  ? t('onboarding.step2.next')
                  : t('onboarding.step2.nextEmpty')}
              </Text>
            </Pressable>
          </View>
        )}

        {step === 3 && (
          <View style={{ gap: theme.spacing.md }}>
            <Mascot
              state="idle"
              prominence="prominent"
              accessibilityLabel={t('mascot.accessibility.idle')}
            />
            <Text style={titleStyle}>{t('onboarding.step3.heading')}</Text>
            <Text style={bodyStyle}>{t('onboarding.step3.body')}</Text>
            <Pressable accessibilityRole="button" onPress={() => finish(false)} style={primaryStyle}>
              <Text style={primaryLabelStyle}>{t('onboarding.step3.done')}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontWeight: '600',
  },
  skip: {
    alignSelf: 'flex-end',
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
});
