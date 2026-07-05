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
result: [pending]

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
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
