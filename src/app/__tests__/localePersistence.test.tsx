/**
 * usePersistResolvedLocale sentinel tests (WR-01, D-07).
 *
 * `useSettingsStore` and `i18n` are module-level singletons shared across this
 * whole test file, so each test resets them explicitly in `beforeEach` rather
 * than relying on Jest's per-file module isolation (which only isolates across
 * *files*, not across tests within one file).
 */
import { act, renderRouter } from 'expo-router/testing-library';
import { getLocales } from 'expo-localization';

import i18n from '../../../i18n';
import { useSettingsStore } from '../../../data/stores/useSettingsStore';
import { settingsStorage } from '../../../data/mmkv';

import RootLayout from '../_layout';
import HomeScreen from '../index';

const mockGetLocales = getLocales as jest.Mock;

// A minimal route context — only the root layout (which mounts
// usePersistResolvedLocale) and a leaf screen are needed for these tests.
const routeContext = {
  _layout: RootLayout,
  index: HomeScreen,
};

function resetLocaleState() {
  settingsStorage.clearAll();
  useSettingsStore.setState({
    locale: 'en',
    localeResolved: false,
    notificationsOptIn: false,
    subscriptionCache: null,
  });
}

describe('usePersistResolvedLocale (WR-01)', () => {
  beforeEach(async () => {
    resetLocaleState();
    mockGetLocales.mockReturnValue([{ languageCode: 'en' }]);
    await i18n.changeLanguage('en');
  });

  it('resolves the device locale on first boot, when localeResolved starts false', async () => {
    mockGetLocales.mockReturnValue([{ languageCode: 'pl' }]);

    await renderRouter(routeContext, { initialUrl: '/' });

    expect(useSettingsStore.getState().locale).toBe('pl');
    expect(useSettingsStore.getState().localeResolved).toBe(true);
  });

  it('re-applies the persisted locale on a later boot instead of re-resolving from the device', async () => {
    useSettingsStore.setState({ locale: 'pl', localeResolved: true });
    // Device now reports 'en' — if the sentinel incorrectly treated this as a
    // first boot, it would overwrite the persisted 'pl' choice with 'en'.
    mockGetLocales.mockReturnValue([{ languageCode: 'en' }]);

    await renderRouter(routeContext, { initialUrl: '/' });

    expect(i18n.language).toBe('pl');
    expect(useSettingsStore.getState().locale).toBe('pl');
  });

  it('is not fooled by an unrelated store write happening before the effect mounts (WR-01 regression)', async () => {
    // Simulates a future write (e.g. Phase 7 seeding subscriptionCache at
    // startup) landing before this effect runs. With the old
    // settingsStorage.contains('settings') sentinel, any store write flipped
    // the key-existence check and silently force-reverted the language. The
    // explicit localeResolved flag must not be affected by unrelated writes.
    useSettingsStore.setState({ subscriptionCache: { tier: 'free' } });
    mockGetLocales.mockReturnValue([{ languageCode: 'pl' }]);

    await renderRouter(routeContext, { initialUrl: '/' });

    expect(useSettingsStore.getState().locale).toBe('pl');
    expect(useSettingsStore.getState().localeResolved).toBe(true);
  });
});

describe('usePersistLocaleOnChange (WR-02)', () => {
  beforeEach(async () => {
    resetLocaleState();
    mockGetLocales.mockReturnValue([{ languageCode: 'en' }]);
    await i18n.changeLanguage('en');
  });

  it('writes a runtime language change back into the settings store', async () => {
    useSettingsStore.setState({ locale: 'en', localeResolved: true });

    await renderRouter(routeContext, { initialUrl: '/' });

    // Simulates the Phase 8 settings screen calling useLocale().setLocale('pl'),
    // which only calls i18n.changeLanguage — the write-through listener mounted
    // by RootLayout must persist the result. Wrapped in act() because
    // changeLanguage triggers a react-i18next re-render outside of RTL's own
    // render/fireEvent helpers.
    await act(async () => {
      await i18n.changeLanguage('pl');
    });

    expect(useSettingsStore.getState().locale).toBe('pl');
  });
});

// The complementary "does a persisted runtime change survive the next boot"
// behavior is covered by usePersistResolvedLocale's own "re-applies the
// persisted locale on a later boot" test above — write-through (this describe
// block) and boot-time re-application (WR-01) are independently tested seams
// that together implement D-07/WR-02's full persist-then-restore contract.
