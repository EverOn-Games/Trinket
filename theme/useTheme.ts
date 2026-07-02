import { useContext } from 'react';

import { ThemeContext } from './ThemeProvider';
import type { ThemeTokens } from './tokens';

/**
 * The only sanctioned way for components to read theme values (D-02).
 * Never import `theme/tokens.ts` directly from component code, and never
 * inline hex literals — both are caught by `scripts/check-hex-literals.mjs`.
 */
export function useTheme(): ThemeTokens {
  return useContext(ThemeContext);
}
