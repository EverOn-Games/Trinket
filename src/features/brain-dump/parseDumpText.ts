/**
 * parseDumpText — pure newline-stream parser (D-07/D-08). Mirrors
 * reconcileActiveSession.ts's shape: explicit inputs in, deterministic output
 * out, no MMKV/React import — trivially unit-testable with zero mocks.
 *
 * D-07: split on newline, trim each line, silently drop blank lines; a
 * one-line dump is one item; an empty/whitespace-only field is a no-op
 * (yields zero items — no empty items are ever created).
 * D-08: 30 is descriptive, not a gate — no cap, no truncation.
 */
export function parseDumpText(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
