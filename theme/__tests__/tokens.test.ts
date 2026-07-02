import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { darkTokens } from '../tokens';
import { ThemeProvider } from '../ThemeProvider';
import { useTheme } from '../useTheme';

const HEX_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;

describe('theme/tokens', () => {
  it('darkTokens exposes valid hex colors for the core anchor keys', () => {
    expect(darkTokens.colors.background).toMatch(HEX_COLOR_RE);
    expect(darkTokens.colors.surface).toMatch(HEX_COLOR_RE);
    expect(darkTokens.colors.textPrimary).toMatch(HEX_COLOR_RE);
    expect(darkTokens.colors.accent).toMatch(HEX_COLOR_RE);
  });

  it('darkTokens exposes spacing, radii, typography, and elevation groups', () => {
    expect(typeof darkTokens.spacing.md).toBe('number');
    expect(typeof darkTokens.radii.md).toBe('number');
    expect(typeof darkTokens.typography.scale.body).toBe('number');
    expect(typeof darkTokens.elevation.low).toBe('number');
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

  it('returns darkTokens when rendered under ThemeProvider', async () => {
    const { getByText } = await render(
      React.createElement(ThemeProvider, null, React.createElement(Probe))
    );

    const expected = `${darkTokens.colors.background}|${darkTokens.spacing.md}|${darkTokens.radii.md}|${darkTokens.typography.scale.body}|${darkTokens.elevation.low}`;
    expect(getByText(expected)).toBeTruthy();
  });
});
