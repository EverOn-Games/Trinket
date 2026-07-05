/**
 * Jest mock for expo-keep-awake (Co-pilot active-session screen hold). The
 * native idle-timeout flag cannot be set under Jest's Node environment;
 * mirrors the manual-mock precedent of __mocks__/expo-notifications.ts:
 * only the surface the app calls, with call-inspectable jest.fn()s.
 */

export const activateKeepAwakeAsync = jest.fn(async () => undefined);

export const deactivateKeepAwake = jest.fn(async () => undefined);

export const useKeepAwake = jest.fn();
