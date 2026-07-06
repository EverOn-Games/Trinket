---
gsd_artifact: summary
quick_id: 260706-0yf
slug: ios-device-build-guide-eas-env-wiring
status: complete
completed: 2026-07-06
requirements: [FND-01]
verify: "38 suites / 300 tests green (config-only changes)"
---
# Summary: iOS device build guide + EAS env wiring
- docs/ios-device-build.md — the full Windows→EAS→iPhone path incl. widget/
  Live Activity testing steps and the critical env split: dev-client builds
  read EXPO_PUBLIC_* from the PC's .env.local via Metro (EAS env vars are
  NOT in play); preview/production builds bundle JS on EAS servers and MUST
  have eas env variables set. iOS RevenueCat key table (test_ for dev,
  appl_ for store, never test_ in a store build).
- eas.json: each profile now explicitly pinned to its EAS environment.
- app.json: NSSupportsLiveActivities=true (belt-and-suspenders for the
  Live Activity; harmless if the plugin also sets it).
- docs/release-env.md cross-linked to the dev-vs-bundled split.
