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
import { router } from 'expo-router';

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

  it('announces the one-liner Start CTA disabled state to assistive tech before/after focus (IN-02)', async () => {
    await renderRouter(routeContext, { initialUrl: '/co-pilot' });

    const startButton = screen.getByRole('button', { name: en.coPilot.setup.oneLiner.cta });
    expect(startButton).toBeDisabled();
    expect(startButton.props.accessibilityState?.disabled).toBe(true);

    const input = screen.getByPlaceholderText(en.coPilot.setup.oneLiner.placeholder);
    await fireEvent(input, 'focus');

    expect(startButton).toBeEnabled();
    expect(startButton.props.accessibilityState?.disabled).toBe(false);
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

  it('clears the active-session pointer and enters the ending phase when End is pressed', async () => {
    await renderRouter(routeContext, { initialUrl: '/co-pilot' });

    await fireEvent.press(screen.getByRole('button', { name: en.coPilot.setup.justWork.label }));
    await fireEvent.press(await screen.findByRole('button', { name: en.coPilot.active.endButton }));

    // D-13/D-14: End no longer navigates home directly — it clears the
    // pointer immediately (so reconciliation can never resurrect this
    // session) but stays on-screen for the inline warm ending moment.
    expect(activeSessionRepo.read()).toBeUndefined();
    expect(await screen.findByText(en.coPilot.ending.acknowledgment)).toBeTruthy();
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

  it('resumes with an honest elapsed-only display, never a fabricated 25-minute countdown (WR-02)', async () => {
    // 10 minutes elapsed is the load-bearing choice here: under the old
    // hardcoded-25-minute default this is still comfortably short of the
    // false "0 remaining" auto-retire trip (that only fires once elapsed
    // time would exceed 25 min), so a still-live "elapsed"/"left" toggle
    // caption would be visibly showing at this point if the bug regressed
    // — asserting only past the auto-retire threshold would incorrectly
    // pass either way, since the buggy default silently self-corrects to
    // the same "no caption" end state once it trips.
    const startedAt = Date.now() - 10 * 60 * 1000;
    const session = sessionsRepo.create({ source: 'open' });
    sessionsRepo.update(session.id, { startedAt });
    activeSessionRepo.start(session.id, startedAt);

    await renderRouter(routeContext, { initialUrl: '/co-pilot' });

    expect(await screen.findByRole('button', { name: en.coPilot.active.endButton })).toBeTruthy();
    // D-03: the original length intent (if any) was never persisted, so a
    // resumed session must not guess — no timeMode caption of either kind
    // means the countdown toggle never activated (canToggleTimeMode false),
    // rather than having incorrectly activated against a fabricated default
    // and shown a live countdown against an intent the user never chose.
    expect(screen.queryByText(en.coPilot.active.timeMode.elapsed)).toBeNull();
    expect(screen.queryByText(en.coPilot.active.timeMode.remaining)).toBeNull();
  });
});

describe('Co-pilot ending phase (PILOT-05, T-03-04, T-03-05)', () => {
  beforeEach(() => {
    contentStorage.clearAll();
  });

  it('stores the tapped mood on the session and navigates home (D-13)', async () => {
    const replaceSpy = jest.spyOn(router, 'replace');
    await renderRouter(routeContext, { initialUrl: '/co-pilot' });

    await fireEvent.press(screen.getByRole('button', { name: en.coPilot.setup.justWork.label }));
    const sessions = sessionsRepo.list();
    const sessionId = sessions[sessions.length - 1].id;

    await fireEvent.press(await screen.findByRole('button', { name: en.coPilot.active.endButton }));
    await fireEvent.press(await screen.findByRole('button', { name: en.coPilot.ending.moodCheck.good }));

    expect(sessionsRepo.get(sessionId)?.mood).toBe(3);
    // router.replace('/') — never .push — so back from Home can never return
    // to the now-ended session screen (D-13).
    expect(replaceSpy).toHaveBeenCalledWith('/');
    replaceSpy.mockRestore();
  });

  it('does NOT navigate when the acknowledge animation concludes — the ending moment persists until an explicit choice (revised D-13, 03-HUMAN-UAT.md Test 4)', async () => {
    jest.useFakeTimers();
    const replaceSpy = jest.spyOn(router, 'replace');
    try {
      await renderRouter(routeContext, { initialUrl: '/co-pilot' });

      await fireEvent.press(screen.getByRole('button', { name: en.coPilot.setup.justWork.label }));

      await fireEvent.press(await screen.findByRole('button', { name: en.coPilot.active.endButton }));
      await screen.findByText(en.coPilot.ending.acknowledgment);

      // mascot_acknowledge.json: op=45, fr=30 -> 1500ms duration (mirrors
      // Mascot.test.tsx's own one-shot-completion assertion). Advancing past
      // it with neither a mood tap nor Skip having happened must NOT
      // navigate — REVISED D-13 (03-HUMAN-UAT.md Test 4): the ending moment
      // persists until the user makes an explicit choice.
      await act(async () => {
        jest.advanceTimersByTime(1500);
      });

      expect(replaceSpy).not.toHaveBeenCalled();
      expect(screen.getByText(en.coPilot.ending.acknowledgment)).toBeTruthy();
    } finally {
      replaceSpy.mockRestore();
      jest.useRealTimers();
    }
  });

  it('navigates home leaving mood undefined when Skip is tapped', async () => {
    const replaceSpy = jest.spyOn(router, 'replace');
    try {
      await renderRouter(routeContext, { initialUrl: '/co-pilot' });

      await fireEvent.press(screen.getByRole('button', { name: en.coPilot.setup.justWork.label }));
      const sessions = sessionsRepo.list();
      const sessionId = sessions[sessions.length - 1].id;

      await fireEvent.press(await screen.findByRole('button', { name: en.coPilot.active.endButton }));
      await fireEvent.press(await screen.findByRole('button', { name: en.coPilot.ending.moodCheck.skip }));

      expect(replaceSpy).toHaveBeenCalledWith('/');
      expect(sessionsRepo.get(sessionId)?.mood).toBeUndefined();
    } finally {
      replaceSpy.mockRestore();
    }
  });

  it('never double-navigates or double-writes on a mood tap immediately followed by Skip (T-03-05)', async () => {
    const replaceSpy = jest.spyOn(router, 'replace');
    const updateSpy = jest.spyOn(sessionsRepo, 'update');
    try {
      await renderRouter(routeContext, { initialUrl: '/co-pilot' });

      await fireEvent.press(screen.getByRole('button', { name: en.coPilot.setup.justWork.label }));

      await fireEvent.press(await screen.findByRole('button', { name: en.coPilot.active.endButton }));
      const moodButton = await screen.findByRole('button', { name: en.coPilot.ending.moodCheck.good });
      const skipButton = screen.getByRole('button', { name: en.coPilot.ending.moodCheck.skip });

      // isFinishingRef is a synchronous ref (not state), so even two
      // sequential awaited presses prove the guard: the first press sets it
      // before the second handler ever runs.
      await fireEvent.press(moodButton);
      await fireEvent.press(skipButton);

      expect(replaceSpy).toHaveBeenCalledTimes(1);
      const moodWriteCalls = updateSpy.mock.calls.filter(
        ([, patch]) => patch !== undefined && 'mood' in (patch as Record<string, unknown>)
      );
      expect(moodWriteCalls.length).toBeLessThanOrEqual(1);
    } finally {
      replaceSpy.mockRestore();
      updateSpy.mockRestore();
    }
  });
});

describe('Co-pilot promote hand-off (DUMP-04, D-14, D-15)', () => {
  beforeEach(() => {
    contentStorage.clearAll();
  });

  it('starts a session from a dumpItemId route param via the existing startFromDumpItem/beginSession path', async () => {
    const item = dumpItemsRepo.create({ text: 'call the bank', category: 'errands' });
    const before = sessionsRepo.list().length;

    await renderRouter(routeContext, { initialUrl: `/co-pilot?dumpItemId=${item.id}` });

    // The existing End button appearing proves beginSession/flowPhase ran —
    // the same reused Phase 3 path a manual dump-item tap goes through.
    expect(await screen.findByRole('button', { name: en.coPilot.active.endButton })).toBeTruthy();

    const sessions = sessionsRepo.list();
    expect(sessions.length).toBe(before + 1);
    const created = sessions[sessions.length - 1];
    expect(created.source).toBe('dump');
    expect(created.taskLabel).toBe('call the bank');

    // D-15: promote marks, does not consume — the item stays in the list,
    // quietly linked to the new session.
    expect(dumpItemsRepo.get(item.id)?.promotedTaskId).toBe(created.id);
    expect(dumpItemsRepo.list().map((i) => i.id)).toContain(item.id);
  });

  it('does not start a second session when a live/resumable session already exists (resume priority)', async () => {
    const liveSession = sessionsRepo.create({ source: 'open' });
    activeSessionRepo.start(liveSession.id, liveSession.startedAt);

    const item = dumpItemsRepo.create({ text: 'water the plants', category: 'home' });
    const before = sessionsRepo.list().length;

    await renderRouter(routeContext, { initialUrl: `/co-pilot?dumpItemId=${item.id}` });

    // Resumes the pre-existing live session instead of starting a new one
    // from the dumpItemId param.
    expect(await screen.findByRole('button', { name: en.coPilot.active.endButton })).toBeTruthy();
    expect(sessionsRepo.list().length).toBe(before);
    expect(dumpItemsRepo.get(item.id)?.promotedTaskId).toBeUndefined();
  });
});

describe('History quiet-log rows (PILOT-07, D-15)', () => {
  beforeEach(() => {
    contentStorage.clearAll();
  });

  it("renders a session's duration and mood glyph, with no day-group headers", async () => {
    const startedAt = Date.now() - 5 * 60 * 1000;
    const created = sessionsRepo.create({ source: 'quick', taskLabel: 'stretch' });
    sessionsRepo.update(created.id, { startedAt, endedAt: startedAt + 5 * 60 * 1000, mood: 2 });

    await renderRouter(routeContext, { initialUrl: '/history' });

    // count=5 resolves to English's "other" CLDR plural category.
    const expectedDuration = en.history.duration_other.replace('{{count}}', '5');
    expect(await screen.findByText(expectedDuration)).toBeTruthy();
    expect(screen.getByText('😐')).toBeTruthy();
    // D-15: still a flat quiet log — no day-group heading of any kind.
    expect(screen.queryByText(/^(Today|Yesterday|This week)$/)).toBeNull();
  });

  it('shows "Under a minute" instead of "0 min" for a sub-minute session', async () => {
    const startedAt = Date.now() - 10 * 1000;
    const created = sessionsRepo.create({ source: 'open' });
    sessionsRepo.update(created.id, { startedAt, endedAt: startedAt + 10 * 1000 });

    await renderRouter(routeContext, { initialUrl: '/history' });

    expect(await screen.findByText(en.history.durationLessThanMinute)).toBeTruthy();
  });
});

describe('Home resume card (PILOT-06, D-11, D-12, T-03-05)', () => {
  beforeEach(() => {
    contentStorage.clearAll();
  });

  it('shows the resume card (not the primary offer) when a live session pointer exists at render (D-11)', async () => {
    const session = sessionsRepo.create({ source: 'quick', taskLabel: 'write the report' });
    activeSessionRepo.start(session.id, session.startedAt, session.taskLabel);

    await renderRouter(routeContext, { initialUrl: '/' });

    // Continuity-only copy: the kicker renders, and the withLabel body
    // interpolates the pointer's own taskLabel — never "interrupted"/
    // "paused"/"you left" anywhere (D-11).
    expect(await screen.findByText(en.home.resumeCard.kicker)).toBeTruthy();
    expect(
      screen.getByText(en.home.resumeCard.withLabel.replace('{{taskLabel}}', 'write the report'))
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: en.home.startSessionOffer })).toBeNull();
  });

  it('"Resume" navigates to the live session without creating a new one (D-16)', async () => {
    const session = sessionsRepo.create({ source: 'open' });
    activeSessionRepo.start(session.id, session.startedAt);
    const before = sessionsRepo.list().length;

    await renderRouter(routeContext, { initialUrl: '/' });

    await fireEvent.press(await screen.findByRole('button', { name: en.home.resumeCard.resume }));

    // co-pilot.tsx's own flowPhase initializer resumes the active phase
    // directly from the still-live pointer — no second Session is created.
    expect(await screen.findByRole('button', { name: en.coPilot.active.endButton })).toBeTruthy();
    expect(sessionsRepo.list().length).toBe(before);
  });

  it('"Not now" silently ends the session at lastAliveAt and clears the pointer, with no confirmation (D-11)', async () => {
    const session = sessionsRepo.create({ source: 'open' });
    activeSessionRepo.start(session.id, session.startedAt);
    const pointerBeforeDismiss = activeSessionRepo.read();

    await renderRouter(routeContext, { initialUrl: '/' });

    await fireEvent.press(await screen.findByRole('button', { name: en.home.resumeCard.notNow }));

    expect(activeSessionRepo.read()).toBeUndefined();
    expect(sessionsRepo.get(session.id)?.endedAt).toBe(pointerBeforeDismiss?.lastAliveAt);
    // Home falls back to the normal primary offer, silently — no toast, no
    // Alert, no lingering resume card.
    expect(await screen.findByRole('button', { name: en.home.startSessionOffer })).toBeTruthy();
    expect(screen.queryByText(en.home.resumeCard.kicker)).toBeNull();
  });

  it('does not show a resume card for a stale pointer — it is reconciled at boot and appears as an ordinary History row (D-12)', async () => {
    const staleStartedAt = Date.now() - 20 * 60 * 60 * 1000; // 20h ago
    const staleLastAliveAt = Date.now() - 13 * 60 * 60 * 1000; // 13h ago — past the 12h threshold
    const session = sessionsRepo.create({ source: 'quick', taskLabel: 'overnight task' });
    sessionsRepo.update(session.id, { startedAt: staleStartedAt });
    activeSessionRepo.start(session.id, staleStartedAt, session.taskLabel);
    activeSessionRepo.heartbeat(staleLastAliveAt);

    await renderRouter(routeContext, { initialUrl: '/' });

    // Home: zero mention of the stale session — no resume card, ever — and
    // the pointer itself has already been silently reconciled by the boot
    // sweep (D-12).
    expect(screen.queryByText(en.home.resumeCard.kicker)).toBeNull();
    expect(await screen.findByRole('button', { name: en.home.startSessionOffer })).toBeTruthy();
    expect(activeSessionRepo.read()).toBeUndefined();
    expect(sessionsRepo.get(session.id)?.endedAt).toBe(staleLastAliveAt);

    // History: the reconciled session reads as an ordinary completed row —
    // zero interruption/pause language anywhere (PILOT-06 "zero mention").
    await renderRouter(routeContext, { initialUrl: '/history' });
    expect(await screen.findByText('overnight task')).toBeTruthy();
    expect(screen.queryByText(/interrupt|paused|you left/i)).toBeNull();
  });
});

