#!/usr/bin/env node
/**
 * Generates the 5 placeholder mascot Lottie assets (assets/mascot/*.json) as a
 * single programmatic raccoon rig with per-state motion. Run:
 *
 *   node scripts/generate-mascot-placeholders.mjs
 *
 * Why generated, not sourced: marketplace Lottie assets are account-gated,
 * carry attribution obligations, and never ship a coherent 5-state set with
 * this module's marker contract. Generated assets are license-clean (ours),
 * tiny, and regenerable when tuning.
 *
 * Contracts honored (see src/components/Mascot/):
 * - Filenames/slot names: mascot_{greeting,idle,presence,dozing,acknowledge}.json
 * - idle carries markers blink(60,+14) / glance(140,+30) / postureShift(230,+50)
 *   — the exact ranges Plan 02-02 fixed and useIdleScheduler consumes.
 * - Seek-jolt rule (Phase 2 device lesson): while idle, NO transform channel
 *   animates outside a marker window — continuous "breathing" is opacity-only
 *   (belly glow), and every marker-window behavior starts AND ends at the rest
 *   pose, so play(start,end) seeks can never visibly jump.
 * - One-shots (greeting/acknowledge) start and end at the rest pose so the
 *   crossfade to/from idle is seamless.
 * - No negative/directive expression exists in any state (MASC-03).
 * - Each file well under the 300KB gate (MASC-04).
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'assets', 'mascot');

// ---------------------------------------------------------------- palette --
// Warm, earthy — reads softly on the dark theme. Lottie colors are RGB floats.
const FUR = [0.55, 0.47, 0.4];
const FUR_DARK = [0.36, 0.3, 0.26]; // ears, tail stripes, outer tail
const MASK = [0.22, 0.19, 0.17]; // eye mask patches
const CREAM = [0.87, 0.81, 0.71]; // belly, muzzle, inner ears
const EYE_WHITE = [0.96, 0.94, 0.88];
const PUPIL = [0.13, 0.11, 0.1];
const NOSE = [0.16, 0.13, 0.12];
const GLOW = [0.95, 0.87, 0.72]; // breath glow
const AMBER_DEEP = [0.91, 0.69, 0.36]; // dozing z — must read on BOTH themes (light-mode QA 2026-07-06)

// ------------------------------------------------------------- primitives --
const st = (v) => ({ a: 0, k: v }); // static property

/** Animated property from [frame, value] pairs with easeInOut. */
function anim(pairs, { multi = true } = {}) {
  const wrap = (v) => (multi && !Array.isArray(v) ? [v] : v);
  // Lottie renders a one-keyframe animated property as NaN transforms
  // (invisible layer) — collapse to static.
  if (pairs.length === 1) return st(pairs[0][1]);
  return {
    a: 1,
    k: pairs.map(([t, v], i) => {
      const kf = { t, s: wrap(v) };
      if (i < pairs.length - 1) {
        kf.i = { x: [0.42], y: [1] };
        kf.o = { x: [0.58], y: [0] };
      }
      return kf;
    }),
  };
}

const ellipse = (cx, cy, w, h) => ({ ty: 'el', p: st([cx, cy]), s: st([w, h]) });
const rect = (cx, cy, w, h, r = 0) => ({ ty: 'rc', p: st([cx, cy]), s: st([w, h]), r: st(r) });
const fill = (color, opacity = 100) => ({ ty: 'fl', c: st([...color, 1]), o: st(opacity) });
const strokeShape = (color, width, opacity = 100) => ({
  ty: 'st',
  c: st([...color, 1]),
  o: st(opacity),
  w: st(width),
  lc: 2,
  lj: 2,
});

/**
 * Group with its own transform. `tr` fields may be static values or animated
 * props from anim(). Position/anchor default to identity.
 */
