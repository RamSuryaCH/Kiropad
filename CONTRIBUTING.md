# Contributing to KiroPad

Thanks for considering contributing to KiroPad! Here's how to get started.

## Project Structure

```
kiropad/
├── app/              React Native mobile app (Expo)
├── desktop/          Electron macOS app (bridge + tunnel + pairing)
├── packages/
│   └── protocol/     Shared types and constants
└── scripts/          Installation and build scripts
```

## Development Setup

### Prerequisites

- Node.js 20+
- [kiro-cli](https://cli.kiro.dev) installed
- [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) for tunnel support
- Xcode (for iOS) or Android SDK (for Android builds)

### Getting Started

```bash
# Clone the repo
git clone https://github.com/your-username/kiropad.git
cd kiropad

# Install dependencies for all packages
cd packages/protocol && npm install && npm run build && cd ../..
cd desktop && npm install && cd ..
cd app && npm install && cd ..

# Start the desktop app (dev mode)
cd desktop && npm run dev

# Start the mobile app (dev mode)
cd app && npx expo start
```

## Code Guidelines

- **TypeScript** everywhere — no `any` types unless absolutely unavoidable
- **Functional components** with hooks for React Native
- Use the shared `@kiropad/protocol` package for message types
- Follow existing code style (no linter yet, but be consistent)
- Test your changes before submitting

## Pull Request Process

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Ensure TypeScript compiles without errors: `npx tsc --noEmit`
4. Write a clear PR description explaining what and why
5. Keep PRs focused — one feature or fix per PR

## Areas Where Help is Needed

- **iOS support** — Build profiles, TestFlight instructions
- **Windows/Linux desktop app** — Currently macOS only
- **Tests** — Unit tests for pairing, protocol, and utilities
- **Accessibility** — Screen reader support, contrast ratios
- **Localization** — Multi-language support
- **Documentation** — Tutorials, screenshots, video walkthroughs

## Security

If you find a security vulnerability, please **do not** open a public issue. Email the maintainer directly or use GitHub's private vulnerability reporting.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
