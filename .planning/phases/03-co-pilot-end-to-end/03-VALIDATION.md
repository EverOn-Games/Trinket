---
phase: 3
slug: co-pilot-end-to-end
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-03
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x via jest-expo (existing, Phase 1) |
| **Config file** | jest config in package.json + jest.setup.ts |
| **Quick run command** | `npx jest --silent` (scoped: `npx jest <path> --silent`) |
| **Full suite command** | `npm run verify` (eslint + hex gate + jest) |
| **Estimated runtime** | ~30-60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --silent` (scoped to touched test files where possible)
- **After every plan wave:** Run `npm run verify`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

*Filled by the planner — one row per task. See RESEARCH.md §Validation Architecture for the phase-specific verification seams (reconciliation logic, elapsed-time derivation, heartbeat, mascot state driving, quiet-log rendering).*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| — | — | — | PILOT-01..07 | — | — | unit/integration | `npx jest --silent` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Session lifecycle/reconciliation test stubs (fake timers + AppState mock) — PILOT-06
- [ ] Elapsed-time derivation test stubs (timestamp-based, fake `Date.now()`) — PILOT-02/03
- [ ] Existing infrastructure (jest-expo, `__mocks__/` for react-native-mmkv, expo-localization, lottie-react-native, reanimated/worklets) covers the remaining phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mascot presence/dozing/acknowledge feel calm and smooth in a real session | PILOT-03/04/05 | Animation feel is not assertable under Jest | Start a session on the Android device; observe presence loop, doze after threshold (use a dev shortcut/reduced threshold), wake on touch, acknowledge on end |
| Force-quit → relaunch reconciliation on device | PILOT-06 | Process kill cannot be simulated in Jest | Start session, force-quit app, relaunch within threshold → resume card; relaunch after threshold (clock skew or dev override) → silent close, quiet-log entry present |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
