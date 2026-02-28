#!/usr/bin/env bash
# redeploy.sh — Pull the latest changes and restart the Teeny Tanks game server.
# Run this inside your Lightsail instance whenever you have pushed updates to main.
#
# Usage:
#   bash ~/teeny-tanks/deploy/redeploy.sh
#
# Or make it executable once:
#   chmod +x ~/teeny-tanks/deploy/redeploy.sh
#   ~/teeny-tanks/deploy/redeploy.sh

set -euo pipefail

APP_DIR="$HOME/teeny-tanks"

echo ""
echo "========================================"
echo "  Teeny Tanks — Redeploying"
echo "========================================"
echo ""

# ── 1. Pull latest changes ────────────────────────────────────────────────────
echo "--> Pulling latest changes from origin/main..."
cd "$APP_DIR"
git pull origin main

# ── 2. Install dependencies ───────────────────────────────────────────────────
# This is a fast no-op when nothing in package.json changed, but handles the
# case where a dependency was added or upgraded.
echo "--> Installing dependencies..."
npm install

# ── 3. Build all packages ─────────────────────────────────────────────────────
# Order: shared -> server -> client  (defined in root package.json)
# Increase Node heap to avoid OOM crashes during Vite/Rollup bundling on
# memory-constrained instances (e.g. 512 MB / 1 GB Lightsail).
echo "--> Building (shared → server → client)..."
export NODE_OPTIONS="--max-old-space-size=1024"
npm run build
unset NODE_OPTIONS

# ── 4. Reload the game server ─────────────────────────────────────────────────
# pm2 reload performs a graceful zero-downtime restart: the old process stays
# alive until the new one is ready, so in-progress games are dropped gracefully
# rather than abruptly.
echo "--> Reloading game server via PM2..."
pm2 reload teeny-tanks --update-env

echo ""
echo "========================================"
echo "  Done! Server is running the latest code."
echo "========================================"
echo ""

# Show the current PM2 status so you can confirm everything looks healthy.
pm2 status
