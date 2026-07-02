---
phase: 1
slug: scaffold-foundations
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-02
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest via `jest-expo` preset + `@testing-library/react-native`; ESLint (flat config) with `eslint-plugin-i18next`; `tsc --noEmit`; `scripts/check-hex-literals.mjs` |
| **Config file** | `jest.config.js`, `eslint.config.js` — none exist yet; created in Plan 02 (Wave 2) |
| **Quick run command** | `npx tsc --noEmit && npx eslint . && npx jest --watchAll=false` |
| **Full suite command** | `npx tsc --noEmit && npx eslint . --max-warnings=0 && npx jest --watchAll=false && node scripts/check-hex-literals.mjs && npx expo-doctor` |
| **Estimated runtime** | ~10-30 seconds (small Phase 1 surface) |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit && npx eslint . && npx jest --watchAll=false`
- **After every plan wave:** Run the full suite command + `npx expo-doctor`
- **Before `/gsd:verify-work`:** Full suite green + user sign-off on the device-boot checkpoint (Plan 06 Task 3)
- **Max feedback latency:** < 30s

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | FND-01 | T-01-01/T-01-SC | No unexpected postinstall on native pkgs; mrousavy MMKV | smoke | `node -e "require('./package.json')..."` (deps + SDK 56 check) | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | FND-01 | T-01-03 | app.json identity + no newArchEnabled; eas.json valid | static | `node -e` app.json/eas.json/tsconfig assertions | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 2 | FND-02 | T-01-04 | MMKV mock isolates test from native binding | unit | `npx jest --watchAll=false` (smoke) | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 2 | FND-05 | T-01-06/T-01-SC | no-literal-string rule active | static | `npx eslint --print-config app/index.tsx \| grep no-literal-string` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 3 | FND-04 | T-01-05 | token-only styling | unit | `npx jest theme --watchAll=false` | ❌ W0 | ⬜ pending |
| 1-03-02 | 03 | 3 | FND-04 | T-01-05 | no hex outside theme/ | static | `node scripts/check-hex-literals.mjs` | ❌ W0 | ⬜ pending |
| 1-04-01 | 04 | 3 | FND-05 | T-01-06 | copy via t(); no compatibilityJSON | static/unit | `npx tsc --noEmit` + JSON validity | ❌ W0 | ⬜ pending |
| 1-04-02 | 04 | 3 | FND-05 | T-01-06 | CLDR Polish plurals; D-07 locale resolution | unit | `npx jest i18n --watchAll=false` | ❌ W0 | ⬜ pending |
| 1-05-01 | 05 | 3 | FND-02 | T-01-08/T-01-10 | createMMKV v4; namespaced CRUD | unit | `npx jest data/repositories --watchAll=false` | ❌ W0 | ⬜ pending |
| 1-05-02 | 05 | 3 | FND-02 | T-01-09 | no streak/daily/diagnosis fields | unit | `npx jest data --watchAll=false` (denylist) | ❌ W0 | ⬜ pending |
| 1-06-01 | 06 | 4 | FND-01/04/05 | T-01-06 | providers mounted; zero hardcoded copy/hex | static | `npx eslint app components --max-warnings=0` + hex gate | ❌ W0 | ⬜ pending |
| 1-06-02 | 06 | 4 | FND-02 | T-01-11 | real UI write -> MMKV -> History read | unit | `npx jest app --watchAll=false` | ❌ W0 | ⬜ pending |
| 1-06-03 | 06 | 4 | FND-01 | — | real-device boot via dev-client | manual-only | — (human checkpoint) | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `jest.config.js` + `jest.setup.ts` — preset jest-expo, registers the MMKV mock (Plan 02)
- [ ] `__mocks__/react-native-mmkv.ts` — in-memory createMMKV/set/getString/remove fake (Plan 02, Pitfall 1)
- [ ] `eslint.config.js` — eslint-plugin-i18next no-literal-string flat config (Plan 02)
- [ ] `scripts/check-hex-literals.mjs` — hex-literal gate (Plan 03)
- [ ] `data/repositories/__tests__/schema.denylist.test.ts` — streak/daily/diagnosis field guard (Plan 05)
- [ ] Framework install: `jest-expo jest @testing-library/react-native` + `eslint-plugin-i18next` (Plan 01)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| App boots on physical iOS + Android via dev-client | FND-01 (success criterion 1) | No Xcode/Android SDK/devices in the Linux sandbox; iOS has no Linux build path at all | Plan 06 Task 3: EAS dev-client build, install on physical iOS + Android, confirm home->write->History flow |
| Dark earthy palette looks correct (subjective visual) | FND-04 | Visual aesthetic judgment is not automatable | Spot-check in a simulator/emulator if available, else during device verification |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or are the explicit manual-only device checkpoint
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (only the final Task 1-06-03 is manual, by necessity)
- [x] Wave 0 covers all MISSING references (harness, mock, lint, hex gate, denylist)
- [x] No watch-mode flags (all use --watchAll=false)
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
