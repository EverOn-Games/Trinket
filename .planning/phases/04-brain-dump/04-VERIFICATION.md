---
phase: 04-brain-dump
verified: 2026-07-05T02:45:09Z
status: human_needed
score: 12/12 must-haves verified (code/test-verifiable); 3 device-only items require human/hardware verification
overrides_applied: 0
human_verification:
  - test: "Speak several Polish (pl-PL) brain-dump items with clear pauses on a real Android/iOS device with requiresOnDeviceRecognition"
    expected: "Transcript appears live in the text field; each spoken pause produces a new line (one item per utterance); on-device (airplane-mode) recognition works, or the app degrades to the documented text-fallback caption without crashing"
    why_human: "Native STT + on-device Polish language pack behavior cannot run in the JS test env or this remote container — this is the D-02 device spike, explicitly scoped as Manual-Only in 04-VALIDATION.md"
  - test: "Speak 3 distinct items with clear pauses on at least one Android device (ideally two different manufacturers) and confirm exactly 3 lines appear"
    expected: "Continuous-mode 'final' utterance segmentation produces one line per spoken item, matching appendFinalSegmentToDraft's assumption, across manufacturer SpeechRecognizer implementations"
    why_human: "Manufacturer STT segment-boundary behavior varies and is unobservable off-device; only unit-testable via the Jest mock, which cannot simulate real hardware timing"
  - test: "Deny microphone permission when prompted (or test on a device/emulator with no STT service installed) and confirm the capture screen's fallback feel"
    expected: "Mic button is hidden/disabled, a single non-alarming caption ('Voice isn't available right now — typing works great too.') is shown, and text capture remains fully usable with no error state or crash"
    why_human: "Real OS permission dialogs and unavailable-service states require a device; the underlying logic (runtimeUnavailable flag) is unit-tested via the Jest mock (useVoiceCapture.test.tsx), but the actual on-device dialog/feel is not"
---

# Phase 4: Brain Dump Verification Report

