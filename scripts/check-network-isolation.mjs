#!/usr/bin/env node
/**
 * Phase 9 criterion 1 structural guard (FND-03, code half): Trinket is
 * local-first — every core feature must work with the network fully off.
 * The only things allowed to touch the network are the two env-gated seam
 * modules (RevenueCat purchases, PostHog analytics transport), and even
 * those must fail quietly.
 *
 * Two invariants, both greppable and fail-closed:
 *
 * 1. NO direct network primitives anywhere in first-party code: fetch(),
 *    XMLHttpRequest, WebSocket, axios. (The SDKs do their own networking
 *    inside node_modules — first-party code never should.)
 * 2. Networked SDK imports stay confined to their seam modules:
 *      react-native-purchases → src/features/subscription/purchases.ts
 *      posthog-react-native   → src/analytics/posthog.ts
 *      @supabase/supabase-js  → nowhere (MONEY-04 not built; when it lands,
 *                               add its seam file to the allowlist HERE, in
 *                               the same commit)
 *    (__mocks__/ and jest.setup.ts are test infrastructure, not app code —
 *    exempt from the import confinement, still covered by invariant 1.)
 *
 * Exits 0 when clean; exits 1 listing each violation. Wired as
 * `npm run lint:network` inside `npm run verify`.
 */

import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SCAN_GLOBS = [
  'src/**/*.{ts,tsx}',
  'data/**/*.ts',
  'i18n/**/*.ts',
  'theme/**/*.{ts,tsx}',
];

/** Direct network primitives — banned everywhere in first-party code. */
const NETWORK_PRIMITIVES = [
  { re: /\bfetch\s*\(/, label: 'fetch()' },
  { re: /\bXMLHttpRequest\b/, label: 'XMLHttpRequest' },
  { re: /\bnew WebSocket\b/, label: 'WebSocket' },
  { re: /from ['"]axios['"]/, label: 'axios import' },
];

/** Networked SDKs and the single seam file allowed to import each. */
const SDK_CONFINEMENT = [
  { module: 'react-native-purchases', allowed: ['src/features/subscription/purchases.ts'] },
  { module: 'posthog-react-native', allowed: ['src/analytics/posthog.ts'] },
  { module: '@supabase/supabase-js', allowed: [] },
];

const TEST_INFRA_RE = /(^|\/)(__mocks__|__tests__)\/|\.test\.(ts|tsx)$/;

function stripComments(line) {
  const idx = line.indexOf('//');
  return idx === -1 ? line : line.slice(0, idx);
}

function main() {
  const files = [...new Set(SCAN_GLOBS.flatMap((g) => globSync(g, { cwd: ROOT })))];
  if (files.length === 0) {
    console.error('check-network-isolation: zero files matched — refusing to pass an empty scan.');
    process.exit(1);
  }

  let violationCount = 0;

  for (const file of files) {
    const normalized = file.split(path.sep).join('/');
    const content = readFileSync(path.join(ROOT, file), 'utf8');
    const lines = content.split('\n');

    lines.forEach((rawLine, index) => {
      const line = stripComments(rawLine);

      for (const { re, label } of NETWORK_PRIMITIVES) {
        if (re.test(line)) {
          violationCount += 1;
          console.error(
            `${normalized}:${index + 1}: direct network primitive ${label} — ` +
              'first-party code is local-first; network lives behind the seam SDKs only.'
          );
        }
      }

      if (TEST_INFRA_RE.test(normalized)) return; // mocks/tests may import SDKs

      for (const { module: mod, allowed } of SDK_CONFINEMENT) {
        if (new RegExp(`from ['"]${mod}['"]`).test(line) && !allowed.includes(normalized)) {
          violationCount += 1;
          console.error(
            `${normalized}:${index + 1}: '${mod}' imported outside its seam ` +
              `(allowed: ${allowed.length ? allowed.join(', ') : 'nowhere yet'}). ` +
              'Route all use through the seam module so offline behavior stays in one place.'
          );
        }
      }
    });
  }

  if (violationCount > 0) {
    console.error(`\ncheck-network-isolation: ${violationCount} violation(s) (FND-03 local-first).`);
    process.exit(1);
  }

  console.log(`check-network-isolation: ${files.length} files clean — network confined to the two seams.`);
  process.exit(0);
}

main();
