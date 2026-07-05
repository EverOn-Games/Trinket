#!/usr/bin/env node
/**
 * Phase 9 criterion 4 structural guard: the shame-free / PDA-aware /
 * regulatory copy constraints are BUGS when violated, not style choices
 * (PROJECT.md hard constraints). This gate scans every user-facing string in
 * i18n/locales/*.json against curated EN + PL denylist patterns:
 *
 *  - shame/depletion framing (run out, used up, wasted, failure…)
 *  - streak/pressure mechanics (affirmative "streak"; negated mentions like
 *    "no streaks" / "bez serii" are the product's own promise and stay legal
 *    via lookbehinds)
 *  - urgency/scarcity (hurry, last chance, don't miss, limited time…)
 *  - demand grammar (you must / you have to / musisz) — copy offers, never
 *    instructs
 *  - forbidden medical/regulatory claims (treats/cures/diagnoses/reduces
 *    symptoms/clinically proven). Mentioning ADHD is allowed — claiming to
 *    treat it is not; the onboarding disclaimer's "clinical care" is
 *    deliberately outside the "clinically proven" pattern.
 *
 * Patterns are deliberately curated (high precision over recall): a gate that
 * cries wolf gets deleted. The store-listing copy doesn't live in this repo
 * yet — audit it against the same lists at submission time.
 *
 * Exits 0 when clean; exits 1 listing locale file + JSON key path + matched
 * text otherwise. Wired as `npm run lint:copy` inside `npm run verify`.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const LOCALE_FILES = ['i18n/locales/en.json', 'i18n/locales/pl.json'];

/** @type {Array<{ re: RegExp, why: string }>} */
const DENY_PATTERNS = [
  // — Shame / depletion framing —
  { re: /\brun(s|ning)? out\b/i, why: 'depletion framing ("run out") — state the refresh fact instead' },
  { re: /\bused up\b/i, why: 'depletion framing ("used up")' },
  { re: /\bno more\b/i, why: 'depletion framing ("no more")' },
  { re: /\bwasted?\b/i, why: 'shame framing ("wasted")' },
  { re: /\bfail(ed|ure)?\b/i, why: 'shame framing ("fail/failure")' },
  { re: /\blazy\b/i, why: 'shame framing ("lazy")' },
  { re: /zmarnow/i, why: 'PL shame framing ("zmarnowa-")' },
  { re: /poraż/i, why: 'PL shame framing ("porażka")' },
  { re: /leniw/i, why: 'PL shame framing ("leniwy")' },
  { re: /wykorzystał[aeoś]/i, why: 'PL depletion framing ("wykorzystałeś/aś")' },
  { re: /(kończ[yą]|skończył[iy]?) ci się/i, why: 'PL depletion framing ("kończą ci się")' },

  // — Streak / pressure mechanics (negated mentions stay legal) —
  { re: /(?<!no )streak/i, why: 'streak mechanic (only the "no streaks" promise may mention it)' },
  { re: /(?<!bez )seri[ae]\b/i, why: 'PL streak mechanic (only "bez serii" may mention it)' },
  { re: /\bin a row\b/i, why: 'streak framing ("in a row")' },
  { re: /don'?t break/i, why: 'streak-guard framing ("don\'t break")' },
  { re: /(?<!no )guilt/i, why: 'guilt framing (only the "no guilt" promise may mention it)' },
  { re: /(?<!bez )poczuci[aue] winy/i, why: 'PL guilt framing (only "bez poczucia winy" may mention it)' },

  // — Urgency / scarcity —
  { re: /\bhurry\b/i, why: 'urgency ("hurry")' },
  { re: /\blast chance\b/i, why: 'scarcity ("last chance")' },
  { re: /\bact now\b/i, why: 'urgency ("act now")' },
  { re: /\bdon'?t miss\b/i, why: 'urgency ("don\'t miss")' },
  { re: /\blimited[ -]time\b/i, why: 'scarcity ("limited time")' },
  { re: /\bexpir(es?|ing|ed)\b/i, why: 'countdown framing ("expires") — refresh framing instead' },
  { re: /\bonly \d+ (left|remaining)\b/i, why: 'scarcity ("only N left")' },
  // "Nie spiesz się" ("take your time") is the negated, warm form — legal.
  { re: /(?<!nie )(po)?spiesz/i, why: 'PL urgency ("spiesz się")' },
  { re: /ostatnia szansa/i, why: 'PL scarcity ("ostatnia szansa")' },
  { re: /nie przegap/i, why: 'PL urgency ("nie przegap")' },
  { re: /wygasa/i, why: 'PL countdown framing ("wygasa")' },
  { re: /zostało tylko/i, why: 'PL scarcity ("zostało tylko")' },

  // — Demand grammar (copy offers, never instructs) —
  { re: /\byou (must|have to|need to)\b/i, why: 'demand grammar — offer, don\'t instruct' },
  { re: /\bmusisz\b/i, why: 'PL demand grammar ("musisz")' },

  // — Forbidden medical / regulatory claims —
  { re: /\btreat(s|ment|ing)?\b/i, why: 'medical claim ("treats") — "supports task initiation" is the ceiling' },
  { re: /\bcures?\b/i, why: 'medical claim ("cures")' },
  { re: /\bdiagnos/i, why: 'medical claim ("diagnose/diagnosis")' },
  { re: /reduc\w* (your )?(adhd )?symptom/i, why: 'medical claim ("reduces symptoms")' },
  { re: /clinically[ -](proven|tested|validated)/i, why: 'medical claim ("clinically proven")' },
  { re: /\btherap(y|eutic)\b/i, why: 'therapeutic claim' },
  { re: /\blecz(y|ą|enie|niczy)/i, why: 'PL medical claim ("leczy/leczenie")' },
  { re: /diagnoz/i, why: 'PL medical claim ("diagnoza")' },
  { re: /\bobjaw/i, why: 'PL medical claim ("objawy" — symptoms)' },
  { re: /klinicznie (udowodnion|potwierdzon|przetestowan)/i, why: 'PL medical claim ("klinicznie udowodnione")' },
  { re: /terapeutyczn/i, why: 'PL therapeutic claim' },
];

/** Flatten a locale object into [keyPath, string] pairs. */
function flatten(obj, prefix = []) {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === 'string' ? [[[...prefix, key].join('.'), value]] : flatten(value, [...prefix, key])
  );
}

function main() {
  let violationCount = 0;
  let scannedStrings = 0;

  for (const file of LOCALE_FILES) {
    const fullPath = path.join(ROOT, file);
    const locale = JSON.parse(readFileSync(fullPath, 'utf8'));
    const entries = flatten(locale);
    scannedStrings += entries.length;

    for (const [keyPath, text] of entries) {
      for (const { re, why } of DENY_PATTERNS) {
        const match = text.match(re);
        if (match) {
          violationCount += 1;
          console.error(`${file} → ${keyPath}: "${match[0]}" — ${why}\n    full string: ${text}`);
        }
      }
    }
  }

  if (scannedStrings === 0) {
    console.error('check-copy-tone: scanned zero strings — refusing to pass an empty scan.');
    process.exit(1);
  }

  if (violationCount > 0) {
    console.error(
      `\ncheck-copy-tone: ${violationCount} tone/claim violation(s). ` +
        'Shame-free, PDA-aware, claim-free copy is a hard constraint (PROJECT.md) — rewrite, don\'t suppress.'
    );
    process.exit(1);
  }

  console.log(`check-copy-tone: ${scannedStrings} strings clean across ${LOCALE_FILES.length} locales.`);
  process.exit(0);
}

main();
