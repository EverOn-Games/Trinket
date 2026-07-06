/**
 * §9 surface-entry instrumentation: when a screen is opened through an
 * out-of-app surface's deep link (?entry=widget|liveActivity), fire ONE
 * structural event. The param changes nothing about the screen's behavior —
 * attribution only, closed tokens only, and an absent/garbage param is a
 * silent no-op (a hand-typed URL must never throw or track).
 */
import { useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { track } from '../../analytics/analytics';
import { isSurfaceEntry } from '../../lib/deepLinks';

export function useSurfaceEntry(): void {
  const { entry } = useLocalSearchParams<{ entry?: string }>();
  useEffect(() => {
    if (isSurfaceEntry(entry)) {
      track('surface_entry', { surface: entry });
    }
    // Fire once per entry param value — a re-render with the same param is
    // the same arrival, not a new one.
  }, [entry]);
}
