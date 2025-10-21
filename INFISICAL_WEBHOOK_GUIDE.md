# Infisical Webhook 自动同步指南 🚀

## 🎯 为什么使用 Webhook？

相比定时轮询，**Webhook 提供了更优的解决方案**：

| 特性 | 定时轮询 | Webhook (推荐) |
|-----|---------|---------------|
| **实时性** | ❌ 延迟 5-10 分钟 | ✅ 秒级响应 |
| **API 调用** | ❌ 频繁调用，浪费资源 | ✅ 仅在变更时调用 |
| **用户体验** | ❌ 需要等待或手动刷新 | ✅ 自动生效，无需操作 |
| **服务器负载** | ❌ 持续轮询 | ✅ 事件驱动，按需处理 |
| **配置复杂度** | ⚠️ 需要配置同步间隔 | ✅ 一次配置，永久生效 |

---

## 📋 工作流程

```
┌────────────────────────────────────────────────────────────────┐
│                  Infisical Webhook 工作流程                      │
└────────────────────────────────────────────────────────────────┘

1. 用户在 Infisical 修改密钥
   ↓
2. Infisical 立即发送 Webhook 通知
   ↓
3. Deploy Webhook 接收通知 (POST /webhooks/infisical)
   ↓
4. 验证签名 (安全性保证)
   ↓
5. 清除相关密钥缓存
   ↓
6. 下次部署自动使用最新密钥 ✅

可选: 7. 自动触发重新部署 (配置启用后)
```

---

## 🚀 快速配置 (5分钟)

### Step 1: 在 Deploy Webhook 配置环境变量

```bash
# .env 或环境变量
INFISICAL_WEBHOOK_SECRET=your-webhook-secret-key

# 可选：启用自动重新部署
INFISICAL_AUTO_REDEPLOY=false
```

**推荐生成强密钥**：
```bash
openssl rand -base64 32
```

### Step 2: 在 Infisical 配置 Webhook

#### 2.1 进入项目设置

1. 登录 Infisical Dashboard
2. 选择您的项目
3. 进入 **Settings** → **Webhooks**

#### 2.2 添加 Webhook

点击 **"Add Webhook"** 并配置：

```yaml
Webhook URL: https://your-domain.com/webhooks/infisical
Description: Deploy Webhook Auto Sync
Secret: [填入与 INFISICAL_WEBHOOK_SECRET 相同的密钥]

Events to trigger (选择以下事件):
  ✅ secret.created   (密钥创建)
  ✅ secret.updated   (密钥更新)
  ✅ secret.deleted   (密钥删除)

Environment: 
  ✅ All Environments  (或选择特定环境)

Secret Path:
  ✅ All Paths  (或选择特定路径)
```

#### 2.3 测试 Webhook

配置完成后，点击 **"Test Webhook"** 按钮：

```bash
# 应该看到成功响应
{
  "success": true,
  "message": "Webhook processed successfully",
  "event": "test",
  "action": "cache_cleared"
}
```

### Step 3: 验证配置

#### 3.1 测试端点验证

```bash
curl -X POST http://localhost:9000/webhooks/infisical/test \
  -H "Content-Type: application/json" \
  -d '{
    "test": "hello",
    "timestamp": "2024-01-01T00:00:00Z"
  }'

# 响应
{
  "success": true,
  "message": "Test webhook received successfully",
  "receivedAt": "2024-01-01T00:00:00.000Z"
}
```

#### 3.2 实际密钥变更测试

1. 在 Infisical 中修改一个密钥
2. 查看 Deploy Webhook 日志：
   ```
   [Infisical Webhook] Received event: {
     event: 'secret.updated',
     workspace: 'my-project',
     environment: 'production',
     secretPath: '/',
     timestamp: '2024-01-01T00:00:00Z'
   }
   [Infisical Webhook] Clearing cache for my-project-production-/
   ```
3. 重新部署应用，验证使用了最新密钥

---

## 🔐 安全机制

### 签名验证

所有 Webhook 请求都经过 HMAC-SHA256 签名验证：

```typescript
// 验证流程
const signature = request.headers['x-infisical-signature'];
const payload = JSON.stringify(request.body);
const expectedSignature = hmac_sha256(payload, INFISICAL_WEBHOOK_SECRET);

if (signature !== expectedSignature) {
  return 401 Unauthorized;
}
```

### 最佳实践

1. **使用强密钥**
   ```bash
   # 至少 32 字符的随机字符串
   openssl rand -base64 32
   ```

2. **HTTPS 部署** (生产环境必须)
   ```
   ❌ http://your-domain.com/webhooks/infisical
   ✅ https://your-domain.com/webhooks/infisical
   ```

3. **限制来源 IP** (可选，如果 Infisical 提供固定 IP)
   ```nginx
   # Nginx 示例
   location /webhooks/infisical {
     allow 1.2.3.4;  # Infisical IP
     deny all;
     proxy_pass http://localhost:9000;
   }
   ```

