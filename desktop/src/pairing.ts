import { EventEmitter } from 'events';
import crypto from 'crypto';
import { DeviceSession } from '@kiropad/protocol';

const SECURITY = {
  MAX_PAIR_ATTEMPTS: 10,
  LOCKOUT_DURATION_MS: 5 * 60 * 1000,
  SESSION_TTL_MS: 7 * 24 * 60 * 60 * 1000,
  CODE_TTL_MS: 5 * 60 * 1000,
  MAX_SESSIONS: 5,
};

/**
 * PairingManager handles 6-digit code generation and validation
 * with brute-force protection and session expiry.
 */
export class PairingManager extends EventEmitter {
  private _code: string;
  private _codeExpiry: number;
  private _sessionTokens: Map<string, DeviceSession> = new Map();
  private _expiryTimer: ReturnType<typeof setTimeout> | null = null;
  private _failedAttempts = 0;
  private _lockoutUntil = 0;

  constructor() {
    super();
    this._code = PairingManager.generateCode();
    this._codeExpiry = Date.now() + SECURITY.CODE_TTL_MS;
    this.scheduleExpiry();
    // Periodic cleanup of expired sessions
    setInterval(() => this.cleanExpiredSessions(), 60_000);
  }

  get currentCode(): string {
    return this._code;
  }

  get codeExpiry(): number {
    return this._codeExpiry;
  }

  get remainingSeconds(): number {
    return Math.max(0, Math.ceil((this._codeExpiry - Date.now()) / 1000));
  }

  get isLockedOut(): boolean {
    return Date.now() < this._lockoutUntil;
  }

  get lockoutRemainingSeconds(): number {
    return Math.max(0, Math.ceil((this._lockoutUntil - Date.now()) / 1000));
  }

  /**
   * Validate a 6-digit pairing code from a connecting device.
   * Returns a session token if valid, null if expired/invalid/locked.
   */
  validateCode(code: string, deviceName?: string): string | null {
    // Brute-force protection
    if (this.isLockedOut) {
      return null;
    }

    if (code !== this._code || Date.now() > this._codeExpiry) {
      this._failedAttempts++;
      if (this._failedAttempts >= SECURITY.MAX_PAIR_ATTEMPTS) {
        this._lockoutUntil = Date.now() + SECURITY.LOCKOUT_DURATION_MS;
        this._failedAttempts = 0;
        this.emit('lockout', this.lockoutRemainingSeconds);
      }
      return null;
    }

    // Code is valid — reset failed attempts
    this._failedAttempts = 0;

    // Enforce max sessions
    if (this._sessionTokens.size >= SECURITY.MAX_SESSIONS) {
      // Remove oldest session
      const oldest = [...this._sessionTokens.entries()]
        .sort((a, b) => a[1].pairedAt - b[1].pairedAt)[0];
      if (oldest) this._sessionTokens.delete(oldest[0]);
    }

    // Issue a session token with expiry
    const token = crypto.randomBytes(32).toString('base64url');
    this._sessionTokens.set(token, {
      token,
      deviceName: deviceName || 'Unknown Device',
      pairedAt: Date.now(),
      lastSeen: Date.now(),
      expiresAt: Date.now() + SECURITY.SESSION_TTL_MS,
    });

    // Regenerate code after successful pairing (one-time use)
    this.regenerateCode();

    return token;
  }

  /**
   * Validate an existing session token for reconnection.
   * Returns false if expired.
   */
  validateSessionToken(token: string): boolean {
    const session = this._sessionTokens.get(token);
    if (!session) return false;
    if (Date.now() > session.expiresAt) {
      this._sessionTokens.delete(token);
      return false;
    }
    session.lastSeen = Date.now();
    return true;
  }

  revokeSession(token: string): void {
    this._sessionTokens.delete(token);
  }

  revokeAll(): void {
    this._sessionTokens.clear();
  }

  regenerateCode(): void {
    this._code = PairingManager.generateCode();
    this._codeExpiry = Date.now() + SECURITY.CODE_TTL_MS;
    this.scheduleExpiry();
    this.emit('code-changed', this._code);
  }

  get activeSessions(): DeviceSession[] {
    return [...this._sessionTokens.values()];
  }

  private cleanExpiredSessions(): void {
    const now = Date.now();
    for (const [token, session] of this._sessionTokens) {
      if (now > session.expiresAt) {
        this._sessionTokens.delete(token);
      }
    }
  }

  private scheduleExpiry(): void {
    if (this._expiryTimer) clearTimeout(this._expiryTimer);
    this._expiryTimer = setTimeout(() => {
      this.regenerateCode();
    }, SECURITY.CODE_TTL_MS);
  }

  private static generateCode(): string {
    return crypto.randomInt(100000, 999999 + 1).toString();
  }
}
