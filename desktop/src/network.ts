import os from 'os';

/**
 * Get the local IPv4 address on the same network (Wi-Fi typically).
 * Falls back to 127.0.0.1 if no suitable address found.
 */
export function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  let bestPriority = 99;
  let result = '127.0.0.1';

  for (const name in interfaces) {
    const iface = interfaces[name];
    if (!iface) continue;

    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        if (name === 'en0') return addr.address;

        const p = name === 'en1' ? 1 : name === 'Wi-Fi' ? 2 : name === 'Ethernet' ? 3 : 4;
        if (p < bestPriority) {
          bestPriority = p;
          result = addr.address;
        }
      }
    }
  }

  return result;
}
