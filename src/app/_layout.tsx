/**
 * Root layout (FND-04, FND-05, D-03, D-07, D-08).
 *
 * Mounts the two cross-cutting providers every screen depends on:
 * - i18n: imported for its module-level side-effect `i18n.init()` (i18n/index.ts)
 *   so translations are ready before any screen renders.
 * - theme/ThemeProvider: the project's own context provider (NOT expo-router's
 *   ThemeProvider/DarkTheme — Trinket is dark-mode-only at MVP, see
 *   theme/ThemeProvider.tsx's docstring).
 *
 * Also persists the device-resolved initial locale into the settings store the
 * first time the app ever boots (D-07), and re-applies a previously persisted
 * locale on subsequent boots so a future runtime-switch control (D-08, Phase 8)
 * survives restarts.
 *
 * Renders a plain Expo Router `Stack`, not a tab bar (D-03) — Co-pilot is the
 * primary home action; a tab bar would flatten that hierarchy.
 */
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import i18n, { resolveInitialLocale } from '../../i18n';
import { ThemeProvider, useTheme } from '../../theme';
import { useSettingsStore } from '../../data/stores/useSettingsStore';

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

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedStack />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
