# Architecture Research

**Domain:** Local-first React Native + Expo companion app (mascot-driven, session-based, freemium)
**Researched:** 2026-07-01
**Confidence:** HIGH (navigation, state management, MMKV patterns, timer/session lifecycle — multiple corroborating sources incl. official docs) / MEDIUM (RevenueCat↔Supabase sync pattern, XState-vs-hand-rolled sizing judgment — synthesized from vendor docs + community consensus, no single canonical source)

## Standard Architecture

### System Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│                    UI Layer — expo-router (file-based)                │
│  app/(tabs)/home   app/session/[id]   app/brain-dump   app/starter    │
│  app/onboarding    app/paywall        app/settings                    │
│  Screens compose: theme tokens, i18n strings, <Mascot/>, zustand hooks│
├───────────────────┬───────────────────┬───────────────────┬──────────┤
│   Mascot Module    │  Feature Modules  │  Cross-Cutting     │  Shell   │
│  state machine +   │  co-pilot/        │  theme/  i18n/     │  nav,    │
│  lazy Lottie player│  brain-dump/      │  analytics/        │  onboard │
│  (self-contained)  │  starter/         │                    │  -ing    │
├───────────────────┴───────────────────┴───────────────────┴──────────┤
│              App State Layer — Zustand stores (reactive)              │
│  useSessionStore · useDumpItemsStore · useIntentionsStore ·           │
│  useSettingsStore · useSubscriptionStore                              │
├─────────────────────────────────────────────────────────────────────┤
│         Repository / Service Layer (typed, mostly synchronous)        │
│  sessionsRepo · dumpItemsRepo · intentionsRepo · settingsRepo         │
│  purchasesService (RevenueCat) · captureService (STT + categorize)    │
│  analyticsService (PostHog) · backupService (Supabase, opt-in)        │
├─────────────────────────────────────────────────────────────────────┤
│                    Local Storage — MMKV instances                     │
│  content MMKV: dump_items · intentions · sessions (per-record keys)   │
│  settings MMKV: locale, notif opt-in, subscription_cache (blob)       │
├─────────────────────────────────────────────────────────────────────┤
│      External Services — network touched ONLY at this boundary       │
│  RevenueCat SDK → StoreKit 2 / Play Billing                            │
│  Supabase → auth, subscription mirror (webhook), opt-in backup        │
│  Platform STT → iOS Speech framework / Android SpeechRecognizer       │
│  PostHog EU → pseudonymous events, no content payloads                │
└───────────────────────────────────────────────────────────────────────┘
```

The defining property of this architecture is that everything above the "External Services" band must work with the network cable cut. Only `purchasesService` (buy/restore) and `backupService` (opt-in sync) are allowed to require connectivity — this is a hard constraint from PROJECT.md, not a nice-to-have, so it should be enforced by module boundaries (nothing outside those two services holds a live network client), not by discipline alone.

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| UI Layer (`app/`) | Screen composition, layout, navigation structure, deep-link targets | expo-router file-based routes; route groups for tab shell vs modal flows |
| Mascot Module | Owns the greeting → idle → presence → dozing → acknowledge state machine, drives which Lottie loop plays, exposes imperative triggers (`onSessionStart`, `onSessionEnd`) to feature code without feature code touching animation internals | Hand-rolled typed reducer (state + event → state), `lottie-react-native` with lazy-loaded, code-split JSON assets |
| Feature Modules (`co-pilot/`, `brain-dump/`, `starter/`) | One folder per mechanic; owns its screens, its repo calls, its local view logic | Vertical slice folders, not horizontal layers-by-type |
| App State Layer (Zustand stores) | In-memory, reactive mirror of repository data for UI subscriptions; owns transient session/UI state (elapsed-time ticker, current gate check) | One small store per domain, not one giant store |
| Repository/Service Layer | CRUD + query functions over MMKV; single place that knows the on-disk shape of each entity; isolates external-network code (purchases, capture, analytics, backup) behind typed interfaces | Plain TS modules exporting functions, not classes; each repo owns one MMKV keyspace |
| Local Storage (MMKV) | Durable on-device storage; two logical instances (content vs settings) so encryption/backup policy can differ per instance later | `react-native-mmkv`, optionally encrypted, key in `expo-secure-store` |
| External Services | Only network-touching code in the app | RevenueCat SDK, Supabase client, platform STT modules, PostHog RN SDK |

## Recommended Project Structure

```
src/
├── app/                        # expo-router routes (screens only, minimal logic)
│   ├── (tabs)/
│   │   ├── home.tsx             # idle mascot, primary Co-pilot entry
│   │   ├── brain-dump.tsx
│   │   └── settings.tsx
│   ├── session/
│   │   ├── new.tsx              # task selection (dump item / one-liner / just work)
│   │   └── [id].tsx             # presence screen, mascot in `presence`/`dozing`
│   ├── starter/
│   │   └── new.tsx
│   ├── onboarding/
│   │   └── index.tsx            # 3-screen skippable flow
│   ├── paywall.tsx
│   └── _layout.tsx               # theme + i18n + store hydration gate
│
├── features/
│   ├── co-pilot/
│   │   ├── components/           # PresenceScreen pieces, EndButton, MoodCheck
│   │   ├── hooks/                # useSessionTimer, useSessionGate
│   │   └── index.ts
│   ├── brain-dump/
│   │   ├── components/
│   │   ├── capture/               # STT + categorization boundary (see Integration Points)
│   │   └── index.ts
│   └── starter/
│       ├── components/
│       ├── cue-library/           # localized cue data, PL/EN
│       └── index.ts
│
├── mascot/
│   ├── machine.ts                 # typed state + event + transition table
│   ├── useMascotMachine.ts        # hook exposing state + dispatch
│   ├── MascotView.tsx             # renders correct Lottie for current state
│   └── assets/                    # placeholder Lottie JSON, one file per state,
│                                   # named identically to what final art will use
│
├── data/                          # repository/service layer
│   ├── mmkv.ts                     # instance factory: contentStorage, settingsStorage
│   ├── repositories/
│   │   ├── sessions.ts
│   │   ├── dumpItems.ts
│   │   ├── intentions.ts
│   │   └── settings.ts
│   ├── stores/                     # zustand stores wrapping repos
│   │   ├── useSessionStore.ts
│   │   ├── useDumpItemsStore.ts
│   │   ├── useIntentionsStore.ts
│   │   ├── useSettingsStore.ts
│   │   └── useSubscriptionStore.ts
│   └── services/
│       ├── purchases.ts            # RevenueCat wrapper
│       ├── backup.ts               # opt-in Supabase sync, push-only
│       ├── capture.ts              # STT + categorization
│       └── analytics.ts            # PostHog wrapper, typed event map
│
├── theme/
│   ├── tokens.ts                    # colors, spacing, radii, typography — hand-authored now
│   ├── ThemeProvider.tsx
│   └── useTheme.ts
│
├── i18n/
│   ├── index.ts                     # i18next init + expo-localization device detection
│   ├── en.json
│   └── pl.json
│
└── lib/                             # generic cross-cutting utilities (id gen, date fns)
```

### Structure Rationale

- **`app/` stays thin:** expo-router routes should mostly compose components from `features/`; keeping business logic out of route files means routes can be reshuffled (tabs vs stack, adding a route group) without touching logic.
- **`features/` is vertical, not horizontal:** each mechanic (Co-pilot, Brain dump, Starter) is a self-contained slice. This matches the build order in PROJECT.md, where mechanics are built end-to-end one at a time, and avoids the classic mistake of a `components/`, `hooks/`, `screens/` split that forces touching four folders to change one feature.
- **`mascot/` is a standalone module, not part of any feature:** it is consumed by both the home screen (idle) and the Co-pilot session screen (presence/dozing/acknowledge), so it must not live inside `features/co-pilot/`. Its public surface is intentionally small (a hook + a view) so feature code cannot reach into animation internals — this is what makes "swap placeholder Lottie for final art" a data change, not a code change.
- **`data/repositories/` vs `data/stores/` split matters:** repositories are the source of truth and know the MMKV storage format; stores are a thin reactive cache for React. Collapsing these into one layer (e.g., putting MMKV calls directly inside Zustand actions) works at small scale but makes it harder to reason about what's durable vs what's UI-only — worth keeping separate given `sessions` durability is safety-critical (see Anti-Patterns).
- **`theme/tokens.ts` as a single file (not many):** the brief calls for one-to-one replacement when the real design system lands. A single typed tokens object with a stable shape (`colors`, `spacing`, `radii`, `typography`) is the smallest surface to swap; components should import `useTheme()`, never `tokens.ts` directly, so the replacement is invisible to consuming code.

## Architectural Patterns

### Pattern 1: Hand-rolled typed state machine for the mascot (not XState)

**What:** A plain TypeScript discriminated union for mascot state + a typed event union + a pure transition function (`(state, event) => state`), driven by a `useReducer`-shaped hook.

**When to use:** When the state graph is small (5 states here), transitions are simple (mostly linear, one branch on session length), and there's no need for nested/parallel states, history states, or visual statechart tooling.

**Trade-offs:** XState (v5, actively maintained, Context7-verified) is a legitimate, well-documented choice and would be justified if the mascot state machine grows to include interruption handling, parallel regions (e.g., independent "attention" and "energy" axes), or if the team wants the Stately visualizer for designer collaboration. But XState adds real bundle weight (community sources cite mid-teens KB min+gzip vs ~1KB for a hand-rolled reducer) and a learning curve for a 5-state, mostly-linear machine. For MVP scope, a hand-rolled machine is not a corner cut — it is the right-sized tool. Revisit XState only if the state graph measurably grows post-MVP (e.g., when Soft landing / Bridge mechanics are added and start interacting with mascot state).

**Example:**
```typescript
// mascot/machine.ts
export type MascotState = 'greeting' | 'idle' | 'presence' | 'dozing' | 'acknowledge';
export type MascotEvent =
  | { type: 'APP_OPENED' }
  | { type: 'GREETING_DONE' }
  | { type: 'SESSION_STARTED' }
  | { type: 'SESSION_LONG' }       // > 30 min elapsed
  | { type: 'TOUCHED' }             // wakes from dozing
  | { type: 'SESSION_ENDED' }
  | { type: 'ACK_DONE' };

