#!/bin/bash

# Test script for the updated webhook with volumes and environment variables support

# Set your webhook secret and server URL
WEBHOOK_SECRET="${WEBHOOK_SECRET:-your-secret-here}"
WEBHOOK_URL="${WEBHOOK_URL:-http://localhost:9000/deploy}"
VERSION="${VERSION:-latest}"

echo "Testing webhook with volumes and environment variables..."
echo "URL: $WEBHOOK_URL"
echo "Version: $VERSION"
echo "Secret: ${WEBHOOK_SECRET:0:8}..."
echo ""

# Test 1: Basic deployment (original functionality)
echo "=== Test 1: Basic deployment ==="
curl --fail --show-error -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"test-basic\",
    \"repo\": \"nginx\",
    \"version\": \"alpine\",
    \"port\": 8080,
    \"containerPort\": 80,
    \"secret\": \"$WEBHOOK_SECRET\"
  }"

echo -e "\n\n"

# Test 2: Deployment with volumes and environment variables
echo "=== Test 2: Deployment with volumes and environment ==="
curl --fail --show-error -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"myproxy\",
    \"repo\": \"focusbe/myproxy\",
    \"version\": \"$VERSION\",
    \"port\": 8901,
    \"containerPort\": 3000,
    \"volumes\": [\"/opt/myproxy/storage/my-proxy/data:/app/data\"],
    \"environment\": [\"CONFIG_PATH=/app/data/config.json\", \"NODE_ENV=production\"],
    \"secret\": \"$WEBHOOK_SECRET\"
  }"

echo -e "\n\n"

# Test 3: Health check
echo "=== Test 3: Health check ==="
curl --fail --show-error "$WEBHOOK_URL/../health"

echo -e "\n\nAll tests completed!"