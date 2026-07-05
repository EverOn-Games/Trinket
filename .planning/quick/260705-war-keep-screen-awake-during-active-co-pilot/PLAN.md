---
gsd_artifact: plan
quick_id: 260705-war
slug: keep-screen-awake-during-active-co-pilot
created: 2026-07-05
mode: quick
requirements: [PILOT-02]
---

# Quick Task: Keep screen awake during active Co-pilot session

## Trigger

Founder: the OS idle-dims and locks mid-session while the user's hands are on
their actual task — the mascot's presence (the product) vanishes.

## Design

Hold the screen awake ONLY while (a) the active session screen is mounted AND
(b) the mascot is awake. The existing dozing mechanic (30 min untouched →
`isDozing`) doubles as the battery valve: when the companion dozes, the hold
releases and the OS may sleep the screen — the phone rests with the raccoon.
Touching the session screen wakes both (existing `wake()`). Manual lock always
works (keep-awake only suppresses the idle timeout), and session correctness
never depended on the screen (timestamp reconciliation).

`expo-keep-awake` is already an `expo` package dependency present in
node_modules and autolinked into the existing dev client — declaring it
explicitly in package.json adds NO native change; JS-only, no prebuild.

## Tasks

1. Declare `expo-keep-awake` in package.json (expo install).
2. `ActivePhase` (co-pilot.tsx): effect keyed on `isDozing` —
   `activateKeepAwakeAsync(tag)` while awake, `deactivateKeepAwake(tag)` on
   dozing/unmount; both failure-swallowed (a keep-awake error must never
   touch the session).
3. `__mocks__/expo-keep-awake.ts` + jest.setup registration.
4. Tests: active session mount → activated; dozing → deactivated (mock
   useElapsedSession); unmount/end → deactivated.
5. `npm run verify` green; SUMMARY + STATE row; commit + push.