export function transition(state: MascotState, event: MascotEvent): MascotState {
  switch (state) {
    case 'greeting': return event.type === 'GREETING_DONE' ? 'idle' : state;
    case 'idle': return event.type === 'SESSION_STARTED' ? 'presence' : state;
    case 'presence':
      if (event.type === 'SESSION_LONG') return 'dozing';
      if (event.type === 'SESSION_ENDED') return 'acknowledge';
      return state;
    case 'dozing':
      if (event.type === 'TOUCHED') return 'presence';
      if (event.type === 'SESSION_ENDED') return 'acknowledge';
      return state;
    case 'acknowledge': return event.type === 'ACK_DONE' ? 'idle' : state;
  }
}
```
Idle's 3+ micro-behaviors (blink/shift/glance) are a sub-selection *within* the `idle` state (randomized Lottie segment or randomized asset pick on a timer), not additional FSM states — keep the machine's state count matched to section 5.1 of the synthesis, and handle micro-behavior variety as a presentation detail inside the `idle` view.

### Pattern 2: Repository + reactive-store layering over MMKV (not raw Zustand-persist for collections)

**What:** Two different persistence strategies for two different data shapes. Collections (`dump_items`, `intentions`, `sessions`) are stored as individually-keyed MMKV records with an index key listing IDs, accessed via typed repository functions (`create`, `get`, `list`, `update`, `remove`). Singleton state (`settings`, including `subscription_cache`) is stored as one small JSON blob, which is a good fit for Zustand's `persist` middleware with an MMKV-backed `StateStorage` adapter.

**When to use:** Repository pattern for anything that grows as a list and needs querying/filtering (e.g., "all dump_items not yet promoted," "sessions in the last N days" for the quiet history log). Zustand-persist-over-MMKV for small, rarely-multi-record state where the whole blob can be reasonably rehydrated at once.

**Trade-offs:** Using Zustand's persist middleware for the collections too (serializing the entire array on every mutation) is simpler to wire up initially but means every dump-item edit rewrites the whole array to disk — fine at hundreds of records, wasteful and harder to reason about at thousands. Splitting into a repository layer costs one extra layer of indirection but keeps writes proportional to what changed, and keeps the MMKV schema documented in one place (`data/repositories/`) rather than implicit in whatever shape Zustand happened to serialize.

**Example:**
```typescript
// data/repositories/sessions.ts
import { contentStorage } from '../mmkv';

