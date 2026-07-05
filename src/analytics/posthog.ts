/**
 * PostHog EU transport wiring (ANLY-02). Env-gated drop-in: constructs the
 * EU-hosted PostHog client and attaches it as the analytics transport ONLY
 * when a project key exists (EXPO_PUBLIC_POSTHOG_API_KEY). With no key this is
 * a no-op, so track() stays the silent no-op it is today — nothing leaves the
 * device until the key lands.
 *
 * Hard privacy posture (ANLY-01), enforced at construction:
 * - host pinned to eu.i.posthog.com (EU residency — cannot change later).
 * - captureAppLifecycleEvents: false — no autocapture.
 * - enableSessionReplay: false — session replay records screen content and is
 *   never enabled.
 * The transport forwards only the already-allowlisted, content-stripped
 * (event, properties) pairs that analytics.ts's track() guard produces.
 *
 * posthog-react-native is a normal static import; nothing constructs a client
 * until a key is present, and under Jest it resolves to
 * __mocks__/posthog-react-native.ts (registered in jest.setup.ts).
 */
import PostHog from 'posthog-react-native';

import { setAnalyticsTransport } from './analytics';

const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '';

/** EU residency — the region cannot be changed after the project connects. */
export const POSTHOG_EU_HOST = 'https://eu.i.posthog.com';

/**
 * Attach the PostHog EU transport at startup. No key → returns without wiring
 * anything (track() stays a no-op). Never throws — analytics init must never
 * break app startup.
 */
export function initPostHogTransport(): void {
  if (!POSTHOG_KEY) return;
  try {
    const client = new PostHog(POSTHOG_KEY, {
      host: POSTHOG_EU_HOST,
      captureAppLifecycleEvents: false, // no autocapture (ANLY-01, hard)
      enableSessionReplay: false, // never record screen content
    });
    setAnalyticsTransport((event, properties) => {
      // A throwing capture() must never propagate through track() into the
      // UI call site — analytics is fire-and-forget by contract (FND-03:
      // core flows work with the network fully off; the client buffers, and
      // even a synchronous client bug can't take a screen down with it).
      try {
        client.capture(event, properties);
      } catch {
        // Drop the event; the app never notices.
      }
    });
  } catch {
    // Stay a no-op; a failed analytics init must never break startup.
  }
}
