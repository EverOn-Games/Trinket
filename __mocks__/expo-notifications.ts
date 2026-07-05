/**
 * Jest mock for expo-notifications (Phase 5 Starter). Mirrors the manual-mock
 * precedent of __mocks__/expo-speech-recognition.ts: only the API surface the
 * app actually uses, with call-inspectable jest.fn()s and per-test overrides.
 *
 * Default posture: permission GRANTED, scheduling succeeds with a fixed id —
 * tests override `requestPermissionsAsync` for the denied path.
 */

export const requestPermissionsAsync = jest.fn(async () => ({ granted: true }));

export const scheduleNotificationAsync = jest.fn(async () => 'mock-notification-id');

export const cancelScheduledNotificationAsync = jest.fn(async () => undefined);

export const setNotificationChannelAsync = jest.fn(async () => null);

export const setNotificationHandler = jest.fn();

// Matches the REAL library's STRING enum (NotificationChannelManager.types:
// DEFAULT = 'default') — the numeric 3 the first draft used is actually a
// different level entirely. Mock-drifts-from-real is this codebase's known
// bug class (the getSupportedLocales lesson); keep this aligned.
export const AndroidImportance = { DEFAULT: 'default' };

export const SchedulableTriggerInputTypes = { DATE: 'date' };
