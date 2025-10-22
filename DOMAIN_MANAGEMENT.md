# 域名管理功能指南

## 🎯 新架构设计

### 从单域名到多域名

**旧架构（已废弃）**：
```
Application (应用)
  ├─ name
  ├─ image
  ├─ domain (单个)
  └─ caddyConfig
```

**新架构（当前）**：
```
Application (应用)           Domain (域名)
  ├─ name                      ├─ domainName
  ├─ image                     ├─ type (application | custom)
  ├─ ports                     ├─ applicationId (可选)
  └─ envVars                   ├─ targetUrl (可选)
                               ├─ targetPort (可选)
       1:N                     ├─ caddyConfig (每个域名独立)
Application ←──────→ Domain   ├─ enabled
                               └─ description
```

### 核心特性

✅ **应用可以绑定多个域名**
```
my-app
  ├─ api.example.com
  ├─ api-v2.example.com
  └─ legacy-api.com
```

✅ **域名可以指向应用**
```json
{
  "domainName": "api.example.com",
  "type": "application",
  "applicationId": 1
}
```

✅ **域名可以指向任意 URL**
```json
{
  "domainName": "legacy.example.com",
  "type": "custom",
  "targetUrl": "https://old-server.com",
  "targetPort": 8080
}
```

✅ **每个域名独立的高级配置**
```json
{
  "domainName": "api.example.com",
  "caddyConfig": {
    "rateLimit": {
      "enabled": true,
      "requestsPerMinute": 1000
    },
    "cors": {
      "enabled": true
    }
  }
}
```

## 📋 API 使用示例

### 1. 列出所有域名

```bash
curl -X GET http://localhost:9000/api/domains \
  -H "x-admin-token: YOUR_TOKEN"
```

**过滤查询**：
```bash
# 只列出已启用的域名
curl -X GET "http://localhost:9000/api/domains?enabled=true"

# 列出某个应用的所有域名
curl -X GET "http://localhost:9000/api/domains?applicationId=1"

# 只列出自定义域名
curl -X GET "http://localhost:9000/api/domains?type=custom"
```

### 2. 创建域名 - 指向应用

```bash
curl -X POST http://localhost:9000/api/domains \
  -H "x-admin-token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "domainName": "api.mycompany.com",
    "type": "application",
    "applicationId": 1,
    "description": "Production API",
    "caddyConfig": {
      "rateLimit": {
        "enabled": true,
        "requestsPerMinute": 1000
      },
      "cors": {
        "enabled": true,
        "allowOrigins": ["https://mycompany.com"],
        "allowCredentials": true
      }
    }
  }'
```

### 3. 创建域名 - 指向外部 URL

```bash
curl -X POST http://localhost:9000/api/domains \
  -H "x-admin-token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "domainName": "legacy.mycompany.com",
    "type": "custom",
    "targetUrl": "https://old-server.mycompany.com",
    "targetPort": 8080,
    "description": "Legacy API redirect",
    "caddyConfig": {
      "headers": {
        "response": {
          "X-Proxy": "Deploy-Webhook"
        }
      }
    }
  }'
```

### 4. 更新域名配置

```bash
curl -X PUT http://localhost:9000/api/domains/1 \
  -H "x-admin-token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "caddyConfig": {
      "rateLimit": {
        "enabled": true,
        "requestsPerMinute": 2000
      }
    }
  }'
```

### 5. 启用/禁用域名

```bash
# 禁用域名（暂时停止解析，但保留配置）
curl -X POST http://localhost:9000/api/domains/1/toggle \
  -H "x-admin-token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

# 启用域名
curl -X POST http://localhost:9000/api/domains/1/toggle \
  -H "x-admin-token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

### 6. 获取应用的所有域名

```bash
curl -X GET http://localhost:9000/api/domains/application/1 \
  -H "x-admin-token: YOUR_TOKEN"
```

### 7. 删除域名

```bash
curl -X DELETE http://localhost:9000/api/domains/1 \
  -H "x-admin-token: YOUR_TOKEN"
