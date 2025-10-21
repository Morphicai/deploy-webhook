# Deploy Webhook

轻量级的部署 Webhook 服务，支持通过 HTTP 请求在宿主机上拉起指定 Docker 镜像版本（停止并替换同名容器），可选回调通知与镜像清理。已发布 Docker 镜像，开箱即用。

GitHub: https://github.com/Morphicai/deploy-webhook

Docker Hub: https://hub.docker.com/repository/docker/focusbe/deploy-webhook/general

```bash
docker pull focusbe/deploy-webhook:latest
```

## 📦 项目结构 (Monorepo)

本项目采用 pnpm workspace 管理的 monorepo 结构：

```
deploy-webhook/
├── backend/          # 后端 API 服务 (Node.js + TypeScript + Express)
│   ├── src/         # TypeScript 源码
│   ├── dist/        # 编译输出
│   ├── scripts/     # 构建和部署脚本
│   ├── Dockerfile   # 生产环境 Docker 镜像
│   └── Dockerfile.dev  # 开发环境 Docker 镜像
├── ui/              # 前端管理界面 (React + Vite + TailwindCSS)
│   ├── src/         # React 源码
│   └── dist/        # 构建输出
├── data/            # 共享数据目录（数据库等）
├── docker-compose.yml  # Docker 编排配置
├── Makefile         # 快捷命令
├── pnpm-workspace.yaml # pnpm workspace 配置
└── package.json     # 根级依赖管理
```

## 特性

- 🔧 **宿主机 Docker 管理**：通过 Docker socket 操作宿主机容器
- 🔒 **安全认证**：Webhook 密钥校验 + 可选镜像白名单
- 🚀 **快速部署**：指定 name/repo/version/port/containerPort 即可
- 📣 **回调通知**：可选异步回调部署结果
- 🧹 **镜像清理**：可选清理 dangling images
- 📝 **TypeScript**：清晰的类型与结构化实现

## 原理说明

1. Webhook 接收端：通过 `/deploy` 接口接收带签名的 JSON 请求，先校验 `WEBHOOK_SECRET` 与参数完整性。
2. Docker 操作层：基于 Docker API（unix socket 或远程 API）拉取镜像、停止并移除同名容器，再创建并启动新容器。
3. 状态反馈：部署结果以统一的 JSON 返回，若配置回调则将结果异步推送到 `CALLBACK_URL`，并支持 HMAC 签名。
4. 清理流程：可选地在部署完成后触发镜像清理策略，维护宿主机资源使用。

## 快速开始（使用发布镜像）

### 1) 直接运行容器

```bash
docker run -d --name deploy-webhook -p 9000:9000 \
  -e WEBHOOK_SECRET=your-secret \
  -e REGISTRY_HOST=docker.io \
  -e DOCKER_SOCK_PATH=/var/run/docker.sock \
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
| `REGISTRY_HOST` | 镜像仓库地址（例如 `docker.io`, `registry.example.com`） | - |
| `DOCKER_SOCK_PATH` | Docker socket 路径（容器与宿主需一致挂载） | `/var/run/docker.sock` |
| `DOCKER_HOST` | Docker API 端点（优先级高于 socket）例：`tcp://host:2375`、`tcp://host:2376`、`unix:///var/run/docker.sock` | - |
| `DOCKER_TLS_VERIFY` | 是否启用 TLS（`1`/`true` 开启，匹配 2376 端口） | - |
| `DOCKER_CERT_PATH` | TLS 证书目录（包含 `ca.pem`、`cert.pem`、`key.pem`） | - |
| `DOCKER_USERNAME` | 镜像仓库用户名（可选） | - |
| `DOCKER_PASSWORD` | 镜像仓库密码（可选） | - |
| `IMAGE_NAME_WHITELIST` | 允许部署的 `repo` 白名单（逗号分隔） | - |
| `PRUNE_IMAGES` | 是否清理 dangling images（`true`/`false`） | `false` |
| `PRUNE_STRATEGY` | 清理策略（`dangling`/`none`） | `dangling` |
| `CALLBACK_URL` | 部署结果回调地址（可选） | - |
| `CALLBACK_HEADERS` | 回调附加请求头（JSON 或 `k=v;h=v2`） | - |
| `CALLBACK_SECRET` | 回调签名密钥（HMAC-SHA256） | - |

