#!/bin/bash
# Quick deployment script for Railway

set -e

echo "🚀 Present App - Railway Deployment"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "🔑 Please log in to Railway:"
    railway login
fi

# Navigate to project root
cd "$(dirname "$0")/.."

echo ""
echo "📦 Preparing deployment..."

# Create Procfile if it doesn't exist
if [ ! -f "Procfile" ]; then
    echo "web: python server.py --host 0.0.0.0 --port \$PORT" > Procfile
    echo "✅ Created Procfile"
fi

# Create railway.json for configuration
cat > railway.json << 'EOF'
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
EOF
echo "✅ Created railway.json"

# Initialize Railway project if not already
if [ ! -f ".railway" ]; then
    echo ""
    echo "📝 Initializing Railway project..."
    railway init
fi

echo ""
echo "🔧 Setting environment variables..."
echo "You'll need to set these in Railway dashboard:"
echo "  PRESENT_TOKEN=your-secret-token-here"
echo ""
read -p "Press Enter to open Railway dashboard..."

railway open

echo ""
echo "⚡ Deploying to Railway..."
railway up

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your app URL:"
railway domain
echo ""
echo "📋 Next steps:"
echo "1. Note your Railway URL above"
echo "2. Update android-twa/bubblewrap-config.json with this URL"
echo "3. Add .well-known/assetlinks.json to your project"
echo "4. Follow DEPLOYMENT.md for TWA setup"
echo ""
echo "💡 View logs: railway logs"
echo "💡 Open dashboard: railway open"
