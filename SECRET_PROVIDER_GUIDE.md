# 秘钥提供者指南 (Secret Provider Guide)

## 概述

秘钥提供者功能允许您从多个秘钥管理服务（如 Infisical、AWS Secrets Manager、HashiCorp Vault 等）自动同步秘钥到您的部署环境中。

## 功能特性

- ✅ 支持多个秘钥提供者
- ✅ 支持手动同步秘钥
- ✅ 应用部署前自动同步秘钥
- ✅ 同步历史记录跟踪
- ✅ 灵活的启用/禁用控制

## 支持的秘钥提供者

### 1. Infisical（已实现）

Infisical 是一个开源的秘钥管理平台。

**配置示例：**
```json
{
  "name": "my-infisical-provider",
  "type": "infisical",
  "enabled": true,
  "autoSync": true,
  "config": {
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret",
    "projectId": "your-project-id",
    "environment": "production",
    "secretPath": "/",
    "siteUrl": "https://app.infisical.com"
  }
}
```

### 2. AWS Secrets Manager（待实现）

需要安装：`npm install @aws-sdk/client-secrets-manager`

**配置示例：**
```json
{
  "name": "my-aws-provider",
  "type": "aws-secrets-manager",
  "enabled": true,
  "autoSync": false,
  "config": {
    "region": "us-east-1",
    "accessKeyId": "your-access-key",
    "secretAccessKey": "your-secret-key",
    "prefix": "myapp/"
  }
}
```

### 3. HashiCorp Vault（待实现）

需要安装：`npm install node-vault`

**配置示例：**
```json
{
  "name": "my-vault-provider",
  "type": "hashicorp-vault",
  "enabled": true,
  "autoSync": true,
  "config": {
    "address": "https://vault.example.com",
    "token": "your-vault-token",
    "namespace": "admin",
    "path": "secret/myapp",
    "mountPath": "secret"
  }
}
```

### 4. Azure Key Vault（待实现）

需要安装：`npm install @azure/keyvault-secrets @azure/identity`

**配置示例：**
```json
{
  "name": "my-azure-provider",
  "type": "azure-keyvault",
  "enabled": true,
  "autoSync": false,
  "config": {
    "vaultUrl": "https://your-vault.vault.azure.net",
    "tenantId": "your-tenant-id",
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret"
  }
}
```

### 5. GCP Secret Manager（待实现）

需要安装：`npm install @google-cloud/secret-manager`

**配置示例：**
```json
{
  "name": "my-gcp-provider",
  "type": "gcp-secret-manager",
  "enabled": true,
  "autoSync": true,
  "config": {
    "projectId": "your-project-id",
    "credentials": "{\"type\":\"service_account\",...}",
    "prefix": "myapp-"
  }
}
```

## API 端点

### 列出所有秘钥提供者

```bash
GET /api/secret-providers
```

**查询参数：**
- `enabled=true` - 只返回已启用的提供者
- `autoSync=true` - 只返回自动同步的提供者

### 获取单个秘钥提供者

```bash
GET /api/secret-providers/:id
```

### 创建秘钥提供者

```bash
POST /api/secret-providers
Content-Type: application/json
x-admin-token: your-admin-token

{
  "name": "my-provider",
  "type": "infisical",
  "enabled": true,
  "autoSync": true,
  "config": {
    "clientId": "...",
    "clientSecret": "...",
    "projectId": "...",
    "environment": "production"
  }
}
```

### 更新秘钥提供者

```bash
PUT /api/secret-providers/:id
Content-Type: application/json
x-admin-token: your-admin-token

{
  "enabled": false,
  "autoSync": false
}
```

### 删除秘钥提供者

```bash
DELETE /api/secret-providers/:id
x-admin-token: your-admin-token
```

### 手动同步单个提供者

```bash
POST /api/secret-providers/:id/sync
x-admin-token: your-admin-token
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "success": true,
    "providerId": 1,
    "providerName": "my-infisical-provider",
    "secretsCount": 15,
    "syncedSecrets": [
      { "key": "DATABASE_URL", "synced": true },
      { "key": "API_KEY", "synced": true }
    ]
  }
}
```

### 同步所有自动同步提供者

```bash
POST /api/secret-providers/sync/all
x-admin-token: your-admin-token
```

### 批量同步多个提供者

```bash
POST /api/secret-providers/sync/batch
Content-Type: application/json
x-admin-token: your-admin-token

{
  "providerIds": [1, 2, 3]
}
```

### 获取同步历史

```bash
GET /api/secret-providers/:id/history?limit=20
x-admin-token: your-admin-token
```