```

## 🎨 使用场景

### 场景 1：多域名指向同一应用

```
┌─────────────────────────┐
│ Application: my-api      │
│ Container: localhost:8001│
└───────────┬─────────────┘
            │
      ┌─────┼─────┬─────────────┬────────────┐
      │     │     │             │            │
api.com  api-v2  beta.api  legacy.api  admin.api
  │       │        │           │           │
  CORS   限流    IP白名单    重定向    Basic Auth
```

**创建方式**：

```bash
# 主域名 - 公开 API
curl -X POST http://localhost:9000/api/domains \
  -d '{
    "domainName": "api.company.com",
    "type": "application",
    "applicationId": 1,
    "caddyConfig": {
      "cors": {"enabled": true},
      "rateLimit": {"enabled": true, "requestsPerMinute": 1000}
    }
  }'

# Beta 域名 - 内部测试
curl -X POST http://localhost:9000/api/domains \
  -d '{
    "domainName": "beta-api.company.com",
    "type": "application",
    "applicationId": 1,
    "caddyConfig": {
      "ipAccess": {
        "mode": "whitelist",
        "ips": ["10.0.0.0/8"]
      }
    }
  }'

# 管理域名 - 需要认证
curl -X POST http://localhost:9000/api/domains \
  -d '{
    "domainName": "admin-api.company.com",
    "type": "application",
    "applicationId": 1,
    "caddyConfig": {
      "customDirectives": [
        "basicauth {",
        "  admin $2a$14$...",
        "}"
      ]
    }
  }'
```

### 场景 2：反向代理到外部服务

```
┌─────────────────────────────────────┐
│ Deploy Webhook                       │
│                                      │
│  legacy.company.com ───→ old-server.com:8080    │
│  cdn.company.com    ───→ cdn.cloudflare.com     │
│  docs.company.com   ───→ docs.github.io         │
└─────────────────────────────────────┘
```

**创建方式**：

```bash
# 反向代理到旧服务器
curl -X POST http://localhost:9000/api/domains \
  -d '{
    "domainName": "legacy.company.com",
    "type": "custom",
    "targetUrl": "https://old-server.com",
    "targetPort": 8080,
    "description": "Legacy system proxy"
  }'

# 反向代理到 CDN
curl -X POST http://localhost:9000/api/domains \
  -d '{
    "domainName": "cdn.company.com",
    "type": "custom",
    "targetUrl": "https://cdn.cloudflare.com",
    "caddyConfig": {
      "headers": {
        "response": {
          "Cache-Control": "public, max-age=31536000"
        }
      }
    }
  }'
```

### 场景 3：蓝绿部署

```
┌────────────────────────────┐
│ api.company.com            │
│   ↓                        │
│ [95% → app-v1] [5% → app-v2]│
└────────────────────────────┘
```

**实现方式**：

```bash
# 主域名 - 大部分流量到 v1
curl -X POST http://localhost:9000/api/domains \
  -d '{
    "domainName": "api.company.com",
    "type": "application",
    "applicationId": 1,
    "description": "Production (v1)"
  }'

# Beta 域名 - 新版本测试
curl -X POST http://localhost:9000/api/domains \
  -d '{
    "domainName": "api-v2.company.com",
    "type": "application",
    "applicationId": 2,
    "description": "Production (v2)"
  }'

# 测试 v2 稳定后，切换主域名到 v2
curl -X PUT http://localhost:9000/api/domains/1 \
  -d '{"applicationId": 2}'
```

### 场景 4：地域分流

```
┌────────────────────────────┐
│ api.company.com            │
│   ↓                        │
│ 根据 IP 自动分流：          │
│ - CN → app-cn (北京)       │
│ - US → app-us (美国)       │
│ - EU → app-eu (欧洲)       │
└────────────────────────────┘
```

**实现方式**：

```bash
# 中国区域
curl -X POST http://localhost:9000/api/domains \
  -d '{
    "domainName": "api-cn.company.com",
    "type": "application",
    "applicationId": 1,
    "caddyConfig": {
      "headers": {
        "response": {
          "X-Region": "CN"
        }
      }
    }
  }'

