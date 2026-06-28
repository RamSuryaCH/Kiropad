import os from 'os';

// Cache for os.networkInterfaces() which is a blocking synchronous system call.
let cachedIP: string | null = null;
let cacheExpiry: number = 0;
const CACHE_TTL_MS = 60000; // 60 seconds TTL

export function resetCache(): void {
  cachedIP = null;
  cacheExpiry = 0;
}

function resolveLocalIP(): string {
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
 */
export function getLocalIP(): string {
  const now = Date.now();
  if (cachedIP && now < cacheExpiry) {
    return cachedIP;
  }

  cachedIP = resolveLocalIP();
  cacheExpiry = now + CACHE_TTL_MS;
  return cachedIP;
}
