#!/bin/bash
# Start app with dev API
# Temporarily modifies .env, starts app, restores on exit

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env"

API_URL="https://dev.api.dfx.swiss"

echo "Starting with API: $API_URL"

# Backup original .env
cp "$ENV_FILE" "$ENV_FILE.backup"

# Modify .env
sed -i '' "s|^REACT_APP_API_URL=.*|REACT_APP_API_URL=$API_URL|" "$ENV_FILE"

# Cleanup function
cleanup() {
    echo ""
    echo "Restoring .env..."
    mv "$ENV_FILE.backup" "$ENV_FILE"
}

trap cleanup EXIT

# Start the app
npm start
