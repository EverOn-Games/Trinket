# Phase 4: Brain Dump - Research

**Researched:** 2026-07-05
**Domain:** React Native / Expo capture UX (multiline text + on-device STT), rule-based text classification, MMKV draft persistence, expo-router param hand-off into an existing session-start flow
**Confidence:** MEDIUM-HIGH overall — HIGH on text-core/classifier/list/promote (all verifiable against existing code + Jest, no new unknowns); MEDIUM on the STT slice (library API verified against its README/npm metadata, but Polish on-device availability and continuous-mode segment behavior on real hardware are NOT verifiable in this remote container — that is the explicit D-02 device spike)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Voice capture & STT (the phase's real risk area)**
- **D-01:** Text-core, voice-augment architecture — text capture is the reliable core (DUMP-01); voice populates the *same* text field rather than being a separate load-bearing flow. The feature is always fully usable via text, so an STT failure (unavailable, permission denied, Polish-on-device unsupported) never breaks Brain dump — it only removes the faster path. The screen still *presents* voice-forward (big mic, "I'm listening") per the mockup; voice is just not architecturally primary. Directly serves DUMP-02's mandated "graceful fallback to text when STT unavailable."
- **D-02:** Spike STT before building the voice UI. Text capture + categorization + list + promote all ship *independent of STT*; the voice slice is gated behind a `/gsd:spike` that verifies, on a real device, (a) whether Polish on-device recognition actually works, and (b) whether the library exposes per-utterance "final" segments in continuous mode (needed for item boundaries — D-03). If the spike shows Polish on-device is unavailable, that is a real decision point to surface to the founder at that time — NOT a silent mid-build discovery. Exact STT library (`expo-speech-recognition` vs. the documented `@react-native-voice/voice` fallback) is confirmed by the spike + research, not pre-locked.
- **D-03:** Spoken input → separate items via one-final-utterance-per-line (subject to the D-02 spike confirming the library exposes this): each recognized final utterance segment appends a new line to the text field, so a natural speaking pause ≈ a new item, and the *same* newline-split from text capture (D-07) turns lines into items. The transcript lands live in the field and is editable before Save. Mic permission is asked **contextually on first mic tap** — never upfront. STT unavailable/denied → mic hidden/disabled, text field fully functional.

**Text capture & item parsing**
- **D-04:** Single big multiline field — the "dump it all out in one stream" model, not add-one-then-tap-add.
- **D-05:** Items created on explicit Save — nothing is persisted to `dumpItemsRepo` until Save.
- **D-06:** Draft auto-restore — the in-progress capture text is persisted to a single MMKV key as the user types and cleared on Save. This is transient UI state — a plain text key, NOT a `DumpItem` and NOT an aggregate — so it stays clean past the schema denylist test. (Planner: choose a key name that also avoids the denylist stems, e.g. under a `draft:` or `brainDumpDraft` namespace, not a `*count*`/`*streak*`/`*daily*` shape.)
- **D-07:** Parsing — split on newline, trim each line, silently drop blank lines; a one-line dump = one item; an empty field on Save is a no-op (no empty items created).
- **D-08:** 30 is descriptive, not a gate — DUMP-01 says "1–30 items"; a dump of 35 is accepted silently in full. No hard cap, no warning.

**Categorization & correction**
- **D-09:** Rule-based keyword classifier for MVP. Hand-tuned PL + EN keyword lists per category, simple scoring, ties/no-match → **"someday"**. No ML native module, no model download.
- **D-10:** Classify at Save, per item, synchronously. `DumpItem.category` is a required field. The classifier is a **pure function** `classify(text, locale) → DumpItemCategory` with keyword lists as data — TDD, mirroring Phase 3's `reconcileActiveSession` pure-function precedent. It always returns a category (never null).
- **D-11:** Correction is inline and immediate — each item shows its category as a tappable chip; tapping reveals the 5 category options inline (compact chip row) and tapping the target changes it. No modal, no separate screen.

**Items list & promote-to-session**
- **D-12:** Brain-dump route = persistent list grouped by the 5 categories, empty categories not rendered. A prominent capture affordance (mic + type) is always available. Empty state (no items yet) → straight to capture.
- **D-13:** Delete + lightweight inline text-edit. Delete via an explicit item action (not a bare swipe-with-no-undo). Editing text leaves the category as-is (no surprise re-classify).
- **D-14:** Promote reuses Phase 3's session-start — one tap into a session. Each item's "Start a session" affordance routes into `/co-pilot` with the item id, and Phase 3's existing `beginSession` starts a session from it (`source:'dump'`, `taskLabel = item.text`). No duplicated session-creation logic. Planner's discretion on the exact hand-off (router param → co-pilot initializer begins the session on mount, vs. an exported shared start helper) — but do not re-implement session creation.
- **D-15:** Promote marks, does not consume. Promoting sets `promotedTaskId` and the item **stays in the list**, quietly marked. Nothing auto-disappears. Re-promoting is allowed (updates the link); no re-promote block.

### Claude's Discretion
- Exact STT library confirmation and boundary mechanism — resolved by the D-02 spike + this research (`expo-speech-recognition` is confirmed the correct candidate; see Findings below — `@react-native-voice/voice` is no longer a viable fallback).
- Draft MMKV key name/namespace (within the D-06 denylist-safe constraint).
- Exact PL + EN keyword lists per category and the scoring/tie-break implementation.
- Chip-correction visual, delete affordance, edit affordance, and the promoted-item "quiet marker" treatment — UI-SPEC details.
- Whether an item text-edit ever re-suggests a category — default is NO (D-13).
- The promote hand-off mechanism (router param vs. shared helper) — D-14, as long as `beginSession` is reused, not duplicated.

### Deferred Ideas (OUT OF SCOPE)
- ExecuTorch on-device classification — post-launch escalation only if categorization quality becomes a real complaint (D-09). Not this phase.
- Network / platform-network STT fallback — only considered IF the D-02 spike shows Polish on-device recognition is unavailable.
- `@react-native-voice/voice` — documented STT fallback if `expo-speech-recognition` proves unstable in the spike. **Research update: this package was deprecated by its own maintainer in favor of `expo-speech-recognition` (see Findings) — treat as effectively unavailable, not a live fallback option.**
- Dump-item → Starter path (source §4.3) — belongs to Phase 5 (Starter), not here.
- Text-edit re-classification — an edit does NOT auto-re-suggest a category (D-13).
- iOS physical-device verification — still the standing carried hard-gate blocker (pre-Phase-9).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DUMP-01 | User can dump 1-30 items in one free-text stream, separated by newlines | See "Multiline Parsing" pattern (D-07) — pure `parseDumpText()` function, TDD, mirrors `reconcileActiveSession` precedent |
| DUMP-02 | User can capture items by voice via on-device STT, with graceful fallback to text when STT unavailable | See "Speech-to-Text" findings — `expo-speech-recognition` API, permission/availability probes, D-01's text-core architecture makes the fallback structural rather than a special case |
| DUMP-03 | Captured items receive suggested category tags via on-device rule-based classification, changeable with one tap | See "Rule-Based Keyword Classifier" pattern — pure `classify()` function + chip correction UI pattern |
| DUMP-04 | Items are inert by default; any item can be promoted to a Co-pilot session task with one tap | See "The Promote Path" — reuse of `co-pilot.tsx`'s existing `startFromDumpItem`/`beginSession` via a router param, confirmed by reading the actual file |
| DUMP-05 | Brain dump reachable in ≤2 taps from anywhere | Already satisfied — `src/app/index.tsx:232` has `<Link href="/brain-dump">`; this phase must not regress it (no research action needed, verification-only) |
</phase_requirements>

## Summary

Brain Dump is a text-first capture screen (multiline TextInput → Save → newline-split into `DumpItem` records) with an optional voice-augmented input path, a synchronous rule-based PL/EN keyword classifier assigning one of 5 fixed categories, a grouped-by-category list with inline chip re-categorization, and a one-tap "promote" hand-off into Phase 3's already-built Co-pilot session flow. Four of five sub-domains (parsing, classification, list, promote) are ordinary TypeScript/React Native work fully verifiable in this remote container via Jest — no device needed. The fifth (voice capture via `expo-speech-recognition`) is verified here down to the API/config-plugin level via npm registry + the library's own README, but its real behavioral unknowns (Polish on-device model availability, exact continuous-mode segment timing) can only be resolved on physical hardware — which is exactly what D-02's spike is for, and exactly what this research does NOT attempt to fake.

**Important research update since CONTEXT.md was written:** `@react-native-voice/voice` (the documented STT fallback candidate) is now marked **DEPRECATED** on the npm registry by its own maintainer, with the deprecation notice reading "Use expo-speech-recognition instead" `[VERIFIED: npm registry]`. This removes the fallback library option D-02 anticipated — if `expo-speech-recognition` proves unusable in the spike, the correct fallback is D-01's own architecture (drop to text-only), not a different STT library. This simplifies the spike's decision tree: it is now "does `expo-speech-recognition` work well enough" vs. "text-only," not a three-way library bake-off.

**Primary recommendation:** Build DUMP-01/03/04/05 (text capture, classifier, list, promote) as an ordinary TDD-first phase this session, fully Jest-verified. Install `expo-speech-recognition`, wire its config plugin, and build the voice UI behind a runtime capability check — but explicitly flag real on-device Polish/segment verification as a separate device task for the human operator, not something this container can close out.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Multiline text capture + Save | Client (React Native screen) | Database/Storage (MMKV via `dumpItemsRepo`) | Pure UI + local persistence; no backend involvement per local-first constraint |
| Draft auto-restore | Client (component state + effect) | Database/Storage (single MMKV key) | Transient UI state persisted for crash-safety, not a data-model record |
| Voice capture (STT) | Client (native module via `expo-speech-recognition`) | — | On-device recognition; no network, no backend; result populates the same client-owned text field (D-01) |
| Rule-based classification | Client (pure TS function) | — | Explicitly on-device by constraint (AI boundary); no ML runtime, no network call |
| Grouped items list | Client (React Native screen, `SectionList`) | Database/Storage (`dumpItemsRepo.list()`) | Read-and-render; no server involvement |
| Inline category correction | Client (component state → `dumpItemsRepo.update()`) | Database/Storage | Single-record patch, same repo already built in Phase 1 |
| Promote-to-session | Client (expo-router param → existing `co-pilot.tsx` handler) | Database/Storage (`sessionsRepo`, `dumpItemsRepo.update` for `promotedTaskId`) | Reuses Phase 3's session-creation logic verbatim (D-14) — Brain dump only supplies the trigger, not new session logic |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `expo-speech-recognition` | `56.0.1` `[VERIFIED: npm registry]` (published 2026-06-05, dist-tag `latest`) | On-device iOS `SFSpeechRecognizer` / Android `SpeechRecognizer` voice capture (DUMP-02) | Confirmed still the correct choice for SDK 56: the package switched its own versioning scheme to track Expo SDK numbers directly (`dist-tags`: `sdk-50`…`sdk-55`, then `latest: 56.0.1` for SDK 56) — a strong, verifiable signal of intentional, ongoing SDK-alignment maintenance, not just a stale MEDIUM-confidence guess from CLAUDE.md. `deps: none` per npm, MIT license. `[VERIFIED: npm registry + github.com/jamsch/expo-speech-recognition README]` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| No new supporting packages required | — | Classifier, parser, draft persistence, grouped list, and promote hand-off all use libraries already in `package.json` (`react-native`, `expo-router`, `react-i18next`, `react-native-mmkv`) | N/A — this phase is deliberately dependency-light per D-09 (no ML) and D-01 (text is the only load-bearing path) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `expo-speech-recognition` | `@react-native-voice/voice` | **Rejected — now formally DEPRECATED** by its own maintainer as of registry inspection today, with the deprecation notice pointing at `expo-speech-recognition` itself `[VERIFIED: npm registry]`. Not a viable fallback; do not reach for it if the D-02 spike has problems — fall back to D-01's text-only path instead. |
| `SectionList` for the grouped-by-category list (D-12) | `FlashList` (`@shopify/flash-list`) | PITFALLS.md flags virtualization as a real future concern for "hundreds of dump items," but that's a long-term-user scenario, not MVP scope (D-08: 30 items is "descriptive, not a gate," but there's no expectation of hundreds at launch). `SectionList` is React Native's own built-in, already virtualized, zero new dependency, and directly matches the grouped-by-5-categories shape (`sections` prop) — the right MVP choice. Revisit `FlashList` only if real usage data shows list-length problems (a Phase 9 or post-launch concern, not this phase's). |
| Rule-based classifier | `react-native-executorch` (ML embeddings) | Explicitly deferred by D-09; correctly out of scope for this phase. |