function group(name, items, tr = {}) {
  return {
    ty: 'gr',
    nm: name,
    it: [
      ...items,
      {
        ty: 'tr',
        p: tr.p ?? st([0, 0]),
        a: tr.a ?? st([0, 0]),
        s: tr.s ?? st([100, 100]),
        r: tr.r ?? st(0),
        o: tr.o ?? st(100),
      },
    ],
  };
}

/** Open cubic path through absolute vertices with given in/out tangents. */
const openPath = (v, i, o) => ({ ty: 'sh', ks: st({ i, o, v, c: false }) });

function shapeLayer(name, ind, shapes, op, tr = {}) {
  return {
    ddd: 0,
    ind,
    ty: 4,
    nm: name,
    sr: 1,
    ks: {
      o: tr.o ?? st(100),
      r: tr.r ?? st(0),
      p: tr.p ?? st([110, 110, 0]),
      a: tr.a ?? st([110, 110, 0]),
      s: tr.s ?? st([100, 100, 100]),
    },
    ao: 0,
    shapes,
    ip: 0,
    op,
    st: 0,
    bm: 0,
  };
}

// -------------------------------------------------------------- rig parts --
// Geometry lives at canvas coordinates; per-state motion is injected through
// the transform options each builder accepts.

/** Striped tail, rooted at the body's lower right, curving up. */
function tail(trOpts = {}) {
  return group(
    'tail',
    [
      // Lottie draws a group's FIRST item on top — foreground first.
      group('stripe1', [ellipse(2, -24, 24, 9), fill(CREAM, 85)]),
      group('stripe2', [ellipse(7, -44, 19, 8), fill(CREAM, 85)]),
      group('tipStripe', [ellipse(11, -60, 13, 8), fill(CREAM, 85)]),
      group('tailBase', [
        // Tapered tail silhouette via three overlapping ellipses.
        ellipse(0, -14, 26, 30),
        ellipse(4, -34, 22, 28),
        ellipse(10, -52, 18, 24),
        fill(FUR_DARK),
      ]),
    ],
    { p: st([156, 168]), a: st([0, 0]), r: trOpts.r ?? st(18) }
  );
}

/** Body with belly, breath glow (opacity-animated), and two front paws. */
function body(glowOpacity) {
  // Foreground-first (Lottie group z-order).
  return group('bodyGroup', [
    group('pawL', [ellipse(90, 188, 20, 14), fill(FUR_DARK)]),
    group('pawR', [ellipse(130, 188, 20, 14), fill(FUR_DARK)]),
    // Breathing lives HERE as opacity only — never a transform (seek-jolt rule).
    group('breathGlow', [ellipse(110, 156, 48, 40), fill(GLOW, 100)], {
      o: glowOpacity,
    }),
    group('belly', [ellipse(110, 160, 60, 52), fill(CREAM)]),
    group('torso', [ellipse(110, 152, 104, 84), fill(FUR)]),
  ]);
}

/**
 * Head: ears (droopable), face, mask patches, muzzle, nose, smile, and eyes
 * (whites + pupils group + lids). Everything expressive routes through here.
 */
