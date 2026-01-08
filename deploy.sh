#!/bin/bash

set -e

# === CONFIGURATION ===
# Replace with your SSH login (same as: ssh username@ip)
SERVER="root@joe-bor.me"
REMOTE_PATH="/var/www/familyhub"

# === DEPLOY ===
echo "Building..."
npm run build

echo "Deploying to $SERVER..."
rsync -avz --delete dist/ "$SERVER:$REMOTE_PATH/"

echo "Verifying deployment..."
sleep 2  # Give nginx a moment

URL="https://familyhub.joe-bor.me"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL")

if [ "$STATUS" = "200" ]; then
  echo "✓ Deploy successful! Site is live at $URL"
else
  echo "✗ Warning: Site returned HTTP $STATUS"
  exit 1
fi
