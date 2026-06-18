import { EventEmitter } from 'events';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { spawn, execSync, ChildProcessWithoutNullStreams } from 'child_process';
import { readdir, readFile } from 'fs/promises';
import { basename, dirname, join, resolve, isAbsolute, relative } from 'path';
import { homedir } from 'os';
import { URL, fileURLToPath } from 'url';
import { PairingManager } from './pairing';

const WORKSPACE = process.env.KIROPAD_WORKSPACE || process.cwd();
const TRUST_ALL_TOOLS = process.env.KIROPAD_TRUST_ALL_TOOLS === '1';

const KIRO_NOT_FOUND =
  'kiro-cli not found. Run: curl -fsSL https://cli.kiro.dev/install | bash';

// eslint-disable-next-line no-control-regex
const CSI_PATTERN = /[\u001B\u009B][[\]()#;?]*(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-ntqry=><~])/g;
// eslint-disable-next-line no-control-regex
const OSC_PATTERN = /\u001B\][\s\S]*?(?:\u0007|\u001B\\)/g;
// eslint-disable-next-line no-control-regex
const CONTROL_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function stripAnsi(input: string): string {
  return input
    .replace(OSC_PATTERN, '')
    .replace(CSI_PATTERN, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '')
    .replace(CONTROL_PATTERN, '');
}

// Build a comprehensive PATH for child processes.
// Electron packaged apps have a minimal PATH that doesn't include
// user installs like ~/.local/bin (kiro-cli) or /opt/homebrew/bin.
const HOME = process.env.HOME || homedir();
const EXPANDED_PATH = [
  `${HOME}/.local/bin`,         // kiro-cli installs here
  '/opt/homebrew/bin',           // Homebrew on Apple Silicon
  '/usr/local/bin',              // Homebrew on Intel / manual installs
  '/usr/bin',
  '/bin',
  '/usr/sbin',
  '/sbin',
  process.env.PATH || '',
].join(':');

const CHILD_ENV = {
  ...process.env,
  NO_COLOR: '1',
  TERM: 'dumb',
  PATH: EXPANDED_PATH,
};

// Rate limiting: track last prompt time per device
const lastPromptTime = new Map<WebSocket, number>();
const PROMPT_COOLDOWN_MS = 1000;

/**
 * Sanitize a cwd path — must be absolute, not contain traversal, and be bound to WORKSPACE.
 */
export function sanitizeCwd(cwd: string | undefined): string {
  if (!cwd) return WORKSPACE;
  const resolved = resolve(WORKSPACE, cwd);
  const rel = relative(WORKSPACE, resolved);
  // Ensure the resolved path is within the WORKSPACE
  if (rel.startsWith('..') || isAbsolute(rel)) return WORKSPACE;
  return resolved;
}

interface ConnectedDevice {
  ws: WebSocket;
  name: string;
  sessionToken: string;
  connectedAt: number;
}

export class BridgeServer extends EventEmitter {
  private port: number;
  private pairing: PairingManager;
  private server: http.Server | null = null;
  private wss: WebSocketServer | null = null;
  private devices: Map<WebSocket, ConnectedDevice> = new Map();
  private activeChildren: Map<WebSocket, ChildProcessWithoutNullStreams> = new Map();
  private _isRunning = false;
  private creditsInterval: ReturnType<typeof setInterval> | null = null;

