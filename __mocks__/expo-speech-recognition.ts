/**
 * In-memory fake of expo-speech-recognition's native module + event-hook
 * surface, used exclusively under Jest. Mirrors __mocks__/lottie-react-native.tsx
 * (imperative API exposed as jest.fn()s) and __mocks__/expo-localization.ts
 * (plain object of per-test-overridable jest.fn()s) — expo-speech-recognition
 * is not a View-rendering native module (no ref/JSX needed), just an
 * imperative module + event-hook surface, so it follows the localization
 * mock's shape most closely.
 *
 * This lets useVoiceCapture's permission/availability/fallback/segment logic
 * be unit-tested without the real native binding. Real on-device Polish
 * recognition + manufacturer continuous-mode segment behavior (D-02's device
 * spike, 04-VALIDATION.md Manual-Only) are NOT verifiable via this mock — it
 * only closes Pitfall 1 (untested fallback states) at the Jest layer.
 */
type ResultEvent = { results: { transcript: string; confidence?: number }[]; isFinal: boolean };
type ErrorEvent = { error: string; message: string };

type ResultListener = (event: ResultEvent) => void;
type ErrorListener = (event: ErrorEvent) => void;

const listeners: { result: ResultListener[]; error: ErrorListener[] } = { result: [], error: [] };

export const ExpoSpeechRecognitionModule = {
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  isRecognitionAvailable: jest.fn(() => true),
  supportsOnDeviceRecognition: jest.fn(() => true),
  getSupportedLocales: jest.fn(() => ({ locales: ['en-US', 'pl-PL'], installedLocales: ['en-US'] })),
  start: jest.fn(),
  stop: jest.fn(),
};

// Test-only listener registration — production code (useVoiceCapture) calls
// this exactly like the real library's hook; each renderHook mount pushes its
// own listener onto these module-scoped arrays. Tests must clear/reset via
// `__resetSpeechListeners()` between cases to avoid cross-test leakage, since
// this mock module persists for the whole Jest module registry lifetime of a
// test file (mirrors mockLottieRef's documented persistence caveat).
export function useSpeechRecognitionEvent(event: 'result' | 'error', listener: ResultListener | ErrorListener) {
  if (event === 'result') listeners.result.push(listener as ResultListener);
  if (event === 'error') listeners.error.push(listener as ErrorListener);
}

// Test helper: simulate a native event firing (not part of the real
// library's API) — production code never calls this.
export const __emitSpeechEvent = {
  result: (event: ResultEvent) => listeners.result.forEach((fn) => fn(event)),
  error: (event: ErrorEvent) => listeners.error.forEach((fn) => fn(event)),
};

// Test helper: clears all registered listeners between tests (renderHook
// mounts a fresh listener on every render, so a `rerender()` or a new test's
// `renderHook()` call would otherwise pile up stale listeners that still fire
// on __emitSpeechEvent calls from a previous test case).
export function __resetSpeechListeners() {
  listeners.result = [];
  listeners.error = [];
}
