import os from 'os';

let cachedIP: string | null = null;
let lastCheckTime = 0;
const CACHE_TTL_MS = 30_000;

/**
 * Get the local IPv4 address on the same network (Wi-Fi typically).
 * Falls back to 127.0.0.1 if no suitable address found.
 *
 * Result is memoized for 30 seconds to reduce the overhead of os.networkInterfaces()
 */
export function getLocalIP(): string {
  const now = Date.now();
  if (cachedIP && (now - lastCheckTime < CACHE_TTL_MS)) {
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
        lastCheckTime = now;
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
        lastCheckTime = now;
        return cachedIP;
      }
    }
  }

  cachedIP = '127.0.0.1';
  lastCheckTime = now;
  return cachedIP;
}

export function clearCache(): void {
  cachedIP = null;
  lastCheckTime = 0;
}
