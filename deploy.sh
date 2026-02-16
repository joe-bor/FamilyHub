#!/bin/bash

set -e

# === CONFIGURATION ===
SERVER="root@joe-bor.me"
REMOTE_PATH="/var/www/familyhub"
URL="https://familyhub.joe-bor.me"
VERSION=$(node -p "require('./package.json').version")

# === PRE-DEPLOY CHECKS (ordered fastest → slowest) ===

# 1. Clean working tree?
if [ -n "$(git status --porcelain)" ]; then
  echo "✗ Working tree is dirty. Commit or stash changes first."
  exit 1
fi

# 2. On main branch?
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ]; then
  echo "✗ Must deploy from main branch (currently on '$BRANCH')."
  exit 1
fi

# 3. Synced with remote?
git fetch origin main --quiet
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
if [ "$LOCAL" != "$REMOTE" ]; then
  echo "✗ Local main is not in sync with origin/main. Pull or push first."
  exit 1
fi

# 4. Tagged release? (warning only)
if ! git tag -l "v$VERSION" | grep -q .; then
  echo "⚠ No git tag found for v$VERSION."
  read -r -p "Deploy untagged version? [y/N] " response
  if [[ ! "$response" =~ ^[Yy]$ ]]; then
    echo "Deploy cancelled."
    exit 0
  fi
fi

# 5. Lint
echo "Running lint..."
npm run lint

# 6. Tests
echo "Running tests..."
npm test -- --run

# === BUILD & DEPLOY ===
echo "Building v$VERSION..."
npm run build

echo "Deploying to $SERVER..."
rsync -avz --delete dist/ "$SERVER:$REMOTE_PATH/"

echo "Verifying deployment..."
sleep 2

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL")

if [ "$STATUS" = "200" ]; then
  echo "✓ Deploy successful! v$VERSION is live at $URL"
else
  echo "✗ Warning: Site returned HTTP $STATUS"
  exit 1
fi
