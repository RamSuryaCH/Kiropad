import { spawn, ChildProcess, execSync } from 'child_process';
import { EventEmitter } from 'events';
import { existsSync } from 'fs';

/**
 * TunnelManager automatically starts a Cloudflare quick tunnel
 * that exposes the local bridge server to the internet.
 *
 * This means the phone can connect from anywhere (cellular, different Wi-Fi)
 * without any port forwarding or network configuration.
 *
 * The tunnel URL (e.g. wss://random-words.trycloudflare.com) is displayed
 * in the Mac app and used by the phone to connect.
 */
export class TunnelManager extends EventEmitter {
  private process: ChildProcess | null = null;
  private _url: string | null = null;
  private _running = false;
  private port: number;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(port: number) {
    super();
    this.port = port;
  }

  get url(): string | null {
    return this._url;
  }

  get running(): boolean {
    return this._running;
  }

  /**
   * Start the cloudflared tunnel. Automatically parses the public URL
   * from cloudflared's stderr output.
   */
  start(): void {
    if (this.process) return;

    // Electron packaged apps don't inherit the user's shell PATH.
    // Look for cloudflared in common locations.
    const cloudflaredPath = this.findCloudflared();
    if (!cloudflaredPath) {
      this.emit('error', 'cloudflared not found. Install: brew install cloudflared');
      return;
    }

    try {
      this.process = spawn(cloudflaredPath, [
        'tunnel',
        '--url', `http://localhost:${this.port}`,
        '--no-autoupdate',
      ]);
    } catch (err) {
      console.error('Failed to start cloudflared:', err);
      this.emit('error', 'cloudflared not found. Install: brew install cloudflared');
      return;
    }

    const proc = this.process;

    proc.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') {
        this.emit('error', 'cloudflared not installed. Run: brew install cloudflared');
      } else {
        this.emit('error', `Tunnel error: ${err.message}`);
      }
      this._running = false;
      this.process = null;
      this.scheduleRetry();
    });

    // cloudflared prints the tunnel URL to stderr
    let stderrBuffer = '';
    proc.stderr?.on('data', (data: Buffer) => {
      stderrBuffer += data.toString();
      const match = stderrBuffer.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match && !this._url) {
        this._url = match[0];
        this._running = true;
        console.log(`Tunnel active: ${this._url}`);
        this.emit('url-ready', this._url);
      }
    });

    // Also check stdout (some versions print there)
    proc.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match && !this._url) {
        this._url = match[0];
        this._running = true;
        console.log(`Tunnel active: ${this._url}`);
        this.emit('url-ready', this._url);
      }
    });

    proc.on('close', (code) => {
      console.log(`cloudflared exited with code ${code}`);
      this._running = false;
      this._url = null;
      this.process = null;
      this.emit('stopped');
      this.scheduleRetry();
    });
  }

  /**
   * Stop the tunnel.
   */
  stop(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.process) {
      try {
        this.process.kill('SIGTERM');
      } catch {}
      this.process = null;
    }
    this._running = false;
    this._url = null;
  }

  /**
   * Restart the tunnel (generates a new URL).
   */
  restart(): void {
    this.stop();
    setTimeout(() => this.start(), 1000);
  }

  private findCloudflared(): string | null {
    // Check common install locations since packaged Electron apps
    // don't inherit the user's shell PATH
    const candidates = [
      '/opt/homebrew/bin/cloudflared',       // Homebrew on Apple Silicon
      '/usr/local/bin/cloudflared',          // Homebrew on Intel / manual install
      '/usr/bin/cloudflared',                // System install
      `${process.env.HOME}/.cloudflared/bin/cloudflared`, // User install
    ];

    for (const path of candidates) {
      if (existsSync(path)) return path;
    }

    // Last resort: try to find it via shell
    try {
      const result = execSync('which cloudflared', {
        encoding: 'utf8',
        env: { ...process.env, PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:${process.env.PATH || ''}` },
      }).trim();
      if (result) return result;
    } catch {}

    return null;
  }

  private scheduleRetry(): void {
    if (this.retryTimer) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this._url = null;
      this.start();
    }, 10_000);
  }
}
