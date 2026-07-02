/**
 * Locale-resolution unit tests (FND-05, D-07).
 *
 * `resolveInitialLocale()` must pick `'pl'` only when the device's primary system
 * language is Polish, and fall back to `'en'` for every other case (including a
 * missing/null languageCode) — there is no language-picker screen at first launch.
 */
import { getLocales } from 'expo-localization';

import { resolveInitialLocale } from '../index';

const mockGetLocales = getLocales as jest.Mock;

describe('resolveInitialLocale (D-07 device-locale resolution)', () => {
  it('returns "pl" when the device system language is Polish', () => {
    mockGetLocales.mockReturnValue([{ languageCode: 'pl' }]);

    expect(resolveInitialLocale()).toBe('pl');
  });

  it('returns "en" when the device system language is not Polish', () => {
    mockGetLocales.mockReturnValue([{ languageCode: 'de' }]);

    expect(resolveInitialLocale()).toBe('en');
  });

  it('returns "en" when the device locale has no languageCode', () => {
    mockGetLocales.mockReturnValue([{ languageCode: null }]);

    expect(resolveInitialLocale()).toBe('en');
  });
});