**Installation:**
```bash
npx expo install expo-speech-recognition
```

**Version verification:** Confirmed live via `npm view expo-speech-recognition version` → `56.0.1`, `npm view expo-speech-recognition time.modified` → `2026-06-05` (4 weeks before this research date — current). `npm view expo-speech-recognition peerDependencies` → `{ expo: '*', react: '*', 'react-native': '*' }` (no version-range conflicts with this project's `expo@~56.0.13` / `react-native@0.85.3`). `npm view expo-speech-recognition scripts` shows no `postinstall` script (only standard `expo-module` build/lint/test lifecycle scripts) — no supply-chain red flag.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `expo-speech-recognition` | npm | First published under this name years ago; current major re-versioned to track Expo SDK, latest `56.0.1` published 4 weeks ago | ~278,500+ cumulative (per npm page metadata, exact weekly figure not yet synced) `[CITED: npmjs.com/package/expo-speech-recognition, via WebSearch]` | `github.com/jamsch/expo-speech-recognition` — 650 stars, 49 forks, 221 commits, 20 releases, single maintainer (`jamesplay`/`jamsch`) `[CITED: github.com/jamsch/expo-speech-recognition]` | `[OK]` — ran `slopcheck install expo-speech-recognition` live in this session; verified as a legitimate npm package, not hallucinated | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none. Note: `expo-speech-recognition` remains a **single-maintainer package** (CLAUDE.md's own MEDIUM-confidence caveat still stands) — slopcheck confirms it is legitimate and actively maintained, not that bus-factor risk is zero. Treat the maintainer-concentration risk as a standing watch item, not a blocker.

