# Quick Start (Published Image)

GitHub: https://github.com/Morphicai/deploy-webhook

Docker Hub: https://hub.docker.com/repository/docker/focusbe/deploy-webhook/general

## 🚀 Deploy in 5 Minutes

### 1. Start the Container
```bash
docker run -d --name deploy-webhook -p 9000:9000 \
  -e WEBHOOK_SECRET=your-secret \
  -e REGISTRY_HOST=docker.io \
  -e DOCKER_SOCK_PATH=/var/run/docker.sock \
  -v /var/run/docker.sock:/var/run/docker.sock \
  focusbe/deploy-webhook:latest
```

### 2. Access Web Management UI
Open your browser and visit `http://localhost:3001` (requires UI to be started, see below)

On first visit, you'll be guided to create an admin account, then you can manage all features through the visual interface.

### 3. Check Health
```bash
curl http://localhost:9000/health
```

### 4. Trigger a Deployment (CI Example)
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

## 🖥️ Web Management UI

Deploy Webhook provides a modern web management interface with:

- 📊 **Dashboard** - Overview of deployment status and system metrics
- 🚀 **Application Management** - Visual deployment and container monitoring
- ⚙️ **Environment Variables** - Manage global and project-scoped environment variables
- 🔑 **Secrets Management** - Integration with Infisical and other secret providers
- 🌓 **Dark/Light Mode** - Automatic theme switching
- 🌍 **Multi-language Support** - English/Chinese interface

### Start UI (Development Mode)

```bash
cd ui
npm install
npm run dev
```

Access the management interface at `http://localhost:3001`.

### Production UI Deployment

```bash
cd ui
npm install
npm run build
# Serve the dist directory with nginx or another web server
```

## 🔧 Advanced Configuration (Optional)

- `IMAGE_NAME_WHITELIST`: Restrict deployable repos (comma separated)
- `CALLBACK_URL` / `CALLBACK_HEADERS` / `CALLBACK_SECRET`: Enable callbacks with optional HMAC signature
- `JWT_SECRET`: Set JWT secret for management UI authentication

## 🐳 Local Build (Optional)

```bash
# Build backend
cd backend
docker build -t focusbe/deploy-webhook:dev .

# Build frontend
cd ui
npm install
npm run build
```

## 📡 API Examples

### Deployment Request
```bash
curl -X POST http://localhost:9000/deploy \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: your-secret-here" \
  -d '{
    "name": "my-app",
    "version": "1.2.3",
    "repo": "registry.example.com/my-app",
    "port": "8080"
  }'
```

### Response Example
```json
{
  "success": true,
  "code": 0,
  "stdout": "Container started successfully...",
  "stderr": ""
}
```

## 🔒 Security Tips

1. **Set a Strong Secret**
   ```bash
   # Generate random secret
   openssl rand -base64 32
   ```

2. **Limit Network Access**
   - Use firewalls
   - Place behind reverse proxies (Nginx/Traefik)
   - Prefer HTTPS

3. **Docker Socket Safety**
   - Run in trusted environments
   - Consider Docker-in-Docker alternatives if isolation is needed

## 🐛 Troubleshooting

### Common Issues

1. **Port in Use**
   ```bash
   # Adjust PORT in .env
   PORT=9001
   ```

2. **Docker Socket Permission Errors**
   ```bash
   sudo chmod 666 /var/run/docker.sock
   ```

3. **Image Pull Failures**
   - Check network connectivity
   - Verify `DOCKER_USERNAME` / `DOCKER_PASSWORD`
   - Confirm the image name is correct

### Viewing Logs
```bash
# Real-time logs
make logs

# Dev environment logs
make logs-dev

# Container logs
docker logs deploy-webhook -f
```

## 📝 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WEBHOOK_SECRET` | ✅ | - | Webhook secret |
| `PORT` | ❌ | 9000 | Service port |
| `HOST_PORT` | ❌ | 8806 | Host port |
| `DOCKER_USERNAME` | ❌ | - | Registry username |
| `DOCKER_PASSWORD` | ❌ | - | Registry password |

## 🚀 Production Tips

1. **Use HTTPS**
2. **Set up monitoring and alerts**
3. **Back up configuration regularly**
4. **Consider orchestration tools** (e.g., Kubernetes)
5. **Implement log management**

## Roadmap (Kubernetes)

- Upcoming Kubernetes deployment provider while keeping the `/deploy` contract unchanged.
- Planned features include Deployment/Service generation, rolling updates, probes, namespace isolation, HPA, and image pull secrets.
- Helm Chart and sample YAML will be provided for cluster installs or CI integration.
