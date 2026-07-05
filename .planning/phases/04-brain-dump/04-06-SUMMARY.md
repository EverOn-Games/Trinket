---
phase: 04-brain-dump
plan: 06
subsystem: ui
tags: [react-native, expo, expo-speech-recognition, stt, jest, tdd, i18n]

# Dependency graph
requires:
  - phase: 04-brain-dump (plan 03)
    provides: "brain-dump.tsx's viewPhase capture/list state machine, CapturePhase's draft field + onChangeText setter"
  - phase: 04-brain-dump (plan 04)
    provides: "DumpItemRow inline correction/edit/delete/promote affordances (unaffected by this plan)"
provides:
  - "expo-speech-recognition installed + config-plugin-configured (mic/speech-recognition permission strings, Android package-visibility)"
  - "__mocks__/expo-speech-recognition.ts + jest.setup.ts registration — the native STT module is unit-testable without a device"
  - "appendFinalSegmentToDraft(current, transcript) — isolated pure final-segment-append function (Pitfall 2)"
  - "useVoiceCapture(draftText, onChange, locale) — availability probe, contextual permission, recording state, final-segment append, combined fallback signal"
  - "Voice-augment UI wired into brain-dump.tsx's CapturePhase: mic button, recording pill with live duration, mascotGlow ring, voiceUnavailable caption, mascot idle<->presence mapping"
affects: [04-VALIDATION.md (D-02 device spike still open), any later phase touching brain-dump.tsx's capture view]

# Tech tracking
tech-stack:
  added: ["expo-speech-recognition@56.0.1"]
  patterns:
    - "Native-module Jest mock as a plain object of jest.fn()s + a module-scoped listener array + test-only __emitSpeechEvent/__resetSpeechListeners helpers (mirrors __mocks__/expo-localization.ts's per-test-overridable shape, extended with an event emitter since expo-speech-recognition is event-driven, not just a query API)"
    - "Segment-boundary logic isolated in one small pure function (appendFinalSegmentToDraft) specifically so a D-02 device-spike finding about real Android segment behavior is a one-function fix, never scattered across the hook or component"
    - "Combined single fallback signal: useVoiceCapture folds capability-probe unavailability, permission denial, and a runtime error event into one `available` boolean — the capture view renders exactly one shared voiceUnavailable caption, never three distinct UI states (UI-SPEC Flag 9)"
    - "Ref-forwarding for event-hook closures (draftRef/onChangeRef/localeRef written in a post-render effect, never during render — react-hooks/refs) — mirrors useElapsedSession.ts's onHeartbeatRef idiom"
    - "Recording-duration timer: Date.now() is only ever read from event handlers (handleMicPress) or a setInterval callback, never inline in the render body — calling Date.now() conditionally during render trips react-hooks/purity even when guarded"

key-files:
  created:
    - __mocks__/expo-speech-recognition.ts
    - src/features/brain-dump/appendFinalSegmentToDraft.ts
    - src/features/brain-dump/__tests__/appendFinalSegmentToDraft.test.ts
    - src/features/brain-dump/useVoiceCapture.ts
    - src/features/brain-dump/__tests__/useVoiceCapture.test.tsx
  modified:
    - app.json
    - jest.setup.ts
    - i18n/locales/en.json
    - i18n/locales/pl.json
    - src/app/brain-dump.tsx

key-decisions:
  - "requestPermissionsAsync() is called every start() invocation (not gated behind a one-time-ever flag) — the OS itself short-circuits with no dialog once already granted, so this stays simple while still satisfying D-03's 'contextual, never upfront' requirement (the ask only ever happens inside start(), triggered by a mic tap)"
  - "A permission denial and a runtime 'error' event both collapse into the same runtimeUnavailable flag, combined with the capability probe into one available boolean — matches UI-SPEC Flag 9's explicit 'one shared caption, not three distinct messages' design"
  - "Recording-duration state (recordingStartedAt) is set only inside handleMicPress (an event handler) and the interval effect only calls setState inside its setInterval callback — required to satisfy react-hooks/purity (Date.now() is impure, forbidden in the render body even behind a conditional) and react-hooks/set-state-in-effect (a direct top-level setState call in an effect body, not wrapped in an external-system callback, is flagged)"
  - "micLabelKey is returned as the fully-qualified i18n key string (e.g. 'brainDump.capture.micLabel.active') rather than a bare suffix, so the capture view only ever calls t(voice.micLabelKey) with no key-building logic of its own"

patterns-established:
  - "Voice-augment hooks that wrap expo-speech-recognition should probe availability directly in the render body (no memoization) — cheap synchronous native reads, consistent with this codebase's 'read repo/native-state directly in render' precedent (co-pilot.tsx's dumpItemsRepo.list(), useVoiceCapture's isRecognitionAvailable()/getSupportedLocales())"

requirements-completed: [DUMP-02]

# Metrics
duration: 12min
completed: 2026-07-05
---

# Phase 4 Plan 6: Voice-Augment Capture (DUMP-02) Summary

**Installed expo-speech-recognition@56.0.1 with its config plugin and a full Jest mock, then wired a useVoiceCapture hook (contextual permission, availability probe, final-segment append, combined fallback signal) into brain-dump.tsx's capture view — mic button, recording pill, mascot presence mapping, and one shared voiceUnavailable caption for every failure mode.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-05T02:06:46Z (approx, prior plan's docs commit)
- **Completed:** 2026-07-05T02:18:00Z
- **Tasks:** 3 (install/mock/copy, TDD pure-fn + hook, UI wiring)
- **Files modified:** 10 (5 created, 5 modified)

