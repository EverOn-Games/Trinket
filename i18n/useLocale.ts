/**
 * Runtime locale switcher (D-08).
 *
 * Exposes the current app locale and a setter that calls i18next's
 * `changeLanguage`. The user-facing override control ships with the Phase 8
 * settings screen (SETT-01); this hook is the seam that control will call into
 * from day one, so no retrofit is needed when that screen lands.
 *
 * Persistence seam: the resolved/selected locale should also be persisted to the
 * `settings` repository (D-07's "resolved locale persists to the settings
 * repository"). The settings repository does not exist yet — it lands in Plan 05
 * — so this hook does not hard-depend on it. Once Plan 05's settings repository
 * exists, Plan 06 (provider/app-shell wiring) should subscribe to i18next's
 * `languageChanged` event (or wrap the `setLocale` returned here) to write the
 * chosen locale into that repository. See 01-04-SUMMARY.md for this seam.
 */
import { useTranslation } from 'react-i18next';

import './index';

export type Locale = 'pl' | 'en';

export type UseLocaleResult = {
  locale: Locale;
  setLocale: (next: Locale) => void;
};

export function useLocale(): UseLocaleResult {
  const { i18n } = useTranslation();

  const locale: Locale = i18n.language === 'pl' ? 'pl' : 'en';

  const setLocale = (next: Locale): void => {
    void i18n.changeLanguage(next);
  };

  return { locale, setLocale };
}
