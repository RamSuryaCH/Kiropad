# KiroPad

**A mobile remote control for [Kiro AI](https://kiro.dev).** Drive Kiro from your phone — send prompts, run quick actions, and stream responses in real time. Works from anywhere over the internet.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: macOS](https://img.shields.io/badge/Platform-macOS%2012%2B-lightgrey.svg)]()
[![Mobile: Android & iOS](https://img.shields.io/badge/Mobile-Android%20%7C%20iOS-green.svg)]()

---

## How It Works

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

1. **Open KiroPad** on your Mac — a QR code and 6-digit code appear
2. **Scan the QR** with KiroPad on your phone (or enter the code manually)
3. **Done** — you're paired. Start sending prompts from your phone.

No manual IP entry. No same-network requirement. Works over cellular.

---

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Download Pre-built Releases](#download-pre-built-releases)
  - [Build from Source](#build-from-source)
- [Creating Releases](#creating-releases)
  - [macOS Release (.dmg)](#macos-release-dmg)
  - [Android Release (.apk)](#android-release-apk)
- [Configuration](#configuration)
- [Development](#development)
- [Security](#security)
- [Project Structure](#project-structure)
- [Roadmap](#roadmap)
- [iOS Support](#ios-support)
- [Credits](#credits)
- [License](#license)

---

## Features

| Feature | Description |
|---------|-------------|
| 🔗 QR Pairing | Scan once, auto-reconnect forever |
| 🌐 Internet access | Auto Cloudflare tunnel, no port forwarding |
| 💬 Real-time chat | Stream kiro-cli responses live |
| ⚡ Quick actions | Fix errors, write tests, git review, refactor |
| 📊 Credits tracking | Real-time usage with plan info |
| 🎨 Dark + Light theme | Follows your preference |
| 📁 Project browser | Switch projects remotely |
| 🤖 Model selection | Pick Claude, GPT, etc. |
| 🔒 Secure | Session tokens, rate limiting, brute-force protection |

---

## Prerequisites

| Requirement | Version | Install |
|-------------|---------|---------|
| macOS | 12+ | — |
| Node.js | 20+ | [nodejs.org](https://nodejs.org) or `brew install node` |
| kiro-cli | Latest | `curl -fsSL https://cli.kiro.dev/install \| bash` |
| cloudflared | Latest | `brew install cloudflared` |
| git | Any | `xcode-select --install` |
| KIRO_API_KEY | — | Set in `~/.zshrc`: `export KIRO_API_KEY=your-key` |

Run the prerequisite checker to verify your environment:

```bash
./scripts/check.sh
```

---

## Installation

### Download Pre-built Releases

The easiest way to get started — grab the latest builds from the [Releases](../../releases) page.

#### macOS Desktop App

1. Go to [Releases](../../releases) and download `KiroPad-<version>-arm64.dmg` (Apple Silicon) or `KiroPad-<version>-x64.dmg` (Intel)
2. Open the `.dmg` file
3. Drag **KiroPad** to your **Applications** folder
4. Launch KiroPad from Applications (right-click → Open on first launch to bypass Gatekeeper)
5. A QR code and 6-digit pairing code will appear

#### Android App

1. Go to [Releases](../../releases) and download `KiroPad-release.apk`
2. Transfer the APK to your Android device (or download directly on the device)
3. Open the APK — you may need to enable **"Install from unknown sources"** in Settings → Security
4. Open KiroPad and scan the QR code displayed on your Mac

#### iOS App

See [iOS Support](#ios-support) below for TestFlight and App Store options.

---

### Build from Source

#### Clone the repository

```bash
git clone https://github.com/ramsuryachelluboyina/kiropad.git
cd kiropad
```

#### Build the macOS Desktop App

```bash
cd desktop
npm install
npm run dev        # Run in development mode
# or
npm run dist       # Build distributable .dmg
```

The built `.dmg` will be in `desktop/dist/`.

#### Build the Android App

```bash
cd app
npm install
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```

The signed APK will be at `app/android/app/build/outputs/apk/release/app-release.apk`.

> **Note:** Building Android requires the [Android SDK](https://developer.android.com/studio) and Java 17+.

#### Build with EAS (recommended for production)

```bash
cd app
npm install -g eas-cli
eas login
eas build -p android --profile production
```

---

## Creating Releases

### macOS Release (.dmg)

KiroPad uses [electron-builder](https://www.electron.build/) to package the macOS app as a `.dmg` and `.zip`.

#### Step 1: Prepare

```bash
cd desktop
npm install
```

#### Step 2: Build the distributable

```bash
npm run dist
```

This runs `tsc` (TypeScript compile) then `electron-builder --mac --publish never`, producing:

- `dist/KiroPad-<version>-arm64.dmg` — Apple Silicon installer
- `dist/KiroPad-<version>-arm64.zip` — Portable zip

#### Step 3: (Optional) Build for Intel Macs

```bash
npx electron-builder --mac --x64 --publish never
```

#### Step 4: Code signing (recommended for distribution)

For public distribution, sign and notarize the app:

```bash
# Set environment variables
export CSC_LINK=path/to/your-certificate.p12
export CSC_KEY_PASSWORD=your-certificate-password
export APPLE_ID=your-apple-id@email.com
export APPLE_APP_SPECIFIC_PASSWORD=your-app-password
export APPLE_TEAM_ID=your-team-id

# Build with signing + notarization
npx electron-builder --mac --publish never
```

> Without code signing, users will see a Gatekeeper warning on first launch. They can bypass it with right-click → Open.

#### Step 5: Upload to GitHub Releases

```bash
# Tag the release
git tag v2.0.0
git push origin v2.0.0

# Create a GitHub release (requires gh CLI)
gh release create v2.0.0 \
  desktop/dist/KiroPad-2.0.0-arm64.dmg \
  desktop/dist/KiroPad-2.0.0-arm64.zip \
  --title "KiroPad v2.0.0" \
  --notes "Release notes here"
```

---

### Android Release (.apk)

There are two paths to create an Android release: local Gradle build or EAS Build (cloud).

#### Option A: Local Build (Gradle)

##### Step 1: Prerequisites

- Android SDK installed (via [Android Studio](https://developer.android.com/studio))
- Java 17+ (`brew install openjdk@17`)
- `ANDROID_HOME` set in your shell profile

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$ANDROID_HOME/platform-tools:$PATH
```

##### Step 2: Generate a signing keystore (first time only)

```bash
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore kiropad-release.keystore \
  -alias kiropad \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Store the keystore securely. You'll need it for every future release.

##### Step 3: Configure signing in Gradle

Create or edit `app/android/app/gradle.properties`:

```properties
KIROPAD_UPLOAD_STORE_FILE=../../kiropad-release.keystore
KIROPAD_UPLOAD_KEY_ALIAS=kiropad
KIROPAD_UPLOAD_STORE_PASSWORD=your-store-password
KIROPAD_UPLOAD_KEY_PASSWORD=your-key-password
```

Add signing config to `app/android/app/build.gradle`:

```groovy
android {
    signingConfigs {
        release {
            storeFile file(KIROPAD_UPLOAD_STORE_FILE)
            storePassword KIROPAD_UPLOAD_STORE_PASSWORD
            keyAlias KIROPAD_UPLOAD_KEY_ALIAS
            keyPassword KIROPAD_UPLOAD_KEY_PASSWORD
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

##### Step 4: Build the APK

```bash
cd app
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```

The signed APK will be at:
```
app/android/app/build/outputs/apk/release/app-release.apk
```

##### Step 5: (Optional) Build AAB for Google Play

```bash
./gradlew bundleRelease
```

Output: `app/android/app/build/outputs/bundle/release/app-release.aab`

#### Option B: EAS Build (Cloud — recommended)

[EAS Build](https://docs.expo.dev/build/introduction/) handles signing, building, and distribution in the cloud.

##### Step 1: Install and configure EAS

```bash
npm install -g eas-cli
eas login
```

##### Step 2: Configure build profiles

Create or verify `app/eas.json`:

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-services.json",
        "track": "production"
      }
    }
  }
}
```

##### Step 3: Build

```bash
cd app

# APK for direct distribution
eas build -p android --profile preview

# AAB for Google Play
eas build -p android --profile production
```

##### Step 4: Submit to Google Play (optional)

```bash
eas submit -p android --profile production
```

#### Upload Android Release to GitHub

```bash
# Copy APK to project root with a clean name
cp app/android/app/build/outputs/apk/release/app-release.apk KiroPad-release.apk

# Upload to GitHub release
gh release upload v2.0.0 KiroPad-release.apk
```

---

## Configuration

Environment variables for the Mac app (optional):

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

## Project Structure

```
kiropad/
├── desktop/           Electron macOS app (bridge + tunnel + pairing UI)
├── app/               React Native Expo mobile app
├── packages/
│   └── protocol/      Shared TypeScript types and constants
├── scripts/           Install/check scripts
├── docs/              Additional documentation (iOS build guide)
├── LICENSE            MIT
├── CONTRIBUTING.md    How to contribute
└── README.md          This file
```

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

## Credits

Built by [Ram Surya Chelluboyina](https://github.com/RamSuryaCH/)

Powered by [Kiro AI](https://kiro.dev) · Built with [React Native](https://reactnative.dev) + [Electron](https://electronjs.org)

## License

MIT — see [LICENSE](LICENSE)
# Kiropad
