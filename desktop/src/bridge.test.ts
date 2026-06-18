import { describe, it, expect, vi } from 'vitest';
import { sanitizeCwd } from './bridge';
import { resolve } from 'path';

// Note: The WORKSPACE used in bridge.ts defaults to process.cwd() or process.env.KIROPAD_WORKSPACE
const WORKSPACE = process.env.KIROPAD_WORKSPACE || process.cwd();

describe('sanitizeCwd', () => {
  it('returns WORKSPACE for undefined', () => {
    expect(sanitizeCwd(undefined)).toBe(WORKSPACE);
  });

  it('returns WORKSPACE for empty string', () => {
    expect(sanitizeCwd('')).toBe(WORKSPACE);
  });

  it('resolves a valid relative path within WORKSPACE', () => {
    const expected = resolve(WORKSPACE, 'src');
    expect(sanitizeCwd('src')).toBe(expected);
  });

  it('resolves a valid absolute path within WORKSPACE', () => {
    const absPath = resolve(WORKSPACE, 'src/test');
    expect(sanitizeCwd(absPath)).toBe(absPath);
  });

  it('blocks absolute paths outside WORKSPACE', () => {
    // e.g. /etc or C:\Windows
    expect(sanitizeCwd('/etc')).toBe(WORKSPACE);
  });

  it('blocks directory traversal outside WORKSPACE', () => {
    expect(sanitizeCwd('../../../etc')).toBe(WORKSPACE);
  });

  it('allows traversal if it stays within WORKSPACE', () => {
    const expected = resolve(WORKSPACE, 'src');
    // Using src/test/../ should resolve to src
    expect(sanitizeCwd('src/test/..')).toBe(expected);
  });
});
