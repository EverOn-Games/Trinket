/**
 * Local ID generation for MMKV-backed records. Prefers the platform/runtime
 * `crypto.randomUUID()` (available in RN 0.85 / Hermes and in Node 19+ test
 * environments); falls back to a small RFC4122-v4-shaped generator if the global
 * is unavailable, so repositories never depend on adding a uuid dependency.
 */
export function newId(): string {
  const globalCrypto = (globalThis as { crypto?: Crypto }).crypto;
  if (globalCrypto && typeof globalCrypto.randomUUID === 'function') {
    return globalCrypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = (Math.random() * 16) | 0;
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
