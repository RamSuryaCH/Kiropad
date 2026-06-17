# KiroPad — Brutal Honest Review & Improvement Plan

## Executive Summary

KiroPad is a creative and unique project — a mobile remote control for Kiro AI with a companion Mac desktop app. The idea is genuinely useful: drive your AI coding assistant from your phone while away from your desk. However, the project has significant issues that would frustrate open-source users and hurt credibility on release. This document covers everything honestly.

---

## The Good (Pros)

1. **Unique concept** — No one else has built a mobile remote for Kiro. First-mover advantage.
2. **Solid UI design** — The dark theme, color system, and component library are polished. The `ThemeContext` with light/dark support is well-structured.
3. **Feature-complete chat** — Streaming responses, markdown rendering, code blocks with copy, favorites, search — all present.
4. **Real architecture** — Three-package monorepo (app/desktop/bridge) with clear separation of concerns.
5. **Pairing flow concept** — The 6-digit code + session token + auto-reconnect flow is a good UX idea.
6. **Auto-tunnel** — Cloudflare tunnel auto-start from the desktop app removes manual network config.
7. **Credits tracking** — Real-time usage display with plan info is a nice touch.
8. **TypeScript throughout** — Full type safety across all three packages.

---

## The Bad (Critical Issues for Open Source Release)

### 🔴 1. Security — Dangerous by Default

**Problem:** The bridge runs `kiro-cli --trust-all-tools`, which means anyone who connects can execute arbitrary commands on your Mac. The README mentions this but the app doesn't enforce safety.

**Fixes needed:**
- Remove `--trust-all-tools` or make it opt-in with a visible warning in the desktop app UI
- Add rate limiting on the WebSocket (a malicious client could spam prompts)
- Session tokens never expire — they should have a TTL (24h or 7 days)
- No brute-force protection on pairing codes (10 attempts/minute max should be enforced)
- The bridge server has no input sanitization — the `cwd` field from the phone is passed directly to `spawn()`

### 🔴 2. The `bridge/` and `desktop/` Duplication

**Problem:** You have TWO bridge implementations — `bridge/src/server.ts` (standalone Node) and `desktop/src/bridge.ts` (Electron). They're nearly identical but drift separately. Bug fixes in one don't appear in the other.

**Fix:** Either:
- Delete `bridge/` entirely (desktop app replaces it) and update the README
- Or extract shared logic into a `packages/core/` shared library

### 🔴 3. Installation Will Fail for Most Users

**Problems:**
- `kiro-cli` is required but may not be publicly available or easy to install for everyone
- `cloudflared` is required for internet access — not bundled, not auto-installed
- The desktop DMG is 542MB (because Electron) — no universal binary, arm64 only
- No iOS build instructions at all
- No automated install script

**Fixes:**
- Add a `scripts/install.sh` that checks prerequisites and guides the user
- Bundle `cloudflared` binary inside the Electron app (or offer to download it on first launch)
- Provide both arm64 and x64 builds
- Add clear "Requirements" section at the TOP of README, not buried in the middle

### 🔴 4. The Pairing Flow is Broken in Practice

**Problem (you already hit this):** The phone must manually paste the tunnel URL before entering the code. This is two steps where it should be one.

**Better approach:** Embed a short code (like a 8-char alphanumeric) in the tunnel URL itself. Or use a relay/discovery server where entering the code looks up the tunnel URL automatically. For open source, the simplest fix:
- Show a QR code on the Mac that encodes `{url, code}` — phone scans it, done in one step
- Add `expo-camera` / `expo-barcode-scanner` to the phone app

### 🔴 5. No Tests

**Problem:** Zero tests across all three packages. No unit tests, no integration tests, no E2E tests.

**Minimum for open source:**
- Unit tests for `PairingManager` (code generation, validation, expiry)
- Unit tests for `stripAnsi`, `formatDuration`, `formatRelativeTime`
- Integration test for WebSocket handshake (valid code → connected, invalid → rejected)
- Mock test for the `useWebSocket` hook

### 🔴 6. README is Outdated and Confusing

