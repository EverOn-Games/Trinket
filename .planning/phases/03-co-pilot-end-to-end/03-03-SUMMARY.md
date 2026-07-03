---
phase: 03-co-pilot-end-to-end
plan: 03
subsystem: ui

# Dependency graph
requires:
  - phase: 03-02
    provides: "co-pilot.tsx flowPhase state machine ('setup' | 'active' | 'ending'), the quiet-close End stub this plan replaces, ActivePhase's isEndingSessionRef double-tap guard pattern"
  - phase: 03-01
    provides: "activeSessionRepo.clear(), sessionsRepo.update"
  - phase: 02-mascot-module
    provides: "<Mascot /> acknowledge one-shot state + onStateAnimationComplete contract"
provides:
  - "co-pilot.tsx EndingPhase: mascot acknowledge one-shot + numberless warm line + skippable 3-level mood check, single router.replace('/') exit"
  - "history.tsx SessionRow extended with per-session duration (CLDR-pluralized, 'Under a minute' floor) and a trailing mood glyph when present"
  - "coPilot.ending.* and history.duration_*/durationLessThanMinute i18n keys (EN+PL); gender-neutral history.sessionFallbackLabel value change"
affects: [03-04, home resume card, root layout reconciliation sweep]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Session-end write + flowPhase transition owned by the route's parent component (not the phase-specific child) whenever the next phase needs data (sessionId) the child doesn't itself hold — ActivePhase only double-tap-guards and delegates via an onEnd callback; CoPilotScreen's endSession() does the actual sessionsRepo.update/activeSessionRepo.clear/setFlowPhase"
    - "Single isFinishingRef guard shared across every exit trigger (mood tap x3, Skip, onStateAnimationComplete) — simpler than a separate moodAnswered flag, still fully satisfies 'at most one navigation + one write' (T-03-05)"
    - "Explicit accessibilityLabel on multi-Text-child Pressables (mood buttons) for deterministic query-by-role-name in tests, mirroring 03-02's 'Just work' card precedent"
    - "useState(() => Date.now()) lazy initializer for a render-time 'now' fallback, never a bare Date.now() call in a component's render body — react-hooks/purity (React Compiler) forbids the latter; mirrors useElapsedSession.ts's existing precedent"
    - "Test navigation assertions via jest.spyOn(router, 'replace') on expo-router's shared imperative-api singleton (useRouter() returns the same object) rather than renderRouter's/screen's getPathname() — that Object.assign-attached method does not survive @testing-library/react-native v14's async render/await unwrap"

key-files:
  created:
    - .planning/phases/03-co-pilot-end-to-end/03-03-SUMMARY.md
  modified:
    - src/app/co-pilot.tsx
    - src/app/history.tsx
    - src/app/__tests__/screens.test.tsx
    - i18n/locales/en.json
    - i18n/locales/pl.json

key-decisions:
  - "Mood glyph/value mapping (UI-SPEC Flag 5, Claude's discretion): 🙂=3 (good) / 😐=2 (okay) / 😣=1 (tough), listed left-to-right good-to-tough"
  - "endSession (sessionsRepo.update endedAt + activeSessionRepo.clear + setFlowPhase('ending')) lives in the parent CoPilotScreen, not ActivePhase, since flowPhase/activeSession state — and the sessionId the ending phase needs — already live there; ActivePhase keeps only its own isEndingSessionRef double-tap guard and calls the passed-in onEnd"
  - "A single isFinishingRef ref (not a separate moodAnswered boolean) gates every ending-phase exit path; simpler than the two-flag RESEARCH.md sketch while satisfying the same at-most-once-navigation contract"

patterns-established:
  - "Route-parent-owns-cross-phase-writes: whenever a later flowPhase needs an id/value the current phase's own component doesn't already hold as a prop, the write + transition moves to the parent rather than threading the value down and back up"

requirements-completed: [PILOT-05, PILOT-07]

# Metrics
duration: ~13min
completed: 2026-07-03
---

# Phase 3 Plan 3: Co-pilot Ending Moment + History Quiet Log Summary

**Replaced the Plan 02 quiet-close End stub with a real inline ending moment (mascot acknowledge one-shot, a duration-free warm line, a skippable 3-level mood check) and extended History's rows with per-session duration and a trailing mood glyph — no headers, no stats, still a flat quiet log.**

## Performance

- **Duration:** ~13 min
- **Started:** 2026-07-03T01:37:00Z (approx.)
- **Completed:** 2026-07-03T01:50:29Z
- **Tasks:** 3
- **Files modified:** 5 (src/app/co-pilot.tsx, src/app/history.tsx, src/app/__tests__/screens.test.tsx, i18n/locales/en.json, i18n/locales/pl.json)

