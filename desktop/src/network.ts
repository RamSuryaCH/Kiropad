import os from 'os';

let cachedIP: string | null = null;
let cacheExpiration = 0;
const CACHE_TTL_MS = 60000; // 60 seconds

export function resetCache(): void {
  cachedIP = null;
  cacheExpiration = 0;
}

function calculateLocalIP(): string {
  const interfaces = os.networkInterfaces();

  // Prefer en0 (Wi-Fi on macOS) first
  for (const name of ['en0', 'en1', 'Wi-Fi', 'Ethernet']) {
    const iface = interfaces[name];
    if (!iface) continue;
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address;
      }
    }
  }

  // Fallback: any non-internal IPv4
  for (const iface of Object.values(interfaces)) {
    if (!iface) continue;
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address;
      }
    }
  }

  return '127.0.0.1';
}

/**
 * Get the local IPv4 address on the same network (Wi-Fi typically).
 * Falls back to 127.0.0.1 if no suitable address found.
 * Result is cached for 60 seconds to avoid blocking the main thread.
 */
export function getLocalIP(): string {
  const now = Date.now();
  if (cachedIP !== null && now < cacheExpiration) {
    return cachedIP;
  }

  cachedIP = calculateLocalIP();
  cacheExpiration = now + CACHE_TTL_MS;
  return cachedIP;
}
