# Building for your iPhone (EAS, no Mac needed)

You develop on Windows; EAS Build compiles iOS in Expo's cloud and hands you
an installable link. This doc is the full path from zero to the app (with
widgets + Live Activity) running on your physical iPhone — plus exactly how
the env variables flow, so nothing silently falls back to reference mode.

## One-time prerequisites

1. **Apple Developer Program** (developer.apple.com, $99/yr). Required for
   installing dev builds on a device via EAS, and for the App Group +
   widget-extension signing our config needs. Enrollment verification can
   take a day or two — start it first.
2. **EAS CLI + login**: `npm i -g eas-cli`, then `eas login` (Expo account).
3. **Register the iPhone**: `eas device:create` — it gives you a link/QR to
   open ON the iPhone, which installs a profile that registers the device
   UDID for ad-hoc installs. Do this before the first build.

## First build

```sh
eas build --platform ios --profile development
```

- First run asks for your **Apple account login** — EAS then generates and
  manages all certificates and provisioning profiles itself, INCLUDING the
  widget extension target and the `group.com.trinket.app` App Group that
  expo-widgets configured. Say yes to everything it offers to create.
- Build takes ~15–25 min in the queue. The build page gives a QR/link —
  open on the iPhone, install.
- First launch: Settings → General → VPN & Device Management → trust the
  developer certificate.

## Daily development loop

The development build is a **dev client**: the native shell is in the
binary, but the JS comes from Metro on your PC at runtime.

```sh
npx expo start --tunnel   # tunnel = works even off shared wifi
```

Open the Trinket dev client on the iPhone → it connects to Metro. JS/screen
changes hot-reload. **You only rebuild on EAS when native inputs change**
(app.json/plugins, native module added/upgraded, SDK bump) — same CNG rule
as Android.

### Testing the new surfaces

- **Widget**: long-press home screen → Edit → Add Widget → Trinket.
- **Live Activity**: start a Co-pilot session, lock the phone — companion +
  ticking elapsed on the Lock Screen (Dynamic Island on Pro models). End
  the session → it disappears. Force-quit mid-session, relaunch → orphan
  sweep clears it.
- One known API-shape guess to validate: the Live Activity's registration
  as a `widgets[]` entry with empty `supportedFamilies` (expo-widgets docs
  are thin there). If activities don't start, that config entry is the
  first place to look.

## ENV variables — the part that silently bites

There are TWO different env paths, and which one applies depends on the
build profile:

### Development builds (what you're doing now)

JS is served by **Metro on your PC**, so `EXPO_PUBLIC_*` values come from
**your local `.env.local`** at `npx expo start` time — exactly like Android
today. Your existing `.env.local` keeps working; nothing to migrate.
Remember the standing rule: after editing `.env.local`, restart Metro with
`npx expo start -c`.

> Consequence: for the dev build, EAS env variables are NOT what feeds the
> JS. If RevenueCat shows reference pricing on the iPhone, check the PC's
> `.env.local` and Metro restart — not the EAS dashboard.

### Preview/production builds (later — TestFlight, App Store)

JS is **bundled into the binary at build time on EAS servers**, where your
`.env.local` does not exist (it's gitignored and never uploaded). The values
MUST live in EAS environment variables. `eas.json` now pins each profile to
its environment (`development`/`preview`/`production`), so set them per
environment:

```sh
eas env:create --environment production --name EXPO_PUBLIC_REVENUECAT_KEY --value appl_XXXX
eas env:create --environment production --name EXPO_PUBLIC_REVENUECAT_ENTITLEMENT --value "Trinket Pro"
eas env:create --environment production --name EXPO_PUBLIC_POSTHOG_API_KEY --value phc_XXXX
# repeat for --environment preview with the keys you want preview builds to use
eas env:list --environment production   # verify before every store build
```

### Which RevenueCat key on iOS?

| Situation | Key |
|---|---|
| Dev testing now (simulated purchases) | the `test_…` Test Store key — works cross-platform, fine in `.env.local` |
| Real StoreKit sandbox / TestFlight / App Store | the **`appl_…`** key from the App Store app in RevenueCat (create it alongside the Play app; also needs App Store Connect subscription products attached to `Trinket Pro`) |
| NEVER in a store build | `test_…` (auto-rejection + SDK crash — see docs/release-env.md) |

## Surface containment (troubleshooting insurance)

The iOS surfaces are deliberately containerized so a broken first build
loses the surface, never the app:

- Widgets and Live Activities run **out of process** on iOS — a broken
  widget can only ever render a placeholder on the home screen.
- The one in-process risk (expo-widgets' import-time native-module lookup)
  is behind a lazy, guarded, memoized loader
  (`src/features/surfaces/widgetsRuntime.ts`). If the module fails to load,
  Metro logs ONE line — look for **"surfaces: expo-widgets runtime failed
  to load"** — and the app runs normally with Live Activities off.
- **Kill switch:** add `EXPO_PUBLIC_DISABLE_SURFACES=1` to `.env.local` and
  restart Metro (`npx expo start -c`) to turn off all surface behavior in
  the app without rebuilding — the first lever to pull when separating "the
  app is broken" from "the surface is broken".

## Troubleshooting quick hits

- Build fails on signing/entitlements → `eas credentials -p ios` and let it
  regenerate; confirm the App Group exists on the Apple Developer portal
  (EAS creates it, but a stale manual profile can shadow it).
- Dev client can't reach Metro → use `--tunnel`, check PC firewall.
- Widget shows but tap does nothing → the `trinket://` scheme only routes
  once the dev client has loaded JS at least once; open the app first.
