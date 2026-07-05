/**
 * Unit tests for parseDumpText — pure newline-stream parser (D-07/D-08).
 * Plain describe/it blocks, no mocks — construct raw strings directly,
 * matching reconcileActiveSession.test.ts's no-mock pure-helper idiom.
 */
import { parseDumpText } from '../parseDumpText';

describe('parseDumpText', () => {
  it('splits a multiline stream into trimmed item strings', () => {
    expect(parseDumpText('one\ntwo\nthree')).toEqual(['one', 'two', 'three']);
  });

  it('trims leading/trailing whitespace per line', () => {
    expect(parseDumpText('  one  \n two \n  three')).toEqual(['one', 'two', 'three']);
  });

  it('drops blank and whitespace-only lines (D-07)', () => {
    expect(parseDumpText('one\n\n   \ntwo')).toEqual(['one', 'two']);
  });

  it('returns a single item for a single-line stream (D-07)', () => {
    expect(parseDumpText('just one thing')).toEqual(['just one thing']);
  });

  it('returns an empty array for an empty string (D-07 no-op)', () => {
    expect(parseDumpText('')).toEqual([]);
  });

  it('returns an empty array for a whitespace-only string (D-07 no-op)', () => {
    expect(parseDumpText('   \n  \n\t  ')).toEqual([]);
  });

  it('accepts 35 lines without truncation (D-08: 30 is descriptive, not a gate)', () => {
    const lines = Array.from({ length: 35 }, (_, i) => `item ${i + 1}`);
    expect(parseDumpText(lines.join('\n'))).toEqual(lines);
  });

  it('does not throw on adversarial input: very long line, emoji, RTL script (V5)', () => {
    const longLine = 'x'.repeat(10000);
    const adversarial = `${longLine}\nemoji task \u{1F99D}\nمرحبا`;
    expect(() => parseDumpText(adversarial)).not.toThrow();
    const result = parseDumpText(adversarial);
    expect(result).toHaveLength(3);
    expect(result[1]).toBe('emoji task \u{1F99D}');
    expect(result[2]).toBe('مرحبا');
  });
});
