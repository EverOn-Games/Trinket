/**
 * Runtime locale switcher (D-08).
 *
 * Exposes the current app locale and a setter that calls i18next's
 * `changeLanguage`. The user-facing override control ships with the Phase 8
 * settings screen (SETT-01); this hook is the seam that control will call into
 * from day one, so no retrofit is needed when that screen lands.
 *
 * Persistence: this hook itself only calls `i18n.changeLanguage` — it does not
 * write to the settings store directly. The write-through happens in
 * src/app/_layout.tsx's `usePersistLocaleOnChange`, which subscribes to
 * i18next's `languageChanged` event and persists every change (from this hook
 * or any other caller of `i18n.changeLanguage`) into `useSettingsStore` (WR-02),
 * satisfying D-07's "resolved locale persists to the settings repository."
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
