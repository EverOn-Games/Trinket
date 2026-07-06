---
gsd_artifact: summary
quick_id: 260706-ldj
slug: v0-2-gap-closure-landing-entry-points
status: complete
completed: 2026-07-06
requirements: [MECH-01, POLI-01]
verify: "303 tests green; copy gate 440 strings clean"
---
# Summary: v0.2 gap closure

1. **Soft landing §3 entry points complete** — all three setup paths exist:
   - From a task: brain-dump row gains a quiet "Soft landing" link →
     /soft-landing pre-filled with the item's text + sourceTaskId stamped
     on the created landing (cleared after first save so a second landing
     in the same visit isn't mis-attributed).
   - From a session: caption-weight link on the active session screen
     (below End, textSecondary — the quiet session stays quiet) →
     /soft-landing.
   - Standalone (already existed).
2. **Dozing z reads in both themes** — stroke changed cream → deep amber
   (#E8B05C family) in the generator; assets regenerated.
3 new tests (prefill+sourceTaskId, row handoff, active-session route).
