/**
 * Containment boundary for the expo-widgets runtime (v0.2 §6 surfaces).
 *
 * Why this exists: expo-widgets calls `requireNativeModule('ExpoWidgets')` at
 * MODULE SCOPE in its iOS bundle. If the native module is missing or broken
 * in a given build (a first-build misconfiguration, a dev client built
 * before the plugin ran, a future SDK mismatch), a static import chain from
 * app screens would crash the WHOLE app at boot. This module makes that
 * import lazy, guarded, memoized, and diagnosable — a broken surface loses
 * the surface, never the app.
 *
 * Layers of containment (outermost first):
 * 1. Platform gate — only iOS ever attempts the load (Android gets Expo's
 *    own no-op stub anyway, but we never rely on that alone).
 * 2. Kill switch — EXPO_PUBLIC_DISABLE_SURFACES=1 in .env.local disables all
 *    surface behavior without a rebuild (Metro restart only). The
 *    troubleshooting lever for the first iOS builds.
 * 3. Lazy try/catch require — an import-time throw is caught ONCE, logged
 *    loudly in dev (fail-loud-in-logs precedent), memoized as null, and
 *    every caller quietly no-ops from then on.
 *
 * On iOS the widgets/Live Activities themselves run OUT of process — a
 * broken widget can only ever show a placeholder on the home screen. The
 * only in-process risk is this import, which is why it is the thing
 * contained.
 */
import { Platform } from 'react-native';

type SessionActivityFactory =
  typeof import('../../../widgets/TrinketSessionActivity').default;

export function surfacesDisabledByEnv(env: Record<string, string | undefined>): boolean {
  const flag = env.EXPO_PUBLIC_DISABLE_SURFACES;
  return flag === '1' || flag === 'true';
}

export function shouldEnableSurfaces(
  platform: string,
  env: Record<string, string | undefined>
): boolean {
  return platform === 'ios' && !surfacesDisabledByEnv(env);
}

// undefined = not attempted yet; null = attempted and unavailable (memoized
// so a broken build logs once, not on every session).
let cachedFactory: SessionActivityFactory | null | undefined;

export function getSessionActivityFactory(): SessionActivityFactory | null {
  if (!shouldEnableSurfaces(Platform.OS, process.env)) return null;
  if (cachedFactory !== undefined) return cachedFactory;
  try {
    // Lazy on purpose — see the module docstring. Metro still statically
    // bundles the module; only its EVALUATION (and the native-module lookup
    // inside it) is deferred to first use and guarded here.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedFactory = (
      require('../../../widgets/TrinketSessionActivity') as {
        default: SessionActivityFactory;
      }
    ).default;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      // Dev-only, fail-loud-in-logs (markers.ts precedent): this line in the
      // Metro log is the first thing to look for when Live Activities do
      // nothing on a fresh iOS build.
      console.warn(
        'surfaces: expo-widgets runtime failed to load — Live Activities are off ' +
          'for this run; the app is unaffected. (Set EXPO_PUBLIC_DISABLE_SURFACES=1 ' +
          'to silence surfaces entirely while troubleshooting.)',
        error
      );
    }
    cachedFactory = null;
  }
  return cachedFactory;
}

/** Test seam: reset the memoized load attempt. */
export function resetWidgetsRuntimeForTesting(): void {
  cachedFactory = undefined;
}
