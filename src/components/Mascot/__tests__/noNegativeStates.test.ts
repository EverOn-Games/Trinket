/**
 * Structural guard (MASC-03, D-01): asserts the `MascotState` union declared in
 * `src/components/Mascot/types.ts` contains exactly the 5 allowed state literals,
 * in no more and no fewer — no sixth state, and no negative/directive state
 * ("sad", "disappointed", "waiting", "nagging", etc.) can ever be introduced
 * without this test failing.
 *
 * Mirrors data/repositories/__tests__/schema.denylist.test.ts's source-level scan
 * idiom: readFileSync the raw .ts source, regex-extract the relevant literals,
 * assert against the exact expected set — catching the union at the type level
 * rather than relying on a runtime probe that could miss unused literals.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ALLOWED_STATES = ['greeting', 'idle', 'presence', 'dozing', 'acknowledge'];

function extractMascotStateUnion(source: string): string[] {
  const match = source.match(/export type MascotState =\s*([^;]+);/);
  if (!match) {
    throw new Error('MascotState union declaration not found in types.ts');
  }
  const literalRe = /'([^']+)'/g;
  const literals: string[] = [];
  let literalMatch: RegExpExecArray | null;
  while ((literalMatch = literalRe.exec(match[1])) !== null) {
    literals.push(literalMatch[1]);
  }
  return literals;
}

describe('MascotState structural guard', () => {
  it('contains exactly the 5 allowed states, in order, and nothing else', () => {
    const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');
    const declaredStates = extractMascotStateUnion(typesSource);

    expect(declaredStates).toEqual(ALLOWED_STATES);
  });

  it('rejects any negative/directive state literal appearing anywhere in the union', () => {
    const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');
    const declaredStates = extractMascotStateUnion(typesSource);

    const forbidden = ['sad', 'disappointed', 'waiting', 'nagging', 'angry', 'upset'];
    const violations = declaredStates.filter((state) => forbidden.includes(state));

    expect(violations).toEqual([]);
  });
});
