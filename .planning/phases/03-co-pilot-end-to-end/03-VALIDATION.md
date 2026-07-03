---
phase: 3
slug: co-pilot-end-to-end
status: approved
nyquist_compliant: true
wave_0_complete: true
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
| **Quick run command** | `npm test -- --testPathPattern="<scope>"` |
| **Full suite command** | `npm run verify` (eslint + hex gate + jest) |
| **Estimated runtime** | ~30-60 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task's scoped `npm test -- --testPathPattern=...` command
- **After every plan wave:** Run `npm run verify`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | PILOT-06 | T-03-01 | Corrupted `activeSession` pointer JSON tolerated (try/catch, no crash) | unit (TDD) | `npm test -- --testPathPattern="repositories\|schema.denylist"` | ✅ (extends existing tests) | ⬜ pending |
| 03-01-02 | 01 | 1 | PILOT-03 | T-03-02 | Negative elapsed clamped to 0 on clock skew | unit (TDD) | `npm test -- --testPathPattern="useElapsedSession"` | ❌ W0 (new test file) | ⬜ pending |
| 03-01-03 | 01 | 1 | PILOT-06 | T-03-02 | Reconciliation never crashes on skewed/stale timestamps; `endedAt = lastAliveAt` | unit (TDD) | `npm test -- --testPathPattern="reconcileActiveSession"` | ❌ W0 (new test file) | ⬜ pending |
| 03-02-01 | 02 | 2 | PILOT-01 | T-03-05 | Home start action idempotent (D-16 resume-on-reentry) | integration | `npm test -- --testPathPattern="screens" && npx tsc --noEmit` | ✅ (rewrites existing) | ⬜ pending |
| 03-02-02 | 02 | 2 | PILOT-01, PILOT-02 | T-03-05 | Double-tap start guarded (`isStartingSessionRef`) | lint + typecheck | `npm run lint && npm run lint:hex && npx tsc --noEmit` | ✅ | ⬜ pending |
| 03-02-03 | 02 | 2 | PILOT-03, PILOT-04 | T-03-05 | End button single-fire (`isEndingSessionRef`), pointer cleared | integration | `npm test -- --testPathPattern="screens" && npm run lint:hex && npx tsc --noEmit` | ✅ | ⬜ pending |
| 03-03-01 | 03 | 3 | PILOT-05 | T-03-06 | i18n keys only — no user content in strings/logs | source assertion | `npx tsc --noEmit && node -e "const en=require('./i18n/locales/en.json'); const pl=require('./i18n/locales/pl.json'); if(!en.coPilot.ending.moodCheck.good\|\|!pl.coPilot.ending.moodCheck.good\|\|!en.history.duration_one\|\|!pl.history.duration_many\|\|en.history.sessionFallbackLabel!=='Just worked'){process.exit(1)}"` | ✅ | ⬜ pending |
| 03-03-02 | 03 | 3 | PILOT-05 | T-03-04 | Mood clamped to 1\|2\|3; skip stores no mood | integration | `npm test -- --testPathPattern="screens" && npm run lint:hex && npx tsc --noEmit` | ✅ | ⬜ pending |
| 03-03-03 | 03 | 3 | PILOT-07 | T-03-06 | History renders flat log, no aggregates computed/stored | integration | `npm test -- --testPathPattern="screens" && npm run lint:hex && npx tsc --noEmit` | ✅ | ⬜ pending |
| 03-04-01 | 04 | 4 | PILOT-06 | T-03-01, T-03-02 | Boot sweep silent, tolerant of corrupt state, zero interruption copy | integration | `npm test -- --testPathPattern="screens" && npx tsc --noEmit` | ✅ | ⬜ pending |
| 03-04-02 | 04 | 4 | PILOT-06 | T-03-05 | Resume card offers (never demands); "Not now" ends silently at `lastAliveAt` | integration | `npm test -- --testPathPattern="screens" && npm run lint:hex && npx tsc --noEmit` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky. Task IDs map to plan task order; see each PLAN.md for authoritative task text.*

---

## Wave 0 Requirements

- [x] Plan 03-01 is itself the Wave 0/TDD foundation: it creates `useElapsedSession.test.ts` and `reconcileActiveSession.test.ts` RED-first (TDD tasks), extending the existing jest-expo + `__mocks__/` infrastructure (react-native-mmkv, expo-localization, lottie-react-native, reanimated/worklets). AppState is mocked inline via `jest.spyOn` per the `useReducedStimulus.test.ts` idiom — no new mock files needed.
- [x] Existing infrastructure covers all remaining phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mascot presence/dozing/acknowledge feel calm and smooth in a real session | PILOT-03/04/05 | Animation feel is not assertable under Jest | Start a session on the Android device; observe presence loop, doze after threshold (use a dev shortcut/reduced threshold), wake on touch, acknowledge on end |
| Force-quit → relaunch reconciliation on device | PILOT-06 | Process kill cannot be simulated in Jest | Start session, force-quit app, relaunch within threshold → resume card; relaunch after threshold (clock change or dev override) → silent close, quiet-log entry present |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (Plan 03-01 TDD tasks create the two new test files)
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-03 (plan-checker Dimension 8: PASS)
