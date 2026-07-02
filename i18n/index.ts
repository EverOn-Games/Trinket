/**
 * i18next init (FND-05, D-07, D-08).
 *
 * Initializes i18next with PL/EN resources and resolves the initial locale from the
 * device's system language: Polish -> 'pl', anything else -> 'en' (D-07 — no
 * language-picker screen at first launch). Deliberately does NOT set
 * `compatibilityJSON` — i18next 26.x defaults to JSON format v4, which resolves
 * Polish's CLDR plural categories (`_one`/`_few`/`_many`/`_other`) via
 * `Intl.PluralRules` automatically (D-08). Setting `compatibilityJSON: 'v3'` would
 * silently break Polish pluralization and must never be added here.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import en from './locales/en.json';
import pl from './locales/pl.json';

/**
 * Resolves the locale to boot with, from the device's primary system language.
 * Returns 'pl' only when the device's languageCode is exactly 'pl'; every other
 * value (including null/undefined) falls back to 'en'. No picker is ever shown.
 */
export function resolveInitialLocale(): 'pl' | 'en' {
  const primary = getLocales()[0]?.languageCode;
  return primary === 'pl' ? 'pl' : 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    pl: { translation: pl },
  },
  lng: resolveInitialLocale(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  // No compatibilityJSON override — see module docstring.
});

export default i18n;