---

## 📊 Webhook 事件类型

### 支持的事件

| 事件类型 | 触发时机 | 处理动作 |
|---------|---------|---------|
| `secret.created` | 创建新密钥 | 清除缓存 |
| `secret.updated` | 更新密钥值 | 清除缓存 |
| `secret.deleted` | 删除密钥 | 清除缓存 |

### Webhook 数据结构

```json
{
  "event": "secret.updated",
  "workspace": {
    "id": "proj_abc123",
    "name": "My Project"
  },
  "environment": {
    "id": "env_xyz789",
    "name": "Production",
    "slug": "production"
  },
  "secretPath": "/api",
  "secret": {
    "id": "sec_456",
    "key": "DATABASE_URL",
    "type": "shared"
  },
  "timestamp": "2024-01-01T12:00:00.000Z",
  "actor": {
    "type": "user",
    "metadata": {
      "userId": "user_123",
      "email": "admin@example.com"
    }
  }
}
```

---

## 🎯 实际使用场景

### 场景 1: 密钥紧急更新 (生产环境)

**问题**: 数据库密码泄露，需要立即更换

**传统方式** (轮询):
```
1. 在 Infisical 修改密码         (0 分钟)
2. 等待下次轮询                  (最多 5 分钟)
3. 或手动清除缓存                (需要运维介入)
4. 重新部署应用                  (1 分钟)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
总耗时: 6+ 分钟，需要手动操作
```

**Webhook 方式** (推荐):
```
1. 在 Infisical 修改密码         (0 分钟)
2. Webhook 自动清除缓存          (3 秒)
3. 重新部署应用                  (1 分钟)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
总耗时: 1 分钟，完全自动化 ✅
```

### 场景 2: 多环境密钥管理

```yaml
项目: my-app

环境: Production
  DATABASE_URL → 修改 → Webhook → 清除 cache(prod) → 生效 ✅

环境: Staging
  DATABASE_URL → 修改 → Webhook → 清除 cache(staging) → 生效 ✅

# 两个环境的缓存独立清除，互不影响
```

### 场景 3: 团队协作

```
开发者 A 在 Infisical 更新 API Key
    ↓ (Webhook 自动通知)
Deploy Webhook 自动清除缓存
    ↓
开发者 B 触发部署
    ↓
自动使用最新 API Key ✅

# 无需沟通，无需等待，自动同步
```

---

## 🔧 高级配置

### 1. 自动重新部署 (实验性功能)

**⚠️ 谨慎使用**: 密钥变更会自动触发应用重新部署

```bash
# 启用自动重新部署
INFISICAL_AUTO_REDEPLOY=true

# 指定允许自动部署的应用 (可选)
INFISICAL_AUTO_REDEPLOY_APPS=app1,app2,app3
```

**工作流程**:
```
1. Infisical 密钥变更
   ↓
2. Webhook 接收通知
   ↓
3. 查找使用该密钥的应用
   ↓
4. 自动触发重新部署
   ↓
5. 应用重启，自动使用最新密钥 ✅
```

**使用场景**: 
- ✅ 开发/测试环境 (快速迭代)
- ⚠️ 生产环境 (需要评估风险)

### 2. 选择性事件订阅

只关注特定事件：

```bash
# 在 Infisical Webhook 配置中
Events:
  ✅ secret.updated   # 只监听更新事件
  ❌ secret.created   # 忽略创建
  ❌ secret.deleted   # 忽略删除
```

### 3. 环境/路径过滤

只监听特定环境或路径的变更：

```yaml
Environment Filter:
  - production
  - staging

Secret Path Filter:
  - /api
  - /database
```

---

## 🛠️ 故障排除

### 问题 1: Webhook 未触发

**检查清单**:

```bash
# 1. 检查 Webhook URL 是否可访问
curl https://your-domain.com/webhooks/infisical/test

# 2. 检查 Infisical Webhook 配置
# Dashboard → Settings → Webhooks → 查看状态

# 3. 检查 Deploy Webhook 日志
docker logs deploy-webhook | grep "Infisical Webhook"

# 4. 检查防火墙/网络配置
# 确保 Infisical 服务器可以访问您的服务器
```

### 问题 2: 签名验证失败

**错误**: `401 Invalid webhook signature`

**原因**: 

```bash
# ❌ 密钥不匹配
INFISICAL_WEBHOOK_SECRET=secret-on-server
Infisical Webhook Secret=different-secret

# ✅ 密钥必须完全一致
INFISICAL_WEBHOOK_SECRET=same-secret
Infisical Webhook Secret=same-secret
```

**解决方案**:
```bash
# 1. 确认环境变量
echo $INFISICAL_WEBHOOK_SECRET

# 2. 重新生成密钥
openssl rand -base64 32

# 3. 同时更新两边配置
# - Deploy Webhook 环境变量
# - Infisical Webhook 配置
```

