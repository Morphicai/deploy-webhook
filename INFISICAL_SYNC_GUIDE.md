# Infisical 自动同步指南

> **⚠️ 重要提示**: 本文档介绍的是**轮询同步方案**。我们强烈推荐使用 **[Infisical Webhook 方案](./INFISICAL_WEBHOOK_GUIDE.md)** 获得更好的体验！

## 🎯 功能概述

Deploy Webhook 支持两种 Infisical 同步方案：

| 方案 | 实时性 | 资源消耗 | 推荐度 |
|-----|--------|---------|--------|
| **Webhook** (推荐) | ✅ 秒级 | ✅ 极低 | ⭐⭐⭐⭐⭐ |
| 轮询同步 (本文档) | ⚠️ 5分钟 | ⚠️ 持续轮询 | ⭐⭐⭐ |

**👉 立即查看**: [Infisical Webhook 配置指南](./INFISICAL_WEBHOOK_GUIDE.md)

---

## 轮询同步方案 (传统方式)

### 核心特性

✅ **实时获取** - 每次部署时从 Infisical 实时获取最新密钥  
✅ **智能缓存** - 5分钟缓存机制，减少 API 调用  
✅ **自动同步** - 定期后台同步，保持缓存新鲜  
✅ **手动刷新** - 支持手动触发同步  
✅ **降级策略** - API 失败时使用缓存数据  

### ⚠️ 局限性

- ❌ 延迟 5-10 分钟
- ❌ 频繁 API 调用
- ❌ 需要手动干预紧急更新  

---

## 📋 工作原理

```
┌─────────────────────────────────────────────────────────────┐
│                    Infisical 同步流程                         │
└─────────────────────────────────────────────────────────────┘

1. 部署请求到达
   └─> 检查缓存 (5分钟 TTL)
       ├─> 缓存有效 ──> 使用缓存
       └─> 缓存过期
           └─> 从 Infisical 获取
               ├─> 成功 ──> 更新缓存 ──> 使用最新密钥
               └─> 失败 ──> 使用过期缓存 (降级)

2. 后台定期同步 (每5分钟)
   └─> 刷新所有缓存
       └─> 下次部署自动使用最新密钥

3. 手动同步
   └─> API 强制刷新
       └─> 立即生效
```

---

## 🚀 快速开始

### 1. 在 Infisical 创建密钥

```bash
# 在 Infisical 中创建项目和密钥
Project: my-app
Environment: production
Path: /

Secrets:
  DATABASE_URL=postgresql://...
  API_KEY=sk_xxx
  JWT_SECRET=xxx
```

### 2. 在 Deploy Webhook 中配置 Infisical

#### 方式 1: 通过 API

```bash
curl -X POST http://localhost:9000/api/secrets \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-app-secrets",
    "provider": "infisical",
    "reference": "{\"clientId\":\"...\",\"clientSecret\":\"...\",\"projectId\":\"...\",\"environment\":\"production\",\"secretPath\":\"/\"}",
    "metadata": {
      "clientId": "YOUR_INFISICAL_CLIENT_ID",
      "clientSecret": "YOUR_INFISICAL_CLIENT_SECRET",
      "projectId": "YOUR_PROJECT_ID",
      "environment": "production",
      "secretPath": "/"
    }
  }'
```

#### 方式 2: 通过 UI

1. 登录 Deploy Webhook UI
2. 导航到 **密钥管理**
3. 点击 **添加密钥**
4. 填写 Infisical 配置：
   - Name: `my-app-secrets`
   - Type: `Infisical`
   - Project ID: `your-project-id`
   - Environment: `production`
   - Client ID: `your-client-id`
   - Client Secret: `your-client-secret`

### 3. 在部署时引用密钥

```bash
curl -X POST http://localhost:9000/deploy \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: your-secret" \
  -d '{
    "name": "my-app",
    "repo": "org/my-app",
    "version": "1.2.3",
    "port": 8080,
    "containerPort": 3000,
    "secretRefs": ["my-app-secrets"]
  }'
```

**✨ 密钥会自动从 Infisical 获取并注入到容器环境变量！**

---

## 🔄 同步策略

### 自动同步（推荐）

默认启用，每 5 分钟自动刷新所有 Infisical 密钥缓存。

```bash
# 环境变量配置
INFISICAL_SYNC_INTERVAL_MINUTES=5  # 默认5分钟

# 禁用自动同步
INFISICAL_SYNC_INTERVAL_MINUTES=0
```

