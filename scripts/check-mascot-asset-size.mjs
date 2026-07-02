#!/usr/bin/env node
/**
 * MASC-04 structural guard: every placeholder/final mascot Lottie asset must stay
 * under the 300KB perf contract (CLAUDE.md "Lottie loops loaded lazily, each under
 * 300 KB target"; UI-SPEC Asset & performance contract).
 *
 * Scans assets/mascot/*.json (mirrors scripts/check-hex-literals.mjs's fail-closed
 * shape). Root resolved via import.meta.url, not process.cwd(), for the same reason
 * check-hex-literals.mjs resolves it that way — running from another working
 * directory must never silently scan nothing and still exit 0.
 *
 * Exits 0 only when at least one file matched the glob AND every matched file is
 * <= MAX_BYTES. Exits 1 (with a per-file violation line naming the offending file
 * and citing MASC-04) when any asset exceeds the limit, and also exits 1 when the
 * scan is empty — an empty scan is a FAILURE, never a silent pass, matching
 * check-hex-literals.mjs's precedent.
 */

import { globSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SCAN_GLOB = 'assets/mascot/*.json';
const MAX_BYTES = 300 * 1024; // 300KB (MASC-04)

function main() {
  const files = globSync(SCAN_GLOB, { cwd: ROOT });

  if (files.length === 0) {
    console.error(
      `check-mascot-asset-size: no files matched ${SCAN_GLOB} — refusing to pass an empty scan. ` +
        `(root: ${ROOT})`
    );
    process.exit(1);
  }

  let violationCount = 0;

  for (const file of files) {
    const { size } = statSync(path.join(ROOT, file));
    if (size > MAX_BYTES) {
      violationCount += 1;
      console.error(`${file}: ${size} bytes exceeds ${MAX_BYTES} byte limit (MASC-04)`);
    }
  }

  if (violationCount > 0) {
    console.error(
      `\ncheck-mascot-asset-size: ${violationCount} asset(s) exceed the 300KB gate (MASC-04).`
    );
    process.exit(1);
  }

  console.log('check-mascot-asset-size: all mascot assets under 300KB.');
  process.exit(0);
}

main();
