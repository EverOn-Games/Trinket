/**
 * Local data model. Field names map to source synthesis §6.2's data model sketch
 * (trinket-dev-synthesis-v0.1.md), cased to camelCase per this project's TypeScript
 * convention (e.g. `task_label` -> `taskLabel`, `started_at` -> `startedAt`) — matching
 * ARCHITECTURE.md Pattern 2's `sessionsRepo` reference example.
 *
 * CRITICAL (T-01-09): no daily aggregates, no streak fields, no diagnosis field.
 * "If a stat can only be used for pressure, it does not exist in the schema."
 * Guarded mechanically by data/repositories/__tests__/schema.denylist.test.ts.
 */

import type { MascotProminence } from '../src/components/Mascot/types';

export type DumpItemCategory = 'errands' | 'work' | 'home' | 'people' | 'someday';

export interface DumpItem {
  id: string;
  text: string;
  category: DumpItemCategory;
  createdAt: number; // epoch ms
  promotedTaskId?: string;
}

export interface Intention {
  id: string;
  cueText: string;
  actionText: string;
  createdAt: number; // epoch ms
  notifyAt?: number; // epoch ms — the single optional self-worded reminder (START-03);
  // one notification per intention, never recurring, never a re-engagement hook
  notificationId?: string; // OS scheduling handle for cancel-on-remove/delete —
  // a plumbing id, not a stat; nothing here is streak/aggregate-shaped
}

export type SessionSource = 'dump' | 'quick' | 'open';

export interface Session {
  id: string;
  taskLabel?: string;
  source: SessionSource;
  startedAt: number; // epoch ms — also this record's creation timestamp
  endedAt?: number; // epoch ms — elapsed time is derived from startedAt/endedAt,
  // never a persisted duration counter (no daily boundaries: a session crossing
  // midnight is unremarkable)
  mood?: 1 | 2 | 3;
}

// Single-key pointer marking the one currently-live session, if any (there is
// never more than 0 or 1). lastAliveAt is a liveness heartbeat, NOT an aggregate —
// it must remain named exactly this way (the more "natural" alternative spelling,
// swapping Alive for Active, trips the schema denylist's `lastactive` stem — see
// data/repositories/__tests__/schema.denylist.test.ts).
export interface ActiveSessionPointer {
  sessionId: string;
  startedAt: number; // epoch ms — mirrors the linked Session's startedAt
  lastAliveAt: number; // epoch ms — heartbeat; liveness signal, NOT an aggregate
  taskLabel?: string; // denormalized for the D-11 resume card's copy, avoids a second read
}

export type Locale = 'pl' | 'en';

/**
 * Locally-cached entitlement state (MONEY-03). `null` = never resolved (fresh
 * install / offline-unknown) → free tier, quietly. A positively-cached
 * `{ tier: 'plus' }` is the ONLY thing entitlements.getTier treats as paid.
 * A plain tier flag, never a counter/streak — written by the RevenueCat seam
 * (src/features/subscription/purchases.ts) on a granted entitlement.
 */
export type SubscriptionCache = { tier: 'free' | 'plus' } | null;

export interface SettingsState {
  locale: Locale;
  notificationsOptIn: boolean;
  subscriptionCache: SubscriptionCache;
  mascotProminence: MascotProminence;
}
