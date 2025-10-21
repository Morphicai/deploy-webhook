# Caddy 快速开始指南

## 📦 方案概述

**集成 Caddy 后的架构：**

```
用户浏览器 (HTTPS) → Caddy (自动 HTTPS) → 内网服务
```

**优势：**
- ✅ 自动 HTTPS，无需手动配置证书
- ✅ 自动续期证书，无需担心过期
- ✅ 统一入口，简化部署
- ✅ 安全隔离，内网服务不对外暴露

## 🚀 快速部署（5 分钟）

### 方案 A：使用 Docker Compose（推荐）

```bash
# 1. 克隆或进入项目目录
cd /Users/pengzai/www/morphicai/deploy-webhook

# 2. 配置域名和邮箱
export DEPLOY_DOMAIN="your-domain.com"
export DEPLOY_EMAIL="your-email@example.com"

# 3. 更新 Caddyfile
sed -i.bak "s/example\.com/$DEPLOY_DOMAIN/g" Caddyfile
sed -i "s/admin@example\.com/$DEPLOY_EMAIL/g" Caddyfile

# 4. 启动服务
docker-compose -f docker-compose.caddy.yml up -d

# 5. 查看日志
docker-compose -f docker-compose.caddy.yml logs -f caddy

# 6. 等待证书生成（约 1-2 分钟）
# 访问 https://deploy.your-domain.com
```

### 方案 B：使用系统服务

```bash
# 1. 运行自动安装脚本
sudo ./scripts/setup-caddy.sh

# 2. 按提示输入域名和邮箱

# 3. 完成！访问你的域名
```

## 🔧 配置域名 DNS

在你的域名服务商处添加以下 DNS 记录：

```
类型    主机记录              记录值
A      deploy               YOUR_SERVER_IP
A      api.deploy           YOUR_SERVER_IP
A      *.apps               YOUR_SERVER_IP
```

**示例（假设域名为 example.com，服务器 IP 为 1.2.3.4）：**

```
A      deploy.example.com      1.2.3.4
A      api.deploy.example.com  1.2.3.4
A      *.apps.example.com      1.2.3.4
```

## 📝 验证部署

```bash
# 1. 检查 Caddy 状态
docker ps | grep caddy
# 或
systemctl status caddy

# 2. 测试 HTTPS
curl -I https://deploy.your-domain.com

# 3. 查看证书信息
echo | openssl s_client -connect deploy.your-domain.com:443 2>/dev/null | \
  openssl x509 -noout -subject -issuer -dates

# 4. 检查证书颁发者（应该是 Let's Encrypt）
# Issuer: C = US, O = Let's Encrypt, CN = R3
```

## 🎯 访问你的应用

部署完成后，你可以通过以下 URL 访问：

```
管理后台：https://deploy.your-domain.com
API 接口：https://api.deploy.your-domain.com
应用示例：https://app1.apps.your-domain.com
```

## 🔄 自动更新 Caddy 配置

当你添加新应用时，Deploy Webhook 可以自动更新 Caddy 配置：

```bash
# 方法 1: 通过 API
curl -X POST https://api.deploy.your-domain.com/api/caddy/reload \
  -H "x-admin-token: YOUR_ADMIN_TOKEN"

# 方法 2: 在管理后台自动触发（开发中）
# 当部署应用时自动更新 Caddy 配置
```

## 🛠️ 常用命令

```bash
# 查看 Caddy 日志
docker-compose -f docker-compose.caddy.yml logs -f caddy

# 重载 Caddy 配置
docker exec deploy-webhook-caddy caddy reload --config /etc/caddy/Caddyfile

# 验证配置文件
docker exec deploy-webhook-caddy caddy validate --config /etc/caddy/Caddyfile

# 查看证书
docker exec deploy-webhook-caddy ls -la /data/caddy/certificates/

# 手动触发证书更新
docker exec deploy-webhook-caddy caddy reload
```

## ⚙️ 环境变量配置

在 `.env` 文件中添加 Caddy 相关配置：

