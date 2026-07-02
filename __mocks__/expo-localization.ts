/**
 * In-memory fake of expo-localization's device-locale API, used exclusively under Jest.
 *
 * expo-localization wraps a native module that cannot initialize inside Jest's Node test
 * environment (same class of problem as react-native-mmkv v4's Nitro Modules binding —
 * see __mocks__/react-native-mmkv.ts). This manual mock lets locale-resolution logic
 * (resolveInitialLocale, D-07) be unit-tested by controlling the mocked device locale via
 * `(getLocales as jest.Mock).mockReturnValue(...)`.
 *
 * Defaults to an English-tagged locale so any incidental import chain (e.g. i18n/index.ts's
 * module-level i18n.init() call, which invokes resolveInitialLocale() at import time) resolves
 * safely without requiring a test-specific override first.
 */
export const getLocales = jest.fn(() => [
  { languageCode: 'en', languageTag: 'en-US' },
]);
