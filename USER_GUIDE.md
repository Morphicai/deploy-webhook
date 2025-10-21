# Deploy Webhook 用户指南

## 🎯 从零到 HTTPS：5 步完成应用部署

### 第 1 步：登录管理后台

```
访问：https://deploy.your-domain.com
使用管理员账户登录
```

### 第 2 步：添加应用配置

点击 "Add Application" 按钮，填写应用信息：

#### 基本信息
- **应用名称** *(必填)*: `my-api`
  - 用作容器名称和默认子域名
  - 只能包含字母、数字和连字符

- **镜像名称** *(必填)*: `nginx` 或 `mycompany/myapp`
  - Docker 镜像名称（不含标签）
  
- **版本/标签**: `1.0.0` 或 `latest`
  - 默认为 `latest`
  
- **镜像仓库**: 下拉选择
  - 默认：Docker Hub
  - 或选择自定义镜像仓库

#### 域名配置 *(可选但推荐)*

**选项 A：使用自定义域名**
```
Custom Domain: api.mycompany.com
```
- 需要先配置 DNS A 记录指向服务器
- 系统会自动申请 Let's Encrypt 证书

**选项 B：使用自动生成的子域名**
```
留空，系统自动生成：my-api.apps.example.com
```

#### 端口映射 *(必填)*

至少配置一个端口映射：

```
Host Port: 8001    →    Container Port: 80
```

- **Host Port**: 宿主机端口（Caddy 反向代理到这里）
- **Container Port**: 容器内应用监听的端口

可以添加多个端口映射（例如 HTTP + HTTPS）：
```
8001 → 80   (HTTP)
8002 → 443  (HTTPS - 如果应用需要)
```

#### 环境变量 *(可选)*

添加应用需要的环境变量：

```
NODE_ENV  =  production
API_KEY   =  your-secret-key
DB_HOST   =  database.local
```

### 第 3 步：保存配置

点击 "Create Application" 按钮。

**此时应用只是被配置，还未部署。**

### 第 4 步：部署应用

在应用列表中找到刚创建的应用，点击 "Deploy" 按钮（▶️ 图标）。

系统会自动：

1. ✅ 从镜像仓库拉取镜像
2. ✅ 创建 Docker 容器
3. ✅ 启动容器
4. ✅ 更新 Caddy 配置
5. ✅ 申请 SSL 证书（如果是新域名）

**状态变化**：
```
Stopped → Deploying... → Running ✅
```

### 第 5 步：访问应用

部署成功后，应用列表会显示访问 URL：

```
🌐 https://api.mycompany.com
   或
🌐 https://my-api.apps.example.com
```

点击 URL 或直接在浏览器中访问，**自动 HTTPS 已就绪！** 🎉

---

## 📋 完整示例：部署一个 Node.js API

### 1. 准备应用镜像

**Dockerfile**:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

**构建镜像**:
```bash
docker build -t mycompany/api:1.0.0 .
docker push mycompany/api:1.0.0
```

### 2. 在管理后台配置

| 字段 | 值 |
|------|-----|
| 应用名称 | `my-api` |
| 镜像名称 | `mycompany/api` |
| 版本 | `1.0.0` |
| 自定义域名 | `api.mycompany.com` |
| 端口映射 | `8001 → 3000` |
| 环境变量 | `NODE_ENV=production` |

### 3. DNS 配置

在域名服务商添加 A 记录：

```
类型  主机记录              值
A    api.mycompany.com    YOUR_SERVER_IP
```

### 4. 点击部署

等待 30-60 秒...

### 5. 访问

```bash
curl https://api.mycompany.com
# ✅ 自动 HTTPS！无需任何证书配置！
```

---

## 🔄 应用操作

### 停止应用

点击 ⏹️ (Stop) 按钮：
- 容器停止运行
- 但配置保留
- HTTPS 访问会返回 502（容器未运行）

### 启动应用

点击 ▶️ (Start) 按钮：
- 启动已停止的容器
- 恢复服务

### 重启应用

点击 🔄 (Restart) 按钮：
- 重启运行中的容器
- 用于应用内部更新或故障恢复

### 重新部署

点击 ▶️ (Deploy) 按钮：
- 拉取最新镜像
- 删除旧容器
- 创建并启动新容器
- 用于更新应用版本

### 编辑配置

点击 ✏️ (Edit) 按钮：
- 修改端口、环境变量、域名等
- 保存后需要重新部署才能生效

### 删除应用

点击 🗑️ (Delete) 按钮：
- 停止并删除容器
- 删除配置
- Caddy 配置自动更新

---

## 🌐 域名管理策略

### 策略 1：统一子域名（简单）

所有应用使用同一个泛域名：

**DNS 配置**：
```
*.apps.mycompany.com  →  YOUR_SERVER_IP
```

**应用访问**：
```
my-api.apps.mycompany.com
my-web.apps.mycompany.com
my-admin.apps.mycompany.com
```

**优点**：
- ✅ 只需配置一次 DNS
- ✅ 一个泛域名证书覆盖所有应用
- ✅ 添加新应用无需 DNS 变更

### 策略 2：独立域名（灵活）

每个应用使用独立域名：

**DNS 配置**：
```
api.mycompany.com    →  YOUR_SERVER_IP
www.mycompany.com    →  YOUR_SERVER_IP
admin.mycompany.com  →  YOUR_SERVER_IP
```

**应用配置**：
- my-api → `api.mycompany.com`
- my-web → `www.mycompany.com`
- my-admin → `admin.mycompany.com`