## Accomplishments
- `coPilot.ending.*` (acknowledgment + moodCheck.{heading,good,okay,tough,skip}) and `history.duration_{one,few,many,other}`/`durationLessThanMinute` keys added to both EN and PL; `history.sessionFallbackLabel` changed to the gender-neutral "Just worked"/"Po prostu praca" (UI-SPEC Flag 6 — Polish deliberately avoids a gendered past-tense verb)
- `co-pilot.tsx`'s End button now transitions `flowPhase` to `'ending'` (same dark canvas, no route change) instead of navigating home directly: `<Mascot state="acknowledge" onStateAnimationComplete={...} />` plays once, the acknowledgment line ("You're here. That's what matters." / "Jesteś tutaj. To się liczy.") renders immediately and is byte-identical regardless of session duration or how it ended (D-14 — no numbers anywhere in the moment), and three equal-weight mood buttons (🙂 Good / 😐 Okay / 😣 Tough) sit above a neutral Skip text link
- Mood is never persisted from a raw value: `clampMood` mirrors `Mascot.tsx`'s own `clampState` precedent, checking against an explicit `[1, 2, 3]` allowlist before any `sessionsRepo.update` call (T-03-04)
- A single `isFinishingRef` guard shared by all three mood buttons, Skip, and the acknowledge animation's own `onStateAnimationComplete` conclusion ensures exactly one navigation and at most one mood write occurs no matter which exit fires first (T-03-05) — the animation concluding with nothing tapped is itself a valid implicit skip (Pattern 3), storing no mood
- Every exit path calls `router.replace('/')`, never `.push` — confirmed by grep gate that no `router.push('/')` exists in the file, so back-navigation from Home can never return to an ended session screen
- `history.tsx`'s `SessionRow` now shows a per-session duration (`Math.floor((endedAt - startedAt) / 60000)` minutes via the new CLDR-pluralized key, floored to "Under a minute"/"Mniej niż minuta" under 60s so a session never reads as "0 min") and a trailing mood glyph (only rendered when `session.mood` is defined) — zero structural change to the flat, reverse-chronological, header-free list (D-15)
- 4 new integration tests (2 ending-phase, 2 History) plus one existing test's name/assertion updated to match the new End behavior; full suite is 105 tests across 15 suites, `npm run verify` green (eslint + hex gate + mascot-asset-size gate + jest)

## Task Commits

Each task was committed atomically:

1. **Task 1: Ending + history i18n copy (EN + PL) and fallback-label value change** — `f7d1340` (feat)
2. **Task 2: co-pilot.tsx ending phase — acknowledge one-shot + warm line + 3-level mood check** — `143144e` (feat)
3. **Task 3: history.tsx quiet-log rows — duration + mood glyph** — `8d3064a` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `i18n/locales/en.json` / `pl.json` — added `coPilot.ending.*` and `history.duration_*`/`durationLessThanMinute`; changed `history.sessionFallbackLabel` to a gender-neutral value
- `src/app/co-pilot.tsx` — `endSession` (write + clear + phase transition) added to `CoPilotScreen`; `ActivePhase` now delegates End to an `onEnd` prop instead of navigating itself; new `EndingPhase` component (mascot acknowledge, warm line, 3 mood buttons, Skip, `clampMood`, `isFinishingRef` guard)
- `src/app/history.tsx` — `SessionRow` extended with `durationMs`/`durationMinutes` derivation (via a `useState` lazy `Date.now()` fallback, not a bare render-time call) and a conditional trailing mood glyph
- `src/app/__tests__/screens.test.tsx` — renamed/extended the existing End-press test to assert the ending phase is entered (not immediate Home navigation); added a `describe('Co-pilot ending phase', ...)` block (mood-tap-stores-and-navigates, animation-conclusion-is-implicit-skip) and a `describe('History quiet-log rows', ...)` block (duration + mood glyph render, sub-minute floor)

