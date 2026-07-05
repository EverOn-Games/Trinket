/**
 * Unit tests for appendFinalSegmentToDraft — pure final-transcript ->
 * appended-line function (D-03, Pitfall 2). Plain describe/it blocks, no
 * mocks — mirrors reconcileActiveSession.test.ts's no-mock pure-helper idiom.
 * Isolated so a D-02 device-spike finding about real segment behavior is a
 * one-function fix, not a component rewrite.
 */
import { appendFinalSegmentToDraft } from '../appendFinalSegmentToDraft';

describe('appendFinalSegmentToDraft', () => {
  it('appends a new line to existing draft content', () => {
    expect(appendFinalSegmentToDraft('a\nb', 'c')).toBe('a\nb\nc');
  });

  it('appends to an empty draft with no leading newline', () => {
    expect(appendFinalSegmentToDraft('', 'c')).toBe('c');
  });

  it('trims the incoming transcript before appending', () => {
    expect(appendFinalSegmentToDraft('a', '  call the dentist  ')).toBe('a\ncall the dentist');
  });

  it('collapses a leading space Android sometimes inserts into a fresh transcript', () => {
    expect(appendFinalSegmentToDraft('', ' buy milk')).toBe('buy milk');
  });

  it('ignores an empty transcript, returning the input unchanged', () => {
    expect(appendFinalSegmentToDraft('a\nb', '')).toBe('a\nb');
  });

  it('ignores a whitespace-only transcript, returning the input unchanged', () => {
    expect(appendFinalSegmentToDraft('a\nb', '   ')).toBe('a\nb');
  });
});