## Accomplishments
- `expo-speech-recognition@56.0.1` installed via `npx expo install` (SDK-pinned) with its config-plugin tuple added to `app.json` (mic + speech-recognition permission strings, Android package-visibility for the Google speech service) — the first native dependency change since Phase 2's Lottie addition
- `__mocks__/expo-speech-recognition.ts` + `jest.mock('expo-speech-recognition')` registration make the entire STT surface (permission, availability, start/stop, result/error events) unit-testable with zero device dependency
- `appendFinalSegmentToDraft` (pure, TDD RED->GREEN): isolates D-03's "final utterance -> new line" logic into one swappable function, closing Pitfall 2
- `useVoiceCapture` (TDD RED->GREEN, 8 test cases): computes availability from `isRecognitionAvailable()` + active-locale-installed (defensive try/catch for Android <=12's unsupported `getSupportedLocales()`), requests permission contextually inside `start()`, appends final segments via the isolated function, and folds permission denial + runtime errors into one combined `available` signal
- Capture view (`brain-dump.tsx`) now renders: an accent-filled mic button with a `mascotGlow` ring while recording, a live `m:ss` recording-status pill, a listening prompt/subcopy swap, an "or type instead" link that focuses the field, a single `voiceUnavailable` caption whenever STT is unavailable/denied/erroring, and a `Mascot` (`subtle` prominence) mapping `idle`<->`presence` around recording — no 6th `MascotState` introduced
- Voice i18n copy (`capture.prompt.listening/listeningSub`, `recordingLabel`, `micLabel.idle/active`, `voiceUnavailable`, `textFallback`) added to both `en.json` and `pl.json`
- `npm run verify` (eslint + hex gate + mascot-asset gate + full Jest suite — 22 suites / 166 tests) is green

## Task Commits

Each task was committed atomically:

1. **Task 1: Install STT, config plugin, Jest mock, voice copy** - `2b57b8f` (feat)
2. **Task 2a: Failing test for appendFinalSegmentToDraft (RED)** - `c9301de` (test)
2. **Task 2b: Implement appendFinalSegmentToDraft (GREEN)** - `9394a1c` (feat)
2. **Task 2c: Failing test for useVoiceCapture (RED)** - `8cb8fa9` (test)
2. **Task 2d: Implement useVoiceCapture (GREEN)** - `37042b2` (feat)
3. **Task 3: Voice capture UI + graceful fallback wiring** - `26c3b3e` (feat)

**Plan metadata:** committed separately after this summary (docs commit)

## Files Created/Modified
- `app.json` - `expo-speech-recognition` config-plugin tuple added to `plugins` (permission strings + Android package-visibility)
- `__mocks__/expo-speech-recognition.ts` - `ExpoSpeechRecognitionModule` (jest.fn()s), `useSpeechRecognitionEvent`, `__emitSpeechEvent`/`__resetSpeechListeners` test helpers
- `jest.setup.ts` - `jest.mock('expo-speech-recognition')` registration, following the existing native-mock convention
- `i18n/locales/en.json` / `pl.json` - voice-augment copy keys added under `brainDump.capture.*`
- `src/features/brain-dump/appendFinalSegmentToDraft.ts` - pure final-segment-append function (trim/collapse whitespace, no-op on empty transcript)
- `src/features/brain-dump/__tests__/appendFinalSegmentToDraft.test.ts` - 6 cases
- `src/features/brain-dump/useVoiceCapture.ts` - availability/permission/recording/append/fallback hook
- `src/features/brain-dump/__tests__/useVoiceCapture.test.tsx` - 8 cases (availability x3, happy-path append, interim-ignored, permission-denied, error-event, micLabelKey)
- `src/app/brain-dump.tsx` - `CapturePhase` extended with the mic button, recording pill, duration timer, mascot, and fallback caption; `formatRecordingDuration` helper added

## Decisions Made
- Permission is requested inside `start()` on every call rather than gated behind a one-time-ever flag — the OS returns immediately with no dialog once already granted, so this stays simple while still satisfying D-03's "contextual, never upfront" requirement.
- A permission denial and a runtime `'error'` event both collapse into the same `runtimeUnavailable` flag, combined with the capability probe into a single `available` boolean — directly implements UI-SPEC Flag 9 ("one shared caption, not three distinct messages").
- The recording-duration timer had to be restructured mid-task after `npm run lint` (part of `npm run verify`) surfaced two `eslint-plugin-react-hooks` findings not anticipated by the plan: `react-hooks/refs` (writing to `.current` during render inside `useVoiceCapture`) and `react-hooks/purity` / `react-hooks/set-state-in-effect` (calling `Date.now()` / `setState` directly in an effect body or render body). Both are auto-fixed per Rule 1 (bugs — the original code would fail this project's own lint gate) — see Deviations below.
- `micLabelKey` is returned as the fully-qualified i18n key (`brainDump.capture.micLabel.active`/`.idle`) so the capture view only ever calls `t(voice.micLabelKey)`, no key-building in the component.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Moved useVoiceCapture's ref writes into a post-render effect**
- **Found during:** Task 3 (`npm run lint` as part of `npm run verify`)
- **Issue:** `draftRef.current = draftText` (and the `onChange`/`locale` equivalents) were assigned directly in the hook's render body, tripping `react-hooks/refs` ("Cannot access refs during render") — a real lint-gate failure, not a style nit.
- **Fix:** Moved all three ref assignments into a single dependency-less `useEffect`, mirroring `useElapsedSession.ts`'s `onHeartbeatRef` post-render-write idiom already established in this codebase.
- **Files modified:** `src/features/brain-dump/useVoiceCapture.ts`
- **Verification:** `npm run lint` clean; all 8 `useVoiceCapture` tests still pass.
- **Committed in:** `26c3b3e` (Task 3 commit)

**2. [Rule 1 - Bug] Restructured the recording-duration timer to avoid impure render-phase Date.now() calls**
- **Found during:** Task 3 (`npm run lint`)
- **Issue:** The original implementation derived `recordingStartedAt` inside a `useEffect` with a direct top-level `setState` call (`react-hooks/set-state-in-effect`), and a follow-up rewrite using the react.dev "adjust state during render" pattern still called `Date.now()` conditionally in the render body, which `react-hooks/purity` forbids outright (impure functions may never run during render, even guarded).
- **Fix:** `recordingStartedAt` is now set only from `handleMicPress` (an event handler) when the user taps the mic; the one real subscription (the 1s duration tick) lives in its own effect that calls `setState` exclusively inside the `setInterval` callback, never directly in the effect body.
- **Files modified:** `src/app/brain-dump.tsx`
- **Verification:** `npm run lint` clean; `npm test -- --testPathPattern=brainDump` and full `npm run verify` (22 suites / 166 tests) green.
- **Committed in:** `26c3b3e` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — lint-gate bugs surfaced by this project's own `eslint-plugin-react-hooks` rules, not present in the plan's original design sketch)
**Impact on plan:** Both fixes are internal restructuring of the hook/component's effect and event-handler boundaries — no change to the plan's required behavior, UI-SPEC copy, or test coverage. No scope creep.

## Issues Encountered
None beyond the two auto-fixed lint findings above.

## User Setup Required

**External native dependency added — a rebuild is required.**

- **Run `npx expo prebuild --clean` after pulling.** This is the first native change since Phase 2's Lottie addition (`app.json`'s `plugins` array gained the `expo-speech-recognition` config-plugin tuple, and `expo-speech-recognition` itself is a new native module). Rebuild the dev client afterward (`npm run android:fresh` / `npm run ios:fresh`, or `eas build` for a device/simulator install) before testing voice capture on device.
- **D-02 device spike still open (manual, tracked in `04-VALIDATION.md`'s Manual-Only Verifications table):** verify on a real low/mid-tier Android device with the system locale set to Polish that (a) `pl-PL` on-device recognition is actually available/installable, and (b) continuous-mode segmentation genuinely produces one final result per spoken pause (D-03's "one utterance = one line" assumption). This container has no physical device access and cannot close this out — all code paths (permission, availability, fallback, segment-append) are fully Jest-verified against the mock, but real-hardware Polish recognition and manufacturer segment-timing variance are NOT verified by this plan's automated suite.

