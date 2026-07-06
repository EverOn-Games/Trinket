---
gsd_artifact: summary
quick_id: 260706-ljv
slug: surface-containment-lazy-guarded-widget
status: complete
completed: 2026-07-06
requirements: [SURF-01, SURF-02]
verify: "40 suites / 307 tests green"
---
# Summary: Surface containment + medium-widget dual target

## The real bug the containment ask surfaced

expo-widgets executes `requireNativeModule('ExpoWidgets')` at MODULE SCOPE
in its iOS bundle. The previous static import chain (co-pilot →
sessionActivity → TrinketSessionActivity → expo-widgets) meant a
missing/broken widgets native module in any iOS build would crash the
ENTIRE app at boot — precisely the first-build failure mode we most need to
survive. (Android was already safe: Expo ships a no-op stub there;
react-native-android-widget is platform-guarded at import too.)

## What shipped

- `widgetsRuntime.ts` — the containment boundary: platform gate + kill
  switch (`EXPO_PUBLIC_DISABLE_SURFACES=1`, Metro-restart-only lever) +
  lazy try/catch require, memoized so a broken build warns ONCE
  ("surfaces: expo-widgets runtime failed to load … the app is unaffected")
  and every later call quietly no-ops. sessionActivity.ts reroutes through
  it; no app code statically imports expo-widgets anymore.
- Medium widget dual target (§6a completed): `environment.widgetFamily`
  branches — small stays the single-tap resting pose (widgetURL); medium is
  companion + two declarative SwiftUI `Link`s ("Start a session?" →
  co-pilot, "Brain dump" → brain-dump). Links are per-element deep links —
  no interaction listener, no JS routing to go wrong, and the widget runs
  out of process, so it is contained by construction.
- Containment tests: gate table (platform/kill-switch), genuinely-throwing
  widget module in an isolated registry (caught, logged once, memoized,
  seam no-ops end to end), kill switch short-circuits before any load.
- docs/ios-device-build.md gains the "Surface containment" section: what
  runs out of process, the one Metro log line to look for, and the kill
  switch as the first troubleshooting lever.

40 suites / 307 tests green. JS-only — no prebuild beyond what SDK-57
batch already requires.
