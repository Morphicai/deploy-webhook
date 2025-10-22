# 端口映射完全指南（最佳实践版）

## 🎯 端口的三个层次

在 Deploy Webhook 系统中，端口有三个层次：

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 容器内部端口 (Container Port)                             │
│    应用在容器内监听的端口                                      │
│    示例：nginx 监听 80, node.js app 监听 3000                │
└───────────────┬─────────────────────────────────────────────┘
                │ Docker 端口映射
                ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. 宿主机端口 (Host Port)                                    │
│    容器映射到宿主机的端口 ⭐ 域名直接引用此端口号                │
│    示例：8001, 8002, 8003                                    │
└───────────────┬─────────────────────────────────────────────┘
                │ Caddy 反向代理
                ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. 公网访问 (Public HTTPS)                                   │
│    用户通过域名访问                                            │
│    示例：https://api.example.com                             │
└─────────────────────────────────────────────────────────────┘
```

## ⭐ 设计理念：直接引用宿主机端口号

**旧设计问题**：
- ❌ 使用端口索引（第 0、1、2 个端口）
- ❌ 端口顺序改变会导致域名指向错误的端口
- ❌ 不够直观和明确

**新设计优势**：
- ✅ 直接使用宿主机端口号（8001, 8002, 8003）
- ✅ 不受端口顺序变化影响
- ✅ 配置明确、易于理解和维护
- ✅ 避免索引越界问题

## 📋 配置应用端口

### 应用可以配置多个端口

```json
{
  "name": "my-app",
  "image": "nginx",
  "version": "1.0",
  "ports": [
    {"host": 8001, "container": 80},   // HTTP
    {"host": 8002, "container": 443}   // HTTPS
  ]
}
```

**说明**：
- `container`: 应用在容器内监听的端口
- `host`: Docker 映射到宿主机的端口
- Caddy 反向代理到 `localhost:host`

## 🌐 域名指向端口

### 默认行为：使用第一个端口

```bash
# 创建域名（不指定宿主机端口）
curl -X POST http://localhost:9000/api/domains \
  -H "x-admin-token: YOUR_TOKEN" \
  -d '{
    "domainName": "api.example.com",
    "type": "application",
    "applicationId": 1
  }'
```

**结果**：
- 系统自动使用应用的第一个端口（8001）
- Caddy 配置：`api.example.com → localhost:8001`

### 指定使用特定端口（推荐）

```bash
# 创建域名，明确指定使用宿主机端口 8002
curl -X POST http://localhost:9000/api/domains \
  -H "x-admin-token: YOUR_TOKEN" \
  -d '{
    "domainName": "api-secure.example.com",
    "type": "application",
    "applicationId": 1,
    "targetPort": 8002
  }'
```

**结果**：
- 明确使用宿主机端口 8002
- 系统会验证该端口是否存在于应用的端口列表中
- Caddy 配置：`api-secure.example.com → localhost:8002`

**优势**：
- 🎯 **明确性**：直接知道域名指向哪个端口
- 🔒 **稳定性**：即使修改应用端口顺序，域名仍然指向正确的端口
- 🛡️ **安全性**：系统会验证端口是否存在，避免配置错误
- 🔄 **统一性**：`targetPort` 对 application 和 custom 类型都适用

## 💡 实际应用场景

### 场景 1：HTTP 和 HTTPS 分离

```json
// 应用配置
{
  "name": "web-app",
  "ports": [
    {"host": 8001, "container": 80},    // HTTP
    {"host": 8002, "container": 443}    // HTTPS
  ]
}
```

```bash
# HTTP 域名（明确指定端口 8001）
curl -X POST /api/domains -d '{
  "domainName": "http.example.com",
  "applicationId": 1,
  "targetPort": 8001,
  "type": "application"
}'

# HTTPS 域名（明确指定端口 8002）
curl -X POST /api/domains -d '{
  "domainName": "https.example.com",
  "applicationId": 1,
  "targetPort": 8002,
  "type": "application"
}'
```

**生成的 Caddyfile**：
```caddyfile
http.example.com {
    reverse_proxy localhost:8001
}

