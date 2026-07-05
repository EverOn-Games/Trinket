---
phase: 04-brain-dump
reviewed: 2026-07-05T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - src/features/brain-dump/classify.ts
  - src/features/brain-dump/keywords.ts
  - src/features/brain-dump/parseDumpText.ts
  - src/features/brain-dump/appendFinalSegmentToDraft.ts
  - src/features/brain-dump/useVoiceCapture.ts
  - data/draft.ts
  - src/app/brain-dump.tsx
  - src/app/co-pilot.tsx
  - i18n/locales/en.json
  - i18n/locales/pl.json
findings:
  critical: 2
  warning: 4
  info: 1
  total: 7
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-07-05T00:00:00Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Reviewed the Brain Dump feature (capture/save/classify/list/voice-augment) plus
the Co-pilot promote hand-off, cross-checked against the actual
`expo-speech-recognition`/`expo` `useEventListener` source in `node_modules`
(not just the Jest mock) to verify the voice lifecycle claims made in the
code comments. Two BLOCKER-level bugs were found, both squarely inside the
correctness lenses called out for this phase:

1. `useVoiceCapture` never stops the native recognition session when the
   capture view unmounts (e.g. tapping Save mid-recording, or navigating
   away), so the microphone can keep listening indefinitely — a direct
   violation of the "no leak on unmount" requirement and a real privacy/
   battery issue for a wellness app whose whole premise is trust.
2. `DumpItemRow`'s `isPromotingRef` guard is set once and never reset, so
   "Start a session" silently stops responding for a given item after the
   first tap, contradicting the file's own D-15 comment ("re-promoting is
   allowed") and `co-pilot.tsx`'s `startFromDumpItem`, which is written
   expecting to be re-invoked and create a fresh session each time.

Four warnings and one info-level item are also documented below (a
re-entrancy gap in `useVoiceCapture.start()`, a stale-ref race on rapid
consecutive final segments, a missing defensive read in `data/draft.ts`, and
over-broad keyword stems that will misclassify common, unrelated text).

## Critical Issues

### CR-01: Native speech-recognition session is never stopped on unmount — mic can keep listening indefinitely

**File:** `src/features/brain-dump/useVoiceCapture.ts:32-140` (no cleanup effect exists anywhere in the file)

**Issue:** `useVoiceCapture` calls `ExpoSpeechRecognitionModule.start()` inside
`start()` (line 119) and only calls `ExpoSpeechRecognitionModule.stop()` from
the hook's own `stop()` function (line 129), which is only invoked when the
user manually taps the mic again (`handleMicPress` in
`src/app/brain-dump.tsx:206-216`). There is no `useEffect` with an unmount
cleanup that calls `stop()`.

