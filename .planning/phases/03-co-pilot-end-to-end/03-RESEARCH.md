# Phase 3: Co-pilot End-to-End - Research

**Researched:** 2026-07-03
**Domain:** React Native / Expo Router client-side session lifecycle (timers, AppState, MMKV persistence, navigation) — no new native modules, no backend surface
**Confidence:** HIGH (timestamp-derivation architecture, MMKV/repo patterns, Jest mocking strategy — all directly verifiable against this repo's own Phase 1/2 code) / MEDIUM (exact AppState timer-throttling behavior on real devices — verified via multiple corroborating sources but not executed on-device this session) / LOW (D-11's exact staleness-field choice — flagged below as a reasoned deviation from CONTEXT.md's literal wording, needs planner/user confirmation)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Session start flow
- **D-01:** One setup screen (the existing `src/app/co-pilot.tsx` route becomes the session flow), reached from Home's primary "Start a session?" action. All three entry paths live on this single screen with equal visual weight, no friction ranking (PILOT-01): a one-liner text field, a "Just work" open-session option, and a pick-from-Brain-dump section.
- **D-02:** The Brain-dump picker reads from the existing Phase 1 `dumpItemsRepo`. Before Phase 4 ships capture UI, the repo will typically be empty — when empty, the dump-item section simply does not render (no dead UI, no empty-state nudge, no "add tasks first" copy). When Phase 4 lands, items appear here with zero Phase 3 rework. Starting from a dump item sets `source: 'dump'` and writes `promotedTaskId` linkage per the existing schema.
- **D-03:** Length intent is an optional row on the same setup screen: preset chips (e.g., 15 / 25 / 45 / 90 min) with 25 pre-highlighted as the default *suggestion*, plus a clearly equal "no timer" choice. Freely adjustable; grammar is an offer, never a requirement. The intent is NOT persisted as a schema field commitment — it only parameterizes the in-session display (see D-06). Ending before the intent elapses is a completed session, never an abandoned one (PILOT-02).

#### In-session controls & timer
- **D-04:** Requirements beat mockup. The session screen ships with a SINGLE End button (PILOT-03). The mockup's "Take a break" button, "Rain & lamplight" ambient sound, and "23 others, quietly" co-presence count are all excluded: break/pause → deferred idea; ambient sound → deferred idea; co-presence count → rejected outright (social features are explicitly out of scope in PROJECT.md). The mockup remains the visual/layout/tone reference (dark habitat, task label with "change" affordance, subtle timer placement) — not the component inventory.
- **D-05:** Elapsed time displays as a subtle count-up (mockup's muted `42:17` treatment), derived from `startedAt` timestamps on every render tick — never an in-memory accumulating counter.
- **D-06:** Opted-in countdown semantics: if (and only if) the user set a length intent, they may view remaining time instead of elapsed — this is the "unless the user chose one" carve-out in PILOT-03. When a countdown reaches zero: no sound, no vibration, no color change, no mascot reaction, no auto-end. The display gently crossfades back to elapsed count-up and the session simply continues. The mascot does nothing at intent-elapse (MASC-03: mascot only reacts to user actions).
- **D-07:** Dozing (PILOT-04): mascot may enter `dozing` after ~30 minutes of session time, derived from `startedAt` (not a timer counter). Wakes (back to `presence`) on mascot touch or on session end. This is charm, not a signal — no copy accompanies it.

#### Interruption & reconciliation
- **D-08:** Core mental model: a session represents real-world work done near the phone — the phone being locked, backgrounded, or even OS-killed mid-session is the NORMAL case, not an error. Elapsed time is always derived from persisted timestamps, so no interruption can lose time.
- **D-09:** While the session screen is foregrounded, persist a `lastAliveAt` heartbeat (every ~30-60s) alongside the active-session pointer in MMKV. This is a liveness timestamp, not an aggregate — it must pass the schema denylist test. Whether it lives on the Session record or a separate `activeSession` key is planner's discretion.
- **D-10:** Backgrounding (process alive): returning to the app lands straight back on the session screen — it is simply where the user was. No card, no mention, elapsed correct from `startedAt`. Sessions survive any backgrounded duration while the process lives.
- **D-11:** Cold launch (force-quit / OS kill) with a persisted open session: if the session is still plausibly live (now − `startedAt` ≤ ~12h — exact threshold planner's discretion within 8–24h), Home renders a warm resume card in the mockup's pattern ("We were {taskLabel}. Pick it up?" → Resume / Not now). This surfaces the *live session*, never the *interruption* — no "your session was interrupted", no "you left", no guilt framing; PILOT-06's "zero mention" forbids interruption language, not continuity. "Resume" returns to the session screen with elapsed derived from `startedAt`. "Not now" silently ends the session (endedAt = `lastAliveAt`) with no further comment.
- **D-12:** Cold launch with a stale open session (older than the D-11 threshold): silent reconciliation sweep at launch — the orphaned session is closed with `endedAt = lastAliveAt` (best-effort honest bound), no card, no mention anywhere, and it appears in the quiet log as an ordinary completed session. Ending early/orphaned is completed, never abandoned.

#### Ending & history log
- **D-13:** Ending is an inline moment on the session screen, not a separate summary screen. End tap → mascot plays `acknowledge` (one-shot, driven via the Phase 2 `state` prop + `onStateAnimationComplete`), a warm i18n copy line appears (warm regardless of duration or completion — same warmth for a 2-minute session), and the skippable mood check renders: three emoji-level options (maps to `mood: 1|2|3`), one tap to answer, one tap (or the acknowledge moment simply concluding) to skip. Skipping stores no mood. Then the user lands on Home.
- **D-14:** No numbers on the ending moment — no "you worked 43 min" callout. Duration lives quietly in the history log, not in the emotional beat of the acknowledgment.
- **D-15:** History (`src/app/history.tsx`, PILOT-07): a flat reverse-chronological list — NO day-group headers (day headers are daily boundaries), no statistics, no completion rates, no aggregates. Each row: task label (localized "Just worked" fallback for open/unlabeled sessions), start date+time, a modest duration (a per-session fact, not an aggregate — allowed), and the mood emoji if one was given (the user's own word reflected back, shown quietly). Empty state is warm and pressure-free via i18n copy.

### Claude's Discretion
- Session-flow state management shape (Zustand store vs. hook over `sessionsRepo`), navigation wiring between setup → session → Home, and where the active-session pointer + heartbeat live in MMKV (D-09).
- Exact D-11 staleness threshold (8-24h band) and heartbeat interval (30-60s).
- Elapsed-time render mechanism (interval tick granularity, AppState handling) — as long as display derives from timestamps.
- Countdown-view toggle affordance design (D-06) — kept subtle, offer-grammar.
- Mood-check emoji glyph choices and the exact skip affordance, within "one tap, skippable, 3 levels".
- Test strategy: fake timers + AppState mocks following the Phase 1/2 mock precedents; TDD RED→GREEN pairing per project precedent.

### Deferred Ideas (OUT OF SCOPE)
- **"Take a break" / pause mechanic** (from session mockup) — a pause concept doesn't exist in the MVP data model; would need explicit product decision on what pausing means for elapsed time. Post-MVP candidate.
- **Ambient soundscapes ("Rain & lamplight")** (from session mockup) — a new capability; potential premium-tier content, its own phase if validated.
- **"23 others, quietly" co-presence count** (from session mockup) — REJECTED, not deferred: social/community features are explicitly out of scope in PROJECT.md, and even ambient social presence risks comparison/guilt surface.
- **Task-label "change" mid-session** (mockup affordance) — MVP ships the label read-only during a session; changing the task mid-session is cheap to add later if beta asks for it.
- **iOS physical-device verification** — still deferred (carried blocker; hard gate before Phase 9). Phase 3 is pure TS/screen work with no new native inputs, so it does not force the retry window.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| PILOT-01 | Start a session from Brain-dump item, typed one-liner, or open "just work" — three equal paths | Architecture Patterns Pattern 1 (single setup screen with `flowPhase` state), Don't Hand-Roll (reuse `dumpItemsRepo`/`sessionsRepo`), Code Examples (session creation on each path) |
| PILOT-02 | Optional length intent (25-min default suggestion), freely adjustable; early end is completed, never abandoned | Architecture Patterns Pattern 1 (intent is ephemeral UI state, never a schema field), Common Pitfall 1 |
| PILOT-03 | Session screen: mascot presence, subtle elapsed time, single End button, no countdown pressure unless opted-in | Architecture Patterns Pattern 2 (`useElapsedSession` hook), Code Examples (elapsed-time hook + countdown crossfade) |
| PILOT-04 | Mascot dozes after ~30 min of session time, wakes on touch or session end | Architecture Patterns Pattern 2 (dozing derivation + wake-grace window), Code Examples |
| PILOT-05 | Warm acknowledgment always plays; skippable one-tap 3-level mood check | Architecture Patterns Pattern 3 (acknowledge one-shot + `onStateAnimationComplete` as the "conclusion" skip trigger) |
| PILOT-06 | Session survives backgrounding, force-quit, OS kill; elapsed derived from timestamps; orphaned sessions silently reconciled at next launch | Architecture Patterns Pattern 4 (heartbeat + reconciliation sweep), Common Pitfall 2 & 3, Open Question 1 |
| PILOT-07 | History is a quiet log: no stats, no completion rates, no daily boundaries | Existing `src/app/history.tsx` walking skeleton already satisfies the shape — Architecture Patterns notes the incremental additions (duration display, mood emoji) |
</phase_requirements>

## Summary

Phase 3 adds **zero new native dependencies**. Every capability — session timing, AppState-driven pause/resume of the render tick, MMKV heartbeat persistence, and touch-to-wake — is achievable with APIs already bundled in React Native 0.85 core (`AppState`, `Pressable`) plus the already-installed `react-native-mmkv` and `<Mascot />` module from Phase 1/2. This confirms the phase description's expectation directly: no `expo prebuild` note is needed for this phase's completion message.

The single governing architectural decision is one already locked by CONTEXT.md (D-05/D-08): **elapsed time and dozing state are pure derivations of `Date.now() - startedAt`, recomputed on every render tick — never accumulated counters.** This sidesteps the well-documented JS-timer background-throttling problem entirely (iOS suspends `setTimeout`/`setInterval` callbacks in background; Android eventually stops firing them too) rather than fighting it — the render tick's *only* job is to trigger a re-render at a reasonable cadence while the screen is visible; it is never the source of truth for "how much time has passed." When the screen is not foregrounded, there is nothing to render, so the tick can (and should) simply stop via an `AppState` listener, resuming and immediately recomputing from `Date.now()` the instant the app returns to `active`.

One concrete, disqualifying finding: **`expo-keep-awake` should NOT be installed for this screen.** D-08's core mental model explicitly treats the phone locking/backgrounding mid-session as the *normal*, celebrated case — forcing the screen to stay awake for a body-doubling session that could run 90+ minutes would both drain battery for no product benefit and subtly contradict the "lock your phone, we've got you" promise. This resolves the additional-context open question definitively (own-reasoning conclusion, not a technical unknown) and keeps this phase's native surface at zero.

The second key finding is a discrepancy between D-11's literal wording and the mechanism D-09 sets up to serve it: D-11 says "now − `startedAt` ≤ ~12h" but the heartbeat's entire purpose is to know when the process was *last confirmed alive* — which is `lastAliveAt`, not `startedAt`. A session that ran actively (with heartbeats) for 20 hours and force-quit 10 minutes ago should show the resume card; checking against `startedAt` would silently reconcile it away instead. Recommend gating the D-11/D-12 branch on `now − lastAliveAt`, using `startedAt` only for the resume card's display copy. Flagged as an Open Question for explicit planner/user confirmation since it revises locked-decision wording, even though it serves the same intent.

Third: the existing Phase 1 walking-skeleton wiring in `src/app/index.tsx` (`handleStartSession` eagerly calls `sessionsRepo.create({ source: 'quick' })` on every tap of "Start a session?", before navigating) is now the **wrong** behavior under D-01 — the setup screen must exist and let the user pick a path before any `Session` record is created. This is a required refactor, not new code, and the existing walking-skeleton test (`'creates exactly one session via sessionsRepo when the home offer is pressed'` in `src/app/__tests__/screens.test.tsx`) will need to be rewritten as part of this phase, not just extended.

**Primary recommendation:** Single route (`src/app/co-pilot.tsx`) driving an internal three-phase state machine (`setup → active → ending`), backed by one new MMKV pointer key (`activeSession`) for O(1) "is a session live" lookups and heartbeat storage, reconciled once at app boot in `src/app/_layout.tsx` mirroring the existing `usePersistResolvedLocale` pattern, with elapsed time and dozing both derived from `startedAt` via a `useElapsedSession` hook that pauses its render-tick (not the underlying math) whenever `AppState.currentState !== 'active'`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|-----------------|-----------|
| Session start flow (setup screen, 3 entry paths) | Client (RN screen, JS thread) | Local Storage (`sessionsRepo`/`dumpItemsRepo` reads) | Pure client UI reading/writing local MMKV records; no network involvement |
| Elapsed time / dozing derivation | Client (component-local hook, JS thread) | — | Timestamp math only; must never be a backend or persisted-counter concern |
| Active-session liveness (heartbeat + pointer) | Local Storage (MMKV, synchronous) | Client (writes on tick + AppState transition) | mmap-backed writes are cheap enough to happen from the JS thread on every heartbeat tick with no async/backend round-trip |
| Reconciliation sweep (cold launch) | Client (root layout mount effect) | Local Storage (synchronous MMKV read) | Runs once at boot, before first paint of Home; no network dependency, must stay synchronous-cheap per CLAUDE.md's `_layout.tsx` integration note |
| Mascot presence/dozing/acknowledge rendering | Client (Phase 2 `<Mascot />` module) | — | Feature-agnostic prop-driven module; this phase is purely a *host* of it, no changes to the module itself |
| Warm ending copy + mood check | Client (RN screen) | Local Storage (`sessionsRepo.update` for `mood`) | Local-only write, no backend; mood is optional and stored per-session, never aggregated |
| Session history log | Client (RN screen, `FlatList`) | Local Storage (`sessionsRepo.list()`) | Already the exact shape of the Phase 1 walking-skeleton `history.tsx` — this phase only adds duration/mood display |

No Frontend-Server/API/Backend tier involvement exists in this phase — consistent with Phase 1/2's pattern and CLAUDE.md's local-first constraint. Phase 7 (freemium gate) and Phase 4 (Brain dump capture UI) are the only future phases that touch this surface, both via the single call sites this research recommends keeping (session-start entry point, dump-item picker section).

## Standard Stack

No new packages this phase. Every capability is served by APIs already present in the installed dependency set.

### Core (already installed, newly used this phase)

| API / Library | Version | Purpose | Why Standard |
|---|---|---|---|
| `AppState` (from `react-native` core) | bundled with `react-native@0.85.3` [VERIFIED: package.json] | Detect foreground/background transitions to pause the elapsed-time render tick and to write a tighter `lastAliveAt` heartbeat right before backgrounding | Long-stable RN core API, no separate package, already the pattern this codebase uses for a sibling OS-signal hook (`useReducedStimulus.ts`'s `AccessibilityInfo.addEventListener`) [CITED: reactnative.dev/docs/appstate] |
| `Pressable` (from `react-native` core) | bundled | Wraps `<Mascot />` to detect the D-07 "wake on touch" tap — no gesture-handler swipe/pan logic needed, a simple tap suffices | Already the project's standard tap-target primitive (used on Home's primary/secondary offers) — no new pattern introduced |
| `react-native-mmkv` (`createMMKV`, `contentStorage`) | `^4.3.2` (already installed) [VERIFIED: package.json] | New `activeSession` pointer key + heartbeat writes; extends the existing `sessionsRepo`/`dumpItemsRepo` CRUD pattern | Already the project's sole local-storage layer; mmap-backed writes have no explicit disk syscall per write, so a 30-60s heartbeat cadence is trivially cheap [CITED: github.com/mrousavy/react-native-mmkv architecture docs] |
| `expo-router` (`useRouter`, `Stack`) | `~56.2.12` (already installed) [VERIFIED: package.json] | `router.replace('/')` after the ending moment concludes, so the ended session screen never re-appears via back navigation from Home | Already the project's routing layer; `.replace()` vs `.push()` is a standard Expo Router / React Navigation API distinction [CITED: docs.expo.dev/router] |
| `<Mascot />` (`src/components/Mascot/Mascot.tsx`) | Phase 2, locked contract | Drives `presence`/`dozing`/`acknowledge` states via existing `state`/`onStateAnimationComplete` props | Feature-agnostic module built exactly for this kind of host; zero changes needed to the module itself |

### Explicitly NOT added

| Package | Why not |
|---|---|
| `expo-keep-awake` (`56.0.3`, confirmed current SDK-56-matching version [VERIFIED: npm registry, `npm view expo-keep-awake versions`, 2026-07-03]) | D-08's mental model treats screen-lock/backgrounding mid-session as normal and celebrated, not something to prevent. Installing this would add a native dependency (triggering a prebuild note per CLAUDE.md's convention) for a behavior that contradicts the phase's own product thesis. If a future phase's UX research concludes otherwise, re-evaluate then — do not default to installing it. |
| `react-native-gesture-handler` swipe/pan APIs (already installed as a peer, but not needed here) | D-07's "wake on touch" is satisfied by a plain `Pressable` tap; no swipe/pan/long-press choreography was requested |

**Installation:** none required this phase.

**Version verification:** `react-native-mmkv@4.3.2`, `expo-router@56.2.12`, `react-native@0.85.3` all confirmed already pinned in `package.json` (read directly, 2026-07-03). `expo-keep-awake@56.0.3` confirmed as the current SDK-56-line version via `npm view expo-keep-awake versions --json` — documented here only to record that it was evaluated and rejected, not because it should be installed.

## Package Legitimacy Audit

Not applicable — this phase installs no new packages. No `npm install`/`expo install` commands appear in this phase's plan.

## Architecture Patterns

### System Architecture Diagram

```
Home (src/app/index.tsx)
  │
  │  "Start a session?" — no longer eagerly creates a Session (WR: refactor
  │  from Phase 1 walking skeleton — see Pitfall 4)
  ▼
router.push('/co-pilot')
  │
  ▼
CoPilotScreen (src/app/co-pilot.tsx) — flowPhase state machine
  │
  ├─ flowPhase === 'setup' (no active session pointer found)
  │    │
  │    ├─► one-liner text field ──┐
  │    ├─► "Just work" button ────┼─► sessionsRepo.create({ source, taskLabel? })
  │    ├─► dump-item picker ──────┘      + activeSessionRepo.start(session)
  │    │      (reads dumpItemsRepo.list(), hidden section if empty — D-02)
  │    └─► length-intent chips (ephemeral local state only, never persisted)
  │              │
  │              ▼  setFlowPhase('active')
  │
  ├─ flowPhase === 'active' (activeSession pointer present)
  │    │
  │    ├─► useElapsedSession(startedAt)
  │    │      │
  │    │      ├─ AppState listener: pause/resume render-tick interval
  │    │      ├─ every tick: elapsedMs = Date.now() - startedAt  (never accumulated)
  │    │      ├─ every ~30-60s (foregrounded only) + on 'active'→'background'
  │    │      │  transition: activeSessionRepo.heartbeat(lastAliveAt = Date.now())
  │    │      └─ isDozing = elapsedMs >= 30min AND now - lastTouchAt >= wake-grace
  │    │
  │    ├─► <Pressable onPress={wake}><Mascot state={isDozing ? 'dozing' : 'presence'} /></Pressable>
  │    ├─► elapsed/countdown display (crossfade on countdown-reaches-zero, D-06)
  │    └─► single End button ──► setFlowPhase('ending')
  │
  └─ flowPhase === 'ending'
       │
       ├─► sessionsRepo.update(id, { endedAt: Date.now() })
       ├─► activeSessionRepo.clear()
       ├─► <Mascot state="acknowledge" onStateAnimationComplete={goHome} />
       ├─► warm i18n copy line (always warm, D-14: no numbers here)
       └─► skippable 3-level mood check ──► sessionsRepo.update(id, { mood })
              (tap OR onStateAnimationComplete fires) ──► router.replace('/')

Root layout (src/app/_layout.tsx) — mounted once at boot, before Home paints
  │
  └─► useReconcileActiveSession()  (mirrors usePersistResolvedLocale's shape)
         │
         ├─ activeSessionRepo.read() → none? no-op
         ├─ now - lastAliveAt <= threshold (8-24h, Claude's discretion)?
         │     → leave pointer in place; Home renders the D-11 resume card
         ├─ else (stale):
         │     → sessionsRepo.update(id, { endedAt: lastAliveAt })  (D-12)
         │     → activeSessionRepo.clear()
         │     → no card, no mention — appears as an ordinary row in History

History (src/app/history.tsx) — unchanged read pattern, extended row content
  │
  └─► sessionsRepo.list().reverse() → duration (endedAt - startedAt) + mood emoji
```

### Recommended Project Structure

```
src/app/
├── co-pilot.tsx          # rewritten: flowPhase state machine (setup/active/ending)
├── _layout.tsx            # extended: + useReconcileActiveSession() mount effect
├── index.tsx               # refactored: Start-session button no longer eager-creates
├── history.tsx             # extended: duration + mood row content
data/
├── types.ts                 # + ActiveSessionPointer interface (for denylist source-scan coverage)
├── repositories/
│   ├── sessions.ts          # unchanged CRUD contract, used as-is
│   └── activeSession.ts     # NEW: single-key pointer repo (start/heartbeat/read/clear)
src/features/co-pilot/        # NEW (Claude's discretion on exact folder name)
├── useElapsedSession.ts      # elapsed/dozing/countdown derivation + AppState pause/resume
├── useElapsedSession.test.ts
├── reconcileActiveSession.ts # pure function: (pointer, now, thresholdMs) -> action
└── reconcileActiveSession.test.ts
```

### Pattern 1: Setup screen creates nothing until a path is chosen

**What:** The three PILOT-01 entry paths (one-liner, "just work", dump-item pick) are pure local UI state on the setup screen until the user actually commits to starting. Only then does `sessionsRepo.create()` run, immediately followed by `activeSessionRepo.start()`.

**When to use:** Any of the three entry affordances, plus the optional length-intent chip row (D-03) — the chosen intent (e.g., `25`) is passed as a route param or component-local state into the `active` phase for display purposes only; it is never written to `data/types.ts`'s `Session` interface.

**Example:**
```typescript
// src/app/co-pilot.tsx — abbreviated
const [flowPhase, setFlowPhase] = useState<'setup' | 'active' | 'ending'>(() =>
  activeSessionRepo.read() ? 'active' : 'setup'
);
const [lengthIntentMin, setLengthIntentMin] = useState<number | null>(25); // 25 pre-highlighted, D-03

function startFromOneLiner(text: string) {
  const session = sessionsRepo.create({ source: 'quick', taskLabel: text });
  activeSessionRepo.start(session);
  setFlowPhase('active');
}

function startFromDumpItem(item: DumpItem) {
  const session = sessionsRepo.create({
    source: 'dump',
    taskLabel: item.text,
  });
  dumpItemsRepo.update(item.id, { promotedTaskId: session.id });
  activeSessionRepo.start(session);
  setFlowPhase('active');
}

function startOpen() {
  const session = sessionsRepo.create({ source: 'open' });
  activeSessionRepo.start(session);
  setFlowPhase('active');
}
```

### Pattern 2: Elapsed time and dozing as pure timestamp derivation

**What:** A single hook computes everything the session screen needs to display from `startedAt` + `Date.now()`, re-rendering on a tick that is *itself* paused while the app is backgrounded (there's nothing to render when the screen isn't visible, and JS timers are unreliable in the background anyway — see Pitfall 2).

**When to use:** Every render of the `active` phase.

**Example:**
```typescript
// src/features/co-pilot/useElapsedSession.ts
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

const TICK_MS = 1000;
const DOZE_AFTER_MS = 30 * 60 * 1000;
const WAKE_GRACE_MS = 60 * 1000; // Claude's discretion: how long a touch keeps presence awake
const HEARTBEAT_INTERVAL_MS = 45 * 1000; // Claude's discretion within 30-60s band

export function useElapsedSession(startedAt: number, onHeartbeat: (lastAliveAt: number) => void) {
  const [now, setNow] = useState(() => Date.now());
  const lastTouchAtRef = useRef(startedAt);
  const lastHeartbeatAtRef = useRef(0);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (current - lastHeartbeatAtRef.current >= HEARTBEAT_INTERVAL_MS) {
        lastHeartbeatAtRef.current = current;
        onHeartbeat(current);
      }
    };

    const startTicking = () => {
      tick(); // immediate recompute on (re)start — never trust a stale value
      intervalId = setInterval(tick, TICK_MS);
    };
    const stopTicking = () => {
      if (intervalId) clearInterval(intervalId);
    };

    if (AppState.currentState === 'active') startTicking();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        startTicking();
      } else {
        stopTicking();
        // Tighter heartbeat bound right before backgrounding (D-09) — don't
        // wait for the next 30-60s tick, which may never come if the OS
        // kills the process while backgrounded.
        onHeartbeat(Date.now());
      }
    });

    return () => {
      stopTicking();
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onHeartbeat intentionally not a dep; startedAt is stable for the hook's lifetime
  }, []);

  const elapsedMs = now - startedAt;
  const isDozing = elapsedMs >= DOZE_AFTER_MS && now - lastTouchAtRef.current >= WAKE_GRACE_MS;

  return {
    elapsedMs,
    isDozing,
    wake: () => {
      lastTouchAtRef.current = Date.now();
    },
  };
}
```

### Pattern 3: Ending drives navigation via the mascot's own one-shot completion

**What:** `<Mascot state="acknowledge" onStateAnimationComplete={...} />` already fires exactly once when the one-shot animation finishes (Phase 2's contract — see `Mascot.tsx`'s `ONE_SHOT_STATES` timer, sized from the asset's own `op`/`fr` fields). D-13's "one tap (or the acknowledge moment simply concluding) to skip" maps directly onto this existing callback — no separate `setTimeout` needed for the skip-by-waiting path.

**Example:**
```typescript
// src/app/co-pilot.tsx — ending phase, abbreviated
const [moodAnswered, setMoodAnswered] = useState(false);

function finishEnding() {
  activeSessionRepo.clear();
  router.replace('/'); // replace, not push — back navigation from Home must
                        // never return to the now-ended session screen
}

function handleMoodTap(mood: 1 | 2 | 3) {
  sessionsRepo.update(activeSession.id, { mood });
  setMoodAnswered(true);
  finishEnding();
}

// The acknowledge animation concluding IS the skip path if the user hasn't tapped:
<Mascot
  state="acknowledge"
  accessibilityLabel={t('mascot.accessibility.acknowledge')}
  onStateAnimationComplete={() => {
    if (!moodAnswered) finishEnding(); // conclusion = implicit skip, per D-13
  }}
/>
```

### Pattern 4: Cold-launch reconciliation as a pure function + a thin mount hook

**What:** Split the reconciliation decision (pure, trivially unit-testable) from its MMKV side effects (thin wrapper), mirroring `_layout.tsx`'s existing `usePersistResolvedLocale` shape.

**Example:**
```typescript
// src/features/co-pilot/reconcileActiveSession.ts
export type ReconcileAction =
  | { kind: 'none' }
  | { kind: 'keep-live' } // D-11: Home may render the resume card
  | { kind: 'reconcile-stale'; endedAt: number }; // D-12: silent close

export function reconcileActiveSession(
  pointer: ActiveSessionPointer | undefined,
  now: number,
  thresholdMs: number
): ReconcileAction {
  if (!pointer) return { kind: 'none' };
  // Gate on lastAliveAt (last CONFIRMED alive), not startedAt (total duration) —
  // see Open Question 1. A long foregrounded session that force-quit minutes
  // ago must still show the resume card even if startedAt is >12h in the past.
  if (now - pointer.lastAliveAt <= thresholdMs) return { kind: 'keep-live' };
  return { kind: 'reconcile-stale', endedAt: pointer.lastAliveAt };
}
```
```typescript
// src/app/_layout.tsx — new mount hook, same shape as usePersistResolvedLocale
function useReconcileActiveSession(): void {
  useEffect(() => {
    const pointer = activeSessionRepo.read();
    const action = reconcileActiveSession(pointer, Date.now(), STALE_THRESHOLD_MS);
    if (action.kind === 'reconcile-stale') {
      sessionsRepo.update(pointer!.sessionId, { endedAt: action.endedAt });
      activeSessionRepo.clear();
    }
    // 'keep-live' needs no action here — Home reads the pointer itself to
    // decide whether to render the resume card.
  }, []);
}
```

### Anti-Patterns to Avoid

- **Accumulating elapsed time in a counter variable (`elapsed += 1000` on each tick):** Directly forbidden by D-05/D-08 and the project's own "timestamps for all timing" convention. Breaks the moment a background suspension causes even one missed tick — the counter silently drifts behind real elapsed time. Always recompute `Date.now() - startedAt` fresh.
- **Blocking Android hardware back / iOS swipe-back during an active session:** Not requested by any locked decision (D-01..D-15 say nothing about navigation-blocking), and it cuts against the PDA-aware "never traps, never demands" grammar. Since navigating away doesn't end or corrupt the session (data model doesn't care what's on screen), there is nothing to protect by blocking navigation — see Open Question 2 for the resume-on-reentry pattern that makes blocking unnecessary.
- **Adding `expo-keep-awake`:** See Standard Stack's "Explicitly NOT added" — contradicts D-08.
- **Deriving dozing/elapsed from a `setInterval` count of ticks:** Same failure mode as the counter anti-pattern; the interval's only job is "when to re-render," never "how much time has passed."
- **Persisting `lengthIntentMin` onto the `Session` record:** D-03 is explicit that the intent is not a schema commitment. Keep it as route-param/local state only, passed forward into the `active` phase's render, never round-tripped through `sessionsRepo`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Detecting foreground/background transitions | A custom native module or polling loop | `AppState` (RN core) | Already the OS-signal pattern this codebase uses (`useReducedStimulus.ts`); no reason to reinvent for session lifecycle |
| Keeping the screen timer "accurate" across backgrounding | A background-timer native module (e.g. a Nitro-based background timer library, as some blog posts suggest) | Pure `Date.now() - startedAt` derivation | The whole class of "reliable background timer" libraries exists to solve a problem this architecture doesn't have — there is no in-memory state to protect when the source of truth is a timestamp, not a counter |
| Mood emoji selection UI | A picker/rating library | 3 plain `Pressable` buttons with emoji glyphs | Only 3 fixed levels, one-tap, skippable — a full rating-component dependency is disproportionate |
| Countdown-to-elapsed crossfade animation | A new animation library | Reanimated (already installed, already used by `<Mascot />` for its own fade) | Zero marginal dependency cost; keeps one animation mental model in the codebase |

**Key insight:** This phase's entire technical risk surface is timer/lifecycle correctness, not missing tooling — every primitive needed already ships in React Native core or is already installed. The temptation to reach for a specialized background-timer or countdown package should be resisted; it would be solving a problem (state loss across backgrounding) that timestamp-derivation already eliminates by construction.

## Common Pitfalls

### Pitfall 1: Naming the heartbeat field `lastActiveAt` instead of `lastAliveAt`
**What goes wrong:** The schema denylist test (`data/repositories/__tests__/schema.denylist.test.ts`) matches denylist stems as case-insensitive **substrings**, and one of its stems is `lastactive`. The field name D-09 specifies, `lastAliveAt`, does NOT contain that substring (`lastaliveat` vs `lastactive` differ at the 6th character) and passes cleanly. But the far more natural-sounding alternative name `lastActiveAt` (lowercase: `lastactiveat`) DOES contain `lastactive` and will fail the existing test.
**Why it happens:** `lastActiveAt` is the more idiomatic English name for "when was this last active" — an implementer reaching for natural naming without re-checking the denylist stems could easily choose it.
**How to avoid:** Use the exact field name `lastAliveAt` as CONTEXT.md's D-09 specifies, verbatim. Do not rename it during implementation.
**Warning signs:** `npm run verify`'s Jest run fails on the schema denylist test's "runtime probe" or "declared in data/types.ts" assertion with a violation containing `lastactive`.

### Pitfall 2: Relying on `setInterval`/`setTimeout` firing while backgrounded
**What goes wrong:** iOS suspends JS timer callbacks almost immediately on backgrounding (RCTTiming's `_inBackground` flag) [MEDIUM confidence, corroborated by facebook/react-native issue #38711 and multiple independent blog write-ups]; Android's behavior is looser but timers still stop firing reliably after some backgrounded duration. Any logic that depends on a tick actually occurring while backgrounded (e.g., "increment elapsed by 1000ms each tick") will silently under-count.
**Why it happens:** Both OSes throttle/suspend background JS execution to save battery; this is platform-level behavior, not something the app can override without a foreground service (out of scope, and unnecessary given D-08's architecture).
**How to avoid:** Never depend on tick firing count. Stop the interval entirely on backgrounding (`AppState` listener) and, on return to `active`, immediately recompute from `Date.now() - startedAt` — this is exactly what Pattern 2's hook does. The tick's absence during backgrounding is a feature, not a bug, given the timestamp-derivation architecture.
**Warning signs:** Elapsed time display "jumps" correctly on foreground-return (expected, since it's a fresh computation) vs. appearing frozen or wildly wrong (indicates a stale/accumulated value slipped in somewhere).

### Pitfall 3: Gating D-11/D-12 on `startedAt` instead of `lastAliveAt`
**What goes wrong:** A session that has been genuinely live and heartbeating for 15+ hours (an all-nighter with the app foregrounded on and off) would exceed even the upper end of D-11's 8-24h band measured from `startedAt`, causing it to be silently reconciled away (D-12) on the next cold launch — even though it was confirmed alive minutes before the force-quit. This directly contradicts the intent of surfacing "the live session."
**Why it happens:** D-11's decision text says "now − `startedAt`" as informal shorthand; the underlying mechanism (D-09's heartbeat) was designed specifically to answer "was this still alive recently," which only `lastAliveAt` can answer.
**How to avoid:** Gate the threshold check on `now - lastAliveAt`, not `now - startedAt` (see Pattern 4 and Open Question 1). Use `startedAt` only for the resume card's display text ("We were {taskLabel}...").
**Warning signs:** A long but genuinely continuous session (backgrounded/foregrounded repeatedly, heartbeats current) gets silently closed instead of showing the resume card after a force-quit.

### Pitfall 4: Home's existing walking-skeleton eager session creation
**What goes wrong:** `src/app/index.tsx`'s current `handleStartSession` calls `sessionsRepo.create({ source: 'quick' })` unconditionally before navigating — a leftover from the Phase 1 walking-skeleton slice, written before the setup screen (D-01) existed. If left unchanged, every tap of "Start a session?" creates an orphaned, immediately-abandoned `Session` record even when the user never actually starts (e.g., they open the setup screen and back out).
**Why it happens:** It was correct behavior for Phase 1's thin vertical slice and needs a deliberate refactor now that D-01 introduces a real setup step.
**How to avoid:** Remove the eager `sessionsRepo.create()` call from Home; `handleStartSession` should become a plain navigation call, `router.push('/co-pilot')`. If an active session pointer already exists (see Open Question 2), route to resume it rather than to setup.
**Warning signs:** `sessionsRepo.list().length` grows on every setup-screen visit regardless of whether the user actually started a session; the existing test `'creates exactly one session via sessionsRepo when the home offer is pressed'` in `screens.test.tsx` will need rewriting (it currently asserts the now-incorrect behavior).

### Pitfall 5: Writing the heartbeat every render instead of on a throttled cadence
**What goes wrong:** If `onHeartbeat` (or an equivalent MMKV write) is called on every 1-second render tick instead of every 30-60s, this is still cheap in absolute terms (MMKV writes are sub-millisecond, mmap-backed), but it's needless churn and makes the "every ~30-60s" wording of D-09 not actually reflected in the code, which could confuse a future reader auditing write frequency.
**How to avoid:** Throttle the heartbeat write inside the tick handler (see Pattern 2's `lastHeartbeatAtRef` guard) — decouple "how often we re-render" (1s, for a legible mm:ss display) from "how often we persist" (30-60s, per D-09).

## Code Examples

### `activeSession` pointer repository (mirrors existing repo pattern)

```typescript
// data/repositories/activeSession.ts
// Single-key pointer, NOT an indexed collection (only ever 0 or 1 active
// session at a time) — deliberately simpler than sessionsRepo's index-key
// pattern, since there's nothing to list.
import { contentStorage } from '../mmkv';
import type { ActiveSessionPointer } from '../types';

const KEY = 'activeSession:pointer';

export const activeSessionRepo = {
  start(sessionId: string, startedAt: number, taskLabel?: string): void {
    const pointer: ActiveSessionPointer = { sessionId, startedAt, lastAliveAt: startedAt, taskLabel };
    contentStorage.set(KEY, JSON.stringify(pointer));
  },
  heartbeat(lastAliveAt: number): void {
    const existing = activeSessionRepo.read();
    if (!existing) return;
    contentStorage.set(KEY, JSON.stringify({ ...existing, lastAliveAt }));
  },
  read(): ActiveSessionPointer | undefined {
    const raw = contentStorage.getString(KEY);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as ActiveSessionPointer;
    } catch {
      return undefined;
    }
  },
  clear(): void {
    contentStorage.remove(KEY);
  },
};
```

```typescript
// data/types.ts — addition (keeps the source-scan half of the denylist test
// automatically covering this new type, since it scans this exact file)
export interface ActiveSessionPointer {
  sessionId: string;
  startedAt: number; // epoch ms — mirrors the linked Session's startedAt
  lastAliveAt: number; // epoch ms — heartbeat; liveness signal, NOT an aggregate
  taskLabel?: string; // denormalized for the D-11 resume card's copy, avoids a second read
}
```

### Jest AppState mocking (exact project precedent — mirrors `useReducedStimulus.test.ts`)

```typescript
// src/features/co-pilot/__tests__/useElapsedSession.test.ts
import { AppState } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';
import { useElapsedSession } from '../useElapsedSession';

describe('useElapsedSession', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('stops re-rendering elapsed time while backgrounded, resumes correct on foreground', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-03T10:00:00.000Z'));
    const startedAt = Date.now();

    let appStateHandler: ((state: string) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((
      _event: string,
      handler: (state: string) => void
    ) => {
      appStateHandler = handler;
      return { remove: jest.fn() };
    }) as unknown as typeof AppState.addEventListener);

    const { result } = renderHook(() => useElapsedSession(startedAt, jest.fn()));
    expect(result.current.elapsedMs).toBe(0);

    // Background: advance real "wall clock" time via fake timers, but the
    // hook must not depend on ticks firing during this window.
    act(() => {
      appStateHandler?.('background');
      jest.setSystemTime(new Date('2026-07-03T10:20:00.000Z')); // +20 min
    });

    // Foreground return: elapsed must be correct immediately, not lagging.
    act(() => {
      appStateHandler?.('active');
    });

    expect(result.current.elapsedMs).toBe(20 * 60 * 1000);
  });
});
```

### Reconciliation pure-function tests (no React, no MMKV mock needed)

```typescript
// src/features/co-pilot/__tests__/reconcileActiveSession.test.ts
import { reconcileActiveSession } from '../reconcileActiveSession';

const THRESHOLD_MS = 12 * 60 * 60 * 1000; // 12h, Claude's discretion within 8-24h band

it('keeps a session live when lastAliveAt is recent, even if startedAt is old (Pitfall 3)', () => {
  const now = Date.parse('2026-07-03T12:00:00.000Z');
  const pointer = {
    sessionId: 'x',
    startedAt: now - 20 * 60 * 60 * 1000, // 20h ago
    lastAliveAt: now - 10 * 60 * 1000, // 10 min ago
  };
  expect(reconcileActiveSession(pointer, now, THRESHOLD_MS)).toEqual({ kind: 'keep-live' });
});

it('silently reconciles when lastAliveAt itself is stale', () => {
  const now = Date.parse('2026-07-03T12:00:00.000Z');
  const pointer = {
    sessionId: 'x',
    startedAt: now - 13 * 60 * 60 * 1000,
    lastAliveAt: now - 13 * 60 * 60 * 1000,
  };
  expect(reconcileActiveSession(pointer, now, THRESHOLD_MS)).toEqual({
    kind: 'reconcile-stale',
    endedAt: pointer.lastAliveAt,
  });
});
```

## State of the Art

Not applicable in the usual "library X replaced library Y" sense — this phase uses only long-stable RN core APIs. The one relevant shift worth noting: React Navigation's newer `usePreventRemove` hook (v6.x+, re-exported through Expo Router's internals) is a cleaner alternative to the older `beforeRemove` + `navigation.addListener` boilerplate for blocking navigation — mentioned only because the phase description's research area 4 asked about back-navigation prevention. This research recommends NOT blocking back navigation at all (see Anti-Patterns), so this API is documented but not adopted.

**Deprecated/outdated:** None applicable — no libraries in this phase's scope carry deprecation notices.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|-----------------|
| A1 | A ~45-second heartbeat interval and a ~12h staleness threshold are reasonable midpoints within CONTEXT.md's discretion bands (30-60s, 8-24h) | Code Examples, Pattern 2 & 4 | Low — both are explicitly Claude's Discretion per CONTEXT.md; planner/user can adjust either constant freely with no architectural impact |
| A2 | A 60-second "wake grace window" (how long touching the dozing mascot keeps it in `presence` before it may doze again) is a reasonable default | Pattern 2 | Low — D-07 only specifies "wakes on touch," not a duration; this is Claude's Discretion territory the planner should confirm feels right in practice, not a technical risk |
| A3 | iOS suspends JS timers almost immediately on backgrounding; Android's timer suspension is looser but still eventually stops firing | Common Pitfall 2 | Low-Medium — sourced from a GitHub issue (facebook/react-native#38711) and multiple independent blog posts (WebSearch, not Context7/official-docs-verified this session); the *architectural conclusion* (never depend on tick firing count) holds regardless of the exact platform timing details, so this assumption being imprecise doesn't change the recommendation |
| A4 | Reconciliation should gate on `lastAliveAt`, not `startedAt`, contrary to D-11's literal wording | Summary, Pattern 4, Pitfall 3, Open Question 1 | **Medium** — this revises a locked decision's literal mechanism (though not its intent). If the planner/user actually meant `startedAt` deliberately (e.g., "any session older than 12h should always be closed regardless of recent activity, to keep History tidy"), implementing against `lastAliveAt` would produce different behavior than intended. Flagged explicitly for confirmation before planning locks it in. |

## Open Questions (RESOLVED)

1. **RESOLVED: Should D-11/D-12's staleness threshold be measured from `lastAliveAt` or `startedAt`?** — Resolved in CONTEXT.md's amended D-11 ("gate on `lastAliveAt`, NOT `startedAt`, per RESEARCH.md Open Question 1"), committed 28dcd3e. Plans implement the `lastAliveAt` gate.
   - What we know: D-09 explicitly builds a `lastAliveAt` heartbeat mechanism whose only purpose is to answer "was this session confirmed alive recently." D-11's literal decision text says "now − `startedAt`."
   - What's unclear: Whether D-11's wording was a deliberate technical choice or informal shorthand (most likely the latter, given no other CONTEXT.md text discusses the two fields as distinct).
   - Recommendation: Gate on `lastAliveAt` (see Pattern 4, Pitfall 3) — surface this explicitly to the user during planning/discuss-phase as a one-line confirmation rather than silently overriding the literal wording.

2. **RESOLVED: What happens if the user navigates back to Home while a session is active (not via backgrounding, cold-launch, or the End button)?** — Resolved by CONTEXT.md's new D-16 (navigation not blocked; resume-on-reentry via the active-session pointer), implemented in Plan 03-02 Task 2's `flowPhase` initializer.
   - What we know: D-10 covers OS-level backgrounding-then-return (lands back on the session screen automatically, no code needed — this is just how RN navigation state persists across backgrounding). D-11/D-12 cover cold-launch. Neither covers in-process back-navigation while the app never left foreground.
   - What's unclear: CONTEXT.md's D-01..D-15 are silent on this case entirely — it wasn't discussed.
   - Recommendation: Don't block back navigation (see Anti-Patterns — trapping conflicts with PDA-aware grammar and isn't necessary since the session data is unaffected by what's on screen). Instead, make session-start entry points idempotent: Home's "Start a session?" action should check `activeSessionRepo.read()` first and route straight to the `active` phase (resuming, not duplicating) if a pointer exists. This closes the gap without adding any navigation-blocking complexity. Recommend confirming this approach during planning since it's a new, previously undiscussed behavior.

3. **RESOLVED: Exact copy for the D-11 resume card and D-13 warm-ending line** — Resolved in 03-UI-SPEC.md's Screen Contracts (~25 i18n keys with EN + PL reference copy, approved by gsd-ui-checker); final strings ship via those keys.

## Environment Availability

No new external dependencies this phase (see Standard Stack — zero packages installed). All capabilities used (`AppState`, `Pressable`, `react-native-mmkv`, `<Mascot />`, `expo-router`) are already installed and verified working on real Android hardware as of Phase 1/2's device-boot checkpoints. iOS physical-device verification remains the pre-existing carried blocker (STATE.md) — unaffected by this phase, since it introduces no new native surface to verify.

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `jest-expo@~56.0.5` (Jest `~29.7.0`) |
| Config file | `jest.config.js` (`preset: 'jest-expo'`, `setupFilesAfterEnv: ['./jest.setup.ts']`) |
| Quick run command | `npm test -- --testPathPattern=co-pilot` (or the relevant new test file path) |
| Full suite command | `npm run verify` (eslint + `lint:hex` + `lint:mascot-assets` + `npm test`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|--------------|
| PILOT-01 | Three entry paths each create exactly one `Session` with correct `source` | integration (`renderRouter`) | `npm test -- src/app/__tests__/screens.test.tsx` | ❌ Wave 0 — rewrite existing walking-skeleton assertion, add 2 new cases |
| PILOT-02 | Length intent is ephemeral, never written to `Session`; early end still sets no "abandoned" marker | unit | `npm test -- src/app/co-pilot` (setup-phase logic) | ❌ Wave 0 |
| PILOT-03 | Elapsed derives from `startedAt`, never accumulates; single End button renders | unit + integration | `npm test -- useElapsedSession` | ❌ Wave 0 |
| PILOT-04 | Dozing at 30 min derived from `startedAt`; wakes on touch | unit | `npm test -- useElapsedSession` | ❌ Wave 0 (same file as PILOT-03) |
| PILOT-05 | Acknowledge one-shot fires; mood tap and "conclusion" both navigate Home | integration | `npm test -- src/app/__tests__/screens.test.tsx` (ending phase cases) | ❌ Wave 0 |
| PILOT-06 | AppState pause/resume of tick; reconciliation pure function (live vs. stale) | unit | `npm test -- reconcileActiveSession` and `useElapsedSession` | ❌ Wave 0 |
| PILOT-07 | History renders duration + mood, still no day headers/stats | integration | `npm test -- src/app/__tests__/screens.test.tsx` (history extension) | ❌ Wave 0 (extends existing passing tests) |

### Sampling Rate
- **Per task commit:** targeted `npm test -- <pattern>` for the file(s) touched
- **Per wave merge:** `npm run verify` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `data/repositories/activeSession.ts` + a co-located test file — new pointer repo, no existing coverage
- [ ] `src/features/co-pilot/useElapsedSession.ts` + test — new hook, no existing coverage
- [ ] `src/features/co-pilot/reconcileActiveSession.ts` + test — new pure function, no existing coverage
- [ ] `src/app/__tests__/screens.test.tsx` — the existing `'creates exactly one session via sessionsRepo when the home offer is pressed'` test asserts behavior this phase must change (Pitfall 4); must be rewritten, not just left in place
- [ ] No new test-framework install needed — `jest-expo`, `@testing-library/react-native`, and the existing `__mocks__/react-native-mmkv.ts` fully cover this phase's needs. `AppState` needs no dedicated `__mocks__/` file — `jest.spyOn(AppState, 'addEventListener')` inline (mirroring `useReducedStimulus.test.ts`'s `AccessibilityInfo` pattern) is sufficient, since `AppState` is a plain JS-level RN core export, not a native-binding module requiring an automock.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|--------------------|
| V2 Authentication | No | This phase has no auth surface (local-only, no account per MONEY-04 until Phase 7) |
| V3 Session Management | No (naming collision only) | "Session" here means a body-doubling work session record, not an auth session — no token/cookie handling exists in this phase |
| V4 Access Control | No | Single-user local device; no multi-tenant or role concept exists anywhere in this app |
| V5 Input Validation | Yes | The one-liner task-label text field and mood-tap value need basic clamping: mood must be constrained to the `1\|2\|3` union (never trust a raw tap-handler value without a switch/lookup, mirroring `Mascot.tsx`'s `clampState` pattern for unrecognized `MascotState` values) |
| V6 Cryptography | No | No new sensitive data introduced this phase; MMKV encryption remains correctly deferred to Phase 7 per Phase 1's documented decision (auth tokens are the only sensitive payload anticipated, and none exist yet) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|------------------------|
| Malformed/corrupted `activeSession` pointer JSON in MMKV (e.g. from an interrupted write) crashing the reconciliation sweep at boot | Denial of Service (local) | Wrap `JSON.parse` in try/catch returning `undefined` on failure, exactly matching the existing `readRecord` pattern in `sessions.ts`/`dumpItems.ts` — the pointer repo's `read()` in Code Examples above already does this |
| A rapid double-tap on "End" creating two `endedAt` writes or double-firing the mood-check navigation | Tampering (local, self-inflicted) — really a UX/data-integrity bug, not a security threat, but worth the same defensive posture as WR-04's Home double-press guard | Reuse the `isStartingSessionRef`-style guard pattern already established on Home's `handleStartSession` for the End button and the mood-check tap handlers |

## Sources

### Primary (HIGH confidence)
- `/home/user/Trinket/data/types.ts`, `data/repositories/sessions.ts`, `data/repositories/dumpItems.ts`, `data/repositories/__tests__/schema.denylist.test.ts`, `data/mmkv.ts` — read directly, this session, ground truth for existing schema/repo/denylist patterns
- `/home/user/Trinket/src/components/Mascot/Mascot.tsx`, `types.ts`, `useIdleScheduler.ts`, `useReducedStimulus.ts` (+ its test file) — read directly, this session, ground truth for the locked Mascot contract and the project's own AppState-sibling (`AccessibilityInfo`) mocking precedent
- `/home/user/Trinket/src/app/_layout.tsx`, `index.tsx`, `co-pilot.tsx`, `history.tsx`, `src/app/__tests__/screens.test.tsx` — read directly, this session, ground truth for existing navigation/screen/test patterns and the Pitfall 4 finding
- `package.json` — read directly, this session, confirms exact installed versions (`react-native@0.85.3`, `react-native-mmkv@4.3.2`, `expo-router@56.2.12`, no `expo-keep-awake` present)
- `npm view expo-keep-awake versions --json` — run directly, this session (2026-07-03), confirms `56.0.3` is the current SDK-56-line version, informing the "explicitly not added" recommendation

### Secondary (MEDIUM confidence)
- [React Native AppState docs](https://reactnative.dev/docs/appstate) — WebSearch-surfaced, standard core API reference
- [facebook/react-native#38711 — iOS JS timers don't fire when backgrounded](https://github.com/facebook/react-native/issues/38711) — corroborates Pitfall 2's iOS-suspension claim
- [mrousavy/react-native-mmkv GitHub](https://github.com/mrousavy/react-native-mmkv) — corroborates the mmap-backed, no-explicit-syscall-per-write architecture claim underlying the "heartbeat writes are cheap" recommendation
- [React Navigation — Preventing going back](https://reactnavigation.org/docs/preventing-going-back/) — corroborates the `beforeRemove`/`usePreventRemove` API shape, documented as a rejected alternative

### Tertiary (LOW confidence)
- Various blog posts on RN background-timer behavior (dev.to, Medium) surfaced via WebSearch — used only to corroborate the general, well-established pattern (JS timers unreliable in background → derive from timestamps), not for any specific numeric claim

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new packages, every API verified directly against this repo's own `package.json` and source
- Architecture: HIGH — the core pattern (timestamp derivation, AppState pause/resume, pointer-key persistence) is a direct, low-risk extension of Phase 1/2's already-proven repo/hook/mock conventions
- Pitfalls: MEDIUM-HIGH — Pitfalls 1, 4, 5 are HIGH confidence (directly verified against this repo's actual code/tests); Pitfalls 2-3 are MEDIUM (sound reasoning from locked decisions + one corroborating GitHub issue, but not executed on-device this session)

**Research date:** 2026-07-03
**Valid until:** 2026-08-02 (30 days — stable RN core APIs, no fast-moving dependency surface this phase)
