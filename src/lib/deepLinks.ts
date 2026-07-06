/**
 * The deep-link contract every out-of-app surface uses (v0.2 §7 "shared").
 * One module so widgets, Live Activities, and any future surface agree on
 * routes and entry attribution. The `entry` param drives the §9
 * surface-entry instrumentation (structural token, never content) and
 * nothing else — routes behave identically without it.
 *
 * Resume correctness is free: /co-pilot's own initializers reconcile a live
 * session on entry (D-11/D-16), so "open into session start" and "return to
 * the running session" are the SAME link.
 */

export type SurfaceEntry = 'widget' | 'liveActivity';

const SCHEME = 'trinket://';

export const deepLinks = {
  coPilot: (entry: SurfaceEntry): string => `${SCHEME}/co-pilot?entry=${entry}`,
  brainDump: (entry: SurfaceEntry): string => `${SCHEME}/brain-dump?entry=${entry}`,
};

export function isSurfaceEntry(value: unknown): value is SurfaceEntry {
  return value === 'widget' || value === 'liveActivity';
}
