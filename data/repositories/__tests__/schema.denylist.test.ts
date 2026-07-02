/**
 * Structural guard (T-01-09): asserts no streak / daily-aggregate / diagnosis field
 * name ever enters the four local schemas (sessions, dumpItems, intentions, settings).
 *
 * "If a stat can only be used for pressure, it does not exist in the schema" —
 * PROJECT.md data-model dogma. This test inspects the actual runtime key set of a
 * representative created record of each type (not a text grep), so it also guards
 * against accidental additions in later phases.
 */

import { sessionsRepo } from '../sessions';
import { dumpItemsRepo } from '../dumpItems';
import { intentionsRepo } from '../intentions';
import { useSettingsStore } from '../../stores/useSettingsStore';

const DENYLIST = [
  'streak',
  'streakCount',
  'dailyCount',
  'dailyTotal',
  'dailyAggregate',
  'completionRate',
  'dayChain',
  'lastActiveDate',
  'activeDays',
  'diagnosis',
  'adhdStatus',
  'diagnosisStatus',
];

function schemaKeys(record: object): string[] {
  return Object.keys(record);
}

describe('schema denylist guard', () => {
  it('has zero pressure/aggregate/diagnosis fields across all four local schemas', () => {
    const session = sessionsRepo.create({ source: 'quick', taskLabel: 'denylist probe' });
    const dumpItem = dumpItemsRepo.create({ text: 'denylist probe', category: 'errands' });
    const intention = intentionsRepo.create({
      cueText: 'denylist probe cue',
      actionText: 'denylist probe action',
    });

    // Exclude the store's action functions (setLocale/setNotificationsOptIn) — the
    // schema under test is the persisted data shape, not the store's imperative API.
    const { setLocale: _setLocale, setNotificationsOptIn: _setNotificationsOptIn, ...settingsData } =
      useSettingsStore.getState();

    const allKeys = new Set<string>([
      ...schemaKeys(session),
      ...schemaKeys(dumpItem),
      ...schemaKeys(intention),
      ...schemaKeys(settingsData),
    ]);

    const violations = DENYLIST.filter((deniedField) => allKeys.has(deniedField));

    expect(violations).toEqual([]);
  });
});
