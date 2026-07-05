/**
 * Active-session keep-awake tests (PILOT-02 presence): the screen is held
 * awake exactly while the session screen is mounted AND the mascot is awake.
 * Dozing (the existing 30-min mechanic) releases the hold — the battery
 * valve; ending the session (unmount) releases it too.
 *
 * useElapsedSession is wrapped (not replaced): tests flip a dozing override
 * to simulate the 30-min threshold without faking 30 minutes of timers.
 */
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

import { contentStorage } from '../../../data/mmkv';
import { useSettingsStore } from '../../../data/stores/useSettingsStore';
import en from '../../../i18n/locales/en.json';

import RootLayout from '../_layout';
import HomeScreen from '../index';
import CoPilotScreen from '../co-pilot';

jest.mock('@/features/co-pilot/useElapsedSession', () => {
  const actual = jest.requireActual('@/features/co-pilot/useElapsedSession');
  return {
    useElapsedSession: (...args: unknown[]) => {
      const result = (actual.useElapsedSession as (...a: unknown[]) => object)(...args);
      const override = (globalThis as { __dozingOverride?: boolean }).__dozingOverride;
      return override ? { ...result, isDozing: true } : result;
    },
  };
});

const routeContext = {
  _layout: RootLayout,
  index: HomeScreen,
  'co-pilot': CoPilotScreen,
};

async function startSession() {
  await renderRouter(routeContext, { initialUrl: '/co-pilot' });
  await fireEvent.press(screen.getByText(en.coPilot.setup.justWork.label));
  expect(screen.getByText(en.coPilot.active.endButton)).toBeTruthy();
}

describe('Co-pilot active session keep-awake', () => {
  beforeEach(() => {
    contentStorage.clearAll();
    jest.clearAllMocks();
    (globalThis as { __dozingOverride?: boolean }).__dozingOverride = false;
    useSettingsStore.setState({ onboardingComplete: true, subscriptionCache: null });
  });

  it('holds the screen awake while the session runs with the mascot awake', async () => {
    await startSession();

    expect(activateKeepAwakeAsync).toHaveBeenCalledWith('co-pilot-session');
    expect(deactivateKeepAwake).not.toHaveBeenCalled();
  });

  it('releases the hold when the session ends', async () => {
    await startSession();

    await fireEvent.press(screen.getByText(en.coPilot.active.endButton));

    expect(deactivateKeepAwake).toHaveBeenCalledWith('co-pilot-session');
  });

  it('never takes the hold while the mascot is dozing (battery valve)', async () => {
    (globalThis as { __dozingOverride?: boolean }).__dozingOverride = true;

    await startSession();

    expect(activateKeepAwakeAsync).not.toHaveBeenCalled();
  });
});
