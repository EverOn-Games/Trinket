---
phase: 4
slug: brain-dump
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-03
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x via jest-expo (existing, Phase 1) |
| **Config file** | jest config in package.json + jest.setup.ts |
| **Quick run command** | `npm test -- --testPathPattern="<scope>"` |
| **Full suite command** | `npm run verify` (eslint + hex gate + mascot-asset gate + jest) |
| **Estimated runtime** | ~30-60 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task's scoped `npm test -- --testPathPattern=...`
- **After every plan wave:** Run `npm run verify`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

*Filled by the planner — one row per task. Key phase-specific verification seams: the pure keyword `classify()` function (TDD, PL+EN cases, ties→someday), the newline stream parser (trim/drop-blanks/1–N items), the draft persist/restore/clear cycle, the STT fallback + permission logic (mocked `expo-speech-recognition`), the grouped-by-category list + inline re-categorize, and the promote→beginSession hand-off. The real on-device Polish STT recognition is a MANUAL/device item (see below), not automatable here.*

*(Rollup — one row per plan's primary automated gate; authoritative per-task `<verify>` blocks live in each PLAN.md. All commands use the correct singular `--testPathPattern` — the plural-flag defect the plan-checker found was fixed across all 6 plans before this table was filled.)*

| Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01 | 1 | DUMP-01, DUMP-03 | unit (TDD) | `npm test -- --testPathPattern=parseDumpText`; `npm test -- --testPathPattern=classify` | ❌ W0 (new pure-fn tests) | ⬜ pending |
| 04-02 | 1 | DUMP-01 | unit + i18n-key assertion | `npm test -- --testPathPattern=draft`; node i18n-key presence check (en+pl) | ❌ W0 (draft test) / ✅ (i18n) | ⬜ pending |
| 04-03 | 2 | DUMP-01, DUMP-05 | integration (TDD) | `npm test -- --testPathPattern=brainDumpCapture` | ❌ W0 (new screen test) | ⬜ pending |
| 04-04 | 3 | DUMP-03, DUMP-04 | integration | `npm test -- --testPathPattern=brainDumpItemRow` | ❌ W0 (new row test) | ⬜ pending |
| 04-05 | 3 | DUMP-04 | integration | `npm test -- --testPathPattern=screens` | ✅ (extends existing) | ⬜ pending |
| 04-06 | 4 | DUMP-02 | unit (mocked STT) + config assertion | `npm test -- --testPathPattern="appendFinalSegmentToDraft\|useVoiceCapture"`; app.json plugin + voice-copy check | ❌ W0 (STT mock + hook tests) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky. Real Polish on-device STT recognition is NOT in this table — it is a device/manual item (see below), by design.*

---

## Wave 0 Requirements

- [ ] Pure-function classifier test stubs (`classify(text, locale)` — PL + EN keyword cases, tie→someday, no-match→someday) — DUMP-03
- [ ] Newline-parser test stubs (trim, drop blanks, 1→N items, empty→no-op) — DUMP-01
- [ ] Draft persist/restore/clear test stubs (single MMKV key) — D-06
- [ ] `expo-speech-recognition` Jest mock (`__mocks__/` + jest.setup.ts registration), mirroring the lottie/mmkv/localization mock precedent — required so the voice UI + fallback are unit-testable without a device — DUMP-02
- [ ] Existing infrastructure (jest-expo, existing `__mocks__/`) covers the remaining phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real Polish (`pl-PL`) on-device speech recognition on target low/mid-tier Android | DUMP-02 | Native STT + on-device language packs cannot run in the JS test env or this remote container — this IS the D-02 spike | On a real device with `pl-PL` set: tap the mic, speak several Polish items with pauses, confirm the transcript appears and that pauses produce separate lines; confirm on-device (airplane-mode) recognition works or document that it falls back |
| Continuous-mode utterance segmentation ("one final utterance = one line") across manufacturer SpeechRecognizer variants | DUMP-02 | Manufacturer STT behavior varies and is unobservable off-device | Speak 3 items with clear pauses; assert 3 lines appear; repeat on a second Android make if available |
| Mic-permission-denied + STT-unavailable graceful fallback feel | DUMP-02 | Real permission dialogs / unavailable-service states need a device | Deny mic permission → confirm the mic is hidden/disabled and text capture is fully usable with no error state |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (incl. the STT Jest mock — 04-06)
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-03 (after the plan-checker's `--testPathPatterns`→`--testPathPattern` fix across all 6 plans)
