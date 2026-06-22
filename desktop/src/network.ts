import os from 'os';

// Export for tests to be able to reset the cache
export function resetCache(): void {
  cachedIP = null;
  lastCheck = 0;
}

let cachedIP: string | null = null;
let lastCheck = 0;
const CACHE_TTL_MS = 30000;

/**
 * Get the local IPv4 address on the same network (Wi-Fi typically).
 * Falls back to 127.0.0.1 if no suitable address found.
 */
export function getLocalIP(): string {
  const now = Date.now();
  if (cachedIP !== null && (now - lastCheck) < CACHE_TTL_MS) {
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
        lastCheck = now;
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
        lastCheck = now;
        return cachedIP;
      }
    }
  }

  cachedIP = '127.0.0.1';
  lastCheck = now;
  return cachedIP;
}
