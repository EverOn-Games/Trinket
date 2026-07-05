/**
 * Root layout (FND-04, FND-05, D-03, D-07, D-08, PILOT-06, D-11, D-12).
 *
 * Mounts the two cross-cutting providers every screen depends on:
 * - i18n: imported for its module-level side-effect `i18n.init()` (i18n/index.ts)
 *   so translations are ready before any screen renders.
 * - theme/ThemeProvider: the project's own context provider (NOT expo-router's
 *   ThemeProvider/DarkTheme — Trinket is dark-mode-only at MVP, see
 *   theme/ThemeProvider.tsx's docstring).
 *
 * Also persists the device-resolved initial locale into the settings store the
 * first time the app ever boots (D-07), re-applies a previously persisted locale
 * on subsequent boots, and writes through any runtime language change (e.g. from
 * the Phase 8 settings screen's D-08 control) back into the settings store so it
 * survives the next restart (WR-02).
 *
 * Also runs a silent cold-launch reconciliation sweep for any Co-pilot session
 * left open across a force-quit/OS-kill (D-12): a still-live session is left
 * untouched for Home to surface as a resume offer, while a stale one is closed
 * with `endedAt = lastAliveAt` and no mention anywhere (PILOT-06's "zero
 * mention"), before folding into History as an ordinary completed row.
 *
 * Renders a plain Expo Router `Stack`, not a tab bar (D-03) — Co-pilot is the
 * primary home action; a tab bar would flatten that hierarchy.
 */
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

import i18n, { resolveInitialLocale } from '../../i18n';
import { ThemeProvider, useTheme } from '../../theme';
import { useSettingsStore } from '../../data/stores/useSettingsStore';
import { activeSessionRepo } from '../../data/repositories/activeSession';
import { sessionsRepo } from '../../data/repositories/sessions';
import { reconcileActiveSession } from '../features/co-pilot/reconcileActiveSession';
import { track } from '../analytics/analytics';
import { initPostHogTransport } from '../analytics/posthog';
import { configurePurchases } from '../features/subscription/purchases';

// Foreground presentation for the Starter's quiet reminders (device UAT
// 2026-07-05: a reminder that fired while the app was open displayed NOTHING
// — expo-notifications drops foreground notifications unless a handler is
// registered). Quiet by design: a banner, no sound, no badge — the reminder
// is the user's own words appearing, never an interruption soundscape.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// ANLY-02: one app_opened per cold launch (module-level flag, same in-memory
// cadence pattern as Home's greeting flag — never persisted). With no
// transport wired (no PostHog key yet) track() is a guaranteed no-op, so
// this instrumentation ships inert and lights up only when the key lands.
let hasTrackedColdLaunch = false;
function useTrackAppOpened(): void {
  useEffect(() => {
    if (!hasTrackedColdLaunch) {
      hasTrackedColdLaunch = true;
      track('app_opened', { coldLaunch: true });
    }
  }, []);
}

// Env-gated native integrations, attached once at startup (both no-ops with no
// key): PostHog EU becomes the analytics transport (before app_opened fires, so
// the first cold-launch event is captured when a key exists), and RevenueCat is
// configured + its live pricing warmed. Neither ever throws — a purchases or
// analytics init failure must never break boot (offline posture / MONEY-03).
function useStartupIntegrations(): void {
  useEffect(() => {
    initPostHogTransport();
    void configurePurchases();
  }, []);
}

function usePersistResolvedLocale(): void {
  useEffect(() => {
    // WR-01: first-boot detection uses the store's explicit `localeResolved`
    // flag, not inferred key existence in settingsStorage (a pre-mount write of
    // any other settings field — e.g. Phase 7's subscriptionCache — used to
    // silently flip this sentinel and force-revert the language).
    const { locale, localeResolved } = useSettingsStore.getState();

    if (!localeResolved) {
      useSettingsStore.getState().setLocale(resolveInitialLocale());
      return;
    }

    if (locale !== i18n.language) {
      void i18n.changeLanguage(locale);
    }
  }, []);
}

// WR-02: the write-through half of the locale-persistence seam. useLocale's
// setLocale only calls i18n.changeLanguage — it never wrote to the settings
// store, so a runtime language change (from the Phase 8 settings screen's D-08
// control) was silently reverted by usePersistResolvedLocale on the next boot.
// Subscribing to i18next's `languageChanged` event here closes that seam: every
// change, whoever triggers it, gets written back to the store. Calling
// setLocale() also marks `localeResolved: true` (see useSettingsStore.ts),
// which is a no-op once boot-time resolution has already happened.
function usePersistLocaleOnChange(): void {
  useEffect(() => {
    const onLanguageChanged = (lng: string) => {
      useSettingsStore.getState().setLocale(lng === 'pl' ? 'pl' : 'en');
    };
    i18n.on('languageChanged', onLanguageChanged);
    return () => i18n.off('languageChanged', onLanguageChanged);
  }, []);
}

// D-11 (amended): 12h — the midpoint of CONTEXT.md's 8-24h discretion band,
// the exact value Plan 03-01 fixed (see 03-01-SUMMARY.md's "Discretion
// constants fixed" decision). Gated on lastAliveAt, NOT startedAt
// (RESEARCH.md Pitfall 3 / Open Question 1) inside reconcileActiveSession
// itself — a long genuinely-live session isn't silently closed just because
// it started long ago. Exported so src/app/index.tsx's resume card can
// independently re-verify liveness with the exact same threshold (see that
// file for why: Home's own first render always happens before this file's
// reconciliation effect below has had a chance to run — React commits a
// component's render before any effect in the tree fires — so Home cannot
// simply trust "a pointer exists" without risking a flash of a resume card
// for a session this sweep is about to close).
export const STALE_THRESHOLD_MS = 12 * 60 * 60 * 1000;

// D-12: silent cold-launch reconciliation sweep, mounted once at boot.
// Mirrors usePersistResolvedLocale's mount-once useEffect(() => {...}, [])
// shape above, but delegates the actual keep-live/reconcile-stale decision
// entirely to the pure reconcileActiveSession function (Plan 03-01) instead
// of inlining conditionals here — that split is what keeps the decision
// itself unit-testable with zero MMKV/React mocks (see
// src/features/co-pilot/__tests__/reconcileActiveSession.test.ts).
//
// activeSessionRepo.read() already tolerates a corrupted/malformed pointer
// by returning undefined (T-03-01), which reconcileActiveSession treats as
// `{ kind: 'none' }` — a safe no-op that can never crash this boot sweep.
// 'keep-live' also needs no action here: Home reads the pointer itself (and
// re-verifies liveness the same way, see src/app/index.tsx) to decide
// whether to render the D-11 resume card.
function useReconcileActiveSession(): void {
  useEffect(() => {
    const pointer = activeSessionRepo.read();
    const action = reconcileActiveSession(pointer, Date.now(), STALE_THRESHOLD_MS);
    if (action.kind === 'reconcile-stale' && pointer) {
      sessionsRepo.update(pointer.sessionId, { endedAt: action.endedAt });
      activeSessionRepo.clear();
    }
  }, []);
}

function ThemedStack() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.textPrimary,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}

export default function RootLayout() {
  usePersistResolvedLocale();
  usePersistLocaleOnChange();
  useReconcileActiveSession();
  // Attach the analytics transport before app_opened fires (effects run in
  // declaration order, so this precedes useTrackAppOpened below).
  useStartupIntegrations();
  useTrackAppOpened();

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedStack />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