### 问题 3: Webhook 延迟

**症状**: 修改密钥后，Webhook 延迟 10+ 秒才到达

**原因**: 
- 网络延迟
- Infisical 服务器负载
- 您的服务器响应慢

**优化**:
```bash
# 1. 确保使用 HTTPS (更快)
# 2. 检查服务器响应时间
curl -w "@-" -o /dev/null -s https://your-domain.com/webhooks/infisical/test <<'EOF'
    time_namelookup:  %{time_namelookup}\n
       time_connect:  %{time_connect}\n
    time_appconnect:  %{time_appconnect}\n
      time_redirect:  %{time_redirect}\n
   time_pretransfer:  %{time_pretransfer}\n
 time_starttransfer:  %{time_starttransfer}\n
                    ----------\n
         time_total:  %{time_total}\n
EOF

# 3. 优化服务器性能
```

---

## 📊 监控和日志

### 日志示例

```bash
# 成功处理
[Infisical Webhook] Received event: {
  event: 'secret.updated',
  workspace: 'my-project',
  environment: 'production',
  secretPath: '/',
  timestamp: '2024-01-01T12:00:00Z'
}
[Infisical Webhook] Clearing cache for my-project-production-/

# 签名验证失败
[Infisical Webhook] Invalid signature

# 未配置密钥
[Infisical Webhook] INFISICAL_WEBHOOK_SECRET not configured, skipping verification

# 测试 Webhook
[Infisical Webhook] Test webhook received: {...}
```

### Prometheus 指标 (未来功能)

```
infisical_webhook_requests_total{status="success"} 1234
infisical_webhook_requests_total{status="invalid_signature"} 5
infisical_webhook_processing_duration_seconds 0.023
```

---

## 📝 完整配置示例

### 1. Deploy Webhook 配置

```bash
# .env
PORT=9000
WEBHOOK_SECRET=your-deploy-secret

# Infisical 配置
INFISICAL_WEBHOOK_SECRET=your-webhook-secret-key
INFISICAL_SYNC_INTERVAL_MINUTES=0  # 禁用轮询，完全使用 Webhook
INFISICAL_AUTO_REDEPLOY=false

# JWT 认证
JWT_SECRET=your-jwt-secret

# Docker
DOCKER_SOCK_PATH=/var/run/docker.sock
```

### 2. Infisical Webhook 配置

```json
{
  "url": "https://deploy.example.com/webhooks/infisical",
  "description": "Deploy Webhook Auto Sync",
  "secret": "your-webhook-secret-key",
  "events": [
    "secret.created",
    "secret.updated",
    "secret.deleted"
  ],
  "environment": "all",
  "secretPath": "/"
}
```

### 3. Nginx 反向代理

```nginx
server {
    listen 443 ssl http2;
    server_name deploy.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Webhook 端点 (不需要认证)
    location /webhooks/infisical {
        proxy_pass http://localhost:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 保留签名头
        proxy_pass_header X-Infisical-Signature;
    }

    # API 端点 (需要认证)
    location /api {
        proxy_pass http://localhost:9000;
        # ... 其他配置
    }
}
```

---

## 🎉 总结

### ✅ Webhook 方案的优势

1. **实时同步** - 秒级响应，无需等待
2. **零配置** - 一次配置，永久生效
3. **资源高效** - 按需触发，不浪费资源
4. **安全可靠** - HMAC 签名验证
5. **易于监控** - 清晰的日志和事件

### 🔄 迁移路径

如果您已经在使用轮询方案，可以平滑迁移：

```bash
# 阶段 1: 并行运行
INFISICAL_SYNC_INTERVAL_MINUTES=5  # 保留轮询
INFISICAL_WEBHOOK_SECRET=xxx        # 启用 Webhook

# 阶段 2: 验证 Webhook 稳定后
INFISICAL_SYNC_INTERVAL_MINUTES=0  # 禁用轮询
INFISICAL_WEBHOOK_SECRET=xxx        # 仅使用 Webhook
```

### 🚀 推荐配置

```bash
# 生产环境推荐
INFISICAL_WEBHOOK_SECRET=<strong-random-secret>
INFISICAL_SYNC_INTERVAL_MINUTES=0
INFISICAL_AUTO_REDEPLOY=false  # 手动控制部署

# 开发环境
INFISICAL_WEBHOOK_SECRET=<strong-random-secret>
INFISICAL_SYNC_INTERVAL_MINUTES=0
INFISICAL_AUTO_REDEPLOY=true   # 自动部署，快速迭代
```

---

**文档版本**: v2.0  
**更新时间**: 2025-10-21  
**适用版本**: Deploy Webhook v1.1.0+

**🌟 Webhook 方案让密钥管理真正实现了"改了就生效"！**

