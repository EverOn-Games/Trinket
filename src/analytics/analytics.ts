/**
 * track() — the app's single analytics entry point (ANLY-01/ANLY-02).
 *
 * Disabled by default: with no transport wired, every call is a silent no-op
 * (no queueing, no disk, no console). The PostHog EU transport is attached in
 * app startup ONLY when a project key exists — see the drop-in note at the
 * bottom of this file. Autocapture and session replay are never enabled;
 * every event is a manual, allowlisted call.
 *
 * Defense-in-depth beneath the type layer (events.ts): unknown event names
 * are dropped, and any string property value outside SAFE_STRING_TOKENS is
 * dropped property-by-property — user content can never leave the device
 * even if a future call site casts its way past the types.
 */
import {
  ALLOWED_EVENT_NAMES,
  SAFE_STRING_TOKENS,
  type AnalyticsEventName,
  type AnalyticsEvents,
} from './events';

export type AnalyticsTransport = (
  event: string,
  properties: Record<string, number | boolean | string>
) => void;

let transport: AnalyticsTransport | null = null;

/** Wire a transport (PostHog EU) at startup. No key → never called → no-op. */
export function setAnalyticsTransport(next: AnalyticsTransport | null): void {
  transport = next;
}

export function track<E extends AnalyticsEventName>(event: E, props: AnalyticsEvents[E]): void {
  if (transport === null) return;
  if (!(ALLOWED_EVENT_NAMES as readonly string[]).includes(event)) return;

  const safeProps: Record<string, number | boolean | string> = {};
  for (const [key, value] of Object.entries(props as Record<string, unknown>)) {
    if (typeof value === 'number' || typeof value === 'boolean') {
      safeProps[key] = value;
    } else if (typeof value === 'string' && SAFE_STRING_TOKENS.has(value)) {
      safeProps[key] = value;
    }
    // Anything else — free-form strings, objects, arrays — is silently
    // dropped: structurally impossible to ship content.
  }

  transport(event, safeProps);
}

/*
 * PostHog EU drop-in (when EXPO_PUBLIC_POSTHOG_API_KEY exists):
 *
 *   npx expo install posthog-react-native expo-file-system expo-application expo-device
 *
 *   import PostHog from 'posthog-react-native';
 *   const posthog = new PostHog(process.env.EXPO_PUBLIC_POSTHOG_API_KEY!, {
 *     host: 'https://eu.i.posthog.com',   // EU residency — cannot change later
 *     captureAppLifecycleEvents: false,   // no autocapture (ANLY-01, hard)
 *     // Never enable session replay — it records screen content.
 *   });
 *   setAnalyticsTransport((event, properties) => posthog.capture(event, properties));
 *
 * Wire it in src/app/_layout.tsx behind the env check, nowhere else.
 */