*Note on process: `slopcheck install <pkg>` performs a real `npm install` as a side effect of its legitimacy check. This research session ran that command to obtain a verified `[OK]` verdict, then immediately reverted the resulting `package.json`/`package-lock.json` changes via `git checkout` and removed the installed `node_modules/expo-speech-recognition` directory, so no residual repo change exists from this research pass. The planner/executor should perform the real, intentional install (`npx expo install expo-speech-recognition`) as its own tracked task.*

## Architecture Patterns

### System Architecture Diagram

```
[Home screen] --(Link, 1 tap, already built)--> [/brain-dump]
                                                       |
                                                       v
                                          +-------------------------+
                                          |  Grouped list (D-12)     |<---- dumpItemsRepo.list()
                                          |  SectionList by category |
                                          |  + capture affordance    |
                                          +-------------------------+
                                             |                  |
                              (tap capture)  |                  | (tap "Start a session" on an item)
                                             v                  v
                                  +---------------------+   router.push('/co-pilot',
                                  | Capture view (D-04) |     { dumpItemId })
                                  | - draft restore     |             |
                                  |   (MMKV single key,  |             v
                                  |    D-06)             |   +----------------------------+
                                  | - big multiline      |   | co-pilot.tsx (Phase 3,      |
                                  |   TextInput           |   | UNCHANGED session logic)    |
                                  | - mic button (D-01/03)|   | reads dumpItemId param on   |
                                  |   -> expo-speech-     |   | mount -> looks up DumpItem  |
                                  |      recognition      |   | -> calls existing           |
                                  |      appends line per |   | startFromDumpItem() (already|
                                  |      final utterance  |   | defined in this file) ->    |
                                  +---------+-------------+   | beginSession()               |
                                            |                 +----------------------------+
                                       (tap Save, D-05)
                                            v
                              +--------------------------------+
                              | parseDumpText(rawText) (D-07)    |
                              | pure fn: split lines, trim,      |
                              | drop blanks -> string[]           |
                              +--------------------------------+
                                            v
                              +--------------------------------+
                              | for each line:                    |
                              |   classify(text, locale) (D-09/10)|
                              |   pure fn, keyword lists as data,  |
                              |   always returns a category        |
                              +--------------------------------+
                                            v
                              +--------------------------------+
                              | dumpItemsRepo.create({text,       |
                              |   category})  x N                 |
                              | clear draft key                    |
                              +--------------------------------+
                                            v
                                    back to grouped list
```

### Recommended Project Structure

```
src/
├── app/
│   ├── brain-dump.tsx              # replaces the Phase 1 stub — grouped list + capture view (D-04/D-12)
│   └── co-pilot.tsx                # EXTEND ONLY: add dumpItemId param read on mount (D-14) — do not touch beginSession/startFromDumpItem's body
├── features/
│   └── brain-dump/
│       ├── parseDumpText.ts        # pure fn (D-07) — mirrors reconcileActiveSession.ts's shape
│       ├── __tests__/parseDumpText.test.ts
│       ├── classify.ts             # pure fn (D-09/D-10)
│       ├── __tests__/classify.test.ts
│       ├── keywords.ts             # PL+EN keyword-list DATA per category (no logic)
│       └── __tests__/keywords.test.ts   # optional: sanity-check no keyword collides across 2+ categories
data/
├── draft.ts                        # readDraft()/writeDraft()/clearDraft() thin wrapper over contentStorage (D-06)
└── repositories/dumpItems.ts       # UNCHANGED — already built in Phase 1
__mocks__/
└── expo-speech-recognition.ts      # NEW — Jest fake mirroring lottie-react-native.tsx's mock-surface pattern
```

### Pattern 1: Pure-function classifier, keyword lists as data (D-09/D-10)

**What:** `classify(text: string, locale: Locale): DumpItemCategory` — no MMKV import, no React import, deterministic, always returns one of the 5 categories. Keyword lists live in a separate `keywords.ts` data module (PL + EN arrays per category), imported by `classify.ts`. This exactly mirrors the `reconcileActiveSession` precedent already in the codebase (`src/features/co-pilot/reconcileActiveSession.ts`): explicit inputs in, discriminated output out, trivially unit-testable with plain `it()` blocks and zero mocks.

**When to use:** Any time DUMP-03's suggested category is computed — called once per line, synchronously, inside the Save handler (D-10), never as a separate async "categorizing…" step.

**Polish-specific implementation note `[ASSUMED — flagged in Assumptions Log]`:** Polish is a highly inflected language with 7 grammatical cases — a single keyword like `sklep` (shop) can appear in dumped text as `sklepie`, `sklepu`, `sklepy`, etc. Exact-word matching against a fixed keyword list will silently miss these inflected forms. Recommend case-insensitive **substring** matching (the keyword list holds short stems like `sklep`, `praca`, `dziecko` rather than full words) rather than exact-token matching, mirroring the schema-denylist test's own "match denylist *stems* as substrings, not exact field names" pattern already established in this codebase (`data/repositories/__tests__/schema.denylist.test.ts`). This is a design recommendation based on general knowledge of Polish morphology, not verified against a linguistic corpus — flag for a native-Polish-speaker copy review of the actual keyword lists before shipping, same as CLAUDE.md's i18n Pitfall 5 already recommends for UI copy.

