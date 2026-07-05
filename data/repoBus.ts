/**
 * repoBus — tiny change-notification layer over the MMKV repositories, fixing
 * the stale-screen class found in device UAT (2026-07-05): screens read
 * `repo.list()` directly in render (the codebase's deliberate idiom), but a
 * mounted screen never re-rendered when another screen wrote to the same
 * repo — lists only caught up on full app restart.
 *
 * Design: a version counter per namespace + `useSyncExternalStore`. Screens
 * call `useRepoVersion('dumpItem')` once; any repo write to that namespace
 * re-renders the subscriber, whose render body then re-reads the repo exactly
 * as before. The read-in-render idiom stays; it just becomes live. No data
 * flows through the bus — it carries only "something changed" ticks, so the
 * repositories remain the single source of truth (local-first, MMKV).
 *
 * Repos call `notifyRepoChanged(NAMESPACE)` in every mutating method. The
 * `all` channel ticks on every mutation for screens that read several repos.
 */
import { useSyncExternalStore } from 'react';

export type RepoNamespace = 'dumpItem' | 'session' | 'intention' | 'activeSession';

type Channel = RepoNamespace | 'all';

const versions = new Map<Channel, number>();
const listeners = new Map<Channel, Set<() => void>>();

function bump(channel: Channel): void {
  versions.set(channel, (versions.get(channel) ?? 0) + 1);
  listeners.get(channel)?.forEach((fn) => fn());
}

export function notifyRepoChanged(namespace: RepoNamespace): void {
  bump(namespace);
  bump('all');
}

function subscribe(channel: Channel, onChange: () => void): () => void {
  let set = listeners.get(channel);
  if (!set) {
    set = new Set();
    listeners.set(channel, set);
  }
  set.add(onChange);
  return () => {
    set.delete(onChange);
  };
}

function getVersion(channel: Channel): number {
  return versions.get(channel) ?? 0;
}

/**
 * Subscribe the calling component to a repo namespace (or 'all'). Returns the
 * current version number — its only job is to change identity so React
 * re-renders; render bodies keep reading repos directly.
 */
export function useRepoVersion(channel: Channel): number {
  return useSyncExternalStore(
    (onChange) => subscribe(channel, onChange),
    () => getVersion(channel)
  );
}
