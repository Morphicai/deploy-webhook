# 秘钥提供者功能 (Secret Providers)

## 快速开始

### 1. 启动服务

```bash
cd backend
npm run build
npm start
```

服务将在 `http://localhost:9000` 启动。

### 2. 创建 Infisical 秘钥提供者

```bash
curl -X POST http://localhost:9000/api/secret-providers \
  -H "x-admin-token: your-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "production-infisical",
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
  }'
```

### 3. 手动同步秘钥

```bash
curl -X POST http://localhost:9000/api/secret-providers/1/sync \
  -H "x-admin-token: your-admin-token"
```

响应示例：
```json
{
  "success": true,
  "data": {
    "success": true,
    "providerId": 1,
    "providerName": "production-infisical",
    "secretsCount": 15,
    "syncedSecrets": [
      { "key": "DATABASE_URL", "synced": true },
      { "key": "API_KEY", "synced": true }
    ]
  }
}
```

### 4. 部署应用（自动同步）

如果秘钥提供者启用了 `autoSync: true`，在部署应用时会自动同步秘钥：

```bash
curl -X POST http://localhost:9000/deploy \
  -H "x-admin-token: your-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "image": "nginx",
    "version": "latest",
    "port": 8080,
    "containerPort": 80
  }'
```

部署日志会显示秘钥同步的结果。

## 功能特性

- ✅ **多提供者支持**：Infisical、AWS、Vault、Azure、GCP
- ✅ **自动同步**：部署前自动同步秘钥
- ✅ **手动同步**：通过 API 手动触发同步
- ✅ **批量同步**：同时同步多个提供者
- ✅ **同步历史**：完整的同步记录和错误追踪

## API 端点

### 提供者管理

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/secret-providers` | 列出所有提供者 |
| GET | `/api/secret-providers/:id` | 获取单个提供者 |
| POST | `/api/secret-providers` | 创建提供者 |
| PUT | `/api/secret-providers/:id` | 更新提供者 |
| DELETE | `/api/secret-providers/:id` | 删除提供者 |

### 秘钥同步

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/secret-providers/:id/sync` | 手动同步单个提供者 |
| POST | `/api/secret-providers/sync/all` | 同步所有自动同步提供者 |
| POST | `/api/secret-providers/sync/batch` | 批量同步多个提供者 |
| GET | `/api/secret-providers/:id/history` | 查看同步历史 |

## 数据库结构

### secret_providers 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| name | TEXT | 提供者名称（唯一） |
| type | TEXT | 提供者类型 |
| config | TEXT | JSON 配置 |
| enabled | INTEGER | 是否启用 |
| auto_sync | INTEGER | 是否自动同步 |
| last_sync_at | TEXT | 最后同步时间 |
| last_sync_status | TEXT | 最后同步状态 |
| last_sync_error | TEXT | 最后同步错误 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

### secret_syncs 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| provider_id | INTEGER | 提供者 ID（外键） |
| status | TEXT | 同步状态 |
| secrets_count | INTEGER | 同步的秘钥数量 |
| error_message | TEXT | 错误信息 |
| started_at | TEXT | 开始时间 |
| completed_at | TEXT | 完成时间 |

## 支持的提供者

### 1. Infisical ✅（已实现）

```json
{
  "type": "infisical",
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

```json
{
  "type": "aws-secrets-manager",
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

### 4. Azure Key Vault（待实现）

需要安装：`npm install @azure/keyvault-secrets @azure/identity`

### 5. GCP Secret Manager（待实现）

需要安装：`npm install @google-cloud/secret-manager`

## 工作流程

### 自动同步流程

```
部署请求 → 查找自动同步提供者 → 连接提供者 → 获取秘钥 
         → 写入环境变量 → 继续部署 → 启动容器
```

### 环境变量优先级

1. 全局环境变量（包括同步的秘钥）
2. 项目特定环境变量
3. 部署请求中的环境变量

后者覆盖前者。

## 安全建议

1. **保护管理员令牌**：所有 API 都需要管理员权限
2. **加密配置**：生产环境建议加密存储提供者配置
3. **最小权限**：为提供者配置只读权限
4. **定期轮换**：定期更新提供者的访问凭证
5. **审计日志**：定期查看同步历史

## 故障排查

### 同步失败

1. **检查配置**：确认提供者配置正确
2. **验证凭证**：测试提供者的访问凭证
3. **网络连接**：确保可以访问提供者的 API
4. **查看日志**：检查服务器日志中的错误信息
5. **同步历史**：查看 `/api/secret-providers/:id/history`

### 查看日志

```bash
# 查看同步日志
grep "SecretSync" logs/app.log

# 查看部署日志
grep "deploy-webhook" logs/app.log
```

## 开发调试

### 启动开发服务器

```bash
npm run dev
```

### 测试 Infisical 配置

```bash
# 创建测试提供者
curl -X POST http://localhost:9000/api/secret-providers \
  -H "x-admin-token: test-token" \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "name": "test-provider",
  "type": "infisical",
  "enabled": true,
  "autoSync": false,
  "config": {
    "clientId": "$INFISICAL_CLIENT_ID",
    "clientSecret": "$INFISICAL_CLIENT_SECRET",
    "projectId": "$INFISICAL_PROJECT_ID",
    "environment": "dev"
  }
}
EOF

# 手动同步测试
curl -X POST http://localhost:9000/api/secret-providers/1/sync \
  -H "x-admin-token: test-token"
```

## 文档

- [完整使用指南](../../SECRET_PROVIDER_GUIDE.md)
- [更新日志](./CHANGELOG_SECRET_PROVIDERS.md)
- [API 文档](http://localhost:9000/docs)

## 依赖项

### 已包含
- `@infisical/sdk` - Infisical 官方 SDK

### 可选（按需安装）
- `@aws-sdk/client-secrets-manager` - AWS Secrets Manager
- `node-vault` - HashiCorp Vault
- `@azure/keyvault-secrets` + `@azure/identity` - Azure Key Vault
- `@google-cloud/secret-manager` - GCP Secret Manager

