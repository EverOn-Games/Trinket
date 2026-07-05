---
gsd_artifact: plan
quick_id: 260705-wp9
slug: bridge-v0-post-ending-anything-next-offe
created: 2026-07-05
mode: quick
requirements: [MECH-02]
---

# Quick Task: Bridge v0 — post-ending "Anything next?" offer

## Scope decision (founder-ratified)

MECH-02 (Bridge, originally post-launch) gets a v0 pre-beta: the brief names
transitions as the second hardest ADHD moment and no built mechanic served
it. v0 deliberately reuses existing primitives — no new schema, no new
screens, no new nav routes. Soft landing (MECH-01) stays parked pending
founder definition (source doc never specced either mechanic).

## Design

After the warm ending resolves (mood tap or Skip — both equal), IF
un-promoted brain-dump items exist, the co-pilot screen shows one more quiet
beat instead of navigating Home: mascot idle, "Anything next?", up to 3
un-promoted items (newest first), and an equally-weighted "Nothing — I'm done
for now" → Home. Item tap rides the EXISTING startFromDumpItem path (gate
respected: at-limit tap opens the paywall as an offer; returning leaves the
bridge intact and re-tappable). Zero un-promoted items → straight Home, no
empty offer. Nothing auto-advances (D-13 lesson); the ending moment itself is
untouched — the bridge is a separate beat after it.

PDA/shame audit: heading is a question-offer; "done" exit is equal-weight and
warm; no urgency, no countdown, no "you should".

## Tasks

1. co-pilot.tsx: flowPhase += 'bridge'; EndingPhase gains onFinished (track
   stays inside it); parent decides bridge-vs-home, resets
   isStartingSessionRef on bridge entry (prior session fully ended);
   BridgePhase component (mascot idle + heading + ≤3 items + done).
2. events.ts: `bridge_next: { startedNext: boolean }` (boolean-only, no new
   string tokens) — measures whether the mechanic actually bridges.
3. i18n en+pl (coPilot.bridge.*); copy gate green.
4. Tests (bridge.test.tsx): mood→bridge, skip→bridge, zero-items→straight
   home, done→home+event(false), item tap→new session+promoted mark+
   event(true).
5. `npm run verify` green; SUMMARY + STATE row + decision log; commit+push.
