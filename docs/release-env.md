# Release environment variables

Trinket's two paid-service integrations are **env-gated**: with no key
present, RevenueCat runs in reference mode (display pricing, no purchases)
and PostHog analytics is a silent no-op. This is by design for development —
and a **silent failure mode for release builds** if the keys don't reach the
build environment.

`.env.local` is gitignored and dev-machine-only. **It does not travel to EAS
builds.** Every profile that should ship live integrations needs these set as
EAS environment variables.

## The variables

| Variable | Value | Notes |
|---|---|---|
| `EXPO_PUBLIC_REVENUECAT_KEY` | RevenueCat **public app-specific SDK key** | `goog_…` for the Play app build, `appl_…` for the App Store build. **NEVER `test_…`** — a Test Store key in a submitted build is an automatic App Review rejection AND crashes the RevenueCat SDK in production (their own warning). |
| `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT` | `Trinket Pro` | The entitlement **identifier** in the RevenueCat dashboard (not the display name). Code defaults to `plus` if unset — which grants nobody, silently. |
| `EXPO_PUBLIC_POSTHOG_API_KEY` | PostHog EU project API key (`phc_…`) | EU-hosted project; host is pinned to `eu.i.posthog.com` in code. Unset → analytics stays a no-op (acceptable for dev/preview, wrong for beta/production). |

All three are `EXPO_PUBLIC_*` — they are embedded in the JS bundle and are
public-by-design client keys. They still don't belong in git.

## Setting them (EAS)

```sh
# one-time per environment (production shown; repeat for preview if desired)
eas env:create --environment production --name EXPO_PUBLIC_REVENUECAT_KEY --value goog_XXXX
eas env:create --environment production --name EXPO_PUBLIC_REVENUECAT_ENTITLEMENT --value "Trinket Pro"
eas env:create --environment production --name EXPO_PUBLIC_POSTHOG_API_KEY --value phc_XXXX

# inspect what a build will see
eas env:list --environment production
```

`eas build --profile production` picks these up automatically — eas.json now pins each build profile to its EAS environment explicitly. NOTE: for DEVELOPMENT (dev-client) builds the JS comes from Metro on your machine, so `.env.local` is what feeds `EXPO_PUBLIC_*` there — see docs/ios-device-build.md for the full split. iOS note:
when the App Store app exists in RevenueCat, its `appl_…` key differs from
the Android one — platform-specific values can be handled with per-platform
profiles or by switching the value at build time; revisit when the iOS
pipeline starts.

## Pre-submission checklist

- [ ] `eas env:list --environment production` shows all three variables
- [ ] RevenueCat key starts with `goog_` (Android) / `appl_` (iOS) — not `test_`
- [ ] Entitlement identifier matches the RevenueCat dashboard exactly
- [ ] A production-profile build on a device: paywall shows **live store
      pricing** (not the reference `$5.99/9,99 zł` literals) and no
      "purchases aren't switched on" caption
- [ ] PostHog EU dashboard receives events from the release build