```bash
# Caddy 配置
CADDY_ADMIN_DOMAIN=deploy.example.com
CADDY_API_DOMAIN=api.deploy.example.com
CADDY_APPS_DOMAIN=apps.example.com
CADDY_EMAIL=admin@example.com
CADDY_HTTP3=true
CADDY_CONFIG_PATH=/etc/caddy/Caddyfile
```

## 🐛 故障排除

### 问题 1: 证书申请失败

**症状：** 访问显示证书错误或无法访问

**解决：**
```bash
# 1. 检查 DNS 是否生效
dig deploy.your-domain.com

# 2. 确保端口 80 和 443 开放
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 3. 查看详细日志
docker-compose -f docker-compose.caddy.yml logs caddy | grep -i error

# 4. 使用 staging 环境测试（避免 rate limit）
# 编辑 Caddyfile，在全局配置中添加：
{
    acme_ca https://acme-staging-v02.api.letsencrypt.org/directory
}
```

### 问题 2: 证书已过期

**症状：** 浏览器提示证书过期

**解决：**
```bash
# Caddy 会自动续期，但如果失败可以手动触发
docker exec deploy-webhook-caddy caddy reload

# 查看续期日志
docker-compose -f docker-compose.caddy.yml logs caddy | grep -i renew
```

### 问题 3: 502 Bad Gateway

**症状：** 访问显示 502 错误

**解决：**
```bash
# 1. 检查后端服务是否运行
docker ps | grep deploy-webhook

# 2. 检查端口映射
netstat -tlnp | grep 9000
netstat -tlnp | grep 9001

# 3. 检查 Caddy 能否访问后端
docker exec deploy-webhook-caddy wget -O- http://localhost:9001
```

## 📊 性能优化

### 启用 HTTP/3

HTTP/3 (QUIC) 可以显著提升性能，尤其是在弱网环境：

```caddyfile
{
    servers {
        protocols h1 h2 h3
    }
}
```

### 启用缓存

对于静态资源：

```caddyfile
deploy.example.com {
    @static {
        path /assets/* /images/* /js/* /css/*
    }
    
    header @static Cache-Control "public, max-age=31536000, immutable"
    
    reverse_proxy localhost:9001
}
```

### 连接池优化

```caddyfile
deploy.example.com {
    reverse_proxy localhost:9001 {
        lb_policy least_conn
        fail_timeout 10s
        max_fails 3
        health_uri /health
        health_interval 30s
    }
}
```

## 🔐 安全加固

### 限制 Admin API 访问

```caddyfile
api.deploy.example.com {
    @admin {
        remote_ip 1.2.3.4 5.6.7.8/24
    }
    
    handle @admin {
        reverse_proxy localhost:9000
    }
    
    handle {
        respond "Forbidden" 403
    }
}
```

### 启用 WAF（Web Application Firewall）

使用 Caddy Security 插件：

```bash
# 使用自定义 Caddy 构建
xcaddy build --with github.com/greenpau/caddy-security
```

## 📈 监控和日志

### 日志位置

```bash
# Docker 方式
docker-compose -f docker-compose.caddy.yml logs -f

# 系统服务方式
journalctl -u caddy -f
tail -f /var/log/caddy/*.log
```

### 集成 Prometheus

```caddyfile
:2019 {
    metrics /metrics
}
```

然后在 Prometheus 配置中添加：

```yaml
scrape_configs:
  - job_name: 'caddy'
    static_configs:
      - targets: ['localhost:2019']
```

## 💡 最佳实践

1. **始终使用真实域名** - Let's Encrypt 不支持 IP 地址
2. **备份证书数据卷** - `caddy_data` 包含所有证书
3. **使用 staging 环境测试** - 避免触发 rate limit
4. **监控证书有效期** - 虽然会自动续期，但应该监控
5. **定期查看日志** - 及早发现潜在问题

## 🎓 相关资源

- [Caddy 官方文档](https://caddyserver.com/docs/)
- [Let's Encrypt 文档](https://letsencrypt.org/docs/)
- [完整部署指南](./CADDY_DEPLOYMENT.md)
- [Docker Compose 配置](./docker-compose.caddy.yml)

---

**需要帮助？** 查看 [常见问题](./CADDY_DEPLOYMENT.md#常见问题) 或提交 Issue

