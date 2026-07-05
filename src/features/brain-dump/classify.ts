/**
 * classify — pure rule-based category classifier (D-09/D-10). Mirrors
 * reconcileActiveSession.ts's shape: explicit typed inputs in, deterministic
 * output out (always exactly one of the 5 DumpItemCategory values, never
 * null/undefined), no MMKV/React import — trivially unit-testable with zero
 * mocks.
 *
 * D-09: hand-tuned PL + EN keyword stems per category, simple substring
 * scoring; a tie OR no match resolves to 'someday'.
 * D-10: DumpItem.category is a required field — classify always returns a
 * value, satisfying it synchronously at Save with no async step.
 *
 * Pitfall 4 (tie-break correctness): a naive "displace only on strict '>'
 * against a someday-seeded default" only guarantees a *zero-score* tie stays
 * 'someday' — it does NOT stop the first category to reach a given nonzero
 * score from beating a later category that reaches the exact same score
 * (the later category's `score > bestScore` check is false, so the earlier
 * category silently wins instead of falling back to 'someday'). This
 * violates D-09's explicit "genuine tie -> someday, not the last/first
 * checked category" rule, so a genuine nonzero tie is detected separately
 * and resets the result to 'someday'. A subsequent category with a strictly
 * higher score still overrides a prior tie, since that's an unambiguous win.
 */
import type { DumpItemCategory, Locale } from '../../../data/types';
import { KEYWORDS_BY_CATEGORY } from './keywords';

const CATEGORY_ORDER: readonly DumpItemCategory[] = ['errands', 'work', 'home', 'people', 'someday'];

// WR-04: 'call' and 'text' are short, common English words that raw
// `.includes()` substring matching would also match inside unrelated words
// ("recall", "callback", "context", "textbook", "contextual") — unlike this
// module's other (longer or more specific) stems, these two require a
// whole-word match to avoid false-positive category assignment.
const WORD_BOUNDARY_STEMS: ReadonlySet<string> = new Set(['call', 'text']);

function stemMatches(normalized: string, stem: string): boolean {
  if (WORD_BOUNDARY_STEMS.has(stem)) {
    return new RegExp(`\\b${stem}\\b`).test(normalized);
  }
  return normalized.includes(stem);
}

export function classify(text: string, locale: Locale): DumpItemCategory {
  const normalized = text.toLowerCase();
  let bestCategory: DumpItemCategory = 'someday'; // D-09 fallback: no match keeps this
  let bestScore = 0;

  for (const category of CATEGORY_ORDER) {
    if (category === 'someday') continue;
    const stems = KEYWORDS_BY_CATEGORY[category][locale];
    const score = stems.filter((stem) => stemMatches(normalized, stem)).length;

    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    } else if (score === bestScore && score > 0) {
      // Genuine tie between two scored (nonzero) categories -> someday
      // (D-09, Pitfall 4), not whichever category happened to be checked
      // first in CATEGORY_ORDER.
      bestCategory = 'someday';
    }
  }

  return bestCategory;
}
