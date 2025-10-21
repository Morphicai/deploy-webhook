# 应用 Docker 化指南

## 🎯 核心原则

**应用镜像 = 纯净应用，不包含反向代理**

- ✅ 应用只监听内网端口（如 3000, 8080）
- ✅ 不需要安装 Caddy/Nginx
- ✅ 不需要处理 HTTPS
- ✅ 保持镜像轻量和单一职责

## 📦 正确的应用 Dockerfile 示例

### 示例 1: Node.js 应用

```dockerfile
# ✅ 正确：纯净的应用镜像
FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制应用代码
COPY . .

# 暴露应用端口（内网端口）
EXPOSE 3000

# 启动应用
CMD ["node", "server.js"]
```

**应用代码（server.js）：**
```javascript
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Hello from App!' });
});

// 只监听内网端口，不需要 HTTPS
app.listen(3000, '0.0.0.0', () => {
  console.log('Server running on port 3000');
});
```

### 示例 2: Python Flask 应用

```dockerfile
# ✅ 正确：纯净的应用镜像
FROM python:3.11-alpine

WORKDIR /app

# 安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 暴露应用端口
EXPOSE 5000

# 启动应用（使用 Gunicorn 生产服务器）
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
```

### 示例 3: Go 应用

```dockerfile
# ✅ 正确：多阶段构建，保持镜像轻量
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY . .
RUN go build -o main .

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/main .

EXPOSE 8080
CMD ["./main"]
```

### 示例 4: 静态网站（Nginx）

```dockerfile
# ✅ 即使用 Nginx，也只用作静态文件服务器
FROM nginx:alpine

# 复制静态文件
COPY dist/ /usr/share/nginx/html/

# Nginx 配置（只监听 HTTP）
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

**nginx.conf：**
```nginx
server {
    listen 80;
    server_name localhost;
    
    root /usr/share/nginx/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 🚀 部署流程

### 1. 构建应用镜像

```bash
# 构建你的应用
cd /path/to/your-app
docker build -t myapp:1.0 .

# 测试应用（内网访问）
docker run -d -p 8080:3000 myapp:1.0
curl http://localhost:8080  # ✅ HTTP 访问，正常
```

### 2. 通过 Deploy Webhook 部署

在管理后台添加应用：

```json
{
  "name": "my-app",
  "image": "myapp",
  "version": "1.0",
  "ports": [
    {
      "host": 8001,      // 宿主机端口
      "container": 3000  // 容器内应用端口
    }
  ],
  "envVars": {
    "NODE_ENV": "production"
  }
}
```

### 3. Caddy 自动配置 HTTPS

Deploy Webhook 会自动：
1. 部署你的应用到 `localhost:8001`
2. 更新 Caddy 配置
3. 生成反向代理规则：`my-app.apps.example.com` → `localhost:8001`

**访问：**
```bash
# ❌ 不要直接访问应用端口
curl http://your-server-ip:8001

# ✅ 通过 Caddy（自动 HTTPS）
curl https://my-app.apps.example.com
```

## 🏗️ 完整架构示例

### docker-compose.yml（应用示例）

```yaml
version: '3.8'

services:
  # Caddy - 只有一个实例
  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    networks:
      - app-network

  # 应用 1 - 纯净镜像
  app1:
    image: myapp1:latest
    expose:
      - "3000"  # 只暴露给内网
    networks:
      - app-network
    environment:
      - NODE_ENV=production

  # 应用 2 - 纯净镜像
  app2:
    image: myapp2:latest
    expose:
      - "8080"  # 只暴露给内网
    networks:
      - app-network

volumes:
  caddy_data:

networks:
  app-network:
    driver: bridge
```

### Caddyfile（自动生成）

```caddyfile
# 应用 1
app1.example.com {
    reverse_proxy app1:3000  # ✅ HTTPS → HTTP
    encode gzip
}

# 应用 2
app2.example.com {
    reverse_proxy app2:8080  # ✅ HTTPS → HTTP
    encode gzip
}
```

## ❓ 常见问题

### Q1: 应用需要处理 HTTPS 吗？

**不需要！** Caddy 会处理所有 HTTPS 相关事务：
- SSL/TLS 终止
- 证书管理
- HTTP → HTTPS 重定向

你的应用只需要监听 HTTP 端口。

### Q2: 如何获取客户端真实 IP？

Caddy 会自动添加 `X-Forwarded-For` 等头：

```javascript
// Node.js Express
app.set('trust proxy', true);

app.get('/', (req, res) => {
  const clientIP = req.ip;  // 获取真实 IP
  res.json({ ip: clientIP });
});
```

```python
# Python Flask
from flask import Flask, request

@app.route('/')
def index():
    client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    return {'ip': client_ip}
```

### Q3: 应用端口冲突怎么办？

每个应用使用不同的宿主机端口：

```yaml
services:
  app1:
    ports:
      - "8001:3000"  # 宿主机:容器
  
  app2:
    ports:
      - "8002:3000"  # 同样的容器端口，不同宿主机端口
```

### Q4: 需要在应用中配置 CORS 吗？

如果前后端在不同域名下，需要：

```javascript
// Node.js Express
const cors = require('cors');
app.use(cors({
  origin: 'https://frontend.example.com',
  credentials: true
}));
```

Caddy 也可以统一处理：

```caddyfile
api.example.com {
    header Access-Control-Allow-Origin https://frontend.example.com
    header Access-Control-Allow-Methods "GET, POST, PUT, DELETE"
    reverse_proxy localhost:8000
}
```

### Q5: WebSocket 支持吗？

完全支持！Caddy 自动处理 WebSocket：

```caddyfile
ws.example.com {
    reverse_proxy localhost:8080
}
```

应用只需要正常实现 WebSocket：

```javascript
// Node.js
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    console.log('received: %s', message);
  });
});
```

## 📊 对比：内置 vs 独立

| 方面 | 内置 Caddy | 独立 Caddy（推荐） |
|------|-----------|------------------|
| 镜像大小 | 🔴 每个应用 +50MB | 🟢 应用保持轻量 |
| 资源消耗 | 🔴 N 个 Caddy 实例 | 🟢 1 个 Caddy 服务所有 |
| 证书管理 | 🔴 每个应用独立管理 | 🟢 统一管理 |
| 配置更新 | 🔴 需要重建镜像 | 🟢 动态更新配置 |
| 职责分离 | 🔴 混合职责 | 🟢 清晰分离 |
| 维护成本 | 🔴 高 | 🟢 低 |

## 🎯 最佳实践总结

1. ✅ **应用镜像保持纯净** - 不包含反向代理
2. ✅ **只监听 HTTP** - 让 Caddy 处理 HTTPS
3. ✅ **使用独立 Caddy 容器** - 一个服务所有应用
4. ✅ **内网端口通信** - 不暴露到公网
5. ✅ **统一证书管理** - Caddy 自动处理
6. ✅ **职责分离** - 应用专注业务逻辑

## 🚀 快速开始

```bash
# 1. 构建你的应用（纯净镜像）
docker build -t myapp:1.0 .

# 2. 在 Deploy Webhook 中添加应用
# 通过管理后台界面操作

# 3. 部署应用
# 点击"Deploy"按钮

# 4. 自动获得 HTTPS
# https://myapp.apps.example.com ✅
```

就这么简单！🎉

