---
phase: 02-mascot-module
plan: 02
subsystem: ui
tags: [lottie, lottie-react-native, jest-mock, build-gate, bodymovin, mascot]

# Dependency graph
requires:
  - phase: 02-mascot-module
    provides: "Plan 02-01's Mascot public type contract (src/components/Mascot/types.ts) and mascotProminence settings field"
provides:
  - "lottie-react-native@~7.3.4 installed as a resolvable native dependency"
  - "__mocks__/lottie-react-native.tsx Jest mock (play/pause/resume/reset jest.fn refs) registered in jest.setup.ts"
  - "scripts/check-mascot-asset-size.mjs fail-closed 300KB gate wired into npm run verify"
  - "5 placeholder Lottie assets at assets/mascot/mascot_<state>.json with final-art-compatible slot + marker names"
affects: [02-mascot-module plan 03 (scheduler/markers.ts), 02-mascot-module plan 04 (Mascot.tsx component), 02-mascot-module plan 05 (Android device checkpoint)]

# Tech tracking
tech-stack:
  added: [lottie-react-native@~7.3.4]
  patterns:
    - "Fail-closed build-gate script shape (root via import.meta.url, empty-scan-fails, violation accumulator, process.exit(0|1)) mirrored from scripts/check-hex-literals.mjs"
    - "Native-module Jest mock: forwardRef + useImperativeHandle exposing imperative API as jest.fn()s, View stub with testID, registered via jest.mock() in jest.setup.ts"
    - "Deliberate hex-literal exception: mascotGlow color embedded as 0-1 RGBA inside assets/mascot/*.json, outside check-hex-literals.mjs's scan globs"

key-files:
  created:
    - __mocks__/lottie-react-native.tsx
    - scripts/check-mascot-asset-size.mjs
    - assets/mascot/mascot_greeting.json
    - assets/mascot/mascot_idle.json
    - assets/mascot/mascot_presence.json
    - assets/mascot/mascot_dozing.json
    - assets/mascot/mascot_acknowledge.json
  modified:
    - package.json
    - package-lock.json
    - jest.setup.ts

key-decisions:
  - "Installed lottie-react-native by explicit package name only (never a bare `npx expo install` sweep) — confirmed via package.json diff that reanimated (4.3.1) and worklets (0.8.3) pins are untouched (Pitfall 3)"
  - "Authored placeholder assets as hand-written minimal Bodymovin JSON (Claude's Discretion) rather than After Effects/Bodymovin export — trivially small, trivially controllable marker names, zero design-tool dependency"
  - "All 5 assets use fr=30; idle/presence/dozing are continuous loops (op=300, 10s cycle), greeting is a 60-frame (2s) one-shot bloom, acknowledge is a 45-frame (1.5s) one-shot bounce"

patterns-established:
  - "assets/mascot/*.json is a deliberate, documented exception to the hex-literal gate — the mascotGlow fill color lives inside the JSON asset as 0-1 RGBA, not as a hex string in .tsx code"

requirements-completed: [MASC-01, MASC-02, MASC-04]

# Metrics
duration: 4min
completed: 2026-07-02
---

# Phase 2 Plan 02: Lottie Infra, Asset Size Gate, Placeholder Assets Summary

**Installed lottie-react-native + its Jest mock, wired a fail-closed 300KB asset size gate into `npm run verify`, and authored 5 hand-written Bodymovin JSON "breathing orb" placeholder assets with final-art-compatible slot and marker names.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-02T16:10:32Z (immediately after 02-01 completion commit)
- **Completed:** 2026-07-02T16:14:23Z
- **Tasks:** 3
- **Files modified:** 10 (2 created directly by npm install: package.json, package-lock.json; 1 new mock; 1 modified jest.setup.ts; 1 new gate script; 5 new asset JSON files)

## Accomplishments
- `lottie-react-native@~7.3.4` is now a resolvable project dependency, installed by explicit package name with `react-native-reanimated`/`react-native-worklets` pins verified untouched
- A View-stub Jest mock (`__mocks__/lottie-react-native.tsx`) stands in for `LottieView`'s native render + imperative `play`/`pause`/`resume`/`reset` ref API, registered in `jest.setup.ts`
- A fail-closed 300KB size gate (`scripts/check-mascot-asset-size.mjs`) is wired into `npm run verify` and was proven — not just coded — to exit 1 with a per-file MASC-04 violation line against a synthetic >300KB probe, and exit 0 against a valid probe
- All 5 mascot animation states (`greeting`, `idle`, `presence`, `dozing`, `acknowledge`) exist as plain `.json` Bodymovin assets at the exact final-art-compatible filenames; `mascot_idle.json` carries the 3 required markers (`blink`, `glance`, `postureShift`) with frame ranges matching the UI-SPEC's clip-length contract

## Task Commits

Each task was committed atomically:

