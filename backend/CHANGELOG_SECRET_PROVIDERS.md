# 秘钥提供者功能更新日志

## 新增功能

### 秘钥提供者管理

实现了完整的秘钥提供者管理系统，支持从多个第三方秘钥管理服务自动同步秘钥。

#### 核心特性

1. **多提供者支持**
   - Infisical（已完全实现）
   - AWS Secrets Manager（待安装 SDK）
   - HashiCorp Vault（待安装 SDK）
   - Azure Key Vault（待安装 SDK）
   - GCP Secret Manager（待安装 SDK）

2. **同步模式**
   - 手动同步：通过 API 手动触发同步
   - 自动同步：在应用部署前自动同步秘钥
   - 批量同步：同时同步多个提供者

3. **完整的 CRUD 操作**
   - 创建、读取、更新、删除秘钥提供者
   - 启用/禁用提供者
   - 配置自动同步

4. **同步历史追踪**
   - 记录每次同步的状态
   - 跟踪同步的秘钥数量
   - 保存错误信息用于调试

## 文件变更

### 新增文件

1. **数据库迁移**
   - `src/migrations/002_add_secret_providers.ts` - 创建秘钥提供者相关表

2. **服务层**
   - `src/services/secretProviderStore.ts` - 秘钥提供者的数据库操作
   - `src/services/secretSyncService.ts` - 秘钥同步逻辑实现

3. **路由**
   - `src/routes/secretProviders.ts` - 秘钥提供者 REST API

4. **文档**
   - `SECRET_PROVIDER_GUIDE.md` - 完整的使用指南

### 修改文件

1. **src/index.ts**
   - 注册新的路由 `/api/secret-providers`

2. **src/services/database.ts**
   - 初始化秘钥提供者表

3. **src/services/deployService.ts**
   - 在部署前自动同步秘钥

4. **src/services/envStore.ts**
   - 添加环境变量的增删改查辅助函数

5. **src/types/index.ts**
   - 添加秘钥提供者相关类型定义

6. **src/swagger.ts**
   - 添加 API 文档 schema 定义

## API 端点

### 秘钥提供者管理

```
GET    /api/secret-providers           # 列出所有提供者
GET    /api/secret-providers/:id       # 获取单个提供者
POST   /api/secret-providers           # 创建提供者
PUT    /api/secret-providers/:id       # 更新提供者
DELETE /api/secret-providers/:id       # 删除提供者
```

### 秘钥同步

```
POST   /api/secret-providers/:id/sync  # 手动同步单个提供者
POST   /api/secret-providers/sync/all  # 同步所有自动同步提供者
POST   /api/secret-providers/sync/batch # 批量同步多个提供者
```

### 历史记录

```
GET    /api/secret-providers/:id/history # 获取同步历史
```

## 数据库结构

### secret_providers 表

存储秘钥提供者的配置信息：

- `id` - 主键
- `name` - 提供者名称（唯一）
- `type` - 提供者类型
- `config` - JSON 配置
- `enabled` - 是否启用
- `auto_sync` - 是否自动同步
- `last_sync_at` - 最后同步时间
- `last_sync_status` - 最后同步状态
- `last_sync_error` - 最后同步错误
- `created_at` / `updated_at` - 时间戳

### secret_syncs 表

存储同步历史记录：

- `id` - 主键
- `provider_id` - 关联的提供者 ID
- `status` - 同步状态（success/failed/in_progress）
- `secrets_count` - 同步的秘钥数量
- `error_message` - 错误信息
- `started_at` - 开始时间
- `completed_at` - 完成时间

## 使用示例

### 1. 创建 Infisical 提供者

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
      "secretPath": "/"
    }
  }'
```

### 2. 手动同步秘钥

```bash
curl -X POST http://localhost:9000/api/secret-providers/1/sync \
  -H "x-admin-token: your-admin-token"
```

### 3. 查看同步历史

```bash
curl http://localhost:9000/api/secret-providers/1/history \
  -H "x-admin-token: your-admin-token"
```

## 集成说明

### 自动同步流程

当 `autoSync: true` 时，秘钥会在应用部署前自动同步：

1. 用户调用 `/deploy` 端点
2. 系统查找所有启用自动同步的提供者
3. 依次同步每个提供者的秘钥
4. 将秘钥写入全局环境变量
5. 继续执行部署流程

### 环境变量优先级

部署时的环境变量按以下优先级合并（后者覆盖前者）：

1. 全局环境变量（包括同步的秘钥）
2. 项目特定环境变量
3. 部署请求中的环境变量

## 安全性

1. **管理员权限**：所有秘钥提供者 API 都需要管理员权限
2. **配置加密**：建议在生产环境加密存储提供者配置
3. **最小权限**：为提供者配置只读权限
4. **审计日志**：完整的同步历史记录

## 依赖项

### 已包含

- `@infisical/sdk` - Infisical 官方 SDK

### 待安装（可选）

- `@aws-sdk/client-secrets-manager` - AWS Secrets Manager
- `node-vault` - HashiCorp Vault
- `@azure/keyvault-secrets` + `@azure/identity` - Azure Key Vault
- `@google-cloud/secret-manager` - GCP Secret Manager

## 迁移步骤

### 从旧系统迁移

1. 保持原有 `/api/secrets` 端点正常运行
2. 创建新的秘钥提供者配置
3. 先禁用 `autoSync`，手动测试同步
4. 验证无误后启用 `autoSync`
5. 可选：清理旧的手动配置秘钥

### 数据库迁移

数据库迁移会在应用启动时自动执行，创建 `secret_providers` 和 `secret_syncs` 表。

## 后续计划

1. 实现其他秘钥提供者（AWS、Vault、Azure、GCP）
2. 添加秘钥加密存储
3. 实现秘钥版本管理
4. 添加 UI 界面管理秘钥提供者
5. 支持秘钥的选择性同步（通过标签或前缀）

## 技术细节

### 类型安全

- 使用 Zod 进行运行时验证
- TypeScript 类型定义完整
- 不同提供者有专门的配置接口

### 错误处理

- 同步失败不会阻止部署
- 详细的错误日志和历史记录
- 提供者级别的启用/禁用控制

### 性能

- 同步操作异步执行
- 支持批量同步
- 合理的超时和重试机制

## 相关文档

- [SECRET_PROVIDER_GUIDE.md](../SECRET_PROVIDER_GUIDE.md) - 详细使用指南
- [API_KEY_GUIDE.md](../API_KEY_GUIDE.md) - API 密钥管理
- [INFISICAL_SYNC_GUIDE.md](../INFISICAL_SYNC_GUIDE.md) - Infisical 集成指南

