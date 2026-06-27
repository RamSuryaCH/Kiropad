import os from 'os';

// Cache for getLocalIP to prevent blocking main thread on frequent calls.
// Performance Optimization: os.networkInterfaces() is a blocking synchronous system call.
// Caching it with a TTL prevents performance degradation during frequent UI state updates.
let cachedIP: string | null = null;
let lastCacheTime = 0;
const CACHE_TTL = 10000; // 10 seconds

/**
 * Resets the getLocalIP cache. Used primarily for testing.
 */
export function resetCache(): void {
  cachedIP = null;
  lastCacheTime = 0;
}

/**
 * Get the local IPv4 address on the same network (Wi-Fi typically).
 * Falls back to 127.0.0.1 if no suitable address found.
 */
export function getLocalIP(): string {
  const now = Date.now();
  if (cachedIP !== null && now - lastCacheTime < CACHE_TTL) {
    return cachedIP;
  }

  const interfaces = os.networkInterfaces();

  // Prefer en0 (Wi-Fi on macOS) first
  for (const name of ['en0', 'en1', 'Wi-Fi', 'Ethernet']) {
    const iface = interfaces[name];
    if (!iface) continue;
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        cachedIP = addr.address;
        lastCacheTime = now;
        return cachedIP;
      }
    }
  }

  // Fallback: any non-internal IPv4
  for (const iface of Object.values(interfaces)) {
    if (!iface) continue;
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        cachedIP = addr.address;
        lastCacheTime = now;
        return cachedIP;
      }
    }
  }

  cachedIP = '127.0.0.1';
  lastCacheTime = now;
  return cachedIP;
}