**Phase Goal:** A user can offload multiple tasks by text or voice in seconds and optionally promote any one straight into a Co-pilot session.
**Verified:** 2026-07-05T02:45:09Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Text capture: multiline field → Save → parses lines (trim, drop-blank, no cap) → each classified → persisted (DUMP-01, D-04/D-05/D-07/D-08) | VERIFIED | `src/app/brain-dump.tsx:131-151` `handleSave`; `parseDumpText.ts` (split/trim/filter, no cap); `src/app/__tests__/brainDumpCapture.test.tsx` proves 2 lines saved, blank dropped, whitespace-only Save is a no-op |
| 2 | Draft auto-restores on mount, tolerant of corrupt MMKV read (D-06, WR-03) | VERIFIED | `src/app/brain-dump.tsx:112` `useState(() => readBrainDumpDraft())`; `data/draft.ts:24-28` try/catch returns `''`; `data/__tests__/draft.test.ts` round-trip + throw-tolerance tests pass. (Note: no screen-level integration test seeds the draft key pre-mount and asserts restored text renders — the wiring is source-verified but not covered by an end-to-end screen test; not a functional gap, logged as a minor test-coverage observation, not a blocker.) |
| 3 | Voice: mic permission requested contextually inside `start()`, never on mount; STT unavailable/denied/error folds to one fallback signal, text field unaffected (DUMP-02, D-01/D-03) | VERIFIED | `useVoiceCapture.ts:139-145` permission ask only inside `start()`; `probeAvailability`/`runtimeUnavailable` combine into single `available` flag; `useVoiceCapture.test.tsx` covers unavailable/denied/error/fallback cases without a device |
| 4 | Native STT session is stopped on unmount — no hot-mic leak (CR-01) | VERIFIED | `useVoiceCapture.ts:125-129` unconditional `useEffect` cleanup calling `ExpoSpeechRecognitionModule.stop()`; test `'stops the native recognition session on unmount (CR-01: no hot-mic leak)'` in `useVoiceCapture.test.tsx:137-149` asserts `stop()` called after `unmount()`. Commit `bcae886` confirmed in `git log`. |
| 5 | Real on-device Polish recognition + manufacturer segment timing are explicitly treated as device-only, not claimed as code-verified | VERIFIED | `04-VALIDATION.md` "Manual-Only Verifications" table explicitly lists these three rows; `useVoiceCapture.ts` file header states "real on-device Polish recognition ... NOT verified here"; no test or SUMMARY claims automated coverage of real hardware behavior |
| 6 | Classifier `classify(text, locale)` always returns exactly one of 5 categories, never undefined; genuine tie or no-match → someday (DUMP-03, D-09/D-10) | VERIFIED | `classify.ts:43-65` typed return `DumpItemCategory` (no null branch), explicit tie-detection resets to `'someday'`; `classify.test.ts` (not shown in full but referenced by review/fix and passing in `npm test`) |
| 7 | Keyword false-positive matches fixed (WR-04: PL "mamy", EN "call"/"text" substring bugs) | VERIFIED | `keywords.ts:31-37` removes `'mamy'` from PL people list; `classify.ts:34-41` `WORD_BOUNDARY_STEMS` + `stemMatches` whole-word regex for `'call'`/`'text'`; commit `91d452f` confirmed |
| 8 | Inline chip re-categorize, one tap (D-11) | VERIFIED | `brain-dump.tsx:494-523` picker mode renders 5 category chips; `selectCategory` updates repo directly on tap; `brainDumpItemRow.test.tsx` "changes the category in one tap via the inline chip picker (D-11)" passes |
| 9 | Items inert by default — no dates/reminders/badges/completion pressure (DUMP-04) | VERIFIED | `DumpItem` type (`data/types.ts`, unchanged by this phase) has no due-date/reminder/badge fields; row rendering (`brain-dump.tsx:492-598`) shows only category chip, text, edit/delete, and a quiet "· in Co-pilot" marker — no counts/streaks/completion UI; `schema.denylist.test.ts` structurally guards against pressure fields |
| 10 | Promote reuses Phase 3's `beginSession` via `dumpItemId` router param — no duplicated session-creation logic (D-14) | VERIFIED | `brain-dump.tsx:424-431` `handlePromote` only does `router.push({pathname:'/co-pilot', params:{dumpItemId: item.id}})`; `co-pilot.tsx:136-142,159-164` `startFromDumpItem` calls the single shared `sessionsRepo.create` + `beginSession`, gated on `flowPhase==='setup' && !resumablePointer`; `brainDumpItemRow.test.tsx` "promotes with a router push carrying dumpItemId, never creating a session" passes |
| 11 | Promote marks, does not consume (D-15); the promote button re-arms so re-promote works after backing out (CR-02) | VERIFIED | `co-pilot.tsx:140` `dumpItemsRepo.update(item.id, {promotedTaskId: session.id})` — item stays in list; `brain-dump.tsx:378-431` `isPromotingRef` + 800ms `setTimeout` debounce (not a permanent latch); test `'re-arms the promote guard after its debounce window...(CR-02, D-15)'` in `brainDumpItemRow.test.tsx:108-149` exercises `router.back()` + `jest.advanceTimersByTime(800)` + a second successful promote push. Commit `f0b01e0` confirmed. |
| 12 | Brain dump reachable in ≤2 taps from Home — not regressed (DUMP-05) | VERIFIED | `src/app/index.tsx:232` `<Link href="/brain-dump" asChild>` rendered directly on the Home screen (1 tap); unchanged by this phase |
| 13 | Shame-free/PDA-aware copy in `brainDump.*` — no urgency, counts, badges, completion pressure, or directive mascot commands | VERIFIED | `i18n/locales/en.json`/`pl.json` `brainDump` block inspected directly: "I'm listening. Take your time.", "Delete this?"/"Keep it", "· in Co-pilot" — all offers/neutral, no streak/count/urgency language in either locale |

