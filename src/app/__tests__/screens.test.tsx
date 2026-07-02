/**
 * Walking-skeleton end-to-end slice tests (Task 2, FND-04/05, D-03).
 *
 * Renders the real route tree (root layout + screens) via expo-router's
 * testing-library, proving scaffold + routing + theme + i18n + MMKV
 * persistence + one real UI interaction end-to-end at the JS layer. Native
 * on-device persistence is verified separately on hardware (Task 3 human
 * checkpoint).
 *
 * Uses an explicit in-memory route context (not a directory scan) so this
 * test file itself is never treated as a route module.
 */
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { sessionsRepo } from '../../../data/repositories/sessions';
import en from '../../../i18n/locales/en.json';

import RootLayout from '../_layout';
import HomeScreen from '../index';
import CoPilotScreen from '../co-pilot';
import BrainDumpScreen from '../brain-dump';
import StarterScreen from '../starter';
import HistoryScreen from '../history';
import SettingsScreen from '../settings';

// MemoryContext keys are bare route names (no leading "./", no extension) —
// expo-router/testing-library re-derives the synthetic contextKey from these,
// then strips it back down to this exact key when resolving the module. Each
// value may be the component function directly (wrapped in `{ default }`
// internally by inMemoryContext).
const routeContext = {
  _layout: RootLayout,
  index: HomeScreen,
  'co-pilot': CoPilotScreen,
  'brain-dump': BrainDumpScreen,
  starter: StarterScreen,
  history: HistoryScreen,
  settings: SettingsScreen,
};

describe('walking-skeleton slice', () => {
  it('shows localized empty-state copy on History when no sessions exist', async () => {
    // @testing-library/react-native v14's render() is async — renderRouter's
    // return value must be awaited before the `screen` singleton is populated
    // (setRenderResult runs at the end of the underlying async render call).
    await renderRouter(routeContext, { initialUrl: '/history' });

    expect(screen.getByText(en.history.emptyState)).toBeTruthy();
  });

  it('creates exactly one session via sessionsRepo when the home offer is pressed', async () => {
    await renderRouter(routeContext, { initialUrl: '/' });

    const before = sessionsRepo.list().length;

    fireEvent.press(screen.getByRole('button', { name: en.home.startSessionOffer }));

    expect(sessionsRepo.list().length).toBe(before + 1);
  });

  it('renders a persisted session as a plain chronological entry on History', async () => {
    sessionsRepo.create({ source: 'quick' });

    await renderRouter(routeContext, { initialUrl: '/history' });

    // Prior tests in this file may also have created sessions (shared
    // in-memory MMKV mock) — assert at least one plain entry renders,
    // and that the empty state never renders alongside real entries.
    expect(screen.getAllByText(en.history.sessionFallbackLabel).length).toBeGreaterThan(0);
    expect(screen.queryByText(en.history.emptyState)).toBeNull();
  });
});
