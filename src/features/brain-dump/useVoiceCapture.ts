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
import { useEffect, useRef, useState } from 'react';
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

// Web-Speech-API-shaped error codes (which this library mirrors) that mean
// voice genuinely cannot work until something outside the app changes —
// permission or language support. Everything else ('aborted' from our own
// stop(), 'no-speech' silence timeouts, 'network', 'recognizer-busy', ...)
// is transient: the recording ends but the mic stays offered.
const PERSISTENT_UNAVAILABLE_ERRORS = new Set([
  'not-allowed',
  'service-not-allowed',
  'language-not-supported',
]);

// T-04-06-CRASH: the on-device locale probe lives in probeLocaleInstalled(),
// called from start() — getSupportedLocales() is ASYNC in the real library
// (the original sync destructure here always threw at runtime, silently
// hiding the mic on every device; caught by tsc, fixed post-review). It is
// also undocumented/unsupported on Android 12 and below — an inconclusive or
// throwing probe returns 'unknown' and start() proceeds, letting the existing
// 'error' event fallback catch a genuinely unsupported locale.
async function probeLocaleInstalled(locale: Locale): Promise<'installed' | 'missing' | 'unknown'> {
  try {
    const { installedLocales } = await ExpoSpeechRecognitionModule.getSupportedLocales({});
    if (!Array.isArray(installedLocales) || installedLocales.length === 0) return 'unknown';
    return installedLocales.includes(localeTag(locale)) ? 'installed' : 'missing';
  } catch {
    return 'unknown';
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
  // useElapsedSession.ts's onHeartbeatRef idiom). Written post-render in
  // their own effect, never during render itself (react-hooks/refs).
  const draftRef = useRef(draftText);
  const onChangeRef = useRef(onChange);
  const localeRef = useRef(locale);
  // WR-01: guards start() against a rapid double-tap firing a second
  // requestPermissionsAsync()/start() call while the first is still
  // in-flight (recording is still false during that async window).
  // Mirrors this codebase's isSavingRef/isDeletingRef/isPromotingRef idiom.
  const startingRef = useRef(false);
  useEffect(() => {
    draftRef.current = draftText;
    onChangeRef.current = onChange;
    localeRef.current = locale;
  });

  useSpeechRecognitionEvent('result', (event) => {
    if (!event.isFinal) return; // D-03: only final segments become a new line
    const transcript = event.results[0]?.transcript ?? '';
    const next = appendFinalSegmentToDraft(draftRef.current, transcript);
    // WR-02: write back immediately (synchronously, before the next event)
    // rather than relying solely on the prop-sync effect above, which only
    // runs after React commits a render. Without this, two 'result' events
    // dispatched in the same tick (before the first event's re-render has
    // committed) would both read the same stale draftRef.current and the
    // earlier segment would be silently dropped.
    draftRef.current = next;
    onChangeRef.current(next);
  });

  useSpeechRecognitionEvent('error', (event) => {
    // T-04-06-CRASH / Pitfall 1: never throw — end recording. But only
    // PERSISTENT capability failures may hide the mic: Android emits benign
    // 'error' events ('aborted'/'no-speech') as part of a normal stop(), and
    // treating those as unavailable poisoned the mic until remount
    // (04-HUMAN-UAT device finding, 2026-07-05). Transient errors end the
    // recording and leave the mic offered for the next tap.
    setRecording(false);
    if (PERSISTENT_UNAVAILABLE_ERRORS.has(event.error)) {
      setRuntimeUnavailable(true);
    }
  });

  // CR-01: the JS event listeners registered above are torn down on unmount
  // by useSpeechRecognitionEvent itself (it wraps useEventListener, which
  // returns `() => subscription.remove()`), but that does NOT stop the
  // native audio/recognition session. Without this explicit cleanup, an
  // unmount mid-recording (Save transitioning the view, or navigating away)
  // leaves the microphone listening indefinitely — a privacy/battery leak
  // in a wellness app. `stop()` is a safe no-op when nothing is recording.
  useEffect(() => {
    return () => {
      ExpoSpeechRecognitionModule.stop();
    };
  }, []);

  // Render-time availability is the cheap sync capability check only; the
  // async locale probe happens inside start() where awaiting is possible.
  const available = ExpoSpeechRecognitionModule.isRecognitionAvailable() && !runtimeUnavailable;

  const start = async (): Promise<void> => {
    if (!available || startingRef.current || recording) return;
    startingRef.current = true;

    try {
      // D-03: contextual permission ask — only here, on the first (and
      // every) mic tap, never on mount/upfront.
      const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) {
        setRuntimeUnavailable(true);
        return;
      }

      // The Polish-on-device question (D-02): a definitive 'missing' folds
      // into the same quiet unavailable fallback; 'unknown' (probe
      // unsupported, e.g. Android <=12) proceeds and lets the 'error' event
      // catch a real failure at start.
      if ((await probeLocaleInstalled(localeRef.current)) === 'missing') {
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
    } finally {
      startingRef.current = false;
    }
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
