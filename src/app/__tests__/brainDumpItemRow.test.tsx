/**
 * Item-row correction surface tests (Task 2, DUMP-03/DUMP-04, D-11/D-13/D-14/
 * D-15). Renders the real route tree via expo-router's testing-library
 * (mirrors screens.test.tsx's renderRouter/fireEvent/contentStorage.clearAll
 * pattern) and seeds a dumpItemsRepo item directly before each interaction,
 * asserting against the repo (source of truth) rather than component state.
 */
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { router } from 'expo-router';

import { contentStorage } from '../../../data/mmkv';
import { dumpItemsRepo } from '../../../data/repositories/dumpItems';

import RootLayout from '../_layout';
import BrainDumpScreen from '../brain-dump';
import CoPilotScreen from '../co-pilot';
import en from '../../../i18n/locales/en.json';

const routeContext = {
  _layout: RootLayout,
  'brain-dump': BrainDumpScreen,
  'co-pilot': CoPilotScreen,
};

describe('Brain dump item row (DUMP-03, DUMP-04, D-11, D-13, D-14, D-15)', () => {
  beforeEach(() => {
    contentStorage.clearAll();
  });

  it('changes the category in one tap via the inline chip picker (D-11)', async () => {
    const item = dumpItemsRepo.create({ text: 'call plumber', category: 'errands' });

    await renderRouter(routeContext, { initialUrl: '/brain-dump' });

    await fireEvent.press(screen.getByRole('button', { name: en.brainDump.category.errands }));
    await fireEvent.press(screen.getByRole('button', { name: en.brainDump.category.work }));

    expect(dumpItemsRepo.get(item.id)?.category).toBe('work');
  });

  it('requires the inline confirm tap before removing an item (D-13, no bare swipe)', async () => {
    const item = dumpItemsRepo.create({ text: 'to be deleted', category: 'home' });

    await renderRouter(routeContext, { initialUrl: '/brain-dump' });

    // Tapping "Delete" alone must not remove anything yet — it only opens
    // the inline confirm.
    await fireEvent.press(screen.getByRole('button', { name: en.brainDump.item.delete }));
    expect(dumpItemsRepo.get(item.id)).toBeDefined();

    await fireEvent.press(
      screen.getByRole('button', { name: en.brainDump.item.deleteConfirm.confirm })
    );

    expect(dumpItemsRepo.get(item.id)).toBeUndefined();
  });

  it('updates the text via inline edit while leaving the category unchanged (D-13)', async () => {
    const item = dumpItemsRepo.create({ text: 'old text', category: 'people' });

    await renderRouter(routeContext, { initialUrl: '/brain-dump' });

    await fireEvent.press(screen.getByRole('button', { name: en.brainDump.item.edit }));
    await fireEvent.changeText(screen.getByDisplayValue('old text'), 'new text');
    await fireEvent.press(screen.getByRole('button', { name: en.brainDump.item.editDone }));

    const updated = dumpItemsRepo.get(item.id);
    expect(updated?.text).toBe('new text');
    expect(updated?.category).toBe('people');
  });

  it('discards in-progress edits and reverts to the saved text (D-13)', async () => {
    const item = dumpItemsRepo.create({ text: 'keep me', category: 'someday' });

    await renderRouter(routeContext, { initialUrl: '/brain-dump' });

    await fireEvent.press(screen.getByRole('button', { name: en.brainDump.item.edit }));
    await fireEvent.changeText(screen.getByDisplayValue('keep me'), 'discard me');
    await fireEvent.press(screen.getByRole('button', { name: en.brainDump.item.editCancel }));

    expect(dumpItemsRepo.get(item.id)?.text).toBe('keep me');
    expect(screen.getByText('keep me')).toBeTruthy();
  });

  it('promotes with a router push carrying dumpItemId, never creating a session, and the item stays quietly marked (D-14, D-15)', async () => {
    const item = dumpItemsRepo.create({ text: 'call dentist', category: 'people' });
    const pushSpy = jest.spyOn(router, 'push');

    try {
      await renderRouter(routeContext, { initialUrl: '/brain-dump' });

      await fireEvent.press(screen.getByRole('button', { name: en.brainDump.item.promote }));

      expect(pushSpy).toHaveBeenCalledWith({
        pathname: '/co-pilot',
        params: { dumpItemId: item.id },
      });

      // D-15: promote marks, does not consume — the item stays in the list
      // (this file itself never calls sessionsRepo/creates a Session; that
      // remains co-pilot.tsx's job, exercised by 04-05).
      expect(dumpItemsRepo.list().some((existing) => existing.id === item.id)).toBe(true);
    } finally {
      pushSpy.mockRestore();
    }
  });

  it('re-arms the promote guard after its debounce window, so a later re-promote is not silently ignored (CR-02, D-15)', async () => {
    const item = dumpItemsRepo.create({ text: 'call dentist', category: 'people' });
    const pushSpy = jest.spyOn(router, 'push');

    jest.useFakeTimers();
    try {
      await renderRouter(routeContext, { initialUrl: '/brain-dump' });

      await fireEvent.press(screen.getByRole('button', { name: en.brainDump.item.promote }));
      expect(pushSpy).toHaveBeenCalledTimes(1);
      // startFromDumpItem creates a session immediately and jumps straight
      // to the active phase (co-pilot.tsx), skipping setup.
      expect(await screen.findByRole('button', { name: en.coPilot.active.endButton })).toBeTruthy();

      // Back out of /co-pilot without committing to a session — a stack
      // push, not a replace, so brain-dump.tsx (and this row's isPromotingRef)
      // stays mounted underneath (mirrors screens.test.tsx's CR-01/CR-02
      // navigateBackToHome precedent: raw router.back(), still wrapped in
      // our own act()).
      await act(async () => {
        router.back();
      });
      await screen.findByRole('button', { name: en.brainDump.item.promote });

      // Advance past the debounce window: the item stays in the list (D-15
      // marks, does not consume), so re-promoting later must work rather
      // than silently no-op (the bug this finding describes).
      await act(async () => {
        jest.advanceTimersByTime(800);
      });

      await fireEvent.press(screen.getByRole('button', { name: en.brainDump.item.promote }));
      expect(pushSpy).toHaveBeenCalledTimes(2);
      expect(pushSpy).toHaveBeenLastCalledWith({
        pathname: '/co-pilot',
        params: { dumpItemId: item.id },
      });
    } finally {
      pushSpy.mockRestore();
      jest.useRealTimers();
    }
  });
});
