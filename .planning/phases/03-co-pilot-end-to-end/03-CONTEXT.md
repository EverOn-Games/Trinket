# Phase 3: Co-pilot End-to-End - Context

**Gathered:** 2026-07-03
**Status:** Ready for planning

<domain>
## Phase Boundary

A user who has been avoiding a task can start an async body-doubling session in the mascot's presence and always receive a warm ending, regardless of duration, interruption, or completion (PILOT-01..07). This phase delivers: the session start flow (three equal entry paths: Brain-dump item, typed one-liner, open "just work"), an optional freely-adjustable length intent (25-min default suggestion), the session screen (mascot in presence state, subtle elapsed time, single End button, dozing after ~30 min), the warm-acknowledgment ending with skippable 3-level mood check, timestamp-based interruption survival (backgrounding, force-quit, OS kill) with silent reconciliation, and session history as a plain chronological quiet log.

NOT in this phase: Brain dump capture UI (Phase 4 — but the dump-item picker path must exist structurally against the already-built `dumpItemsRepo`), freemium session gating (Phase 7), settings UI (Phase 8), pause/break mechanics, ambient soundscapes, or any co-presence/social display.

</domain>

<decisions>
## Implementation Decisions

> Interactive discussion was unavailable in this remote session (AskUserQuestion permission stream closed; user instructed to continue). All four identified gray areas were resolved by Claude with recommended defaults, following the Phase 1 precedent. Any decision below can be overridden before `/gsd:plan-phase 3` by editing this file.

### Session start flow
- **D-01:** One setup screen (the existing `src/app/co-pilot.tsx` route becomes the session flow), reached from Home's primary "Start a session?" action. All three entry paths live on this single screen with equal visual weight, no friction ranking (PILOT-01): a one-liner text field, a "Just work" open-session option, and a pick-from-Brain-dump section.
- **D-02:** The Brain-dump picker reads from the existing Phase 1 `dumpItemsRepo`. Before Phase 4 ships capture UI, the repo will typically be empty — when empty, the dump-item section simply does not render (no dead UI, no empty-state nudge, no "add tasks first" copy). When Phase 4 lands, items appear here with zero Phase 3 rework. Starting from a dump item sets `source: 'dump'` and writes `promotedTaskId` linkage per the existing schema.
- **D-03:** Length intent is an optional row on the same setup screen: preset chips (e.g., 15 / 25 / 45 / 90 min) with 25 pre-highlighted as the default *suggestion*, plus a clearly equal "no timer" choice. Freely adjustable; grammar is an offer, never a requirement. The intent is NOT persisted as a schema field commitment — it only parameterizes the in-session display (see D-06). Ending before the intent elapses is a completed session, never an abandoned one (PILOT-02).

