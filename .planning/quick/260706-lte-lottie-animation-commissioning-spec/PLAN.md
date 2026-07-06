---
gsd_artifact: plan
quick_id: 260706-lte
slug: lottie-animation-commissioning-spec
created: 2026-07-06
mode: quick
requirements: [MASC-01, MASC-02, MASC-03, MASC-04]
---
# Quick Task: Lottie commissioning spec + delivery validator
Founder decisions (asked): raccoon-only commission (settles v0.2 §0's
form-under-test from the commissioning side), scope = core 5 + static
surface art + onboarding moment + mood-check acknowledge variants, EN-only
doc. Deliverables: design/LOTTIE-SPEC.md (emotional register hard rules,
technical contract, per-file specs, marker contract with the seek-jolt
physics explained, both-theme/three-size/reduce-motion, static art table,
acceptance checklist) + scripts/validate-lottie-delivery.mjs (size gate,
vector-only, marker presence, canvas/fps warns) self-tested green against
the shipped placeholders. Mood variants as separate files (not markers) —
marker segments would all play back-to-back in v1's whole-file playback.
