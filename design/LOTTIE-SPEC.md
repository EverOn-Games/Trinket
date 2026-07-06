# Trinket — Mascot Animation Specification (Lottie)

**Version 1.0 · 2026-07-06 · commission: raccoon character (founder decision)**
**For:** animators / motion studios preparing the final mascot asset set
**Validate deliveries with:** `node scripts/validate-lottie-delivery.mjs <file.json>` (provided to the studio on request, or run in-repo)

---

## 1. What you're animating, and for whom

Trinket is a companion app for adults with ADHD. The mascot — a small, warm
**raccoon** — is the emotional core of the product: it keeps the user company
while they work ("body doubling"), greets them, rests with them, dozes off,
and acknowledges them warmly when they stop. It is a *companion*, never a
coach, never a judge.

Two product rules are absolute and shape every frame:

1. **The mascot never demands.** No pointing at the user, no beckoning, no
   tapping-foot impatience, no looking-at-watch, no "come on" gestures.
   It is present, not directive. (This is a clinical design constraint for
   the PDA profile within ADHD — treat it as a hard spec, not a style note.)
2. **No negative expression can exist in the asset set.** Nothing that could
   read as disappointed, sad-because-of-you, bored, waiting-for-you, or
   judging — *even as an in-between frame*. If the expression can be
   screenshot and read as "the raccoon is unhappy with me," it cannot ship.
   The safe register: calm, warm, content, sleepy, quietly glad.

The character design reference is the shipped placeholder set
(`assets/mascot/*.json` — programmatic stand-ins that define proportions,
palette, and timing feel) and the brand palette in `design/DESIGN-SYSTEM.md`.
Final character design refines the placeholder; it should stay recognizably
the same creature (round, soft, masked face, striped tail).

## 2. Technical delivery contract (hard requirements)

| Requirement | Value | Why |
|---|---|---|
| Format | Lottie JSON (Bodymovin export from After Effects, or equivalent) | Runtime is `lottie-react-native` 7.x (lottie-ios / lottie-android underneath) |
| One composition per file | yes | Each state is lazily loaded on demand |
| Canvas | 220 × 220 px, square | The app renders at 220 / 140 / **64** px — every state must read clearly at 64 px |
| Frame rate | 30 fps | All timing below assumes 30 fps |
| **File size** | **≤ 300 KB per file — hard CI gate** | Enforced automatically; a 301 KB file fails the build |
| Vector only | no raster/embedded images, no base64 assets | Size, crispness at all scales, theme flexibility |
| No expressions / effects | avoid AE expressions, layer effects, mattes beyond simple alpha | lottie-android/ios feature support is uneven; plain shape + transform + opacity keyframes only |
| Markers | plain-string names in the standard Bodymovin `markers` array | The app resolves segments by marker name at runtime |
| Background | transparent | The app supplies the background (see §5, two themes) |

**File names (exact):**

```
mascot_greeting.json      one-shot
mascot_idle.json          loop, with required markers (§4)
mascot_presence.json      loop
mascot_dozing.json        loop
mascot_acknowledge.json   one-shot (the neutral acknowledge the app plays today)
mascot_acknowledge_good.json    one-shot, mood variant (future wiring)
mascot_acknowledge_okay.json    one-shot, mood variant (future wiring)
mascot_acknowledge_tough.json   one-shot, mood variant (future wiring)
mascot_onboarding.json    one-shot (the "meet the mascot" moment)
```

The three mood variants are separate files on purpose: the app plays
one-shots whole, so variants-as-marker-segments would all play back to
back in the current version. Separate files drop in cleanly when the
mood-keyed playback lands; until then they simply aren't loaded.

## 3. The states

Durations are the shipped defaults — treat as strong suggestions; the app
reads each file's own duration, so ±20% is fine. **Loops must be seamless
(last frame pose == first frame pose). One-shots must START and END on the
neutral rest pose** — the app crossfades between states in ~120 ms, and any
pose mismatch at the boundary reads as a glitch.

### mascot_greeting.json — one-shot, ~90 frames (3 s)
The user just arrived. Warm, glad-you're-here energy: a small wave or ear
perk, happy crescent eyes. Not excited-jumping — a companion who looked up
and smiled. Ends settled back at rest.

### mascot_idle.json — loop, ~300 frames (10 s)
The resting base state on the home screen. A calm creature simply being
there: soft breathing. On top of the base, **three micro-behaviors live in
marker-defined windows** (§4) that the app triggers on randomized intervals.
Critically: **outside those windows the body must hold the exact rest pose**
— see §4 for why.

### mascot_presence.json — loop, ~150 frames (5 s)
Playing while the user works, often for long stretches, usually in their
peripheral vision. "I'm here with you": slow breathing, occasional gentle
tail sway. Calmer than idle — nothing that pulls the eye. This is the state
that must NEVER feel like watching or waiting.

