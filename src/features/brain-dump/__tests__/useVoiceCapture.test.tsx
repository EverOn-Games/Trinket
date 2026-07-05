/**
 * Unit tests for useVoiceCapture — permission/availability/segment-append
 * fallback logic (D-01, D-02, D-03, DUMP-02, Pitfall 1). Uses `renderHook` +
 * the `__mocks__/expo-speech-recognition.ts` fake's `__emitSpeechEvent` /
 * `__resetSpeechListeners` test helpers to simulate native events without a
 * device — closing Pitfall 1 (untested fallback states) entirely at the
 * Jest layer. Real on-device Polish recognition + continuous-mode segment
 * timing remain the D-02 device spike (04-VALIDATION.md Manual-Only), NOT
 * covered here. Uses `await renderHook(...)` / `await act(async () => ...)`,
 * mirroring useElapsedSession.test.ts's established idiom for this
 * @testing-library/react-native version.
 */
import { act, renderHook } from '@testing-library/react-native';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

// The __emit/__reset test helpers exist only on the Jest fake (not in the
// real library's type surface), so they are pulled via jest.requireMock and
// typed from the mock module itself — the real-module import above stays
// tsc-clean.
const { __emitSpeechEvent, __resetSpeechListeners } = jest.requireMock(
  'expo-speech-recognition'
) as typeof import('../../../../__mocks__/expo-speech-recognition');

import { useVoiceCapture } from '../useVoiceCapture';

