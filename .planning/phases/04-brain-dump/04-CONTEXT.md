# Phase 4: Brain Dump - Context

**Gathered:** 2026-07-03
**Status:** Ready for planning

<domain>
## Phase Boundary

A user can offload many tasks by text or voice in seconds, each item receives a suggested category from on-device rule-based classification (changeable inline), items are inert by default, and any one can be promoted into a Co-pilot session in one tap (DUMP-01..05). This phase builds the capture experience (text-core, voice-augment), the pure-function keyword classifier, the grouped items list, and the promote trigger.

NOT in this phase: the Co-pilot session mechanics themselves (Phase 3, complete — this phase reuses its `beginSession` path); Starter promotion from a dump item (source §4.3 — that dump-item→Starter path belongs to Phase 5); ExecuTorch/ML classification (deferred post-launch); any cloud STT/LLM (out of scope by the AI boundary); analytics events (Phase 8). DUMP-05 (≤2 taps from anywhere) is already structurally satisfied by Phase 1's home-hub routing — this phase must not regress it, not re-solve it.

</domain>

<decisions>
## Implementation Decisions

### Voice capture & STT (the phase's real risk area)
- **D-01:** **Text-core, voice-augment architecture** — text capture is the reliable core (DUMP-01); voice populates the *same* text field rather than being a separate load-bearing flow. The feature is always fully usable via text, so an STT failure (unavailable, permission denied, Polish-on-device unsupported) never breaks Brain dump — it only removes the faster path. The screen still *presents* voice-forward (big mic, "I'm listening") per the mockup; voice is just not architecturally primary. Directly serves DUMP-02's mandated "graceful fallback to text when STT unavailable."
- **D-02:** **Spike STT before building the voice UI.** Text capture + categorization + list + promote all ship *independent of STT*; the voice slice is gated behind a `/gsd:spike` that verifies, on a real device, (a) whether Polish on-device recognition actually works, and (b) whether the library exposes per-utterance "final" segments in continuous mode (needed for item boundaries — D-03). If the spike shows Polish on-device is unavailable, that is a real decision point to surface to the founder at that time (accept English-on-device-only? allow the platform network recognizer despite the on-device-preferred stance? ship voice EN-only for beta?) — NOT a silent mid-build discovery. Exact STT library (`expo-speech-recognition` vs. the documented `@react-native-voice/voice` fallback) is confirmed by the spike + research, not pre-locked.
- **D-03:** **Spoken input → separate items via one-final-utterance-per-line** (subject to the D-02 spike confirming the library exposes this): each recognized final utterance segment appends a new line to the text field, so a natural speaking pause ≈ a new item, and the *same* newline-split from text capture (D-07) turns lines into items. The transcript lands live in the field and is editable before Save. Mic permission is asked **contextually on first mic tap** — never upfront — matching the app's PDA/contextual-permission ethos (same posture as Starter's notification permission). STT unavailable/denied → mic hidden/disabled, text field fully functional.