**优点**：
- ✅ 更专业的域名
- ✅ 可以用于不同的顶级域名
- ✅ 更好的 SEO

### 策略 3：混合使用（推荐）

重要应用使用独立域名，内部应用使用子域名：

```
# 对外服务 - 独立域名
www.mycompany.com          → 官网
api.mycompany.com          → API

# 内部服务 - 统一子域名
admin.apps.mycompany.com   → 管理后台
monitoring.apps.mycompany.com → 监控
```

---

## 🔐 安全最佳实践

### 1. 环境变量管理

**❌ 不要**在配置中存储敏感信息明文：
```
DATABASE_PASSWORD=my-secret-123
```

**✅ 推荐**使用系统环境变量功能：
1. 在 "Environment Variables" 页面添加全局环境变量
2. 应用会自动继承这些变量
3. 也可以在应用配置中覆盖特定值

### 2. 端口安全

**❌ 不要**暴露应用端口到公网：
```yaml
ports:
  - "8001:3000"  # 这样配置，但确保防火墙只开放 80/443
```

**✅ 所有流量通过 Caddy**：
- 用户 → HTTPS (443) → Caddy → HTTP (8001) → 应用
- 只有 Caddy 暴露到公网
- 应用在内网运行

### 3. 证书管理

**自动完成，无需操心！**
- Caddy 自动申请证书
- 自动续期
- 证书存储在 Docker 卷中

如果要备份证书：
```bash
docker run --rm -v caddy_data:/data \
  alpine tar czf /data/backup.tar.gz /data/caddy
```

---

## 🐛 故障排查

### 问题 1：部署失败

**症状**: Status 显示 "Error"

**检查步骤**:

1. **检查镜像是否存在**
   ```bash
   docker pull mycompany/api:1.0.0
   ```

2. **检查端口是否被占用**
   ```bash
   netstat -tlnp | grep 8001
   ```

3. **查看容器日志**
   ```bash
   docker logs my-api
   ```

### 问题 2：无法访问（502 错误）

**症状**: 访问域名返回 502 Bad Gateway

**可能原因**:

1. **容器未运行**
   ```bash
   docker ps | grep my-api
   ```
   解决：在管理后台点击 Start

2. **端口配置错误**
   - 确认 Host Port 是否正确
   - 确认 Container Port 是应用实际监听的端口

3. **应用未启动**
   ```bash
   docker logs my-api
   ```

### 问题 3：SSL 证书错误

**症状**: 浏览器提示证书无效

**可能原因**:

1. **DNS 未生效**
   ```bash
   dig api.mycompany.com
   ```
   解决：等待 DNS 传播（最多 48 小时）

2. **Let's Encrypt 速率限制**
   - 每周每个域名限制 50 个证书
   - 使用 staging 环境测试

3. **端口 80 未开放**
   - Let's Encrypt 需要通过 HTTP-01 质询
   - 确保防火墙允许 80 端口

### 问题 4：应用无法连接数据库

**症状**: 应用日志显示数据库连接失败

**解决方案**:

1. **使用 Docker 网络**
   ```yaml
   # docker-compose.yml
   services:
     app:
       networks:
         - app-network
     database:
       networks:
         - app-network
   ```

2. **使用正确的主机名**
   ```
   DB_HOST=database  # Docker Compose 服务名
   而不是 DB_HOST=localhost
   ```

---

## 📊 监控和日志

### 查看应用日志

```bash
# 查看容器日志
docker logs -f my-api

# 查看最近 100 行
docker logs --tail 100 my-api
```

### 查看 Caddy 日志

```bash
# 查看访问日志
tail -f /var/log/caddy/app-my-api.log

# 查看 Caddy 系统日志
docker logs -f deploy-webhook-caddy
```

### 监控资源使用

```bash
# 查看所有容器资源使用
docker stats

# 查看特定容器
docker stats my-api
```

---

## 🎓 高级用法

### 蓝绿部署

1. 部署新版本到不同端口
2. 测试新版本
3. 切换域名到新版本
4. 删除旧版本

### A/B 测试

使用 Caddy 的高级配置：

```caddyfile
myapp.com {
    # 50% 流量到版本 A
    @versionA {
        random 50%
    }
    handle @versionA {
        reverse_proxy localhost:8001
    }
    
    # 50% 流量到版本 B
    handle {
        reverse_proxy localhost:8002
    }
}
```

### 负载均衡

```caddyfile
myapp.com {
    reverse_proxy localhost:8001 localhost:8002 localhost:8003 {
        lb_policy round_robin
        health_uri /health
        health_interval 30s
    }
}
```

---

## 💡 小贴士

1. **命名规范**: 使用有意义的应用名称，如 `api-v2`, `web-prod`
2. **版本管理**: 使用明确的版本号，避免 `latest`
3. **环境隔离**: 测试环境和生产环境使用不同的应用名称
4. **定期备份**: 备份应用配置和数据库
5. **监控告警**: 配置监控系统及时发现问题

---

## 🤝 需要帮助？

- 📖 查看 [完整文档](./CADDY_DEPLOYMENT.md)
- 🐛 [提交 Issue](https://github.com/your-repo/issues)
- 💬 加入社区讨论

---

**恭喜！** 你已经掌握了 Deploy Webhook 的所有核心功能。

现在你可以：
- ✅ 快速部署 Docker 化应用
- ✅ 自动获得 HTTPS 证书
- ✅ 统一管理所有应用
- ✅ 零停机更新应用

**开始部署你的第一个应用吧！** 🚀

