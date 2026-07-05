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
