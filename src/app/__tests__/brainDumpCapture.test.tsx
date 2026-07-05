/**
 * Brain dump capture->save->grouped-list happy-path test (04-03, DUMP-01,
 * D-04/D-05/D-06/D-07/D-12). Mirrors screens.test.tsx's routeContext +
 * beforeEach(contentStorage.clearAll()) pattern.
 *
 * Every fireEvent call is awaited (@testing-library/react-native v14's
 * fireEvent is async — see screens.test.tsx's own precedent/comments).
 */
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { contentStorage } from '../../../data/mmkv';
import { dumpItemsRepo } from '../../../data/repositories/dumpItems';
import en from '../../../i18n/locales/en.json';

import RootLayout from '../_layout';
import BrainDumpScreen from '../brain-dump';

const routeContext = {
  _layout: RootLayout,
  'brain-dump': BrainDumpScreen,
};

describe('Brain dump capture -> save -> grouped list (DUMP-01)', () => {
  beforeEach(() => {
    contentStorage.clearAll();
  });

  it('saves each non-blank line as a separate categorized item and shows them grouped by category (D-04/D-05/D-07/D-12)', async () => {
    await renderRouter(routeContext, { initialUrl: '/brain-dump' });

    const input = screen.getByPlaceholderText(en.brainDump.capture.placeholder);
    await fireEvent.changeText(
      input,
      'call the dentist\n\nfinish the report'
    );
    await fireEvent.press(screen.getByText(en.brainDump.capture.save));

    const items = dumpItemsRepo.list();
    // Exactly the two non-blank lines were persisted — the blank line was
    // silently dropped (D-07).
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.text).sort()).toEqual(
      ['call the dentist', 'finish the report'].sort()
    );
    for (const item of items) {
      expect(['errands', 'work', 'home', 'people', 'someday']).toContain(item.category);
    }

    // The screen transitions to the grouped list and renders each saved
    // item's text under its category section.
    expect(await screen.findByText('call the dentist')).toBeTruthy();
    expect(screen.getByText('finish the report')).toBeTruthy();
  });

  it('is a silent no-op when Save is pressed with only whitespace content (D-05/D-07)', async () => {
    await renderRouter(routeContext, { initialUrl: '/brain-dump' });

    const before = dumpItemsRepo.list().length;
    const input = screen.getByPlaceholderText(en.brainDump.capture.placeholder);
    await fireEvent.changeText(input, '   \n   ');
    await fireEvent.press(screen.getByText(en.brainDump.capture.save));

    expect(dumpItemsRepo.list().length).toBe(before);
    // No items were created, so the screen must remain on the capture view
    // (it never transitions to the list) — the placeholder field is still
    // present.
    expect(screen.getByPlaceholderText(en.brainDump.capture.placeholder)).toBeTruthy();
  });
});
