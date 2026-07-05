/**
 * useVoiceCapture — voice-augment hook for the Brain Dump capture view
 * (D-01, D-02, D-03, DUMP-02). Voice is strictly an augment over the same
 * text field (D-01): an STT failure of any kind (unavailable, permission
 * denied, runtime error) degrades to a single combined `available === false`
 * signal (UI-SPEC Flag 9's shared caption) and never blocks the text field,
 * which this hook has no ability to affect either way.
 *
 * Availability is computed from `isRecognitionAvailable()` plus the active
 * locale's presence in `getSupportedLocales().installedLocales`, read
 * directly on every render (cheap, synchronous native reads — mirrors this
 * codebase's "read repo directly in render" precedent rather than caching a
 * stale probe result). `getSupportedLocales()` is not available on Android
 * 12 and below per the library's README — a throw there is treated as
 * unavailable (defensive, T-04-06-CRASH) rather than propagating.
 *
 * Mic permission is requested contextually (D-03): only inside `start()`,
 * never on mount or upfront. A denial or a mid-recognition 'error' event
 * both fold into the same `runtimeUnavailable` flag, combined with the
 * capability probe into the single `available` boolean the capture view
 * reads to decide whether to render the mic at all (Flag 9 — one shared
 * fallback signal, not three distinct UI states).
 *
 * Final utterance segments append to the draft via the isolated
 * `appendFinalSegmentToDraft` (Pitfall 2) — swappable in one place if the
 * D-02 device spike finds different real-hardware segment behavior. This
 * hook's own logic (permission/availability/fallback/append) is fully
 * verified against `__mocks__/expo-speech-recognition.ts`; real on-device
 * Polish recognition and manufacturer segment timing are NOT verified here
 * (04-VALIDATION.md Manual-Only, D-02 device spike).
 */
import { useRef, useState } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

import type { Locale } from '../../../data/types';
import { appendFinalSegmentToDraft } from './appendFinalSegmentToDraft';

export type UseVoiceCaptureResult = {
  available: boolean;
  recording: boolean;
  micLabelKey: string;
  start: () => Promise<void>;
  stop: () => void;
};

function localeTag(locale: Locale): string {
  return locale === 'pl' ? 'pl-PL' : 'en-US';
}

// T-04-06-CRASH: getSupportedLocales() is undocumented/unsupported on
// Android 12 and below — a throw there hides the mic instead of crashing
// the capture view.
function probeAvailability(locale: Locale): boolean {
  if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) return false;
  try {
    const { installedLocales } = ExpoSpeechRecognitionModule.getSupportedLocales();
    return installedLocales.includes(localeTag(locale));
  } catch {
    return false;
  }
}

export function useVoiceCapture(
  draftText: string,
  onChange: (next: string) => void,
  locale: Locale
): UseVoiceCaptureResult {
  const [recording, setRecording] = useState(false);
  // T-04-06-PERM / Flag 9: a permission denial and a runtime 'error' event
  // both collapse into this single flag, combined below with the capability
  // probe into one `available` signal — never three distinct fallback UIs.
  const [runtimeUnavailable, setRuntimeUnavailable] = useState(false);

  // Ref-forwarded so the event listeners registered below (which close over
  // these on mount) always read the latest draft/onChange/locale without
  // needing to re-register on every host re-render (mirrors
  // useElapsedSession.ts's onHeartbeatRef idiom).
  const draftRef = useRef(draftText);
  draftRef.current = draftText;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const localeRef = useRef(locale);
  localeRef.current = locale;

  useSpeechRecognitionEvent('result', (event) => {
    if (!event.isFinal) return; // D-03: only final segments become a new line
    const transcript = event.results[0]?.transcript ?? '';
    onChangeRef.current(appendFinalSegmentToDraft(draftRef.current, transcript));
  });

  useSpeechRecognitionEvent('error', () => {
    // T-04-06-CRASH / Pitfall 1: never throw — end recording and fold into
    // the same fallback signal the capture view already renders for
    // unavailable/denied.
    setRecording(false);
    setRuntimeUnavailable(true);
  });

  const probedAvailable = probeAvailability(locale);
  const available = probedAvailable && !runtimeUnavailable;

  const start = async (): Promise<void> => {
    if (!available) return;

    // D-03: contextual permission ask — only here, on the first (and every)
    // mic tap, never on mount/upfront.
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      setRuntimeUnavailable(true);
      return;
    }

    ExpoSpeechRecognitionModule.start({
      lang: localeTag(localeRef.current),
      interimResults: true,
      continuous: true, // D-03: needed for one-final-utterance-per-line
      requiresOnDeviceRecognition: true, // on-device-preferred; A4 (04-RESEARCH.md)
    });
    setRecording(true);
  };

  const stop = (): void => {
    ExpoSpeechRecognitionModule.stop();
    setRecording(false);
  };

  return {
    available,
    recording,
    micLabelKey: recording ? 'brainDump.capture.micLabel.active' : 'brainDump.capture.micLabel.idle',
    start,
    stop,
  };
}
