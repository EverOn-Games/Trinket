---
gsd_artifact: summary
quick_id: 260706-01x
slug: soft-landing-user-configured-pre-transit
status: complete
completed: 2026-07-06
requirements: [MECH-01]
verify: "37 suites / 288 tests green; copy gate 428 strings clean"
---

# Summary: Soft landing (MECH-01, v0.2 §3)

All 5 of 5 original mechanics now exist. Shipped per spec:

- `data/repositories/landings.ts` + `Landing` type: activityLabel (user's
  words), sourceTaskId? (future), leadMinutes, activityAt, transitionTouch,
  notification ids. NO completion tracking anywhere — whether a landing was
  acted on is never recorded (§3's own rule); expired landings are lazily
  DELETED on screen mount (cleanup, not recording).
- `landingNotifications.ts`: pure clock-injected computeLandingFireTimes
  (past runway → heads-up silently skipped, never an error); schedule/cancel
  reusing the Starter posture; own Android channel 'soft-landings'.
- `/soft-landing` screen + Home link ("Soft landing"/"Lądowanie"): label
  input, Starter-style day+slot chips (no native picker; DST-safe
  computeFireDate reuse), runway chips 5/10/15/30 ("suggestions, freely
  set"), OPT-IN transition touch, contextual permission at save (denial →
  quiet caption, typed label kept, nothing saved), upcoming list with
  remove (cancels touches).
- Notification copy is informational only, title = the user's own activity
  label, body EN/PL with correct plurals ("In {{count}} minutes — the switch
  you planned." / "Za {{count}} minuty — zaplanowana zmiana."). No
  imperative, no "time to", no ignored-landing state.
- Settings reminders-off sweep extended: landing touches withdrawn, landings
  kept (nothing lost, nothing commented).
- `landing_scheduled {leadMinutes, transitionTouch}` allowlist event
  (structural only). Denylist runtime probe now covers the landings schema.

13 new tests (pure fire-times, scheduling shape, save/deny/empty/remove/
sweep). JS-only — Metro reload, no prebuild.
