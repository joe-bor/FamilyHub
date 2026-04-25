#!/bin/bash

set -e

# === CONFIGURATION ===
SERVER="root@joe-bor.me"
REMOTE_PATH="/var/www/familyhub"
URL="https://familyhub.joe-bor.me"
VERSION=$(node -p "require('./package.json').version")
RELEASE_TAG="family-hub-v$VERSION"

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
git fetch origin --tags --quiet
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
if [ "$LOCAL" != "$REMOTE" ]; then
  echo "✗ Local main is not in sync with origin/main. Pull or push first."
  exit 1
fi

# 4. Released FE commit?
if ! git rev-parse -q --verify "refs/tags/$RELEASE_TAG" >/dev/null; then
  echo "✗ Required release tag '$RELEASE_TAG' does not exist."
  echo "  Merge the FE release PR before deploying."
  exit 1
fi

TAG_COMMIT=$(git rev-list -n 1 "$RELEASE_TAG")
if [ "$LOCAL" != "$TAG_COMMIT" ]; then
  echo "✗ Current commit is not the released FE commit for $RELEASE_TAG."
  echo "  Current HEAD: $LOCAL"
  echo "  Release tag:  $TAG_COMMIT"
  echo "  Deploy only from the released FE commit on main."
  exit 1
fi

# 5. Lint
echo "Running lint..."
npm run lint

# 6. Tests
echo "Running tests..."
npm test -- --run

# === BUILD & DEPLOY ===
echo "Building $RELEASE_TAG..."
npm run build

echo "Deploying to $SERVER..."
rsync -avz --delete dist/ "$SERVER:$REMOTE_PATH/"

echo "Verifying deployment..."
sleep 2

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL")

if [ "$STATUS" = "200" ]; then
  echo "✓ Deploy successful! $RELEASE_TAG is live at $URL"
else
  echo "✗ Warning: Site returned HTTP $STATUS"
  exit 1
fi
