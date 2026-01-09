#!/bin/bash
# Widget build script
# Usage: ./scripts/build-widget.sh [dev|prod]
# Default: prod

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env"
SRC_DIR="$PROJECT_DIR/src"

ENV="${1:-prod}"

case $ENV in
  dev)
    API_URL="https://dev.api.dfx.swiss"
    PUBLIC_URL="https://dev.app.dfx.swiss"
    ;;
  prod|*)
    API_URL="https://api.dfx.swiss"
    PUBLIC_URL="https://app.dfx.swiss"
    ;;
esac

echo "Building widget for: $ENV"
echo "API: $API_URL"

# Backup files
cp "$ENV_FILE" "$ENV_FILE.backup"
cp "$SRC_DIR/index.tsx" "$SRC_DIR/index.bak.tsx"

# Swap index for widget
cp "$SRC_DIR/index-widget.tsx" "$SRC_DIR/index.tsx"

# Modify .env for build
sed -i '' "s|^REACT_APP_API_URL=.*|REACT_APP_API_URL=$API_URL|" "$ENV_FILE"
sed -i '' "s|^REACT_APP_PUBLIC_URL=.*|REACT_APP_PUBLIC_URL=$PUBLIC_URL|" "$ENV_FILE"

# Add widget-specific config
echo "BUILD_PATH=./widget" >> "$ENV_FILE"
echo "GENERATE_SOURCEMAP=false" >> "$ENV_FILE"

# Cleanup function
cleanup() {
    mv "$ENV_FILE.backup" "$ENV_FILE"
    mv "$SRC_DIR/index.bak.tsx" "$SRC_DIR/index.tsx"
}

trap cleanup EXIT

# Build
react-app-rewired build
