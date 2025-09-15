# Deploy Webhook

轻量级的部署 Webhook 服务，支持通过 HTTP 请求在宿主机上拉起指定 Docker 镜像版本（停止并替换同名容器），可选回调通知与镜像清理。已发布 Docker 镜像，开箱即用。

Docker Hub: https://hub.docker.com/r/focusbe/deploy-webhook

```bash
docker pull focusbe/deploy-webhook:latest
```

## 特性

- 🐳 **镜像即用**：使用官方镜像一条命令即可启动
- 🔧 **宿主机 Docker 管理**：通过 Docker socket 操作宿主机容器
- 🔒 **安全认证**：Webhook 密钥校验 + 可选镜像白名单
- 🚀 **快速部署**：指定 name/repo/version/port/containerPort 即可
- 📣 **回调通知**：可选异步回调部署结果
- 🧹 **镜像清理**：可选清理 dangling images
- 📝 **TypeScript**：清晰的类型与结构化实现

## 快速开始（使用发布镜像）

### 1) 直接运行容器

```bash
docker run -d --name deploy-webhook -p 9000:9000 \
  -e WEBHOOK_SECRET=your-secret \
  -e REGISTRY_HOST=registry.example.com \
  -e DOCKER_SOCK_PATH=/var/run/docker.sock \
  -e IMAGE_NAME_WHITELIST="org/app1,org/app2" \
  -e PRUNE_IMAGES=true -e PRUNE_STRATEGY=dangling \
  -v /var/run/docker.sock:/var/run/docker.sock \
  focusbe/deploy-webhook:latest
```

### 2) 验证健康

```bash
curl http://localhost:9000/health

### 3) 触发部署（CI 示例）
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

## 配置说明（环境变量）

### 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `PORT` | 服务监听端口 | `9000` |
| `WEBHOOK_SECRET` | Webhook安全密钥 | - |
| `DEFAULT_CONTAINER_NAME` | 默认容器名称 | `morphicai-app-shell` |
| `REGISTRY_HOST` | 镜像仓库地址（例如 `docker.io`, `registry.example.com`） | - |
| `DOCKER_SOCK_PATH` | Docker socket 路径（容器与宿主需一致挂载） | `/var/run/docker.sock` |
| `DOCKER_USERNAME` | 镜像仓库用户名（可选） | - |
| `DOCKER_PASSWORD` | 镜像仓库密码（可选） | - |
| `IMAGE_NAME_WHITELIST` | 允许部署的 `repo` 白名单（逗号分隔） | - |
| `PRUNE_IMAGES` | 是否清理 dangling images（`true`/`false`） | `false` |
| `PRUNE_STRATEGY` | 清理策略（`dangling`/`none`） | `dangling` |
| `CALLBACK_URL` | 部署结果回调地址（可选） | - |
| `CALLBACK_HEADERS` | 回调附加请求头（JSON 或 `k=v;h=v2`） | - |
| `CALLBACK_SECRET` | 回调签名密钥（HMAC-SHA256） | - |

### Docker Socket挂载

为了让容器能够管理宿主机的Docker，需要挂载Docker socket：

```bash
-v /var/run/docker.sock:/var/run/docker.sock
```

## API

### POST /deploy

部署应用容器

**请求头:**
- `Content-Type: application/json`
- `x-webhook-secret: <your-secret>` (或在请求体中提供)

**请求体（仅需 5 个字段）:**
```json
{
  "name": "container-name",
  "repo": "org/app",
  "version": "1.0.0",
  "port": 8080,
  "containerPort": 3000
}
```

**响应:**
```json
{ "success": true, "deploymentId": "..." }
```

### GET /health

健康检查端点

**响应:**
```json
{
  "ok": true,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600
}
```

## 开发与构建

我们已提供官方镜像。如需本地开发/构建：

```bash
npm ci && npm run build
docker build -t focusbe/deploy-webhook:dev .
```

## 开发

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建项目
npm run build

# 启动生产服务器
npm start
```

### Docker开发

```bash
# 启动开发环境
docker-compose --profile dev up -d

# 查看日志
docker-compose logs -f deploy-webhook-dev

# 停止服务
docker-compose --profile dev down
```

## 安全考虑

1. **Webhook密钥**: 务必设置强密钥并妥善保管
2. **Docker Socket**: 挂载Docker socket具有较高权限，确保容器运行在受信任的环境
3. **网络访问**: 建议在防火墙后运行，或使用反向代理
4. **镜像仓库**: 使用私有仓库时，确保凭据安全存储

## 故障排除

### 常见问题

1. **Docker socket权限错误**
   ```bash
   # 确保Docker socket权限正确
   sudo chmod 666 /var/run/docker.sock
   ```

2. **端口占用**
   ```bash
   # 检查端口使用情况
   netstat -tlnp | grep :9000
   ```

3. **镜像拉取失败**
   - 检查网络连接
   - 验证镜像仓库凭据
   - 确认镜像名称和标签正确

### 日志查看

```bash
# Docker Compose日志
docker-compose logs -f deploy-webhook

# 容器日志
docker logs deploy-webhook
```

## 贡献

欢迎提交Issue和Pull Request！

## 许可证

## Roadmap / Kubernetes 支持

- 我们正在规划提供可插拔“部署提供器（Provider）”抽象：
  - 现有 `DockerProvider`（通过 Docker socket 部署）
  - 即将到来的 `K8sProvider`（通过 Kubernetes API/集群内权限部署）
- 目标：保持 `/deploy` 请求协议不变（仍只需 name/repo/version/port/containerPort），通过环境变量选择 Provider 与目标平台。
- 计划能力：
  - 生成/应用 Deployment、Service 等资源，原生滚动升级与探针支持
  - 命名空间隔离、HPA 扩缩容、镜像拉取凭证
  - 提供 Helm Chart 与示例清单，简化安装
- 迁移路径：单机 Docker → 切换 Provider=K8s → 渐进式把 app 配置迁移为 K8s/Helm values。

MIT License