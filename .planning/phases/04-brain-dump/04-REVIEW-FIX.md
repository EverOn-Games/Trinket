---
phase: 04-brain-dump
fixed_at: 2026-07-05T02:40:54Z
review_path: .planning/phases/04-brain-dump/04-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 04: Code Review Fix Report

**Fixed at:** 2026-07-05T02:40:54Z
**Source review:** .planning/phases/04-brain-dump/04-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (2 critical, 4 warning, 1 info)
- Fixed: 7
- Skipped: 0

## Fixed Issues

### CR-01: Native speech-recognition session is never stopped on unmount

**Files modified:** `src/features/brain-dump/useVoiceCapture.ts`, `src/features/brain-dump/__tests__/useVoiceCapture.test.tsx`
**Commit:** bcae886
**Applied fix:** Added an unmount-only `useEffect` cleanup that calls `ExpoSpeechRecognitionModule.stop()` so the native STT session can never keep the microphone listening after the capture view unmounts mid-recording (Save transitioning the view, or navigating away). Added a test that mounts, starts recording, unmounts, and asserts `stop()` was called.

### CR-02: `isPromotingRef` never resets — "Start a session" permanently stops responding

**Files modified:** `src/app/brain-dump.tsx`, `src/app/__tests__/brainDumpItemRow.test.tsx`
**Commit:** f0b01e0
**Applied fix:** Replaced the permanent latch with an 800ms `setTimeout`-based debounce (with the timeout id stored in a ref and cleared on unmount), so a rapid double-tap is still blocked but a legitimate later re-promote (after backing out of `/co-pilot`, per D-15) works. Added a test using `router.back()` (mirroring the existing CR-01/CR-02 `screens.test.tsx` precedent) plus `jest.useFakeTimers()` to prove re-promote succeeds after the debounce window elapses.

### WR-01: `useVoiceCapture.start()` has no re-entrancy guard

**Files modified:** `src/features/brain-dump/useVoiceCapture.ts`, `src/features/brain-dump/__tests__/useVoiceCapture.test.tsx`
**Commit:** bcae886 (same commit as CR-01, same file)
**Applied fix:** Added a `startingRef` guard (set at the top of `start()`, cleared in a `finally` block) mirroring the codebase's `isSavingRef`/`isDeletingRef`/`isPromotingRef` idiom. Added a test firing two overlapping `start()` calls while `requestPermissionsAsync()` is pending and asserting the native `start()`/`requestPermissionsAsync()` calls only fire once.

### WR-02: `draftRef` stale-read race on rapid consecutive final segments

**Files modified:** `src/features/brain-dump/useVoiceCapture.ts`, `src/features/brain-dump/__tests__/useVoiceCapture.test.tsx`
**Commit:** bcae886 (same commit as CR-01, same file)
**Applied fix:** The `'result'` handler now writes `draftRef.current` back synchronously immediately after computing the appended value, rather than relying solely on the prop-sync effect (which only runs after React commits a render). Added a test firing two final segments back-to-back and asserting both lines are present in the final `onChange` call.

### WR-03: `readBrainDumpDraft()` has no defensive try/catch

**Files modified:** `data/draft.ts`, `data/__tests__/draft.test.ts`
**Commit:** 14187e4
**Applied fix:** Wrapped the MMKV `getString()` read in try/catch returning `''` on error, mirroring `data/repositories/dumpItems.ts`'s `readRecord()`/`readIndex()` tolerance pattern. Added a test that mocks `contentStorage.getString` to throw and asserts `readBrainDumpDraft()` returns `''` rather than throwing.

### WR-04: Over-broad keyword stems cause false-positive category assignment

**Files modified:** `src/features/brain-dump/keywords.ts`, `src/features/brain-dump/classify.ts`, `src/features/brain-dump/__tests__/classify.test.ts`
**Commit:** 91d452f
**Applied fix:** Removed the Polish stem `'mamy'` ("we have") from the `people` list — it was misclassifying common sentences using "mamy" as the verb into `people`, unrelated to `'mama'`/`'tata'`. Added whole-word (regex `\b...\b`) matching specifically for the short English stems `'call'`/`'text'` in `classify.ts` (via a small `WORD_BOUNDARY_STEMS` set + `stemMatches` helper), so they no longer substring-match inside unrelated words like "recall", "callback", "context", "textbook". All other PL/EN stems were left intact per the review's explicit scope (broader PL native-speaker review is a separate founder task). Added three tests covering the EN "context"/"recall" false-positive cases and the PL "mamy" false-positive case; all pre-existing `classify.test.ts` assertions (including the "call"-based tie-break test) still pass unchanged.

### IN-01: Dead i18n key `brainDump.description`

**Files modified:** `i18n/locales/en.json`, `i18n/locales/pl.json`
**Commit:** db74508
**Applied fix:** Confirmed via grep that no source file references `brainDump.description` (only a stale planning doc), and removed the key from both locale files. Verified both JSON files remain valid (`JSON.parse` round-trip) after the edit.

## Skipped Issues

None — all 7 in-scope findings were fixed.

---

_Fixed: 2026-07-05T02:40:54Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
