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
import {
  ExpoSpeechRecognitionModule,
  __emitSpeechEvent,
  __resetSpeechListeners,
} from 'expo-speech-recognition';

import { useVoiceCapture } from '../useVoiceCapture';

function mockAvailableHappyPath() {
  (ExpoSpeechRecognitionModule.isRecognitionAvailable as jest.Mock).mockReturnValue(true);
  (ExpoSpeechRecognitionModule.supportsOnDeviceRecognition as jest.Mock).mockReturnValue(true);
  (ExpoSpeechRecognitionModule.getSupportedLocales as jest.Mock).mockReturnValue({
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

  it('is unavailable when the active locale is not in installedLocales', async () => {
    (ExpoSpeechRecognitionModule.getSupportedLocales as jest.Mock).mockReturnValue({
      locales: ['en-US', 'pl-PL'],
      installedLocales: ['en-US'], // pl-PL not installed
    });
    const { result } = await renderHook(() => useVoiceCapture('', jest.fn(), 'pl'));
    expect(result.current.available).toBe(false);
  });

  it('treats a throwing getSupportedLocales() as unavailable (Android <=12 defensive probe)', async () => {
    (ExpoSpeechRecognitionModule.getSupportedLocales as jest.Mock).mockImplementation(() => {
      throw new Error('not supported on this Android version');
    });
    const { result } = await renderHook(() => useVoiceCapture('', jest.fn(), 'en'));
    expect(result.current.available).toBe(false);
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
});
