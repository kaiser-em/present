#!/usr/bin/env bash
# Install all dependencies for TWA setup

set -e

echo "🚀 Installing Present TWA Dependencies"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required. Install from https://nodejs.org"
    exit 1
fi

echo "✅ Node.js: $(node --version)"
echo "✅ npm: $(npm --version)"
echo ""

# Install Railway CLI
echo "📦 Installing Railway CLI..."
npm install -g @railway/cli

# Install Bubblewrap
echo "📦 Installing Bubblewrap..."
npm install -g @bubblewrap/cli

echo ""
echo "✅ All dependencies installed!"
echo ""
echo "📋 Next steps:"
echo "1. Deploy PWA: railway login && railway up"
echo "2. Initialize TWA: bubblewrap init --manifest https://YOUR_URL/manifest.json"
echo "3. Build APK: bubblewrap build"
echo ""
echo "See SETUP.md for detailed instructions"
