---
gsd_artifact: plan
quick_id: 260705-vl4
slug: raccoon-placeholder-mascot-lottie-set
created: 2026-07-05
mode: quick
requirements: [MASC-01, MASC-02, MASC-03, MASC-04]
---

# Quick Task: Raccoon placeholder mascot Lottie set

## Goal

Replace the abstract-orb placeholder Lottie assets with an actual raccoon
character so the app's feel can be judged, while keeping every module
contract intact. Marketplace assets were rejected: account-gated downloads,
attribution obligations (IconScout/Icons8), and no coherent 5-state set —
a programmatically generated character is license-clean (ours) and
regenerable.

## Approach

`scripts/generate-mascot-placeholders.mjs` (committed, not in verify chain)
builds one raccoon rig from shared geometry — ears, masked face, eyes with
lids/pupils, muzzle, body, belly, paws, striped tail — and emits the 5 state
files with per-state motion:

- greeting (one-shot): paw wave + ear perk + happy-crescent eyes; rest pose
  at both ends (crossfade-safe)
- idle (loop, op 300): breath-glow (opacity — the Phase 2 seek-jolt lesson:
  no transform channels running outside marker windows); markers preserved
  verbatim — blink 60+14 (lid opacity), glance 140+30 (pupil position,
  boundary-identical), postureShift 230+50 (head tilt, boundary-identical)
- presence (loop): calm breath glow + slow tail sway, seamless loop
- dozing (loop): lids closed, drooped ears, slow breathing, one soft fading z
- acknowledge (one-shot): gentle nod + crescent eyes; rest pose at both ends

Constraints honored: 5 allowed states only, zero negative/directive
expressions (MASC-03), each file ≤300KB (MASC-04 gate), same filenames/slot
names (MASC-01), markers decodable by resolveMarkers (MASC-02).

## Verification

- `npm run verify` green (includes lint:mascot-assets)
- Visual QA in-container: headless Chromium + lottie-web renders key frames
  of each state to PNG; screenshots sent to founder for the real judgment
- Device smoothness check remains founder-side (MASC-04 device half)
