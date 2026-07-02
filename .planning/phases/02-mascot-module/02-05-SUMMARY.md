---
phase: 02-mascot-module
plan: 05
subsystem: ui
tags: [lottie-react-native, react-native, i18next, expo, mascot, accessibility]

# Dependency graph
requires:
  - phase: 02-mascot-module (02-02, 02-03, 02-04)
    provides: 5 placeholder Lottie assets + 300KB size gate, idle scheduler/marker resolution/reduced-stimulus logic, and the <Mascot /> component (single persistent LottieView, fade, prominence, safe degradation)
provides:
  - Real <Mascot /> mounted on the Home hub, replacing the Phase 1 MascotSlot placeholder
  - Greeting-once-per-cold-launch cadence via an in-memory session flag (D-07), never persisted
  - mascot.accessibility.* i18n copy (greeting/idle/presence/dozing/acknowledge) in en + pl
  - Device-verified animation smoothness on real low/mid-tier Android hardware (MASC-04)
  - Fixed placeholder Lottie assets (seek-jump-proof marker boundaries, opacity-only blink, distinct greeting bloom, visible amber glow halos)
affects: [phase-3-copilot, phase-6-onboarding, phase-9-beta-hardening]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Greeting cadence via module-level in-memory flag (not settingsRepo/useSettingsStore) — keeps schema denylist intent (D-07) for any host that mounts a state machine driven by 'has this happened yet this session'"
    - "Lottie marker authoring rule: every marker start/end frame boundary must share the SAME scale value as the ambient/rest curve at that frame, because lottieRef.play(start,end) seeks the whole composition instantly with zero interpolation — any boundary scale mismatch reads as a jolt, not a gentle transition"

key-files:
  created: []
  modified:
    - i18n/locales/en.json
    - i18n/locales/pl.json
    - src/app/index.tsx
    - src/app/__tests__/screens.test.tsx
    - assets/mascot/mascot_idle.json
    - assets/mascot/mascot_greeting.json
    - assets/mascot/mascot_presence.json
    - assets/mascot/mascot_dozing.json
    - assets/mascot/mascot_acknowledge.json
    - src/components/Mascot/__tests__/Mascot.test.tsx

key-decisions:
  - "Greeting cadence uses a module-level `let hasGreetedThisSession` in-memory flag only, never a persisted lastGreetedAt/timestamp field (D-07) — reconfirmed against the schema denylist intent"
  - "Home reads mascotProminence from settingsRepo and passes it down; the Mascot module itself stays feature-agnostic and never reads settings directly"
  - "Root-caused and fixed the checkpoint-reported blink jolt: lottieRef.play(startFrame,endFrame) seeks the whole composition instantly with no interpolation, so any scale discontinuity at a marker's start-frame boundary reads as an instant jolt regardless of how gentle the in-segment motion is authored; fix anchors scale to the same value at every marker boundary and moves blink to opacity-only"
  - "Added two extra concentric glow halo layers (glowMid/glowOuter) to all 5 placeholder assets to make the amber mascotGlow tone clearly visible, keeping them non-animated (constant) on idle specifically so they can never themselves introduce seek-jump risk"
  - "Redesigned the one-shot greeting animation as a 2.4s rise-and-bloom (was a 2.0s motion largely indistinguishable from idle breathing) — stays within the plan's 1.5-2.5s contract while now being visibly distinct from idle at hand-off"

patterns-established:
  - "Lottie placeholder asset changes must re-verify: (1) check-mascot-asset-size.mjs stays under 300KB per asset, (2) every marker window's boundary scale matches the ambient curve at that exact frame (seek-jump-proof), (3) no h:1 hold keyframes, since holds can also produce apparent snaps on seek"

requirements-completed: [MASC-01, MASC-04]

# Metrics
duration: 33min
completed: 2026-07-02
---

# Phase 2 Plan 05: Host Wiring + Android Device Smoothness Checkpoint Summary

**Home hub now mounts the real breathing-orb `<Mascot />` (greeting-once-per-launch, in-memory only) with bilingual per-state accessibility copy, and the placeholder Lottie assets were fixed mid-plan after a real-device checkpoint caught a seek-jump-induced "jolt" on blink — now approved smooth on real Android hardware.**

## Performance

