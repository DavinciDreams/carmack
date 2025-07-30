#!/bin/bash
# Fetch Claude Code token from remote auth server
# Usage: ./fetch-remote-token.sh <SERVER_IP>

set -e

SERVER_IP=${1:-"localhost"}
SERVER_PORT=8877
TOKEN_URL="http://${SERVER_IP}:${SERVER_PORT}/auth/token"

echo "🎯 DOOM: Fetching Claude token from ${TOKEN_URL}"

# Fetch token
RESPONSE=$(curl -s "$TOKEN_URL" 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "❌ Failed to connect to auth server at ${SERVER_IP}:${SERVER_PORT}"
    echo "💡 Make sure remote auth server is running: node remote-auth-server.js"
    exit 1
fi

# Parse response
TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ No token in response:"
    echo "$RESPONSE"
    exit 1
fi

echo "✅ Token received!"

# Set environment variable
export ANTHROPIC_API_KEY="$TOKEN"

# Create local config
mkdir -p ~/.config/claude-code
cat > ~/.config/claude-code/config.json << EOF
{
  "primaryApiKey": "$TOKEN",
  "hasCompletedOnboarding": true,
  "remoteAccess": true
}
EOF

echo "🚀 Claude Code configured for DOOM!"
echo "💾 Config saved to ~/.config/claude-code/config.json"
echo "🔑 Environment variable set: ANTHROPIC_API_KEY"
echo ""
echo "🎮 Ready for DOOM release! Run: claude doctor"