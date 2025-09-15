#!/usr/bin/env bash

set -euo pipefail

# Start script for deploy-webhook

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Default values
MODE="production"
DETACH=false
BUILD=false

log() { echo -e "\033[1;34m[INFO]\033[0m $*"; }
err() { echo -e "\033[1;31m[ERROR]\033[0m $*" >&2; }
warn() { echo -e "\033[1;33m[WARN]\033[0m $*" >&2; }

usage() {
  cat <<EOF
Usage: $0 [options]

Options:
  -m, --mode <mode>       Run mode: production, development (default: ${MODE})
  -d, --detach            Run in detached mode (background)
  -b, --build             Build images before starting
  -h, --help              Show this help

Examples:
  $0                      # Start production mode in foreground
  $0 -m development       # Start development mode
  $0 -d -b               # Build and start in background
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    -m|--mode) MODE="$2"; shift 2;;
    -d|--detach) DETACH=true; shift;;
    -b|--build) BUILD=true; shift;;
    -h|--help) usage; exit 0;;
    *) err "Unknown argument: $1"; usage; exit 1;;
  esac
done

# Validate mode
if [[ "$MODE" != "production" && "$MODE" != "development" ]]; then
  err "Invalid mode: $MODE. Must be 'production' or 'development'"
  exit 1
fi

# Change to project directory
cd "$PROJECT_DIR"

# Check if .env file exists
if [[ ! -f ".env" ]]; then
  warn ".env file not found. Creating from template..."
  if [[ -f ".env.template" ]]; then
    cp ".env.template" ".env"
    log "Created .env file from template. Please edit it with your configuration."
  else
    err ".env.template file not found. Please create .env file manually."
    exit 1
  fi
fi

# Build Docker Compose command
COMPOSE_CMD="docker-compose"

# Add build flag if requested
if [[ "$BUILD" == "true" ]]; then
  COMPOSE_CMD="$COMPOSE_CMD --build"
fi

# Add detach flag if requested
if [[ "$DETACH" == "true" ]]; then
  COMPOSE_CMD="$COMPOSE_CMD up -d"
else
  COMPOSE_CMD="$COMPOSE_CMD up"
fi

# Add service name based on mode
if [[ "$MODE" == "development" ]]; then
  COMPOSE_CMD="$COMPOSE_CMD --profile dev deploy-webhook-dev"
  log "Starting in development mode..."
else
  COMPOSE_CMD="$COMPOSE_CMD deploy-webhook"
  log "Starting in production mode..."
fi

log "Running: $COMPOSE_CMD"

# Execute the command
eval "$COMPOSE_CMD"

if [[ "$DETACH" == "true" ]]; then
  log "Service started in background."
  log "Check status with: docker-compose ps"
  log "View logs with: docker-compose logs -f"
  log "Stop with: docker-compose down"
fi