export type Session = {
  id: string;
  taskLabel?: string;
  source: 'dump' | 'quick' | 'open';
  startedAt: number;   // epoch ms — see Pattern 3
  endedAt?: number;
  mood?: 1 | 2 | 3;
};

const INDEX_KEY = 'sessions:index';
const recordKey = (id: string) => `sessions:${id}`;

export const sessionsRepo = {
  create(input: Omit<Session, 'id'>): Session {
    const session: Session = { id: crypto.randomUUID(), ...input };
    contentStorage.set(recordKey(session.id), JSON.stringify(session));
    const index: string[] = JSON.parse(contentStorage.getString(INDEX_KEY) ?? '[]');
    contentStorage.set(INDEX_KEY, JSON.stringify([...index, session.id]));
    return session;
  },
  update(id: string, patch: Partial<Session>): void {
    const raw = contentStorage.getString(recordKey(id));
    if (!raw) return;
    contentStorage.set(recordKey(id), JSON.stringify({ ...JSON.parse(raw), ...patch }));
  },
  list(): Session[] {
    const index: string[] = JSON.parse(contentStorage.getString(INDEX_KEY) ?? '[]');
    return index
      .map((id) => contentStorage.getString(recordKey(id)))
      .filter(Boolean)
      .map((raw) => JSON.parse(raw as string));
  },
  // getOpenSession() used by the boot-time reconciliation in Pattern 3
  getOpenSession(): Session | undefined {
    return this.list().find((s) => s.endedAt === undefined);
  },
};
```

### Pattern 3: Timestamp-based session lifecycle, not JS-timer-based

**What:** Session duration is derived from persisted `startedAt`/`endedAt` epoch timestamps, never from an in-memory `setInterval` counter treated as the source of truth. A `setInterval` (or `requestAnimationFrame`) may still drive the *visible* elapsed-time label while the app is foregrounded, but it is always reset from `Date.now() - startedAt` and is disposable — it does not need to survive backgrounding.

**When to use:** Any timer/duration whose correctness must survive backgrounding, OS-initiated suspension, or force-quit — which is an explicit MVP requirement here (PROJECT.md: "session state persists across backgrounding and force-quit").

**Trade-offs:** This is strictly more correct than JS timers (which iOS/Android throttle or suspend in background — confirmed by community reports of `setTimeout` not firing when RN apps are backgrounded on iOS) at the cost of needing a small boot-time reconciliation step for the force-quit case, since a force-quit skips any `onSessionEnd` write. Concretely: `sessionsRepo.create()` should be called (durably) at the moment a session *starts*, not deferred until it ends — the record with `endedAt: undefined` is itself the "session in progress" signal, and it survives force-quit because it's already on disk. On next app boot, a reconciliation pass checks `sessionsRepo.getOpenSession()`; if one exists, it is silently finalized (e.g., `endedAt` set to a fallback such as `startedAt + <reasonable cap>` or the last-known foreground timestamp) with **no UI mention** of the interruption, matching the explicit spec: "User force-quits mid-session: on next open, no mention of the interrupted session." This reconciliation logic belongs in `sessionsRepo` (or a small `data/services/bootReconciliation.ts`), invoked once during app init, before the mascot machine or any screen reads session state.

**Example:**
```typescript
// features/co-pilot/hooks/useSessionTimer.ts
function useSessionTimer(startedAt: number) {
  const [elapsedMs, setElapsedMs] = useState(() => Date.now() - startedAt);
  useEffect(() => {
    const recompute = () => setElapsedMs(Date.now() - startedAt);
    recompute();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') recompute();       // resync after backgrounding
    });
    const id = setInterval(recompute, 1000);       // foreground-only display tick
    return () => { sub.remove(); clearInterval(id); };
  }, [startedAt]);
  return elapsedMs;
}
```

### Pattern 4: RevenueCat as client-side entitlement source, Supabase as the durable/cross-device mirror

**What:** RevenueCat SDK is queried directly on-device for entitlement checks (fast, works from cache, no network required for the common case once fetched). A Supabase Edge Function receives RevenueCat webhooks and mirrors subscription state into a `subscriptions` table keyed by the same identity used as the RevenueCat `app_user_id`. The client's local `settings.subscription_cache` (MMKV) is the value actually consulted by the freemium gate at session-start time, refreshed opportunistically (app foreground/launch, post-purchase) — this is what keeps the 3-sessions/week gate check fully offline-capable, honoring the "functional offline except purchase/restore" constraint.

**When to use:** Any subscription-gated app that also wants server-side awareness of entitlement (for support tooling, cross-device consistency, or future server-enforced features) without building a bespoke sync engine.

**Trade-offs:** The webhook path introduces eventual consistency (a purchase on Device A may take a moment to reflect for the same account on Device B) — acceptable here since RevenueCat SDK itself is the immediate source of truth on the purchasing device, and Supabase is a mirror, not a gate. Avoid the common mistake of trying to hand-parse each individual webhook event type; call RevenueCat's subscriber-info endpoint after any webhook fires and store that canonical shape, rather than reconstructing state from event deltas.

### Pattern 5: Analytics as a single choke-point service with a typed event map

**What:** All PostHog calls go through one `analyticsService` module exporting a typed function per event (or a single `track(event, props)` with a discriminated-union event map). No component or feature module imports the PostHog SDK directly.

**When to use:** Always, for this project — it is the mechanism that makes the "no content payloads" privacy constraint enforceable in code review rather than relying on every call site remembering the rule. Typing event props as a closed set (e.g., `{ event: 'brain_dump_created'; itemCount: number }`, never a free-text field) makes it a compile error to accidentally pass dump text into an event.

**Trade-offs:** Slightly more ceremony than calling `posthog.capture()` inline everywhere; worth it given the constraint is a hard GDPR/product requirement, not a preference.

## Data Flow

### Co-pilot session flow (the activation event)

```
[User taps "Start session"] (home screen)
   ↓
