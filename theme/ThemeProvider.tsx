import React, { createContext, type PropsWithChildren } from 'react';

import { darkTokens, type ThemeTokens } from './tokens';

/**
 * A custom React context provider — deliberately NOT React Navigation's
 * `ThemeProvider`/`DarkTheme` (see 01-RESEARCH.md Alternatives Considered).
 * Trinket is dark-mode-only at MVP, so there is no runtime light/dark switch
 * to delegate to a navigation-library theme system; a project-owned provider
 * keeps D-02's "token-file swap" contract simple and self-contained.
 */
export const ThemeContext = createContext<ThemeTokens>(darkTokens);

export function ThemeProvider({ children }: PropsWithChildren) {
  return <ThemeContext.Provider value={darkTokens}>{children}</ThemeContext.Provider>;
}