## 使用场景

### 场景 1：手动同步

1. 创建秘钥提供者（`autoSync: false`）
2. 在需要时手动调用同步 API
3. 查看同步历史确认结果

### 场景 2：自动同步（推荐）

1. 创建秘钥提供者（`autoSync: true`）
2. 秘钥会在每次应用部署前自动同步
3. 无需手动干预，确保使用最新的秘钥

### 场景 3：多环境管理

```bash
# 生产环境
POST /api/secret-providers
{
  "name": "production-secrets",
  "type": "infisical",
  "autoSync": true,
  "config": {
    "environment": "production",
    ...
  }
}

# 测试环境
POST /api/secret-providers
{
  "name": "staging-secrets",
  "type": "infisical",
  "autoSync": false,
  "config": {
    "environment": "staging",
    ...
  }
}
```

## 工作原理

### 同步流程

1. **触发同步**：手动触发或部署前自动触发
2. **连接提供者**：使用配置的凭证连接到秘钥提供者
3. **获取秘钥**：从提供者拉取所有秘钥
4. **写入环境变量**：将秘钥存储为全局环境变量
5. **记录结果**：记录同步状态和历史

### 自动同步时机

当 `autoSync` 设置为 `true` 时，秘钥会在以下时机自动同步：

- 应用部署前（在 `/deploy` 端点）
- 创建秘钥提供者时（立即执行一次）

### 环境变量合并

同步的秘钥会作为全局环境变量存储，部署时：

1. 首先加载全局环境变量（包括同步的秘钥）
2. 然后加载项目特定的环境变量
3. 最后加载部署请求中的环境变量
4. 后者覆盖前者

## 安全建议

1. **保护管理员令牌**：API 需要管理员权限，确保令牌安全
2. **加密配置**：秘钥提供者的配置（如 token、密钥）应当使用安全的方式存储
3. **最小权限原则**：为秘钥提供者配置只读权限
4. **定期轮换**：定期更新秘钥提供者的访问凭证
5. **审计日志**：查看同步历史，追踪秘钥访问

## 故障排查

### 同步失败

1. **检查配置**：确认提供者配置正确
2. **验证凭证**：测试提供者的访问凭证
3. **网络连接**：确保可以访问提供者的 API
4. **查看日志**：检查服务器日志中的错误信息
5. **同步历史**：查看 `/api/secret-providers/:id/history` 获取详细错误

### 秘钥未生效

1. **确认同步成功**：检查同步状态
2. **重新部署**：部署应用以应用新的秘钥
3. **检查变量名**：确认秘钥的键名正确

## 开发指南

### 添加新的秘钥提供者

1. 在 `secretProviderStore.ts` 中添加配置接口
2. 在 `secretSyncService.ts` 中实现同步函数
3. 更新类型定义和验证 schema
4. 添加到支持的提供者列表

### 测试

```bash
# 创建测试提供者
curl -X POST http://localhost:9000/api/secret-providers \
  -H "x-admin-token: your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-provider",
    "type": "infisical",
    "enabled": true,
    "autoSync": false,
    "config": {...}
  }'

# 手动同步
curl -X POST http://localhost:9000/api/secret-providers/1/sync \
  -H "x-admin-token: your-token"
```

## 数据库结构

### secret_providers 表

```sql
CREATE TABLE secret_providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  config TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  auto_sync INTEGER NOT NULL DEFAULT 0,
  last_sync_at TEXT,
  last_sync_status TEXT,
  last_sync_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### secret_syncs 表

```sql
CREATE TABLE secret_syncs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  secrets_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (provider_id) REFERENCES secret_providers(id)
);
```

## 迁移指南

从旧的秘钥系统迁移：

1. **保留现有秘钥**：原有的 `/api/secrets` 端点仍然可用
2. **创建提供者**：配置新的秘钥提供者
3. **测试同步**：先禁用 `autoSync`，手动测试同步
4. **启用自动同步**：验证无误后启用 `autoSync`
5. **清理旧秘钥**：可选，删除旧的手动配置的秘钥

## 参考资源

- [Infisical SDK 文档](https://infisical.com/docs/sdks/overview)
- [AWS Secrets Manager 文档](https://docs.aws.amazon.com/secretsmanager/)
- [HashiCorp Vault 文档](https://www.vaultproject.io/docs)
- [Azure Key Vault 文档](https://learn.microsoft.com/en-us/azure/key-vault/)
- [GCP Secret Manager 文档](https://cloud.google.com/secret-manager/docs)

