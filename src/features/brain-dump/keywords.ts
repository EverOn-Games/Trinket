/**
 * KEYWORDS_BY_CATEGORY — PL + EN keyword stem lists per scored category (D-09).
 * Data-only lookup module, no business logic — mirrors
 * src/components/Mascot/markers.ts's data-module idiom (a plain table, no
 * side effects). Stems are lowercase for case-insensitive substring matching
 * in classify.ts (e.g. Polish stem "sklep" also matches the inflected form
 * "sklepie" via .includes()).
 *
 * 'someday' intentionally has no list here — it is classify.ts's fallback
 * only (D-09: no match or a tie resolves to 'someday'), never a scored
 * category.
 */
export const KEYWORDS_BY_CATEGORY: Record<'errands' | 'work' | 'home' | 'people', { pl: string[]; en: string[] }> = {
  errands: {
    en: ['shop', 'store', 'grocery', 'groceries', 'pharmacy', 'pickup', 'pick up', 'errand', 'bank', 'post office', 'parcel'],
    pl: ['sklep', 'apteka', 'poczta', 'bank', 'zakupy', 'paczka', 'kupić'],
  },
  work: {
    en: ['work', 'meeting', 'email', 'report', 'deadline', 'project', 'client', 'invoice', 'presentation'],
    pl: ['praca', 'spotkanie', 'mail', 'raport', 'projekt', 'klient', 'faktura', 'prezentacja'],
  },
  home: {
    en: ['clean', 'laundry', 'dishes', 'home', 'repair', 'trash', 'kitchen', 'garden', 'fix the'],
    pl: ['sprzątanie', 'posprzątać', 'pranie', 'naczynia', 'dom', 'naprawa', 'śmieci', 'kuchni', 'ogród'],
  },
  people: {
    en: ['call', 'text', 'friend', 'family', 'birthday', 'visit', 'mom', 'dad', 'partner'],
    pl: ['zadzwonić', 'napisać', 'przyjaciel', 'rodzina', 'urodzin', 'odwiedzić', 'mamy', 'mama', 'tata'],
  },
};
