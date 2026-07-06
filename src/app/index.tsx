/**
 * Home-hub screen (D-03, D-04, DUMP-05, PILOT-06, D-11).
 *
 * The mascot's habitat: the real <Mascot />, greeting once per cold launch
 * then resting in idle (MASC-01, D-07), a primary "Start a session?" offer
 * (offer grammar — never a command), a prominent secondary Brain dump entry
 * reachable directly from home, and navigation to Starter, History, and
 * Settings. No tab bar (D-03).
 *
 * When a live Co-pilot session pointer exists (D-11), a warm resume card
 * REPLACES the primary offer (UI-SPEC Flag 3) — continuity language only,
 * never "interrupted"/"paused"/"you left". Resume re-enters the session;
 * "Not now" silently ends it at lastAliveAt with zero confirmation/comment.
 */
import { useCallback, useRef, useState } from 'react';
import { Link, Redirect, useFocusEffect, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { Mascot } from '@/components/Mascot/Mascot';
import type { MascotState } from '@/components/Mascot/types';
import { reconcileActiveSession } from '@/features/co-pilot/reconcileActiveSession';
import { useTheme } from '../../theme';
import { useSettingsStore } from '../../data/stores/useSettingsStore';
import { activeSessionRepo } from '../../data/repositories/activeSession';
import { useRepoVersion } from '../../data/repoBus';
import { sessionsRepo } from '../../data/repositories/sessions';
import { STALE_THRESHOLD_MS } from './_layout';

// D-07: greeting cadence lives in a plain module-level, in-memory flag —
// NEVER persisted (no settingsRepo/useSettingsStore write, no
// lastGreetedAt/greetedAt field anywhere). This resets on cold app launch
// (fresh JS module evaluation) and stays true for the remainder of the app
// session, so the mascot greets once per cold launch then rests in idle.
let hasGreetedThisSession = false;

export default function HomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();

  const [mascotState, setMascotState] = useState<MascotState>(() =>
    hasGreetedThisSession ? 'idle' : 'greeting'
  );
  // Reactive subscription (WR-02), not a one-time settingsRepo.get() snapshot
  // — Home must re-render when mascotProminence changes elsewhere (Phase 8
  // Settings screen).
  const mascotProminence = useSettingsStore((s) => s.mascotProminence);
  // ONBD-01 first-run gate — declared here with the other hooks; the actual
  // <Redirect /> return sits below, after every hook has run (rules of hooks).
  const onboardingComplete = useSettingsStore((s) => s.onboardingComplete);

  const handleMascotGreetingComplete = () => {
    hasGreetedThisSession = true;
    setMascotState('idle');
  };

  // D-01/PILOT-01: Home no longer eagerly creates a Session (Phase 1
  // walking-skeleton behavior, now wrong — see 03-RESEARCH.md Pitfall 4).
  // The setup screen at /co-pilot owns all three entry paths and creates a
  // Session only once the user actually commits to one of them; this offer
  // is plain navigation. If a session is already live (D-16), co-pilot.tsx's
  // own flowPhase initializer resumes it rather than starting a new one —
  // Home does not need to special-case that here.
  //
  // isStartingSessionRef guards against a rapid double-press firing two
  // navigations for one user intent (WR-04) — touch UI double-taps are
  // common, and more so with this app's target ADHD-adjacent user
  // population. CR-01: Home stays mounted beneath a pushed /co-pilot screen
  // (Expo Router's Stack does not unmount a screen a route is pushed on top
  // of) — popping back reveals this exact HomeScreen instance, not a fresh
  // one, so a ref that only ever latches to `true` would permanently
  // dead-tap this offer the moment a user opens the setup screen and
  // changes their mind. This ref (and isResumeCardActionRef below) is reset
  // on every focus by the useFocusEffect further down, so a real
  // return-from-navigation restores the offer while a rapid double-tap
  // within a single visit is still blocked (both taps land before the
  // screen ever blurs).
  const isStartingSessionRef = useRef(false);
  const handleStartSession = () => {
    if (isStartingSessionRef.current) return;
    isStartingSessionRef.current = true;
    router.push('/co-pilot');
  };

  // D-11/D-16: once "Not now" has silently ended the session on this Home
  // instance, treat the pointer as gone for the rest of this mount without
  // re-reading MMKV — this is what forces Home to re-render showing the
  // normal primary offer (activeSessionRepo.read() alone, called directly in
  // the render body below, would never by itself trigger a re-render).
  const [dismissedActiveSession, setDismissedActiveSession] = useState(false);
  // A lazy useState initializer, never a bare Date.now() call in the render
  // body itself (react-hooks/purity — mirrors history.tsx's SessionRow
  // nowFallback precedent). A value frozen at mount is correct here: this
  // only gates a one-time "should I show a resume card" render decision, not
  // a live-ticking display.
  const [nowAtMount] = useState(() => Date.now());

  // D-11: read the pointer fresh on every render (mirrors co-pilot.tsx's
  // SetupPhase dumpItemsRepo.list()-in-render-body precedent), then
  // independently re-verify liveness via the exact same pure
  // reconcileActiveSession gate _layout.tsx's boot sweep uses — not just
  // "does a pointer exist". This is required, not just extra caution:
  // React always fully renders and commits a component before any effect in
  // the tree fires, so Home's very first render is guaranteed to happen
  // before useReconcileActiveSession's effect has run, and that effect
  // performs its write via plain MMKV calls (no React state), so it never
  // triggers a Home re-render on its own. Trusting pointer-existence alone
  // would risk showing a resume card for a session this same boot is about
  // to silently close — a direct violation of D-12's "no mention anywhere".
  // repoBus subscription: re-render when the pointer starts/clears elsewhere
  // (heartbeats deliberately don't notify — see activeSessionRepo).
  useRepoVersion('activeSession');
  const pointer = dismissedActiveSession ? undefined : activeSessionRepo.read();
  const showResumeCard =
    pointer !== undefined &&
    reconcileActiveSession(pointer, nowAtMount, STALE_THRESHOLD_MS).kind === 'keep-live';

  // T-03-05: shared guard across Resume and Not now — they are mutually
  // exclusive alternatives on the same live-pointer card, so at most one of
  // {a second Resume push, a second Not-now write+clear} may ever fire for a
  // single rapid multi-tap. Distinct from isStartingSessionRef, which guards
  // the unrelated primary offer that only ever renders when this card does not.
  // CR-02: same never-resets hazard as isStartingSessionRef — pressing
  // Resume and then backing out of the still-live session (without ending
  // it) re-reveals this same Home instance with both Resume and Not now
  // permanently dead. Reset on every focus, see useFocusEffect below.
  const isResumeCardActionRef = useRef(false);
  const handleResume = () => {
    if (isResumeCardActionRef.current) return;
    isResumeCardActionRef.current = true;
    router.push('/co-pilot'); // co-pilot.tsx reads the pointer on mount and
    // resumes the active phase directly (D-16) — no new session created.
  };

  // D-11: silently ends the session at lastAliveAt — the same honest
  // best-effort bound the D-12 boot sweep itself uses — with zero
  // confirmation, toast, or comment. Home then re-renders the normal
  // primary offer.
  const handleNotNow = () => {
    if (isResumeCardActionRef.current || !pointer) return;
    isResumeCardActionRef.current = true;
    sessionsRepo.update(pointer.sessionId, { endedAt: pointer.lastAliveAt });
    activeSessionRepo.clear();
    setDismissedActiveSession(true);
  };

  // CR-01/CR-02: reset both "already-acted" guards every time Home regains
  // focus (e.g. after backing out of a pushed /co-pilot without completing
  // or resuming a session) — useFocusEffect's re-run-on-focus cadence is
  // exactly the right primitive here, since Home never unmounts across a
  // push/pop. dismissedActiveSession is deliberately NOT reset here — it
  // only suppresses the pointer for the remainder of this Home mount after
  // an explicit "Not now", which is a separate concern from these two
  // double-tap guards.
  useFocusEffect(
    useCallback(() => {
      isStartingSessionRef.current = false;
      isResumeCardActionRef.current = false;
    }, [])
  );

  // ONBD-01: a brand-new install routes to onboarding first (3 skippable
  // screens, no permission asks). All hooks above have already run, so this
  // early return is rules-of-hooks-safe. Both finishing and skipping set the
  // one-way flag — Home never bounces a returning user back here.
  if (!onboardingComplete) {
    return <Redirect href="/onboarding" />;
  }

  // Every style below is flattened to a single object (never an array) —
  // expo-router's internal <Slot> shim throws when a route's root child (or
  // a <Link asChild> child) receives an array `style` prop (see
  // node_modules/expo-router/build/ui/Slot.js).
  const titleStyle = StyleSheet.flatten([
    styles.title,
    { color: theme.colors.textPrimary, fontSize: theme.typography.scale.display },
  ]);
  const primaryOfferStyle = StyleSheet.flatten([
    styles.primaryOffer,
    { backgroundColor: theme.colors.accent, borderRadius: theme.radii.pill },
  ]);
  const primaryOfferLabelStyle = StyleSheet.flatten([
    styles.primaryOfferLabel,
    { color: theme.colors.background, fontSize: theme.typography.scale.title },
  ]);
  const secondaryOfferStyle = StyleSheet.flatten([
    styles.secondaryOffer,
    { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radii.md },
  ]);
  const linkRowStyle = StyleSheet.flatten([styles.linkRow, { gap: theme.spacing.lg }]);
  const resumeCardStyle = StyleSheet.flatten([
    styles.resumeCard,
    { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radii.lg },
  ]);
  const resumeCardKickerStyle = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.scale.caption,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.2,
  };
  const resumeCardBodyStyle = {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.scale.body,
  };
  const notNowLabelStyle = {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.scale.body,
    textAlign: 'center' as const,
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: theme.spacing.lg }}>
        <Mascot
          state={mascotState}
          prominence={mascotProminence}
          accessibilityLabel={t(`mascot.accessibility.${mascotState}`)}
          onStateAnimationComplete={handleMascotGreetingComplete}
        />

        <Text style={titleStyle}>{t('home.title')}</Text>

        {showResumeCard && pointer ? (
          <View style={resumeCardStyle}>
            <Text style={resumeCardKickerStyle}>{t('home.resumeCard.kicker')}</Text>
            <Text style={resumeCardBodyStyle}>
              {pointer.taskLabel
                ? t('home.resumeCard.withLabel', { taskLabel: pointer.taskLabel })
                : t('home.resumeCard.withoutLabel')}
            </Text>
            <Pressable accessibilityRole="button" onPress={handleResume} style={primaryOfferStyle}>
              <Text style={primaryOfferLabelStyle}>{t('home.resumeCard.resume')}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={handleNotNow} style={styles.notNowButton}>
              <Text style={notNowLabelStyle}>{t('home.resumeCard.notNow')}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={handleStartSession} style={primaryOfferStyle}>
            <Text style={primaryOfferLabelStyle}>{t('home.startSessionOffer')}</Text>
          </Pressable>
        )}

        <Link href="/brain-dump" asChild>
          <Pressable accessibilityRole="button" style={secondaryOfferStyle}>
            <Text style={{ color: theme.colors.textPrimary, fontSize: theme.typography.scale.body }}>
              {t('home.brainDumpOffer')}
            </Text>
          </Pressable>
        </Link>

        <View style={linkRowStyle}>
          <Link href="/starter">
            <Text style={{ color: theme.colors.accent }}>{t('home.starterLink')}</Text>
          </Link>
          <Link href="/bridge">
            <Text style={{ color: theme.colors.accent }}>{t('home.bridgeLink')}</Text>
          </Link>
          <Link href="/soft-landing">
            <Text style={{ color: theme.colors.accent }}>{t('home.softLandingLink')}</Text>
          </Link>
          <Link href="/history">
            <Text style={{ color: theme.colors.accent }}>{t('home.historyLink')}</Text>
          </Link>
          <Link href="/settings">
            <Text style={{ color: theme.colors.accent }}>{t('home.settingsLink')}</Text>
          </Link>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontWeight: '600',
  },
  primaryOffer: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  primaryOfferLabel: {
    textAlign: 'center',
    fontWeight: '600',
  },
  secondaryOffer: {
    padding: 16,
  },
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  resumeCard: {
    padding: 16,
    gap: 8,
  },
  notNowButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
});
