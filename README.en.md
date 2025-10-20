# Deploy Webhook

Lightweight deployment webhook service that can start or replace Docker containers on a host through a simple HTTP request. Supports optional callback notifications and image pruning. An official Docker image is available for drop-in usage.

GitHub: https://github.com/Morphicai/deploy-webhook

Docker Hub: https://hub.docker.com/repository/docker/focusbe/deploy-webhook/general

```bash
docker pull focusbe/deploy-webhook:latest
```

## Features

- 🔧 **Host Docker Control**: Talks to the Docker host via the socket
- 🔒 **Secure Authentication**: Webhook secret validation plus optional image whitelist
- 🚀 **Simple Deployments**: Provide name/repo/version/port/containerPort and go
- 📣 **Callback Notifications**: Optional asynchronous result webhook
- 🧹 **Image Cleanup**: Optional dangling image pruning after deploy
- 📝 **TypeScript**: Strong typing and structured implementation

## How It Works

1. **Webhook Intake**: `/deploy` endpoint receives signed JSON payloads, validates `WEBHOOK_SECRET`, and ensures required fields are present.
2. **Docker Operations**: Interacts with Docker via unix socket or remote API to pull images, stop/remove same-name containers, then create and start the new container.
3. **Result Reporting**: Returns a consistent JSON response and optionally POSTs results to `CALLBACK_URL` with optional HMAC signature.
4. **Cleanup Workflow**: When enabled, performs post-deploy image pruning according to the configured strategy.

## Quick Start (Using the Published Image)

### 1) Run the Container

```bash
docker run -d --name deploy-webhook -p 9000:9000 \
  -e WEBHOOK_SECRET=your-secret \
  -e REGISTRY_HOST=docker.io \
  -e DOCKER_SOCK_PATH=/var/run/docker.sock \
  -v /var/run/docker.sock:/var/run/docker.sock \
  focusbe/deploy-webhook:latest
```

### 2) Check Health

```bash
curl http://localhost:9000/health
```

### 3) Trigger a Deployment (CI Example)

```bash
curl -X POST http://<host>:9000/deploy \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: your-secret" \
  -d '{
    "name": "my-app",
    "repo": "org/app",
    "version": "1.2.3",
    "port": 8080,
    "containerPort": 3000
  }'
```

## Configuration (Environment Variables)

### Environment Variables

| Name | Description | Default |
|------|-------------|---------|
| `PORT` | Service listen port | `9000` |
| `WEBHOOK_SECRET` | Webhook secret | - |
| `REGISTRY_HOST` | Image registry host (e.g. `docker.io`, `registry.example.com`) | - |
| `DOCKER_SOCK_PATH` | Docker socket path (must be mounted identically) | `/var/run/docker.sock` |
| `DOCKER_HOST` | Docker API endpoint (takes precedence over socket). Examples: `tcp://host:2375`, `tcp://host:2376`, `unix:///var/run/docker.sock` | - |
| `DOCKER_TLS_VERIFY` | Enable TLS (`1`/`true` for 2376) | - |
| `DOCKER_CERT_PATH` | TLS cert directory (`ca.pem`, `cert.pem`, `key.pem`) | - |
| `DOCKER_USERNAME` | Registry username (optional) | - |
| `DOCKER_PASSWORD` | Registry password (optional) | - |
| `IMAGE_NAME_WHITELIST` | Allowed `repo` list (comma separated) | - |
| `PRUNE_IMAGES` | Prune dangling images (`true`/`false`) | `false` |
| `PRUNE_STRATEGY` | Prune strategy (`dangling`/`none`) | `dangling` |
| `CALLBACK_URL` | Optional callback URL | - |
| `CALLBACK_HEADERS` | Extra callback headers (JSON or `k=v;h=v2`) | - |
| `CALLBACK_SECRET` | Callback HMAC secret | - |

### Connection Options

#### 1) Local Socket (Default)

Mount the Docker socket so the container can control the host daemon:

```bash
-v /var/run/docker.sock:/var/run/docker.sock
```

#### 2) Remote Docker API (DOCKER_HOST/TLS)

Connect over TCP without mounting the socket:

```bash
# No encryption (development only)
export DOCKER_HOST=tcp://docker.example.com:2375

# TLS (recommended for production)
export DOCKER_HOST=tcp://docker.example.com:2376
export DOCKER_TLS_VERIFY=1
export DOCKER_CERT_PATH=/path/to/certs  # contains ca.pem cert.pem key.pem
```

Docker Desktop (Mac/Windows) can also expose `tcp://localhost:2375` without TLS for development.

## API

### POST /deploy

Deploy an application container.

**Headers:**
- `Content-Type: application/json`
- `x-webhook-secret: <your-secret>` (or include in body)

**Body (only 5 fields required):**
```json
{
  "name": "container-name",
  "repo": "org/app",
  "version": "1.0.0",
  "port": 8080,
  "containerPort": 3000
}
```

**Response:**
```json
{ "success": true, "deploymentId": "..." }
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "ok": true,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600
}
```

## Development & Build

The official image is ready to use, but for local development/build:

```bash
cp .env.example .env  # copy env template on first run
npm ci && npm run build
docker build -t focusbe/deploy-webhook:dev .
```

## Development

### Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build project
npm run build

# Start production server
npm start
```

### Docker Development

```bash
# Bring up dev stack
docker-compose --profile dev up -d

# View logs
docker-compose logs -f deploy-webhook-dev

# Tear down
docker-compose --profile dev down
```

## Security Considerations

1. **Webhook Secret**: Use a strong secret and protect it
2. **Docker Socket**: Mounting the socket grants high privileges—run in trusted environments
3. **Network Access**: Place behind a firewall or reverse proxy; prefer HTTPS
4. **Image Registry**: Securely store credentials for private registries

## Best Practices

1. Keep configuration in read-only files and externalize secrets via dedicated secret managers.
2. Add idempotency checks (e.g., version hashes) in CI/CD triggers to avoid duplicate deployments.
3. Restrict ingress IPs via reverse proxies and layer additional signature headers when required.
4. Configure callback consumers with retry logic and alerting to track deployment outcomes.
5. Regularly audit host resources (disk, network, ports) and collect deployment logs for monitoring.

## Troubleshooting

### Common Issues

1. **Docker socket permission error**
   ```bash
   # Ensure socket permissions are correct
   sudo chmod 666 /var/run/docker.sock
   ```

2. **Port already in use**
   ```bash
   # Check port usage
   netstat -tlnp | grep :9000
   ```

3. **Image pull failures**
   - Verify network connectivity
   - Check registry credentials
   - Confirm image name and tag

### Viewing Logs

```bash
# Docker Compose logs
docker-compose logs -f deploy-webhook

# Container logs
docker logs deploy-webhook
```

## Contributing

Issues and pull requests are welcome!

## License

MIT License

## Roadmap / Kubernetes Support

- Working on pluggable "Deployment Provider" abstraction:
- Current `DockerProvider` (deploy via Docker socket)
- Upcoming `K8sProvider` (deploy via Kubernetes API/cluster access)
- Goal: keep the `/deploy` contract unchanged (still only name/repo/version/port/containerPort) and select provider/target via environment variables.
- Planned capabilities:
  - Generate/apply Deployment and Service resources with native rolling updates and probes
  - Namespace isolation, HPA, and image pull secrets
  - Provide Helm Chart and sample manifests to simplify install
- Migration path: standalone Docker → set Provider=K8s → gradually move app config to K8s/Helm values