https.example.com {
    reverse_proxy localhost:8002
}
```

### 场景 2：主服务和管理端口

```json
// 应用配置
{
  "name": "api-server",
  "ports": [
    {"host": 8001, "container": 8080},  // 主 API
    {"host": 8002, "container": 9090}   // 管理面板
  ]
}
```

```bash
# 主 API 域名（端口 8001）
curl -X POST /api/domains -d '{
  "domainName": "api.example.com",
  "applicationId": 1,
  "targetPort": 8001,
  "type": "application",
  "caddyConfig": {
    "rateLimit": {"enabled": true, "requestsPerMinute": 1000}
  }
}'

# 管理面板域名（端口 8002，IP 白名单）
curl -X POST /api/domains -d '{
  "domainName": "admin.example.com",
  "applicationId": 1,
  "targetPort": 8002,
  "type": "application",
  "caddyConfig": {
    "ipAccess": {
      "mode": "whitelist",
      "ips": ["10.0.0.0/8", "192.168.0.0/16"]
    }
  }
}'
```

### 场景 3：多协议服务

```json
// 应用配置（例如：WebSocket + HTTP）
{
  "name": "realtime-app",
  "ports": [
    {"host": 8001, "container": 3000},  // HTTP API
    {"host": 8002, "container": 3001}   // WebSocket
  ]
}
```

```bash
# HTTP API 域名（端口 8001）
curl -X POST /api/domains -d '{
  "domainName": "api.example.com",
  "applicationId": 1,
  "targetPort": 8001,
  "type": "application"
}'

# WebSocket 域名（端口 8002）
curl -X POST /api/domains -d '{
  "domainName": "ws.example.com",
  "applicationId": 1,
  "targetPort": 8002,
  "type": "application",
  "caddyConfig": {
    "websocket": {"enabled": true}
  }
}'
```

### 场景 4：A/B 测试（同一应用不同端口）

```json
// 应用配置（同时运行两个版本）
{
  "name": "app-multi-version",
  "ports": [
    {"host": 8001, "container": 80},  // 版本 A
    {"host": 8002, "container": 80}   // 版本 B
  ]
}
```

```bash
# 主域名（版本 A - 端口 8001）
curl -X POST /api/domains -d '{
  "domainName": "app.example.com",
  "applicationId": 1,
  "targetPort": 8001,
  "type": "application"
}'

# Beta 域名（版本 B - 端口 8002）
curl -X POST /api/domains -d '{
  "domainName": "beta.example.com",
  "applicationId": 1,
  "targetPort": 8002,
  "type": "application"
}'
```

## 🔍 查询端口映射关系

### 查看应用的端口配置

```bash
curl http://localhost:9000/api/applications/1 \
  -H "x-admin-token: YOUR_TOKEN"
```

**响应示例**：
```json
{
  "id": 1,
  "name": "my-app",
  "ports": [
    {"host": 8001, "container": 80},
    {"host": 8002, "container": 443}
  ]
}
```

### 查看域名使用的端口

```bash
curl http://localhost:9000/api/domains/1 \
  -H "x-admin-token: YOUR_TOKEN"
```

**响应示例**：
```json
{
  "id": 1,
  "domainName": "api.example.com",
  "type": "application",
  "applicationId": 1,
  "targetPort": 8001,  // 明确指定使用端口 8001
  "enabled": true
}
```

### 查看生成的 Caddyfile

```bash
curl http://localhost:9000/api/caddy/config \
  -H "x-admin-token: YOUR_TOKEN"
```

**响应示例**：
```caddyfile
# api.example.com -> Application: my-app (port: 8001)
api.example.com {
    reverse_proxy localhost:8001
    # ... 其他配置
}
```

## ⚠️ 常见问题

### Q1: 指定的端口不存在

**错误示例**：
```bash
# 应用只有端口 8001 和 8002，但指定了不存在的端口 8003
curl -X POST /api/domains -d '{
  "applicationId": 1,
  "targetPort": 8003  # 错误！此端口不在应用的端口列表中
}'
```

**错误日志**：
```
[caddy-service] Domain api.example.com specifies port 8003 which doesn't exist in app my-app
```

**解决方案**：
- 检查应用配置的端口列表
- 使用应用实际配置的宿主机端口（如 8001, 8002）

### Q2: 如何知道应该使用哪个端口？

**方法 1：查看应用配置**
```bash
curl /api/applications/1 | jq '.ports'
```

**方法 2：查看容器配置**
```bash
# 查看容器的 Dockerfile 或文档
docker inspect my-app-container
```

**方法 3：测试端口**
```bash
# 测试宿主机端口是否可访问
curl http://localhost:8001
curl http://localhost:8002
```

### Q3: 可以动态修改域名使用的端口吗？

**可以！**

```bash
# 原来使用端口 8001，现在改为 8002
curl -X PUT /api/domains/1 \
  -H "x-admin-token: YOUR_TOKEN" \
  -d '{"targetPort": 8002}'