- **Duration:** 33 min (17:05:52 -> 17:38:49 UTC across the plan's task commits)
- **Started:** 2026-07-02T17:05:52Z
- **Completed:** 2026-07-02T17:38:49Z
- **Tasks:** 3 (2 auto + 1 human checkpoint, resolved across 2 verification rounds)
- **Files modified:** 10 (2 i18n locale files, 2 Home/test files, 5 Lottie assets, 1 component test fixture)

## Accomplishments

- Home hub swapped from the Phase 1 `MascotSlot` placeholder to the real `<Mascot />`, greeting once per cold launch then resting in idle, with prominence sourced from settings and a state-matched accessibility label (MASC-01)
- Per-state accessibility copy (`mascot.accessibility.{greeting,idle,presence,dozing,acknowledge}`) added in both en and pl, warm/non-directive, reusing the established "towarzysz"/"companion" vocabulary
- Android on-device smoothness (MASC-04) verified and approved by the user on real low/mid-tier hardware after a feedback-driven asset fix round — this closes the last MVP requirement in the Mascot Module (all 4 MASC-* requirements now complete)
- Root-caused and fixed a real animation defect (seek-jump scale discontinuity at Lottie marker boundaries) discovered only through the human device checkpoint — not reproducible via Jest, confirming the plan's manual-only verification call was correct

## Task Commits

Each task was committed atomically:

1. **Task 1: Add mascot.accessibility.* copy (en + pl)** - `aca7758` (feat)
2. **Task 2: Swap MascotSlot -> Mascot on Home with greeting-once-per-launch (D-07)** - `f9f9442` (feat)
3. **Task 3: Android device smoothness checkpoint (MASC-04, D-03/D-04)** - human-verify checkpoint; round 1 feedback fixed in `eb18755` (fix), round 2 approved

**Plan metadata:** (this commit, plus tracking-file commit)

## Files Created/Modified

- `i18n/locales/en.json` - Added top-level `mascot.accessibility.*` namespace (5 per-state labels)
- `i18n/locales/pl.json` - Same namespace, warm/plain/gender-neutral Polish reusing "towarzysz"
- `src/app/index.tsx` - Replaced `<MascotSlot />` with `<Mascot />`; in-memory greeting-once flag; prominence from `settingsRepo.get().mascotProminence`; state-matched `accessibilityLabel`
- `src/app/__tests__/screens.test.tsx` - Asserts the mascot (lottie-view-mock) mounts on Home, replacing the old MascotSlot testID assertion
- `assets/mascot/mascot_idle.json` - Marker boundary scales anchored to 100 everywhere (seek-jump-proof); blink now opacity-only (100->76->100); glance now a small eased scale (100->97->100); postureShift now a ~3.5px position drift instead of scale; ambient breathing (100-105) confined to gaps between marker windows; added glowMid/glowOuter halo layers, non-animated
- `assets/mascot/mascot_greeting.json` - Redesigned as a 2.4s one-shot rise-and-bloom (opacity fade-in, ~14px drift with overshoot settle, scale bloom 62->120->96->100, glow brightening to idle's resting level) — now clearly distinct from idle
- `assets/mascot/mascot_presence.json`, `assets/mascot/mascot_dozing.json` - Added glowMid/glowOuter halo layers for visible amber presence
- `assets/mascot/mascot_acknowledge.json` - Softened peak scale overshoot (116->112), added eased tangents and a brief glow brighten during the nod; unaffected by the jolt defect (one-shot, never seeked)
- `src/components/Mascot/__tests__/Mascot.test.tsx` - Updated hardcoded fixture literals (greeting duration 2000ms->2400ms; idle marker frame ranges) to match the revised placeholder asset content; no component behavior changed

## Decisions Made

See `key-decisions` in frontmatter. Summary: greeting cadence stays strictly in-memory (D-07); Home reads settings and passes them down so the module stays feature-agnostic; the device-checkpoint jolt was root-caused to Lottie's instant, non-interpolated seek behavior on `play(start,end)` rather than to any React/Reanimated logic, and fixed entirely at the asset-authoring level (scale-boundary anchoring + opacity-only blink) without touching component code.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed blink "jolt" caused by Lottie seek-jump at marker boundaries**
- **Found during:** Task 3 (Android device checkpoint, round 1)
- **Issue:** `mascot_idle.json` drove blink/glance/postureShift as segments of one continuous breathing-scale keyframe curve spanning the full 300-frame loop (90-105% amplitude). Because `lottieRef.play(startFrame, endFrame)` seeks the whole composition instantly to `startFrame` with zero interpolation, triggering a marker mid-loop could snap the visible scale by up to ~15% in a single frame — this read as a jarring size jolt on real hardware regardless of how gentle the in-segment motion was authored. Not reproducible in Jest (perceptual/frame-timing defect).
- **Fix:** Anchored orb scale to the identical value (100) at every marker boundary and at loop start/end so no seek can produce a scale discontinuity; moved blink to opacity-only motion (100->76->100); confined glance to a small fully-eased scale ease; moved postureShift to a position drift instead of scale.
- **Files modified:** `assets/mascot/mascot_idle.json`, `src/components/Mascot/__tests__/Mascot.test.tsx` (fixture literals updated to match)
- **Verification:** `check-mascot-asset-size.mjs` exits 0 (largest asset 4.5KB); all 5 assets parse with valid v/fr/ip/op/w/h/layers; idle markers preserved with valid non-overlapping frame ranges; no h:1 hold keyframes in any asset; every idle marker window's boundary scale is identical (no seek-jump possible); `npm run verify` 78/78 green; user approved smoothness on real Android hardware in round 2.
- **Committed in:** `eb18755`

**2. [Rule 2 - Missing Critical] Made the mascot's amber glow and greeting distinctness actually visible/perceivable, per round-1 feedback**
- **Found during:** Task 3 (Android device checkpoint, round 1)
- **Issue:** The glow was authored but barely visible against the background at real device brightness/size, and the greeting animation was similar enough to idle's ambient breathing that users couldn't tell the greeting had played — both undermine the module's core purpose (a perceivable, calm companion presence, MASC-01/MASC-04's smoothness intent) even though nothing was functionally "broken."
- **Fix:** Added two additional concentric glow halo layers (glowMid/glowOuter, same mascotGlow amber token) to all 5 placeholder assets, raising visible glow opacity (idle ~26%/15%, presence ~30%/18%, dozing ~16%/9%) while keeping them non-animated on idle so they carry zero seek-jump risk; redesigned the greeting as a distinct 2.4s rise-and-bloom (still within the plan's 1.5-2.5s contract).
- **Files modified:** `assets/mascot/mascot_idle.json`, `assets/mascot/mascot_greeting.json`, `assets/mascot/mascot_presence.json`, `assets/mascot/mascot_dozing.json`, `assets/mascot/mascot_acknowledge.json`
- **Verification:** `npm run verify` 78/78 green; user approved on real Android hardware in round 2.
- **Committed in:** `eb18755`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing-critical/perceivability), both discovered exclusively through the human device checkpoint and both fixed at the placeholder-asset-authoring level with zero component-code changes.
**Impact on plan:** Both fixes were necessary to actually satisfy MASC-04's smoothness intent and MASC-01's "calm companion presence" intent on real hardware — this is exactly the class of defect the plan flagged as impossible to catch via Jest and requiring the manual device checkpoint. No scope creep: no new features, no architecture changes, no new native dependencies.

## Issues Encountered

The device checkpoint required two verification rounds. Round 1 (initial build on real Android hardware) surfaced no stutter/frame-drop (the plan's literal MASC-04 perf criterion passed on the first attempt) but did surface three UX-quality issues (blink jolt, faint glow, indistinct greeting) that were not part of the plan's explicit pass/fail criteria but were addressed under Rule 1/Rule 2 because they undermine the module's actual purpose. Round 2 (same hardware, rebuilt dev client after the asset fix) was approved without further feedback ("Ok, approved").

## User Setup Required

**Native inputs changed this phase.** `lottie-react-native` was added as a net-new native dependency in Plan 02-02, and this plan (02-05) further modified the Lottie placeholder asset JSON files. Per CLAUDE.md's Conventions section:

**Run `npx expo prebuild --clean` (or `npm run android:fresh` / `npm run ios:fresh`) after pulling this branch, before running the app on any device or simulator.** The Lottie asset content changes alone don't require a native rebuild (they're bundled JS-side assets), but the underlying `lottie-react-native` native module addition from 02-02 does — if a prebuild hasn't been run since that plan landed on your machine, run it now.

No environment variables or dashboard configuration required.

## Next Phase Readiness

- Phase 2 (Mascot Module) is fully complete: all 4 MASC-* requirements (MASC-01 through MASC-04) are now satisfied and verified, including the on-device smoothness gate that could only be confirmed via human checkpoint.
- The `<Mascot />` component is proven mountable in a real host screen (Home) with the greeting-once-per-launch pattern and in-memory-only session-state pattern (D-07) — this is the exact pattern Phase 3 (Co-pilot) and Phase 6 (Onboarding) will need when they mount the mascot in `presence`/`dozing` states during a session and in a `greeting` state during first-run.
- **Carried blocker (unchanged, not closed by this plan):** iOS physical-device verification remains deferred (D-03) — Android-only verification was the explicit scope for the Lottie work this phase. This stays a hard gate before Phase 9 (Beta Hardening) can close, per STATE.md's existing Blockers/Concerns entry.
- No new blockers introduced.

---
*Phase: 02-mascot-module*
*Completed: 2026-07-02*
