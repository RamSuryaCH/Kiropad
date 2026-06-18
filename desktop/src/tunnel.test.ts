import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import { TunnelManager } from './tunnel';

// Mock dependencies
vi.mock('child_process', () => {
  return {
    spawn: vi.fn(),
    execSync: vi.fn(),
  };
});

vi.mock('fs', () => {
  return {
    existsSync: vi.fn(),
  };
});

import { spawn, execSync } from 'child_process';
import { existsSync } from 'fs';

describe('TunnelManager', () => {
  let tm: TunnelManager;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    tm = new TunnelManager(3000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('initializes with null url and running false', () => {
      expect(tm.url).toBeNull();
      expect(tm.running).toBe(false);
    });
  });

  describe('findCloudflared (via start)', () => {
    it('emits error if cloudflared is not found anywhere', () => {
      // existsSync returns false for all paths
      vi.mocked(existsSync).mockReturnValue(false);
      // execSync throws (which cloudflared fails)
      vi.mocked(execSync).mockImplementation(() => { throw new Error('not found'); });

      const errHandler = vi.fn();
      tm.on('error', errHandler);

      tm.start();

      expect(errHandler).toHaveBeenCalledWith('cloudflared not found. Install: brew install cloudflared');
      expect(spawn).not.toHaveBeenCalled();
    });

    it('uses explicit path if existsSync returns true', () => {
      // mock existsSync to return true only for the second candidate
      let callCount = 0;
      vi.mocked(existsSync).mockImplementation((path) => {
        callCount++;
        return callCount === 2; // e.g. /usr/local/bin/cloudflared
      });

      // spawn needs to return a dummy EventEmitter so we don't crash
      const mockProc = new EventEmitter();
      (mockProc as any).stderr = new EventEmitter();
      (mockProc as any).stdout = new EventEmitter();
      vi.mocked(spawn).mockReturnValue(mockProc as any);

      tm.start();

      expect(spawn).toHaveBeenCalledWith('/usr/local/bin/cloudflared', expect.any(Array));
    });

    it('uses execSync path if existsSync is false but execSync succeeds', () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(execSync).mockReturnValue('/custom/path/to/cloudflared\n');

      const mockProc = new EventEmitter();
      (mockProc as any).stderr = new EventEmitter();
      (mockProc as any).stdout = new EventEmitter();
      vi.mocked(spawn).mockReturnValue(mockProc as any);

      tm.start();

      expect(spawn).toHaveBeenCalledWith('/custom/path/to/cloudflared', expect.any(Array));
    });
  });

  describe('start method execution and output parsing', () => {
    it('does not spawn if process is already running', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      const mockProc = new EventEmitter();
      (mockProc as any).stderr = new EventEmitter();
      (mockProc as any).stdout = new EventEmitter();
      vi.mocked(spawn).mockReturnValue(mockProc as any);

      tm.start();
      const spawnCount = vi.mocked(spawn).mock.calls.length;

      tm.start();
      expect(vi.mocked(spawn).mock.calls.length).toBe(spawnCount);
    });

    it('spawns with correct arguments', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      const mockProc = new EventEmitter();
      (mockProc as any).stderr = new EventEmitter();
      (mockProc as any).stdout = new EventEmitter();
      vi.mocked(spawn).mockReturnValue(mockProc as any);

      tm.start();

      expect(spawn).toHaveBeenCalledWith(
        expect.any(String),
        ['tunnel', '--url', 'http://localhost:3000', '--no-autoupdate']
      );
    });

    it('extracts URL from stderr and emits url-ready', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      const mockProc = new EventEmitter();
      const mockStderr = new EventEmitter();
      (mockProc as any).stderr = mockStderr;
      (mockProc as any).stdout = new EventEmitter();
      vi.mocked(spawn).mockReturnValue(mockProc as any);

      const urlReadyHandler = vi.fn();
      tm.on('url-ready', urlReadyHandler);

      tm.start();
      expect(tm.url).toBeNull();
      expect(tm.running).toBe(false);

      mockStderr.emit('data', Buffer.from('some logs... https://test-url.trycloudflare.com more logs'));

      expect(tm.url).toBe('https://test-url.trycloudflare.com');
      expect(tm.running).toBe(true);
      expect(urlReadyHandler).toHaveBeenCalledWith('https://test-url.trycloudflare.com');
    });

    it('extracts URL from stdout and emits url-ready', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      const mockProc = new EventEmitter();
      const mockStdout = new EventEmitter();
      (mockProc as any).stderr = new EventEmitter();
      (mockProc as any).stdout = mockStdout;
      vi.mocked(spawn).mockReturnValue(mockProc as any);

      const urlReadyHandler = vi.fn();
      tm.on('url-ready', urlReadyHandler);

      tm.start();

      mockStdout.emit('data', Buffer.from('some logs... https://another-url.trycloudflare.com more logs'));

      expect(tm.url).toBe('https://another-url.trycloudflare.com');
      expect(tm.running).toBe(true);
      expect(urlReadyHandler).toHaveBeenCalledWith('https://another-url.trycloudflare.com');
    });
  });

  describe('process error handling and retries', () => {
    it('handles ENOENT process error and schedules retry', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      const mockProc = new EventEmitter();
      (mockProc as any).stderr = new EventEmitter();
      (mockProc as any).stdout = new EventEmitter();
      vi.mocked(spawn).mockReturnValue(mockProc as any);

      const errHandler = vi.fn();
      tm.on('error', errHandler);

      tm.start();

      const error: NodeJS.ErrnoException = new Error('spawn ENOENT');
      error.code = 'ENOENT';
      mockProc.emit('error', error);

      expect(errHandler).toHaveBeenCalledWith('cloudflared not installed. Run: brew install cloudflared');
      expect(tm.running).toBe(false);

      // Clear mock calls to check retry
      vi.mocked(spawn).mockClear();
      vi.advanceTimersByTime(10000);
      expect(spawn).toHaveBeenCalledTimes(1); // retried
    });

    it('handles generic process error and schedules retry', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      const mockProc = new EventEmitter();
      (mockProc as any).stderr = new EventEmitter();
      (mockProc as any).stdout = new EventEmitter();
      vi.mocked(spawn).mockReturnValue(mockProc as any);

      const errHandler = vi.fn();
      tm.on('error', errHandler);

      tm.start();

      const error = new Error('some random error');
      mockProc.emit('error', error);

      expect(errHandler).toHaveBeenCalledWith('Tunnel error: some random error');
      expect(tm.running).toBe(false);
    });

    it('handles process close, resets state, and schedules retry', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      const mockProc = new EventEmitter();
      (mockProc as any).stderr = new EventEmitter();
      (mockProc as any).stdout = new EventEmitter();
      vi.mocked(spawn).mockReturnValue(mockProc as any);

      const stoppedHandler = vi.fn();
      tm.on('stopped', stoppedHandler);

      tm.start();

      // Simulate ready
      (mockProc as any).stderr.emit('data', Buffer.from('https://test.trycloudflare.com'));
      expect(tm.running).toBe(true);
      expect(tm.url).toBeTruthy();

      // Simulate close
      mockProc.emit('close', 0);

      expect(tm.running).toBe(false);
      expect(tm.url).toBeNull();
      expect(stoppedHandler).toHaveBeenCalled();

      // Check retry
      vi.mocked(spawn).mockClear();
      vi.advanceTimersByTime(10000);
      expect(spawn).toHaveBeenCalledTimes(1);
    });
  });

  describe('stop and restart methods', () => {
        it('stop clears timers, kills process, and resets state', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      const mockProc = new EventEmitter();
      (mockProc as any).stderr = new EventEmitter();
      (mockProc as any).stdout = new EventEmitter();
      (mockProc as any).kill = vi.fn();
      vi.mocked(spawn).mockReturnValue(mockProc as any);

      tm.start();

      // Stop should kill the process
      tm.stop();
      expect((mockProc as any).kill).toHaveBeenCalledWith('SIGTERM');
      expect(tm.running).toBe(false);
      expect(tm.url).toBeNull();

      // To test timer clearing, let's trigger a close which sets a timer
      tm.start();
      mockProc.emit('close', 0); // sets timer

      tm.stop(); // should clear the timer

      vi.mocked(spawn).mockClear();
      vi.advanceTimersByTime(10000);
      expect(spawn).not.toHaveBeenCalled();
    });

    it('restart calls stop and schedules start', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      const mockProc = new EventEmitter();
      (mockProc as any).stderr = new EventEmitter();
      (mockProc as any).stdout = new EventEmitter();
      (mockProc as any).kill = vi.fn();
      vi.mocked(spawn).mockReturnValue(mockProc as any);

      tm.start();
      vi.mocked(spawn).mockClear();

      tm.restart();

      expect((mockProc as any).kill).toHaveBeenCalledWith('SIGTERM');
      expect(tm.running).toBe(false);

      vi.advanceTimersByTime(1000);
      expect(spawn).toHaveBeenCalledTimes(1);
    });
  });

  describe('synchronous error handling', () => {
    it('catches synchronous spawn errors', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(spawn).mockImplementation(() => {
        throw new Error('sync spawn fail');
      });
      const errHandler = vi.fn();
      tm.on('error', errHandler);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      tm.start();

      expect(errHandler).toHaveBeenCalledWith('cloudflared not found. Install: brew install cloudflared');
      consoleErrorSpy.mockRestore();
    });
  });
});
