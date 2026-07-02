---
phase: 2
slug: mascot-module
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-02
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest (jest-expo preset, established Phase 1) |
| **Config file** | package.json jest block + existing `__mocks__/` (expo-localization, react-native-mmkv precedents) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm run verify` (eslint + hex gate + mascot-asset gate + jest) |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm run verify`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-T1 | 02-01 | 1 | MASC-01 (D-08) | — | mascotGlow token exists + passes hex-format guard | unit | `npm test -- --testPathPattern=tokens` | theme/__tests__/tokens.test.ts | ⬜ pending |
| 01-T2 | 02-01 | 1 | MASC-03 | T-02-01 | Source-scan forbids any 6th/negative mascot state | source-scan | `npm test -- --testPathPattern=noNegativeStates` | src/components/Mascot/__tests__/noNegativeStates.test.ts | ⬜ pending |
| 01-T3 | 02-01 | 1 | MASC-01 (D-05) | T-02-02 | mascotProminence persists; denylist guard still green | unit | `npm test -- --testPathPattern="repositories\|schema.denylist"` | data/repositories/__tests__/repositories.test.ts | ⬜ pending |
| 02-T1 | 02-02 | 1 | MASC-01 (D-04) | T-02-SC | lottie installed by explicit name; Jest mock resolves | install/smoke | `node -e "…lottie-react-native…" && npm test -- --testPathPattern=tokens` | __mocks__/lottie-react-native.tsx | ⬜ pending |
| 02-T2 | 02-02 | 1 | MASC-04 | T-02-01 | Fail-closed 300KB gate proven to exit 1 + violation line on oversized probe | gate probe (pos+neg) | probe: valid `{}`→exit 0, >300KB→exit 1 + violation ⇒ `GATE_FAILS_CLOSED` | scripts/check-mascot-asset-size.mjs | ⬜ pending |
| 02-T3 | 02-02 | 1 | MASC-01, MASC-02 (D-01/D-02) | T-02-01 | 5 assets under gate; idle carries 3 named markers | asset validation | `node scripts/check-mascot-asset-size.mjs && node -e "…markers…"` | assets/mascot/mascot_idle.json | ⬜ pending |
| 03-T1 | 02-03 | 2 | MASC-02 | T-02-03 | resolveMarkers defensive on both cm encodings; empty→{} | unit (TDD) | `npm test -- --testPathPattern=markers` | src/components/Mascot/__tests__/markers.test.ts | ⬜ pending |
| 03-T2 | 02-03 | 2 | MASC-02 | T-02-04 | Weighted, interval-bounded idle scheduler paused when non-idle | unit fake-timers (TDD) | `npm test -- --testPathPattern=useIdleScheduler` | src/components/Mascot/__tests__/useIdleScheduler.test.ts | ⬜ pending |
| 03-T3 | 02-03 | 2 | MASC-02 | — | Reduced-stimulus = OS OR host prop, with listener cleanup | unit (TDD) | `npm test -- --testPathPattern=useReducedStimulus` | src/components/Mascot/__tests__/useReducedStimulus.test.ts | ⬜ pending |
| 04-T1 | 02-04 | 3 | MASC-01, MASC-03, MASC-04 | T-02-05 | RED contract pins single-LottieView + one-shot + clamp behaviors | contract RED | `npm test -- --testPathPattern=Mascot.test 2>&1 \| tail -20` | src/components/Mascot/__tests__/Mascot.test.tsx | ⬜ pending |
| 04-T2 | 02-04 | 3 | MASC-01, MASC-03, MASC-04 | T-02-05, T-02-01, T-02-06 | Single persistent LottieView, lazy assets, clamp→idle, safe fallback | component GREEN | `npm test -- --testPathPattern=Mascot.test && npm run lint:hex` | src/components/Mascot/Mascot.tsx | ⬜ pending |
| 05-T1 | 02-05 | 4 | MASC-01 | — | Per-state accessibility copy present + parallel in en + pl | i18n parity | `node -e "…mascot.accessibility parity…"` | i18n/locales/pl.json | ⬜ pending |
| 05-T2 | 02-05 | 4 | MASC-01 (D-07) | T-02-07 | Home mounts real Mascot; greeting flag in-memory only (no persisted timestamp) | integration | `npm test -- --testPathPattern=screens && npm run lint:hex` | src/app/index.tsx | ⬜ pending |
| 05-T3 | 02-05 | 4 | MASC-04 (D-03/D-04) | T-02-01 | Perceptual on-device smoothness (Android) — human-verify only | manual / human-check | MISSING — human-verify (see Manual-Only Verifications) | (device checkpoint, no source) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Nyquist note: every task carries an `<automated>` command except 05-T3, which is a legitimately manual perceptual verification (MASC-04 smoothness) documented in Manual-Only Verifications below — no jsdom/jest assertion is possible. Automated coverage for the module logic it exercises lives in Plans 02-03 and 02-04. No run of 3+ consecutive tasks lacks an automated verify.*

---

## Wave 0 Requirements

- [x] `__mocks__/lottie-react-native.tsx` — View-stub mock with imperative ref (play/pause/resume/reset) mirroring the Phase 1 native-mock precedent (required before any Mascot component test can run). **Covered by Plan 02-02 Task 1** (Wave 1), which creates the mock and registers it in `jest.setup.ts` before any consumer test in Plans 02-03/02-04 runs.

*Existing jest infrastructure (jest-expo, mocks pattern) covers everything else.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No visible stutter/frame drop | MASC-04 | Perceptual smoothness cannot be asserted in jsdom/jest | Android device checkpoint: `npm run android:fresh`, observe idle loop + micro-behaviors + state transitions on real low/mid-tier Android hardware (per CONTEXT.md D-03, Android-only) |
| Micro-behaviors feel calm, non-attention-grabbing | MASC-02 (qualitative) | Interval bounds are unit-testable; the felt effect is not | Same device checkpoint: watch idle state ≥60s, confirm micro-behaviors are noticed-not-announced |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (05-T3 is a documented Manual-Only perceptual check)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (lottie mock → Plan 02-02 Task 1)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-02