### mascot_dozing.json — loop, ~180 frames (6 s)
After ~30 minutes of the user working, the raccoon dozes off (and the screen
is then allowed to sleep with it). Eyes closed, ears relaxed, deep slow
breathing, optionally one soft drifting "z". Peaceful — the user glancing
over should feel "my companion trusts this moment," never "it gave up on me."

### mascot_acknowledge.json — one-shot, ~66 frames (2.2 s)
The user just ended a session — whether 2 minutes or 3 hours, finished or
not. The SAME warmth regardless: a gentle nod, happy crescent eyes. This is
the single most important shame-free moment in the product.

**Mood variants (three additional files, same duration class):** the user
can tap how the session felt (good / okay / tough) and a future version
plays the matching variant. All three are warm; `_good` is bright, `_okay`
is steady, and `_tough` is the tenderest of the whole set — extra-soft, a
slow blink, leaning in slightly. NEVER mirroring disappointment back: a
tough session earns the gentlest company, not sympathy theater.

### mascot_onboarding.json — one-shot, ~120–150 frames (4–5 s)
The richest piece: the "meet your raccoon" moment on onboarding screen 3, a
first impression played once. The raccoon arrives/wakes/settles into its
spot, notices the user, greets them fully. More personality allowed here —
still inside the emotional register of §1. Ends at the rest pose.

## 4. The marker contract (technical, exact)

The app plays marker-defined segments with `play(startFrame, endFrame)` —
which **seeks instantly, with no interpolation**. Two consequences every
animator must design around:

1. **Boundary-identical poses.** Every marker window must start AND end with
   the character in the exact base rest pose. The app may jump into a
   window from anywhere in the base loop — any transform difference at the
   boundary shows as a visible jolt (this was a real device bug; it's why
   the rule exists).
2. **Transform-quiet outside windows.** In `mascot_idle.json`, continuous
   motion outside marker windows should live in *opacity* (breathing glow)
   or other channels that blend invisibly across seeks — not in scale/
   position/rotation of the body.

**Required markers in `mascot_idle.json`** (names exact, case-sensitive):

| Marker `cm` | Suggested window | Behavior |
|---|---|---|
| `blink` | ~14 frames | Eyes close and open. Opacity-based lids preferred. |
| `glance` | ~30 frames | Pupils drift aside and home — curiosity, never scanning-for-you. |
| `postureShift` | ~50 frames | A soft settle/lean and return. |

## 5. Two themes, three sizes, reduce-motion

- **Both backgrounds:** the app has a dark theme (espresso `#1A140E`) and a
  light theme (cream `#F2E6CC`). Every state must read on BOTH. Deliverables
  are reviewed on both backgrounds; watch cream-on-cream details (a
  cream-colored "z" was invisible on light — real example).
- **Three render sizes:** 220 px (home), 140 px (secondary screens), 64 px
  (compact). Details that vanish at 64 px are fine; details that turn to
  noise at 64 px are not.
- **Reduce-motion:** the app respects the OS reduce-motion setting by
  suppressing micro-behavior triggers and slowing crossfades — no separate
  assets needed, but the base loops should already be gentle enough that a
  motion-sensitive user could live with them.

## 6. Static surface art (part of this commission)

The mascot also appears on out-of-app surfaces that cannot play Lottie:

| Deliverable | Format | Notes |
|---|---|---|
| Resting pose master | layered vector source (AI/Figma/SVG) | The §3 idle rest pose, exportable |
| Widget pose | PNG on transparent, 512 px + @2x/@3x | Used by iOS/Android home-screen widgets; must read on espresso AND cream |
| Android widget preview | PNG 220×220 on espresso `#1A140E`, rounded 24 px | Shown in the widget picker |
| Compact glyph | monochrome-capable vector, legible at 20 px | Dynamic Island / Lock Screen compact slots — a simplified head or paw mark |

## 7. Acceptance checklist (every file, every revision)

- [ ] `node scripts/validate-lottie-delivery.mjs <file>` passes (size,
      canvas, fps, markers, vector-only)
- [ ] Loops seamless; one-shots rest-pose at both ends
- [ ] Idle: marker windows boundary-identical; body transform-quiet outside windows
- [ ] Reads at 64 px; reads on espresso AND cream
- [ ] Emotional register: nothing that could screenshot as negative/
      directive (§1) — reviewed frame by frame, including in-betweens
- [ ] Device check on a low/mid-tier Android phone: no stutter (we run this;
      expect one revision round from it)

## 8. Source files and process

- Deliver the Lottie JSON **and** the AE project (or equivalent source).
- Iteration happens per-file — the app hot-swaps a single state cleanly.
- The shipped placeholders in `assets/mascot/` are the working reference for
  timing, slot names, and the marker mechanics — replacing them one-for-one
  with these deliverables is the whole integration.
