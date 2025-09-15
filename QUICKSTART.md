# 快速开始指南

## 🚀 5分钟快速部署

### 1. 环境准备
```bash
# 复制环境变量模板
cp .env.template .env

# 编辑配置（必须设置WEBHOOK_SECRET）
vim .env
```

### 2. 启动服务

#### 方式一：使用 Make（推荐）
```bash
# 初始化项目
make setup

# 开发模式启动
make dev

# 生产模式启动
make prod
```

#### 方式二：使用脚本
```bash
# 开发模式
./scripts/start.sh -m development

# 生产模式（后台运行）
./scripts/start.sh -m production -d
```

#### 方式三：直接使用 Docker Compose
```bash
# 生产环境
docker-compose up -d

# 开发环境
docker-compose --profile dev up -d
```

### 3. 验证服务

```bash
# 健康检查
make test-health
# 或者
curl http://localhost:9000/health

# 测试部署（替换YOUR_SECRET）
make test-deploy SECRET=YOUR_SECRET
```

## 🔧 常用命令

```bash
# 查看服务状态
make status

# 查看日志
make logs

# 停止服务
make stop

# 重启服务
make restart

# 清理资源
make clean
```

## 🐳 Docker 镜像构建

```bash
# 构建本地镜像
make build-docker

# 构建并推送到仓库（需要设置REGISTRY环境变量）
REGISTRY=your-registry.com make build-docker-push
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
| `DEFAULT_CONTAINER_NAME` | ❌ | morphicai-app-shell | 默认容器名 |
| `HOST_PORT` | ❌ | 8806 | 宿主机端口 |
| `DOCKER_USERNAME` | ❌ | - | Docker 仓库用户名 |
| `DOCKER_PASSWORD` | ❌ | - | Docker 仓库密码 |

## 🚀 生产部署建议

1. **使用 HTTPS**
2. **设置监控和告警**
3. **定期备份配置**
4. **使用容器编排工具**（如 Kubernetes）
5. **实施日志管理**
