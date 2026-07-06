/**
 * Containment-boundary tests (v0.2 §6): the surfaces can be lost — to
 * platform, to the kill switch, or to a broken native module — but the app
 * never is. The gate logic is pure and table-tested; the broken-module path
 * is exercised with a genuinely throwing widget module in an isolated
 * registry, asserting the failure is caught, logged once, memoized, and
 * every seam call quietly no-ops.
 */
import { shouldEnableSurfaces, surfacesDisabledByEnv } from '../widgetsRuntime';

describe('shouldEnableSurfaces (gate table)', () => {
  it('only iOS ever loads the surfaces runtime', () => {
    expect(shouldEnableSurfaces('android', {})).toBe(false);
    expect(shouldEnableSurfaces('web', {})).toBe(false);
    expect(shouldEnableSurfaces('ios', {})).toBe(true);
  });

  it('the kill switch disables surfaces without a rebuild', () => {
    expect(shouldEnableSurfaces('ios', { EXPO_PUBLIC_DISABLE_SURFACES: '1' })).toBe(false);
    expect(shouldEnableSurfaces('ios', { EXPO_PUBLIC_DISABLE_SURFACES: 'true' })).toBe(false);
    expect(shouldEnableSurfaces('ios', { EXPO_PUBLIC_DISABLE_SURFACES: '0' })).toBe(true);
    expect(surfacesDisabledByEnv({})).toBe(false);
  });
});

describe('broken widgets module (the first-iOS-build failure mode)', () => {
  afterEach(() => {
    delete process.env.EXPO_PUBLIC_DISABLE_SURFACES;
  });

  it('a throwing import loses the surface, never the app — logged once, memoized', async () => {
    let runtime: typeof import('../widgetsRuntime') | undefined;
    let seam: typeof import('../sessionActivity') | undefined;
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    jest.isolateModules(() => {
      jest.doMock('../../../../widgets/TrinketSessionActivity', () => {
        throw new Error("requireNativeModule('ExpoWidgets'): module not found");
      });
      runtime = require('../widgetsRuntime') as typeof import('../widgetsRuntime');
      seam = require('../sessionActivity') as typeof import('../sessionActivity');
    });

    expect(runtime!.getSessionActivityFactory()).toBeNull();
    // Memoized: the second lookup neither throws nor re-warns.
    expect(runtime!.getSessionActivityFactory()).toBeNull();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toContain('the app is unaffected');

    // The seam quietly no-ops end to end.
    await expect(seam!.startSessionActivity(Date.now())).resolves.toBeUndefined();
    await expect(seam!.endAllSessionActivities()).resolves.toBeUndefined();

    warnSpy.mockRestore();
    jest.dontMock('../../../../widgets/TrinketSessionActivity');
  });

  it('the kill switch short-circuits before any load is attempted', () => {
    let runtime: typeof import('../widgetsRuntime') | undefined;
    jest.isolateModules(() => {
      process.env.EXPO_PUBLIC_DISABLE_SURFACES = '1';
      jest.doMock('../../../../widgets/TrinketSessionActivity', () => {
        throw new Error('must never be evaluated when disabled');
      });
      runtime = require('../widgetsRuntime') as typeof import('../widgetsRuntime');
    });

    expect(runtime!.getSessionActivityFactory()).toBeNull();
    jest.dontMock('../../../../widgets/TrinketSessionActivity');
  });
});