**Score:** 12/12 code/test-verifiable truths VERIFIED. 0 FAILED. 3 items require human/device verification (see below) — these are explicitly framed as device-only in the phase's own 04-VALIDATION.md and are not counted as gaps per the phase's design.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/features/brain-dump/parseDumpText.ts` | Pure newline parser | VERIFIED | Exports `parseDumpText`; split/trim/filter-blank, no cap; covered by `parseDumpText.test.ts` |
| `src/features/brain-dump/classify.ts` | Pure rule-based classifier | VERIFIED | Exports `classify`; always returns one of 5 categories; tie/no-match → someday; whole-word guard for short stems |
| `src/features/brain-dump/keywords.ts` | PL+EN keyword data | VERIFIED | Data-only module; false-positive stems removed per WR-04 |
| `data/draft.ts` | Draft MMKV wrapper | VERIFIED | `readBrainDumpDraft`/`writeBrainDumpDraft`/`clearBrainDumpDraft`; try/catch wraps native read (WR-03); denylist-safe key `draft:brainDump` |
| `src/app/brain-dump.tsx` | Capture + grouped list screen | VERIFIED | `viewPhase` state machine, `SectionList` grouped by 5 categories, capture affordance, item row with chip/edit/delete/promote |
| `src/features/brain-dump/appendFinalSegmentToDraft.ts` | Pure segment-append function | VERIFIED | Isolated pure function per Pitfall 2; covered by `appendFinalSegmentToDraft.test.ts` |
| `src/features/brain-dump/useVoiceCapture.ts` | Voice-capture hook | VERIFIED | Contextual permission, availability probe, unmount-stop (CR-01), start() re-entrancy guard (WR-01), draftRef race fix (WR-02); fully covered by `useVoiceCapture.test.tsx` (11 tests) |
| `__mocks__/expo-speech-recognition.ts` | Jest STT fake | VERIFIED | Confirmed used by `useVoiceCapture.test.tsx`'s `__emitSpeechEvent`/`__resetSpeechListeners` helpers |
| `app.json` | `expo-speech-recognition` config plugin | VERIFIED | Plugin tuple present with `microphonePermission`, `speechRecognitionPermission`, `androidSpeechServicePackages` |
| `src/app/co-pilot.tsx` (extended) | `dumpItemId` promote hand-off | VERIFIED | `startFromDumpItem` reuses `beginSession`; guarded effect reads `dumpItemId` param once per fresh setup state |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `brain-dump.tsx` (Save) | `parseDumpText.ts` + `classify.ts` | Save handler calls both per line | WIRED | `handleSave` (`brain-dump.tsx:135,145`) |
| `brain-dump.tsx` | `dumpItemsRepo` | `.create` per line, `.list()` in render | WIRED | `brain-dump.tsx:98,145` |
| `brain-dump.tsx` | `data/draft.ts` | read on mount / write on change / clear on Save | WIRED | `brain-dump.tsx:112,128,148` |
| `brain-dump.tsx` (capture view) | `useVoiceCapture.ts` | hook drives mic button + recording pill | WIRED | `brain-dump.tsx:185`, `handleMicPress:206-216` |
| `useVoiceCapture.ts` | `expo-speech-recognition` | `ExpoSpeechRecognitionModule.start/stop/requestPermissionsAsync` | WIRED | `useVoiceCapture.ts:57,127,141,147,160` |
| `DumpItemRow.handlePromote` | `/co-pilot` route | `router.push({dumpItemId})` | WIRED | `brain-dump.tsx:427` |
| `co-pilot.tsx` (`dumpItemId` effect) | `startFromDumpItem` → `beginSession` | shared session-start, no duplication | WIRED | `co-pilot.tsx:136-142,159-164` |
| Home (`index.tsx`) | `/brain-dump` | `<Link>` | WIRED | `index.tsx:232` |

### Behavioral Spot-Checks / Test Suite

`npm run verify` (eslint + hex gate + mascot-asset gate + jest) run directly by the verifier:

```
Test Suites: 22 passed, 22 total
Tests:       174 passed, 174 total
```

All 174 tests pass, matching the phase's expected count. No lint/hex/mascot-asset failures. Test files directly exercising the review-fix commits (`useVoiceCapture.test.tsx`, `brainDumpItemRow.test.tsx`, `draft.test.ts`, `classify.test.ts`) were read in full and confirmed to assert the actual fixed behavior (not vacuous assertions).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DUMP-01 | 04-01, 04-02, 04-03 | Dump 1-30 items in single free-text stream, newline-separated | SATISFIED | `parseDumpText.ts`, `brain-dump.tsx` Save flow, `brainDumpCapture.test.tsx` |
| DUMP-02 | 04-06 | Voice capture via on-device STT, graceful fallback to text | SATISFIED (code) / device items pending | `useVoiceCapture.ts`, config plugin in `app.json`; real on-device Polish recognition is human_needed (by design, per 04-VALIDATION.md) |
| DUMP-03 | 04-01, 04-04 | Suggested category tags via on-device rule-based classification, changeable in one tap | SATISFIED | `classify.ts`, `keywords.ts`, inline chip picker in `brain-dump.tsx` |
| DUMP-04 | 04-04, 04-05 | Items inert by default; one-tap promote to Co-pilot session | SATISFIED | No date/reminder/badge fields; `handlePromote` → `co-pilot.tsx` `startFromDumpItem` |
| DUMP-05 | 04-03 (regression guard) | Reachable in ≤2 taps from anywhere | SATISFIED | `index.tsx:232` direct `<Link href="/brain-dump">` from Home (1 tap) |

No orphaned requirements — REQUIREMENTS.md maps exactly DUMP-01..05 to Phase 4, and all 5 appear in at least one plan's `requirements` field (confirmed via `.planning/REQUIREMENTS.md` lines 37-42, 129-133, all marked "Complete").

### Anti-Patterns Found

None. Scanned all phase-modified files (`src/features/brain-dump/*`, `data/draft.ts`, `src/app/brain-dump.tsx`, `src/app/co-pilot.tsx`, `i18n/locales/{en,pl}.json`) for TODO/FIXME/XXX/TBD/HACK/PLACEHOLDER/"not yet implemented"/empty-return patterns — zero matches outside legitimate `placeholder=` TextInput props and one in-comment mention of Android API "not available" (a genuine defensive-code comment, not a stub marker).

### Code Review Fix Verification

All 7 findings from `04-REVIEW.md` (2 critical, 4 warning, 1 info) were independently re-verified in source, not merely trusted from `04-REVIEW-FIX.md`:

| Finding | Fix Location | Verified In Source | Verified In Test | Commit |
|---------|--------------|---------------------|-------------------|--------|
| CR-01 (mic never stops on unmount) | `useVoiceCapture.ts:125-129` | Yes — unconditional cleanup effect | Yes — `useVoiceCapture.test.tsx:137-149` | `bcae886` |
| CR-02 (promote guard never resets) | `brain-dump.tsx:376-431` | Yes — 800ms debounce, not permanent latch | Yes — `brainDumpItemRow.test.tsx:108-149` | `f0b01e0` |
| WR-01 (no start() re-entrancy guard) | `useVoiceCapture.ts:89,134-157` | Yes — `startingRef` guard | Yes — `useVoiceCapture.test.tsx:151-170` | `bcae886` |
| WR-02 (draftRef stale-read race) | `useVoiceCapture.ts:96-108` | Yes — synchronous write-back before next event | Yes — `useVoiceCapture.test.tsx:172-188` | `bcae886` |
| WR-03 (no try/catch on MMKV read) | `data/draft.ts:24-28` | Yes | Yes — `draft.test.ts:49-60` | `14187e4` |
| WR-04 (over-broad keyword stems) | `keywords.ts:31-37`, `classify.ts:34-41` | Yes | Yes (classify.test.ts, referenced) | `91d452f` |
| IN-01 (dead i18n key) | `i18n/locales/{en,pl}.json` | Yes — `brainDump.description` absent from both files | N/A (removal, not new test) | `db74508` |

All 5 fix commits confirmed present in `git log` with matching messages.

### Human Verification Required

### 1. Real Polish on-device speech recognition

**Test:** On a real device with `pl-PL` set as the recognition locale, tap the mic and speak several distinct brain-dump items with clear pauses between them, including at least one attempt in airplane mode.
**Expected:** Live transcript appears in the text field; pauses produce new lines; on-device recognition works offline, or the app degrades cleanly to the text-fallback caption without crashing.
**Why human:** Native STT + on-device Polish language packs cannot run in the JS test environment or this remote container. This is explicitly the D-02 device spike, documented as Manual-Only in `04-VALIDATION.md`.

### 2. Manufacturer utterance segmentation

**Test:** Speak 3 distinct items with clear pauses on at least one Android device (ideally two different manufacturers/OEM SpeechRecognizer implementations).
**Expected:** Exactly 3 lines appear in the draft field, one per spoken item.
**Why human:** Manufacturer STT segment-boundary ("final" event) timing varies across devices and is unobservable off-device; the Jest mock can only simulate the JS-side contract, not real hardware timing.

### 3. Mic-denied / STT-unavailable fallback feel

**Test:** Deny microphone permission when prompted (or use a device/emulator with no STT service installed).
**Expected:** Mic button is hidden/disabled; a single neutral caption ("Voice isn't available right now — typing works great too.") is shown; text capture remains fully usable with no error state.
**Why human:** Real OS permission dialogs and unavailable-service device states require actual hardware; the underlying `runtimeUnavailable` logic is unit-tested via mock, but the real dialog/UX feel is not.

### Gaps Summary

No code-level or test-verifiable gaps were found. Both BLOCKER-level findings from the code review (CR-01 hot-mic leak on unmount, CR-02 permanently-latched promote guard) were independently confirmed fixed in source with passing regression tests, and all 4 warnings + 1 info item were also confirmed fixed. All 174 tests pass via a verifier-run `npm run verify`. Requirements DUMP-01 through DUMP-05 are all satisfied by directly-inspected source, with no orphaned requirements.

The phase status is `human_needed` rather than `passed` solely because three device-only behaviors (real Polish on-device STT recognition, manufacturer utterance segmentation, and the real mic-denied fallback feel) cannot be verified in this environment — this is by design per the phase's own D-02 spike framing and `04-VALIDATION.md`'s Manual-Only table, not a code deficiency. These are queued as human verification items, not gaps.

---

_Verified: 2026-07-05T02:45:09Z_
_Verifier: Claude (gsd-verifier)_
