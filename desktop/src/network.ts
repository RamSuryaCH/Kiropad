import os from 'os';

let cachedIP: string | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60000;

/**
 * Resets the local IP cache (primarily for testing purposes).
 */
export function resetCache(): void {
  cachedIP = null;
  lastCacheTime = 0;
}

/**
 * Get the local IPv4 address on the same network (Wi-Fi typically).
 * Uses caching to avoid frequent synchronous, blocking calls to os.networkInterfaces().
 * Falls back to 127.0.0.1 if no suitable address found.
 */
export function getLocalIP(): string {
  const now = Date.now();
  if (cachedIP !== null && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedIP;
  }

  const interfaces = os.networkInterfaces();
  let foundIP = '127.0.0.1';

  // Prefer en0 (Wi-Fi on macOS) first
  outer: for (const name of ['en0', 'en1', 'Wi-Fi', 'Ethernet']) {
    const iface = interfaces[name];
    if (!iface) continue;
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        foundIP = addr.address;
        break outer;
      }
    }
  }

  // Fallback: any non-internal IPv4
  if (foundIP === '127.0.0.1') {
    outerFallback: for (const iface of Object.values(interfaces)) {
      if (!iface) continue;
      for (const addr of iface) {
        if (addr.family === 'IPv4' && !addr.internal) {
          foundIP = addr.address;
          break outerFallback;
        }
      }
    }
  }

  cachedIP = foundIP;
  lastCacheTime = now;
  return foundIP;
}
