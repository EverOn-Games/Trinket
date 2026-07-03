---
phase: 03-co-pilot-end-to-end
plan: 04
subsystem: ui
tags: [react-native, expo-router, mmkv, i18n, reconciliation, session-lifecycle]

# Dependency graph
requires:
  - phase: 03-01
    provides: "reconcileActiveSession pure decision function, activeSessionRepo pointer repo (start/heartbeat/read/clear), the 12h STALE_THRESHOLD_MS discretion value this plan consumes verbatim"
  - phase: 03-02
    provides: "co-pilot.tsx's flowPhase initializer reading activeSessionRepo.read() on mount, resuming the active phase directly (D-16) — the destination Resume routes to"
  - phase: 03-03
    provides: "sessionsRepo.update shallow-merge semantics + history.tsx row rendering that treats a mood-less ended session as an ordinary row — the destination the D-12 sweep's reconciled sessions land in"
provides:
  - "useReconcileActiveSession boot-time sweep hook wired into RootLayout (D-12 silent cold-launch reconciliation)"
  - "Exported STALE_THRESHOLD_MS constant (12h) shared between _layout.tsx and index.tsx"
  - "Home resume card (D-11) replacing the primary Start offer when a session is live, with Resume/Not now actions"
  - "home.resumeCard.* i18n copy (EN+PL)"
affects: [phase 9 beta hardening offline-correctness sweep, any future screen needing the STALE_THRESHOLD_MS/reconcileActiveSession pattern]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Screen-level independent liveness re-check: a screen that conditionally renders based on a boot-time sweep's outcome must not trust 'pointer exists' alone — it re-runs the same pure decision function itself, since React always commits a component's first render before any effect (including the sweep) has run"
    - "Shared threshold constant exported from a route file (_layout.tsx) and imported by a sibling screen (index.tsx), rather than duplicating the literal value, to keep a single source of truth while still satisfying a plan's grep-verifiable requirement that the constant be defined in _layout.tsx"

key-files:
  created: []
  modified:
    - src/app/_layout.tsx
    - src/app/index.tsx
    - src/app/__tests__/screens.test.tsx
    - i18n/locales/en.json
    - i18n/locales/pl.json

key-decisions:
  - "Home independently re-verifies pointer liveness via reconcileActiveSession (not just pointer existence) — necessary, not just defensive, because React commits a component's first render before any effect in the tree fires, so Home's very first render is guaranteed to happen before _layout.tsx's useReconcileActiveSession effect runs"
  - "STALE_THRESHOLD_MS defined and exported from _layout.tsx (satisfying the plan's grep-verifiable literal-constant requirement) and imported by index.tsx, rather than duplicating the 12h literal in both files"
  - "Home's resume-dismissal state (dismissedActiveSession) is a plain boolean useState, not a re-read counter — this is what forces a re-render after 'Not now' since activeSessionRepo.read() alone in the render body has no reactive subscription"

patterns-established:
  - "Pure decision function reused at two call sites (boot-sweep mutation + screen-level render gate) sharing one exported threshold constant, rather than the screen trusting the sweep's side effect to have already landed"

requirements-completed: [PILOT-06]

# Metrics
duration: ~16min
completed: 2026-07-03
---

# Phase 3 Plan 4: Cold-Launch Reconciliation + Home Resume Card Summary

**Silent D-12 boot sweep (`useReconcileActiveSession`) wired into `_layout.tsx`, plus a Home resume card (D-11) that independently re-verifies pointer liveness to close a render-before-effect race the boot sweep alone could not prevent.**

## Performance

- **Duration:** ~16 min
- **Started:** 2026-07-03T01:53:29Z (approx., immediately after Plan 03-03 completed)
- **Completed:** 2026-07-03T02:09:27Z
- **Tasks:** 2
- **Files modified:** 5 (src/app/_layout.tsx, src/app/index.tsx, src/app/__tests__/screens.test.tsx, i18n/locales/en.json, i18n/locales/pl.json)

