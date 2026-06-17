/**
 * @kiropad/protocol — Shared message types and constants
 *
 * This package defines the WebSocket protocol between the KiroPad
 * mobile app and the desktop bridge server. Both sides import from
 * here to stay in sync.
 */

// ─── Protocol Version ─────────────────────────────────────────────
export const PROTOCOL_VERSION = '2.0.0';

// ─── Message Types (enum prevents typos) ──────────────────────────
export enum MessageType {
  // Connection
  Connected = 'connected',
  Ping = 'ping',
  Pong = 'pong',

  // Auth
  PairRequest = 'pair_request',
  PairSuccess = 'pair_success',
  PairFailed = 'pair_failed',

  // Chat
  Prompt = 'prompt',
  Start = 'start',
  Chunk = 'chunk',
  Done = 'done',
  Cancel = 'cancel',
  Error = 'error',

  // Git
  GitReview = 'git_review',

  // Data
  ListModels = 'list_models',
  Models = 'models',
  ListProjects = 'list_projects',
  Projects = 'projects',
  GetCredits = 'get_credits',
  Credits = 'credits',
  BrowseDir = 'browse_dir',
  DirListing = 'dir_listing',
}

// ─── Security Constants ───────────────────────────────────────────
export const SECURITY = {
  /** Maximum pairing attempts before lockout */
  MAX_PAIR_ATTEMPTS: 10,
  /** Lockout duration after max attempts (ms) */
  LOCKOUT_DURATION_MS: 5 * 60 * 1000, // 5 minutes
  /** Session token validity (ms) */
  SESSION_TTL_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
  /** Pairing code validity (ms) */
  CODE_TTL_MS: 5 * 60 * 1000, // 5 minutes
  /** Minimum time between prompts (ms) — rate limiting */
  PROMPT_COOLDOWN_MS: 1000,
  /** Maximum concurrent sessions per device */
  MAX_SESSIONS: 5,
} as const;

// ─── Connection Constants ─────────────────────────────────────────
export const CONNECTION = {
  /** Default port for the bridge server */
  DEFAULT_PORT: 8765,
  /** Reconnect backoff: initial delay (ms) */
  RECONNECT_INITIAL_MS: 2000,
  /** Reconnect backoff: maximum delay (ms) */
  RECONNECT_MAX_MS: 60000,
  /** Reconnect backoff: multiplier */
  RECONNECT_MULTIPLIER: 1.5,
  /** Credits polling interval (ms) */
  CREDITS_POLL_MS: 30_000,
  /** Credits broadcast interval from server (ms) */
  CREDITS_BROADCAST_MS: 60_000,
} as const;

// ─── Effort Levels ────────────────────────────────────────────────
export type Effort = 'low' | 'medium' | 'high' | 'max';

// ─── Outgoing Messages (Phone → Bridge) ──────────────────────────
export interface PromptMessage {
  type: MessageType.Prompt;
  prompt: string;
  cwd?: string;
  agent?: string;
  model?: string;
  effort?: Effort;
  resume?: boolean;
}

export interface GitReviewMessage {
  type: MessageType.GitReview;
  cwd?: string;
  model?: string;
}

export interface BrowseDirMessage {
  type: MessageType.BrowseDir;
  path?: string;
}

export interface CancelMessage {
  type: MessageType.Cancel;
}

export interface PingMessage {
  type: MessageType.Ping;
}

export interface GetCreditsMessage {
  type: MessageType.GetCredits;
}

export interface ListModelsMessage {
  type: MessageType.ListModels;
}

export interface ListProjectsMessage {
  type: MessageType.ListProjects;
}

export type ClientMessage =
  | PromptMessage
  | GitReviewMessage
  | BrowseDirMessage
  | CancelMessage
  | PingMessage
  | GetCreditsMessage
  | ListModelsMessage
  | ListProjectsMessage;

// ─── Incoming Messages (Bridge → Phone) ──────────────────────────
export interface ConnectedMessage {
  type: MessageType.Connected;
  version: string;
  sessionToken?: string;
  deviceName?: string;
}

export interface StartMessage {
  type: MessageType.Start;
}

export interface ChunkMessage {
  type: MessageType.Chunk;
  text: string;
}

export interface DoneMessage {
  type: MessageType.Done;
  code: number;
}

export interface ErrorMessage {
  type: MessageType.Error;
  text: string;
}

export interface ModelsMessage {
  type: MessageType.Models;
  models: ModelInfo[];
  default?: string;
}

export interface ProjectsMessage {
  type: MessageType.Projects;
  projects: ProjectInfo[];
  default?: string;
}

export interface CreditsMessage {
  type: MessageType.Credits;
  used: number;
  total: number;
  plan: string;
  resetDate: string | null;
  prompts: number;
  completions: number;
  toolsUsed: number;
}

export interface DirListingMessage {
  type: MessageType.DirListing;
  path: string;
  parent: string | null;
  entries: DirEntry[];
}

export interface PongMessage {
  type: MessageType.Pong;
  ts: number;
}

export type ServerMessage =
  | ConnectedMessage
  | StartMessage
  | ChunkMessage
  | DoneMessage
  | ErrorMessage
  | ModelsMessage
  | ProjectsMessage
  | CreditsMessage
  | DirListingMessage
  | PongMessage;

// ─── Shared Data Types ────────────────────────────────────────────
export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
}

export interface ProjectInfo {
  path: string;
  name: string;
  ide?: boolean;
}

export interface DirEntry {
  name: string;
  isDir: boolean;
}

export interface CreditsUsage {
  used: number;
  total: number;
  plan: string;
  resetDate: string | null;
  prompts: number;
  completions: number;
  toolsUsed: number;
}

export interface DeviceSession {
  token: string;
  deviceName: string;
  pairedAt: number;
  lastSeen: number;
  expiresAt: number;
}

// ─── QR Code Payload ──────────────────────────────────────────────
export interface QRPayload {
  url: string;
  code: string;
  v: string; // protocol version
}

/**
 * Encode a QR payload to a JSON string for the QR code.
 */
export function encodeQRPayload(url: string, code: string): string {
  const payload: QRPayload = { url, code, v: PROTOCOL_VERSION };
  return JSON.stringify(payload);
}

/**
 * Decode a QR payload from a scanned string.
 * Returns null if the format is invalid.
 */
export function decodeQRPayload(raw: string): QRPayload | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.url === 'string' && typeof parsed.code === 'string') {
      return parsed as QRPayload;
    }
  } catch {}
  return null;
}

// ─── Utility: Exponential Backoff ─────────────────────────────────
export function getBackoffDelay(attempt: number): number {
  const delay = CONNECTION.RECONNECT_INITIAL_MS * Math.pow(CONNECTION.RECONNECT_MULTIPLIER, attempt);
  return Math.min(delay, CONNECTION.RECONNECT_MAX_MS);
}