1. **Task 1: Install lottie-react-native + Jest mock (D-04)** - `bfb0fc1` (feat)
2. **Task 2: Fail-closed mascot asset size gate (MASC-04)** - `3a4a30c` (feat)
3. **Task 3: Author 5 placeholder Lottie assets (D-01, D-02, MASC-01, MASC-02)** - `24f211f` (feat)

_Note: no TDD tasks in this plan (type="auto" throughout); no refactor commits needed._

## Files Created/Modified
- `package.json` - added `lottie-react-native` dependency, `lint:mascot-assets` script, chained it into `verify`
- `package-lock.json` - lockfile update from the install
- `__mocks__/lottie-react-native.tsx` - forwardRef View stub exposing play/pause/resume/reset as jest.fn(), testID `lottie-view-mock`
- `jest.setup.ts` - added `jest.mock('lottie-react-native')` registration with 2-line doc comment
- `scripts/check-mascot-asset-size.mjs` - fail-closed 300KB gate over `assets/mascot/*.json`, mirrors `check-hex-literals.mjs`'s shape
- `assets/mascot/mascot_greeting.json` - one-shot rise/bloom (60 frames / 2s)
- `assets/mascot/mascot_idle.json` - continuous breathing loop (300 frames / 10s) carrying `blink`/`glance`/`postureShift` markers
- `assets/mascot/mascot_presence.json` - continuous steady warm pulse loop
- `assets/mascot/mascot_dozing.json` - continuous slower/dimmer breathe loop
- `assets/mascot/mascot_acknowledge.json` - one-shot gentle bounce/settle (45 frames / 1.5s)

## Decisions Made
- Installed `lottie-react-native` by explicit package name only, confirming via `git diff package.json` that no unrelated version bumps to `react-native-reanimated`/`react-native-worklets` occurred (Pitfall 3 mitigation, T-02-SC threat)
- Hand-authored all 5 placeholder assets as minimal Bodymovin JSON rather than using an After Effects/Bodymovin export pipeline (Claude's Discretion, per CONTEXT.md) — all files are well under 1KB, nowhere near the 300KB gate, making the size-check script primarily a safeguard for the future final-art swap
- Reused RESEARCH.md Pattern 2's exact idle marker frame ranges (`blink` tm=60/dr=12, `glance` tm=120/dr=30, `postureShift` tm=200/dr=45 at fr=30) since they already match the UI-SPEC's clip-length contract (0.3-0.5s / 0.8-1.2s / 1-2s respectively)
- Each non-idle state got a distinct motion signature per CONTEXT.md's "Specific Ideas": greeting=brief rise/bloom, presence=steady warm pulse, dozing=slower/dimmer breathe, acknowledge=single gentle bounce/settle — so state transitions are visually distinguishable even with abstract geometric art

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The Task 2 verify command's fail-closed proof (valid <300KB probe exits 0, synthetic >300KB probe exits 1 with a violation line naming the probe) succeeded on the first run, emitting `GATE_FAILS_CLOSED` as expected. The Task 3 verify command (gate exits 0 against real assets; idle markers resolve to exactly `['blink','glance','postureShift']`) also succeeded on the first run.

## User Setup Required

**Native input changed this phase — a prebuild is required on the developer's machine before running the app.**

Per CLAUDE.md's Conventions section ("Agent rule: any phase SUMMARY whose changes touch the inputs above MUST include a 'run `npx expo prebuild --clean` after pulling' note") and D-04 (CONTEXT.md): `lottie-react-native` was added as a net-new native dependency. This container cannot run a native build (no `ios/`/`android/` regeneration or Android/iOS toolchain available here), so the following steps are **documentation for the user's machine only** — they were not and could not be executed in this environment:

```bash
git pull
npx expo prebuild --clean
npm run android:fresh   # or: npx expo prebuild --clean --platform android && expo run:android
```

Android is the only device-verification target for Phase 2 (D-03 — iOS physical-device dev-client boot remains a deferred hard gate carried forward to before Phase 9). The actual Android-hardware smoothness verification (MASC-04) is scoped to a later plan's `checkpoint:human-verify` (Plan 02-05 per RESEARCH.md's Open Question 1 resolution), not this plan — this plan only lands the dependency, mock, gate, and placeholder assets.

## Next Phase Readiness

Plan 02-03 (idle scheduler + marker resolution) and Plan 02-04 (`Mascot.tsx` component) can now proceed: `lottie-react-native` resolves as a module, its Jest mock is registered so component/hook tests can render without a native binding, and all 5 real `assets/mascot/*.json` files exist for `require()`-based tests and lazy-loading logic. The 300KB gate is live in `npm run verify` for every subsequent asset change, including the eventual final-art drop-in.

No blockers introduced. The pre-existing STATE.md blocker "iOS physical-device dev-client boot is NOT yet verified" remains open and unaffected by this plan (D-03 scope).

---
*Phase: 02-mascot-module*
*Completed: 2026-07-02*

## Self-Check: PASSED

All created files verified present on disk; all 4 task/metadata commit hashes (`bfb0fc1`, `3a4a30c`, `24f211f`, `b47d96f`) verified present in git log.
