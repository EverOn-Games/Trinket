/**
 * Full CRUD lifecycle coverage for the three collection repositories
 * (sessionsRepo/dumpItemsRepo/intentionsRepo) plus a cross-collection
 * namespace-isolation check and a settings persistence round-trip.
 *
 * Runs against the in-memory react-native-mmkv mock (__mocks__/react-native-mmkv.ts,
 * registered globally in jest.setup.ts) — see 01-RESEARCH.md Pitfall 1.
 */

import { sessionsRepo } from '../sessions';
import { dumpItemsRepo } from '../dumpItems';
import { intentionsRepo } from '../intentions';
import { useSettingsStore } from '../../stores/useSettingsStore';

describe('sessionsRepo', () => {
  it('supports full CRUD lifecycle', () => {
    const created = sessionsRepo.create({ source: 'quick', taskLabel: 'write report' });
    expect(created.id).toBeTruthy();
    expect(created.startedAt).toBeGreaterThan(0);

    expect(sessionsRepo.get(created.id)).toEqual(created);
    expect(sessionsRepo.list().map((session) => session.id)).toContain(created.id);

    const updated = sessionsRepo.update(created.id, { endedAt: Date.now(), mood: 2 });
    expect(updated?.mood).toBe(2);
    expect(updated?.endedAt).toBeDefined();
    expect(sessionsRepo.get(created.id)?.mood).toBe(2);

    sessionsRepo.remove(created.id);
    expect(sessionsRepo.get(created.id)).toBeUndefined();
    expect(sessionsRepo.list().map((session) => session.id)).not.toContain(created.id);
  });
});

describe('dumpItemsRepo', () => {
  it('supports full CRUD lifecycle', () => {
    const created = dumpItemsRepo.create({ text: 'buy milk', category: 'errands' });
    expect(created.id).toBeTruthy();
    expect(created.createdAt).toBeGreaterThan(0);

    expect(dumpItemsRepo.get(created.id)).toEqual(created);
    expect(dumpItemsRepo.list().map((item) => item.id)).toContain(created.id);

    const updated = dumpItemsRepo.update(created.id, { promotedTaskId: 'session-1' });
    expect(updated?.promotedTaskId).toBe('session-1');
    expect(dumpItemsRepo.get(created.id)?.promotedTaskId).toBe('session-1');

    dumpItemsRepo.remove(created.id);
    expect(dumpItemsRepo.get(created.id)).toBeUndefined();
    expect(dumpItemsRepo.list().map((item) => item.id)).not.toContain(created.id);
  });
});

describe('intentionsRepo', () => {
  it('supports full CRUD lifecycle', () => {
    const created = intentionsRepo.create({
      cueText: 'when I sit at my desk',
      actionText: 'open the file',
    });
    expect(created.id).toBeTruthy();
    expect(created.createdAt).toBeGreaterThan(0);

    expect(intentionsRepo.get(created.id)).toEqual(created);
    expect(intentionsRepo.list().map((intention) => intention.id)).toContain(created.id);

    const updated = intentionsRepo.update(created.id, { notifyAt: Date.now() + 1000 });
    expect(updated?.notifyAt).toBeDefined();

    intentionsRepo.remove(created.id);
    expect(intentionsRepo.get(created.id)).toBeUndefined();
    expect(intentionsRepo.list().map((intention) => intention.id)).not.toContain(created.id);
  });
});

describe('cross-collection isolation', () => {
  it('does not let repositories sharing contentStorage collide on namespaced keys', () => {
    const session = sessionsRepo.create({ source: 'open' });
    const dumpItem = dumpItemsRepo.create({ text: 'call mom', category: 'people' });
    const intention = intentionsRepo.create({
      cueText: 'when I get home',
      actionText: 'unpack bag',
    });

    expect(sessionsRepo.get(session.id)).toEqual(session);
    expect(dumpItemsRepo.get(dumpItem.id)).toEqual(dumpItem);
    expect(intentionsRepo.get(intention.id)).toEqual(intention);

    expect(sessionsRepo.list().some((record) => record.id === dumpItem.id)).toBe(false);
    expect(dumpItemsRepo.list().some((record) => record.id === session.id)).toBe(false);
    expect(intentionsRepo.list().some((record) => record.id === session.id)).toBe(false);
  });
});

describe('settings persistence', () => {
  it('round-trips locale and notification opt-in through the store', () => {
    useSettingsStore.getState().setLocale('pl');
    useSettingsStore.getState().setNotificationsOptIn(true);

    expect(useSettingsStore.getState().locale).toBe('pl');
    expect(useSettingsStore.getState().notificationsOptIn).toBe(true);
  });
});
