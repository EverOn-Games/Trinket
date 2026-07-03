# Phase 3: Co-pilot End-to-End - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-03
**Phase:** 3-Co-pilot End-to-End
**Areas discussed:** Session start flow, In-session controls & timer, Interruption & reconciliation, Ending & history log

> **Session note:** AskUserQuestion was unavailable in this remote session (permission stream closed on the gray-area selection prompt; user instructed to continue). Following the Phase 1 precedent, all four identified gray areas were auto-selected and resolved by Claude with recommended defaults. Every selection below is marked accordingly and can be overridden by editing 03-CONTEXT.md before `/gsd:plan-phase 3`.

---

## Session start flow

| Option | Description | Selected |
|--------|-------------|----------|
| Single setup screen | One screen off Home's primary action; one-liner field, "Just work", and dump-item picker with equal weight; length-intent chips on the same screen | ✓ (Claude default) |
| Bottom sheet from Home | Lighter-weight sheet; risks cramping three equal paths + length intent | |
| Multi-step wizard | Path choice → task → length; adds friction to the moment the whole product exists to de-friction | |

**Choice rationale:** A single screen keeps "three equal paths, no friction ranking" (PILOT-01) literal — all paths visible at once — and gives the 25-min suggestion a natural home. The empty dump-item section simply not rendering pre-Phase 4 avoids dead UI without hiding the structural path.

---

## In-session controls & timer

| Option | Description | Selected |
|--------|-------------|----------|
| Requirements win: single End button | Exclude mockup's "Take a break", ambient sound, "23 others, quietly"; mockup is layout/tone reference only | ✓ (Claude default) |
| Ship the mockup as drawn | Two buttons + sound + co-presence count; violates PILOT-03 (single End button) and social out-of-scope | |
| Hybrid (End + break) | Pause has no meaning in the timestamp data model without a product decision | |

**Choice rationale:** PILOT-03 explicitly specifies a single End button; social features are explicitly out of scope. Countdown-at-zero behavior chosen as "gently crossfade back to elapsed, nothing else" — any alarm/color/mascot reaction at intent-elapse would be the app issuing a demand (PDA grammar) or a completion judgment (shame-free).

---

## Interruption & reconciliation

| Option | Description | Selected |
|--------|-------------|----------|
| Threshold resume + silent sweep | Backgrounded = return in place; cold launch with live session ≤ ~12h = warm Home resume card (mockup pattern); staler = silently closed at lastAliveAt heartbeat | ✓ (Claude default) |
| Always silently close on force-quit | Literal reading of dev-synthesis edge case; breaks the core phone-down-while-working usage (OS kill ≠ user intent to end) | |
| Always resume indefinitely | A 3-day-old "live" session inflates the log absurdly and lies about elapsed time | |

**Choice rationale:** The phone being locked/killed mid-session is the NORMAL body-doubling case, so death of the process cannot end the session. PILOT-06's "zero mention" was interpreted as forbidding *interruption* language, not *continuity* — which reconciles the requirement with the Home mockup's "Resume / Not now" card. `lastAliveAt` heartbeat gives an honest endedAt for orphans.

---

## Ending & history log

| Option | Description | Selected |
|--------|-------------|----------|
| Inline ending moment + flat quiet log | Acknowledge animation + warm line + 3-emoji skippable mood check on the session screen, land on Home; history = flat reverse-chron list, no day headers, modest per-session duration | ✓ (Claude default) |
| Separate end/summary screen | Even a minimal summary screen drifts toward the forbidden stats-dashboard pattern | |
| History with day grouping | Day headers are daily boundaries — explicitly forbidden by PILOT-07/success criterion 5 | |

**Choice rationale:** The warm acknowledgment is an emotional beat, not a report — no numbers on it (D-14). Duration appears only as a quiet per-session fact in the log (a fact, not an aggregate). Mood emoji reflected back quietly if given.

---

## Claude's Discretion

- Session-flow state shape (store vs. hook), navigation wiring, active-session pointer + heartbeat placement in MMKV
- Exact staleness threshold (8–24h band) and heartbeat interval (30–60s)
- Elapsed-time render mechanics and AppState handling (timestamps remain source of truth)
- Countdown-toggle affordance, mood emoji glyphs, skip affordance details
- Test strategy per Phase 1/2 mock + TDD precedents

## Deferred Ideas

- "Take a break" / pause mechanic (mockup) — post-MVP, needs a product decision on pause semantics
- Ambient soundscapes ("Rain & lamplight", mockup) — new capability, possible premium content
- "23 others, quietly" co-presence count (mockup) — REJECTED: social out of scope
- Mid-session task-label editing (mockup "change" affordance) — read-only at MVP
- iOS physical-device verification — carried blocker, hard gate before Phase 9 (no new native inputs this phase)
