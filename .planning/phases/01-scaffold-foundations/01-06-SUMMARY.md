---
phase: 01-scaffold-foundations
plan: 06
subsystem: ui
tags: [expo-router, theme, i18n, mmkv, walking-skeleton, app-shell]

# Dependency graph
requires:
  - phase: 01-scaffold-foundations (01-01 through 01-05)
    provides: Expo SDK 56 scaffold, ESLint/hex-literal gates, theme token module, i18next PL/EN layer, MMKV repositories + settings store
provides:
  - Root layout mounting ThemeProvider + i18n init + locale persistence to settings
  - Home-hub app shell (six themed, localized route shells) per D-03/D-04
  - Walking-skeleton vertical slice: home "Start a session?" offer writes a real session via sessionsRepo; History reads it back
  - MascotSlot seam for Phase 2 mascot module mount point
  - Confirmed app identity (bundle/package com.trinket.app) superseding provisional D-05 value
affects: [phase-02-mascot, phase-03-copilot, phase-04-brain-dump, phase-09-beta-hardening]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Root providers mount order: i18n side-effect import -> ThemeProvider -> Expo Router Stack, with resolved locale persisted to settings store on first mount"
    - "Screen container component (components/Screen.tsx) wraps every route for themed background + safe-area handling"
    - "Explicit named seam components (MascotSlot) mark future-phase integration points instead of inline placeholders"
    - "Offer-grammar UI copy (buttons offer, never instruct) enforced via i18next/no-literal-string lint + translation-key-only screens"

key-files:
  created:
    - src/app/_layout.tsx
    - src/app/index.tsx
    - src/app/co-pilot.tsx
    - src/app/brain-dump.tsx
    - src/app/starter.tsx
    - src/app/history.tsx
    - src/app/settings.tsx
    - src/components/Screen.tsx
    - src/components/MascotSlot.tsx
    - src/app/__tests__/screens.test.tsx
  modified:
    - app.json (bundle/package identifier com.everon.trinket -> com.trinket.app)
    - .planning/phases/01-scaffold-foundations/01-CONTEXT.md (D-05 confirmed)
    - .planning/phases/01-scaffold-foundations/01-01-PLAN.md (D-05 truths line updated to reflect confirmed identifier)

key-decisions:
  - "D-05 confirmed: bundle/package identifier is com.trinket.app (brand-only; app belongs to a separate, not-yet-named business), superseding the provisional com.everon.trinket value. Founder decision made at this plan's device-boot checkpoint."
  - "Android device-boot verified on user hardware (Windows, npx expo run:android, JDK 17 + Android SDK) — success criterion 1 partially signed off."
  - "iOS device-boot verification deferred by user decision to Phase 2-3 (first Lottie work, most platform-divergent module); mandatory hard gate before Phase 9 beta hardening. Not claimed as verified."
  - "android/ and ios/ folders remain gitignored CNG artifacts, not regenerated in this sandbox change — developers must run `npx expo prebuild --clean` after pulling this commit to pick up the new bundle identifier in native project files."

requirements-completed: [FND-01, FND-04, FND-05]

# Metrics
duration: ~113min
completed: 2026-07-02
---

# Phase 1 Plan 6: App Shell Walking Skeleton Summary

**Home-hub app shell (six themed/localized Expo Router screens) with a real MMKV-backed session write/read slice, root ThemeProvider+i18n providers, and confirmed app identity (com.trinket.app) following an Android-only device-boot checkpoint.**

## Performance

- **Duration:** ~113 min (2026-07-02T10:20 - 2026-07-02T12:14 UTC, spanning a human checkpoint pause)
- **Started:** 2026-07-02T10:20:21Z
- **Completed:** 2026-07-02T12:13:51Z
- **Tasks:** 3 (2 auto + 1 checkpoint:human-verify)
- **Files modified:** 41 (28 in Task 1 scaffold replacement, 9 in Task 2 RED, 3 in Task 2 GREEN, 1 in the post-checkpoint identity change)

