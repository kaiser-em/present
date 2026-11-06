#!/usr/bin/env bash
# Complete TWA build and deployment script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
RAILWAY_URL="${1:-}"

if [ -z "$RAILWAY_URL" ]; then
    echo "❌ Usage: ./build-twa.sh https://your-railway-url.up.railway.app"
    exit 1
fi

echo "🚀 Building Present TWA"
echo "URL: $RAILWAY_URL"
echo ""

cd "$SCRIPT_DIR"

# Step 1: Update bubblewrap config
echo "📝 Updating bubblewrap configuration..."
sed -i.bak "s|YOUR_DOMAIN.com|$(echo $RAILWAY_URL | sed 's|https://||g')|g" bubblewrap-config.json
rm -f bubblewrap-config.json.bak
echo "✅ Config updated"
echo ""

# Step 2: Build APK
echo "🔨 Building APK..."
bubblewrap build

echo ""
echo "✅ Build complete!"
echo ""
echo "📦 Output files:"
ls -lh app-release-signed.apk 2>/dev/null && echo "  ✅ APK ready for testing"
ls -lh app-release-bundle.aab 2>/dev/null && echo "  ✅ AAB ready for Play Store"
ls -lh app-release-bundle.keystore 2>/dev/null && echo "  ✅ Keystore ready (BACKUP THIS!)"
echo ""

# Step 3: Get fingerprint
echo "🔑 Extracting SHA-256 fingerprint..."
FINGERPRINT=$(keytool -list -v -keystore app-release-bundle.keystore -alias present-key 2>/dev/null | grep "SHA256:" | head -1 | sed 's/.*SHA256: //' | tr -d ' ')

if [ -z "$FINGERPRINT" ]; then
    echo "⚠️  Could not extract fingerprint. You may need to run:"
    echo "  keytool -list -v -keystore app-release-bundle.keystore -alias present-key"
else
    echo "✅ Fingerprint: $FINGERPRINT"
    echo ""
    echo "📋 Update .well-known/assetlinks.json with this fingerprint:"
    echo "  $FINGERPRINT"
fi

echo ""
echo "🎯 Next steps:"
echo "1. Update .well-known/assetlinks.json with the SHA-256 fingerprint above"
echo "2. Redeploy PWA: cd .. && railway up"
echo "3. Test on device: adb install app-release-signed.apk"
echo "4. For Play Store: Upload app-release-bundle.aab to Play Console"
