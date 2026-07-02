/**
 * Marker frame-range resolution for Mascot Lottie assets (MASC-02, Pitfall 2).
 *
 * `lottie-react-native`'s public JS API has no marker-name-aware playback method
 * (only numeric `play(startFrame, endFrame)`). The standard Bodymovin `markers`
 * array (`{ cm: <name>, tm: <start frame>, dr: <duration in frames> }`) is present
 * directly on a `require()`-d Lottie JSON object in JS memory (Assumption A2), so
 * this module builds a `{ name: { startFrame, endFrame } }` lookup once per asset
 * at load time — no native marker API is needed.
 *
 * Defensive decoding: some LottieFiles-originated exports JSON-stringify the marker
 * comment (e.g. `cm: '{"name":"blink"}'`) instead of using a plain string. Attempt
 * `JSON.parse(marker.cm).name` first and fall back to the raw `marker.cm` string on
 * parse failure, mirroring data/repositories/sessions.ts's tolerate-malformed-input
 * try/catch idiom (Pitfall 2).
 */

export type MarkerRange = { startFrame: number; endFrame: number };

export type MascotAssetJSON = {
  markers?: Array<{ cm: string; tm: number; dr: number }>;
};

const REQUIRED_MARKER_NAMES = ['blink', 'glance', 'postureShift'];

function decodeMarkerName(cm: string): string {
  try {
    const parsed: unknown = JSON.parse(cm);
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'name' in parsed &&
      typeof (parsed as { name: unknown }).name === 'string'
    ) {
      return (parsed as { name: string }).name;
    }
    return cm;
  } catch {
    // Pitfall 2: not every export tool JSON-encodes the marker comment — tolerate
    // a plain-string cm rather than throw.
    return cm;
  }
}

export function resolveMarkers(asset: MascotAssetJSON): Record<string, MarkerRange> {
  const table: Record<string, MarkerRange> = {};

  for (const marker of asset.markers ?? []) {
    const name = decodeMarkerName(marker.cm);
    table[name] = { startFrame: marker.tm, endFrame: marker.tm + marker.dr };
  }

  if (process.env.NODE_ENV !== 'production') {
    const missing = REQUIRED_MARKER_NAMES.filter((name) => !(name in table));
    if (missing.length > 0) {
      // Dev-only warning, never user-facing — a broken final-art drop-in must fail
      // loud in logs, not silently in production (Pitfall 2).
      console.warn(`resolveMarkers: missing required marker(s): ${missing.join(', ')}`);
    }
  }

  return table;
}
