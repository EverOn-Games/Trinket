---
gsd_artifact: summary
quick_id: 260705-war
slug: keep-screen-awake-during-active-co-pilot
status: complete
completed: 2026-07-05
requirements: [PILOT-02]
verify: "34 suites / 270 tests green; all gates clean"
---

# Summary: Keep screen awake during active Co-pilot session

Founder: the OS idle-dims/locks mid-session — the body double vanishes while
the user's hands are on their actual task.

## What shipped

- `ActivePhase` (co-pilot.tsx) holds the screen awake via `expo-keep-awake`
  (tag `co-pilot-session`) exactly while the session screen is mounted AND
  the mascot is awake. The existing dozing mechanic (30 min untouched)
  doubles as the battery valve: mascot dozes → hold releases → OS may sleep
  the screen; a touch wakes both. Ending/unmounting releases the hold.
- Manual lock always works (idle-timeout suppression only); session
  correctness never depends on the screen (timestamp reconciliation), so
  every keep-awake failure is swallowed.
- `expo-keep-awake` was already an `expo` dependency in node_modules and
  autolinked in the existing dev client — declaring it in package.json adds
  NO native change. JS-only; Metro reload, no prebuild.
- Mock + jest.setup registration; 3 tests (hold on active, release on end,
  no hold while dozing) via a dozing-override wrapper around the REAL
  useElapsedSession.

## Device check (founder)

Start a session, leave the phone untouched past its screen-timeout setting:
screen should stay on. After ~30 min untouched (mascot dozes) the screen may
sleep normally. Locking manually mid-session still works, and the session
survives it as before.
