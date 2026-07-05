/**
 * Polish CLDR plural unit tests (FND-05, D-08).
 *
 * i18next 26.x's default JSON format v4 resolves plural categories via
 * `Intl.PluralRules`, so Polish's four categories (`_one`/`_few`/`_many`/`_other`)
 * must render correctly with zero hand-rolled branching and zero `compatibilityJSON`
 * override. `22` is the sharpest case: it ends in `2` (naively "few"-shaped) but must
 * still resolve to `_few` because Polish's 12-14 exception band does not apply to 22.
 *
 * Fixture: `history.duration` — a REAL app key (the quiet log's per-session
 * duration). The original standalone `sessionsRemaining_*` fixture was deleted
 * (BLITZ-REVIEW): it was unused by any screen and literally encoded the
 * depletion/countdown copy pattern this project's shame-free constraint
 * forbids — a landmine waiting to be wired up.
 */
import i18n from '../index';
import en from '../locales/en.json';
import pl from '../locales/pl.json';

describe('Polish CLDR plurals for history.duration', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('pl');
  });

  it.each([
    [0, pl.history.duration_many],
    [1, pl.history.duration_one],
    [2, pl.history.duration_few],
    [5, pl.history.duration_many],
    [22, pl.history.duration_few],
  ])('count=%i resolves the correct Polish CLDR plural form', (count, template) => {
    const expected = template.replace('{{count}}', String(count));

    expect(i18n.t('history.duration', { count })).toBe(expected);
  });
});

describe('English plurals for history.duration', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('count=1 uses the English singular ("one") form', () => {
    const expected = en.history.duration_one.replace('{{count}}', '1');

    expect(i18n.t('history.duration', { count: 1 })).toBe(expected);
  });

  it('count=2 uses the English plural ("other") form', () => {
    const expected = en.history.duration_other.replace('{{count}}', '2');

    expect(i18n.t('history.duration', { count: 2 })).toBe(expected);
  });
});