## Decisions Made
- Mood glyph/value mapping (UI-SPEC Flag 5, Claude's discretion): 🙂=3 / 😐=2 / 😣=1
- `endSession`'s write + `setFlowPhase('ending')` live in the parent `CoPilotScreen` (which already owns `activeSession`/`flowPhase` state), not inside `ActivePhase` — `ActivePhase` keeps only its pre-existing `isEndingSessionRef` double-tap guard and calls the passed `onEnd` callback
- A single `isFinishingRef` ref (rather than a separate `moodAnswered` boolean alongside it, as RESEARCH.md's Pattern 3 sketch shows) is sufficient to guarantee at most one navigation/write across mood-tap, Skip, and animation-conclusion
- Test navigation assertions use `jest.spyOn(router, 'replace')` on the shared `expo-router` imperative-api singleton (confirmed via source that `useRouter()` returns this exact object) rather than `renderRouter`'s/`screen`'s `getPathname()` — that method is attached via `Object.assign` onto the render's Promise wrapper and does not survive `@testing-library/react-native` v14's async-render `await` unwrap (empirically confirmed: both `router.getPathname` and `screen.getPathname` were `undefined`/threw at test time)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `getPathname()` pattern for asserting post-ending navigation doesn't survive v14's async render**
- **Found during:** Task 2 — writing the "stores mood and navigates home" / "animation conclusion navigates home" tests
- **Issue:** `expect((await renderRouter(...)).getPathname()).toBe('/')` and `expect(screen.getPathname()).toBe('/')` both threw `TypeError: ... .getPathname is not a function`. `renderRouter`'s implementation calls `Object.assign(result, { getPathname() {...}, ... })` on whatever `rnTestingLibrary.render(...)` returns, but v14's `render()` is itself async — the value `await`-ed out of `renderRouter(...)` is the *resolved* inner `RenderResult`, not the same object identity the extra methods were attached to; and RNTL's own `screen` singleton is separately reassigned in `screen.js` to that same resolved value, so it doesn't carry the attached methods either
- **Fix:** Imported `{ router }` from `expo-router` (confirmed via source that `useRouter()` returns this exact shared object when not in preview mode) and used `jest.spyOn(router, 'replace')` to assert the exact call, restoring the spy in a `finally` block
- **Files modified:** `src/app/__tests__/screens.test.tsx`
- **Verification:** Both ending-phase tests pass, confirming `router.replace('/')` fires exactly once per test
- **Committed in:** `143144e` (Task 2 commit)

**2. [Rule 1 - Bug] Stale test name/coverage for the pre-existing End-press test**
- **Found during:** Task 2 — the existing test `'clears the active-session pointer and returns Home when End is pressed'` no longer accurately described behavior once End transitions into the ending phase instead of navigating home immediately (only `activeSessionRepo.clear()` still fires synchronously on End)
- **Issue:** Misleading test name plus missing coverage of the actual new intermediate state
- **Fix:** Renamed to `'clears the active-session pointer and enters the ending phase when End is pressed'` and added an assertion that the acknowledgment line renders
- **Files modified:** `src/app/__tests__/screens.test.tsx`
- **Verification:** Test passes, still proves the pointer is cleared synchronously
- **Committed in:** `143144e` (Task 2 commit)

**3. [Rule 1 - Bug] Two `npm run lint` failures surfaced only by the final plan-level `npm run verify`**
- **Found during:** Plan-level final verification — each task's own automated verify command ran `npm test`/`lint:hex`/`tsc --noEmit` but not the full `expo lint`, so these surfaced only when running the complete `npm run verify` bundle at the end
- **Issue:** (a) `co-pilot.tsx`'s `MOOD_OPTIONS` used `ReadonlyArray<T>`, forbidden by this project's `@typescript-eslint/array-type` rule; (b) `history.tsx` computed `session.endedAt ?? Date.now()` directly in `SessionRow`'s render body, flagged by `react-hooks/purity` ("Cannot call impure function during render")
- **Fix:** (a) changed the annotation to `readonly { ... }[]`; (b) moved the `Date.now()` fallback into a `useState(() => Date.now())` lazy initializer, mirroring `useElapsedSession.ts`'s already-verified-clean precedent for exactly this situation
- **Files modified:** `src/app/co-pilot.tsx`, `src/app/history.tsx`
- **Verification:** `npm run verify` green (eslint + lint:hex + lint:mascot-assets + jest — 15 suites, 105 tests)
- **Committed in:** `8d3064a` (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (3x Rule 1 — one test-infrastructure finding about the testing library's async-render behavior, one stale-test-coverage fix, one lint-only fix bundle). None altered the shipped behavior described in `must_haves`; the `getPathname()` finding is a reusable pattern note for any future plan asserting `router.replace`/`.push` navigation under `renderRouter`.
**Impact on plan:** Zero scope creep or architectural change.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required
None — no external service configuration required. No native dependency was added or changed this plan (zero `npm install`/`expo install` commands ran), so no `npx expo prebuild --clean` is needed after pulling this plan's changes.

## Next Phase Readiness
- Confirmed the ending moment carries no numbers/duration content anywhere (D-14): `EndingPhase`'s render references only `coPilot.ending.*` copy keys, `MOOD_OPTIONS`, and the mascot — no `formatDuration`/`elapsedMs`/minute text of any kind, verified both by the grep gate and by reading the rendered function directly
- `history.tsx`'s duration/mood-glyph logic is already forward-compatible with Plan 03-04's stale-reconciliation requirement ("a stale-reconciled session appears in History as an ordinary completed row, with zero interruption language"): a session ended via `sessionsRepo.update(id, { endedAt: lastAliveAt })` with no `mood` set will render a normal duration and simply omit the glyph — no code path in `SessionRow` treats a mood-less row as special or flags it as interrupted
- `sessionsRepo.update`'s existing shallow-merge semantics (confirmed by reading `data/repositories/sessions.ts`) mean Plan 03-04's reconciliation sweep can call `sessionsRepo.update(id, { endedAt })` independently of this plan's `{ mood }` write with no risk of clobbering fields — both plans only ever patch, never replace, a session record
- `co-pilot.tsx`'s `EndingPhase` and `ActivePhase` are unaffected by Plan 03-04's scope (root layout reconciliation hook, Home resume card) — no further changes anticipated to this plan's files before Plan 03-04 begins

---
*Phase: 03-co-pilot-end-to-end*
*Completed: 2026-07-03*

## Self-Check: PASSED

All 5 claimed modified files verified present on disk (`src/app/co-pilot.tsx`, `src/app/history.tsx`, `src/app/__tests__/screens.test.tsx`, `i18n/locales/en.json`, `i18n/locales/pl.json`); all 3 task commit hashes (`f7d1340`, `143144e`, `8d3064a`) verified present in git history.
