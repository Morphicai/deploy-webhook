.PHONY: help build start stop logs clean dev prod install

# Default target
help: ## Show this help message
	@echo "Deploy Webhook - Available commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies for all packages
	pnpm install

install-backend: ## Install backend dependencies only
	cd backend && pnpm install

install-ui: ## Install UI dependencies only
	cd ui && pnpm install

build: ## Build all packages
	pnpm run build

build-backend: ## Build backend TypeScript code
	pnpm --filter backend build

build-ui: ## Build UI for production
	pnpm --filter ui build

build-docker: ## Build Docker image
	cd backend && ./scripts/build.sh

build-docker-push: ## Build and push Docker image
	cd backend && ./scripts/build.sh --push -r $(REGISTRY)

dev: ## Start all development servers (backend + ui)
	pnpm --parallel -r dev

dev-backend: ## Start backend development server
	pnpm --filter backend dev

dev-ui: ## Start UI development server
	pnpm --filter ui dev

dev-docker: ## Start development server with Docker
	cd backend && ./scripts/start.sh -m development

prod: ## Start production server with Docker
	cd backend && ./scripts/start.sh -m production -d

start: ## Start services in background
	docker-compose up -d

stop: ## Stop services
	docker-compose down

restart: ## Restart services
	docker-compose restart

logs: ## View logs
	docker-compose logs -f

logs-dev: ## View development logs
	docker-compose logs -f deploy-webhook-dev

status: ## Show service status
	docker-compose ps

clean: ## Clean up containers and images
	docker-compose down -v --remove-orphans
	docker system prune -f

clean-all: ## Clean everything including images
	docker-compose down -v --remove-orphans
	docker system prune -af

test-health: ## Test health endpoint
	curl -f http://localhost:9000/health || echo "Service not available"

test-deploy: ## Test deploy endpoint (requires WEBHOOK_SECRET)
	@if [ -z "$(SECRET)" ]; then \
		echo "Usage: make test-deploy SECRET=your-webhook-secret"; \
		exit 1; \
	fi
	curl -X POST http://localhost:9000/deploy \
		-H "Content-Type: application/json" \
		-H "x-webhook-secret: $(SECRET)" \
		-d '{"name": "test", "version": "latest"}'

setup: ## Initial setup - copy env template and install deps
	@if [ ! -f .env ]; then \
		cp .env.template .env 2>/dev/null || echo "No .env.template found, skipping..."; \
	fi
	pnpm install
	@echo "Setup complete! Run 'make dev' to start development."

# Development helpers
dev-build: ## Build and start development environment with Docker
	cd backend && ./scripts/start.sh -m development -b

prod-build: ## Build and start production environment with Docker
	cd backend && ./scripts/start.sh -m production -b -d

# Docker helpers
docker-logs: ## View Docker container logs
	docker logs deploy-webhook -f

docker-shell: ## Get shell access to running container
	docker exec -it deploy-webhook /bin/sh

docker-inspect: ## Inspect running container
	docker inspect deploy-webhook

# Cleanup helpers
clean-logs: ## Clean up log files
	rm -rf logs/*

clean-dist: ## Clean built files
	rm -rf backend/dist/ ui/dist/

clean-deps: ## Clean all node_modules
	rm -rf node_modules backend/node_modules ui/node_modules

clean-all-build: ## Clean all build artifacts and dependencies
	pnpm run clean
	rm -rf node_modules backend/node_modules ui/node_modules backend/dist ui/dist
