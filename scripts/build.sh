#!/bin/bash
# Build script
# Usage: ./scripts/build.sh [dev|prod]
# Default: prod

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env"

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

echo "Building for: $ENV"
echo "API: $API_URL"

# Backup original .env
cp "$ENV_FILE" "$ENV_FILE.backup"

# Modify .env for build
sed -i '' "s|^REACT_APP_API_URL=.*|REACT_APP_API_URL=$API_URL|" "$ENV_FILE"
sed -i '' "s|^REACT_APP_PUBLIC_URL=.*|REACT_APP_PUBLIC_URL=$PUBLIC_URL|" "$ENV_FILE"

# Cleanup function
cleanup() {
    mv "$ENV_FILE.backup" "$ENV_FILE"
}

trap cleanup EXIT

# Build
CI=false react-app-rewired build