## Accomplishments
- Root layout (`src/app/_layout.tsx`) mounts the custom `ThemeProvider`, imports the i18n instance for side-effect init, and persists the device-resolved locale into `useSettingsStore` on first mount (D-07)
- Home-hub app shell shipped: six themed, fully-localized route shells (home, co-pilot, brain-dump, starter, history, settings) with zero hardcoded copy and zero hex literals outside `theme/`, replacing the SDK 56 template's default tab-bar scaffold
- Home screen (`src/app/index.tsx`) presents `MascotSlot`, a "Start a session?" offer (offer grammar, not a command), and a direct Brain dump entry reachable in <=2 taps from anywhere (DUMP-05)
- Walking-skeleton vertical slice proven end-to-end at the JS layer: pressing the home offer calls `sessionsRepo.create`, and `src/app/history.tsx` renders the persisted session as a plain chronological log (no stats, no daily boundaries), covered by `src/app/__tests__/screens.test.tsx`
- Device-boot checkpoint resolved: Android verified on real user hardware; iOS explicitly deferred (not silently skipped) with a documented due-by milestone
- App identity finalized: bundle/package identifier changed to `com.trinket.app`, resolving D-05's PENDING flag

## Task Commits

Each task was committed atomically:

1. **Task 1: Mount root providers and build home-hub + five placeholder screens** - `ed9166d` (feat)
2. **Task 2: Walking-skeleton end-to-end slice** - `6160073` (test, RED) then `e710405` (feat, GREEN)
3. **Task 3: Device-boot verification checkpoint** - no commit (human-verify checkpoint; resolved via user response, see Checkpoint Outcome below)
4. **Post-checkpoint: App identity change** - `dae2312` (feat) — bundle/package identifier changed to `com.trinket.app` per founder decision

**Plan metadata:** (this commit) `docs(01-06): complete app shell walking skeleton plan`

_Note: Task 2 is TDD (RED then GREEN commits); Task 3 is a checkpoint with no code commit of its own._

## Checkpoint Outcome (Task 3: Device-boot verification)

- **Android: VERIFIED.** User built locally on Windows (`npx expo run:android`, JDK 17 + Android SDK installed) and confirmed the app booted to the themed home-hub on a real Android device.
- **iOS: DEFERRED by explicit user decision.** No EAS cloud builds spent at this checkpoint. iOS dev-client verification is rescheduled to Phase 2-3 (the first Lottie/mascot work, expected to be the most platform-divergent module) and is a **hard gate before Phase 9 beta hardening** — Phase 9 cannot close with iOS device-boot still unverified. This is recorded as a pending item, not claimed as passed.
- **App identity changed as part of checkpoint resolution:** the user requested the bundle/package identifier change to `com.trinket.app` (brand-only, decoupled from EverOn Games sp. z o.o.), superseding D-05's provisional `com.everon.trinket` value. Display name ("Trinket") and slug (`trinket`) are unchanged.

Success criterion 1 ("App boots on a physical iOS and Android device via EAS dev-client") is therefore **partially satisfied**: Android confirmed, iOS outstanding and tracked as a blocker for later phases (see Blockers below).

## Files Created/Modified
- `src/app/_layout.tsx` - Root providers: ThemeProvider + i18n init + settings-locale persistence
- `src/app/index.tsx` - Home-hub screen: MascotSlot, "Start a session?" offer wired to `sessionsRepo.create`, direct Brain dump entry, navigation to Starter/History/Settings
- `src/app/co-pilot.tsx`, `src/app/brain-dump.tsx`, `src/app/starter.tsx`, `src/app/settings.tsx` - Themed, localized placeholder shells, no feature logic
- `src/app/history.tsx` - Reads `sessionsRepo.list()`, renders a plain chronological session log with localized empty-state copy
- `src/components/Screen.tsx` - Themed screen container (background/padding via `useTheme()`, safe-area handling)
- `src/components/MascotSlot.tsx` - Explicit, named seam reserved for Phase 2's real Lottie mascot module
- `src/app/__tests__/screens.test.tsx` - Render + interaction test proving the write/read skeleton and empty-state copy
- `app.json` - `ios.bundleIdentifier` and `android.package` changed to `com.trinket.app`
- `.planning/phases/01-scaffold-foundations/01-CONTEXT.md` - D-05 marked CONFIRMED with the new identifier and rationale
- `.planning/phases/01-scaffold-foundations/01-01-PLAN.md` - D-05 truths line updated to cite the confirmed identifier