**Problems:**
- Still references the old `bridge/` + manual token setup as the primary path
- Doesn't mention the `desktop/` app or pairing flow prominently
- The project structure diagram is wrong (doesn't show `desktop/`)
- No screenshots
- No GIF/video showing the pairing flow

---

## The Ugly (Code Quality Issues)

### Architecture

| Issue | Location | Severity |
|-------|----------|----------|
| `useWebSocket` hook is 450+ lines — god hook | `app/src/hooks/useWebSocket.ts` | Medium |
| `any` types used for WebSocket messages | bridge + hook | Medium |
| `handleIncomingMessage` depends on stale closures (bridgeUrl in deps) | hook | Bug |
| No error boundaries in React tree | `App.tsx` | Medium |
| Desktop app `setInterval` for credits never cleaned up on server stop | `bridge.ts` | Low |
| `kiro-cli` PATH not resolved in bridge/server.ts (same issue as desktop) | bridge | Medium |

### UX Issues

| Issue | Impact |
|-------|--------|
| Pairing screen shows URL input expanded by default — overwhelming for new users | High |
| No loading state while tunnel is starting (user sees empty URL) | Medium |
| No "Unpair" button visible to the user after pairing | Medium |
| If pairing fails, error message is generic ("Invalid code or connection failed") — no distinction between network error vs wrong code vs expired code | High |
| The "LIVE" badge pulses even when the tunnel URL isn't set (misleading) | Low |
| Dashboard shows "No usage data" with zeros when not connected — should show "Connect to see usage" | Low |
| Settings screen still shows old token-based connection UI — confusing alongside pairing | High |
| No onboarding / first-run experience | High |
| Keyboard covers the URL input on smaller phones | Medium |

### Code Smells

1. **Magic strings everywhere** — Message types like `'connected'`, `'prompt'`, `'credits'` should be an enum or const map shared between app and bridge
2. **No protocol versioning** — If you change the message format, old apps break silently
3. **`setTimeout(connect, 3000)` reconnect** — No exponential backoff. After many failures, this hammers the server every 3 seconds forever
4. **`Platform` import in hook** — React hooks shouldn't depend on platform-specific logic. Move device detection to a util
5. **Chat history not persisted** — Messages are lost on app restart (there's a `CHAT_STORAGE_KEY` constant but it's unused)
6. **`formatTime` doesn't handle timezones** — Could show wrong time for users in different zones

---

## Improvement Roadmap (Priority Order)

### Phase 1: Ship-Ready (Do Before Release)

- [ ] Delete `bridge/` folder entirely — the desktop app replaces it
- [ ] Write a new README focused on: Install Mac app → Install phone app → Scan QR → Done
- [ ] Add QR code to the Mac app (encode URL + pairing code)
- [ ] Add `expo-camera` QR scanner to the phone pairing screen
- [ ] Bundle `cloudflared` in the Electron app or add a one-click install button
- [ ] Add exponential backoff to reconnect logic (3s → 6s → 12s → 30s → 60s cap)
- [ ] Add a proper error boundary in `App.tsx`
- [ ] Add an "Unpair" button in Settings
- [ ] Fix Settings screen to show pairing-based connection info (not old token fields)
- [ ] Add screenshots and a demo GIF to README
- [ ] Add a `CONTRIBUTING.md`
- [ ] Add a `LICENSE` file (MIT recommended for open source)

### Phase 2: Quality (First Week After Release)

- [ ] Split `useWebSocket` into smaller hooks: `useConnection`, `useChat`, `useCredits`, `useBrowse`
- [ ] Create shared `@kiropad/protocol` package with message types, version constants
- [ ] Add unit tests for core logic (pairing, ANSI stripping, formatting)
- [ ] Add session token expiry (7 days) with refresh mechanism
- [ ] Add brute-force protection (lock pairing for 5 min after 10 failed attempts)
- [ ] Persist chat history to AsyncStorage
- [ ] Add onboarding screen (first launch only — explain what KiroPad is)

### Phase 3: Polish (Month 1)

- [ ] iOS build support (add EAS iOS profile, TestFlight instructions)
- [ ] Haptic feedback on pairing success
- [ ] Push notifications for task completion (when app is backgrounded)
- [ ] Reduce Electron DMG size (lazy load modules, use `electron-builder` asar)
- [ ] Add a "connection health" indicator (ping latency graph)
- [ ] Support multiple simultaneous projects (tabs)
- [ ] Dark/light mode sync between phone and Mac app

---

## Feature Verification Checklist

| Feature | Status | Notes |
|---------|--------|-------|
| 6-digit pairing code generation | ✅ Works | Code is cryptographically random, expires in 5 min |
| Pairing code validation | ⚠️ Partially | Works but no brute-force protection |
| Session token persistence | ✅ Works | Stored in AsyncStorage, survives app restart |
| Auto-reconnect with session token | ⚠️ Untested | Logic exists but no backoff, may spam |
| Cloudflare tunnel auto-start | ⚠️ Fragile | Depends on `cloudflared` being installed; PATH issue fixed |
| Tunnel URL display | ✅ Works | Shown in Mac app with copy button |
| Prompt sending | ✅ Works | Streams response back in real-time |
| Git review | ✅ Works | Pipes git diff into kiro-cli |
| Model selection | ⚠️ Depends | Only works if `kiro-cli` supports `--list-models` |
| Project browsing | ✅ Works | Directory listing with navigation |
| Credits display | ⚠️ Depends | Only works if `kiro-cli usage --format json` is available |
| Real-time credits update | ✅ Works | Polls every 30s + refreshes after each task |
| Cancel task | ✅ Works | Sends SIGTERM to child process |
| Dark/light theme | ✅ Works | Persisted, well-designed color system |
| Code block rendering | ✅ Works | Syntax-unaware but properly formatted |
| Copy to clipboard | ✅ Works | Uses expo-clipboard |
| Pull-to-refresh credits | ✅ Works | Triggers manual refresh |
| Menu bar tray (Mac) | ✅ Works | Shows/hides window, regenerate code |
| Desktop notifications | ✅ Works | On device connect |

---

## UI/UX Comparison with Kiro Website

After reviewing the Kiro website design language, here's what should change:

### Current KiroPad vs Kiro Design Language

| Aspect | KiroPad Now | Kiro Website Style | Fix |
|--------|-------------|-------------------|-----|
| Color palette | Close match (purple accent) | More muted, uses subtle gradients | Fine as-is |
| Typography | Good hierarchy | Kiro uses Inter/system font | Match font if possible |
| Border radius | Mix of 8-24px | Kiro is more consistent (12-16px) | Standardize to fewer values |
| Cards | 1px solid borders | Kiro uses softer shadows, less visible borders | Reduce border opacity |
| Buttons | Solid purple | Kiro mixes solid + ghost buttons | Add ghost variant |
| Status indicators | Custom pill component | Kiro uses simpler dot + text | Fine as-is, this is better |
| Spacing | Inconsistent in some screens | Kiro has consistent 8px grid | Enforce 8px base grid |
| Icons | Feather icons | Kiro uses custom SVGs | Keep Feather — it's fine for mobile |
| Empty states | Basic text | Kiro has illustrated empty states | Add simple illustrations |

### Specific UI Fixes

1. **Pairing Screen** — Too much text visible at once. Put the URL input behind a "Manual Setup" accordion. Show QR scanner as the primary action.
2. **Dashboard** — The "Welcome back / Workspace" header adds no value. Replace with the project name and connection status prominently.
3. **Chat welcome state** — The Vibe/Spec mode cards look good but they don't actually affect behavior in `kiro-cli`. Either implement the distinction or remove them to avoid confusion.
4. **Tab bar** — The "Settings" tab icon (gear) is fine but the tab is now dual-purpose (settings + connection). Consider separating or renaming.

---

## Installation Script (Recommended)

Create this for users:

```bash
#!/bin/bash
# install.sh — KiroPad one-line installer

echo "🚀 KiroPad Installer"
echo "===================="

# Check kiro-cli
if ! command -v kiro-cli &>/dev/null; then
  echo "❌ kiro-cli not found"
  echo "   Install: curl -fsSL https://cli.kiro.dev/install | bash"
  exit 1
fi
echo "✅ kiro-cli found"

# Check cloudflared
if ! command -v cloudflared &>/dev/null; then
  echo "⚠️  cloudflared not found (needed for internet access)"
  echo "   Install: brew install cloudflared"
  read -p "   Install now? [y/N] " yn
  if [[ $yn == "y" ]]; then
    brew install cloudflared
  fi
else
  echo "✅ cloudflared found"
fi

# Check Node
if ! command -v node &>/dev/null; then
  echo "❌ Node.js not found"
  exit 1
fi
echo "✅ Node.js $(node --version)"

echo ""
echo "✅ All prerequisites met!"
echo ""
echo "Next steps:"
echo "  1. Open KiroPad.app (Mac app)"
echo "  2. Install KiroPad APK on your phone"
echo "  3. Scan the QR code or enter the pairing code"
```

---

## Final Verdict

**Rating: 6/10 for open source release readiness.**

The core concept is solid and the mobile UI is genuinely good-looking. But the project feels like it was built fast and evolved through iteration without stepping back to clean up. The duplication between `bridge/` and `desktop/`, the broken pairing flow requiring manual URL entry, zero tests, and the security concerns would all be flagged in the first GitHub issues you receive.

**The biggest risk:** A user installs this, exposes `--trust-all-tools` over the internet with a weak/default token, and gets pwned. That's a headline you don't want.

**The fix is achievable in 2-3 focused days:**
1. Day 1: Delete bridge/, fix README, add QR code pairing, bundle cloudflared
2. Day 2: Add security guardrails (rate limiting, token expiry, remove --trust-all-tools default)
3. Day 3: Add tests, screenshots, LICENSE, CONTRIBUTING, install script

After that, you have a genuinely impressive open-source project that stands out.
