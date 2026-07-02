const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const i18next = require('eslint-plugin-i18next');

// FND-05 mechanical enforcement: any raw JSX text string in a screen or shared
// component (e.g. a literal "Start a session?" in <Text>) must be an ESLint error,
// forcing use of t() translation keys. Scoped to JSX-bearing source (src/app/**,
// src/features/**, and src/components/** — shared UI like Screen/MascotSlot) so it
// does not fire on config files, test files, mock files, theme token values, or i18n
// locale JSON — those are legitimately allowed to contain literal strings.
module.exports = defineConfig([
  {
    ignores: [
      'node_modules/**',
      'ios/**',
      'android/**',
      '.expo/**',
      '__mocks__/**',
      '__tests__/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      'scripts/**',
      'dist/**',
    ],
  },
  ...expoConfig,
  {
    files: ['src/app/**/*.tsx', 'src/features/**/*.tsx', 'src/components/**/*.tsx'],
    ...i18next.configs['flat/recommended'],
  },
]);