## Next Phase Readiness
- DUMP-02 is code-complete: voice augments the same text field the user can always type into; unavailable/denied/error all degrade to one non-alarming caption with the text field fully usable throughout.
- `appendFinalSegmentToDraft` is isolated as a single-function fix point if the D-02 device spike finds different real-hardware segment behavior — no rework of `useVoiceCapture` or `brain-dump.tsx` should be needed even if that function's internals change.
- Phase 4 (Brain Dump) is now fully code-complete across all 6 plans (DUMP-01 through DUMP-05); remaining open items are the D-02 device spike (this plan) and the standing iOS physical-device verification blocker (both explicitly deferred, non-blocking manual tasks per `04-VALIDATION.md`).

---
*Phase: 04-brain-dump*
*Completed: 2026-07-05*

## Self-Check: PASSED

All 10 created/modified files verified present on disk (app.json, __mocks__/expo-speech-recognition.ts, jest.setup.ts, i18n/locales/{en,pl}.json, src/features/brain-dump/appendFinalSegmentToDraft.ts + its test, src/features/brain-dump/useVoiceCapture.ts + its test, src/app/brain-dump.tsx, this SUMMARY.md); all 7 commit hashes (2b57b8f, c9301de, 9394a1c, 8cb8fa9, 37042b2, 26c3b3e, ee9822d) verified present in git history.
