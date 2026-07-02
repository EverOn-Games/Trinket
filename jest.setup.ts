// Register the in-memory react-native-mmkv fake (see __mocks__/react-native-mmkv.ts).
// MMKV v4's Nitro Modules binding cannot initialize under Jest's Node environment, so
// every repository/test that touches storage must go through this mock instead.
jest.mock('react-native-mmkv');
