---
gsd_artifact: plan
quick_id: 260706-ljv
slug: surface-containment-lazy-guarded-widget
created: 2026-07-06
mode: quick
requirements: [SURF-01, SURF-02]
---
# Quick Task: Surface containment + medium-widget dual target
Founder ask: containerize the iOS surface work so a broken first build
can't break the app and troubleshooting has levers. Investigation findings:
expo-widgets ships an Android no-op stub (safe) BUT calls
requireNativeModule at module scope on iOS — a broken widgets module would
have crashed the whole app through the static import chain. Deliverables:
lazy/guarded/memoized widgetsRuntime boundary + EXPO_PUBLIC_DISABLE_SURFACES
kill switch + fail-loud dev log; seam rerouted through it; medium widget's
§6a dual target built declaratively with SwiftUI Links (out-of-process,
inherently contained); containment tests incl. genuinely-throwing module.