### 连接方式

#### 1) 本地 Socket（默认）

为了让容器能够管理宿主机的Docker，需要挂载Docker socket：

```bash
-v /var/run/docker.sock:/var/run/docker.sock
```

#### 2) 远程 Docker API（DOCKER_HOST/TLS）

无需挂载 socket，通过 TCP 连接 Docker 守护进程：

```bash
# 不加密（仅限内网/开发，生产不建议）
export DOCKER_HOST=tcp://docker.example.com:2375

# TLS（生产推荐）
export DOCKER_HOST=tcp://docker.example.com:2376
export DOCKER_TLS_VERIFY=1
export DOCKER_CERT_PATH=/path/to/certs  # 包含 ca.pem cert.pem key.pem
```

Docker Desktop（Mac/Windows）也可在设置中启用 “Expose daemon on tcp://localhost:2375 without TLS”（仅开发使用）。

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

### Swagger 文档

新增 `/docs` 路径用于查看自动生成的 Swagger UI（交互式调试），以及 `/docs.json` 获取原始文档 JSON。默认扫描 `src/**/*.ts` 中的 OpenAPI 注释自动生成。

访问方式：

```bash
npm run dev
# 浏览器打开 http://localhost:9000/docs 查看界面
# 或使用 curl http://localhost:9000/docs.json 获取 JSON
```

若部署在服务器上，请将 `localhost:9000` 替换为实际的域名或 IP。

## 🚀 快速开始（本地开发）

### 前置要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0 (推荐) 或 npm
- Docker (可选，用于容器化部署)

### 安装 pnpm (如果尚未安装)

```bash
npm install -g pnpm
```

### 开发步骤

```bash
# 1. 克隆仓库
git clone https://github.com/Morphicai/deploy-webhook.git
cd deploy-webhook

# 2. 安装所有依赖 (根目录 + backend + ui)
pnpm install
# 或使用 Makefile
make install

# 3. 启动开发服务器 (同时启动 backend 和 ui)
pnpm dev
# 或分别启动
pnpm --filter backend dev  # 后端: http://localhost:9000
pnpm --filter ui dev       # 前端: http://localhost:5173

# 4. 构建项目
pnpm build
# 或分别构建
pnpm --filter backend build
pnpm --filter ui build
```

### 使用 Makefile (推荐)

```bash
# 查看所有可用命令
make help

# 安装依赖
make install

# 启动所有开发服务器
make dev

# 仅启动后端
make dev-backend

# 仅启动前端
make dev-ui

# 构建所有项目
make build

# 构建 Docker 镜像
make build-docker

# 使用 Docker Compose 启动
make start

# 停止服务
make stop
```

## 🐳 Docker 开发

```bash
# 使用 Docker Compose 启动开发环境
make dev-docker
# 或
docker-compose --profile dev up -d

# 查看日志
docker-compose logs -f deploy-webhook-dev

# 停止服务
docker-compose --profile dev down
```

## 🏗️ 生产构建

```bash
# 构建 Docker 镜像
make build-docker

# 或手动构建
cd backend
docker build -t deploy-webhook:latest .

# 推送到仓库
make build-docker-push REGISTRY=your-registry.com
```

## 安全考虑

1. **Webhook密钥**: 务必设置强密钥并妥善保管
2. **Docker Socket**: 挂载Docker socket具有较高权限，确保容器运行在受信任的环境
3. **网络访问**: 建议在防火墙后运行，或使用反向代理
4. **镜像仓库**: 使用私有仓库时，确保凭据安全存储

## 最佳实践

1. 使用只读配置文件与环境变量分离敏感信息，建议结合 Secret 管理工具。
2. CI/CD 中触发部署时加上幂等检测（如版本哈希），避免重复部署。
3. 结合反向代理限制来源 IP，必要时启用双因子校验或附加签名头。
4. 为回调服务设置重试与告警机制，确保部署状态可追踪。
5. 定期巡检宿主机资源（磁盘、网络、端口占用），并通过监控采集部署日志。

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
