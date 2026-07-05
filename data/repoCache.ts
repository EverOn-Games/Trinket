/**
 * Repo-cache registry. Repositories are MEMORY-FIRST as of the 2026-07-05
 * device-UAT fix: reads are served from an in-memory map hydrated once from
 * MMKV, and writes go through to MMKV for persistence only. This exists
 * because on-device MMKV v4 reads proved stale for a window after a write
 * (fresh data appeared only on remount), freezing mounted lists — while the
 * Jest MMKV mock (a plain Map) could never reproduce it. Memory-first reads
 * make UI correctness independent of the storage engine's read semantics.
 *
 * This module is dependency-free on purpose: each repo registers its cache
 * reset here, and jest.setup.ts calls resetAllRepoCaches() before every test
 * so contentStorage.clearAll() in a test's setup can't leave a repo serving
 * a previous test's hydrated cache. Production code never calls reset.
 */
type ResetFn = () => void;

const resets: ResetFn[] = [];

export function registerRepoCacheReset(reset: ResetFn): void {
  resets.push(reset);
}

/** Test-only: drop every repo's in-memory cache so the next access re-hydrates. */
export function resetAllRepoCaches(): void {
  resets.forEach((reset) => reset());
}
