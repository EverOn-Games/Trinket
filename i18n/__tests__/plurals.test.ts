/**
 * Polish CLDR plural unit tests (FND-05, D-08).
 *
 * i18next 26.x's default JSON format v4 resolves plural categories via
 * `Intl.PluralRules`, so Polish's four categories (`_one`/`_few`/`_many`/`_other`)
 * must render correctly with zero hand-rolled branching and zero `compatibilityJSON`
 * override. `22` is the sharpest case: it ends in `2` (naively "few"-shaped) but must
 * still resolve to `_few` because Polish's 12-14 exception band does not apply to 22.
 */
import i18n from '../index';
import en from '../locales/en.json';
import pl from '../locales/pl.json';

describe('Polish CLDR plurals for sessionsRemaining', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('pl');
  });

  it.each([
    [0, pl.sessionsRemaining_many],
    [1, pl.sessionsRemaining_one],
    [2, pl.sessionsRemaining_few],
    [5, pl.sessionsRemaining_many],
    [22, pl.sessionsRemaining_few],
  ])('count=%i resolves the correct Polish CLDR plural form', (count, template) => {
    const expected = template.replace('{{count}}', String(count));

    expect(i18n.t('sessionsRemaining', { count })).toBe(expected);
  });
});

describe('English plurals for sessionsRemaining', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('count=1 uses the English singular ("one") form', () => {
    const expected = en.sessionsRemaining_one.replace('{{count}}', '1');

    expect(i18n.t('sessionsRemaining', { count: 1 })).toBe(expected);
  });

  it('count=2 uses the English plural ("other") form', () => {
    const expected = en.sessionsRemaining_other.replace('{{count}}', '2');

    expect(i18n.t('sessionsRemaining', { count: 2 })).toBe(expected);
  });
});
