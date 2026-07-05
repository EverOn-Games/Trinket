/**
 * Onboarding route tests (ONBD-01): at most 3 screens, skippable from any
 * step, zero permission requests, optional first task lands as an inert dump
 * item and the user exits to Home. Mirrors the routeContext +
 * contentStorage.clearAll() pattern; every fireEvent awaited (RNTL v14).
 */
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import * as Notifications from 'expo-notifications';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

import { contentStorage } from '../../../data/mmkv';
import { dumpItemsRepo } from '../../../data/repositories/dumpItems';
import { useSettingsStore } from '../../../data/stores/useSettingsStore';
import en from '../../../i18n/locales/en.json';

import RootLayout from '../_layout';
import HomeScreen from '../index';
import OnboardingScreen from '../onboarding';

const routeContext = {
  _layout: RootLayout,
  index: HomeScreen,
  onboarding: OnboardingScreen,
};

describe('Onboarding (ONBD-01)', () => {
  beforeEach(() => {
    contentStorage.clearAll();
    jest.clearAllMocks();
    useSettingsStore.setState({ onboardingComplete: false });
  });

  it('a fresh install is routed from Home into onboarding step 1', async () => {
    await renderRouter(routeContext, { initialUrl: '/' });

    expect(await screen.findByText(en.onboarding.step1.title)).toBeTruthy();
    // Regulatory-safe framing is on the very first screen.
    expect(screen.getByText(en.onboarding.step1.disclaimer)).toBeTruthy();
  });

  it('walks all 3 screens; a typed first task becomes ONE inert dump item and the user lands on Home', async () => {
    await renderRouter(routeContext, { initialUrl: '/onboarding' });

    await fireEvent.press(screen.getByText(en.onboarding.step1.begin));
    expect(screen.getByText(en.onboarding.step2.heading)).toBeTruthy();

    const input = screen.getByPlaceholderText(en.onboarding.step2.placeholder);
    await fireEvent.changeText(input, 'email Marta about the venue');
    await fireEvent.press(screen.getByText(en.onboarding.step2.next));

    expect(screen.getByText(en.onboarding.step3.heading)).toBeTruthy();
    await fireEvent.press(screen.getByText(en.onboarding.step3.done));

    // The task became exactly one inert dump item — categorized, no dates,
    // no reminders, promotable later (the PDA-safe default; NOT auto-started
    // as a session).
    const items = dumpItemsRepo.list();
    expect(items).toHaveLength(1);
    expect(items[0].text).toBe('email Marta about the venue');
    expect(['errands', 'work', 'home', 'people', 'someday']).toContain(items[0].category);
    expect(items[0].promotedTaskId).toBeUndefined();

    expect(useSettingsStore.getState().onboardingComplete).toBe(true);
    // Landed on Home — the session offer is visible but nothing was started.
    expect(await screen.findByText(en.home.startSessionOffer)).toBeTruthy();
  });

  it('skip works from ANY screen and is a first-class exit (no item, flag set)', async () => {
    await renderRouter(routeContext, { initialUrl: '/onboarding' });

    // Skip from step 2, mid-flow, with text already typed — nothing is kept.
    await fireEvent.press(screen.getByText(en.onboarding.step1.begin));
    const input = screen.getByPlaceholderText(en.onboarding.step2.placeholder);
    await fireEvent.changeText(input, 'half-typed thought');
    await fireEvent.press(screen.getByText(en.onboarding.skip));

    expect(dumpItemsRepo.list()).toHaveLength(0);
    expect(useSettingsStore.getState().onboardingComplete).toBe(true);
    expect(await screen.findByText(en.home.startSessionOffer)).toBeTruthy();
  });

  it('an empty first task is a first-class answer — no item created', async () => {
    await renderRouter(routeContext, { initialUrl: '/onboarding' });

    await fireEvent.press(screen.getByText(en.onboarding.step1.begin));
    // The affordance itself reads "Nothing right now" when empty.
    await fireEvent.press(screen.getByText(en.onboarding.step2.nextEmpty));
    await fireEvent.press(screen.getByText(en.onboarding.step3.done));

    expect(dumpItemsRepo.list()).toHaveLength(0);
    expect(useSettingsStore.getState().onboardingComplete).toBe(true);
  });

  it('requests NO permissions anywhere in the flow (ONBD-01 hard constraint)', async () => {
    await renderRouter(routeContext, { initialUrl: '/onboarding' });

    await fireEvent.press(screen.getByText(en.onboarding.step1.begin));
    await fireEvent.press(screen.getByText(en.onboarding.step2.nextEmpty));
    await fireEvent.press(screen.getByText(en.onboarding.step3.done));

    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(ExpoSpeechRecognitionModule.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('a returning user (flag already set) is never bounced back to onboarding', async () => {
    useSettingsStore.setState({ onboardingComplete: true });
    await renderRouter(routeContext, { initialUrl: '/' });

    expect(await screen.findByText(en.home.startSessionOffer)).toBeTruthy();
    expect(screen.queryByText(en.onboarding.step1.title)).toBeNull();
  });
});
