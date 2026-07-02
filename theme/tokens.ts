/**
 * Trinket theme tokens (D-01, D-02, FND-04).
 *
 * A single typed `ThemeTokens` shape holds every visual value used across the
 * app — colors, spacing, radii, typography, and elevation. Components must
 * consume these values only through `useTheme()` (see `useTheme.ts`); never
 * import this module directly, and never inline hex literals in component
 * code (enforced by `scripts/check-hex-literals.mjs`).
 *
 * The Claude Design system landed 2026-07-02: `darkTokens.colors` now carries
 * the real brand values sourced from the founder's 10-screen mockups (warm
 * espresso background, terracotta action accent). See `design/DESIGN-SYSTEM.md`
 * for the full palette, typography stack, per-screen notes, and constraint
 * watch-items. Light mode is still deferred (POLI-01) — see that doc's
 * cream/light palette section, which is reference-only and not implemented.
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
 * Earthy, night-cozy, dark-only landed brand palette (Claude Design system,
 * 2026-07-02). Warm espresso background, warm-brown surfaces, cream text,
 * terracotta action accent — the mascot's habitat, not a neutral scaffold.
 * Soft rounded radii and generous spacing per the written visual direction.
 */
export const darkTokens: ThemeTokens = {
  colors: {
    background: '#1A140E',
    surface: '#231C15',
    surfaceElevated: '#2E251C',
    textPrimary: '#F2E6CC',
    textSecondary: '#A89A82',
    accent: '#D67A56',
    accentMuted: '#B8763F',
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
