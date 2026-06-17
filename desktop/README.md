# KiroPad Desktop (Mac)

A standalone macOS application that replaces the old terminal-based bridge server. It runs as a menu bar app, displays a 6-digit pairing code, and manages the WebSocket bridge internally.

## How it works

1. **Launch** KiroPad on your Mac — it opens a small window showing a 6-digit code.
2. **Open KiroPad** on your phone and enter the code.
3. **Done** — devices are paired. The phone stores a session token for automatic reconnection.

No terminal, no manual IP entry, no token configuration needed.

## Architecture

```
┌──────────────────────────────────────┐
│  KiroPad Desktop (Electron)          │
│                                      │
│  ┌────────────┐  ┌───────────────┐  │
│  │ Pairing    │  │ Bridge Server │  │
│  │ Manager    │──│ (WebSocket)   │  │
│  │ (6-digit)  │  │ → kiro-cli    │  │
│  └────────────┘  └───────────────┘  │
│         │                │           │
│    generates         handles         │
│    codes             prompts         │
└─────────┼────────────────┼───────────┘
          │                │
    ┌─────▼────────────────▼────┐
    │  Phone (React Native)     │
    │  Enter code → paired      │
    │  Auto-reconnects via      │
    │  session token             │
    └───────────────────────────┘
```

## Pairing Flow

1. Mac generates a cryptographically random 6-digit code
2. Code expires after 5 minutes (auto-regenerates)
3. Phone connects with `?code=123456&device=iPhone`
4. If valid → server issues a session token (`base64url`, 32 bytes)
5. Phone stores token in AsyncStorage
6. On reconnection, phone uses `?session=<token>` (no code needed)
7. Code is single-use: consumed after successful pairing

## Development

```bash
npm install
npm run dev      # Compile TypeScript + launch Electron
```

## Build a distributable .app

```bash
npm run dist     # Creates .dmg and .zip in dist/
```

The packaged app is self-contained — no Node.js or terminal required.

## Menu Bar

KiroPad lives in the macOS menu bar. Click the icon to:
- Show the pairing window
- Generate a new code
- See connected devices
- Quit

Closing the window hides it to the tray — the bridge keeps running.

## Requirements

- **macOS 12+**
- **kiro-cli** installed: `curl -fsSL https://cli.kiro.dev/install | bash`
- **KIRO_API_KEY** in your shell environment

## Environment Variables (optional)

| Variable            | Default     | Purpose                              |
| ------------------- | ----------- | ------------------------------------ |
| `KIROPAD_WORKSPACE` | `cwd`       | Default project directory            |
| `KIROPAD_PROJECTS`  | —           | Comma-separated extra project paths  |
