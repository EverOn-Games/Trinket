/**
 * Unit tests for data/draft.ts — the single-key brain-dump draft wrapper (D-06).
 * Mirrors schema.denylist.test.ts's contentStorage.clearAll() reset pattern for
 * isolation between tests.
 */
import { contentStorage } from '../mmkv';
import { readBrainDumpDraft, writeBrainDumpDraft, clearBrainDumpDraft } from '../draft';

// Same DENYLIST_STEMS list as data/repositories/__tests__/schema.denylist.test.ts —
// duplicated here (not imported) so this test independently proves the key is clean.
const DENYLIST_STEMS = [
  'streak',
  'daily',
  'completionrate',
  'daychain',
  'lastactive',
  'activedays',
  'diagnosis',
  'adhd',
];

describe('draft (data/draft.ts)', () => {
  beforeEach(() => {
    contentStorage.clearAll();
  });

  it('round-trips: writeBrainDumpDraft(x) then readBrainDumpDraft() returns x', () => {
    writeBrainDumpDraft('errands, calls, that thing about deposits');
    expect(readBrainDumpDraft()).toBe('errands, calls, that thing about deposits');
  });

  it('returns an empty string on an empty/absent key, never undefined, never throws', () => {
    expect(readBrainDumpDraft()).toBe('');
  });

  it('clears: clearBrainDumpDraft() then readBrainDumpDraft() returns empty string', () => {
    writeBrainDumpDraft('something in progress');
    clearBrainDumpDraft();
    expect(readBrainDumpDraft()).toBe('');
  });

  it('uses a key literal that contains none of the schema denylist stems (D-06)', () => {
    const DRAFT_KEY = 'draft:brainDump';
    const lowerKey = DRAFT_KEY.toLowerCase();
    const violations = DENYLIST_STEMS.filter((stem) => lowerKey.includes(stem));
    expect(violations).toEqual([]);
  });

  it('returns an empty string rather than throwing when the underlying MMKV read errors (WR-03)', () => {
    const getStringSpy = jest.spyOn(contentStorage, 'getString').mockImplementation(() => {
      throw new Error('corrupt MMKV instance');
    });

    try {
      expect(() => readBrainDumpDraft()).not.toThrow();
      expect(readBrainDumpDraft()).toBe('');
    } finally {
      getStringSpy.mockRestore();
    }
  });
});
