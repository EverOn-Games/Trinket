# Phase 4: Brain Dump - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-03
**Phase:** 4-Brain Dump
**Areas discussed:** Voice capture & STT risk, Text capture & item parsing, Categorization & correction, Items list & promote-to-session

> **Session note:** AskUserQuestion was unavailable in this remote session (permission stream closed). Discussion ran via plain-text turns instead. The user selected "all" areas and confirmed each area's recommendations in turn ("all the points make sense" → Area 1; "yes, all good" → Area 2; "great ideas" → Area 3; "approved, let's move on" → Area 4).

---

## Voice capture & STT risk

| Option | Description | Selected |
|--------|-------------|----------|
| Text-core / voice-augment | Text is the reliable core; voice populates the same field; feature never depends on STT | ✓ |
| Voice-primary (literal mockup) | Voice as the primary load-bearing flow; matches the mockup but breaks on STT failure / Polish-on-device gap | |
| Spike STT before voice UI | Ship text/categorize/list/promote independent of STT; gate voice on a device-matrix spike (Polish on-device + per-utterance finals) | ✓ |
| Build voice UI, discover risk mid-build | Rejected — the STT risks (single-maintainer, Polish unverified) are known now | |

**User's choice:** Confirmed all points ("all the points make sense").
**Notes:** Spoken-input→item boundary = one-final-utterance-per-line (subject to spike). Contextual mic permission on first tap, never upfront. Polish-on-device unavailability is a decision point to surface at spike time (EN-only on-device? network recognizer? EN-only beta?).

---

## Text capture & item parsing

| Option | Description | Selected |
|--------|-------------|----------|
| Single big multiline field | "Dump it all in one stream"; newline-separated | ✓ |
| Add-as-you-go | One field + tap-add per item; adds friction to a frictionless-offload feature | |
| Save-commits (nothing persisted until Save) | Dump freely then commit; mirrors Phase 3's commit pattern | ✓ |
| Live / on-blur item creation | Rejected — fights free editing | |
| Draft auto-restore | In-progress text to a single MMKV key, cleared on Save — "nothing lost" | ✓ (leaned in) |
| No draft | Simpler but a force-quit loses a full head-clear | |
| 30 = descriptive, no cap | Accept >30 silently; a cap/warning is shame-adjacent | ✓ |
| Hard cap at 30 | Rejected — punitive, no technical need | |

**User's choice:** Confirmed all ("yes, all good").
**Notes:** Parsing = split newline, trim, drop blanks; empty field on Save = no-op.

---

## Categorization & correction

| Option | Description | Selected |
|--------|-------------|----------|
| Rule-based keyword classifier (MVP) | PL+EN keyword lists, ties→someday, no ML module — closes the open ExecuTorch decision | ✓ |
| ExecuTorch embeddings now | Rejected for MVP — second ML native module, model download; deferred post-launch | |
| Classify at Save, synchronous, pure function | Every item created with a category (required field); TDD | ✓ |
| Async / batch "categorizing…" step | Rejected — keyword match is instant, no need | |
| Inline chip-picker correction | Tap chip → 5 options inline → tap target | ✓ |
| Cycle-through-5 on tap | Rejected — up to 4 taps to jump errands→someday | |

**User's choice:** Confirmed all ("great ideas").
**Notes:** Classifier is a pure `classify(text, locale) → category`, keyword lists as data (reconcileActiveSession precedent).

---

## Items list & promote-to-session

| Option | Description | Selected |
|--------|-------------|----------|
| Grouped-by-category list as Brain-dump home | 5 category groups, empty ones hidden; capture is the entry affordance | ✓ |
| Flat list / capture-only | Rejected — source story wants items "grouped so I can find them" | |
| Delete + inline text-edit | Delete via item action (not bare swipe); edit for voice-transcript errors, category unchanged | ✓ (text-edit leaned in) |
| Delete only, no edit | Considered — text-edit flagged as the one deferrable item; kept in scope | |
| Promote reuses Phase 3 beginSession | Route to /co-pilot with item id; source:'dump'; one tap into a session; no duplicated logic | ✓ |
| Promote marks (not consumes) | Sets promotedTaskId, item stays quietly marked; no badge/count/completion pressure | ✓ |
| Promote consumes/removes item | Rejected — auto-disappearance + completion mechanic is anti-shame-free | |

**User's choice:** Approved all ("approved, let's move on").
**Notes:** Promoted item quietly marked ("· in Co-pilot"), re-promote allowed; user deletes items themselves.

---

## Claude's Discretion

- STT library confirmation (expo-speech-recognition vs @react-native-voice/voice) — resolved by the D-02 spike + research
- Draft MMKV key name (denylist-safe)
- Exact PL+EN keyword lists + scoring/tie-break implementation
- Chip-correction / delete / edit / promoted-marker visuals — UI-SPEC
- Whether text-edit re-suggests a category (default no)
- Promote hand-off mechanism (router param vs shared helper), as long as beginSession is reused

## Deferred Ideas

- ExecuTorch classification — post-launch only if quality is complained about
- Network/platform-network STT fallback — only if the spike shows Polish on-device unavailable
- @react-native-voice/voice — documented STT fallback
- Dump-item → Starter path — Phase 5 (Starter)
- Text-edit re-classification — kept simple (no auto-reclassify)
- iOS physical-device verification — standing pre-Phase-9 blocker; STT spike is where it'd surface
