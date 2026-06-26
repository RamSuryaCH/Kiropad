import os from 'os';

let cachedIP: string | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60000;

export function resetCache(): void {
  cachedIP = null;
  cacheTimestamp = 0;
}

/**
 * Get the local IPv4 address on the same network (Wi-Fi typically).
 * Falls back to 127.0.0.1 if no suitable address found.
 */
export function getLocalIP(): string {
  const now = Date.now();
  if (cachedIP && (now - cacheTimestamp < CACHE_TTL_MS)) {
    return cachedIP;
  }

  // os.networkInterfaces() is a blocking synchronous system call.
  // Caching its result prevents main thread degradation during frequent UI state updates.
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
  cacheTimestamp = now;

  return ip;
}