# 美国区域
curl -X POST http://localhost:9000/api/domains \
  -d '{
    "domainName": "api-us.company.com",
    "type": "application",
    "applicationId": 2,
    "caddyConfig": {
      "headers": {
        "response": {
          "X-Region": "US"
        }
      }
    }
  }'
```

## 🔄 迁移指南

### 从旧架构迁移

如果你在使用旧架构（应用自带 domain 字段），需要迁移到新架构：

**步骤 1：导出现有配置**

```bash
# 获取所有应用
curl http://localhost:9000/api/applications > applications.json
```

**步骤 2：为每个应用创建域名**

```bash
# 假设应用 ID=1, domain="api.example.com"
curl -X POST http://localhost:9000/api/domains \
  -d '{
    "domainName": "api.example.com",
    "type": "application",
    "applicationId": 1
  }'
```

**步骤 3：删除数据库并重建**

```bash
# 备份数据
cp data/deploy-webhook.db data/deploy-webhook.db.backup

# 删除数据库（系统会自动创建新schema）
rm data/deploy-webhook.db

# 重启服务
docker-compose restart
```

## 📊 数据库 Schema

### domains 表

```sql
CREATE TABLE domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,                    -- 'application' | 'custom'
  application_id INTEGER,                 -- 关联应用 ID
  target_url TEXT,                        -- 自定义目标 URL
  target_port INTEGER,                    -- 自定义目标端口
  caddy_config TEXT NOT NULL DEFAULT '{}', -- Caddy 高级配置 (JSON)
  enabled INTEGER NOT NULL DEFAULT 1,     -- 是否启用
  description TEXT,                       -- 描述
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

CREATE INDEX idx_domains_application_id ON domains(application_id);
CREATE INDEX idx_domains_enabled ON domains(enabled);
```

### 数据示例

```sql
-- 指向应用的域名
INSERT INTO domains (domain_name, type, application_id, caddy_config, enabled) VALUES
  ('api.example.com', 'application', 1, '{"cors":{"enabled":true}}', 1);

-- 指向外部 URL 的域名
INSERT INTO domains (domain_name, type, target_url, target_port, enabled) VALUES
  ('legacy.example.com', 'custom', 'https://old-server.com', 8080, 1);
```

## ⚙️ 自动化功能

### 自动重载 Caddy

每次域名变更后，系统会自动：
1. 重新生成 Caddyfile
2. 验证配置语法
3. 重载 Caddy（零停机）

### 自动证书管理

- 新域名自动申请 SSL 证书
- 证书自动续期
- 证书失败自动重试

## 🔧 高级技巧

### 1. 批量创建域名

```bash
#!/bin/bash
DOMAINS=("api1.com" "api2.com" "api3.com")
APP_ID=1

for domain in "${DOMAINS[@]}"; do
  curl -X POST http://localhost:9000/api/domains \
    -H "x-admin-token: $TOKEN" \
    -d "{
      \"domainName\": \"$domain\",
      \"type\": \"application\",
      \"applicationId\": $APP_ID
    }"
done
```

### 2. 动态更新配置

```bash
# 在高峰期降低速率限制
curl -X PUT http://localhost:9000/api/domains/1 \
  -d '{"caddyConfig": {"rateLimit": {"requestsPerMinute": 5000}}}'

# 高峰期过后恢复
curl -X PUT http://localhost:9000/api/domains/1 \
  -d '{"caddyConfig": {"rateLimit": {"requestsPerMinute": 1000}}}'
```

### 3. 健康检查集成

```bash
# 配置健康检查，自动切换故障域名
curl -X PUT http://localhost:9000/api/domains/1 \
  -d '{
    "caddyConfig": {
      "reverseProxy": {
        "healthCheck": {
          "uri": "/health",
          "interval": "10s",
          "timeout": "3s",
          "unhealthyThreshold": 3
        }
      }
    }
  }'
```

## 📚 相关文档

- [Caddy 高级配置](./CADDY_ADVANCED_CONFIG.md)
- [用户指南](./USER_GUIDE.md)
- [完整方案](./COMPLETE_SOLUTION.md)

---

**🎉 现在你可以灵活管理所有域名了！**

