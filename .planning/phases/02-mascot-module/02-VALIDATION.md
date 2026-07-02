---
phase: 2
slug: mascot-module
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| **Full suite command** | `npm run verify` (eslint + hex gate + jest) |
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
| *(filled by planner from PLAN.md tasks — see RESEARCH.md § Validation Architecture for the requirement→test mapping)* | | | | | | | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__mocks__/lottie-react-native.tsx` — View-stub mock with imperative ref (play/pause/resume/reset) mirroring the Phase 1 native-mock precedent (required before any Mascot component test can run)

*Existing jest infrastructure (jest-expo, mocks pattern) covers everything else.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No visible stutter/frame drop | MASC-04 | Perceptual smoothness cannot be asserted in jsdom/jest | Android device checkpoint: `npm run android:fresh`, observe idle loop + micro-behaviors + state transitions on real low/mid-tier Android hardware (per CONTEXT.md D-03, Android-only) |
| Micro-behaviors feel calm, non-attention-grabbing | MASC-02 (qualitative) | Interval bounds are unit-testable; the felt effect is not | Same device checkpoint: watch idle state ≥60s, confirm micro-behaviors are noticed-not-announced |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