I verified against the real library (`node_modules/expo-speech-recognition/src/useSpeechRecognitionEvent.ts`
→ `node_modules/expo/src/hooks/useEvent.ts`'s `useEventListener`) that the JS
*event listeners* are correctly torn down on unmount (its internal
`useEffect(..., [eventEmitter, eventName, listenerRef])` returns
`() => subscription.remove()`). But removing the JS listener does **not**
stop the native audio/recognition session — that requires an explicit
`ExpoSpeechRecognitionModule.stop()` call, which this hook never makes on
unmount.

Concretely: in `src/app/brain-dump.tsx`, the Save button (`brain-dump-save`,
line 348) is rendered unconditionally regardless of `voice.recording`. A user
who is actively recording and taps Save triggers `handleSave` →
`setViewPhase('list')` (line 150), which unmounts `CapturePhase` (and with it
the `useVoiceCapture` hook instance) while recognition is still active. The
same happens if the user simply navigates away (e.g. taps the Home tab)
mid-recording. In both cases the native STT session is left running with no
way to stop it — the component that owned the `stop` function is gone.

This is exactly the "highest-risk" leak pattern called out for this phase
(mirrors the Phase 3 interval-leak finding), except here it's a live
microphone, not a timer.

**Fix:**
```ts
// useVoiceCapture.ts — add an unconditional stop-on-unmount effect.
useEffect(() => {
  return () => {
    ExpoSpeechRecognitionModule.stop();
  };
}, []);
```
(Calling `stop()` when nothing is recording is expected to be a safe no-op
per the library's contract; if that's not guaranteed, gate it on a ref that
mirrors `recording`.)

### CR-02: `isPromotingRef` never resets — "Start a session" permanently stops responding for an item after the first tap

**File:** `src/app/brain-dump.tsx:376-377, 411-415`

**Issue:**
```ts
const isPromotingRef = useRef(false);
...
const handlePromote = () => {
  if (isPromotingRef.current) return;
  isPromotingRef.current = true;
  router.push({ pathname: '/co-pilot', params: { dumpItemId: item.id } });
};
```
`isPromotingRef.current` is set to `true` on the first tap and is **never**
set back to `false` anywhere in the component. Unlike a delete (which removes
the item and unmounts the row) or `isSavingRef` in the parent screen (which
is explicitly reset in `enterCapture()` — see line 122 — every time the user
re-enters capture), a promoted item stays in the list (D-15, "promote marks,
does not consume"), so the same `DumpItemRow` instance keeps mounted with the
guard permanently latched. If the user backs out of `/co-pilot` (a stack
push, not a screen replace, so `brain-dump.tsx` stays mounted underneath) and
taps "Start a session" again on the same item, `handlePromote` silently
no-ops — no navigation, no feedback, nothing.

This directly contradicts:
- The file's own comment at line 410: *"D-15: re-promoting is allowed, so
  this guard only blocks a double-tap within the same press, never a
  legitimate second promote later."* — the code does not implement what the
  comment describes.
- `co-pilot.tsx`'s `startFromDumpItem` (line 136-142), which unconditionally
  creates a new `Session` and overwrites `promotedTaskId` on every
  invocation — it is written expecting to be called again for the same item.

A silent, unexplained non-response to a tap is also a UX regression for a
PDA-aware app (the button visibly exists and looks tappable, but does
nothing).

**Fix:** Reset the guard once navigation/the underlying action has actually
happened, e.g.:
```ts
const handlePromote = () => {
  if (isPromotingRef.current) return;
  isPromotingRef.current = true;
  router.push({ pathname: '/co-pilot', params: { dumpItemId: item.id } });
  // Only needs to survive a single rapid double-tap, not the row's lifetime.
  setTimeout(() => { isPromotingRef.current = false; }, 500);
};
```
or reset it in a focus-regain effect (e.g. `useFocusEffect`) so a return from
`/co-pilot` re-arms the affordance.

## Warnings

### WR-01: `useVoiceCapture.start()` has no re-entrancy guard against a rapid double-tap

**File:** `src/features/brain-dump/useVoiceCapture.ts:108-126`

**Issue:** `start()` is `async` and awaits
`ExpoSpeechRecognitionModule.requestPermissionsAsync()` (line 113) before
setting `recording` to `true` (line 125). Nothing in `start()` guards against
being invoked a second time while the first call's promise is still pending
— `available` is `true` and `recording` is still `false` during that window,
so `handleMicPress` in `src/app/brain-dump.tsx:206-216` will call
`voice.start()` again on a fast double-tap. If both permission requests
resolve `granted: true`, `ExpoSpeechRecognitionModule.start()` can fire
twice, risking two overlapping native sessions and/or duplicated appended
segments (violates the "without dropping or duplicating them" requirement).
Every other multi-step action in this codebase (`isSavingRef`,
`isDeletingRef`, `isPromotingRef`, `isStartingSessionRef` in `co-pilot.tsx`)
uses an explicit ref guard for exactly this class of race — this is the one
STT entry point that doesn't.

**Fix:**
```ts
const startingRef = useRef(false);
const start = async (): Promise<void> => {
  if (!available || startingRef.current) return;
  startingRef.current = true;
  try {
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) { setRuntimeUnavailable(true); return; }
    ExpoSpeechRecognitionModule.start({ ... });
    setRecording(true);
  } finally {
    startingRef.current = false;
  }
};
```

### WR-02: `draftRef` is only refreshed in a post-render effect — two rapid final segments can race and drop one

**File:** `src/features/brain-dump/useVoiceCapture.ts:82-95`

**Issue:** `draftRef.current` is written by
`useEffect(() => { draftRef.current = draftText; ... })` (lines 85-89), which
runs only after React commits a render. The `'result'` handler (lines
91-95) reads `draftRef.current` synchronously and calls
`onChangeRef.current(appendFinalSegmentToDraft(draftRef.current, transcript))`.
If a second `isFinal` event is dispatched from the native bridge before the
effect from the first event's resulting re-render has had a chance to run
(React effects are scheduled, not synchronous with the event that triggered
the state update), the second handler will read the *stale* `draftRef.current`
(pre-first-append) and compute its append against that stale value,
effectively discarding the first segment when `onChangeRef.current` is
subsequently called with the second (non-cumulative) result. This is a
narrow window, but it directly targets the correctness lens "append
final-utterance segments... without dropping... them across start/stop
cycles."

**Fix:** Track the running draft in a ref that both the listener and the
appender mutate directly (so the listener always composes against the very
latest value it itself produced), rather than relying solely on an external
prop synced through an effect:
```ts
const internalDraftRef = useRef(draftText);
useEffect(() => { internalDraftRef.current = draftText; }, [draftText]);

useSpeechRecognitionEvent('result', (event) => {
  if (!event.isFinal) return;
  const transcript = event.results[0]?.transcript ?? '';
  const next = appendFinalSegmentToDraft(internalDraftRef.current, transcript);
  internalDraftRef.current = next; // update immediately, not just via the prop-sync effect
  onChangeRef.current(next);
});
```

### WR-03: `readBrainDumpDraft()` has no defensive try/catch around the native MMKV read

**File:** `data/draft.ts:18-20`

**Issue:**
```ts
export function readBrainDumpDraft(): string {
  return contentStorage.getString(BRAIN_DUMP_DRAFT_KEY) ?? '';
}
```
This is called synchronously in `BrainDumpScreen`'s `useState` initializer
(`src/app/brain-dump.tsx:112`) — i.e. at capture-screen mount, on the render
critical path. Every other MMKV read in this codebase that could plausibly
throw wraps the risky call in try/catch (see `data/repositories/dumpItems.ts`'s
`readIndex()`/`readRecord()`, which wrap `JSON.parse`). `draft.ts` stores a
plain string with no `JSON.parse` step, but the underlying native
`contentStorage.getString()` call itself is not guaranteed exception-free if
the MMKV file/instance is corrupted at a lower level — and nothing here
catches that. Per this phase's explicit requirement ("reads must tolerate a
corrupt/absent MMKV value without throwing at capture mount"), an uncaught
throw here would crash the entire Brain Dump screen on mount instead of
degrading to an empty draft.

**Fix:**
```ts
export function readBrainDumpDraft(): string {
  try {
    return contentStorage.getString(BRAIN_DUMP_DRAFT_KEY) ?? '';
  } catch {
    return '';
  }
}
```

### WR-04: Over-broad keyword stems in `keywords.ts` cause false-positive category assignment

**File:** `src/features/brain-dump/keywords.ts:27-29` (`people`), also `19-21` (`work`)

**Issue:** `classify()` matches stems via plain `.includes()` (substring, no
word-boundary check), so short/common stems match inside unrelated words:
- Polish `'mamy'` in the `people` list (line 28) is the extremely common verb
  form "we have" (e.g. *"mamy zebranie o 15"* = "we have a meeting at 3") —
  not a form of "mama" (mother) as clearly intended alongside the adjacent
  `'mama'`/`'tata'` stems. This will misclassify a large fraction of
  everyday Polish sentences that merely use "mamy" as "we have" into
  `people`, unrelated to the sentence's actual content.
- English `'text'` and `'call'` (line 27) are substrings of many unrelated
  words — e.g. "context", "textbook", "contextual" all contain `'text'`;
  "recall", "called", "callback" all contain `'call'` — risking
  misclassification of clearly work/errand-flavored text (e.g. "finish the
  report — needs more context") into `people`.

This is a lower-severity issue given D-09's own framing ("a suggestion the
user can change with one tap"), but `'mamy'` in particular is not a
deliberate substring trade-off — it is simply the wrong lemma for what the
comment on the file (`mimics reconcileActiveSession.ts... case-insensitive
substring matching`) intends to capture.

**Fix:** Remove `'mamy'` from the `people` Polish list (keep `'mama'`,
which already covers "mom"/"mama"/"mamo" via substring); consider requiring
a leading/trailing word boundary (e.g. a small regex-based match instead of
raw `.includes()`) for short stems like `'text'`/`'call'`/`'dom'` to reduce
false positives without a large rewrite.

## Info

### IN-01: `brainDump.description` is defined in both locale files but never used

**File:** `i18n/locales/en.json:65`, `i18n/locales/pl.json:66`

**Issue:** Both locale files define a `brainDump.description` string
("A quick place to empty your head…" / "Miejsce, żeby szybko wyrzucić z
głowy myśli…"), but no reviewed source file (`brain-dump.tsx`) ever calls
`t('brainDump.description')` — the capture and list views only ever render
`brainDump.title` plus the more specific capture/list sub-keys. The key is
referenced only in a planning document
(`.planning/phases/04-brain-dump/04-02-PLAN.md`), suggesting it was planned
but the final implementation dropped it without removing the translation.

**Fix:** Either render it (e.g. as a subheading on the list view, mirroring
`starter.description`/`history.description`'s usage pattern elsewhere in the
app) or remove the now-dead key from both locale files to avoid translator
upkeep on unused strings.

---

_Reviewed: 2026-07-05T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
