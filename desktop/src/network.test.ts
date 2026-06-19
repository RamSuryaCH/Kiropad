import { describe, it, expect, vi, afterEach } from 'vitest';
import { getLocalIP, clearCache } from './network';
import os from 'os';

vi.mock('os');

describe('getLocalIP', () => {
  afterEach(() => {
    vi.resetAllMocks();
    clearCache();
  });

  it('prefers en0 (macOS Wi-Fi) over other interfaces', () => {
    vi.mocked(os.networkInterfaces).mockReturnValue({
      en1: [{ address: '192.168.1.10', family: 'IPv4', internal: false } as any],
      en0: [{ address: '192.168.1.5', family: 'IPv4', internal: false } as any],
      lo0: [{ address: '127.0.0.1', family: 'IPv4', internal: true } as any],
    });

    expect(getLocalIP()).toBe('192.168.1.5');
  });

  it('prefers en1 if en0 is missing', () => {
    vi.mocked(os.networkInterfaces).mockReturnValue({
      Ethernet: [{ address: '192.168.1.20', family: 'IPv4', internal: false } as any],
      en1: [{ address: '192.168.1.10', family: 'IPv4', internal: false } as any],
    });

    expect(getLocalIP()).toBe('192.168.1.10');
  });

  it('skips IPv6 addresses even if they are on a preferred interface', () => {
    vi.mocked(os.networkInterfaces).mockReturnValue({
      en0: [
        { address: 'fe80::1', family: 'IPv6', internal: false } as any,
        { address: '192.168.1.5', family: 'IPv4', internal: false } as any,
      ],
    });

    expect(getLocalIP()).toBe('192.168.1.5');
  });

  it('skips internal IPv4 addresses on preferred interfaces', () => {
    vi.mocked(os.networkInterfaces).mockReturnValue({
      en0: [
        { address: '127.0.0.1', family: 'IPv4', internal: true } as any,
      ],
      en1: [
        { address: '192.168.1.10', family: 'IPv4', internal: false } as any,
      ]
    });

    expect(getLocalIP()).toBe('192.168.1.10');
  });

  it('falls back to non-preferred interfaces if preferred are missing', () => {
    vi.mocked(os.networkInterfaces).mockReturnValue({
      wlan0: [
        { address: '192.168.2.50', family: 'IPv4', internal: false } as any,
      ],
    });

    expect(getLocalIP()).toBe('192.168.2.50');
  });

  it('returns 127.0.0.1 if no suitable external IPv4 address is found', () => {
    vi.mocked(os.networkInterfaces).mockReturnValue({
      lo0: [{ address: '127.0.0.1', family: 'IPv4', internal: true } as any],
      en0: [{ address: 'fe80::1', family: 'IPv6', internal: false } as any],
    });

    expect(getLocalIP()).toBe('127.0.0.1');
  });

  it('returns 127.0.0.1 if networkInterfaces returns empty or undefined interfaces', () => {
    vi.mocked(os.networkInterfaces).mockReturnValue({});

    expect(getLocalIP()).toBe('127.0.0.1');
  });
});
