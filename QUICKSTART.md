# 快速开始（使用已发布镜像）

GitHub: https://github.com/Morphicai/deploy-webhook

Docker Hub: https://hub.docker.com/repository/docker/focusbe/deploy-webhook/general

## 🚀 5分钟快速部署

### 1. 启动容器
```bash
docker run -d --name deploy-webhook -p 9000:9000 \
  -e WEBHOOK_SECRET=your-secret \
  -e REGISTRY_HOST=docker.io \
  -e DOCKER_SOCK_PATH=/var/run/docker.sock \
  -v /var/run/docker.sock:/var/run/docker.sock \
  focusbe/deploy-webhook:latest
```

### 2. 访问管理界面
打开浏览器访问 `http://localhost:3001`（需要先启动 UI，见下方）

首次访问将引导您创建管理员账户，之后即可使用可视化界面管理所有功能。

### 3. 验证健康
```bash
curl http://localhost:9000/health
```

### 4. 触发部署（CI 示例）
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

## 🖥️ Web 管理界面

Deploy Webhook 提供了现代化的 Web 管理界面，支持：

- 📊 **仪表板** - 概览部署状态和系统指标
- 🚀 **应用管理** - 可视化部署和监控容器
- ⚙️ **环境变量** - 管理全局和项目级环境变量
- 🔑 **密钥管理** - 集成 Infisical 等密钥提供商
- 🌓 **深色/浅色模式** - 自动切换主题
- 🌍 **多语言支持** - 中文/英文界面

### 启动 UI（开发模式）

```bash
cd ui
npm install
npm run dev
```

访问 `http://localhost:3001` 即可使用管理界面。

### 生产部署 UI

```bash
cd ui
npm install
npm run build
# 使用 nginx 或其他 web 服务器托管 dist 目录
```

## 🔧 进阶配置（可选）

- IMAGE_NAME_WHITELIST：限制可部署的 repo 列表（逗号分隔）
- CALLBACK_URL / CALLBACK_HEADERS / CALLBACK_SECRET：开启回调与签名
- JWT_SECRET：设置 JWT 密钥用于管理界面认证

## 🐳 本地构建（可选）

```bash
# 构建后端
cd backend
docker build -t focusbe/deploy-webhook:dev .

# 构建前端
cd ui
npm install
npm run build
```

## 📡 API 使用示例

### 部署请求
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

### 响应示例
```json
{
  "success": true,
  "code": 0,
  "stdout": "Container started successfully...",
  "stderr": ""
}
```

## 🔒 安全配置

1. **设置强密钥**：
   ```bash
   # 生成随机密钥
   openssl rand -base64 32
   ```

2. **限制网络访问**：
   - 使用防火墙限制访问
   - 配置反向代理（Nginx/Traefik）
   - 使用HTTPS

3. **Docker Socket 安全**：
   - 确保容器运行在受信任环境
   - 考虑使用 Docker-in-Docker 替代方案

## 🐛 故障排除

### 常见问题

1. **端口被占用**：
   ```bash
   # 修改 .env 中的 PORT 配置
   PORT=9001
   ```

2. **Docker Socket 权限错误**：
   ```bash
   sudo chmod 666 /var/run/docker.sock
   ```

3. **镜像拉取失败**：
   - 检查网络连接
   - 验证 DOCKER_USERNAME 和 DOCKER_PASSWORD
   - 确认镜像名称正确

### 日志查看
```bash
# 实时日志
make logs

# 开发环境日志
make logs-dev

# Docker 容器日志
docker logs deploy-webhook -f
```

## 📝 环境变量说明

| 变量 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `WEBHOOK_SECRET` | ✅ | - | Webhook 安全密钥 |
| `PORT` | ❌ | 9000 | 服务端口 |
| `HOST_PORT` | ❌ | 8806 | 宿主机端口 |
| `DOCKER_USERNAME` | ❌ | - | Docker 仓库用户名 |
| `DOCKER_PASSWORD` | ❌ | - | Docker 仓库密码 |

## 🚀 生产部署建议

1. **使用 HTTPS**
2. **设置监控和告警**
3. **定期备份配置**
4. **使用容器编排工具**（如 Kubernetes）
5. **实施日志管理**

## 路线图（Kubernetes）

- 即将支持以 Kubernetes 为目标平台的部署 Provider：在不改变 `/deploy` 请求协议的前提下，通过环境变量切换至 `K8sProvider`。
- 计划提供 Deployment/Service 生成与滚动更新、健康检查探针、命名空间隔离、HPA 支持等能力。
- 将提供 Helm Chart 与示例 YAML，方便集群内或外部 CI 使用。