function head({
  headR = st(0), // head tilt (deg) — postureShift / nod
  headP = st([0, 0]), // head offset — nod dips
  earScale = st([100, 100]), // greeting perk
  earRot = st(0), // dozing droop
  pupilP = st([0, 0]), // glance drift
  lidO = st(0), // blink/dozing lids (opacity 0..100)
  crescentO = st(0), // happy crescent eyes (greeting/acknowledge)
} = {}) {
  const eye = (side, cx) =>
    group(`eye${side}`, [
      // Foreground-first: crescent > lid > pupil > white.
      // Happy crescent — a warm up-curved arc that fades IN over the eye.
      group(
        'crescent',
        [
          openPath(
            [
              [cx - 5.5, 85],
              [cx, 81.5],
              [cx + 5.5, 85],
            ],
            [
              [0, 0],
              [-2.6, 0],
              [0, 0],
            ],
            [
              [0, 0],
              [2.6, 0],
              [0, 0],
            ]
          ),
          strokeShape(CREAM, 2.6),
        ],
        { o: crescentO }
      ),
      // Lid = mask-colored cover; opacity-only blink per the Phase 2 lesson.
      group('lid', [ellipse(cx, 84, 14.5, 15.5), fill(MASK)], { o: lidO }),
      group('pupil', [ellipse(cx, 85, 7, 7.5), fill(PUPIL)], { p: pupilP }),
      group('white', [ellipse(cx, 84, 13, 14), fill(EYE_WHITE)]),
    ]);

  // earRot is a single droop channel; mirror it per side (L droops outward
  // negative, R positive) for both static and animated forms.
  function mirroredRot(rotProp, sign) {
    if (rotProp.a !== 1) return st(rotProp.k * sign);
    return {
      a: 1,
      k: rotProp.k.map((kf) => ({ ...kf, s: kf.s ? [kf.s[0] * sign] : kf.s })),
    };
  }

  const ear = (side, cx, rotSign) =>
    group(
      `ear${side}`,
      [
        group('outer', [ellipse(0, 0, 26, 30), fill(FUR_DARK)]),
        group('inner', [ellipse(0, 3, 13, 16), fill(CREAM)]),
      ],
      {
        p: st([cx, 52]),
        a: st([0, 8]),
        s: earScale,
        r: mirroredRot(earRot, rotSign),
      }
    );

  return group(
    'headGroup',
    [
      // Foreground-first (Lottie group z-order): features → muzzle → mask →
      // face → ears (ears sit behind the head silhouette).
      eye('L', 92),
      eye('R', 128),
      group('nose', [ellipse(110, 97, 9, 7), fill(NOSE)]),
      group('smile', [
        openPath(
          [
            [104, 108],
            [110, 111],
            [116, 108],
          ],
          [
            [0, 0],
            [-2.8, 0],
            [0, 0],
          ],
          [
            [0, 0],
            [2.8, 0],
            [0, 0],
          ]
        ),
        strokeShape(NOSE, 2),
      ]),
      group('muzzle2', [ellipse(110, 103, 34, 22), fill(CREAM)]),
      // Masks drawn at local origin and positioned via the group transform so
      // the +-8deg rotation pivots on the patch center, not the canvas origin.
      group('maskL', [ellipse(0, 0, 30, 20), fill(MASK)], { p: st([91, 85]), r: st(-8) }),
      group('maskR', [ellipse(0, 0, 30, 20), fill(MASK)], { p: st([129, 85]), r: st(8) }),
      group('face', [ellipse(110, 88, 84, 74), fill(FUR)]),
      ear('L', 82, -1),
      ear('R', 138, 1),
    ],
    {
      // Pivot at the neck: contents are in canvas coords, so anchor there and
      // re-position by the same point (plus any nod offset).
      p:
        headP.a === 1
          ? {
              a: 1,
              k: headP.k.map((kf) => ({
                ...kf,
                s: kf.s ? [110 + kf.s[0], 112 + kf.s[1]] : kf.s,
              })),
            }
          : st([110 + headP.k[0], 112 + headP.k[1]]),
      a: st([110, 112]),
      r: headR,
    }
  );
}

/** Whole-character layer wrapper: tail behind body behind head. */
function raccoonLayer(op, { charR = st(0), charP, glowOpacity, headOpts = {}, tailR } = {}) {
  return shapeLayer(
    'raccoon',
    1,
    [group('char', [head(headOpts), body(glowOpacity), tail({ r: tailR })])],
    op,
    {
      r: charR,
      p: charP ?? st([110, 110, 0]),
      a: st([110, 130, 0]), // pivot low-center so tilts read as posture, not spin
    }
  );
}

