# KiroPad

**A mobile remote control for [Kiro AI](https://kiro.dev).** Drive Kiro from your phone — send prompts, run quick actions, and stream responses in real time. Works from anywhere over the internet.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: macOS](https://img.shields.io/badge/Platform-macOS%2012%2B-lightgrey.svg)]()
[![Mobile: Android & iOS](https://img.shields.io/badge/Mobile-Android%20%7C%20iOS-green.svg)]()

---

## About the Project

KiroPad lets you control [Kiro AI](https://kiro.dev) remotely from your phone. It consists of two parts:

- **Desktop app** (macOS) — an Electron app that runs `kiro-cli`, manages a Cloudflare tunnel for internet access, and displays a QR code for easy pairing.
- **Mobile app** (Android & iOS) — a React Native Expo app that connects to the desktop app over WebSocket, letting you send prompts, trigger quick actions, and stream AI responses in real time.

No manual IP entry. No same-network requirement. Works over cellular, anywhere in the world.

### How It Works

```
┌─────────────────────────┐         ┌─────────────────────────┐
│   KiroPad (Mac App)     │◄───────►│   KiroPad (Phone App)   │
│                         │   WSS   │                         │
│  • Runs kiro-cli        │ Internet│  • Send prompts         │
│  • Auto Cloudflare      │         │  • Quick actions        │
│    tunnel               │         │  • Stream responses     │
│  • Shows QR + code      │         │  • Scan QR to pair      │
└─────────────────────────┘         └─────────────────────────┘
```

1. **Open KiroPad** on your Mac — a QR code and 6-digit code appear.
2. **Scan the QR** with KiroPad on your phone (or enter the code manually).
3. **Done** — you're paired. Start sending prompts from your phone.

---

## Table of Contents

- [About the Project](#about-the-project)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Download Pre-built Releases](#download-pre-built-releases)
  - [Build from Source](#build-from-source)
- [Configuration](#configuration)
- [Development](#development)
- [Project Structure](#project-structure)
- [Creating Releases](#creating-releases)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [iOS Support](#ios-support)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)

---

## Features

| Feature | Description |
|---------|-------------|
| 🔗 QR Pairing | Scan once, auto-reconnect forever |
| 🌐 Internet Access | Auto Cloudflare tunnel — no port forwarding needed |
| 💬 Real-time Chat | Stream kiro-cli responses live to your phone |
| ⚡ Quick Actions | Fix errors, write tests, git review, refactor with one tap |
| 📊 Credits Tracking | Real-time usage with plan info |
| 🎨 Dark + Light Theme | Follows your system preference |
| 📁 Project Browser | Switch between projects remotely |
| 🤖 Model Selection | Pick Claude, GPT, or other supported models |
| 🔒 Secure | Session tokens, rate limiting, brute-force protection |

---

## Prerequisites

Before you begin, make sure you have the following installed and configured:

| Requirement | Version | How to Install |
|-------------|---------|----------------|
| **macOS** | 12 (Monterey) or later | — |
| **Node.js** | 20+ | [nodejs.org](https://nodejs.org) or `brew install node` |
| **npm** | 10+ | Comes with Node.js |
| **kiro-cli** | Latest | `curl -fsSL https://cli.kiro.dev/install \| bash` |
| **cloudflared** | Latest | `brew install cloudflared` |
| **Git** | Any | `xcode-select --install` |
| **KIRO_API_KEY** | — | Set in `~/.zshrc`: `export KIRO_API_KEY=your-key` |

### Verify Prerequisites

Run the included checker script to confirm everything is set up:

```bash
./scripts/check.sh
```

### Additional Requirements for Building Android Locally

| Requirement | Version | How to Install |
|-------------|---------|----------------|
| **Android SDK** | Latest | [Android Studio](https://developer.android.com/studio) |
| **Java (JDK)** | 17+ | `brew install openjdk@17` |
| **ANDROID_HOME** | — | Set in shell profile (see [Build from Source](#build-the-android-app)) |

---

## Installation

### Download Pre-built Releases

The quickest way to get started — grab the latest builds from the [Releases](https://github.com/RamSuryaCH/Kiropad/releases) page.

#### macOS Desktop App

1. Download `KiroPad-<version>-arm64.dmg` (Apple Silicon) or `KiroPad-<version>-x64.dmg` (Intel) from [Releases](https://github.com/RamSuryaCH/Kiropad/releases)
2. Open the `.dmg` file
3. Drag **KiroPad** to your **Applications** folder
4. Launch KiroPad from Applications (right-click → Open on first launch to bypass Gatekeeper)
5. A QR code and 6-digit pairing code will appear

#### Android App

1. Download `KiroPad-release.apk` from [Releases](https://github.com/RamSuryaCH/Kiropad/releases)
2. Transfer the APK to your Android device (or download directly on the device)
3. Open the APK — enable **"Install from unknown sources"** in Settings → Security if prompted
4. Open KiroPad and scan the QR code displayed on your Mac

#### iOS App

See [iOS Support](#ios-support) below for TestFlight and App Store options.

---

### Build from Source

#### 1. Clone the Repository

```bash
git clone https://github.com/RamSuryaCH/Kiropad.git
cd Kiropad
```

#### 2. Build the macOS Desktop App

```bash
cd desktop
npm install
```

Run in development mode:

```bash
npm run dev
```

Or build a distributable `.dmg`:

```bash
npm run dist
```

The built `.dmg` will be in `desktop/dist/`.

#### 3. Build the Android App

First, set up your Android environment:

```bash
# Add to ~/.zshrc or ~/.bash_profile
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$ANDROID_HOME/platform-tools:$PATH
```

Then build:

```bash
cd app
npm install
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```

The signed APK will be at `app/android/app/build/outputs/apk/release/app-release.apk`.

#### 4. Build with EAS (Recommended for Production)

```bash
cd app
npm install -g eas-cli
eas login
eas build -p android --profile production
```

---

## Configuration

Environment variables for the Mac app (all optional):

| Variable | Default | Purpose |
|----------|---------|---------|
| `KIROPAD_PORT` | `8765` | Bridge server port |
| `KIROPAD_WORKSPACE` | Current directory | Default project path |
| `KIROPAD_PROJECTS` | — | Comma-separated extra project paths |
| `KIROPAD_TRUST_ALL_TOOLS` | `0` | Set to `1` to enable `--trust-all-tools` |

---

## Development

```bash
# Desktop app (dev mode with hot reload)
cd desktop && npm run dev

# Mobile app (Expo dev server)
cd app && npx expo start

# Shared protocol types
cd packages/protocol && npm run build

# Run desktop tests
cd desktop && npm test
```

---

## Project Structure

```
Kiropad/
├── desktop/             # Electron macOS app (bridge + tunnel + pairing UI)
│   ├── src/             # Main process TypeScript source
│   ├── renderer/        # Frontend HTML/CSS/JS
│   └── assets/          # App icons
├── app/                 # React Native Expo mobile app (Android & iOS)
├── packages/
│   └── protocol/        # Shared TypeScript types and constants
├── scripts/             # Install/check scripts
├── docs/                # Additional docs (iOS build guide)
├── CONTRIBUTING.md      # Contribution guidelines
├── LICENSE              # MIT License
└── README.md            # This file
```

---

## Creating Releases

### macOS Release (.dmg)

```bash
cd desktop
npm install
npm run dist
```

This produces:
- `dist/KiroPad-<version>-arm64.dmg` — Apple Silicon installer
- `dist/KiroPad-<version>-arm64.zip` — Portable zip

For Intel Macs:

```bash
npx electron-builder --mac --x64 --publish never
```

#### Code Signing (recommended for distribution)

```bash
export CSC_LINK=path/to/your-certificate.p12
export CSC_KEY_PASSWORD=your-certificate-password
export APPLE_ID=your-apple-id@email.com
export APPLE_APP_SPECIFIC_PASSWORD=your-app-password
export APPLE_TEAM_ID=your-team-id

npx electron-builder --mac --publish never
```

### Android Release (.apk)

#### Local Build

```bash
cd app
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```

#### EAS Build (Cloud)

```bash
cd app
eas build -p android --profile preview    # APK for direct distribution
eas build -p android --profile production # AAB for Google Play
```

### Upload to GitHub Releases

```bash
git tag v2.0.0
git push origin v2.0.0

gh release create v2.0.0 \
  desktop/dist/KiroPad-2.0.0-arm64.dmg \
  KiroPad-release.apk \
  --title "KiroPad v2.0.0" \
  --notes "Release notes here"
```

---

## Security

KiroPad takes security seriously:

- **6-digit codes** expire after 5 minutes and are single-use
- **Session tokens** expire after 7 days
- **Brute-force protection** — 10 failed attempts locks pairing for 5 minutes
- **Rate limiting** — 1 prompt per second max
- **Input sanitization** — CWD paths are validated, prompts are length-limited
- **No `--trust-all-tools` by default** — opt-in only via `KIROPAD_TRUST_ALL_TOOLS=1`
- **TLS** — Cloudflare tunnel provides HTTPS/WSS encryption

> ⚠️ KiroPad runs kiro-cli on your Mac. If you enable `--trust-all-tools`, anyone with access can execute commands. Keep your pairing code private.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Gatekeeper blocks the macOS app | Right-click the app → Open, or run `xattr -cr /Applications/KiroPad.app` |
| QR code not appearing | Ensure `cloudflared` is installed and your network allows outbound connections |
| Phone can't connect | Check that both devices have internet access; the tunnel doesn't require same network |
| `kiro-cli` not found | Run the install script: `curl -fsSL https://cli.kiro.dev/install \| bash` |
| Android APK won't install | Enable "Install from unknown sources" in Settings → Security |
| Build fails on Apple Silicon | Make sure you're using the arm64 version of Node.js |

---

## Roadmap

- [x] QR code pairing (scan to connect)
- [x] Internet access via auto-tunnel
- [x] Real-time credits tracking
- [x] Dark/Light theme
- [x] Haptic feedback on pairing
- [x] Push notifications for task completion
- [x] Connection health monitoring
- [x] Chat history persistence
- [x] Onboarding (first-launch)
- [x] Session security (expiry, brute-force protection, rate limiting)
- [ ] Windows/Linux desktop app
- [ ] Multiple project tabs
- [ ] Syntax highlighting in code blocks
- [ ] Voice-to-text prompt input
- [ ] Plugin system for custom quick actions

---

## iOS Support

KiroPad supports iOS via EAS Build. See [docs/ios-build.md](docs/ios-build.md) for full instructions.

```bash
cd app
eas build -p ios --profile preview    # TestFlight build
eas submit -p ios                     # Submit to App Store
```

---

## Contributing

Contributions are welcome! Please read the [CONTRIBUTING.md](CONTRIBUTING.md) guide for details on the process for submitting pull requests.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## Author

**Ram Surya Chelluboyina**

- GitHub: [@RamSuryaCH](https://github.com/RamSuryaCH)
- LinkedIn: [Ram Surya Chelluboyina](https://www.linkedin.com/in/ram-surya-chelluboyina/)

---

Powered by [Kiro AI](https://kiro.dev) · Built with [React Native](https://reactnative.dev) + [Electron](https://electronjs.org)
