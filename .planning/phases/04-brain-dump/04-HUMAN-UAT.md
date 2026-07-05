---
status: partial
phase: 04-brain-dump
source: [04-VERIFICATION.md, 04-VALIDATION.md]
started: 2026-07-03T04:30:00Z
updated: 2026-07-03T04:30:00Z
---

## Current Test

[awaiting human testing on a physical / emulated Android device with Polish (pl-PL) system locale]

> **Prerequisite:** run `npx expo prebuild --clean` after pulling, then a dev-client rebuild — Phase 4 added the `expo-speech-recognition` native dependency + config plugin (first native change since Phase 2). Voice will not run in Expo Go.

## Tests

### 1. Real Polish (pl-PL) on-device speech recognition
expected: On a real device with pl-PL installed, tap the mic on the Brain dump capture screen and speak several Polish items. The transcript appears live in the field; on-device recognition works (ideally verifiable in airplane mode) or degrades gracefully. This is the D-02 spike — if Polish on-device is unavailable, that's the decision point flagged in CONTEXT D-02 (accept EN-on-device-only? network recognizer? EN-only beta?).
result: pass — founder: "works amazingly well" (2026-07-05). D-02 spike resolved: Polish recognition works on device. Transcript appears per finished utterance (after a pause), not word-by-word — by design (D-03 final segments), but see gap UAT-04-06 (listening indicator). Airplane-mode (strict on-device proof) not explicitly exercised — optional follow-up.

### 2. Utterance segmentation → one line per spoken pause
expected: Speak 3 distinct items with clear pauses; assert 3 separate lines appear in the field (each final utterance segment = one new line, D-03). Repeat on a second Android make if available (Samsung etc.) — manufacturer SpeechRecognizer variants may segment differently. If they diverge, the segment logic is isolated in `appendFinalSegmentToDraft.ts` for a one-function fix.
result: [pending]

### 3. Mic-denied / STT-unavailable graceful fallback feel
expected: Deny the mic permission when first tapping the mic (permission is asked contextually, on first tap, never upfront). The mic should hide/disable and text capture remain fully usable with no error state or crash. Same when STT is unavailable on the device.
result: [pending]

### 4. Hot-mic fix sanity check (CR-01 — verify on device)
expected: Start voice recording, then tap "Save these" (or navigate away) MID-recording. The microphone must actually STOP — the OS mic indicator should turn off promptly and the mic must not keep listening in the background. (This validates the CR-01 unmount-`stop()` fix on real hardware; code + test confirm the call is made, device confirms the native session actually ends.)
result: [pending]

## Summary

total: 4
passed: 1
issues: 1
pending: 3
skipped: 0
blocked: 0

## Gaps

### UAT-04-05: Mic poisoned after normal stop — FIXED same session (2026-07-05)
- Observed on device: tapping the mic again (stopping) showed "voice not available now"; the mic only came back after leaving and re-entering the screen (draft text correctly persisted, appending then worked).
- Root cause: the 'error' listener treated EVERY error event as permanent unavailability; Android emits benign 'aborted'/'no-speech' errors as part of a normal stop, poisoning `runtimeUnavailable` until remount.
- Fix: only persistent capability errors ('not-allowed', 'service-not-allowed', 'language-not-supported') hide the mic; transient errors end the recording and keep the mic offered. Regression test added (suite: 29/222 green).
- Files: src/features/brain-dump/useVoiceCapture.ts, useVoiceCapture.test.tsx.
- Device re-test: pending (pull + Metro reload, then stop/start the mic repeatedly in one visit).

### UAT-04-06: No "listening/transcribing" indication while speech is pending (minor, UX enhancement)
- Founder: transcript appears only after a pause; between speaking and the line landing there's no signal the app is working. Candidate: quiet interim-text ghost preview (interimResults are already requested) or a subtle listening pulse on the active mic label. Defer to design pass.
