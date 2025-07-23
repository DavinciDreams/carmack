#!/bin/bash
# Fast Claude Code Remote Auth Setup for DOOM Release
# For Claude Max subscription users

set -e

echo "🚀 DOOM Release - Claude Code Remote Auth Setup"
echo "================================================"

# Method 1: OAuth Token (Fastest for remote)
if [ -n "$CLAUDE_CODE_OAUTH_TOKEN" ]; then
    echo "✅ Using OAuth token from environment"
    export ANTHROPIC_API_KEY="$CLAUDE_CODE_OAUTH_TOKEN"
fi

# Method 2: Subscription login (Interactive)
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "🔐 Setting up subscription login..."
    echo "Run this on your remote machine:"
    echo "  claude"
    echo "  /login"
    echo "  # Follow browser authentication"
fi

# Method 3: Config file workaround
if [ -n "$CLAUDE_API_KEY" ]; then
    echo "📝 Creating config file..."
    mkdir -p ~/.config/claude-code
    cat > ~/.config/claude-code/config.json << EOF
{
  "primaryApiKey": "$CLAUDE_API_KEY",
  "hasCompletedOnboarding": true,
  "remoteAccess": true
}
EOF
    echo "✅ Config file created"
fi

# Verify setup
echo "🔍 Verifying setup..."
if command -v claude &> /dev/null; then
    claude doctor || echo "⚠️  Run 'claude doctor' after authentication"
else
    echo "📦 Installing Claude Code globally..."
    npm install -g @anthropic-ai/claude-code
fi

echo "🎯 DOOM-ready! Use these commands on remote machine:"
echo "   export CLAUDE_CODE_OAUTH_TOKEN='your-token'"
echo "   # OR run: claude && /login"
echo "   claude doctor"