#!/usr/bin/env node
/**
 * D-02 / T-01-05 structural guard: color literals must live only in
 * theme/tokens.ts, never as inline hex strings inside component/screen code.
 *
 * Scans src/app/**\/*.tsx, src/features/**\/*.tsx, and src/components/**\/*.tsx
 * (the directories that exist or will exist for JSX-bearing source — routes
 * live under src/app/ per 01-01-SUMMARY.md, not a top-level app/) for hex
 * color literals (`#RGB`, `#RGBA`, `#RRGGBB`, `#RRGGBBAA`) outside `theme/`.
 * Comment-aware: matches on full lines are skipped when the line is a
 * single-line `//` comment, so header/doc comments referencing hex values
 * do not self-invalidate the gate.
 *
 * Exits 0 when no violations are found outside theme/, exits 1 (listing each
 * violation) otherwise. Wired as `npm run lint:hex`.
 */

import { globSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Resolve the repo root relative to this script's own location, not
// process.cwd() — running the script from any other working directory used to
// silently scan nothing and still exit 0 (see main()'s empty-scan guard below).
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const HEX_LITERAL_RE = /#[0-9a-fA-F]{3,8}\b/g;

const SCAN_GLOBS = [
  'src/app/**/*.tsx',
  'src/features/**/*.tsx',
  'src/components/**/*.tsx',
];

function isCommentLine(line) {
  return /^\s*\/\//.test(line);
}

function findViolationsInFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const violations = [];

  lines.forEach((line, index) => {
    if (isCommentLine(line)) return;

    // Strip trailing single-line comments (e.g. `const x = 1; // #fff`) so
    // hex values only mentioned in a trailing comment don't trigger a
    // false positive.
    const commentIndex = line.indexOf('//');
    const codePart = commentIndex === -1 ? line : line.slice(0, commentIndex);

    const matches = codePart.match(HEX_LITERAL_RE);
    if (matches) {
      violations.push({ line: index + 1, text: line.trim(), matches });
    }
  });

  return violations;
}

function main() {
  const files = SCAN_GLOBS.flatMap((pattern) => globSync(pattern, { cwd: ROOT }));
  const uniqueFiles = [...new Set(files)];

  if (uniqueFiles.length === 0) {
    console.error(
      'check-hex-literals: no files matched the scan globs — refusing to pass an empty scan. ' +
        `(root: ${ROOT}, globs: ${SCAN_GLOBS.join(', ')})`
    );
    process.exit(1);
  }

  let violationCount = 0;

  for (const file of uniqueFiles) {
    const violations = findViolationsInFile(path.join(ROOT, file));
    for (const v of violations) {
      violationCount += 1;
      console.error(`${file}:${v.line}: ${v.matches.join(', ')} — ${v.text}`);
    }
  }

  if (violationCount > 0) {
    console.error(
      `\ncheck-hex-literals: ${violationCount} hex color literal(s) found outside theme/. ` +
        'Move color values into theme/tokens.ts and consume them via useTheme() (D-02).'
    );
    process.exit(1);
  }

  console.log('check-hex-literals: no hex color literals found outside theme/.');
  process.exit(0);
}

main();
