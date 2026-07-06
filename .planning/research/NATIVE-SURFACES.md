# Native Surfaces Research (v0.2 §6–7): widgets, Live Activities, foreground service, overlay

**Researched:** 2026-07-06 (npm registry + official docs verified live; see Sources)
**Status:** Research + draft plans only — NOT scheduled. This is post-launch
Phase 1 work per v0.2, gated on beta validating the core loop, and it is the
flagged senior-native-hire slice (§7). Everything below is written so that
`/gsd-plan-phase` can consume it when the founder schedules the phase.
**Companion-form caveat (v0.2 §0):** widget art, Live Activity art, and
overlay presence are all sensitive to the open circle-vs-character decision.
Every recommendation below is companion-agnostic; art slots stay swappable.

---

## Headline finding: the ecosystem moved under the spec

v0.2 §7 assumed community config plugins, possible bare-workflow ejection,
and hand-written Swift for all Apple surfaces. **That picture is outdated in
Trinket's favor:**

1. **`expo-widgets` is now an OFFICIAL Expo SDK module (57.0.2 on npm,
   verified live)** covering BOTH iOS home-screen widgets AND Live
   Activities (Dynamic Island + Lock Screen), authored in Expo UI components
   — no Swift for standard surfaces, no separate Xcode target to maintain,
   config-plugin/CNG native generation, dev-client builds required (never
   Expo Go). This collapses §6a-iOS and §6b-iOS into one supported
   dependency.
2. **Requires Expo SDK 57.** Trinket is on 56. CLAUDE.md already records
   Expo's own framing of 56→57 as a "no breaking changes, easiest upgrade
   ever" bump to re-evaluate once the native modules stabilized — they have
   (RevenueCat, PostHog, MMKV, Lottie, STT all proven on 56; all publish
   57-compatible ranges). **The SDK 57 upgrade is therefore Step 0 of this
   phase, not a risk item.**
3. **No bare-workflow ejection needed for ANY surface.** The §10 "dev build
   vs bare" open decision resolves to: stay CNG/managed with config plugins
   throughout. The only surface that may need first-party native code is the
   Android overlay (6c) — and it's the spec's own most-droppable item.

## Per-surface recommendations

### 6a-iOS + 6b-iOS: widgets + Live Activities → `expo-widgets` (official)

- One module for both surfaces; widgets declared in app.json (name, display
  name, sizes), components written with the `'widget'` directive + expo/ui.
- Live Activities: `createLiveActivity` API, Dynamic Island + Lock Screen,
  optional push-token updates (NOT needed — Trinket's session surface
  updates locally; elapsed-time via the OS timer text primitives avoids the
  update-budget problem §6b flags).
- iOS 16.1+ for Live Activities (fine; SDK 57 minimums are higher anyway).
- FALLBACK if expo-widgets proves immature at build time:
  `@bacons/apple-targets` 4.0.7 (verified live, modified 2026-05) — Evan
  Bacon's config plugin generating real Xcode targets with hand-written
  SwiftUI under `targets/`; needs Xcode 16/macOS toolchain and Swift skills
  (the senior-hire scenario). Decision point recorded in Plan W1 below.

### 6a-Android: widgets → `react-native-android-widget` (community, healthy)

- 0.20.3, modified 2026-05 (verified live). Expo config plugin documented;
  widgets defined as JSX rendered to RemoteViews; click → deep link.
- Not Glance (§6a named Glance "preferred", RemoteViews "fallback") — this
  IS the RemoteViews fallback, and it's the pragmatic choice: mature plugin,
  no native code, JSX-defined art (companion-agnostic by construction).
  Revisit Glance only if the senior hire wants to own a Glance codebase.

### 6b-Android: active-session ongoing notification → foreground service

