/**
 * Unit tests for classify — pure rule-based category classifier (D-09/D-10).
 * Plain describe/it blocks, no mocks — construct input strings directly,
 * matching reconcileActiveSession.test.ts's no-mock pure-helper idiom.
 */
import { classify } from '../classify';
import type { DumpItemCategory } from '../../../../data/types';

const ALL_CATEGORIES: DumpItemCategory[] = ['errands', 'work', 'home', 'people', 'someday'];

describe('classify', () => {
  it('always returns one of the 5 DumpItemCategory values, never null/undefined (D-10)', () => {
    const result = classify('completely unrelated gibberish xyzzy', 'en');
    expect(result).toBeDefined();
    expect(ALL_CATEGORIES).toContain(result);
  });

  it('EN: a string containing an errands-stem routes to errands', () => {
    expect(classify('pick up groceries from the store', 'en')).toBe('errands');
  });

  it('PL: a string containing the PL stem for errands routes to errands, matching inflected forms (A1)', () => {
    // "sklepie" (locative case) contains the stem "sklep" via substring match.
    expect(classify('kupić mleko w sklepie', 'pl')).toBe('errands');
  });

  it('EN: a string containing a work-stem routes to work', () => {
    expect(classify('finish the quarterly report before the meeting', 'en')).toBe('work');
  });

  it('PL: a string containing a work-stem routes to work', () => {
    expect(classify('przygotować raport na spotkanie', 'pl')).toBe('work');
  });

  it('EN: a string containing a home-stem routes to home', () => {
    expect(classify('do the laundry and wash the dishes', 'en')).toBe('home');
  });

  it('PL: a string containing a home-stem routes to home', () => {
    expect(classify('zrobić pranie i posprzątać kuchnię', 'pl')).toBe('home');
  });

  it('EN: a string containing a people-stem routes to people', () => {
    expect(classify('call mom for her birthday', 'en')).toBe('people');
  });

  it('PL: a string containing a people-stem routes to people', () => {
    expect(classify('zadzwonić do mamy z okazji urodzin', 'pl')).toBe('people');
  });

  it('no keyword match resolves to someday (D-09)', () => {
    expect(classify('ponder the meaning of life', 'en')).toBe('someday');
  });

  it('empty string resolves to someday (no match, D-09)', () => {
    expect(classify('', 'en')).toBe('someday');
  });

  it('a genuine tie between two categories resolves to someday, not the last-checked category (D-09, Pitfall 4)', () => {
    // "call" -> people (1 stem hit), "shop" -> errands (1 stem hit): equal score of 1 each.
    expect(classify('call about the shop', 'en')).toBe('someday');
  });

  it('matching is case-insensitive', () => {
    expect(classify('PICK UP GROCERIES FROM THE STORE', 'en')).toBe('errands');
  });

  it('does not throw on adversarial input: very long string, emoji, RTL script (V5)', () => {
    const longText = 'x'.repeat(10000);
    const adversarial = `${longText} emoji \u{1F99D} مرحبا`;
    expect(() => classify(adversarial, 'en')).not.toThrow();
    expect(ALL_CATEGORIES).toContain(classify(adversarial, 'en'));
  });

  it('EN: "text" does not false-match inside unrelated words like "context" (WR-04)', () => {
    expect(classify('finish the report — needs more context', 'en')).toBe('work');
  });

  it('EN: "call" does not false-match inside unrelated words like "recall" (WR-04)', () => {
    expect(classify('recall the invoice details for the client', 'en')).toBe('work');
  });

  it('PL: "mamy" ("we have") does not false-match into people (WR-04)', () => {
    expect(classify('mamy zebranie o 15 na temat raportu', 'pl')).toBe('work');
  });
});
