import React, { createContext, type PropsWithChildren } from 'react';
import { useColorScheme, type ColorSchemeName } from 'react-native';

import { darkTokens, lightTokens, type ThemeTokens } from './tokens';
import { useSettingsStore } from '../data/stores/useSettingsStore';

/**
 * A custom React context provider — deliberately NOT React Navigation's
 * `ThemeProvider`/`DarkTheme` (see 01-RESEARCH.md Alternatives Considered).
 *
 * POLI-01 (v0.2 §5): the provider resolves the active token set from the
 * user's appearance override (Settings → System/Light/Dark, persisted in the
 * settings store) and the OS appearance. 'system' follows the OS; when the
 * OS expresses no preference (useColorScheme() null), dark remains the brand
 * default. The light set is deliberately authored (Option B), never an
 * inversion — see tokens.ts.
 */
export const ThemeContext = createContext<ThemeTokens>(darkTokens);

export function resolveThemeTokens(
  override: 'system' | 'light' | 'dark',
  systemScheme: ColorSchemeName | null | undefined
): ThemeTokens {
  // Only an explicit OS 'light' resolves light; null/undefined/'unspecified'
  // all fall back to dark, the brand default.
  const resolved = override === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : override;
  return resolved === 'light' ? lightTokens : darkTokens;
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const tokens = resolveThemeTokens(themeMode, systemScheme);
  return <ThemeContext.Provider value={tokens}>{children}</ThemeContext.Provider>;
}
