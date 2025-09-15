.PHONY: help build start stop logs clean dev prod install

# Default target
help: ## Show this help message
	@echo "Deploy Webhook - Available commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	npm install

build: ## Build TypeScript code
	npm run build

build-docker: ## Build Docker image
	./scripts/build.sh

build-docker-push: ## Build and push Docker image
	./scripts/build.sh --push -r $(REGISTRY)

dev: ## Start development server
	./scripts/start.sh -m development

prod: ## Start production server
	./scripts/start.sh -m production -d

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
		cp .env.template .env; \
		echo "Created .env file from template. Please edit it with your configuration."; \
	fi
	npm install

# Development helpers
dev-build: ## Build and start development environment
	./scripts/start.sh -m development -b

prod-build: ## Build and start production environment
	./scripts/start.sh -m production -b -d

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
	rm -rf dist/
