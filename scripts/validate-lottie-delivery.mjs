#!/usr/bin/env node
/**
 * Validates an animator-delivered Lottie file against design/LOTTIE-SPEC.md.
 * Usage:  node scripts/validate-lottie-delivery.mjs <file.json> [more.json…]
 *
 * FAIL (exit 1): unparseable, >300KB (MASC-04 gate value), raster/embedded
 * image assets, missing required markers for the recognized filename.
 * WARN (exit 0): non-220 canvas, non-30fps, non-square, suspected AE
 * expressions — all reviewable deviations, not automatic rejections.
 */

import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const MAX_BYTES = 300 * 1024;

const REQUIRED_MARKERS = {
  'mascot_idle.json': ['blink', 'glance', 'postureShift'],
};

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('usage: node scripts/validate-lottie-delivery.mjs <file.json> [more…]');
  process.exit(1);
}

let failures = 0;

for (const file of files) {
  const name = path.basename(file);
  const fail = (msg) => {
    failures += 1;
    console.error(`✕ ${name}: ${msg}`);
  };
  const warn = (msg) => console.warn(`⚠ ${name}: ${msg}`);
  const ok = (msg) => console.log(`✓ ${name}: ${msg}`);

  let raw;
  try {
    raw = readFileSync(file, 'utf8');
  } catch (e) {
    fail(`unreadable (${e.message})`);
    continue;
  }

  const bytes = statSync(file).size;
  if (bytes > MAX_BYTES) fail(`${(bytes / 1024).toFixed(1)}KB exceeds the 300KB hard gate`);
  else ok(`${(bytes / 1024).toFixed(1)}KB (limit 300KB)`);

  let doc;
  try {
    doc = JSON.parse(raw);
  } catch (e) {
    fail(`not valid JSON (${e.message})`);
    continue;
  }

  if (doc.w !== doc.h) warn(`canvas ${doc.w}×${doc.h} is not square (app renders square slots)`);
  if (doc.w !== 220) warn(`canvas ${doc.w}px (spec suggests 220px; must read at 64px render)`);
  if (doc.fr !== 30) warn(`frame rate ${doc.fr} (spec assumes 30fps — timings will scale)`);

  // Raster/embedded assets: Bodymovin image assets carry `p` (file) / `u`
  // (path) or base64 payloads — all disallowed (vector-only contract).
  const imageAssets = (doc.assets ?? []).filter((a) => a && (a.p || a.u));
  if (imageAssets.length > 0) {
    fail(`${imageAssets.length} raster/embedded image asset(s) — vector-only delivery required`);
  }

  // AE expressions show up as string-valued `x` fields on animated props.
  if (/"x"\s*:\s*"var |"x"\s*:\s*"\$bm_/.test(raw)) {
    warn('suspected After Effects expression(s) — runtime support is uneven, please bake to keyframes');
  }

  const required = REQUIRED_MARKERS[name];
  if (required) {
    const markerNames = (doc.markers ?? []).map((m) => {
      // Tolerate LottieFiles-style JSON-encoded comments (same decoding the
      // app runtime applies).
      try {
        const parsed = JSON.parse(m.cm);
        return parsed && typeof parsed === 'object' && 'name' in parsed ? parsed.name : m.cm;
      } catch {
        return m.cm;
      }
    });
    const missing = required.filter((r) => !markerNames.includes(r));
    if (missing.length > 0) fail(`missing required marker(s): ${missing.join(', ')}`);
    else ok(`markers present: ${required.join(', ')}`);
  }

  const op = typeof doc.op === 'number' ? doc.op : NaN;
  const seconds = Number.isFinite(op) && doc.fr ? (op / doc.fr).toFixed(1) : '?';
  ok(`duration ${op} frames (~${seconds}s)`);
}

if (failures > 0) {
  console.error(`\n${failures} failure(s) — see design/LOTTIE-SPEC.md`);
  process.exit(1);
}
console.log('\nAll files pass the delivery contract.');
