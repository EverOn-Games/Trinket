/**
 * The typed analytics event allowlist (ANLY-01). This file IS the privacy
 * contract: every event the app may ever emit is enumerated here, and every
 * property is structurally typed to numbers, booleans, or closed enum
 * literals — free-form strings are unrepresentable, so user content
 * (task text, cues, transcripts, labels) can never ride along. If a stat
 * would only exist to pressure the user, it doesn't belong here either.
 *
 * ANLY-02 funnel coverage: activation = the first session_completed after
 * install (computed downstream from these events); retention D7/D30 =
 * app_opened recurrence (computed by the analytics backend, never on-device).
 */

export type AnalyticsEvents = {
  /** Fired once per cold launch (retention denominator). */
  app_opened: { coldLaunch: boolean };
  /** Both exits are equal — skipped is a datapoint, not a failure. */
  onboarding_completed: { skipped: boolean; firstTaskCreated: boolean };
  /** The activation funnel's front edge. */
  session_started: { source: 'dump' | 'quick' | 'open' };
  /** The activation event. Duration is structural; no task content. */
  session_completed: { durationMs: number; moodGiven: boolean };
  /** Count only — never the items themselves. */
  brain_dump_saved: { itemCount: number };
  item_promoted: Record<string, never>;
  starter_created: Record<string, never>;
  reminder_scheduled: { dayChosen: 'today' | 'tomorrow' };
  /** MECH-01 Soft landing: a landing was configured (structural only). */
  landing_scheduled: { leadMinutes: number; transitionTouch: boolean };
  /** MECH-02 Bridge: which handoff the ritual ended in (v0.2 §9 instrumentation). */
  bridge_next: { nextAction: 'session' | 'starter' | 'none' };
  /** Freemium gate funnel (Phase 7). */
  gate_shown: { sessionsThisWeek: number };
  paywall_viewed: { trigger: 'gate' | 'settings' };
  paywall_dismissed: { trigger: 'gate' | 'settings' };
};

export type AnalyticsEventName = keyof AnalyticsEvents;

export const ALLOWED_EVENT_NAMES: readonly AnalyticsEventName[] = [
  'app_opened',
  'onboarding_completed',
  'session_started',
  'session_completed',
  'brain_dump_saved',
  'item_promoted',
  'starter_created',
  'reminder_scheduled',
  'landing_scheduled',
  'bridge_next',
  'gate_shown',
  'paywall_viewed',
  'paywall_dismissed',
];

/**
 * The ONLY string values any event property may carry — closed enum tokens,
 * never user content. The runtime guard in analytics.ts drops anything else,
 * as defense-in-depth beneath the type-level guarantee.
 */
export const SAFE_STRING_TOKENS: ReadonlySet<string> = new Set([
  'dump',
  'quick',
  'open',
  'today',
  'tomorrow',
  'gate',
  'settings',
  'session',
  'starter',
  'none',
]);
