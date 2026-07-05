/**
 * repoBus — the reactive layer fixing the stale-screen class found in device
 * UAT (2026-07-05): mounted screens reading repo.list() in render never saw
 * writes made from other screens until a full app restart. These tests pin
 * the contract: every repo mutation notifies its namespace (and 'all'), and
 * useRepoVersion re-renders subscribers exactly then.
 */
import { act, renderHook } from '@testing-library/react-native';

import { useRepoVersion, notifyRepoChanged } from '../repoBus';
import { contentStorage } from '../mmkv';
import { dumpItemsRepo } from '../repositories/dumpItems';
import { sessionsRepo } from '../repositories/sessions';
import { intentionsRepo } from '../repositories/intentions';
import { activeSessionRepo } from '../repositories/activeSession';

beforeEach(() => {
  contentStorage.clearAll();
});

describe('useRepoVersion', () => {
  it('re-renders with a new version when its namespace is notified, and ignores other namespaces', async () => {
    const { result } = await renderHook(() => useRepoVersion('dumpItem'));
    const initial = result.current;

    await act(async () => notifyRepoChanged('session'));
    expect(result.current).toBe(initial);

    await act(async () => notifyRepoChanged('dumpItem'));
    expect(result.current).toBe(initial + 1);
  });

  it("the 'all' channel ticks on every namespace", async () => {
    const { result } = await renderHook(() => useRepoVersion('all'));
    const initial = result.current;

    await act(async () => notifyRepoChanged('session'));
    await act(async () => notifyRepoChanged('intention'));
    expect(result.current).toBe(initial + 2);
  });

  it('stops notifying after unmount (no listener leak)', async () => {
    const { result, unmount } = await renderHook(() => useRepoVersion('dumpItem'));
    const last = result.current;
    await unmount();
    // Must not throw or warn about state updates on unmounted components.
    await act(async () => notifyRepoChanged('dumpItem'));
    expect(last).toBe(last);
  });
});

describe('repo mutations notify the bus', () => {
  it('dumpItemsRepo create/update/remove each tick the dumpItem channel', async () => {
    const { result } = await renderHook(() => useRepoVersion('dumpItem'));
    const v0 = result.current;

    let id = '';
    await act(async () => {
      id = dumpItemsRepo.create({ text: 'x', category: 'someday' }).id;
    });
    expect(result.current).toBe(v0 + 1);

    await act(async () => void dumpItemsRepo.update(id, { text: 'y' }));
    expect(result.current).toBe(v0 + 2);

    await act(async () => dumpItemsRepo.remove(id));
    expect(result.current).toBe(v0 + 3);
  });

  it('sessionsRepo and intentionsRepo mutations tick their channels', async () => {
    const sessions = await renderHook(() => useRepoVersion('session'));
    const intentions = await renderHook(() => useRepoVersion('intention'));
    const s0 = sessions.result.current;
    const i0 = intentions.result.current;

    await act(async () => {
      const s = sessionsRepo.create({ source: 'open' });
      sessionsRepo.update(s.id, { endedAt: s.startedAt + 1000 });
      intentionsRepo.create({ cueText: 'after coffee', actionText: 'open the doc' });
    });

    expect(sessions.result.current).toBe(s0 + 2);
    expect(intentions.result.current).toBe(i0 + 1);
  });

  it('activeSessionRepo notifies on start/clear but NOT on heartbeat', async () => {
    const { result } = await renderHook(() => useRepoVersion('activeSession'));
    const v0 = result.current;

    await act(async () => activeSessionRepo.start('s1', 1000));
    expect(result.current).toBe(v0 + 1);

    await act(async () => activeSessionRepo.heartbeat(2000));
    expect(result.current).toBe(v0 + 1); // heartbeats are deliberately silent

    await act(async () => activeSessionRepo.clear());
    expect(result.current).toBe(v0 + 2);
  });
});