function doc(op, layers, markers) {
  const out = {
    v: '5.9.0',
    fr: 30,
    ip: 0,
    op,
    w: 220,
    h: 220,
    nm: 'trinket-raccoon-placeholder',
    ddd: 0,
    assets: [],
    layers,
  };
  if (markers) out.markers = markers;
  return out;
}

// A slow, gentle breath: glow opacity wave. Period 90 frames (3s).
function breathGlow(op, { lo = 10, hi = 26, period = 90 } = {}) {
  const pairs = [];
  for (let t = 0; t <= op; t += period / 2) {
    pairs.push([Math.min(t, op), (t / (period / 2)) % 2 === 1 ? hi : lo]);
  }
  if (pairs[pairs.length - 1][0] !== op) pairs.push([op, lo]);
  return anim(pairs);
}

// ------------------------------------------------------------------ states --

/** idle: op 300, markers verbatim; rest pose outside every marker window. */
function buildIdle() {
  const OP = 300;
  const markers = [
    { cm: 'blink', tm: 60, dr: 14 },
    { cm: 'glance', tm: 140, dr: 30 },
    { cm: 'postureShift', tm: 230, dr: 50 },
  ];
  return doc(
    OP,
    [
      raccoonLayer(OP, {
        glowOpacity: breathGlow(OP),
        headOpts: {
          // blink 60→74: lids fade in/out (opacity-only).
          lidO: anim([
            [0, 0],
            [60, 0],
            [65, 100],
            [69, 100],
            [74, 0],
            [OP, 0],
          ]),
          // glance 140→170: pupils drift left, then home. Boundary-identical.
          pupilP: {
            a: 1,
            k: [
              { t: 0, s: [0, 0], i: { x: [0.42], y: [1] }, o: { x: [0.58], y: [0] } },
              { t: 140, s: [0, 0], i: { x: [0.42], y: [1] }, o: { x: [0.58], y: [0] } },
              { t: 150, s: [-3.2, 0.6], i: { x: [0.42], y: [1] }, o: { x: [0.58], y: [0] } },
              { t: 160, s: [-3.2, 0.6], i: { x: [0.42], y: [1] }, o: { x: [0.58], y: [0] } },
              { t: 170, s: [0, 0], i: { x: [0.42], y: [1] }, o: { x: [0.58], y: [0] } },
              { t: OP, s: [0, 0] },
            ],
          },
          // postureShift 230→280: soft head lean and settle. Boundary-identical.
          headR: anim([
            [0, 0],
            [230, 0],
            [248, 2.6],
            [262, 2.6],
            [280, 0],
            [OP, 0],
          ]),
        },
      }),
    ],
    markers
  );
}

/** greeting: one-shot (op 90) — ear perk, paw wave, crescent eyes; rest→rest. */
function buildGreeting() {
  const OP = 90;
  // The wave: whole character leans slightly + right paw region raises via a
  // dedicated overlay paw drawn OVER the body edge.
  const wavePaw = shapeLayer(
    'wavePaw',
    2,
    [
      group(
        'paw',
        [group('pad', [ellipse(0, 0, 20, 16), fill(FUR_DARK)])],
        {
          // Wave on the LEFT — the tail owns the right side; a right-hand
          // wave visually merges with it.
          p: anim(
            [
              [0, [82, 186]],
              [18, [50, 126]],
              [66, [50, 126]],
              [84, [82, 186]],
              [OP, [82, 186]],
            ],
            { multi: false }
          ),
          r: anim([
            [18, 0],
            [30, -24],
            [42, 14],
            [54, -24],
            [66, 0],
          ]),
        }
      ),
    ],
    OP
  );
  return doc(OP, [
    wavePaw,
    raccoonLayer(OP, {
      glowOpacity: st(16),
      charR: anim([
        [0, 0],
        [20, -2.4],
        [70, -2.4],
        [OP, 0],
      ]),
      headOpts: {
        earScale: anim(
          [
            [0, [100, 100]],
            [14, [108, 108]],
            [72, [108, 108]],
            [OP, [100, 100]],
          ],
          { multi: false }
        ),
        crescentO: anim([
          [0, 0],
          [16, 100],
          [70, 100],
          [86, 0],
        ]),
        lidO: anim([
          [0, 0],
          [16, 100],
          [70, 100],
          [86, 0],
        ]),
      },
    }),
  ]);
}

