---
gsd_artifact: summary
quick_id: 260706-0lc
slug: native-surfaces-scoped-sdk-57-expo-widg
status: complete
completed: 2026-07-06
requirements: [SURF-01, SURF-02]
verify: "38 suites / 300 tests green; all gates clean"
---

# Summary: Native surfaces (founder-scoped: widgets + Live Activities)

## Step 0 — Expo SDK 56 → 57 (separate commit)

The CLAUDE.md-scheduled re-evaluation, forced by expo-widgets' SDK 57
requirement: RN 0.86 + jest-expo 57, lockfile regenerated (stale 0.85 tree
blocked peer resolution). 294 tests green on FIRST run — the "no breaking
changes" framing held exactly.

## Surfaces

- **Deep-link contract** (`src/lib/deepLinks.ts`): every surface routes
  through `trinket:///co-pilot?entry=<surface>` / brain-dump equivalent;
  resume correctness is free via the existing D-11/D-16 reconciliation.
  §9 attribution: `surface_entry {surface: widget|liveActivity}` event fired
  by `useSurfaceEntry()` (co-pilot + brain-dump); garbage params are silent.
- **iOS widget** (`widgets/TrinketWidget.tsx`, expo-widgets): resting
  presence — pawprint glyph in mascot-glow amber + brand name on espresso;
  whole-widget `widgetURL` → session start. §2 held by construction: no
  state exists that could reference counts/absence. Companion-agnostic (§0).
- **iOS session Live Activity** (`widgets/TrinketSessionActivity.tsx`):
  Lock Screen + Dynamic Island presence with the user's own task label and
  a SwiftUI `dateStyle="timer"` elapsed — ticks with ZERO activity updates,
  presence not countdown, no idle-shaming state exists.
- **Lifecycle seam** (`src/features/surfaces/sessionActivity.ts`,
  purchases.ts-style discipline): start at beginSession (replace-don't-
  orphan), end('immediate') at endSession (the warm ending is in-app),
  cold-launch orphan sweep in _layout when reconciliation says nothing is
  live — 'keep-live' leaves the mirror alone. Everything platform-guarded +
  failure-swallowed: the surface mirrors the session, never owns it.
- **Android widget** (`widgets/TrinketAndroidWidget.tsx` + headless task +
  `index.js` entry, react-native-android-widget): same resting presence via
  RemoteViews primitives, OPEN_URI click → the shared deep link; preview
  PNG generated from the raccoon idle frame (assets/widget-preview/).
- app.json: both config plugins fully configured (widget entries, app
  group `group.com.trinket.app`, push disabled); `main` → index.js.
- Mocks: expo-widgets (records Live Activity instances), rn-android-widget,
  @expo/ui stubs. 6 new tests: activity start/end/orphan-sweep/keep-live +
  attribution + garbage-param no-op.

## Device-side validation still open (no Mac/device in-container)

- `npx expo prebuild --clean` + dev-client REBUILD required (SDK 57, two
  new native modules, new plugins, new entry).
- iOS widget/Live Activity build needs the EAS/Xcode pipeline — first iOS
  build remains the long-standing gate. The Live Activity's registration as
  a `widgets[]` config entry with empty supportedFamilies is the one
  API-shape guess to validate on the first iOS build.
- Android widget: add to home screen, tap-through, preview image polish.
