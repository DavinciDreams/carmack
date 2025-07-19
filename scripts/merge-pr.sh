#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PR_NUMBER=$1

if [ -z "$PR_NUMBER" ]; then
    echo -e "${RED}Usage: $0 <pr-number>${NC}"
    echo -e "${BLUE}Example: $0 42${NC}"
    exit 1
fi

echo -e "${BLUE}Fetching PR #${PR_NUMBER} information...${NC}"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}GitHub CLI (gh) is required but not installed.${NC}"
    echo -e "${BLUE}Install it with: brew install gh${NC}"
    exit 1
fi

# Get PR information
PR_INFO=$(gh pr view $PR_NUMBER --json title,body,url,mergeable,state)

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to fetch PR #${PR_NUMBER}. Check the PR number and your permissions.${NC}"
    exit 1
fi

PR_TITLE=$(echo "$PR_INFO" | jq -r '.title')
PR_BODY=$(echo "$PR_INFO" | jq -r '.body')
PR_URL=$(echo "$PR_INFO" | jq -r '.url')
PR_STATE=$(echo "$PR_INFO" | jq -r '.state')
PR_MERGEABLE=$(echo "$PR_INFO" | jq -r '.mergeable')

# Validate PR state
if [ "$PR_STATE" != "OPEN" ]; then
    echo -e "${RED}PR #${PR_NUMBER} is not open (current state: ${PR_STATE})${NC}"
    exit 1
fi

if [ "$PR_MERGEABLE" != "MERGEABLE" ]; then
    echo -e "${RED}PR #${PR_NUMBER} is not mergeable (conflicts or checks failing)${NC}"
    exit 1
fi

echo -e "${GREEN}PR Title:${NC} $PR_TITLE"
echo -e "${GREEN}PR URL:${NC} $PR_URL"

# Create formatted commit message with PR URL
COMMIT_MESSAGE="${PR_TITLE}

${PR_BODY}

PR: ${PR_URL}

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

echo -e "${YELLOW}Merging PR with enhanced commit message...${NC}"

# Merge with squash and custom commit message
gh pr merge $PR_NUMBER \
    --squash \
    --delete-branch \
    --subject "$PR_TITLE" \
    --body "$COMMIT_MESSAGE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Successfully merged PR #${PR_NUMBER}${NC}"
    echo -e "${BLUE}Commit message includes PR URL for tracking${NC}"
else
    echo -e "${RED}❌ Failed to merge PR #${PR_NUMBER}${NC}"
    exit 1
fi