/** presence: calm loop (op 150) — breath glow + slow tail sway, seamless. */
function buildPresence() {
  const OP = 150;
  return doc(OP, [
    raccoonLayer(OP, {
      glowOpacity: breathGlow(OP, { lo: 12, hi: 30, period: 75 }),
      tailR: anim([
        [0, 18],
        [37, 23],
        [75, 18],
        [112, 13],
        [OP, 18],
      ]),
    }),
  ]);
}

/** dozing: loop (op 180) — lids closed, ears drooped, slow breath, one soft z. */
function buildDozing() {
  const OP = 180;
  const zLayer = shapeLayer(
    'sleepZ',
    2,
    [
      group(
        'z',
        [
          openPath(
            [
              [0, 0],
              [8, 0],
              [0, 8],
              [8, 8],
            ],
            [
              [0, 0],
              [0, 0],
              [0, 0],
              [0, 0],
            ],
            [
              [0, 0],
              [0, 0],
              [0, 0],
              [0, 0],
            ]
          ),
          strokeShape(AMBER_DEEP, 2.2, 90),
        ],
        {
          p: anim(
            [
              [0, [150, 62]],
              [OP, [158, 40]],
            ],
            { multi: false }
          ),
          o: anim([
            [0, 0],
            [30, 70],
            [120, 70],
            [168, 0],
            [OP, 0],
          ]),
        }
      ),
    ],
    OP
  );
  return doc(OP, [
    zLayer,
    raccoonLayer(OP, {
      glowOpacity: breathGlow(OP, { lo: 8, hi: 20, period: 120 }),
      headOpts: {
        lidO: st(100),
        earRot: st(14), // gentle constant droop, mirrored per side
        headP: st([0, 5]),
      },
    }),
  ]);
}

/** acknowledge: one-shot (op 66) — soft nod + crescent eyes; rest→rest. */
function buildAcknowledge() {
  const OP = 66;
  return doc(OP, [
    raccoonLayer(OP, {
      glowOpacity: st(18),
      headOpts: {
        headP: {
          a: 1,
          k: [
            { t: 0, s: [0, 0], i: { x: [0.42], y: [1] }, o: { x: [0.58], y: [0] } },
            { t: 14, s: [0, 6], i: { x: [0.42], y: [1] }, o: { x: [0.58], y: [0] } },
            { t: 26, s: [0, 0], i: { x: [0.42], y: [1] }, o: { x: [0.58], y: [0] } },
            { t: 36, s: [0, 4], i: { x: [0.42], y: [1] }, o: { x: [0.58], y: [0] } },
            { t: 48, s: [0, 0], i: { x: [0.42], y: [1] }, o: { x: [0.58], y: [0] } },
            { t: OP, s: [0, 0] },
          ],
        },
        crescentO: anim([
          [0, 0],
          [10, 100],
          [50, 100],
          [62, 0],
        ]),
        lidO: anim([
          [0, 0],
          [10, 100],
          [50, 100],
          [62, 0],
        ]),
      },
    }),
  ]);
}

// ------------------------------------------------------------------- write --
const STATES = {
  mascot_greeting: buildGreeting,
  mascot_idle: buildIdle,
  mascot_presence: buildPresence,
  mascot_dozing: buildDozing,
  mascot_acknowledge: buildAcknowledge,
};

for (const [name, build] of Object.entries(STATES)) {
  const json = JSON.stringify(build());
  const file = path.join(OUT_DIR, `${name}.json`);
  writeFileSync(file, json + '\n');
  console.log(`${name}.json — ${(json.length / 1024).toFixed(1)}KB`);
}