# 系统会自动：
# 1. 验证端口 8002 是否存在于应用的端口列表中
# 2. 更新域名配置
# 3. 重新生成 Caddyfile
# 4. 重载 Caddy（零停机）
```

### Q4: 不指定 targetPort 会怎样？

**默认行为**：
- 自动使用应用的第一个端口（`ports[0].host`）
- 适合只有一个端口的简单应用

```bash
# 这两种写法效果相同（假设应用第一个端口是 8001）

# 方式 1：不指定端口（使用默认）
{
  "domainName": "api.example.com",
  "applicationId": 1
}

# 方式 2：明确指定端口（推荐）
{
  "domainName": "api.example.com",
  "applicationId": 1,
  "targetPort": 8001
}
```

**推荐**：明确指定 `targetPort`，可读性更好，维护更方便。

## 📊 targetPort 使用说明

| 场景 | targetPort 值 | 说明 |
|------|---------------|------|
| **application 类型** | 不指定 | 自动使用应用的第一个端口 |
| **application 类型** | 8001 | 使用应用的宿主机端口 8001 |
| **application 类型** | 8002 | 使用应用的宿主机端口 8002 |
| **custom 类型** | 80 | 连接到自定义 URL 的 80 端口 |
| **custom 类型** | 443 | 连接到自定义 URL 的 443 端口 |
| **custom 类型** | 3000 | 连接到自定义 URL 的 3000 端口 |

## 🎓 最佳实践

### 1. 明确指定端口（推荐）

```json
{
  "ports": [
    {"host": 8001, "container": 80},    // 主服务 HTTP
    {"host": 8002, "container": 443},   // 主服务 HTTPS  
    {"host": 8003, "container": 9090}   // 管理面板
  ]
}
```

**建议**：
- 第一个端口（8001）：主服务入口
- 第二个端口（8002）：备用或 HTTPS 端口
- 其他端口：管理、监控、WebSocket 等专用功能

**创建域名时明确指定**：
```bash
curl -X POST /api/domains -d '{
  "domainName": "api.example.com",
  "applicationId": 1,
  "targetPort": 8001  # 明确指定，避免歧义
}'
```

### 2. 文档记录端口用途

在应用描述或域名描述中记录端口功能：

```bash
# 应用描述中说明端口用途
curl -X PUT /api/applications/1 -d '{
  "description": "API Server - Port 8001: HTTP API, Port 8002: WebSocket, Port 8003: Admin Panel"
}'

# 域名描述中记录映射关系
curl -X POST /api/domains -d '{
  "domainName": "admin.example.com",
  "applicationId": 1,
  "targetPort": 8003,
  "description": "Admin panel - connects to port 8003 (container port 9090)"
}'
```

### 3. 端口范围规划

```
应用 1: 8001-8009
应用 2: 8010-8019
应用 3: 8020-8029
...
```

**优点**：
- 便于管理和调试
- 避免端口冲突
- 快速定位问题

## 🔄 数据一致性保证

**设计优势**：
- ✅ 直接存储宿主机端口号，不依赖顺序
- ✅ 即使应用重新配置端口列表，域名仍然指向正确的端口
- ✅ 系统会验证端口的有效性

**示例场景**：
```bash
# 1. 初始配置
应用端口: [8001, 8002, 8003]
域名配置: targetPort = 8002

# 2. 调整应用端口顺序
应用端口: [8003, 8002, 8001]  # 顺序改变
域名仍然指向: 8002  # ✅ 不受影响

# 3. 移除某个端口
应用端口: [8001, 8003]  # 移除了 8002
域名指向 8002: ❌ 系统会报错，提示端口不存在
```

**如果需要修改域名的端口映射**：
```bash
curl -X PUT /api/domains/1 \
  -H "x-admin-token: YOUR_TOKEN" \
  -d '{"targetPort": 8001}'
```

## 📚 相关文档

- [域名管理完全指南](./DOMAIN_MANAGEMENT.md)
- [Caddy 高级配置](./CADDY_ADVANCED_CONFIG.md)
- [应用管理指南](./USER_GUIDE.md)

---

**现在你完全掌握了端口映射的所有细节！** 🎉

