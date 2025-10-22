#!/bin/bash

# Start Deploy Webhook MCP Server
# This script is used to start the MCP server in stdio mode
# for use with Claude Desktop or other MCP clients

# Get the directory of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$DIR/.."

cd "$BACKEND_DIR"

# Build if needed
if [ ! -d "dist" ]; then
    echo "Building backend..."
    npm run build
fi

# Set environment variables
export NODE_ENV=production
export DATABASE_PATH="${DATABASE_PATH:-../data/deploy-webhook.db}"

# Start MCP server
echo "Starting Deploy Webhook MCP Server..."
node dist/mcp/server.js