[task selection: dump item | one-liner | just work]
   ↓
useSessionGate() → subscriptionStore.canStartSession()  (reads MMKV settings blob, offline)
   ↓ (allowed)
sessionsRepo.create({ source, taskLabel, startedAt: Date.now() })   ← durable write, BEFORE navigation
   ↓
navigate to /session/[id]
   ↓
mascot machine: dispatch SESSION_STARTED → 'presence'
   ↓
useSessionTimer ticks (foreground-only) · AppState changes resync elapsed time
   ↓ (>30 min)                                    ↓ (user taps End)
mascot: SESSION_LONG → 'dozing'          sessionsRepo.update(id, { endedAt, mood? })
   ↓ (touch/end)                                   ↓
mascot: TOUCHED → 'presence'             mascot: SESSION_ENDED → 'acknowledge' → 'idle'
                                                   ↓
                                          analyticsService.track('session_completed', { durationBucket, source })
```

### Brain dump → Co-pilot promotion

```
[capture: text or STT] → captureService (platform STT, on-device preferred)
   ↓
captureService.categorize(text) → suggested category (on-device model or minimal text-only API call)
   ↓
dumpItemsRepo.create({ text, category }) → useDumpItemsStore mirrors new item
   ↓
[user taps "promote to session" on an item] → same Co-pilot flow above, source: 'dump', taskLabel: item.text
```

### Subscription/gate flow

```
[app foreground/launch] → purchasesService.getCustomerInfo() (RevenueCat SDK, cached-first)
   ↓
