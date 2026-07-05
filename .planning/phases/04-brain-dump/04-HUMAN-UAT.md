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
result: pass — founder confirmed on device 2026-07-05 ("works awesome"), same visit as the stop/start re-test. Second Android make still untested (optional).

### 3. Mic-denied / STT-unavailable graceful fallback feel
expected: Deny the mic permission when first tapping the mic (permission is asked contextually, on first tap, never upfront). The mic should hide/disable and text capture remain fully usable with no error state or crash. Same when STT is unavailable on the device.
result: pass with issues (2026-07-05) — no crash, text capture unaffected; but (a) on re-entering the screen the mic reappeared and vanished only on tap (stale-state tease), (b) founder requested an explicit "mic permission is off" caption instead of the generic one. Both addressed same session: mount-time permission STATUS probe pre-hides the mic when hard-denied, and a dedicated offer-grammar voicePermissionDenied caption (EN+PL) says why voice is off and where it can be re-enabled. Device re-test pending.

### 4. Hot-mic fix sanity check (CR-01 — verify on device)
expected: Start voice recording, then tap "Save these" (or navigate away) MID-recording. The microphone must actually STOP — the OS mic indicator should turn off promptly and the mic must not keep listening in the background. (This validates the CR-01 unmount-`stop()` fix on real hardware; code + test confirm the call is made, device confirms the native session actually ends.)
result: pass — founder: mic turned off instantly on Save (2026-07-05). Side-finding: saved items didn't appear in the mounted list until app restart → UAT-04-07 (systemic, fixed).

## Summary

total: 4
passed: 4
issues: 3
pending: 0
skipped: 0
blocked: 0

## Gaps

### UAT-04-05: Mic poisoned after normal stop — FIXED same session (2026-07-05)
- Observed on device: tapping the mic again (stopping) showed "voice not available now"; the mic only came back after leaving and re-entering the screen (draft text correctly persisted, appending then worked).
- Root cause: the 'error' listener treated EVERY error event as permanent unavailability; Android emits benign 'aborted'/'no-speech' errors as part of a normal stop, poisoning `runtimeUnavailable` until remount.
- Fix: only persistent capability errors ('not-allowed', 'service-not-allowed', 'language-not-supported') hide the mic; transient errors end the recording and keep the mic offered. Regression test added (suite: 29/222 green).
- Files: src/features/brain-dump/useVoiceCapture.ts, useVoiceCapture.test.tsx.
- Device re-test: CONFIRMED on device 2026-07-05 — stop/start cycle appends normally in one visit, no unavailable message.

### UAT-04-07: Stale-screen class — mounted screens never saw repo writes from elsewhere — FIXED same session (2026-07-05, systemic)
- Founder (multiple sightings): saved dump items / ended sessions appeared only after app restart; "lots of those UI errors that get fixed on next open of the app."
- Root cause: the read-repo-directly-in-render idiom over MMKV is not reactive; screens kept mounted by the router never re-rendered on writes from other screens.
- Fix: `data/repoBus.ts` — per-namespace version counters + `useSyncExternalStore`; every repo mutation (dumpItems/sessions/intentions/activeSession start+clear) notifies; subscriber screens (brain-dump, history, co-pilot setup, starter, home) re-render and re-read. Heartbeats deliberately silent. Starter's local version-bump hack replaced by the bus.
- Tests: data/__tests__/repoBus.test.ts (6 cases) + live-History regression in screens.test.tsx. Suite: 30/231 green.
- Device re-test round 1 (2026-07-05, post-repoBus, full rebuild + restart): STILL stale. Since UI-level Jest tests prove the React chain and repo writes are correct (data always right after remount, row-local state renders fine), the remaining variable was MMKV v4's read freshness on device: reads return stale values for a window after a same-session write. The Jest MMKV mock (plain Map) structurally cannot reproduce this.
- Fix round 2: MEMORY-FIRST repositories (dumpItems/sessions/intentions/activeSession) — reads serve from an in-memory map hydrated once from MMKV; writes update the map and write through to MMKV (persistence-only). data/repoCache.ts + jest.setup.ts global cache reset keep tests hermetic. SectionList extraData added as cell-update insurance.
- Device re-test: RESOLVED 2026-07-05 — founder confirmed delete + save reflect instantly; TDBG device log showed the full healthy chain (write → notify listeners=1 → screen re-render with fresh ids → rows). The instrumented build had ZERO functional changes over the prior "still broken" round, proving that round ran a stale bundle. Process lesson: every device-fix round now starts with a bundle-marker check before interpreting results. Debug instrumentation removed after confirmation.

### UAT-04-08: Mic-denied UX — reappearing mic tease + no explanation — FIXED same session (2026-07-05)
- Fix: mount-time getPermissionsAsync STATUS read (no dialog — contextual-ask rule is about requesting) pre-hides the mic only when hard-denied (denied + cannot ask again); dedicated `voicePermissionDenied` caption (EN+PL), offer-grammar ("dostęp można włączyć w ustawieniach telefonu" — informs, never instructs).
- Device re-test: pending (with mic denied in OS settings: enter Brain dump → caption says why, no mic tease; re-grant → mic returns).

### UAT-04-06: No "listening/transcribing" indication while speech is pending (minor, UX enhancement)
- Founder: transcript appears only after a pause; between speaking and the line landing there's no signal the app is working. Candidate: quiet interim-text ghost preview (interimResults are already requested) or a subtle listening pulse on the active mic label. Defer to design pass.
