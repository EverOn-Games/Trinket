---
gsd_artifact: plan
quick_id: 260706-01x
slug: soft-landing-user-configured-pre-transit
created: 2026-07-06
mode: quick
requirements: [MECH-01]
---

# Quick Task: Soft landing (v0.2 §3)

User-configured pre-transition heads-up: landings repo (activityLabel /
leadMinutes / activityAt / transitionTouch / notification ids — no completion
tracking by design), Starter-plumbing reuse (computeFireDate DST math,
contextual permission, day+slot chips — no native picker), /soft-landing
screen + Home link, informational-only EN/PL notification copy (title = the
user's own words), opt-in second touch at the moment itself, quiet expiry
sweep (deletion, not tracking), reminders-off Settings sweep extended,
`landing_scheduled {leadMinutes, transitionTouch}` event, denylist probe
extended, 13 new tests.
