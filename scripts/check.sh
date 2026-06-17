#!/bin/bash
# KiroPad — Prerequisite checker
# Run: ./scripts/check.sh

set -e

echo ""
echo "  ╔═══════════════════════════════╗"
echo "  ║   KiroPad Prerequisite Check  ║"
echo "  ╚═══════════════════════════════╝"
echo ""

PASS=0
WARN=0
FAIL=0

check() {
  if command -v "$1" &>/dev/null; then
    echo "  ✅ $2 found: $(command -v "$1")"
    PASS=$((PASS + 1))
  else
    if [ "$3" = "required" ]; then
      echo "  ❌ $2 NOT FOUND"
      echo "     Install: $4"
      FAIL=$((FAIL + 1))
    else
      echo "  ⚠️  $2 not found (optional)"
      echo "     Install: $4"
      WARN=$((WARN + 1))
    fi
  fi
}

check "node" "Node.js" "required" "https://nodejs.org"
check "kiro-cli" "kiro-cli" "required" "curl -fsSL https://cli.kiro.dev/install | bash"
check "cloudflared" "cloudflared" "required" "brew install cloudflared"
check "git" "git" "required" "xcode-select --install"

echo ""

# Check KIRO_API_KEY
if [ -n "$KIRO_API_KEY" ]; then
  echo "  ✅ KIRO_API_KEY is set"
  PASS=$((PASS + 1))
else
  echo "  ⚠️  KIRO_API_KEY not set in environment"
  echo "     Add to ~/.zshrc: export KIRO_API_KEY=your-key"
  WARN=$((WARN + 1))
fi

# Check Node version
if command -v node &>/dev/null; then
  NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_VER" -ge 20 ]; then
    echo "  ✅ Node.js version $(node -v) (20+ required)"
  else
    echo "  ⚠️  Node.js version $(node -v) — version 20+ recommended"
    WARN=$((WARN + 1))
  fi
fi

echo ""
echo "  ─────────────────────────────────"
echo "  Results: $PASS passed, $WARN warnings, $FAIL failed"
echo ""

if [ $FAIL -gt 0 ]; then
  echo "  ❌ Fix the failures above before running KiroPad."
  exit 1
elif [ $WARN -gt 0 ]; then
  echo "  ⚠️  Some optional items missing. KiroPad may work with reduced functionality."
  exit 0
else
  echo "  🚀 All good! You're ready to run KiroPad."
  exit 0
fi
