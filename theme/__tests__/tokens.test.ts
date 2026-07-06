import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { darkTokens, lightTokens } from '../tokens';
import { ThemeProvider, resolveThemeTokens } from '../ThemeProvider';
import { useTheme } from '../useTheme';
import { useSettingsStore } from '../../data/stores/useSettingsStore';

const HEX_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;

const REQUIRED_COLOR_KEYS = [
  'background',
  'surface',
  'surfaceElevated',
  'textPrimary',
  'textSecondary',
  'accent',
  'accentMuted',
  'border',
  'mascotGlow',
] as const;

describe('theme/tokens', () => {
  it.each(REQUIRED_COLOR_KEYS)('darkTokens.colors.%s is a valid hex color', (key) => {
    expect(darkTokens.colors[key]).toMatch(HEX_COLOR_RE);
  });

  it('darkTokens.spacing has all numeric scale keys', () => {
    expect(typeof darkTokens.spacing.xs).toBe('number');
    expect(typeof darkTokens.spacing.sm).toBe('number');
    expect(typeof darkTokens.spacing.md).toBe('number');
    expect(typeof darkTokens.spacing.lg).toBe('number');
    expect(typeof darkTokens.spacing.xl).toBe('number');
  });

  it('darkTokens.radii has all numeric scale keys', () => {
    expect(typeof darkTokens.radii.sm).toBe('number');
    expect(typeof darkTokens.radii.md).toBe('number');
    expect(typeof darkTokens.radii.lg).toBe('number');
    expect(typeof darkTokens.radii.pill).toBe('number');
  });

  it('darkTokens.typography has a fontFamily string and numeric scale', () => {
    expect(typeof darkTokens.typography.fontFamily).toBe('string');
    expect(typeof darkTokens.typography.scale.caption).toBe('number');
    expect(typeof darkTokens.typography.scale.body).toBe('number');
    expect(typeof darkTokens.typography.scale.title).toBe('number');
    expect(typeof darkTokens.typography.scale.display).toBe('number');
  });

  it('darkTokens.elevation has all numeric scale keys', () => {
    expect(typeof darkTokens.elevation.none).toBe('number');
    expect(typeof darkTokens.elevation.low).toBe('number');
    expect(typeof darkTokens.elevation.medium).toBe('number');
  });

  it('ThemeTokens type contains no dark-prefixed keys (light-mode-ready shape)', () => {
    const topLevelKeys = Object.keys(darkTokens);
    expect(topLevelKeys.every((k) => !k.toLowerCase().startsWith('dark'))).toBe(true);
  });
});

describe('theme/useTheme', () => {
  function Probe() {
    const theme = useTheme();
    return React.createElement(
      Text,
      null,
      `${theme.colors.background}|${theme.spacing.md}|${theme.radii.md}|${theme.typography.scale.body}|${theme.elevation.low}`
    );
  }

  it('returns darkTokens under ThemeProvider with a dark override (POLI-01)', async () => {
    useSettingsStore.setState({ themeMode: 'dark' });
    const { getByText } = await render(
      React.createElement(ThemeProvider, null, React.createElement(Probe))
    );

    const expected = `${darkTokens.colors.background}|${darkTokens.spacing.md}|${darkTokens.radii.md}|${darkTokens.typography.scale.body}|${darkTokens.elevation.low}`;
    expect(getByText(expected)).toBeTruthy();
    useSettingsStore.setState({ themeMode: 'system' });
  });

  it('returns lightTokens under ThemeProvider with a light override', async () => {
    useSettingsStore.setState({ themeMode: 'light' });
    const { getByText } = await render(
      React.createElement(ThemeProvider, null, React.createElement(Probe))
    );

    const expected = `${lightTokens.colors.background}|${lightTokens.spacing.md}|${lightTokens.radii.md}|${lightTokens.typography.scale.body}|${lightTokens.elevation.low}`;
    expect(getByText(expected)).toBeTruthy();
    useSettingsStore.setState({ themeMode: 'system' });
  });
});

describe('resolveThemeTokens (POLI-01 resolution table)', () => {
  it('override wins over the OS scheme', () => {
    expect(resolveThemeTokens('dark', 'light')).toBe(darkTokens);
    expect(resolveThemeTokens('light', 'dark')).toBe(lightTokens);
  });

  it('system follows the OS scheme', () => {
    expect(resolveThemeTokens('system', 'light')).toBe(lightTokens);
    expect(resolveThemeTokens('system', 'dark')).toBe(darkTokens);
  });

  it('system with no OS preference falls back to dark (brand default)', () => {
    expect(resolveThemeTokens('system', null)).toBe(darkTokens);
    expect(resolveThemeTokens('system', undefined)).toBe(darkTokens);
  });

  it('lightTokens is a deliberately authored palette, not an inversion', () => {
    // Shared brand anchors hold across themes…
    expect(lightTokens.colors.accent).toBe(darkTokens.colors.accent);
    expect(lightTokens.colors.onAccent).toBe(darkTokens.colors.onAccent);
    // The brand cream (#F2E6CC) is deliberately SHARED — dark-mode text and
    // light-mode background are the same cream in the founder's mockups —
    // but the light text colors are their own authored warm browns, not the
    // dark surfaces swapped into text roles.
    expect(lightTokens.colors.background).toBe(darkTokens.colors.textPrimary);
    expect(lightTokens.colors.textPrimary).not.toBe(darkTokens.colors.background);
    expect(lightTokens.colors.textPrimary).not.toBe(darkTokens.colors.surface);
  });
});