## Accomplishments
- `useReconcileActiveSession()` mounted in `RootLayout` alongside the existing two locale hooks; delegates the keep-live/reconcile-stale decision entirely to Plan 01's pure `reconcileActiveSession` function, only writing `sessionsRepo.update(id, { endedAt })` + `activeSessionRepo.clear()` on the stale branch — silent, no card, no mention anywhere (D-12)
- `STALE_THRESHOLD_MS` (12h, Plan 01's fixed discretion value) defined once in `_layout.tsx` and exported for `index.tsx` to import, avoiding a duplicated literal while still satisfying the plan's grep-verifiable "constant lives in `_layout.tsx`" requirement
- Home's resume card (D-11): reads `activeSessionRepo.read()` fresh on every render and independently re-verifies liveness via the *same* `reconcileActiveSession` gate the boot sweep uses — this is this plan's key correctness finding, not just extra caution (see Decisions and Deviations below)
- Resume routes to `/co-pilot`, which resumes the already-live session per Plan 02's D-16 initializer (no duplicate `Session` created); "Not now" silently ends the session at `lastAliveAt` with zero confirmation/Alert, then Home falls back to the primary offer via a `dismissedActiveSession` state flag
- `home.resumeCard.{kicker,withLabel,withoutLabel,resume,notNow}` added to en.json/pl.json verbatim per UI-SPEC Screen Contracts §4 — continuity language only ("Still with…"/"Pick it up?"/"Resume"/"Not now"), grep-verified absence of "paused"/"interrupt" anywhere in either locale file
- 4 new integration tests (live pointer shows the card, not the primary offer; Resume re-enters without duplicating; Not now clears the pointer and sets `endedAt`; a stale pointer never shows a card and reconciles into History as an ordinary row with zero interruption language) — full `npm run verify` green, 15 suites / 109 tests

## Task Commits

Each task was committed atomically:

1. **Task 1: useReconcileActiveSession boot sweep + resume-card i18n copy** — `880ee78` (feat)
2. **Task 2: Home resume card + reconciliation integration tests** — `1718b43` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `src/app/_layout.tsx` — added exported `STALE_THRESHOLD_MS` (12h) and `useReconcileActiveSession()` mount-once hook (mirrors `usePersistResolvedLocale`'s shape), wired into `RootLayout` alongside the existing locale hooks
- `src/app/index.tsx` — resume-card gating (`pointer`/`showResumeCard` derived in the render body via `activeSessionRepo.read()` + `reconcileActiveSession`), `handleResume`/`handleNotNow` handlers, resume-card styles, JSX swap that replaces the primary offer with the card when a session is live
- `src/app/__tests__/screens.test.tsx` — new `describe('Home resume card (PILOT-06, D-11, D-12, T-03-05)', ...)` block with 4 integration tests
- `i18n/locales/en.json` / `pl.json` — `home.resumeCard.*` keys (kicker, withLabel, withoutLabel, resume, notNow)

## Decisions Made
- Home independently re-verifies liveness via `reconcileActiveSession(pointer, nowAtMount, STALE_THRESHOLD_MS).kind === 'keep-live'`, not just `pointer !== undefined`. This is required for correctness, not optional caution: React always fully renders and commits a component before any effect anywhere in the tree fires, so Home's very first render happens strictly before `_layout.tsx`'s `useReconcileActiveSession` effect runs — and that effect performs its write via plain MMKV calls (no React state setter), so it can never trigger a Home re-render on its own. Without Home's own check, a stale pointer would flash a resume card on the very first frame and stay there indefinitely (nothing would ever correct it), directly violating D-12's "no mention anywhere." The new stale-pointer integration test proves this holds.
- `STALE_THRESHOLD_MS` is defined once, in `_layout.tsx` (satisfying the plan's literal grep acceptance criterion requiring the `12 * 60 * 60 * 1000` expression to appear in that specific file) and exported for `index.tsx` to import — avoiding a second, driftable copy of the same constant.
- Home's dismiss-after-"Not now" behavior uses a plain `dismissedActiveSession` boolean (`useState`), not a re-render-forcing counter — the cleanest way to make subsequent renders skip the MMKV read entirely once the user has dismissed the card, while still reading fresh on every other render (mirrors `co-pilot.tsx`'s `dumpItemsRepo.list()`-in-render-body precedent).
- `nowAtMount` is captured via a lazy `useState(() => Date.now())` initializer, never a bare `Date.now()` call in the render body — mirrors `history.tsx`'s `SessionRow` `nowFallback` precedent for `react-hooks/purity` compliance.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Variable named `activeSessionPointer` failed the plan's literal `pointer.lastAliveAt` grep acceptance criterion**
- **Found during:** Task 2 self-verification — the plan's acceptance criterion `grep -n "pointer.lastAliveAt" src/app/index.tsx` is case-sensitive; my first-pass implementation used `activeSessionPointer.lastAliveAt`, and the capital "P" in "...sessionPointer..." means the lowercase substring "pointer" never actually occurs in that identifier
- **Issue:** A naming-driven grep-gate miss, not a functional bug — the code was already behaviorally correct, just not verifiable by the stated gate
- **Fix:** Renamed `activeSessionPointer` to `pointer` throughout `index.tsx` (a scoped rename), matching the plan's own interfaces-section vocabulary, which consistently calls `activeSessionRepo.read()`'s return value "pointer"
- **Files modified:** `src/app/index.tsx`
- **Verification:** `grep -n "pointer.lastAliveAt" src/app/index.tsx` now matches; full test suite still green after the rename
- **Committed in:** `1718b43` (Task 2 commit — caught and fixed before committing, not a follow-up)

**2. [Rule 2 - Missing Critical] Home would have trusted pointer-existence alone, risking a resume card for a session the boot sweep is about to close**
- **Found during:** Task 2, while designing the stale-pointer test case the plan's own action text explicitly calls for ("after Plan 01's stale-reconcile path runs at boot, a stale pointer is not shown as a resume card")
- **Issue:** React guarantees a component's first render commits before any effect in the tree fires. Since `_layout.tsx`'s `useReconcileActiveSession` effect performs its reconciliation write via plain MMKV calls (not a React state setter), it can never trigger a Home re-render on its own. A literal reading of "when a live pointer exists, render a warm resume card" (checking only `pointer !== undefined`) would therefore show a resume card on Home's very first frame for a stale, about-to-be-closed session — and nothing would ever correct that render afterward, since Home has no other reason to re-render. This directly contradicts this plan's own most sensitive must_have ("no mention anywhere") and PILOT-06's "zero mention" requirement.
- **Fix:** Home now calls the same pure `reconcileActiveSession` function the boot sweep uses (sharing the exported `STALE_THRESHOLD_MS` constant) to independently re-verify `'keep-live'` before showing the card — a read-only check with no additional writes; the actual reconciliation write stays solely in `_layout.tsx`, preserving a single source of truth for the mutation.
- **Files modified:** `src/app/index.tsx`
- **Verification:** New test `'does not show a resume card for a stale pointer — it is reconciled at boot and appears as an ordinary History row (D-12)'` passes with the fix in place
- **Committed in:** `1718b43` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1x Rule 1, 1x Rule 2)
**Impact on plan:** The Rule 2 fix is the substantive one — it closes a real correctness gap that the plan's own required test case implicitly demanded but a literal reading of the action text's wording could have missed. No architectural change, no new files, no scope creep beyond what the plan's own must_haves and test list already required.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required
None — no external service configuration required. No native dependency was added or changed this plan (zero `npm install`/`expo install` commands ran), so no `npx expo prebuild --clean` is needed after pulling this plan's changes.

## Next Phase Readiness
- PILOT-06 is now fully satisfied end-to-end: Plan 01 built the pure decision function, pointer repo, and elapsed/heartbeat hook; this plan wires the decision into the boot path (`_layout.tsx`) and the one screen that must render correctly before the sweep's own effect has necessarily run (`index.tsx`).
- Phase 3 (Co-pilot End-to-End) is now complete — all four plans (session lifecycle core, setup/active screens, ending moment + history, cold-launch reconciliation + resume card) landed with `npm run verify` green throughout. PILOT-01 through PILOT-07 are all requirements-completed across the four plans.
- No native dependency was touched this phase (confirmed zero installs across all 4 plans) — no `npx expo prebuild --clean` note needed for this phase's completion message.
- The `useReconcileActiveSession`/`reconcileActiveSession`/`STALE_THRESHOLD_MS` pattern (pure decision function + thin effectful boot-sweep wrapper + an independent screen-level re-check for any screen that must render correctly before the sweep's effect can possibly have run) is reusable for any future boot-time reconciliation need in this codebase.

---
*Phase: 03-co-pilot-end-to-end*
*Completed: 2026-07-03*

## Self-Check: PASSED

All 5 claimed modified files verified present on disk (`src/app/_layout.tsx`, `src/app/index.tsx`, `src/app/__tests__/screens.test.tsx`, `i18n/locales/en.json`, `i18n/locales/pl.json`); both task commit hashes (`880ee78`, `1718b43`) verified present in git history.
