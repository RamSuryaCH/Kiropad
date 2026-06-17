import { describe, it, expect } from 'vitest';
import {
  encodeQRPayload,
  decodeQRPayload,
  getBackoffDelay,
  PROTOCOL_VERSION,
  MessageType,
  SECURITY,
  CONNECTION,
} from './index';

describe('Protocol constants', () => {
  it('has a protocol version', () => {
    expect(PROTOCOL_VERSION).toBe('2.0.0');
  });

  it('message types are valid strings', () => {
    expect(MessageType.Connected).toBe('connected');
    expect(MessageType.Prompt).toBe('prompt');
    expect(MessageType.Credits).toBe('credits');
    expect(MessageType.Cancel).toBe('cancel');
  });

  it('security constants are reasonable', () => {
    expect(SECURITY.MAX_PAIR_ATTEMPTS).toBe(10);
    expect(SECURITY.LOCKOUT_DURATION_MS).toBe(5 * 60 * 1000);
    expect(SECURITY.SESSION_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000);
    expect(SECURITY.CODE_TTL_MS).toBe(5 * 60 * 1000);
    expect(SECURITY.PROMPT_COOLDOWN_MS).toBe(1000);
  });

  it('connection constants are reasonable', () => {
    expect(CONNECTION.DEFAULT_PORT).toBe(8765);
    expect(CONNECTION.RECONNECT_INITIAL_MS).toBe(2000);
    expect(CONNECTION.RECONNECT_MAX_MS).toBe(60000);
  });
});

describe('QR Payload encoding/decoding', () => {
  it('encodes a valid QR payload', () => {
    const encoded = encodeQRPayload('wss://test.trycloudflare.com', '123456');
    const parsed = JSON.parse(encoded);
    expect(parsed.url).toBe('wss://test.trycloudflare.com');
    expect(parsed.code).toBe('123456');
    expect(parsed.v).toBe(PROTOCOL_VERSION);
  });

  it('decodes a valid QR payload', () => {
    const raw = JSON.stringify({ url: 'wss://example.com', code: '654321', v: '2.0.0' });
    const result = decodeQRPayload(raw);
    expect(result).not.toBeNull();
    expect(result!.url).toBe('wss://example.com');
    expect(result!.code).toBe('654321');
    expect(result!.v).toBe('2.0.0');
  });

  it('returns null for invalid JSON', () => {
    expect(decodeQRPayload('not json')).toBeNull();
    expect(decodeQRPayload('')).toBeNull();
    expect(decodeQRPayload('{}')).toBeNull();
  });

  it('returns null for missing fields', () => {
    expect(decodeQRPayload(JSON.stringify({ url: 'test' }))).toBeNull();
    expect(decodeQRPayload(JSON.stringify({ code: '123456' }))).toBeNull();
  });

  it('roundtrips correctly', () => {
    const encoded = encodeQRPayload('wss://roundtrip.test', '999888');
    const decoded = decodeQRPayload(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.url).toBe('wss://roundtrip.test');
    expect(decoded!.code).toBe('999888');
  });
});

describe('Exponential backoff', () => {
  it('starts at initial delay for attempt 0', () => {
    const delay = getBackoffDelay(0);
    expect(delay).toBe(CONNECTION.RECONNECT_INITIAL_MS);
  });

  it('increases exponentially', () => {
    const d0 = getBackoffDelay(0);
    const d1 = getBackoffDelay(1);
    const d2 = getBackoffDelay(2);
    expect(d1).toBeGreaterThan(d0);
    expect(d2).toBeGreaterThan(d1);
    expect(d1).toBe(d0 * CONNECTION.RECONNECT_MULTIPLIER);
  });

  it('caps at maximum delay', () => {
    const d100 = getBackoffDelay(100);
    expect(d100).toBe(CONNECTION.RECONNECT_MAX_MS);
  });

  it('never exceeds max', () => {
    for (let i = 0; i < 50; i++) {
      expect(getBackoffDelay(i)).toBeLessThanOrEqual(CONNECTION.RECONNECT_MAX_MS);
    }
  });
});
