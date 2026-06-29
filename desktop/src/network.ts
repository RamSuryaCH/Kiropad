import os from 'os';

let cachedIP: string | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 30000; // 30 seconds

export function resetCache(): void {
  cachedIP = null;
  lastCacheTime = 0;
}

/**
 * Get the local IPv4 address on the same network (Wi-Fi typically).
 * Falls back to 127.0.0.1 if no suitable address found.
 * Caches the result to prevent blocking the main thread with os.networkInterfaces().
 */
export function getLocalIP(): string {
  const now = Date.now();
  if (cachedIP && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedIP;
  }

  const interfaces = os.networkInterfaces();

  let ip = '127.0.0.1';

  // Prefer en0 (Wi-Fi on macOS) first
  for (const name of ['en0', 'en1', 'Wi-Fi', 'Ethernet']) {
    const iface = interfaces[name];
    if (!iface) continue;
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        ip = addr.address;
        break;
      }
    }
    if (ip !== '127.0.0.1') break;
  }

  // Fallback: any non-internal IPv4
  if (ip === '127.0.0.1') {
    for (const iface of Object.values(interfaces)) {
      if (!iface) continue;
      for (const addr of iface) {
        if (addr.family === 'IPv4' && !addr.internal) {
          ip = addr.address;
          break;
        }
      }
      if (ip !== '127.0.0.1') break;
    }
  }

  cachedIP = ip;
  lastCacheTime = now;
  return ip;
}