**Example (shape only — not the actual keyword content, which is Claude's-discretion per CONTEXT.md):**
```typescript
// src/features/brain-dump/classify.ts
// Mirrors reconcileActiveSession.ts's shape: explicit inputs in,
// deterministic output out, no MMKV/React import.
import type { DumpItemCategory, Locale } from '../../../data/types';
import { KEYWORDS_BY_CATEGORY } from './keywords';

const CATEGORY_ORDER: readonly DumpItemCategory[] = ['errands', 'work', 'home', 'people', 'someday'];

export function classify(text: string, locale: Locale): DumpItemCategory {
  const normalized = text.toLowerCase();
  let bestCategory: DumpItemCategory = 'someday'; // D-09: ties/no-match -> someday
  let bestScore = 0;

  for (const category of CATEGORY_ORDER) {
    if (category === 'someday') continue; // someday is the fallback, never scored for
    const stems = KEYWORDS_BY_CATEGORY[category][locale];
    const score = stems.filter((stem) => normalized.includes(stem)).length;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory; // never null — satisfies DumpItem.category's required field
}
```

### Pattern 2: Multiline parsing as a pure function (D-07)

**What:** `parseDumpText(raw: string): string[]` — split on `\n`, trim each line, filter out empty strings. Called once on Save; an empty result means no-op (D-07's "empty field on Save is a no-op").

**Example:**
```typescript
// src/features/brain-dump/parseDumpText.ts
export function parseDumpText(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
```

### Pattern 3: Draft persistence as a thin MMKV wrapper, not a repo (D-06)

**What:** The draft is a single free-text value, not an indexed collection — so it should NOT follow the `dumpItemsRepo`/`sessionsRepo` per-record + index-key CRUD shape (that pattern is for growing collections of typed records). Instead, a tiny module wraps direct `contentStorage.getString`/`.set`/`.remove` calls, matching `data/mmkv.ts`'s own `contentStorage` instance.

**Key naming (D-06 constraint):** Must avoid the denylist stems (`streak`, `daily`, `completionrate`, `daychain`, `lastactive`, `activedays`, `diagnosis`, `adhd` — see `data/repositories/__tests__/schema.denylist.test.ts`). Recommend the literal key string `'draft:brainDump'` — passes a manual check against every denylist stem, and namespaces cleanly alongside the existing `dumpItem:*`/`session:*` key prefixes already in `contentStorage`.

**Note on the denylist test's blind spot:** The existing `schema.denylist.test.ts` scans (1) runtime keys of records created via the four repos + the settings store, and (2) `data/types.ts` interface property names. A raw MMKV string key like `'draft:brainDump'` is invisible to both checks (it's neither a repo record nor a typed interface field) — so choosing a safe name is a matter of discipline, not a mechanically-enforced guarantee. This is exactly why CONTEXT.md flagged it explicitly; no test change is required, but the planner should not assume the denylist test would catch a bad draft-key name.

**Example:**
```typescript
// data/draft.ts
import { contentStorage } from './mmkv';

const BRAIN_DUMP_DRAFT_KEY = 'draft:brainDump';

export function readBrainDumpDraft(): string {
  return contentStorage.getString(BRAIN_DUMP_DRAFT_KEY) ?? '';
}

export function writeBrainDumpDraft(text: string): void {
  contentStorage.set(BRAIN_DUMP_DRAFT_KEY, text);
}

export function clearBrainDumpDraft(): void {
  contentStorage.remove(BRAIN_DUMP_DRAFT_KEY);
}
```

### Pattern 4: Speech-to-Text integration (`expo-speech-recognition`)

**Verified API shape** `[CITED: github.com/jamsch/expo-speech-recognition README, fetched this session]`:

```typescript
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

// Contextual permission ask (D-03: on first mic tap, never upfront):
const handleMicPress = async () => {
  const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  if (!granted) return; // D-01/D-03: mic hidden/disabled, text field still works
  ExpoSpeechRecognitionModule.start({
    lang: locale === 'pl' ? 'pl-PL' : 'en-US',
    interimResults: true,
    continuous: true, // D-03: needed for one-final-utterance-per-line
    requiresOnDeviceRecognition: true, // per-brief on-device-preferred; spike must confirm this doesn't silently degrade availability
  });
};

useSpeechRecognitionEvent('result', (event) => {
  // event.results: Array<{ transcript: string; confidence?: number }>
  // event.isFinal: boolean
  if (event.isFinal) {
    // D-03: append as a new line — this IS the "one final utterance = one line" mechanism,
    // subject to the D-02 spike confirming Android's segmented-continuous-mode behavior
    // matches this expectation on real hardware.
    appendLineToDraft(event.results[0]?.transcript ?? '');
  }
});
```

**Config plugin** `[CITED: github.com/jamsch/expo-speech-recognition README]` — add to `app.json`'s `plugins` array (this phase's mandated native-input change, per CLAUDE.md's prebuild-convention agent rule):
```json
[
  "expo-speech-recognition",
  {
    "microphonePermission": "Allow $(PRODUCT_NAME) to use the microphone.",
    "speechRecognitionPermission": "Allow $(PRODUCT_NAME) to use speech recognition.",
    "androidSpeechServicePackages": ["com.google.android.googlequicksearchbox"]
  }
]
```
This declaratively handles: iOS `NSMicrophoneUsageDescription` + `NSSpeechRecognitionUsageDescription`, Android `RECORD_AUDIO` permission, and the Android manifest package-visibility (`<queries>`) entry for Google's speech recognizer package — no manual native-file edits needed, consistent with the project's CNG-only discipline.

**Runtime availability probes** (for DUMP-02's graceful fallback):
```typescript
const isAvailable = ExpoSpeechRecognitionModule.isRecognitionAvailable(); // boolean
const supportsOnDevice = ExpoSpeechRecognitionModule.supportsOnDeviceRecognition(); // boolean
const { locales, installedLocales } = ExpoSpeechRecognitionModule.getSupportedLocales(); // NOT supported on Android 12 and below, per README
```
Use these three checks to decide whether to show the mic at all (DUMP-02's "graceful fallback to text when STT unavailable") — if `isRecognitionAvailable()` is false, or `pl-PL` (or the active locale) is absent from `installedLocales`, hide/disable the mic per D-01/D-03 and the text field remains the sole path. **This is the concrete mechanism the D-02 spike needs to exercise on real Android hardware** — `getSupportedLocales()`'s Android-12-and-below caveat means the fallback logic needs a secondary path (e.g., attempt `start()` and catch/handle an error event) for older Android devices where the capability-probe API itself is unavailable.

**Not Expo-Go-compatible** `[CITED: same README]` — "If you've just created a new Expo project... you'll need to create a development build." This is the first native dependency addition since Phase 2's Lottie; **this phase's SUMMARY must carry the `npx expo prebuild --clean` agent-rule note** per CLAUDE.md's convention (app.json plugin change).

### Pattern 5: Grouped list via `SectionList` (D-12)

**What:** Group `dumpItemsRepo.list()` by `category` into `{ title: DumpItemCategory; data: DumpItem[] }[]` sections, in the fixed order `errands, work, home, people, someday`, omitting any section with zero items (D-12's empty-suppression). This mirrors the empty-suppression pattern already used by Phase 3's dump-picker inside `co-pilot.tsx`'s `SetupPhase` (`{dumpItems.length > 0 && (...)}`).

**Example:**
```typescript
const CATEGORY_ORDER: readonly DumpItemCategory[] = ['errands', 'work', 'home', 'people', 'someday'];

function groupByCategory(items: DumpItem[]): { title: DumpItemCategory; data: DumpItem[] }[] {
  return CATEGORY_ORDER
    .map((category) => ({ title: category, data: items.filter((item) => item.category === category) }))
    .filter((section) => section.data.length > 0);
}
```
Render with React Native's built-in `SectionList` (already virtualized, zero new dependency — see Alternatives Considered above for why not `FlashList` at MVP scale).

### Pattern 6: The promote hand-off — extend `co-pilot.tsx`, do not duplicate (D-14)

**Verified by reading `src/app/co-pilot.tsx` directly (not assumed):** `CoPilotScreen` already defines an internal (non-exported) `startFromDumpItem(item: DumpItem)` closure that calls `sessionsRepo.create({ source: 'dump', taskLabel: item.text })`, then `dumpItemsRepo.update(item.id, { promotedTaskId: session.id })`, then `beginSession(session)`. This is currently only triggered by tapping a dump-item row rendered inline inside `SetupPhase` (the co-pilot screen's own embedded dump picker, which reads `dumpItemsRepo.list()` directly).

**Recommended hand-off (Claude's discretion per D-14, resolved here):** Router param, not a shared exported helper. Add a `useLocalSearchParams<{ dumpItemId?: string }>()` read near the top of `CoPilotScreen`, and a `useEffect` that — **only when `flowPhase === 'setup'` and no `resumablePointer` exists** (so an already-live session always wins, matching the existing resume-priority behavior) — looks up the item via `dumpItemsRepo.get(dumpItemId)` and calls the *already-existing* `startFromDumpItem(item)`. This is a small, additive edit to `co-pilot.tsx` (new param read + one new effect), not a new exported API surface, and it reuses `beginSession`/`startFromDumpItem` verbatim — satisfying D-14's "no duplicated session-creation logic" with the smallest possible diff to a file that already passed Phase 3's full test suite.

Brain Dump's side of the contract is then just:
```typescript
router.push({ pathname: '/co-pilot', params: { dumpItemId: item.id } });
```

**Why not the shared-helper alternative:** `startFromDumpItem`/`beginSession` are closures over `CoPilotScreen`'s own local `useState` (`activeSession`, `flowPhase`, `isStartingSessionRef`) — extracting them into a standalone exported function would require either passing all of that state through as parameters (turning a 3-line closure into an awkward multi-arg function) or lifting session-start state out of the component entirely (an unrelated, larger refactor of a file Phase 3 already shipped and tested). The router-param approach reuses the existing closure as-is.

**Testing this hand-off:** `expo-router/testing-library`'s `renderRouter(routeContext, { initialUrl: '/co-pilot?dumpItemId=<id>' })` is the established test pattern in this codebase (`src/app/__tests__/screens.test.tsx` already uses `renderRouter` with `initialUrl` for route-level assertions) — write the new promote-hand-off test the same way, seeding `dumpItemsRepo` with a fixture item first.

### Anti-Patterns to Avoid

- **Treating the draft key as a repository record:** D-06 explicitly says the draft is NOT a `DumpItem` and NOT an aggregate. Don't route it through `dumpItemsRepo`'s create/index pattern — that would create a phantom "item" with no `category`, breaking the required-field invariant, and would need its own denylist-test coverage it doesn't need as a plain string key.
- **Async "categorizing…" UI state:** D-10 mandates synchronous classification at Save. Don't add a loading spinner or async step around `classify()` — it's a pure, instant function; any UI delay here is unearned and works against the "does not need to be right, needs to not be annoying" design goal.
- **Re-implementing session creation in `brain-dump.tsx`:** D-14 is explicit — Brain Dump must not call `sessionsRepo.create()` itself for the promote path. Route through `/co-pilot` and let the existing handler do it.
- **Cycle-through-5 category correction:** D-11 explicitly rejects a raw cycle-through (up to 4 taps to jump errands→someday) in favor of a chip row exposing all 5 options at once.
- **Falling back to `@react-native-voice/voice` if the STT spike has problems:** This library is now deprecated (see Findings/Summary). The only real fallback per D-01 is text-only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| On-device speech recognition | A custom native module wrapping `SFSpeechRecognizer`/`SpeechRecognizer` | `expo-speech-recognition` | Already ships the exact API surface needed (continuous mode, on-device flag, locale-availability probes, Expo config plugin) — building this from scratch would mean writing and maintaining two native platform bridges for a phase whose voice slice is explicitly the "faster path," not the core value. |
| Category prediction | An ML classifier, embeddings, or a hand-rolled Bayesian model | Rule-based keyword `classify()` (D-09) | Explicitly locked by CONTEXT.md — 5 fixed categories don't need ML; a keyword scorer is trivially correct-enough and instantly debuggable. |
| Virtualized long-list rendering | A hand-rolled windowing/pagination scheme | `SectionList` (React Native built-in) | Already virtualized, already grouped-by-key-shaped, zero new dependency. |
| Session creation for the promote path | A second `sessionsRepo.create()` call site inside `brain-dump.tsx` | The existing `startFromDumpItem`/`beginSession` in `co-pilot.tsx`, triggered via router param | D-14's explicit "no duplicated session-creation logic" — Phase 3 already built and tested this exact flow. |

**Key insight:** Every "don't hand-roll" item in this phase already has a locked decision or an existing, tested implementation in the codebase — the actual engineering task is wiring, not invention.

## Common Pitfalls

### Pitfall 1: STT graceful-fallback logic tested only on the happy path

**What goes wrong:** The mic button works in the simulator/emulator (or isn't tested at all in this container), but permission-denied, STT-unavailable, and Polish-model-not-installed states are never exercised, so DUMP-02's "graceful fallback to text" ships unverified. This is explicitly named in `.planning/research/PITFALLS.md` Pitfall 6 and the "Looks Done But Isn't" checklist ("STT permission/availability fallback... Often missing the 'permission denied,' 'permission revoked after initial grant,' and 'on-device Polish model not yet available' states").

**Why it happens:** These three failure states require either a real device with specific OS/locale configuration, or a mock that can simulate them — and it's easy to only mock the success path.

**How to avoid:** Write the `__mocks__/expo-speech-recognition.ts` Jest mock (Pattern below) with the ability to simulate each of: `isRecognitionAvailable() === false`, `requestPermissionsAsync()` resolving `{ granted: false }`, and an `error` event firing mid-recognition — then write a unit test asserting the mic is hidden/disabled and the text field remains fully interactive in each case. This closes the gap entirely at the Jest layer, independent of the device spike.

**Warning signs:** Only one STT test exists ("mic works"), no test asserts what renders when `isRecognitionAvailable()` returns false.

### Pitfall 2: Continuous-mode segment assumption baked into UI code before the spike confirms it

**What goes wrong:** D-03's "one final utterance = one new line" is architecturally convenient but is explicitly gated on the D-02 device spike confirming Android's segmented-continuous-mode behavior matches expectations. If the voice-UI code hardcodes an assumption about exact segment timing/boundaries that the spike later contradicts, rework cost increases.

**Why it happens:** The library's own docs describe continuous mode as producing new segments after each final result, but real Android manufacturer variance (Samsung, etc. — per `.planning/research/PITFALLS.md` Pitfall 6) can behave inconsistently.

**How to avoid:** Isolate the "final transcript → append line" logic into one small, named function (e.g., `appendFinalSegmentToDraft(transcript: string)`) that's trivially swappable if the spike reveals different real-world segment behavior (e.g., needing debouncing, or needing to strip a leading space Android sometimes inserts). Don't scatter this logic across the component.

**Warning signs:** Segment-boundary logic inlined directly in a `useSpeechRecognitionEvent('result', ...)` callback with no isolated, testable function.

### Pitfall 3: Draft key collides with the denylist despite the runtime probe passing

**What goes wrong:** A key like `dailyBrainDumpDraft` or `lastActiveDraft` would violate the DENYLIST_STEMS (`daily`, `lastactive`) if it were ever probed — but since the draft key is a raw MMKV string (not a repo record or typed interface field), `schema.denylist.test.ts` will not catch this by construction (see Pattern 3 above). A bad name ships silently.

**How to avoid:** Use the recommended literal `'draft:brainDump'` (verified clean against every current denylist stem by manual inspection during this research). If the planner chooses a different name, manually re-check it against the exact stem list in `data/repositories/__tests__/schema.denylist.test.ts` before finalizing — do not rely on the automated test to catch a mistake here.

### Pitfall 4: Classifier ties silently misresolve to a category other than "someday"

**What goes wrong:** D-09 is explicit: ties/no-match → "someday". A classifier scoring implementation using `Array.prototype.sort()` or naive `Math.max` comparisons can accidentally let the *last-checked* category win a tie instead of falling through to "someday," if the tie-break isn't coded as a strict `>` comparison against a `someday`-initialized default (see Pattern 1's example — `bestScore` starts at `0`, `bestCategory` starts at `'someday'`, and only a strictly *greater* score displaces it).

**How to avoid:** TDD the tie-break explicitly: a test case with a string that scores identically against two categories (e.g., contains one keyword from each) must assert the result is `'someday'`, not whichever category happened to be checked last in the loop.

**Warning signs:** No test exercises a genuine tie; only "clear winner" and "no match" cases are tested.

## Code Examples

### Jest-mocking `expo-speech-recognition` (mirrors the `lottie-react-native` mock precedent)

```typescript
// __mocks__/expo-speech-recognition.ts
/**
 * Fake of expo-speech-recognition's native module + event-hook surface, used
 * exclusively under Jest. Mirrors __mocks__/lottie-react-native.tsx's approach:
 * expose the same imperative API as jest.fn()s so voice-UI logic (permission
 * flow, availability fallback, final-segment handling) is unit-testable without
 * the real native binding. Real on-device Polish/continuous-mode behavior (D-02)
 * must still be verified separately on hardware.
 */
type ResultListener = (event: { results: { transcript: string; confidence?: number }[]; isFinal: boolean }) => void;
type ErrorListener = (event: { error: string; message: string }) => void;

const listeners: { result: ResultListener[]; error: ErrorListener[] } = { result: [], error: [] };

export const ExpoSpeechRecognitionModule = {
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  isRecognitionAvailable: jest.fn(() => true),
  supportsOnDeviceRecognition: jest.fn(() => true),
  getSupportedLocales: jest.fn(() => ({ locales: ['en-US', 'pl-PL'], installedLocales: ['en-US'] })),
  start: jest.fn(),
  stop: jest.fn(),
};

export function useSpeechRecognitionEvent(event: 'result' | 'error', listener: ResultListener | ErrorListener) {
  // Test-only helper access via the exported `__emit` below; production code
  // never calls __emit directly.
  if (event === 'result') listeners.result.push(listener as ResultListener);
  if (event === 'error') listeners.error.push(listener as ErrorListener);
}

// Test helper: simulate a native event firing (not part of the real library's API).
export const __emitSpeechEvent = {
  result: (event: { results: { transcript: string }[]; isFinal: boolean }) =>
    listeners.result.forEach((fn) => fn(event)),
  error: (event: { error: string; message: string }) => listeners.error.forEach((fn) => fn(event)),
};
```
Register in `jest.setup.ts` alongside the existing mocks:
```typescript
jest.mock('expo-speech-recognition');
```

### Grouped SectionList render

```typescript
import { SectionList } from 'react-native';

<SectionList
  sections={groupByCategory(dumpItemsRepo.list())}
  keyExtractor={(item) => item.id}
  renderSectionHeader={({ section }) => <Text>{t(`brainDump.category.${section.title}`)}</Text>}
  renderItem={({ item }) => <DumpItemRow item={item} />}
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `@react-native-voice/voice` as the RN community STT standard | `expo-speech-recognition` | Confirmed via npm registry inspection this session: `@react-native-voice/voice@3.2.4`'s package description now reads "DEPRECATED!! - This package is deprecated. Use expo-speech-recognition instead." | The CONTEXT.md-documented fallback plan (switch libraries if the primary proves unstable) is no longer viable — there is no second STT library to fall back to; the real fallback is D-01's text-only path. |

**Deprecated/outdated:**
- `@react-native-voice/voice`: deprecated by its own maintainer, pointing directly at `expo-speech-recognition`. Do not add it to `package.json` even as a documented contingency — it's a dead end.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Substring/stem-based keyword matching (rather than exact-word matching) is the right approach for Polish's inflected forms | Pattern 1 (Rule-based classifier) | LOW — if wrong, categorization quality is merely mediocre for Polish input, which is explicitly tolerable per D-09 ("does not need to be right, needs to not be annoying") and correctable by adjusting the keyword lists post-launch; no architecture change needed either way |
| A2 | `SectionList` (not `FlashList`) is sufficient for MVP-scale item counts (tens, not hundreds) | Alternatives Considered / Pattern 5 | LOW-MEDIUM — if a beta user genuinely accumulates hundreds of un-deleted dump items (D-15: promote never removes items), list scroll performance could degrade; recoverable by swapping to `FlashList` later without a data-model change |
| A3 | The router-param hand-off (vs. an exported shared helper) is the cleaner mechanism for the promote path | Pattern 6 | LOW — this is explicitly Claude's-discretion per D-14; either mechanism satisfies "reuse beginSession, don't duplicate," so choosing the other approach at planning time is not a correctness risk, only a stylistic one |
| A4 | `requiresOnDeviceRecognition: true` should be the default `start()` option, with the D-02 spike confirming it doesn't cause silent unavailability | Pattern 4 (STT integration) | MEDIUM — if the spike finds Polish on-device recognition unavailable, this default may need to become conditional (`requiresOnDeviceRecognition: supportsOnDeviceRecognition() && localeIsInstalled`), which is exactly the founder-facing decision point D-02 already anticipates surfacing |

## Open Questions

1. **Does Android's `getSupportedLocales()` reliably report Polish (`pl-PL`) as installed on real budget/mid-tier Android hardware, and does the on-device model need an explicit user-triggered download first?**
   - What we know: The API exists and returns `{ locales, installedLocales }`, but is explicitly "Not supported on Android 12 and below" per the library's own README, and general platform knowledge (per `.planning/research/PITFALLS.md` Pitfall 6) says on-device language packs sometimes require a separate OS-level download the app can't trigger.
   - What's unclear: Real behavior on the actual low/mid-tier Android hardware this product targets, with system locale set to Polish — this is precisely un-verifiable in this remote, deviceless container.
   - Recommendation: This is the D-02 device spike's exact job. Do not attempt to resolve it here; the planner should schedule it as an explicit human/device task, structured so all other Phase 4 work (text/classifier/list/promote) does not block on its outcome (per D-02's own framing).

2. **Will Android's "segmented continuous session" behavior actually align with "one final utterance = one line" (D-03) in practice, or will manufacturer SpeechRecognizer variants (Samsung, etc.) produce different segment boundaries?**
   - What we know: The library's README describes the intended behavior; `.planning/research/PITFALLS.md` Pitfall 6 flags Android manufacturer inconsistency as a known general risk for platform STT.
   - What's unclear: Whether this specific library's abstraction smooths over manufacturer differences or inherits them.
   - Recommendation: Also a D-02 spike question. Isolate the segment-handling logic (Pitfall 2 above) so it's a one-function fix if real-hardware behavior diverges from the docs.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build tooling, Jest | ✓ | v22.22.2 | — |
| npm | Package install, slopcheck's install-based check | ✓ | 10.9.7 | — |
| Physical iOS/Android device | D-02's STT spike, real Polish-on-device verification | ✗ (remote container, no device) | — | None — this is a hard block for the spike specifically; structure the plan so the spike is an explicitly separate, human-executed task and does NOT block the rest of Phase 4 (text/classifier/list/promote), per D-02's own design and the phase's environment note |
| EAS Build / dev client | Building a version of the app with `expo-speech-recognition` compiled in, to test on a device | ✗ (no device to install it on from here) | — | Same as above — code/config can be written and Jest-verified here; the actual dev-client build + install is a device-side task |

**Missing dependencies with no fallback:**
- Physical device access for the D-02 spike itself — there is no way to substitute this; it must happen outside this session, on real hardware, per CONTEXT.md's own framing of D-02.

**Missing dependencies with fallback:**
- None beyond the device itself — every other piece of this phase (parsing, classification, list rendering, promote hand-off, and even the STT integration code + its config plugin + its Jest mocks) is fully buildable and verifiable in this container.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 29.7.0 + `jest-expo` 56.0.5 preset `[VERIFIED: package.json]` |
| Config file | `jest.config.js` (repo root) — `preset: 'jest-expo'`, `setupFilesAfterEnv: ['./jest.setup.ts']` |
| Quick run command | `npm test -- --testPathPatterns=brain-dump` (or the specific new test file path) |
| Full suite command | `npm run verify` (eslint + `lint:hex` + `lint:mascot-assets` + `npm test`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DUMP-01 | Multiline text splits into N trimmed, non-empty items; blank lines dropped; empty field = no-op | unit | `npm test -- --testPathPatterns=parseDumpText` | ❌ Wave 0 — `src/features/brain-dump/__tests__/parseDumpText.test.ts` |
| DUMP-02 | Mic hidden/disabled when `isRecognitionAvailable()` is false or permission denied; text field remains usable in every case | unit + component | `npm test -- --testPathPatterns=brain-dump` (component test using the new `__mocks__/expo-speech-recognition.ts`) | ❌ Wave 0 — mock file + a capture-view test |
| DUMP-03 | `classify()` returns correct category for clear keyword matches in both PL and EN; ties/no-match resolve to `'someday'` | unit | `npm test -- --testPathPatterns=classify` | ❌ Wave 0 — `src/features/brain-dump/__tests__/classify.test.ts` |
| DUMP-04 | Promoting an item sets `promotedTaskId` via the existing `beginSession`/`startFromDumpItem` path; item remains visible afterward (D-15) | integration (route-level, via `renderRouter`) | `npm test -- --testPathPatterns=screens` (extend the existing `screens.test.tsx` route-tree test, or a new sibling test file using the same `renderRouter` pattern) | Partially — `src/app/__tests__/screens.test.tsx` exists and already renders `BrainDumpScreen`/`CoPilotScreen` together; extend it, don't replace it |
| DUMP-05 | Brain dump reachable in ≤2 taps | already covered | N/A — already satisfied by Phase 1's Home routing; no new test needed, only a non-regression check | ✓ (`src/app/index.tsx`'s existing `<Link href="/brain-dump">`) |

### Sampling Rate

- **Per task commit:** targeted `npm test -- --testPathPatterns=<area>` for the file(s) just touched
- **Per wave merge:** `npm run verify` (full lint + hex gate + mascot-asset gate + full Jest suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`; the D-02 device spike is tracked and gated separately (a human/device task, not part of the automated suite)

### Wave 0 Gaps

- [ ] `src/features/brain-dump/__tests__/parseDumpText.test.ts` — covers DUMP-01
- [ ] `src/features/brain-dump/__tests__/classify.test.ts` — covers DUMP-03, including the tie-break-to-someday case (Pitfall 4)
- [ ] `__mocks__/expo-speech-recognition.ts` + `jest.mock('expo-speech-recognition')` registration in `jest.setup.ts` — required before any voice-UI component test can run; covers DUMP-02
- [ ] `data/draft.ts` + a small test asserting the key round-trips and survives `contentStorage.clearAll()` isolation between tests (mirrors the existing MMKV-mock reset pattern already used in `screens.test.tsx`'s `beforeEach`)
- [ ] Extend `src/app/__tests__/screens.test.tsx`'s `routeContext` — no framework change needed, just add the new promote-hand-off assertions using `initialUrl: '/co-pilot?dumpItemId=...'`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | Brain Dump has no auth surface — local-only, no account required (MONEY-04, out of scope for this phase) |
| V3 Session Management | No | N/A — not an auth session; Co-pilot's own session lifecycle is Phase 3's concern, unchanged here |
| V4 Access Control | No | Single-user local device; no multi-tenant or role concept anywhere in this app |
| V5 Input Validation | Yes | Free-text `TextInput` content is stored verbatim as `DumpItem.text` — no injection risk (no SQL, no HTML rendering of user text as markup); the only validation needed is D-07's trim/blank-line-drop, already specified. `classify()` and `parseDumpText()` must not throw on adversarial input (extremely long strings, emoji, RTL text) — recommend a defensive test with a very long single line and non-Latin script input to confirm no crash |
| V6 Cryptography | No | No new secrets/keys introduced this phase; MMKV encryption is explicitly deferred to Phase 7 per `data/mmkv.ts`'s own docstring, unchanged here |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Voice transcript or dump-item text leaking into an analytics event property | Information Disclosure | Not built this phase (ANLY-01/02 are Phase 8), but flag now: when Phase 8 instruments a "brain dump created" event, the event must carry only structural properties (item count, category distribution counts) — never `item.text` or raw transcript content, per `.planning/research/PITFALLS.md`'s Security Mistakes table and the project's no-content-payload constraint |
| STT audio/transcript sent over the network despite "on-device preferred" | Information Disclosure | `requiresOnDeviceRecognition: true` in the `start()` call (Pattern 4) — the library will refuse network fallback when this flag is set; verify this is actually enforced during the D-02 spike, not just assumed from the docs |
| A malformed/adversarial dump line (extremely long, unusual Unicode) crashing `classify()` or `parseDumpText()` and taking down the Save flow | Denial of Service (client-side) | Both functions are pure string operations with no unbounded loops or regex-catastrophic-backtracking risk in the recommended implementation (Pattern 1/2 use `.split`, `.trim`, `.filter`, `.includes` — all linear, no exponential-time regex); still worth one defensive test case per Input Validation row above |

## Sources

### Primary (HIGH confidence)
- `npm view expo-speech-recognition version` / `time.modified` / `peerDependencies` / `scripts` — run live in this session against the npm registry. Confirms `56.0.1`, published 2026-06-05, no postinstall script, peer ranges compatible with this project's Expo SDK 56 / React Native 0.85.3.
- `npm view @react-native-voice/voice` — run live in this session. Confirms the package description now reads "DEPRECATED!! - This package is deprecated. Use expo-speech-recognition instead."
- `slopcheck install expo-speech-recognition` — run live in this session, returned `[OK]`. (Side-effect `npm install` reverted via `git checkout` immediately after; `node_modules/expo-speech-recognition` removed.)
- Direct reads of this codebase: `src/app/co-pilot.tsx`, `data/repositories/dumpItems.ts`, `data/types.ts`, `data/mmkv.ts`, `data/repositories/__tests__/schema.denylist.test.ts`, `src/features/co-pilot/reconcileActiveSession.ts`, `src/app/history.tsx`, `src/app/index.tsx`, `src/app/__tests__/screens.test.tsx`, `__mocks__/lottie-react-native.tsx`, `__mocks__/react-native-mmkv.ts`, `jest.setup.ts`, `jest.config.js`, `package.json`, `app.json`.

### Secondary (MEDIUM confidence)
- `github.com/jamsch/expo-speech-recognition` README (fetched via WebFetch this session) — config plugin shape, `ExpoSpeechRecognitionModule` API surface, `useSpeechRecognitionEvent` event shape, `requiresOnDeviceRecognition`/`continuous`/`interimResults`/`lang` options, Expo Go incompatibility statement, Android-12-and-below caveat on `getSupportedLocales()`. Single-maintainer package — API surface verified against the library's own docs, but Polish-locale-specific behavior and exact continuous-mode segment timing are NOT independently corroborated by a second source, hence MEDIUM not HIGH.
- `github.com/jamsch/expo-speech-recognition` repo metadata (fetched via WebFetch) — 650 stars, 49 forks, 221 commits, 20 releases, single maintainer `jamesplay`/`jamsch`, 44 open issues.
- WebSearch cross-check on npm download/maintenance signals for `expo-speech-recognition` — corroborates active maintenance, cumulative download count (~278.5K+, exact weekly figure not synced at query time).

### Tertiary (LOW confidence)
- General knowledge of Polish morphology/grammatical cases informing the substring-vs-exact-word keyword-matching recommendation (Assumptions Log A1) — not verified against a Polish linguistic corpus or native-speaker review in this session; explicitly flagged for confirmation before shipping the actual keyword lists.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `expo-speech-recognition`'s version, SDK compatibility, and legitimacy (slopcheck + npm registry) are directly verified; the deprecation of the documented fallback (`@react-native-voice/voice`) is directly verified, not inferred.
- Architecture: HIGH for text/classifier/list/promote (all directly grounded in existing, tested codebase files); MEDIUM for the voice-capture UI's exact behavior (grounded in the library's own docs, but genuinely unverifiable further without a physical device).
- Pitfalls: HIGH for the codebase-specific pitfalls (draft-key denylist blind spot, classifier tie-break, promote-path duplication risk — all directly derived from reading this repo's actual code and tests); MEDIUM for the STT-specific pitfalls (grounded in the project's own prior PITFALLS.md research plus this session's library-doc confirmation, but real-hardware Polish/segment behavior remains the explicit open question the D-02 spike exists to close).

**Research date:** 2026-07-05
**Valid until:** ~30 days for the codebase-grounded findings (text/classifier/list/promote — stable, low external-dependency surface); ~7-14 days for the `expo-speech-recognition`-specific findings given it's a single-maintainer, actively-versioned-with-Expo-SDK package where a new release could change API details before the D-02 spike actually runs.
