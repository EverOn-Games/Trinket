/**
 * Structural guard (T-01-09): asserts no streak / daily-aggregate / diagnosis field
 * name ever enters the four local schemas (sessions, dumpItems, intentions, settings).
 *
 * "If a stat can only be used for pressure, it does not exist in the schema" —
 * PROJECT.md data-model dogma. Two complementary checks:
 * 1. A runtime probe (representative created record of each type) — catches fields
 *    that are always populated.
 * 2. A source-level scan of data/types.ts's interface property names — catches
 *    *optional* fields (e.g. `streak?: number`) that would never appear in a probe's
 *    runtime key set (WR-04).
 * Both checks use case-insensitive substring matching against denylist stems, not
 * exact equality, so near-miss names (`currentStreak`, `diagnosisType`,
 * `dailyStreakCount`) are also caught (WR-04) — exact equality alone let those pass.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { sessionsRepo } from '../sessions';
import { dumpItemsRepo } from '../dumpItems';
import { intentionsRepo } from '../intentions';
import { landingsRepo } from '../landings';
import { activeSessionRepo } from '../activeSession';
import { useSettingsStore } from '../../stores/useSettingsStore';

// Denylist *stems*, matched as case-insensitive substrings — not exact field names.
// This intentionally catches near-misses like `currentStreak`, `dailyStreakCount`,
// and `diagnosisType` that exact-equality matching would silently let through.
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

function violatingStems(key: string): string[] {
  const lowerKey = key.toLowerCase();
  return DENYLIST_STEMS.filter((stem) => lowerKey.includes(stem));
}

function schemaKeys(record: object): string[] {
  return Object.keys(record);
}

// Extracts interface property names (including optional `name?:`) via a source-level
// scan of data/types.ts, so denied fields that are declared but never populated by
// the runtime probe (optional fields) are still caught.
function extractInterfacePropertyNames(source: string): string[] {
  const names: string[] = [];
  const propertyRe = /^\s*([A-Za-z_$][A-Za-z0-9_$]*)\??\s*:/gm;
  let match: RegExpExecArray | null;
  while ((match = propertyRe.exec(source)) !== null) {
    names.push(match[1]);
  }
  return names;
}

describe('schema denylist guard', () => {
  it('has zero pressure/aggregate/diagnosis fields across all four local schemas (runtime probe)', () => {
    const session = sessionsRepo.create({ source: 'quick', taskLabel: 'denylist probe' });
    const dumpItem = dumpItemsRepo.create({ text: 'denylist probe', category: 'errands' });
    const intention = intentionsRepo.create({
      cueText: 'denylist probe cue',
      actionText: 'denylist probe action',
    });
    const landing = landingsRepo.create({
      activityLabel: 'denylist probe landing',
      leadMinutes: 10,
      activityAt: Date.now() + 60 * 60 * 1000,
      transitionTouch: false,
    });

    // Belt-and-suspenders (03-PATTERNS.md): probe the active-session pointer's
    // runtime keys too, even though the source-scan check below already covers
    // ActiveSessionPointer's declared fields via data/types.ts.
    activeSessionRepo.start('denylist-probe-session', Date.now(), 'denylist probe task');
    const activeSessionPointer = activeSessionRepo.read();

    // Exclude the store's action functions (setLocale/setNotificationsOptIn/
    // setMascotProminence) — the schema under test is the persisted data shape,
    // not the store's imperative API.
    const {
      setLocale: _setLocale,
      setNotificationsOptIn: _setNotificationsOptIn,
      setMascotProminence: _setMascotProminence,
      setOnboardingComplete: _setOnboardingComplete,
      setSubscriptionCache: _setSubscriptionCache,
      setThemeMode: _setThemeMode,
      ...settingsData
    } = useSettingsStore.getState();

    const allKeys = new Set<string>([
      ...schemaKeys(session),
      ...schemaKeys(dumpItem),
      ...schemaKeys(intention),
      ...schemaKeys(landing),
      ...schemaKeys(settingsData),
      ...(activeSessionPointer ? schemaKeys(activeSessionPointer) : []),
    ]);

    const violations = [...allKeys].filter((key) => violatingStems(key).length > 0);

    expect(violations).toEqual([]);
  });

  it('has zero pressure/aggregate/diagnosis fields declared in data/types.ts, including optional ones', () => {
    const typesSource = readFileSync(join(__dirname, '../../types.ts'), 'utf8');
    const declaredNames = extractInterfacePropertyNames(typesSource);

    const violations = declaredNames.filter((name) => violatingStems(name).length > 0);

    expect(violations).toEqual([]);
  });
});
