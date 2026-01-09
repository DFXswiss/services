#!/bin/bash
# Start app with dev API
# Temporarily modifies .env, starts app, restores on exit

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env"
ENV_SAMPLE="$PROJECT_DIR/.env.sample"

# Create .env from sample if it doesn't exist
if [ ! -f "$ENV_FILE" ]; then
    echo "Creating .env from .env.sample..."
    cp "$ENV_SAMPLE" "$ENV_FILE"
fi

API_URL="https://dev.api.dfx.swiss"

echo "Starting with API: $API_URL"

# Backup original .env
cp "$ENV_FILE" "$ENV_FILE.backup"

# Cleanup function - restore .env on exit (success or failure)
cleanup() {
    echo ""
    echo "Restoring .env..."
    mv "$ENV_FILE.backup" "$ENV_FILE"
}
trap cleanup EXIT

# Modify .env (portable sed for macOS and Linux)
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|^REACT_APP_API_URL=.*|REACT_APP_API_URL=$API_URL|" "$ENV_FILE"
else
    sed -i "s|^REACT_APP_API_URL=.*|REACT_APP_API_URL=$API_URL|" "$ENV_FILE"
fi

# Start the app
npm start