  constructor(port: number, pairing: PairingManager) {
    super();
    this.port = port;
    this.pairing = pairing;
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  get connectedDeviceCount(): number {
    return this.devices.size;
  }

  start(): void {
    this.server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ name: 'kiropad-desktop', version: '2.0.0', status: 'ok' }));
    });

    this.wss = new WebSocketServer({ noServer: true });

    this.server.on('upgrade', (req, socket, head) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const code = url.searchParams.get('code');
      const session = url.searchParams.get('session');
      const deviceName = url.searchParams.get('device') || 'Unknown Device';

      let sessionToken: string | null = null;

      if (session) {
        if (!this.pairing.validateSessionToken(session)) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }
        sessionToken = session;
      } else if (code) {
        if (this.pairing.isLockedOut) {
          socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
          socket.destroy();
          return;
        }
        sessionToken = this.pairing.validateCode(code, deviceName);
        if (!sessionToken) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }
      } else {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      const finalToken = sessionToken;
      this.wss!.handleUpgrade(req, socket, head, (ws) => {
        this.wss!.emit('connection', ws, req, { deviceName, sessionToken: finalToken });
      });
    });

    this.wss.on('connection', (ws: WebSocket, _req: http.IncomingMessage, meta: { deviceName: string; sessionToken: string }) => {
      const device: ConnectedDevice = {
        ws,
        name: meta.deviceName,
        sessionToken: meta.sessionToken,
        connectedAt: Date.now(),
      };
      this.devices.set(ws, device);

      this.send(ws, {
        type: 'connected',
        version: '2.0.0',
        sessionToken: meta.sessionToken,
        deviceName: meta.deviceName,
      });

      this.emit('device-connected', { name: meta.deviceName });

      ws.on('message', (raw) => {
        this.handleMessage(ws, raw.toString());
      });

      ws.on('error', () => {});

      ws.on('close', () => {
        const child = this.activeChildren.get(ws);
        if (child) {
          this.activeChildren.delete(ws);
          try { child.kill('SIGTERM'); } catch {}
        }
        lastPromptTime.delete(ws);
        this.devices.delete(ws);
        this.emit('device-disconnected', { name: device.name });
      });
    });

    this.server.listen(this.port, '0.0.0.0', () => {
      this._isRunning = true;
      console.log(`KiroPad bridge listening on ws://0.0.0.0:${this.port}`);
    });

    this.creditsInterval = setInterval(() => this.broadcastCredits(), 60_000);
  }

  stop(): void {
    if (this.creditsInterval) {
      clearInterval(this.creditsInterval);
      this.creditsInterval = null;
    }
    this.disconnectAll();
    this.wss?.close();
    this.server?.close();
    this._isRunning = false;
  }

  disconnectAll(): void {
    for (const [ws] of this.devices) {
      ws.close();
    }
    this.devices.clear();
    this.pairing.revokeAll();
  }

  private send(ws: WebSocket, payload: unknown): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  private handleMessage(ws: WebSocket, raw: string): void {
    let msg: any;
    try {
      msg = JSON.parse(raw);
    } catch {
      this.send(ws, { type: 'error', text: 'Invalid JSON' });
      return;
    }

    switch (msg.type) {
      case 'prompt':
        this.handlePrompt(ws, msg);
        break;
      case 'git_review':
        this.handleGitReview(ws, msg);
        break;
      case 'browse_dir':
        void this.handleBrowseDir(ws, msg);
        break;
      case 'list_models':
        this.handleListModels(ws);
        break;
      case 'list_projects':
        void this.handleListProjects(ws);
        break;
      case 'get_credits':
        this.handleGetCredits(ws);
        break;
      case 'ping':
        this.send(ws, { type: 'pong', ts: Date.now() });
        break;
      case 'cancel':
        this.handleCancel(ws);
        break;
      default:
        this.send(ws, { type: 'error', text: 'Unknown message type' });
    }
  }

  private streamChild(ws: WebSocket, child: ChildProcessWithoutNullStreams): void {
    let started = false;
    this.activeChildren.set(ws, child);

    child.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') {
        this.send(ws, { type: 'error', text: KIRO_NOT_FOUND });
      } else {
        this.send(ws, { type: 'error', text: err.message });
      }
      this.activeChildren.delete(ws);
      this.send(ws, { type: 'done', code: 1 });
      this.handleGetCredits(ws);
    });

    child.on('spawn', () => {
      started = true;
      this.send(ws, { type: 'start' });
    });

    child.stdout.on('data', (data: Buffer) => {
      this.send(ws, { type: 'chunk', text: stripAnsi(data.toString()) });
    });

    child.stderr.on('data', (data: Buffer) => {
      this.send(ws, { type: 'error', text: stripAnsi(data.toString()) });
    });

    child.on('close', (code) => {
      if (this.activeChildren.get(ws) === child) {
        this.activeChildren.delete(ws);
      }
      if (started) {
        this.send(ws, { type: 'done', code: code ?? 0 });
        this.handleGetCredits(ws);
      }
    });
  }

  private handleCancel(ws: WebSocket): void {
    const child = this.activeChildren.get(ws);
    if (child) {
      this.activeChildren.delete(ws);
      try { child.kill('SIGTERM'); } catch {}
      this.send(ws, { type: 'error', text: '\n[cancelled]' });
      this.send(ws, { type: 'done', code: 130 });
    }
  }

  private handlePrompt(ws: WebSocket, msg: any): void {
    // Rate limiting
    const now = Date.now();
    const last = lastPromptTime.get(ws) || 0;
    if (now - last < PROMPT_COOLDOWN_MS) {
      this.send(ws, { type: 'error', text: 'Rate limited. Wait a moment before sending again.' });
      return;
    }
    lastPromptTime.set(ws, now);

    const cwd = sanitizeCwd(msg.cwd);
    const args: string[] = ['chat', '--no-interactive'];

    // Only add --trust-all-tools if explicitly enabled
    if (TRUST_ALL_TOOLS) {
      args.push('--trust-all-tools');
    }

    if (msg.agent) args.push('--agent', String(msg.agent));
    if (msg.model) args.push('--model', String(msg.model));
    if (msg.effort) args.push('--effort', String(msg.effort));
    if (msg.resume) args.push('--resume');

    // Sanitize prompt — limit length
    const prompt = String(msg.prompt || '').slice(0, 30_000);
    if (!prompt.trim()) {
      this.send(ws, { type: 'error', text: 'Empty prompt' });
      return;
    }
    args.push(prompt);

    try {
      const child = spawn('kiro-cli', args, { cwd, env: CHILD_ENV });
      this.streamChild(ws, child);
    } catch {
      this.send(ws, { type: 'error', text: KIRO_NOT_FOUND });
      this.send(ws, { type: 'done', code: 1 });
    }
  }

  private handleGitReview(ws: WebSocket, msg: any): void {
    const cwd = sanitizeCwd(msg.cwd);
    const reviewPrompt =
      'Review these git changes. List each changed file, summarise what changed, and flag any issues.';

    let git: ChildProcessWithoutNullStreams;
    try {
      git = spawn('git', ['diff', 'HEAD'], { cwd, env: CHILD_ENV });
    } catch {
      this.send(ws, { type: 'error', text: 'git not found.' });
      this.send(ws, { type: 'done', code: 1 });
      return;
    }

    git.on('error', (err: NodeJS.ErrnoException) => {
      this.send(ws, { type: 'error', text: `git error: ${err.message}` });
      this.send(ws, { type: 'done', code: 1 });
    });

    const kiroArgs = ['chat', '--no-interactive'];
    if (TRUST_ALL_TOOLS) kiroArgs.push('--trust-all-tools');
    if (msg.model) kiroArgs.push('--model', String(msg.model));
    kiroArgs.push(reviewPrompt);

    let kiro: ChildProcessWithoutNullStreams;
    try {
      kiro = spawn('kiro-cli', kiroArgs, { cwd, env: CHILD_ENV });
    } catch {
      this.send(ws, { type: 'error', text: KIRO_NOT_FOUND });
      this.send(ws, { type: 'done', code: 1 });
      return;
    }

    this.streamChild(ws, kiro);
    git.stdout.on('data', (data: Buffer) => {
      if (kiro.stdin.writable) kiro.stdin.write(data);
    });
    git.on('close', () => {
      if (kiro.stdin.writable) kiro.stdin.end();
    });
  }

  private async handleBrowseDir(ws: WebSocket, msg: any): Promise<void> {
    const dir = sanitizeCwd(msg.path) || (await this.defaultProject());
    try {
      const dirents = await readdir(dir, { withFileTypes: true });
      const entries = dirents
        .filter((d) => !d.name.startsWith('.')) // Hide dotfiles by default
        .map((d) => ({ name: d.name, isDir: d.isDirectory() }))
        .sort((a, b) => {
          if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
          return a.name.localeCompare(b.name);
        })
        .slice(0, 400);
      const parent = dirname(dir);
      this.send(ws, {
        type: 'dir_listing',
        path: dir,
        parent: parent === dir ? null : parent,
        entries,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown error';
      this.send(ws, { type: 'error', text: `Cannot read directory: ${message}` });
    }
  }

  private handleListModels(ws: WebSocket): void {
    let child: ChildProcessWithoutNullStreams;
    try {
      child = spawn('kiro-cli', ['chat', '--list-models', '--format', 'json'], { env: CHILD_ENV });
    } catch {
      this.send(ws, { type: 'error', text: KIRO_NOT_FOUND });
      return;
    }

    let out = '';
    child.on('error', (err: NodeJS.ErrnoException) => {
      this.send(ws, { type: 'error', text: err.code === 'ENOENT' ? KIRO_NOT_FOUND : err.message });
    });
    child.stdout.on('data', (data: Buffer) => { out += data.toString(); });
    child.on('close', () => {
      try {
        const parsed = JSON.parse(stripAnsi(out));
        const models = (parsed.models ?? []).map(
          (m: { model_id: string; model_name: string; description?: string }) => ({
            id: m.model_id,
            name: m.model_name,
            description: m.description ?? '',
          })
        );
        this.send(ws, { type: 'models', models, default: parsed.default_model ?? 'auto' });
      } catch {
        this.send(ws, { type: 'error', text: 'Could not parse model list.' });
      }
    });
  }

  private async handleListProjects(ws: WebSocket): Promise<void> {
    this.send(ws, {
      type: 'projects',
      projects: await this.resolveProjects(),
      default: await this.defaultProject(),
    });
  }

  private handleGetCredits(ws: WebSocket): void {
    let child: ChildProcessWithoutNullStreams;
    try {
      child = spawn('kiro-cli', ['usage', '--format', 'json'], { env: CHILD_ENV });
    } catch {
      this.send(ws, { type: 'credits', used: 0, total: 0, plan: '', resetDate: null, prompts: 0, completions: 0, toolsUsed: 0 });
      return;
    }

    let out = '';
    child.on('error', () => {
      this.send(ws, { type: 'credits', used: 0, total: 0, plan: '', resetDate: null, prompts: 0, completions: 0, toolsUsed: 0 });
    });
    child.stdout.on('data', (data: Buffer) => { out += data.toString(); });
    child.on('close', (code) => {
      if (code !== 0 || !out.trim()) {
        this.send(ws, { type: 'credits', used: 0, total: 0, plan: '', resetDate: null, prompts: 0, completions: 0, toolsUsed: 0 });
        return;
      }
      try {
        const cleaned = stripAnsi(out);
        const parsed = JSON.parse(cleaned);
        this.send(ws, {
          type: 'credits',
          used: parsed.used ?? parsed.credits_used ?? 0,
          total: parsed.total ?? parsed.credits_total ?? parsed.limit ?? 0,
          plan: parsed.plan ?? parsed.tier ?? '',
          resetDate: parsed.reset_date ?? parsed.resetDate ?? null,
          prompts: parsed.prompts ?? 0,
          completions: parsed.completions ?? 0,
          toolsUsed: parsed.tools_used ?? parsed.toolsUsed ?? 0,
        });
      } catch {
        this.send(ws, { type: 'credits', used: 0, total: 0, plan: '', resetDate: null, prompts: 0, completions: 0, toolsUsed: 0 });
      }
    });
  }

  private broadcastCredits(): void {
    const clients = [...this.devices.keys()].filter(
      (c) => c.readyState === WebSocket.OPEN
    );
    if (clients.length === 0) return;

    let child: ChildProcessWithoutNullStreams;
    try {
      child = spawn('kiro-cli', ['usage', '--format', 'json'], { env: CHILD_ENV });
    } catch { return; }

    let out = '';
    child.on('error', () => {});
    child.stdout.on('data', (data: Buffer) => { out += data.toString(); });
    child.on('close', (code) => {
      if (code !== 0 || !out.trim()) return;
      try {
        const cleaned = stripAnsi(out);
        const parsed = JSON.parse(cleaned);
        const payload = JSON.stringify({
          type: 'credits',
          used: parsed.used ?? parsed.credits_used ?? 0,
          total: parsed.total ?? parsed.credits_total ?? parsed.limit ?? 0,
          plan: parsed.plan ?? parsed.tier ?? '',
          resetDate: parsed.reset_date ?? parsed.resetDate ?? null,
          prompts: parsed.prompts ?? 0,
          completions: parsed.completions ?? 0,
          toolsUsed: parsed.tools_used ?? parsed.toolsUsed ?? 0,
        });
        for (const client of clients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
          }
        }
      } catch {}
    });
  }

  private async detectIdeProjects(): Promise<string[]> {
    const storageFile = join(
      homedir(),
      'Library/Application Support/Kiro/User/globalStorage/storage.json'
    );
    try {
      const raw = await readFile(storageFile, 'utf8');
      const parsed = JSON.parse(raw);
      const ws = parsed.windowsState || {};
      const uris: string[] = [];
      if (ws.lastActiveWindow?.folder) uris.push(ws.lastActiveWindow.folder);
      for (const w of ws.openedWindows || []) {
        if (w?.folder) uris.push(w.folder);
      }
      const paths = uris.map((u) => {
        try { return u.startsWith('file://') ? fileURLToPath(u) : u; }
        catch { return u; }
      });
      return Array.from(new Set(paths));
    } catch { return []; }
  }

  private async resolveProjects(): Promise<{ path: string; name: string; ide: boolean }[]> {
    const ide = await this.detectIdeProjects();
    const configured = (process.env.KIROPAD_PROJECTS || '')
      .split(',').map((p) => p.trim()).filter(Boolean);
    const paths = Array.from(new Set([...ide, WORKSPACE, ...configured]));
    return paths.map((p) => ({ path: p, name: basename(p) || p, ide: ide.includes(p) }));
  }

  private async defaultProject(): Promise<string> {
    const ide = await this.detectIdeProjects();
    return ide[0] || WORKSPACE;
  }
}
