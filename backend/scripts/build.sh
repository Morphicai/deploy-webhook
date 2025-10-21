#!/usr/bin/env bash

set -euo pipefail

# Build script for deploy-webhook Docker image

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Default values
IMAGE_NAME="deploy-webhook"
TAG="latest"
PLATFORM="linux/amd64"
PUSH=false
REGISTRY=""

log() { echo -e "\033[1;34m[INFO]\033[0m $*"; }
err() { echo -e "\033[1;31m[ERROR]\033[0m $*" >&2; }
warn() { echo -e "\033[1;33m[WARN]\033[0m $*" >&2; }

usage() {
  cat <<EOF
Usage: $0 [options]

Options:
  -n, --name <name>       Image name (default: ${IMAGE_NAME})
  -t, --tag <tag>         Image tag (default: ${TAG})
  -p, --platform <arch>   Target platform (default: ${PLATFORM})
  -r, --registry <url>    Registry URL for pushing
  --push                  Push image to registry after build
  -h, --help              Show this help

Examples:
  $0                                          # Build with defaults
  $0 -t v1.0.0                              # Build with specific tag
  $0 -r registry.example.com --push          # Build and push to registry
  $0 -t v1.0.0 -r myregistry.com/myorg --push # Build and push with custom tag
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    -n|--name) IMAGE_NAME="$2"; shift 2;;
    -t|--tag) TAG="$2"; shift 2;;
    -p|--platform) PLATFORM="$2"; shift 2;;
    -r|--registry) REGISTRY="$2"; shift 2;;
    --push) PUSH=true; shift;;
    -h|--help) usage; exit 0;;
    *) err "Unknown argument: $1"; usage; exit 1;;
  esac
done

# Set full image name
if [[ -n "$REGISTRY" ]]; then
  FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}:${TAG}"
else
  FULL_IMAGE_NAME="${IMAGE_NAME}:${TAG}"
fi

log "Building Docker image..."
log "Image name: $FULL_IMAGE_NAME"
log "Platform: $PLATFORM"
log "Context: $PROJECT_DIR"

# Change to project directory
cd "$PROJECT_DIR"

# Build the image
log "Running docker build..."
docker build \
  --platform "$PLATFORM" \
  -t "$FULL_IMAGE_NAME" \
  -f Dockerfile \
  .

log "Build completed successfully!"

# Push if requested
if [[ "$PUSH" == "true" ]]; then
  if [[ -z "$REGISTRY" ]]; then
    err "Registry URL is required for pushing. Use -r/--registry option."
    exit 1
  fi
  
  log "Pushing image to registry..."
  docker push "$FULL_IMAGE_NAME"
  log "Push completed successfully!"
fi

log "Done!"
log "Image: $FULL_IMAGE_NAME"

# Show image info
log "Image details:"
docker images "$FULL_IMAGE_NAME" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedSince}}"
