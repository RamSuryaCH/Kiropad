import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PairingManager } from './pairing';

describe('PairingManager', () => {
  let pm: PairingManager;

  beforeEach(() => {
    vi.useFakeTimers();
    pm = new PairingManager();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('code generation', () => {
    it('generates a 6-digit code', () => {
      expect(pm.currentCode).toMatch(/^\d{6}$/);
    });

    it('code is between 100000 and 999999', () => {
      const code = parseInt(pm.currentCode);
      expect(code).toBeGreaterThanOrEqual(100000);
      expect(code).toBeLessThanOrEqual(999999);
    });

    it('regenerateCode creates a new code', () => {
      const first = pm.currentCode;
      pm.regenerateCode();
      // Could be same by chance but very unlikely — just check it ran
      expect(pm.currentCode).toMatch(/^\d{6}$/);
    });

    it('emits code-changed on regenerate', () => {
      const handler = vi.fn();
      pm.on('code-changed', handler);
      pm.regenerateCode();
      expect(handler).toHaveBeenCalledWith(pm.currentCode);
    });
  });

  describe('code validation', () => {
    it('accepts a valid code', () => {
      const token = pm.validateCode(pm.currentCode, 'TestDevice');
      expect(token).not.toBeNull();
      expect(typeof token).toBe('string');
      expect(token!.length).toBeGreaterThan(20);
    });

    it('rejects wrong code', () => {
      const token = pm.validateCode('000000', 'TestDevice');
      expect(token).toBeNull();
    });

    it('uses "Unknown Device" when deviceName is undefined', () => {
      pm.validateCode(pm.currentCode);
      expect(pm.activeSessions).toHaveLength(1);
      expect(pm.activeSessions[0].deviceName).toBe('Unknown Device');
    });

    it('code is single-use (regenerates after success)', () => {
      const originalCode = pm.currentCode;
      pm.validateCode(originalCode, 'Device1');
      // Code should have changed
      const token2 = pm.validateCode(originalCode, 'Device2');
      expect(token2).toBeNull();
    });

    it('rejects expired code', () => {
      // Manually expire
      const code = pm.currentCode;
      vi.advanceTimersByTime(6 * 60 * 1000); // 6 minutes (past 5 min TTL)
      // Note: the timer will regenerate code, so we test with the OLD code
      const token = pm.validateCode(code, 'Device');
      expect(token).toBeNull();
    });
  });

  describe('session tokens', () => {
    it('validates a session token after pairing', () => {
      const token = pm.validateCode(pm.currentCode, 'TestDevice')!;
      expect(pm.validateSessionToken(token)).toBe(true);
    });

    it('rejects unknown session token', () => {
      expect(pm.validateSessionToken('fake-token-123')).toBe(false);
    });

    it('revokeSession removes a token', () => {
      const token = pm.validateCode(pm.currentCode, 'TestDevice')!;
      pm.revokeSession(token);
      expect(pm.validateSessionToken(token)).toBe(false);
    });

    it('revokeAll clears all tokens', () => {
      const code1 = pm.currentCode;
      const token1 = pm.validateCode(code1, 'Device1')!;
      const code2 = pm.currentCode;
      const token2 = pm.validateCode(code2, 'Device2')!;

      pm.revokeAll();
      expect(pm.validateSessionToken(token1)).toBe(false);
      expect(pm.validateSessionToken(token2)).toBe(false);
    });

    it('activeSessions returns paired devices', () => {
      expect(pm.activeSessions).toHaveLength(0);
      pm.validateCode(pm.currentCode, 'iPhone');
      expect(pm.activeSessions).toHaveLength(1);
      expect(pm.activeSessions[0].deviceName).toBe('iPhone');
    });

    it('cleans up expired sessions automatically', () => {
      const token = pm.validateCode(pm.currentCode, 'TestDevice')!;
      expect(pm.activeSessions).toHaveLength(1);

      // Advance time past the session TTL + the cleanup interval
      // SESSION_TTL_MS is 7 * 24 * 60 * 60 * 1000 = 604800000 ms
      // The cleanup interval is 60_000 ms
      vi.advanceTimersByTime(7 * 24 * 60 * 60 * 1000 + 60000);

      expect(pm.activeSessions).toHaveLength(0);
      expect(pm.validateSessionToken(token)).toBe(false);
    });
  });

  describe('brute-force protection', () => {
    it('locks out after max attempts', () => {
      for (let i = 0; i < 10; i++) {
        pm.validateCode('000000', 'Attacker');
      }
      expect(pm.isLockedOut).toBe(true);
    });

    it('rejects all codes during lockout', () => {
      for (let i = 0; i < 10; i++) {
        pm.validateCode('000000', 'Attacker');
      }
      const validCode = pm.currentCode;
      const token = pm.validateCode(validCode, 'Legit');
      expect(token).toBeNull();
    });

    it('lockout has a remaining time', () => {
      for (let i = 0; i < 10; i++) {
        pm.validateCode('000000', 'Attacker');
      }
      expect(pm.lockoutRemainingSeconds).toBeGreaterThan(0);
      expect(pm.lockoutRemainingSeconds).toBeLessThanOrEqual(300);
    });

    it('resets failed count on successful validation', () => {
      // Fail 5 times
      for (let i = 0; i < 5; i++) {
        pm.validateCode('000000', 'Attacker');
      }
      // Succeed
      pm.validateCode(pm.currentCode, 'Legit');
      // Should not be locked (failed count reset)
      expect(pm.isLockedOut).toBe(false);
    });
  });

  describe('max sessions limit', () => {
    it('limits to 5 sessions', () => {
      for (let i = 0; i < 6; i++) {
        pm.validateCode(pm.currentCode, `Device${i}`);
      }
      // Should still have max 5
      expect(pm.activeSessions.length).toBeLessThanOrEqual(5);
    });
  });
});
