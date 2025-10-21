# Caddy 反向代理部署指南

## 📋 目录

- [为什么选择 Caddy](#为什么选择-caddy)
- [快速开始](#快速开始)
- [生产环境部署](#生产环境部署)
- [本地开发](#本地开发)
- [配置说明](#配置说明)
- [常见问题](#常见问题)

## 为什么选择 Caddy

### ✅ 优势

1. **自动 HTTPS**
   - 自动从 Let's Encrypt 获取 SSL 证书
   - 自动续期证书（无需 cron job）
   - 零配置 HTTPS

2. **简单配置**
   - Caddyfile 语法简单直观
   - 无需复杂的 nginx 配置
   - 支持环境变量和模板

3. **现代化**
   - HTTP/2 和 HTTP/3 (QUIC) 支持
   - 自动 gzip/zstd 压缩
   - 优秀的性能

4. **安全**
   - 默认安全的 TLS 配置
   - 自动安全头设置
   - OCSP Stapling

### 🆚 对比其他方案

| 特性 | Caddy | Nginx | Traefik |
|------|-------|-------|---------|
| 自动 HTTPS | ✅ 内置 | ❌ 需要 Certbot | ✅ 内置 |
| 配置复杂度 | 🟢 简单 | 🔴 复杂 | 🟡 中等 |
| 内存占用 | 🟡 中等 | 🟢 很少 | 🔴 较多 |
| 学习曲线 | 🟢 平缓 | 🔴 陡峭 | 🟡 中等 |
| Docker 集成 | 🟢 良好 | 🟢 良好 | 🟢 优秀 |

## 快速开始

### 1. 准备域名

确保你的域名 DNS 记录指向服务器：

```bash
# 添加 A 记录
deploy.example.com     A    YOUR_SERVER_IP
api.deploy.example.com A    YOUR_SERVER_IP
*.apps.example.com     A    YOUR_SERVER_IP
```

### 2. 修改配置文件

编辑 `Caddyfile`：

```bash
# 替换域名
sed -i 's/example.com/your-domain.com/g' Caddyfile

# 替换邮箱（用于 Let's Encrypt 通知）
sed -i 's/admin@example.com/your-email@your-domain.com/g' Caddyfile
```

### 3. 启动服务

```bash
# 使用 Docker Compose 启动
docker-compose -f docker-compose.caddy.yml up -d

# 查看日志
docker-compose -f docker-compose.caddy.yml logs -f caddy
```

### 4. 验证 HTTPS

```bash
# 检查证书
curl -v https://deploy.your-domain.com

# 查看证书信息
echo | openssl s_client -connect deploy.your-domain.com:443 2>/dev/null | openssl x509 -noout -text
```

## 生产环境部署

### 完整步骤

#### 1. 环境准备

```bash
# 创建日志目录
mkdir -p logs/caddy

# 设置权限
chmod 755 logs/caddy

# 创建环境变量文件
cat > .env << EOF
JWT_SECRET=$(openssl rand -base64 32)
ADMIN_TOKEN=$(openssl rand -base64 32)
WEBHOOK_SECRET=$(openssl rand -base64 32)
EOF
```

#### 2. 防火墙配置

```bash
# 开放 HTTP/HTTPS 端口
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp  # HTTP/3

# 确保其他端口不对外开放
ufw deny 9000
ufw deny 9001
```

#### 3. 部署

```bash
# 拉取镜像
docker-compose -f docker-compose.caddy.yml pull

# 启动服务
docker-compose -f docker-compose.caddy.yml up -d

# 检查状态
docker-compose -f docker-compose.caddy.yml ps
```

#### 4. 监控证书

```bash
# 查看 Caddy 数据目录
docker exec deploy-webhook-caddy ls -la /data/caddy/certificates/

# 查看证书有效期
docker exec deploy-webhook-caddy caddy list-certificates
```

### 高可用配置

如果需要多节点部署：

```yaml
# docker-compose.ha.yml
services:
  caddy:
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
```

## 本地开发

### 使用本地 Caddyfile

```bash
# 使用本地配置（自签名证书）
caddy run --config Caddyfile.local

# 或使用 Docker
docker run -d \
  --name caddy-local \
  -p 8080:8080 \
  -p 8443:8443 \
  -v $(pwd)/Caddyfile.local:/etc/caddy/Caddyfile \
  caddy:2-alpine

# 访问
# HTTP:  http://localhost:8080
# HTTPS: https://localhost:443 (需要信任自签名证书)
```

### 信任自签名证书

**macOS:**
```bash
# 导出证书
docker exec caddy-local cat /data/caddy/pki/authorities/local/root.crt > caddy-root.crt

# 添加到钥匙串
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychats/System.keychain caddy-root.crt
```

**Linux:**
```bash
# 复制证书
sudo cp caddy-root.crt /usr/local/share/ca-certificates/caddy-root.crt

# 更新证书库
sudo update-ca-certificates
```

## 配置说明

### Caddyfile 语法

```caddyfile
# 基本结构
domain.com {
    # 指令
}

# 常用指令
reverse_proxy localhost:9000  # 反向代理
encode gzip                    # 压缩
log                           # 日志
tls email@domain.com          # TLS 配置
```

### 自动 HTTPS 配置

Caddy 自动 HTTPS 的工作流程：

1. 检测到配置中的域名
2. 通过 ACME 协议向 Let's Encrypt 请求证书
3. 使用 HTTP-01 或 TLS-ALPN-01 质询验证域名所有权
4. 获取并存储证书
5. 自动在过期前续期

### 动态应用代理

```caddyfile
# 方案 1: 使用子域名
*.apps.example.com {
    @app1 host app1.apps.example.com
    handle @app1 {
        reverse_proxy localhost:8001
    }
}

# 方案 2: 使用路径
example.com {
    handle /app1/* {
        reverse_proxy localhost:8001
    }
    handle /app2/* {
        reverse_proxy localhost:8002
    }
}

# 方案 3: 使用数据库查询（高级）
*.apps.example.com {
    reverse_proxy {
        # 从环境变量或 HTTP API 动态获取后端地址
        dynamic http
        lb_policy first
    }
}
```

### 安全加固

```caddyfile
example.com {
    # 限制请求大小
    request_body {
        max_size 10MB
    }
    
    # 速率限制（需要插件）
    rate_limit {
        zone dynamic {
            key {remote_host}
            events 100
            window 1m
        }
    }
    
    # IP 白名单
    @allowed {
        remote_ip 192.168.1.0/24
    }
    handle @allowed {
        reverse_proxy localhost:9000
    }
    handle {
        respond "Forbidden" 403
    }
}
```

## 常见问题

### 1. 证书申请失败

**原因：**
- 域名未正确解析
- 端口 80/443 被占用
- Let's Encrypt 速率限制

**解决：**
```bash
# 检查域名解析
dig deploy.example.com

# 检查端口占用
sudo lsof -i :80
sudo lsof -i :443

# 使用 staging 环境测试
# 在 Caddyfile 全局配置中添加：
{
    acme_ca https://acme-staging-v02.api.letsencrypt.org/directory
}

# 查看详细日志
docker-compose -f docker-compose.caddy.yml logs caddy
```

### 2. 证书续期失败

Caddy 会自动续期，但如果失败：

```bash
# 手动触发续期
docker exec deploy-webhook-caddy caddy reload --config /etc/caddy/Caddyfile

# 删除旧证书重新申请
docker exec deploy-webhook-caddy rm -rf /data/caddy/certificates/
docker-compose -f docker-compose.caddy.yml restart caddy
```

### 3. 性能优化

```caddyfile
example.com {
    # 启用 HTTP/3
    protocols h1 h2 h3
    
    # 调整缓冲区
    reverse_proxy localhost:9000 {
        flush_interval -1
        buffer_size 16384
    }
    
    # 启用压缩
    encode zstd gzip
    
    # 静态文件缓存
    header /static/* Cache-Control "public, max-age=31536000"
}
```

### 4. 监控和日志

```bash
# 实时日志
docker-compose -f docker-compose.caddy.yml logs -f caddy

# 访问日志
tail -f logs/caddy/deploy.log

# Caddy Admin API
curl http://localhost:2019/config/

# 健康检查
curl http://localhost:8080/health
```

### 5. 回滚到 Nginx

如果需要切换回 Nginx：

```bash
# 停止 Caddy
docker-compose -f docker-compose.caddy.yml down

# 启动 Nginx
docker-compose up -d nginx
```

## 进阶用法

### 1. 集成 Prometheus 监控

```caddyfile
:2019 {
    metrics /metrics
}
```

### 2. 使用 DNS 质询（通配符证书）

```caddyfile
*.example.com {
    tls {
        dns cloudflare {env.CLOUDFLARE_API_TOKEN}
    }
}
```

### 3. A/B 测试

```caddyfile
example.com {
    @beta header Cookie *beta=true*
    handle @beta {
        reverse_proxy localhost:9002
    }
    handle {
        reverse_proxy localhost:9001
    }
}
```

## 资源链接

- [Caddy 官方文档](https://caddyserver.com/docs/)
- [Caddyfile 语法](https://caddyserver.com/docs/caddyfile)
- [Let's Encrypt 速率限制](https://letsencrypt.org/docs/rate-limits/)
- [HTTP/3 支持](https://caddyserver.com/docs/http3)

## 总结

Caddy 是一个现代化、简单且强大的 Web 服务器，特别适合：

✅ 需要自动 HTTPS 的项目  
✅ 快速原型开发  
✅ 微服务反向代理  
✅ Docker/K8s 环境  

集成 Caddy 后，你的 Deploy Webhook 系统将自动获得企业级的 HTTPS 支持！