## Decisions Made
- **D-05 confirmed:** `com.trinket.app` replaces the provisional `com.everon.trinket`. Rationale: the app belongs to a separate, not-yet-named business, so a brand-only identifier is correct rather than one derived from EverOn Games sp. z o.o. Caveat carried forward: Play package-name and iOS bundle-ID uniqueness are only definitively proven at first store submission.
- **iOS verification deferral accepted:** rather than spending an EAS cloud build now, iOS device-boot is deferred to Phase 2-3 (aligns with the first native-heavy, platform-divergent work — Lottie) and is a hard gate before Phase 9. This keeps Phase 1 unblocked without silently skipping the criterion.
- **android/ and ios/ folders intentionally not regenerated in this sandbox.** They are gitignored CNG build artifacts (per D-06/`expo prebuild` conventions). The `app.json` identity change is the source of truth; **developers must run `npx expo prebuild --clean` after pulling this commit** to regenerate native projects with the new `com.trinket.app` identifier before their next local or EAS build.

## Deviations from Plan

### Auto-fixed Issues

None during Tasks 1-2 — both executed as previously committed and verified before this continuation began.

**1. [Checkpoint resolution - identity change] Bundle/package identifier changed post-checkpoint**
- **Found during:** Task 3 checkpoint resolution (user response)
- **Issue:** Plan's D-05 value (`com.everon.trinket`) was explicitly PENDING founder confirmation; the founder confirmed a different value at the checkpoint.
- **Fix:** Updated `app.json` (`ios.bundleIdentifier`, `android.package`) to `com.trinket.app`; propagated the confirmed decision into `01-CONTEXT.md` D-05 and `01-01-PLAN.md`'s D-05 truths line.
- **Files modified:** `app.json`, `.planning/phases/01-scaffold-foundations/01-CONTEXT.md`, `.planning/phases/01-scaffold-foundations/01-01-PLAN.md`
- **Verification:** `npx tsc --noEmit` clean, `npx jest --watchAll=false` (36/36 passing), `npx expo config --json | grep -o "com.trinket.app"` resolves the new identifier for both `ios` and `android` keys.
- **Committed in:** `dae2312`

---

**Total deviations:** 1 (post-checkpoint identity confirmation, not a code deviation rule — a planned PENDING decision resolved by the founder as designed)
**Impact on plan:** No scope creep; this was the explicitly anticipated resolution path for D-05's PENDING flag.

## Issues Encountered
None - all automated verification (tsc, jest, eslint, hex-literal gate reported clean in prior task commits) passed without rework in this continuation.

## User Setup Required

**Native project regeneration required before next build.** Because `android/` and `ios/` are gitignored CNG artifacts not present in this sandbox, the bundle/package identifier change in `app.json` has not yet been propagated into generated native project files. Before the next local run or EAS build:
```bash
npx expo prebuild --clean
```
This regenerates `ios/` and `android/` from `app.json`, picking up `com.trinket.app`.

## Next Phase Readiness
- Phase 1 scaffold is functionally complete: theme, i18n, MMKV repositories, and a booting (Android-confirmed) home-hub shell with a proven write/read slice are all in place for Phase 2 (Mascot) to mount into `MascotSlot`.
- **Blocker carried forward:** iOS physical-device boot via dev-client is NOT yet verified. It must be verified during Phase 2-3 work (first Lottie integration) and is a hard gate before Phase 9 beta hardening can close.
- **Blocker carried forward:** `com.trinket.app` uniqueness on the App Store / Play Store is unproven until first submission; if either identifier is taken, a fallback will need to be chosen at that time.
- Anyone continuing native-side work must run `npx expo prebuild --clean` first to regenerate `ios/`/`android/` with the confirmed identifier.

---
*Phase: 01-scaffold-foundations*
*Completed: 2026-07-02*

## Self-Check: PASSED

All created files verified present on disk; all referenced commit hashes (`ed9166d`, `6160073`, `e710405`, `dae2312`, `878cfbe`) verified present in `git log --oneline --all`.
