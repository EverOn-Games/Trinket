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
 * first time the app ever boots (D-07), re-applies a previously persisted locale
 * on subsequent boots, and writes through any runtime language change (e.g. from
 * the Phase 8 settings screen's D-08 control) back into the settings store so it
 * survives the next restart (WR-02).
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

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedStack />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