function mockAvailableHappyPath() {
  (ExpoSpeechRecognitionModule.isRecognitionAvailable as jest.Mock).mockReturnValue(true);
  (ExpoSpeechRecognitionModule.supportsOnDeviceRecognition as jest.Mock).mockReturnValue(true);
  // Async, matching the REAL getSupportedLocales(options) => Promise signature.
  (ExpoSpeechRecognitionModule.getSupportedLocales as jest.Mock).mockResolvedValue({
    locales: ['en-US', 'pl-PL'],
    installedLocales: ['en-US', 'pl-PL'],
  });
  (ExpoSpeechRecognitionModule.requestPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
}

describe('useVoiceCapture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetSpeechListeners();
    mockAvailableHappyPath();
  });

  it('is available when recognition and the active locale are both supported', async () => {
    const { result } = await renderHook(() => useVoiceCapture('', jest.fn(), 'en'));
    expect(result.current.available).toBe(true);
  });

  it('is unavailable when isRecognitionAvailable() returns false', async () => {
    (ExpoSpeechRecognitionModule.isRecognitionAvailable as jest.Mock).mockReturnValue(false);
    const { result } = await renderHook(() => useVoiceCapture('', jest.fn(), 'en'));
    expect(result.current.available).toBe(false);
  });

  it('folds a definitively-missing locale into the quiet unavailable fallback at start() (D-02)', async () => {
    // The locale probe is async and therefore lives in start(), not render —
    // getSupportedLocales() returns a Promise in the real library (the
    // original render-time sync probe always threw, hiding the mic on every
    // device; caught by tsc post-review).
    (ExpoSpeechRecognitionModule.getSupportedLocales as jest.Mock).mockResolvedValue({
      locales: ['en-US', 'pl-PL'],
      installedLocales: ['en-US'], // pl-PL not installed
    });
    const { result } = await renderHook(() => useVoiceCapture('', jest.fn(), 'pl'));
    expect(result.current.available).toBe(true); // capability yes; locale unknown until probed

    await act(async () => {
      await result.current.start();
    });

    expect(ExpoSpeechRecognitionModule.start).not.toHaveBeenCalled();
    expect(result.current.recording).toBe(false);
    expect(result.current.available).toBe(false); // now quietly unavailable
  });

  it('treats an inconclusive locale probe as unknown and proceeds (Android <=12 — the error event owns real failures)', async () => {
    (ExpoSpeechRecognitionModule.getSupportedLocales as jest.Mock).mockRejectedValue(
      new Error('not supported on this Android version')
    );
    const { result } = await renderHook(() => useVoiceCapture('', jest.fn(), 'en'));

    await act(async () => {
      await result.current.start();
    });

    // Probe inconclusive → start proceeds; a genuinely unsupported locale
    // would surface via the 'error' event and fold into the same fallback.
    expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalledTimes(1);
    expect(result.current.recording).toBe(true);
  });

  it('appends a final segment via appendFinalSegmentToDraft and surfaces it through onChange', async () => {
    const onChange = jest.fn();
    const { result } = await renderHook(() => useVoiceCapture('existing', onChange, 'en'));

    await act(async () => {
      await result.current.start();
    });
    expect(result.current.recording).toBe(true);

    await act(async () => {
      __emitSpeechEvent.result({ results: [{ transcript: 'buy milk' }], isFinal: true });
    });

    expect(onChange).toHaveBeenCalledWith('existing\nbuy milk');
  });

  it('ignores an interim (non-final) result event', async () => {
    const onChange = jest.fn();
    const { result } = await renderHook(() => useVoiceCapture('', onChange, 'en'));

    await act(async () => {
      await result.current.start();
    });

    await act(async () => {
      __emitSpeechEvent.result({ results: [{ transcript: 'buy m' }], isFinal: false });
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('requests permission on the first start() call and never records if denied, without exposing a blocking state', async () => {
    (ExpoSpeechRecognitionModule.requestPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
    const { result } = await renderHook(() => useVoiceCapture('', jest.fn(), 'en'));

    await act(async () => {
      await result.current.start();
    });

    expect(ExpoSpeechRecognitionModule.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(ExpoSpeechRecognitionModule.start).not.toHaveBeenCalled();
    expect(result.current.recording).toBe(false);
  });

  it('stops recording and falls back gracefully on an error event, without throwing', async () => {
    const { result } = await renderHook(() => useVoiceCapture('', jest.fn(), 'en'));

    await act(async () => {
      await result.current.start();
    });
    expect(result.current.recording).toBe(true);

    await act(async () => {
      __emitSpeechEvent.error({ error: 'network', message: 'boom' });
    });

    expect(result.current.recording).toBe(false);
    expect(result.current.available).toBe(false);
  });

  it('exposes distinct micLabelKey values for idle vs. recording', async () => {
    const { result } = await renderHook(() => useVoiceCapture('', jest.fn(), 'en'));
    expect(result.current.micLabelKey).toBe('brainDump.capture.micLabel.idle');

    await act(async () => {
      await result.current.start();
    });
    expect(result.current.micLabelKey).toBe('brainDump.capture.micLabel.active');
  });

  it('stops the native recognition session on unmount (CR-01: no hot-mic leak)', async () => {
    const { result, unmount } = await renderHook(() => useVoiceCapture('', jest.fn(), 'en'));

    await act(async () => {
      await result.current.start();
    });
    expect(result.current.recording).toBe(true);
    expect(ExpoSpeechRecognitionModule.stop).not.toHaveBeenCalled();

    await unmount();

    expect(ExpoSpeechRecognitionModule.stop).toHaveBeenCalled();
  });

  it('ignores a second start() call fired while the first is still in-flight (WR-01)', async () => {
    let resolvePermission: (value: { granted: boolean }) => void = () => {};
    (ExpoSpeechRecognitionModule.requestPermissionsAsync as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePermission = resolve;
        })
    );
    const { result } = await renderHook(() => useVoiceCapture('', jest.fn(), 'en'));

    await act(async () => {
      const firstStart = result.current.start();
      const secondStart = result.current.start();
      resolvePermission({ granted: true });
      await Promise.all([firstStart, secondStart]);
    });

    expect(ExpoSpeechRecognitionModule.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalledTimes(1);
  });

  it('does not drop a segment when two final results arrive back-to-back (WR-02)', async () => {
    // Deliberately does not call start() first: doing so would cause a
    // setRecording(true)-triggered re-render, and this mock's
    // useSpeechRecognitionEvent (unlike the real library, which subscribes
    // once per mount via a stable listenerRef) re-registers a fresh
    // listener on every render — an unrelated mock limitation this test
    // must avoid tripping to isolate the draftRef race fix under test.
    const onChange = jest.fn();
    const { result: _result } = await renderHook(() => useVoiceCapture('', onChange, 'en'));

    await act(async () => {
      __emitSpeechEvent.result({ results: [{ transcript: 'buy milk' }], isFinal: true });
      __emitSpeechEvent.result({ results: [{ transcript: 'call dentist' }], isFinal: true });
    });

    expect(onChange).toHaveBeenLastCalledWith('buy milk\ncall dentist');
  });
});
