/**
 * Trinket theme tokens (D-01, D-02, FND-04).
 *
 * A single typed `ThemeTokens` shape holds every visual value used across the
 * app — colors, spacing, radii, typography, and elevation. Components must
 * consume these values only through `useTheme()` (see `useTheme.ts`); never
 * import this module directly, and never inline hex literals in component
 * code (enforced by `scripts/check-hex-literals.mjs`).
 *
 * `darkTokens` is a genuine first attempt at the "calm night-shift raccoon
 * habitat" visual direction (soft rounded shapes, earthy palette, night-cozy
 * atmosphere) — not a neutral gray placeholder. These are Claude's-discretion
 * anchor values (per 01-CONTEXT.md) that will be replaced wholesale, as a
 * single token-file swap, when the external Claude Design system lands.
 *
 * The type intentionally avoids any `dark`-prefixed keys so a future
 * `lightTokens: ThemeTokens` can be authored against the same shape without a
 * type refactor (deferred POLI-01 — light mode is out of scope for MVP).
 */

export type ThemeTokens = {
  colors: {
    background: string;
    surface: string;
    surfaceElevated: string;
    textPrimary: string;
    textSecondary: string;
    accent: string;
    accentMuted: string;
    border: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  radii: {
    sm: number;
    md: number;
    lg: number;
    pill: number;
  };
  typography: {
    fontFamily: string;
    scale: {
      caption: number;
      body: number;
      title: number;
      display: number;
    };
  };
  elevation: {
    none: number;
    low: number;
    medium: number;
  };
};

/**
 * Earthy, night-cozy, dark-only anchor palette. Deep warm near-black
 * background, warm-brown surfaces, cream text, warm-amber accent — the
 * mascot's habitat, not a neutral scaffold. Soft rounded radii and generous
 * spacing per the written visual direction.
 */
export const darkTokens: ThemeTokens = {
  colors: {
    background: '#14120F',
    surface: '#1F1B16',
    surfaceElevated: '#2A241D',
    textPrimary: '#F2E9DC',
    textSecondary: '#B8AC97',
    accent: '#D89B4A',
    accentMuted: '#8C6B3A',
    border: '#3A3229',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radii: {
    sm: 8,
    md: 16,
    lg: 24,
    pill: 999,
  },
  typography: {
    fontFamily: 'System',
    scale: {
      caption: 12,
      body: 16,
      title: 20,
      display: 28,
    },
  },
  elevation: {
    none: 0,
    low: 2,
    medium: 6,
  },
};
