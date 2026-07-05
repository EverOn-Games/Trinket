---
gsd_artifact: summary
quick_id: 260705-wp9
slug: bridge-v0-post-ending-anything-next-offe
status: complete
completed: 2026-07-05
requirements: [MECH-02]
verify: "35 suites / 275 tests green; all gates clean (copy gate covers the new strings)"
---

# Summary: Bridge v0 — post-ending "Anything next?" offer

## Scope decision (founder-ratified 2026-07-05)

MECH-02 (Bridge, roadmapped post-launch) got a v0 pre-beta: the brief names
task transitions as the second hardest ADHD moment and no built mechanic
served it. MECH-01 (Soft landing) remains parked — the source doc never
specced either mechanic, and Soft landing's three plausible readings
(post-session decompression / warm re-entry after absence / end-of-day
wind-down) need founder definition before any build.

## What shipped (`src/app/co-pilot.tsx`)

- flowPhase gains a `bridge` beat AFTER the ending moment resolves (mood tap
  or Skip — both equal): mascot idle, "Anything next?", up to 3 un-promoted
  dump items newest-first, and an equal-weight "Nothing — I'm done for now"
  → Home. Zero candidates → straight Home (no empty offer). Items are
  snapshotted at bridge entry so the list can't shift mid-beat.
- Item tap rides the EXISTING gate-aware `startFromDumpItem` path: session
  created + item marked promoted + `session_started{source:'dump'}` as
  always; at the free-tier limit the tap opens the paywall as an offer and
  the bridge stays intact/re-tappable after "Not now". The
  permanently-latched start guard legitimately re-arms at bridge entry (the
  prior session has fully ended).
- EndingPhase now reports completion via `onFinished` (single-fire semantics
  and session_completed tracking unchanged); the parent owns what follows.
- New allowlist event `bridge_next { startedNext: boolean }` — fired true
  only when a session actually started (gate-blocked taps don't count),
  false on the done exit. Boolean-only; no new string tokens.
- i18n EN+PL (`coPilot.bridge.*`); copy gate green (352 strings).
- 5 tests: skip→bridge, mood→bridge, zero-items→straight-home,
  done→home+event(false), item-tap→second session+promoted mark+event(true).

PDA/shame audit: offer-question heading, full-dignity done exit, nothing
auto-advances (D-13 lesson), no countdown/urgency anywhere.

JS-only — Metro reload, no prebuild.