### In-session controls & timer
- **D-04:** Requirements beat mockup. The session screen ships with a SINGLE End button (PILOT-03). The mockup's "Take a break" button, "Rain & lamplight" ambient sound, and "23 others, quietly" co-presence count are all excluded: break/pause → deferred idea; ambient sound → deferred idea; co-presence count → rejected outright (social features are explicitly out of scope in PROJECT.md). The mockup remains the visual/layout/tone reference (dark habitat, task label with "change" affordance, subtle timer placement) — not the component inventory.
- **D-05:** Elapsed time displays as a subtle count-up (mockup's muted `42:17` treatment), derived from `startedAt` timestamps on every render tick — never an in-memory accumulating counter.
- **D-06:** Opted-in countdown semantics: if (and only if) the user set a length intent, they may view remaining time instead of elapsed — this is the "unless the user chose one" carve-out in PILOT-03. When a countdown reaches zero: no sound, no vibration, no color change, no mascot reaction, no auto-end. The display gently crossfades back to elapsed count-up and the session simply continues. The mascot does nothing at intent-elapse (MASC-03: mascot only reacts to user actions).
- **D-07:** Dozing (PILOT-04): mascot may enter `dozing` after ~30 minutes of session time, derived from `startedAt` (not a timer counter). Wakes (back to `presence`) on mascot touch or on session end. This is charm, not a signal — no copy accompanies it.

### Interruption & reconciliation
- **D-08:** Core mental model: a session represents real-world work done near the phone — the phone being locked, backgrounded, or even OS-killed mid-session is the NORMAL case, not an error. Elapsed time is always derived from persisted timestamps, so no interruption can lose time.
- **D-09:** While the session screen is foregrounded, persist a `lastAliveAt` heartbeat (every ~30-60s) alongside the active-session pointer in MMKV. This is a liveness timestamp, not an aggregate — it must pass the schema denylist test. Whether it lives on the Session record or a separate `activeSession` key is planner's discretion.
- **D-10:** Backgrounding (process alive): returning to the app lands straight back on the session screen — it is simply where the user was. No card, no mention, elapsed correct from `startedAt`. Sessions survive any backgrounded duration while the process lives.
- **D-11:** Cold launch (force-quit / OS kill) with a persisted open session: if the session is still plausibly live (now − `lastAliveAt` ≤ ~12h — exact threshold planner's discretion within 8–24h; gate on `lastAliveAt`, NOT `startedAt`, per RESEARCH.md Open Question 1 — since `lastAliveAt ≥ startedAt`, this correctly resumes both the phone-down 3-hour work session and a long live session touched minutes ago, which a `startedAt` gate would wrongly close), Home renders a warm resume card in the mockup's pattern ("We were {taskLabel}. Pick it up?" → Resume / Not now). This surfaces the *live session*, never the *interruption* — no "your session was interrupted", no "you left", no guilt framing; PILOT-06's "zero mention" forbids interruption language, not continuity. "Resume" returns to the session screen with elapsed derived from `startedAt`. "Not now" silently ends the session (endedAt = `lastAliveAt`) with no further comment.
- **D-12:** Cold launch with a stale open session (older than the D-11 threshold): silent reconciliation sweep at launch — the orphaned session is closed with `endedAt = lastAliveAt` (best-effort honest bound), no card, no mention anywhere, and it appears in the quiet log as an ordinary completed session. Ending early/orphaned is completed, never abandoned.
- **D-16:** In-app navigation away from an active session (e.g., Android back to Home) is NOT blocked — trapping the user on the session screen would violate the PDA grammar. Instead the session-start entry point is idempotent: while a session is live, Home's Co-pilot action re-enters the active session (resume-on-reentry via the active-session pointer) rather than starting a new one. Per RESEARCH.md Open Question 2.

### Ending & history log
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product spec (primary)
- `.planning/source/trinket-dev-synthesis-v0.1.md` §4.1 — Co-pilot mechanic spec: user story, 7-step flow, edge cases (backgrounding, midnight crossing, force-quit). §2 hard constraints, §5.2 mascot behavioral rules.
- `.planning/REQUIREMENTS.md` — PILOT-01..07 (lines 27-33), the acceptance contract for this phase.
- `.planning/ROADMAP.md` — Phase 3 section: goal, Mode: mvp, 5 success criteria, UI hint: yes.

### Mascot contract (locked by Phase 2)
- `src/components/Mascot/types.ts` — LOCKED public API: `MascotState` (`presence`/`dozing`/`acknowledge` are this phase's states), `MascotProps`, `onStateAnimationComplete` for the acknowledge one-shot.
- `.planning/phases/02-mascot-module/02-UI-SPEC.md` — state→trigger mapping, transition contract (single persistent LottieView, 120ms fade), reduced-stimulus contract.
- `.planning/phases/02-mascot-module/02-CONTEXT.md` — D-07 greeting cadence precedent (in-memory flag, never persisted timestamps that smell like daily aggregates).

### Design system & mockups (visual reference — component set overridden by D-04)
- `design/DESIGN-SYSTEM.md` — palette, dual-accent rule (terracotta = action, amber = mascot-only), typography.
- `design/mockups/62e728e6-Copilot___session_active.html` — session screen layout/tone reference ONLY; its "Take a break", ambient sound, and "23 others" elements are excluded per D-04.
- `design/mockups/01341ce6-Home.html` — the "Co-pilot paused… Resume / Not now" card is the D-11 resume-card pattern (reword to avoid "paused"; no pause concept exists in the model).

### Data layer (existing, extend don't rebuild)
- `data/types.ts` — `Session` shape already landed: `taskLabel?`, `source: 'dump'|'quick'|'open'`, `startedAt`, `endedAt?`, `mood?: 1|2|3`; elapsed always derived, no duration field.
- `data/repositories/sessions.ts` — `sessionsRepo` CRUD over `contentStorage`, the persistence surface this phase drives.
- `data/repositories/__tests__/schema.denylist.test.ts` — any new field (e.g., `lastAliveAt`) must pass this guard.

### Project constraints
- `CLAUDE.md` — shame-free (hard), PDA offer-grammar (hard), token-only styling + `lint:hex`, i18next-only copy, timestamps-never-counters convention, `npm run verify` bundle.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `<Mascot />` (`src/components/Mascot/Mascot.tsx`) — drives all in-session mascot behavior via props; Phase 3 is its first feature host beyond Home. Idle micro-behaviors are internal to the module.
- `sessionsRepo` + `dumpItemsRepo` — both fully built in Phase 1 with tests; Phase 3 adds no new repositories, only (possibly) an active-session pointer key and heartbeat field.
- `Screen` component + `useTheme()` tokens + i18n `t()` pipeline — established screen shell pattern (see `src/app/co-pilot.tsx` stub, which this phase replaces).
- `lib/id.ts` `newId()` — ID generation used by repos.
- `__mocks__/` precedents (react-native-mmkv, expo-localization, lottie-react-native, reanimated/worklets) — pattern for any new native/timer mocking under Jest.

### Established Patterns
- Timestamps for all timing, `Date.now()` epoch millis — D-05/D-08 are direct applications; no `setInterval`-accumulated counters may ever be the source of truth.
- Schema denylist test structurally forbids streak/daily-aggregate/diagnosis fields — constrains D-09's heartbeat placement and D-15's log rendering (no aggregates computed into storage).
- Token-only styling (`lint:hex` fail-closed), `i18next/no-literal-string` ESLint, offers-never-instructs copy grammar in both PL and EN.
- TDD RED→GREEN commit pairing (Phase 1 01-04/01-05, Phase 2 02-03/02-04 precedents) for logic-heavy work — session reconciliation is exactly such work.
- `npm run verify` = eslint + hex gate + jest; no native inputs change this phase (no prebuild note expected — pure TS/screen work).

### Integration Points
- Home (`src/app/index.tsx`) — "Start a session?" primary action routes to the setup flow; D-11's resume card renders here on cold launch with a live session.
- `src/app/co-pilot.tsx` — existing themed/localized stub to be replaced by the real setup + session flow (single route with internal steps vs. nested routes is planner's discretion).
- `src/app/history.tsx` — existing stub becomes the quiet log (D-15).
- `src/app/_layout.tsx` — launch-time reconciliation sweep (D-12) needs a mount point at app start; keep it silent and synchronous-cheap (MMKV reads are sync).
- Phase 4 will feed the dump-item picker (D-02); Phase 7 will gate session starts (free tier: 3/week) — leave the start action behind a single call site so the gate has one place to wrap.

</code_context>

<specifics>
## Specific Ideas

- Session screen tone from the mockup: "SESSION · QUIET" atmosphere — dark habitat, mascot central, timer muted, task label present with a low-key "change" affordance. The screen should feel like sitting next to someone working at night, not like a productivity timer app.
- Warm ending copy direction: acknowledgment that the session *happened*, never evaluation of what was achieved — "ending early is a completed session" is copy law, not just data law.
- Resume card grammar (D-11): present-tense continuity ("We were {task}. Pick it up?"), Resume / Not now — an offer with a free exit, never a demand or a reference to absence.

</specifics>

<deferred>
## Deferred Ideas

- **"Take a break" / pause mechanic** (from session mockup) — a pause concept doesn't exist in the MVP data model; would need explicit product decision on what pausing means for elapsed time. Post-MVP candidate.
- **Ambient soundscapes ("Rain & lamplight")** (from session mockup) — a new capability; potential premium-tier content, its own phase if validated.
- **"23 others, quietly" co-presence count** (from session mockup) — REJECTED, not deferred: social/community features are explicitly out of scope in PROJECT.md, and even ambient social presence risks comparison/guilt surface.
- **Task-label "change" mid-session** (mockup affordance) — MVP ships the label read-only during a session; changing the task mid-session is cheap to add later if beta asks for it.
- **iOS physical-device verification** — still deferred (carried blocker; hard gate before Phase 9). Phase 3 is pure TS/screen work with no new native inputs, so it does not force the retry window.

</deferred>

---

*Phase: 03-co-pilot-end-to-end*
*Context gathered: 2026-07-03*
