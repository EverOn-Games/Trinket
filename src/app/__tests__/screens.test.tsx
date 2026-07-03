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
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { contentStorage } from '../../../data/mmkv';
import { sessionsRepo } from '../../../data/repositories/sessions';
import { dumpItemsRepo } from '../../../data/repositories/dumpItems';
import { activeSessionRepo } from '../../../data/repositories/activeSession';
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
  // All three tests below share one in-memory MMKV instance (the mock's
  // instancesById map lives for the whole test file, see
  // __mocks__/react-native-mmkv.ts) — reset it between tests so each test's
  // session-presence assertions hold regardless of execution order (WR-07).
  beforeEach(() => {
    contentStorage.clearAll();
  });

  it('shows localized empty-state copy on History when no sessions exist', async () => {
    // @testing-library/react-native v14's render() is async — renderRouter's
    // return value must be awaited before the `screen` singleton is populated
    // (setRenderResult runs at the end of the underlying async render call).
    await renderRouter(routeContext, { initialUrl: '/history' });

    expect(screen.getByText(en.history.emptyState)).toBeTruthy();
  });

  it('navigates to /co-pilot without creating a session when the home offer is pressed (D-01, Pitfall 4)', async () => {
    await renderRouter(routeContext, { initialUrl: '/' });

    const before = sessionsRepo.list().length;

    fireEvent.press(screen.getByRole('button', { name: en.home.startSessionOffer }));

    // Home is now plain navigation — the setup screen owns session creation
    // (D-01), so pressing the offer alone must never write a Session record.
    // (Navigation itself to /co-pilot is exercised by the setup-screen
    // integration tests added alongside co-pilot.tsx's rewrite.)
    expect(sessionsRepo.list().length).toBe(before);
  });

  it('still creates zero sessions on a rapid double-press of the home offer (WR-04)', async () => {
    await renderRouter(routeContext, { initialUrl: '/' });

    const before = sessionsRepo.list().length;
    const startOffer = screen.getByRole('button', { name: en.home.startSessionOffer });

    // Two presses fired back-to-back, each awaited independently, simulate
    // a rapid double-tap while still letting each press's state update
    // settle before the next fires (avoids overlapping act() warnings from
    // the resulting navigation).
    await act(async () => {
      fireEvent.press(startOffer);
    });
    await act(async () => {
      fireEvent.press(startOffer);
    });

    expect(sessionsRepo.list().length).toBe(before);
  });

  it('mounts the real <Mascot /> (not the MascotSlot placeholder) on Home', async () => {
    await renderRouter(routeContext, { initialUrl: '/' });

    // Mascot renders a single persistent LottieView (mocked under Jest — see
    // __mocks__/lottie-react-native.tsx) rather than MascotSlot's static box.
    expect(screen.getByTestId('lottie-view-mock')).toBeTruthy();
  });

  it('renders a persisted session as a plain chronological entry on History', async () => {
    sessionsRepo.create({ source: 'quick' });

    await renderRouter(routeContext, { initialUrl: '/history' });

    // contentStorage is reset in beforeEach (WR-07), so exactly the one
    // session created above is present — no leftover pollution from earlier
    // tests to account for.
    expect(screen.getAllByText(en.history.sessionFallbackLabel)).toHaveLength(1);
    expect(screen.queryByText(en.history.emptyState)).toBeNull();
  });
});

describe('Co-pilot setup + active phases (PILOT-01, PILOT-03, T-03-05)', () => {
  beforeEach(() => {
    contentStorage.clearAll();
  });

  it('starts a session from the one-liner path with source "quick" (D-01)', async () => {
    await renderRouter(routeContext, { initialUrl: '/co-pilot' });

    const before = sessionsRepo.list().length;
    const input = screen.getByPlaceholderText(en.coPilot.setup.oneLiner.placeholder);
    // fireEvent is async in @testing-library/react-native v14 — each call must
    // be awaited so the field's focus/text state commits before the "Start"
    // press reads it (chaining un-awaited fireEvent calls produces
    // overlapping act() warnings and a stale `disabled`/text snapshot).
    await fireEvent(input, 'focus');
    await fireEvent.changeText(input, 'write the report');
    await fireEvent.press(screen.getByRole('button', { name: en.coPilot.setup.oneLiner.cta }));

    const sessions = sessionsRepo.list();
    expect(sessions.length).toBe(before + 1);
    const created = sessions[sessions.length - 1];
    expect(created.source).toBe('quick');
    expect(created.taskLabel).toBe('write the report');
  });

  it('starts a session from the "Just work" path with source "open" (D-01)', async () => {
    await renderRouter(routeContext, { initialUrl: '/co-pilot' });

    const before = sessionsRepo.list().length;
    await fireEvent.press(screen.getByRole('button', { name: en.coPilot.setup.justWork.label }));

    const sessions = sessionsRepo.list();
    expect(sessions.length).toBe(before + 1);
    expect(sessions[sessions.length - 1].source).toBe('open');
  });

  it('starts a session from a dump item with source "dump" and links promotedTaskId (D-01, D-02)', async () => {
    const item = dumpItemsRepo.create({ text: 'call the dentist', category: 'people' });

    await renderRouter(routeContext, { initialUrl: '/co-pilot' });

    const before = sessionsRepo.list().length;
    await fireEvent.press(screen.getByText(item.text));

    const sessions = sessionsRepo.list();
    expect(sessions.length).toBe(before + 1);
    const created = sessions[sessions.length - 1];
    expect(created.source).toBe('dump');
    expect(dumpItemsRepo.get(item.id)?.promotedTaskId).toBe(created.id);
  });

  it('clears the active-session pointer and returns Home when End is pressed', async () => {
    await renderRouter(routeContext, { initialUrl: '/co-pilot' });

    await fireEvent.press(screen.getByRole('button', { name: en.coPilot.setup.justWork.label }));
    await fireEvent.press(await screen.findByRole('button', { name: en.coPilot.active.endButton }));

    expect(activeSessionRepo.read()).toBeUndefined();
  });

  it('resumes the active phase on re-entry instead of starting a new session (D-16)', async () => {
    await renderRouter(routeContext, { initialUrl: '/co-pilot' });

    await fireEvent.press(screen.getByRole('button', { name: en.coPilot.setup.justWork.label }));
    const before = sessionsRepo.list().length;

    await renderRouter(routeContext, { initialUrl: '/co-pilot' });

    // Re-entering with a live pointer must land directly on the active
    // phase (the End button is present) and must not create a second
    // Session record for the same intent.
    expect(await screen.findByRole('button', { name: en.coPilot.active.endButton })).toBeTruthy();
    expect(sessionsRepo.list().length).toBe(before);
  });
});