settingsRepo.update({ subscription_cache: entitlement }) → useSubscriptionStore reflects it
   ↓ (used offline at any later session-start check, no network required)

[user purchases] → purchasesService.purchase() (network required, explicit exception to offline-first)
   ↓
RevenueCat webhook → Supabase Edge Function → subscriptions table (server mirror)
   ↓ (client re-fetches customer info post-purchase to update local cache immediately)
```

### State Management

```
MMKV (durable)
   ↕ (repository read/write)
Repository functions (data/repositories/*)
   ↕ (called from store actions; store holds an in-memory array mirror)
Zustand stores (data/stores/*)
   ↕ (subscribe via hooks)
React components (features/*, mascot/, app/)
```

Zustand stores are a cache, not a second source of truth — every mutation goes repo-first, then updates the store's in-memory mirror (either optimistically or by re-reading from the repo), so a store can always be safely rebuilt from MMKV (e.g., after an app update changes store shape) without data loss.

## Scaling Considerations

This is a single-user, on-device-data app — "scale" here means per-device record volume and beta→launch user counts, not server load, since the backend surface is deliberately minimal.

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Beta (20-60 users, weeks of use) | Current design (per-record MMKV keys + full-list `list()` scans) is fine; a user might accumulate low hundreds of sessions/dump items over a beta window |
| Public launch, months of daily use (thousands of records/device) | `list()` becomes the first bottleneck if it's called on every render — memoize/select in the store layer rather than re-parsing all MMKV records per read; consider paginating the "quiet log" history view rather than rendering all sessions at once |
| Backend (Supabase) at any launch-scale user count | Backend surface stays small by design (auth + subscription mirror + opt-in backup blobs) — this does not need horizontal-scaling thinking for MVP; the interesting scale question is opt-in backup payload size per user, not request volume |

### Scaling Priorities

1. **First bottleneck:** Full-list JSON parse-on-read in repositories, once a device accumulates thousands of sessions/dump items. Fix by adding simple date-range or limit/offset query params to `list()` before it's needed, not preemptively — MMKV reads are fast, so this is a "watch for it," not a day-one concern.
2. **Second bottleneck (unlikely at MVP scale):** Opt-in backup payload size if it round-trips full content rather than deltas. Since backup is explicitly deferrable post-MVP per PROJECT.md open decisions, defer this design question until backup is actually built.

## Anti-Patterns

### Anti-Pattern 1: Treating session duration as in-memory state

**What people do:** Keep `elapsedSeconds` only in a React state variable incremented by `setInterval`, with no durable record until the session ends.
**Why it's wrong:** iOS and Android both throttle or suspend JS timers when backgrounded, and a force-quit destroys all in-memory state outright — this directly breaks the explicit MVP requirement that sessions survive backgrounding and force-quit, and it's the single riskiest correctness gap in the whole app given Co-pilot is the activation event.
**Do this instead:** Write the session record (with `startedAt`) to MMKV via the repository at session *start*, not session *end*; derive elapsed time from timestamps; reconcile orphaned "open" sessions on next boot (Pattern 3).

### Anti-Pattern 2: Letting the mascot module know about feature-specific state

**What people do:** Import `useSessionStore` or `useDumpItemsStore` directly inside `mascot/`, coupling animation logic to Co-pilot's internals.
**Why it's wrong:** Breaks the "swap placeholder art in later without touching code" goal and makes the mascot impossible to reuse cleanly on the home screen (idle) vs the session screen (presence/dozing/acknowledge), since those are different feature contexts feeding the same module.
**Do this instead:** Mascot module only accepts events (`onSessionStart`, `onSessionEnd`, `onLongSession`) via its public hook API; feature code calls these, mascot never reaches outward.

### Anti-Pattern 3: Adding a server-state library (TanStack Query, RTK Query, SWR) for three network calls

**What people do:** Reach for a query/cache library by default because it's the 2026 community norm for "app + backend."
**Why it's wrong:** The backend surface here is deliberately tiny (auth, entitlement fetch, opt-in backup push) — a full query-caching library adds a dependency and mental model overhead disproportionate to three call sites, and none of them benefit from features like automatic refetch-on-window-focus or complex cache invalidation graphs.
**Do this instead:** Plain async functions in `data/services/*` with simple loading/error state in the relevant Zustand store slice. Revisit only if opt-in backup grows into true bidirectional sync with conflict resolution.

### Anti-Pattern 4: Retrofitting analytics instrumentation as a final step

**What people do:** Build every feature, then add analytics calls in a dedicated "analytics" pass at the end (as literally sequenced in the source synthesis's build order step 8).
**Why it's wrong:** PROJECT.md explicitly requires funnel events instrumented *before* beta, and retrofitting event calls after each feature is already built means re-opening and re-testing every screen a second time, plus higher risk of missing a funnel step.
**Do this instead:** Scaffold the `analyticsService` module (SDK init, typed event map, no-op in dev if desired) during initial project scaffold; add the actual `track()` call sites inline as each feature is built, not in a separate later pass. (Reflected in the Build Order section below.)

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| RevenueCat | Client SDK (`react-native-purchases`), `app_user_id` = Supabase user id for identity linking | Cached-first entitlement checks work offline; purchase/restore are the two calls that require network per PROJECT.md's explicit exception |
| Supabase | `supabase-js` client for auth; Edge Function as RevenueCat webhook receiver; minimal tables (`subscriptions`, opt-in `backups`) | Keep backend surface minimal by design — resist adding tables for anything that belongs in local MMKV per the data-model constraint |
| Platform STT (iOS Speech / Android SpeechRecognizer) | Wrapped behind a single `captureService.transcribe()` interface via a maintained RN module | On-device preferred; isolate behind an interface so a fallback (or future on-device model swap for categorization) doesn't ripple into `features/brain-dump/` |
| PostHog EU | RN SDK wrapped by `analyticsService`, typed event map, pseudonymous distinct ID | No content payloads by construction — event prop types should statically exclude free-text fields |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `mascot/` ↔ `features/*` | Imperative event calls via `useMascotMachine()` hook, one direction (features → mascot) | Mascot never imports feature stores; keeps it swappable and reusable across home/session screens |
| `data/stores/*` ↔ `data/repositories/*` | Store actions call repo functions, then update in-memory mirror | Repos are the durable source of truth; stores can always be rebuilt from them |
| `features/*` ↔ `data/stores/*` | React hooks (`useSessionStore()`, etc.) | Feature components never call MMKV or repositories directly, always through a store hook |
| `theme/` ↔ everything visual | `useTheme()` hook only, never `import tokens from 'theme/tokens'` in components | Enforces the one-to-one swap goal when the real design system lands |
| `capture/` (STT + categorization) ↔ `brain-dump/` | Single service call returning structured text + suggested category | Only feature-owned code path that touches an optional network call carrying user content (categorization fallback) — isolate tightly given the privacy constraints |

## Suggested Build Order (with dependency reasoning)

The source synthesis (`trinket-dev-synthesis-v0.1.md`, section 9) proposes a 9-step build order. It is directionally sound; the architecture research surfaces three refinements worth carrying into the roadmap:

1. **Scaffold — Expo + TS strict + navigation shell (expo-router) + theme tokens + i18n skeleton + MMKV layer.**
   Refinement: scaffold **all four local repositories** (`sessions`, `dumpItems`, `intentions`, `settings`) here, not just "an MMKV layer" — Co-pilot's task-selection step (step 3) references `dump_items` even before Brain dump's UI exists (step 4), so the data shape needs to exist first. Also scaffold the `analyticsService` module here (SDK init + typed event map, no call sites yet) so instrumentation can be added inline in every subsequent step instead of retrofitted (Anti-Pattern 4).

2. **Mascot module** — state machine + placeholder Lottie states, consumed by nothing yet.
   Depends on: scaffold (theme tokens for any placeholder styling, i18n not required here). Must precede Co-pilot because the presence screen embeds it, and precede any home-screen idle rendering.

3. **Co-pilot end-to-end** (activation event).
   Depends on: mascot module (presence/dozing/acknowledge), `sessions` + `dumpItems` repositories (task selection can pull from dump items even with no Brain dump UI — allow a stub "type a one-liner" path first), subscription gate stub (can hardcode "always allowed" until step 7 wires the real gate — do not block Co-pilot on subscription infra). **Session persistence across backgrounding/force-quit (Pattern 3) must be built here, not deferred to hardening** — this is core Co-pilot correctness, not polish, since PROJECT.md lists it as an explicit edge case of this mechanic.

4. **Brain dump** (capture first, categorization second, per synthesis — sound ordering: capture is standalone and testable before adding the categorization network/on-device call).
   Depends on: `dumpItems` repository (already scaffolded in step 1), `captureService` (new).

5. **Starter.**
   Depends on: `intentions` repository (scaffolded step 1), and optionally a Brain dump item as an entry point (step 4 must exist first for that entry point, though Starter's own two-step builder doesn't strictly require it).

6. **Onboarding** (3 screens, skippable).
   Depends on: home screen + mascot (step 2/3) and at minimum Co-pilot's task-selection existing, since "pick your first task" is one of the three screens.

7. **Subscription infra + freemium gate.**
   Depends on: Co-pilot session-start flow already existing (step 3) since the gate hooks into that exact call site; also requires Supabase auth to exist for `app_user_id` linking (introduce Supabase auth here, not earlier — no reason to force account creation before this point given the shame-free/low-friction posture, and PROJECT.md doesn't require an account for core loop use).

8. **Settings + notification opt-in** (analytics *instrumentation* call sites should already be distributed across steps 2-7 per the step-1 refinement, not concentrated here).

9. **Beta hardening** — offline-correctness sweep across Brain dump/Starter/Settings, crash-free session audit, cross-cutting edge cases. This step should find *few* session-persistence bugs if step 3 was built correctly, since that mechanism is foundational rather than bolted on.

**Net effect of these refinements on roadmap phase structure:** the "data layer" work (all four repositories) is a phase-0/scaffold concern, not something introduced piecemeal per-feature; analytics instrumentation is continuous across phases, not a discrete phase; and "state persistence" is a Co-pilot-phase deliverable, not a hardening-phase deliverable — hardening should be scoped as an audit/polish pass, not where correctness is first established.

## Sources

- [Expo Router vs React Navigation — Which One Should You Use in 2026 (DEV Community)](https://dev.to/bhupeshchandrajoshi/expo-router-vs-react-navigation-which-one-should-you-use-in-2026-3khj) — MEDIUM confidence, corroborated by official Expo docs below
- [Introduction to Expo Router — Expo Documentation](https://docs.expo.dev/router/introduction/) — HIGH confidence, official
- [Core concepts of file-based routing — Expo Documentation](https://docs.expo.dev/router/basics/core-concepts/) — HIGH confidence, official
- [Expo React Native: Offline-First Setup Using MMKV and Zustand (Medium)](https://medium.com/@nithinpatelmlm/expo-react-native-easy-offline-first-setup-in-expo-using-mmkv-and-zustand-react-native-mmkv-and-68f662c6bc3f) — MEDIUM confidence
- [react-native-mmkv — Zustand persist middleware wrapper docs (GitHub, mrousavy/react-native-mmkv)](https://github.com/mrousavy/react-native-mmkv/blob/main/docs/WRAPPER_ZUSTAND_PERSIST_MIDDLEWARE.md) — HIGH confidence, official library docs
- [react-native-mmkv — main repo, encryption section](https://github.com/mrousavy/react-native-mmkv) — HIGH confidence, official
- [React Native MMKV vs AsyncStorage vs Expo SecureStore: 2026 Storage Decision Guide (PkgPulse)](https://www.pkgpulse.com/guides/react-native-mmkv-vs-async-storage-vs-expo-secure-store-2026) — MEDIUM confidence
- [XState — Context7 library resolution (`/websites/stately_ai_xstate-v4_xstate`, `/statelyai/xstate`)](https://stately.ai) — HIGH confidence, official
- [Selecting a finite state machine library for React (Rainforest QA)](https://www.rainforestqa.com/blog/selecting-a-finite-state-machine-library-for-react) — MEDIUM confidence, bundle-size claims cross-referenced against general community consensus
- [How to Use `useReducer` as a Finite State Machine (Kyle Shevlin)](https://kyleshevlin.com/how-to-use-usereducer-as-a-finite-state-machine/) — MEDIUM confidence
- [Efficiently Managing Timers in a React Native App (DEV Community)](https://dev.to/shivampawar/efficiently-managing-timers-in-a-react-native-app-overcoming-background-foreground-timer-state-issues-map) — MEDIUM confidence
- [Build a Stop Watch Hook that Works Even When the App is Quit (React Native School)](https://www.reactnativeschool.com/build-a-stop-watch-hook-that-works-even-when-the-app-is-quit/) — MEDIUM confidence
- [`facebook/react-native` issue #38711 — JS Timers don't fire when app launched in background (iOS)](https://github.com/facebook/react-native/issues/38711) — HIGH confidence, official issue tracker, confirms the platform-throttling constraint driving Pattern 3
- [How to Build a React Native Expo App with Supabase and RevenueCat (Buildcamp)](https://www.buildcamp.io/blogs/how-to-build-a-react-native-expo-app-with-supabase-and-revenuecat) — MEDIUM confidence
- [Webhooks — RevenueCat official docs](https://www.revenuecat.com/docs/integrations/webhooks) — HIGH confidence, official
- [State Management in 2026: Zustand vs Jotai vs Redux Toolkit vs Signals (DEV Community)](https://dev.to/jsgurujobs/state-management-in-2026-zustand-vs-jotai-vs-redux-toolkit-vs-signals-2gge) — MEDIUM confidence
- [Zustand — official comparison docs](https://zustand.docs.pmnd.rs/learn/getting-started/comparison) — HIGH confidence, official
- [Boost Your React Native App Start Time: Stop Shipping Lottie JSON Incorrectly (DEV Community)](https://dev.to/retyui/boost-your-react-native-app-start-time-stop-shipping-lottie-json-incorrectly-2074) — MEDIUM confidence, corroborates the PROJECT.md-specified <300KB/lazy-load requirement
- [Optimizing Lottie Animations in React Native with the .lottie Format (Medium)](https://medium.com/@mukkadeepak/optimizing-lottie-animations-in-react-native-with-the-lottie-format-8f7a31ff53ed) — MEDIUM confidence
- [How to manage your Design Tokens with Style Dictionary (Medium)](https://didoo.medium.com/how-to-manage-your-design-tokens-with-style-dictionary-98c795b938aa) — MEDIUM confidence, informs the swappable-tokens pattern anticipating the eventual design-system handoff

---
*Architecture research for: local-first React Native + Expo companion app (Trinket)*
*Researched: 2026-07-01*