### Text capture & item parsing
- **D-04:** **Single big multiline field** — the "dump it all out in one stream" model, not add-one-then-tap-add. The point is frictionless offloading of a full head; newlines separate items.
- **D-05:** **Items created on explicit Save** — nothing is persisted to `dumpItemsRepo` until Save (mirrors Phase 3's "nothing persisted until commit"). The user dumps freely (typos, reordering, blank lines welcome), then commits.
- **D-06:** **Draft auto-restore** — the in-progress capture text is persisted to a single MMKV key as the user types and cleared on Save, so a force-quit mid-dump doesn't lose a full head-clear (the "nothing lost" product value). This is transient UI state — a plain text key, NOT a `DumpItem` and NOT an aggregate — so it stays clean past the schema denylist test. (Planner: choose a key name that also avoids the denylist stems, e.g. under a `draft:` or `brainDumpDraft` namespace, not a `*count*`/`*streak*`/`*daily*` shape.)
- **D-07:** **Parsing** — split on newline, trim each line, silently drop blank lines; a one-line dump = one item; an empty field on Save is a no-op (no empty items created).
- **D-08:** **30 is descriptive, not a gate** — DUMP-01 says "1–30 items"; a dump of 35 is accepted silently in full. No hard cap, no "you dumped too much" warning (shame-adjacent, and there is zero technical reason to limit — keyword classification of 35 items is trivial).

### Categorization & correction
- **D-09:** **Rule-based keyword classifier for MVP** — this LOCKS the open "semantic categorization: prefer on-device, spike early" decision (source §10, PROJECT.md Key Decisions) to rule-based for MVP. Hand-tuned PL + EN keyword lists per category, simple scoring, ties/no-match → **"someday"** (source §4.2 default). No ML native module, no model download. ExecuTorch is a *post-launch* escalation only if categorization quality becomes a real user complaint.
- **D-10:** **Classify at Save, per item, synchronously.** `DumpItem.category` is a required field, so every item is created *with* its suggested category in the same Save action (keyword matching is instant — no async, no "categorizing…" step). The classifier is a **pure function** `classify(text, locale) → DumpItemCategory` with keyword lists as data — TDD, mirroring Phase 3's `reconcileActiveSession` pure-function precedent. It always returns a category (never null), satisfying the required field.
- **D-11:** **Correction is inline and immediate** — each item shows its category as a tappable chip; tapping reveals the 5 category options inline (compact chip row) and tapping the target changes it. No modal, no separate screen. "One tap to change" (DUMP-03) done well — a raw cycle-through-5 would cost up to 4 taps to jump errands→someday. Behavior is locked; the exact chip affordance is a UI-SPEC detail.

### Items list & promote-to-session
- **D-12:** **Brain-dump route = persistent list grouped by the 5 categories** (errands / work / home / people / someday), empty categories not rendered (same empty-suppression pattern as Phase 3's dump-picker). A prominent capture affordance (mic + type) is always available; tapping it opens the capture view; Save returns to the grouped list with new items filed. Empty state (no items yet) → straight to capture.
- **D-13:** **Delete + lightweight inline text-edit.** Delete via an explicit item action (not a bare swipe-with-no-undo — losing a dumped thought silently is anti-"nothing lost"). Inline text-edit is included because a voice-forward capture *will* produce transcript errors ("Marta"→"Marfa") and not being able to fix them would be annoying; editing text leaves the category as-is (no surprise re-classify). Text-edit is the one item that *could* be deferred if Phase 4 needs to shrink — but it's in scope.
- **D-14:** **Promote reuses Phase 3's session-start — one tap into a session.** Each item's "Start a session" affordance routes into `/co-pilot` with the item id, and Phase 3's existing `beginSession` starts a session from it (`source:'dump'`, `taskLabel = item.text`). No duplicated session-creation logic — this completes the path D-02 (Phase 3) already half-built (co-pilot's SetupPhase already reads `dumpItemsRepo` and links `promotedTaskId`). Planner's discretion on the exact hand-off (router param → co-pilot initializer begins the session on mount, vs. an exported shared start helper) — but do not re-implement session creation.
- **D-15:** **Promote marks, does not consume.** Promoting sets `promotedTaskId` (the link the schema already has) and the item **stays in the list**, quietly marked (dimmed / a small "· in Co-pilot" note) — never a badge, count, or "completed" pressure. Nothing auto-disappears; the user deletes items themselves when done. Shame-free: no completion mechanic sneaks in. Re-promoting is allowed (updates the link); no re-promote block.

### Claude's Discretion
- Exact STT library confirmation and boundary mechanism — resolved by the D-02 spike + research (`expo-speech-recognition` is the leading candidate per CLAUDE.md; `@react-native-voice/voice` is the documented fallback).
- Draft MMKV key name/namespace (within the D-06 denylist-safe constraint).
- Exact PL + EN keyword lists per category and the scoring/tie-break implementation (research/implementation detail, within D-09's "ties→someday" rule).
- Chip-correction visual, delete affordance, edit affordance, and the promoted-item "quiet marker" treatment — UI-SPEC details.
- Whether an item text-edit ever re-suggests a category — default is NO (D-13); revisit only if it feels wrong in practice.
- The promote hand-off mechanism (router param vs. shared helper) — D-14, as long as `beginSession` is reused, not duplicated.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product spec (constraints non-negotiable)
- `.planning/source/trinket-dev-synthesis-v0.1.md` §4.2 — Brain dump mechanic spec (user story, 5-step flow: entry / capture / newline-or-pause separation / semantic categorization / inert-by-default + one-tap promote). §2 hard constraints (AI boundary: input-processing only, on-device-preferred, no content payloads). §6.1 stack. §10 open decisions (semantic categorization — closed by D-09).
- `.planning/REQUIREMENTS.md` — DUMP-01..05 (lines 37-41), the acceptance contract.
- `.planning/ROADMAP.md` — Phase 4 section: goal, Mode: mvp, 5 success criteria, UI hint: yes, Depends on Phase 1 + Phase 3.

### Stack guidance (STT + classification — the two risk areas)
- `CLAUDE.md` — **Speech-to-Text** section (`expo-speech-recognition`: on-device option, config plugin for Android package-visibility + permission strings, single-maintainer MEDIUM-confidence caveat, `@react-native-voice/voice` documented fallback; NOT Expo-Go-compatible → prebuild/dev client). **On-Device Semantic Categorization** section (rule-based keyword classifier recommended for MVP; ExecuTorch as the escalation-only fallback; no cloud LLM primary). Plus project constraints: token-only styling + `lint:hex`, i18next-only PL/EN copy, PDA/contextual-permission grammar, shame-free design, no-content-payloads.
- `.planning/STATE.md` — Blockers/Concerns: the two Phase 4 de-risking flags (STT single-maintainer + Polish-on-device unverified → device-matrix spike; rule-based-vs-ExecuTorch → confirm before escalating). D-02/D-09 resolve both.

### Design
- `design/DESIGN-SYSTEM.md` — palette/typography, dual-accent rule (terracotta = action, amber = mascot-only).
- `design/mockups/30a0b6e4-Brain_dump___listening.html` — the voice-capture "listening" state: mascot ears-forward, "I'm listening. Take your time.", live transcript, "or type instead" fallback. Layout/tone reference for the capture view.

### Data layer & the promote path (extend, don't rebuild)
- `data/types.ts` — `DumpItem` schema already landed: `{ id, text, category (REQUIRED), createdAt, promotedTaskId? }`; `DumpItemCategory = errands|work|home|people|someday`.
- `data/repositories/dumpItems.ts` — `dumpItemsRepo` CRUD (create spreads `...input` then sets fresh `id`/`createdAt`); capture writes here at Save.
- `.planning/phases/03-co-pilot-end-to-end/03-CONTEXT.md` D-02 + `src/app/co-pilot.tsx` (`beginSession`, `SetupPhase` dump-item picker) — the Co-pilot session-start path D-14 reuses.
- `data/repositories/__tests__/schema.denylist.test.ts` — the draft key (D-06) and any new field must pass this guard.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `dumpItemsRepo` (`data/repositories/dumpItems.ts`) — built + tested in Phase 1; capture creates items here, correction/edit/delete/promote update them. No new repository needed.
- `src/app/brain-dump.tsx` — current themed/localized stub; this phase replaces it with the capture view + grouped list (D-12).
- Phase 3 `src/app/co-pilot.tsx` `beginSession` + `SetupPhase` — the promote target (D-14 reuses it; the dump-item picker already consumes `dumpItemsRepo`).
- `DumpItem` type + `DumpItemCategory` union — classifier returns one of these; correction cycles among them.
- `Screen` + `useTheme()` + i18n `t()` pipeline, token-only styling (`lint:hex` fail-closed), `i18next/no-literal-string` — established screen conventions.
- `data/mmkv.ts` `contentStorage` — the draft key (D-06) lives here.
- `__mocks__/` native-module mock precedent (react-native-mmkv, expo-localization, lottie-react-native, reanimated/worklets) — the pattern for mocking `expo-speech-recognition` under Jest.
- Pure-function + TDD precedent (`reconcileActiveSession`, `useElapsedSession`) — the classifier follows it.

### Established Patterns
- Repositories-over-MMKV; `createdAt` via repo, no aggregates; schema denylist test structurally forbids streak/daily/diagnosis fields — constrains the D-06 draft key naming.
- Token-only styling, i18next-only copy (PL/EN, warm/plain/gender-neutral), offers-never-instructs grammar — capture copy ("I'm listening", "or type instead") and category labels all via `t()`.
- Contextual permission (PDA grammar) — mic permission asked on first use, never upfront (D-03), mirroring the Starter notification-permission posture.
- TDD RED→GREEN commit pairing for logic-heavy work (the classifier, the newline parser) — Phase 1/2/3 precedent.
- `npm run verify` (eslint + hex gate + jest) verification bundle.

### Integration Points
- Home (`src/app/index.tsx`) → `/brain-dump` route already wired and ≤2 taps (DUMP-05 satisfied by Phase 1's home-hub; do not regress).
- `/brain-dump` → `/co-pilot` — the promote path (D-14), reusing `beginSession`.
- **`expo-speech-recognition` is a NET-NEW native dependency** — `npx expo install`, config plugin (Android manifest package-visibility for `com.google.android.googlequicksearchbox` + iOS/Android permission strings in `app.json`), `npx expo prebuild --clean`, dev-client rebuild. First native change since Phase 2's Lottie → **this phase's SUMMARY must carry the "run `npx expo prebuild --clean` after pulling" agent-rule note** (CLAUDE.md convention). The STT spike (D-02) is the natural place iOS-device verification (the standing carried blocker) would matter, though it remains formally deferred to the pre-Phase-9 gate.

</code_context>

<specifics>
## Specific Ideas

- Mockup voice tone: "I'm listening. Take your time." — mascot ears-forward, live transcript, unhurried. The capture moment is *relief/offloading* ("my head is full… it's out of my head"), not task management. Copy should feel like being listened to, not prompted.
- Voice is the aspirational feel (the mockup), but text is the load-bearing reliability (D-01) — the design should read voice-first while the architecture stays text-first.
- Categories are *suggestions the user can change*, not a verdict — the correction affordance should feel light and non-authoritative (the classifier "does not need to be right, it needs to not be annoying," per CLAUDE.md).

</specifics>

<deferred>
## Deferred Ideas

- **ExecuTorch on-device classification** — post-launch escalation only if categorization quality becomes a real complaint (D-09). Not this phase.
- **Network / platform-network STT fallback** — only considered IF the D-02 spike shows Polish on-device recognition is unavailable; the decision (and whether it's even acceptable vs. the on-device-preferred stance) is deferred to the spike outcome, surfaced to the founder then.
- **`@react-native-voice/voice`** — documented STT fallback if `expo-speech-recognition` proves unstable in the spike.
- **Dump-item → Starter path** (source §4.3 "Entry: from home or from a Brain dump item") — belongs to Phase 5 (Starter), not here. A brain-dump item promoting into a Starter intention is a Phase 5 concern.
- **Text-edit re-classification** — an edit does NOT auto-re-suggest a category (D-13); revisit only if it feels wrong.
- **iOS physical-device verification** — still the standing carried hard-gate blocker (pre-Phase-9). The STT spike is where it would naturally surface, but it remains formally deferred.

</deferred>

---

*Phase: 04-brain-dump*
*Context gathered: 2026-07-03*
