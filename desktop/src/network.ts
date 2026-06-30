import os from 'os';

let cachedIP: string | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 60000; // 60 seconds

/**
 * Reset the cached IP address. Useful for testing.
 */
export function resetCache(): void {
  cachedIP = null;
  cacheExpiry = 0;
}

/**
 * Get the local IPv4 address on the same network (Wi-Fi typically).
 * Falls back to 127.0.0.1 if no suitable address found.
 * Result is cached for 60 seconds to prevent blocking the main thread.
 */
export function getLocalIP(): string {
  const now = Date.now();
  if (cachedIP && now < cacheExpiry) {
    return cachedIP;
  }

  const interfaces = os.networkInterfaces();

  let resolvedIP = '127.0.0.1';

  // Prefer en0 (Wi-Fi on macOS) first
  for (const name of ['en0', 'en1', 'Wi-Fi', 'Ethernet']) {
    const iface = interfaces[name];
    if (!iface) continue;
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        resolvedIP = addr.address;
        break;
      }
    }
    if (resolvedIP !== '127.0.0.1') break;
  }

  // Fallback: any non-internal IPv4
  if (resolvedIP === '127.0.0.1') {
    for (const iface of Object.values(interfaces)) {
      if (!iface) continue;
      for (const addr of iface) {
        if (addr.family === 'IPv4' && !addr.internal) {
          resolvedIP = addr.address;
          break;
        }
      }
      if (resolvedIP !== '127.0.0.1') break;
    }
  }

  cachedIP = resolvedIP;
  cacheExpiry = now + CACHE_TTL;

  return resolvedIP;
}