The riskiest REQUIRED piece (it's also the 6c prerequisite). Verified
platform facts:

- Android 14+: `foregroundServiceType` declaration is MANDATORY in the
  manifest AND at `startForeground()`; type-specific runtime permission.
- **Trap:** notifee's default type is `shortService` — hard-capped at 3
  minutes, then ANR. A Co-pilot session surface must NOT use it.
- No FGS type fits a "wellness session timer" cleanly. Candidates:
  - `specialUse` — the honest choice; requires a Play Console declaration
    (plain-language justification at review). Risk: review friction;
    mitigation: the declaration is genuinely simple ("shows the elapsed
    state of a user-started focus session the user is currently in").
  - `mediaPlayback` / `dataSync` — semantically wrong, Android 15 tightened
    dataSync timers; do not use.
- Android 15: stricter background-start rules — irrelevant here (the service
  starts from a foreground user action: starting a session).
- Library: notifee (free, Invertase) for the ongoing-notification +
  foreground-service wiring, WITH explicit `foregroundServiceType:
  specialUse` manifest work via config plugin. Alternative: a ~150-line
  first-party Expo Module (the senior-hire route) if notifee's Expo-plugin
  story is rough at build time.
- Shame-free audit for this surface: ongoing notification shows companion +
  elapsed presence ONLY (no countdown unless user chose one, no "still
  going?" state), dismissed/ended with the session.

### 6c: Android overlay → custom Kotlin, LAST, and pre-agreed as droppable

- No healthy library exists: the react-native-floating-bubble family is
  fragmented/stale (verified: forks with sporadic 2025 releases, no Expo
  config-plugin story). The 2026 guides all hand-roll WindowManager +
  `SYSTEM_ALERT_WINDOW` in Kotlin. Treat 6c as a first-party Expo Module —
  senior-hire work by definition.
- Product gating per spec §10 stands: build only if beta says ambient
  presence reads as company, not surveillance; instrument opt-in/opt-out and
  uninstall-after-permission FIRST (the §9 metrics), then decide.

### Deep-link contract (§7 "shared")

Already 90% exists: `scheme: "trinket"` is configured and expo-router makes
every route a deep link. Contract to standardize (one constant module,
`src/lib/deepLinks.ts`, consumed by every surface):

- `trinket:///co-pilot` — open into session start (widget primary tap)
- `trinket:///co-pilot?resume=1` — return to the live session (Live
  Activity / ongoing notification / overlay tap)
- `trinket:///brain-dump` — medium-widget secondary action
- Cold-start reconciliation already handles "arrived with a live session"
  (D-11/D-12 machinery) — the surfaces get resume-correctness for free.

### App Group / shared state (iOS)

expo-widgets manages the widget↔app data channel itself. If the fallback
(apple-targets) is ever taken, an App Group + a tiny shared JSON snapshot
(current session startedAt + companion state) is the §7 "shared state"
piece; MMKV's app-group support covers it.

## Draft phase plan (for /gsd-plan-phase when scheduled)

**Phase: Native Presence Surfaces** — Requirements: SURF-01 (widgets),
SURF-02 (active-session surface), SURF-03 (overlay, droppable) — all
post-launch, retention-driven (§9 validation targets).

- **Wave 0 — SDK 57 upgrade + deep-link contract** (unblocks everything)
  - `npx expo install expo@^57` + full regression (the "same-day" bump);
    device smoke both platforms; prebuild --clean
  - `src/lib/deepLinks.ts` constants + route-param handling tests
  - EAS env re-verify (keys travel per docs/release-env.md)
- **Wave 1 — iOS widgets + Android widgets** (gentlest surfaces, §8 step 5)
  - expo-widgets small+medium widgets (companion resting art slot + one-tap
    session/brain-dump deep links; NO counts/streaks — §2 rule as tests
    where possible, checklist where not)
  - react-native-android-widget equivalents
  - Decision gate recorded: if expo-widgets blocks, fall back to
    @bacons/apple-targets + senior-hire SwiftUI
  - Instrument: `surface_entry {surface: 'widget'}` (extend allowlist)
- **Wave 2 — Android foreground service + ongoing notification** (§8 step 6)
  - notifee + specialUse FGS type (config plugin manifest work + Play
    Console declaration text drafted for review)
  - Session-scoped: starts with session start, dies with session end/app
    kill; presence + elapsed only
- **Wave 3 — iOS Live Activity** (§8 step 6)
  - expo-widgets createLiveActivity: lock-screen presence + elapsed (OS
    timer primitive, no update-budget churn); ends with session
- **Wave 4 — overlay spike (droppable)** (§8 step 7)
  - Only if §9 beta signals green-light ambient presence. First-party Kotlin
    Expo Module; off by default; session-scoped; one-step dismiss;
    permission onboarding at opt-in moment only. Pre-agreed drop criteria:
    opt-out rate or uninstall-after-permission spike.

**Sequencing note:** Wave 0 can ship any time (it's healthy maintenance);
Waves 1-4 wait for the beta gate per the spec's own logic.

## Cost/risk table

| Surface | Native code owned | Review risk | Battery | Droppable? |
|---|---|---|---|---|
| iOS widgets (expo-widgets) | none | low | nil | no (anchor surface) |
| Android widgets (rn-android-widget) | none | low | nil | no |
| Android FGS notification | manifest-only (or ~150-line module) | **medium (specialUse declaration)** | low | partially (Live Activity parity argues keep) |
| iOS Live Activity | none | low | low | no |
| Android overlay | ~300-line Kotlin module | medium (SYSTEM_ALERT_WINDOW stigma) | medium | **yes — first to cut (spec §10)** |

## Sources

- expo-widgets official docs (fetched 2026-07-06): iOS widgets + Live
  Activities, Expo UI components, dev-build requirement —
  https://docs.expo.dev/versions/latest/sdk/widgets/
- npm registry (verified live 2026-07-06): expo-widgets 57.0.2;
  react-native-android-widget 0.20.3 (modified 2026-05-02);
  @bacons/apple-targets 4.0.7 (modified 2026-05-13)
- EvanBacon/expo-apple-targets README (Xcode 16, SDK 53+, target config) —
  https://github.com/EvanBacon/expo-apple-targets
- react-native-android-widget Expo registration docs —
  https://saleksovski.github.io/react-native-android-widget/
- Android FGS types + Android 15 changes (developer.android.com):
  mandatory foregroundServiceType, shortService 3-min cap, dataSync timers —
  https://developer.android.com/develop/background-work/services/fgs/service-types
- notifee foreground-service docs + issue #958 (Android 13/14 behavior) —
  https://notifee.app/react-native/docs/android/foreground-service/
- Overlay ecosystem scan: react-native-floating-bubble + forks (stale/
  fragmented), 2026 hand-rolled WindowManager guides — custom module is the
  realistic path.
