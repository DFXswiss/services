#!/bin/bash
# E2E Test Runner
# Temporarily modifies .env to use dev API, runs tests, then restores

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

# Default API for E2E tests
API_URL="${E2E_API_URL:-https://dev.api.dfx.swiss}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}E2E Test Runner${NC}"
echo "Using API: $API_URL"
echo ""

# Backup original .env
cp "$ENV_FILE" "$ENV_FILE.backup"

# Modify .env for E2E tests (portable sed for macOS and Linux)
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|^REACT_APP_API_URL=.*|REACT_APP_API_URL=$API_URL|" "$ENV_FILE"
else
    sed -i "s|^REACT_APP_API_URL=.*|REACT_APP_API_URL=$API_URL|" "$ENV_FILE"
fi

# Cleanup function to restore .env
cleanup() {
    echo ""
    echo -e "${YELLOW}Restoring .env...${NC}"
    mv "$ENV_FILE.backup" "$ENV_FILE"
}

# Always restore .env on exit
trap cleanup EXIT

# Run Playwright tests with all arguments passed through
echo -e "${GREEN}Running Playwright tests...${NC}"
echo ""
npx playwright test "$@"
