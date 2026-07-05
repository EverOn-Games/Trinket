// Mirrors reconcileActiveSession.ts's shape: explicit inputs in, deterministic
// output out, no MMKV/React import — trivially unit-testable with zero mocks.
//
// Isolated per Pitfall 2 (04-RESEARCH.md): D-03's "one final utterance = one
// new line" is convenient but only confirmed by the D-02 device spike. If
// real Android manufacturer variance needs different handling (debouncing, a
// different whitespace fix-up, etc.), this is the single function to change —
// nothing else in useVoiceCapture or the capture view needs to know.
export function appendFinalSegmentToDraft(current: string, transcript: string): string {
  const trimmed = transcript.trim();
  if (trimmed.length === 0) return current; // D-03: an empty/whitespace-only segment is a no-op

  return current.length === 0 ? trimmed : `${current}\n${trimmed}`;
}
