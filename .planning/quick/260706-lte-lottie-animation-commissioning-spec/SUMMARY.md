---
gsd_artifact: summary
quick_id: 260706-lte
slug: lottie-animation-commissioning-spec
status: complete
completed: 2026-07-06
requirements: [MASC-01, MASC-02, MASC-03, MASC-04]
verify: "307 tests green; validator passes all 5 shipped placeholders"
---
# Summary: Lottie commissioning spec + delivery validator

- design/LOTTIE-SPEC.md — the animator-facing contract: §1 emotional
  register as HARD spec (never demands, no negative expression even as an
  in-between frame); §2 technical delivery table (Bodymovin, 220px canvas
  reads-at-64px, 30fps, ≤300KB CI gate, vector-only, no expressions, exact
  filenames incl. three acknowledge mood-variant FILES + onboarding
  moment); §3 per-state briefs with durations and loop/one-shot boundary
  rules; §4 the marker contract with the seek-jolt physics explained
  (boundary-identical, transform-quiet — the Phase 2 device lesson written
  for animators); §5 both themes / three sizes / reduce-motion; §6 static
  surface art (widget pose, Android preview, 20px compact glyph); §7
  acceptance checklist; §8 process.
- Mood variants are separate files by design: v1 plays one-shots whole, so
  marker segments would play all variants back-to-back. Files drop in when
  mood-keyed playback lands; unloaded until then.
- scripts/validate-lottie-delivery.mjs — run against any delivery: fails on
  size/JSON/raster-assets/missing idle markers, warns on canvas/fps/
  suspected AE expressions. Self-tested green against the placeholders.
- FOUNDER DECISION recorded: raccoon-only commission — settles the v0.2 §0
  circle-vs-character question from the art-buying side.
