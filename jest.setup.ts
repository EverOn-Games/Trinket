// Deterministic env for the two env-gated integrations: a developer machine
// may have real keys exported in its shell (.env.local is NOT loaded by
// jest-expo, but a shell export or CI secret would leak in). Tests must always
// start key-less — purchases.test.ts / posthog.test.ts set keys explicitly,
// per-case, when exercising the wired paths.
delete process.env.EXPO_PUBLIC_REVENUECAT_KEY;
delete process.env.EXPO_PUBLIC_POSTHOG_API_KEY;

// Repositories are memory-first (data/repoCache.ts): reads serve from an
// in-memory cache hydrated from MMKV. Tests reset MMKV via
// contentStorage.clearAll() in their own beforeEach hooks — this global hook
// drops every repo cache first so no test can serve a previous test's
// hydrated data. Registered here (not per test file) because the repos are
// module-scoped singletons shared across a file's tests.
beforeEach(() => {
  // Deferred require: repoCache has zero dependencies, but keeping the import
  // inside the hook avoids ordering constraints with the jest.mock calls below.
  const { resetAllRepoCaches } = require('./data/repoCache') as typeof import('./data/repoCache');
  resetAllRepoCaches();
});

// Register the in-memory react-native-mmkv fake (see __mocks__/react-native-mmkv.ts).
// MMKV v4's Nitro Modules binding cannot initialize under Jest's Node environment, so
// every repository/test that touches storage must go through this mock instead.
jest.mock('react-native-mmkv');

// Register the in-memory expo-localization fake (see __mocks__/expo-localization.ts).
// getLocales() wraps a native module unavailable under Jest's Node environment; every
// module/test that reads the device locale (e.g. i18n/index.ts's resolveInitialLocale)
// must go through this mock instead.
jest.mock('expo-localization');

// Register the View-stub lottie-react-native fake (see __mocks__/lottie-react-native.tsx).
// LottieView's native rendering + imperative ref API cannot run under Jest's Node
// environment; every test that renders <Mascot /> or its scheduler must go through
// this mock instead.
jest.mock('lottie-react-native');

// Register the in-memory expo-speech-recognition fake (see
// __mocks__/expo-speech-recognition.ts). The native STT module cannot
// initialize under Jest's Node environment; every module/test that touches
// voice capture (useVoiceCapture) must go through this mock instead. Real
// on-device Polish recognition + segment behavior remain a device-only
// verification (D-02 spike, 04-VALIDATION.md Manual-Only) — this mock only
// closes the permission/availability/error fallback logic at the Jest layer.
jest.mock('expo-speech-recognition');

// Register the expo-notifications fake (see __mocks__/expo-notifications.ts).
// Local-notification scheduling wraps a native module unavailable under Jest;
// the mock answers permission GRANTED and schedules with a fixed id by default
// (the denied path is exercised via per-test overrides). Real delivery timing
// is a device concern, not a Jest one.
jest.mock('expo-notifications');

// Register react-native-worklets' own official Jest mock (Reanimated 4 split its
// worklets runtime out into this separate peer). Without this, importing
// 'react-native-reanimated' under Jest throws "[Worklets] Native part of
// Worklets doesn't seem to be initialized" — the real NativeWorklets module
// tries to initialize a native runtime that doesn't exist under Jest's Node
// environment. Mocking 'react-native-worklets' directly (rather than via a
// custom Jest `resolver` steering '.native' extension resolution — tried first,
// but destabilized manual-mock resolution for other packages like
// lottie-react-native in larger test files) keeps the fix scoped to exactly the
// module that throws.
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));

// Register Reanimated's own official Jest mock (first real usage this phase, for
// the Mascot transition fade). Must be registered after the worklets mock above
// since reanimated's mock.ts internally imports the real './index', which in
// turn requires 'react-native-worklets' — now safely resolving to its mock.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// Register the in-memory react-native-purchases fake (see
// __mocks__/react-native-purchases.ts). RevenueCat's StoreKit/Play Billing
// binding cannot initialize under Jest's Node environment; every test that
// touches the purchases seam (purchases.ts) must go through this mock. Real
// on-device purchases remain a device-only verification.
jest.mock('react-native-purchases');

// Register the expo-keep-awake fake (see __mocks__/expo-keep-awake.ts). The
// native idle-timeout flag can't be set under Jest; the Co-pilot active
// screen's presence-hold goes through this mock.
jest.mock('expo-keep-awake');

// Register the expo-widgets fake (see __mocks__/expo-widgets.ts). WidgetKit/
// ActivityKit bindings can't initialize under Jest; the Live Activity seam
// and widget definition modules go through this mock, which records started
// instances for lifecycle assertions.
jest.mock('expo-widgets');

// Register the react-native-android-widget fake (see
// __mocks__/react-native-android-widget.ts): headless-task registration and
// RemoteViews primitives are device-only.
jest.mock('react-native-android-widget');

// @expo/ui/swift-ui renders SwiftUI on-device; under Jest the widget modules
// only need importable stubs (their JSX never renders in tests).
jest.mock('@expo/ui/swift-ui', () => ({
  Text: () => null,
  Image: () => null,
  VStack: () => null,
  HStack: () => null,
  Spacer: () => null,
  Link: () => null,
}));
jest.mock('@expo/ui/swift-ui/modifiers', () => ({
  font: () => ({}),
  foregroundStyle: () => ({}),
  widgetURL: () => ({}),
  activityBackgroundTint: () => ({}),
}));

// Register the recording posthog-react-native fake (see
// __mocks__/posthog-react-native.ts). The native analytics client cannot
// initialize under Jest's Node environment; the transport wiring (posthog.ts)
// goes through this mock, which records each constructed client for assertion.
jest.mock('posthog-react-native');