describe('Home focus-reset guards after back-navigation (CR-01, CR-02)', () => {
  beforeEach(() => {
    contentStorage.clearAll();
  });

  // Simulates "back out of /co-pilot to the still-mounted Home instance
  // beneath it" via the imperative router directly, wrapped in our own
  // act(). This is deliberately the raw `router.back()` (imported straight
  // from 'expo-router', same singleton `jest.spyOn(router, 'replace')` uses
  // elsewhere in this file) rather than `testRouter.back()`:
  // `testRouter.back()`'s own wrapper reads `router.canGoBack()` and (when
  // given a path) asserts via `toHavePathnameWithParams` against the bare
  // re-exported `screen` — in this project's installed
  // expo-router@~56.2.12 + @testing-library/react-native@14.0.1
  // combination that matcher throws ("screen.getPathnameWithParams is not a
  // function", since that introspection method only exists on
  // renderRouter's own return value, not the bare `screen` singleton), and
  // separately, going through `testRouter`'s wrapper at all left the global
  // router store broken for every subsequent `renderRouter` call for the
  // rest of the test file in an isolated repro. Calling `router.back()`
  // directly (still inside `act()`, still asserting the resulting UI via
  // `screen.findBy*` below) avoids both: it is the same underlying pop
  // used by a real hardware back / header back button / iOS swipe-back, and
  // — confirmed via an instrumented mount-counter spike — correctly pops to
  // Home's *existing* instance (mount count stays at 1) rather than
  // mounting a fresh one, which is the exact precondition CR-01/CR-02 need:
  // a remounted Home would trivially reset a useRef guard on its own,
  // making the regression untestable.
  async function navigateBackToHome(): Promise<void> {
    await act(async () => {
      router.back();
    });
  }

  it('re-enables the primary offer after backing out of /co-pilot without starting a session (CR-01)', async () => {
    await renderRouter(routeContext, { initialUrl: '/' });

    const before = sessionsRepo.list().length;
    await fireEvent.press(screen.getByRole('button', { name: en.home.startSessionOffer }));
    expect(await screen.findByText(en.coPilot.setup.subheading)).toBeTruthy();

    // Back out without committing to a session. Home is not unmounted by
    // this — Expo Router's Stack keeps a popped-back-to screen's prior
    // instance mounted — so the CR-01 regression is exactly "the same
    // instance's isStartingSessionRef is still true, and the button is now
    // permanently dead".
    await navigateBackToHome();

    await fireEvent.press(await screen.findByRole('button', { name: en.home.startSessionOffer }));

    // A dead button would never navigate a second time; reaching the setup
    // screen again proves the guard reset on refocus instead of staying
    // permanently latched.
    expect(await screen.findByText(en.coPilot.setup.subheading)).toBeTruthy();
    expect(sessionsRepo.list().length).toBe(before);
  });

  it('re-enables Resume after backing out of a still-live session without ending it (CR-02)', async () => {
    const session = sessionsRepo.create({ source: 'open' });
    activeSessionRepo.start(session.id, session.startedAt);

    await renderRouter(routeContext, { initialUrl: '/' });

    await fireEvent.press(await screen.findByRole('button', { name: en.home.resumeCard.resume }));
    expect(await screen.findByRole('button', { name: en.coPilot.active.endButton })).toBeTruthy();

    // Back out of the still-live session (never pressed End) — the resume
    // card's pointer is unchanged, so it must still render, and Resume must
    // still respond rather than being permanently dead from the first press
    // (CR-02).
    await navigateBackToHome();

    expect(await screen.findByText(en.home.resumeCard.kicker)).toBeTruthy();
    await fireEvent.press(await screen.findByRole('button', { name: en.home.resumeCard.resume }));

    expect(await screen.findByRole('button', { name: en.coPilot.active.endButton })).toBeTruthy();
  });
});
