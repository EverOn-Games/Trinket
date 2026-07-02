// Register the in-memory react-native-mmkv fake (see __mocks__/react-native-mmkv.ts).
// MMKV v4's Nitro Modules binding cannot initialize under Jest's Node environment, so
// every repository/test that touches storage must go through this mock instead.
jest.mock('react-native-mmkv');

// Register the in-memory expo-localization fake (see __mocks__/expo-localization.ts).
// getLocales() wraps a native module unavailable under Jest's Node environment; every
// module/test that reads the device locale (e.g. i18n/index.ts's resolveInitialLocale)
// must go through this mock instead.
jest.mock('expo-localization');
