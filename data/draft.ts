/**
 * data/draft.ts — thin MMKV wrapper for the single brain-dump draft key (D-06).
 *
 * This is transient UI state, NOT a DumpItem and NOT an aggregate: a plain
 * string value under one key, no JSON encoding, no index. It auto-restores
 * in-progress capture text on screen mount and clears on Save, so a
 * force-quit mid-dump never loses a full head-clear.
 *
 * BRAIN_DUMP_DRAFT_KEY is verified clean (manually, and by
 * data/__tests__/draft.test.ts) against every DENYLIST_STEMS entry in
 * data/repositories/__tests__/schema.denylist.test.ts: streak, daily,
 * completionrate, daychain, lastactive, activedays, diagnosis, adhd.
 */
import { contentStorage } from './mmkv';

const BRAIN_DUMP_DRAFT_KEY = 'draft:brainDump';

export function readBrainDumpDraft(): string {
  return contentStorage.getString(BRAIN_DUMP_DRAFT_KEY) ?? '';
}

export function writeBrainDumpDraft(text: string): void {
  contentStorage.set(BRAIN_DUMP_DRAFT_KEY, text);
}

export function clearBrainDumpDraft(): void {
  contentStorage.remove(BRAIN_DUMP_DRAFT_KEY);
}