### 手动同步

#### 同步单个密钥

```bash
curl -X POST http://localhost:9000/api/secrets/my-app-secrets/sync \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 清除所有缓存

```bash
curl -X POST http://localhost:9000/api/secrets/cache/clear \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 部署时强制刷新

在部署前手动触发同步，确保使用最新密钥：

```bash
# 1. 清除缓存
curl -X POST http://localhost:9000/api/secrets/cache/clear \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 2. 立即部署（会从 Infisical 获取最新密钥）
curl -X POST http://localhost:9000/deploy \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: your-secret" \
  -d '{
    "name": "my-app",
    "repo": "org/my-app",
    "version": "1.2.3",
    "port": 8080,
    "secretRefs": ["my-app-secrets"]
  }'
```

---

## 📊 缓存机制

### 缓存生命周期

```
┌──────────────────────────────────────────────────┐
│ Infisical 密钥缓存 (默认 TTL: 5 分钟)              │
├──────────────────────────────────────────────────┤
│ 第一次部署   → 从 Infisical 获取 → 缓存 5 分钟     │
│ 2 分钟后部署 → 使用缓存（快速）                    │
│ 6 分钟后部署 → 缓存过期 → 重新获取 → 更新缓存      │
└──────────────────────────────────────────────────┘
```

### 缓存 Key 设计

```typescript
cacheKey = `${projectId}-${environment}-${secretPath}`

示例:
  "abc123-production-/"
  "abc123-staging-/api"
```

### 降级策略

当 Infisical API 失败时：

```
1. 尝试从 Infisical 获取密钥
   ├─> 成功 → 更新缓存 → 使用最新密钥
   └─> 失败
       ├─> 有过期缓存 → 使用过期缓存 + 警告日志
       └─> 无缓存 → 部署失败 + 错误提示
```

---

## 🎯 使用场景

### 场景 1: 日常部署

```bash
# 自动同步已启用，直接部署即可
# 系统会自动使用最新的缓存（5分钟内）或从 Infisical 获取
curl -X POST http://localhost:9000/deploy \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: your-secret" \
  -d '{
    "name": "my-app",
    "version": "1.2.4",
    "secretRefs": ["my-app-secrets"]
  }'
```

### 场景 2: 密钥紧急更新

```bash
# 1. 在 Infisical 中修改密钥
# 2. 清除缓存（可选，强制刷新）
curl -X POST http://localhost:9000/api/secrets/cache/clear \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 3. 重新部署应用（会获取最新密钥）
curl -X POST http://localhost:9000/deploy \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: your-secret" \
  -d '{
    "name": "my-app",
    "version": "1.2.4",
    "secretRefs": ["my-app-secrets"]
  }'
```

### 场景 3: 多环境管理

```bash
# 为不同环境配置不同的密钥
POST /api/secrets
{
  "name": "my-app-prod",
  "provider": "infisical",
  "metadata": {
    "projectId": "xxx",
    "environment": "production"
  }
}

POST /api/secrets
{
  "name": "my-app-staging",
  "provider": "infisical",
  "metadata": {
    "projectId": "xxx",
    "environment": "staging"
  }
}

# 部署时指定不同的 secretRefs
# Production
POST /deploy { "secretRefs": ["my-app-prod"] }

# Staging
POST /deploy { "secretRefs": ["my-app-staging"] }
```

---

## ⚙️ 配置参数

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `INFISICAL_SYNC_INTERVAL_MINUTES` | 5 | 自动同步间隔（分钟），设为 0 禁用 |

### 缓存 TTL

默认 5 分钟，可在代码中自定义：

```typescript
// backend/src/services/infisicalService.ts
const DEFAULT_TTL = 5 * 60 * 1000; // 5分钟

// 调用时自定义 TTL
await fetchInfisicalSecrets(config, { ttl: 10 * 60 * 1000 }); // 10分钟
```

---

## 📝 最佳实践

### 1. 密钥命名规范

```bash
# 推荐格式: {app-name}-{env}-secrets
my-app-prod-secrets
my-app-staging-secrets
api-service-prod-secrets
```

### 2. 环境隔离

```bash
# 为每个环境使用独立的 Infisical 项目或 Environment
Production  → environment: "production"
Staging     → environment: "staging"
Development → environment: "dev"
```

### 3. 密钥更新策略

