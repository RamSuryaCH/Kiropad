# iOS Build Guide

Build KiroPad for iPhone/iPad and distribute via TestFlight.

## Prerequisites

- macOS with Xcode 15+
- Apple Developer account ($99/year)
- [EAS CLI](https://docs.expo.dev/eas/): `npm install -g eas-cli`
- Expo account: `eas login`

## Build for TestFlight

```bash
cd app

# First time: configure your Apple credentials
eas build:configure

# Build for iOS (cloud build — no local Xcode needed)
eas build -p ios --profile production
```

EAS builds in the cloud (~15-30 min). When complete, it provides a download link for the `.ipa` file.

## Submit to TestFlight

```bash
# Submit the latest build to App Store Connect
eas submit -p ios

# Or submit a specific build
eas submit -p ios --id <build-id>
```

## Local Development Build

For testing on a physical device with hot reload:

```bash
# Create a development build (installs on your device)
eas build -p ios --profile development

# Or build locally (requires Xcode)
npx expo run:ios --device
```

## Simulator Build

```bash
eas build -p ios --profile development
# Downloads a .app that runs in the iOS Simulator
```

## App Store Submission Checklist

- [ ] Set `bundleIdentifier` in `app.json` → `ios.bundleIdentifier`
- [ ] Add App Store screenshots (6.7", 6.5", 5.5")
- [ ] Fill in `eas.json` → `submit.production.ios` fields:
  - `appleId`: Your Apple ID email
  - `ascAppId`: App Store Connect app ID
  - `appleTeamId`: Your team ID (from Apple Developer portal)
- [ ] Add privacy policy URL
- [ ] Write App Store description
- [ ] Set content rating

## Permissions Required

KiroPad requests these iOS permissions:

| Permission | Purpose | Info.plist Key |
|------------|---------|----------------|
| Camera | QR code scanning for pairing | NSCameraUsageDescription |
| Notifications | Task completion alerts | Background Modes → Remote notifications |

## Troubleshooting

**"No signing identity found"**
→ Run `eas credentials` to set up code signing via EAS.

**"Provisioning profile mismatch"**
→ Run `eas build -p ios --clear-credentials` to reset.

**Build fails with Swift version error**
→ Ensure Xcode 15+ is set as default: `xcode-select -p`
