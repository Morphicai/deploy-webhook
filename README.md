# Deploy Webhook - Docker版本

一个基于TypeScript和Docker的部署webhook服务器，用于管理Morphix AI App Shell的容器化部署。

## 特性

- 🐳 **Docker化部署**: 完全容器化的解决方案
- 🔧 **宿主机Docker管理**: 通过Docker socket管理宿主机上的容器
- 📝 **TypeScript**: 完整的类型安全和现代JavaScript特性
- 🔒 **安全认证**: 支持webhook密钥验证
- 🚀 **自动化部署**: 支持多种版本获取方式
- 📊 **健康检查**: 内置健康检查端点
- 🔄 **热重载**: 开发环境支持代码热重载

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd deploy-webhook
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，设置必要的配置
```

### 3. 使用Docker Compose启动

#### 生产环境
```bash
docker-compose up -d deploy-webhook
```

#### 开发环境
```bash
docker-compose --profile dev up -d deploy-webhook-dev
```

### 4. 验证服务

```bash
# 健康检查
curl http://localhost:9000/health

# 部署测试（需要设置WEBHOOK_SECRET）
curl -X POST http://localhost:9000/deploy \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: your-secret-key" \
  -d '{
    "name": "test-app",
    "version": "1.0.0",
    "repo": "your-repo/your-app",
    "port": "8080"
  }'
```

## 配置说明

### 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `PORT` | 服务监听端口 | `9000` |
| `WEBHOOK_SECRET` | Webhook安全密钥 | - |
| `DEFAULT_CONTAINER_NAME` | 默认容器名称 | `morphicai-app-shell` |
| `IMAGE_NAME` | 默认镜像名称 | `focusbe/morphicai-app-shell` |
| `REGISTRY_HOST` | 镜像仓库地址 | `registry.cn-hangzhou.aliyuncs.com` |
| `HOST_PORT` | 宿主机端口 | `8806` |
| `CONTAINER_PORT` | 容器内部端口 | `3000` |
| `DOCKER_RUN_OPTS` | Docker运行额外参数 | - |
| `DOCKER_USERNAME` | Docker仓库用户名 | - |
| `DOCKER_PASSWORD` | Docker仓库密码 | - |
| `GITHUB_PACKAGE_URL` | GitHub package.json URL | - |

### Docker Socket挂载

为了让容器能够管理宿主机的Docker，需要挂载Docker socket：

```bash
-v /var/run/docker.sock:/var/run/docker.sock
```

## API接口

### POST /deploy

部署应用容器

**请求头:**
- `Content-Type: application/json`
- `x-webhook-secret: <your-secret>` (或在请求体中提供)

**请求体:**
```json
{
  "name": "container-name",
  "version": "1.0.0",
  "repo": "registry/image-name",
  "registry": "registry.example.com",
  "port": "8080",
  "containerPort": "3000",
  "secret": "webhook-secret"
}
```

**响应:**
```json
{
  "success": true,
  "code": 0,
  "stdout": "deployment output...",
  "stderr": ""
}
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

## 部署脚本

内置的部署脚本 (`scripts/deploy.sh`) 支持多种版本获取方式：

1. **手动指定版本**: `-v 1.2.3`
2. **从GitHub获取**: 设置 `GITHUB_PACKAGE_URL`
3. **从镜像仓库获取**: 提供 `DOCKER_USERNAME` 和 `DOCKER_PASSWORD`
4. **交互式选择**: 使用 `--select` 参数

### 脚本用法

```bash
# 指定版本部署
bash scripts/deploy.sh -v 1.2.3

# 交互式选择容器
bash scripts/deploy.sh --select

# 自定义参数
bash scripts/deploy.sh -n my-app -p 8080 -v latest
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

MIT License