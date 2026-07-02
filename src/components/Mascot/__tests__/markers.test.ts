/**
 * Unit tests for resolveMarkers (MASC-02, Pitfall 2).
 *
 * Covers: plain-string cm encoding, JSON-stringified cm encoding (defensive
 * fallback), the real bundled mascot_idle.json asset (Assumption A2 — markers
 * survive Metro require()), and empty/missing markers arrays.
 */

import { resolveMarkers, type MascotAssetJSON } from '../markers';
// eslint-disable-next-line @typescript-eslint/no-require-imports -- static JSON require, mirrors runtime Metro require() usage
const mascotIdleAsset = require('../../../../assets/mascot/mascot_idle.json') as MascotAssetJSON;

describe('resolveMarkers', () => {
  it('resolves a plain-string cm markers array with endFrame = tm + dr', () => {
    const asset: MascotAssetJSON = {
      markers: [
        { cm: 'blink', tm: 60, dr: 12 },
        { cm: 'glance', tm: 120, dr: 30 },
        { cm: 'postureShift', tm: 200, dr: 45 },
      ],
    };

    const result = resolveMarkers(asset);

    expect(result).toEqual({
      blink: { startFrame: 60, endFrame: 72 },
      glance: { startFrame: 120, endFrame: 150 },
      postureShift: { startFrame: 200, endFrame: 245 },
    });
  });

  it('resolves a JSON-stringified cm marker under its decoded name', () => {
    const asset: MascotAssetJSON = {
      markers: [{ cm: '{"name":"blink"}', tm: 10, dr: 5 }],
    };

    const result = resolveMarkers(asset);

    expect(result.blink).toEqual({ startFrame: 10, endFrame: 15 });
  });

  it('falls back to the raw cm string when JSON.parse fails', () => {
    const asset: MascotAssetJSON = {
      markers: [{ cm: 'not-json{', tm: 1, dr: 2 }],
    };

    const result = resolveMarkers(asset);

    expect(result['not-json{']).toEqual({ startFrame: 1, endFrame: 3 });
  });

  it('resolves all three required names from the real bundled mascot_idle.json asset', () => {
    const result = resolveMarkers(mascotIdleAsset);

    expect(result.blink).toBeDefined();
    expect(result.glance).toBeDefined();
    expect(result.postureShift).toBeDefined();
  });

  it('returns {} without throwing when markers are missing', () => {
    expect(resolveMarkers({} as MascotAssetJSON)).toEqual({});
  });

  it('returns {} without throwing when markers is an empty array', () => {
    expect(resolveMarkers({ markers: [] })).toEqual({});
  });
});