```bash
# 选项 A: 等待自动同步（5分钟）
- 修改 Infisical 密钥
- 等待 5-10 分钟
- 重新部署应用

# 选项 B: 立即生效（推荐）
- 修改 Infisical 密钥
- 清除缓存: POST /api/secrets/cache/clear
- 立即部署应用
```

### 4. 监控和告警

```bash
# 日志关键字
[Infisical] Using cached secrets     # 使用缓存
[Infisical] Fetching fresh secrets   # 获取新密钥
[Infisical] Failed to fetch secrets  # 获取失败
[Infisical] Using stale cache        # 使用过期缓存（降级）
```

---

## 🔍 故障排除

### 问题 1: 密钥未更新

**症状**: 在 Infisical 中修改密钥后，容器仍使用旧密钥

**解决方案**:
```bash
# 1. 清除缓存
curl -X POST http://localhost:9000/api/secrets/cache/clear

# 2. 重新部署
curl -X POST http://localhost:9000/deploy ...
```

### 问题 2: Infisical API 调用失败

**症状**: 日志显示 "Failed to fetch secrets"

**检查清单**:
- ✅ Client ID / Client Secret 是否正确
- ✅ Project ID 是否正确
- ✅ Environment 名称是否匹配
- ✅ Secret Path 是否存在
- ✅ 网络连接是否正常

**临时解决方案**: 系统会使用过期缓存（如果有）

### 问题 3: 部署失败 - 密钥未找到

**症状**: "Secret xxx not found"

**解决方案**:
```bash
# 检查密钥是否已配置
curl http://localhost:9000/api/secrets \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 如果缺失，添加密钥配置
curl -X POST http://localhost:9000/api/secrets ...
```

---

## 🚀 高级用法

### 自定义缓存 TTL

```typescript
// 修改默认 TTL
const secrets = await fetchInfisicalSecrets(config, {
  ttl: 10 * 60 * 1000  // 10分钟缓存
});
```

### 强制刷新

```typescript
// 忽略缓存，强制从 Infisical 获取
const secrets = await fetchInfisicalSecrets(config, {
  forceRefresh: true
});
```

### 混合密钥源

```json
{
  "name": "my-app",
  "secretRefs": ["infisical-secrets", "local-secrets"],
  "env": {
    "OVERRIDE_VAR": "value"
  }
}
```

**优先级**: `secretRefs` → `env` → 本地环境变量

---

## 📚 API 参考

### POST /api/secrets/{name}/sync

手动同步单个密钥

**请求**:
```bash
POST /api/secrets/my-app-secrets/sync
Authorization: Bearer YOUR_JWT_TOKEN
```

**响应**:
```json
{
  "success": true,
  "message": "Secret my-app-secrets synced successfully"
}
```

### POST /api/secrets/cache/clear

清除所有密钥缓存

**请求**:
```bash
POST /api/secrets/cache/clear
Authorization: Bearer YOUR_JWT_TOKEN
```

**响应**:
```json
{
  "success": true,
  "message": "All secrets cache cleared"
}
```

---

## 💡 FAQ

### Q: 缓存多久过期？
**A**: 默认 5 分钟，可通过环境变量 `INFISICAL_SYNC_INTERVAL_MINUTES` 调整

### Q: 如何立即使用最新密钥？
**A**: 调用 `POST /api/secrets/cache/clear` 清除缓存，然后重新部署

### Q: 支持哪些 Infisical 功能？
**A**: 支持所有标准密钥，支持多环境、多路径

### Q: 性能影响如何？
**A**: 缓存命中时几乎无性能影响；首次获取或缓存过期时需调用 Infisical API（~100-500ms）

### Q: 如何监控同步状态？
**A**: 查看服务器日志，搜索 `[Infisical]` 关键字

---

## 🎯 总结

Infisical 自动同步功能提供了：

- ✅ **实时性** - 每次部署获取最新密钥
- ✅ **高性能** - 5分钟缓存机制
- ✅ **高可用** - 降级策略保证服务稳定
- ✅ **灵活性** - 支持手动刷新和自动同步
- ✅ **易用性** - UI 和 API 双重支持

**推荐配置**:
- 启用自动同步（默认）
- 密钥更新后手动清除缓存
- 监控日志确保同步正常

---

**文档版本**: v1.0  
**更新时间**: 2025-10-21  
**适用版本**: Deploy Webhook v1.0.0+

