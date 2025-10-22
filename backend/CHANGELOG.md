# 更新日志

## [Unreleased] - 2024

### ✨ 新增功能

#### 秘钥提供者管理系统

添加了完整的秘钥提供者管理功能，支持从多个第三方秘钥管理服务自动同步秘钥到部署环境。

**核心特性：**
- ✅ 多提供者支持（Infisical、AWS、Vault、Azure、GCP）
- ✅ 自动同步：在应用部署前自动同步秘钥
- ✅ 手动同步：通过 API 手动触发同步
- ✅ 批量同步：同时同步多个提供者
- ✅ 同步历史：完整的同步记录和错误追踪
- ✅ 启用/禁用控制：灵活的提供者管理

**新增 API 端点：**
```
GET    /api/secret-providers           # 列出所有提供者
GET    /api/secret-providers/:id       # 获取单个提供者
POST   /api/secret-providers           # 创建提供者
PUT    /api/secret-providers/:id       # 更新提供者
DELETE /api/secret-providers/:id       # 删除提供者
POST   /api/secret-providers/:id/sync  # 手动同步
POST   /api/secret-providers/sync/all  # 同步所有自动同步提供者
POST   /api/secret-providers/sync/batch # 批量同步
GET    /api/secret-providers/:id/history # 查看同步历史
```

**新增数据表：**
- `secret_providers` - 存储秘钥提供者配置
- `secret_syncs` - 记录同步历史

**集成说明：**
- 在 `deployService` 中集成自动同步
- 部署前自动同步所有启用的提供者
- 同步的秘钥作为全局环境变量存储

**技术细节：**
- 使用 Zod 进行运行时验证
- 完整的 TypeScript 类型定义
- Swagger API 文档集成
- 错误处理和日志记录

### 🔧 优化改进

#### 数据库初始化
- 将秘钥提供者表直接集成到主数据库初始化脚本
- 简化了数据库迁移流程

#### Infisical SDK 兼容性
- 修复了 Infisical SDK 的导入问题
- 使用 `import * as InfisicalSDK` 确保兼容性

#### 环境变量管理
- 优化了环境变量的 upsert 操作
- 统一使用 `upsertEnvEntry` 简化代码

### 📚 文档更新

新增文档：
- `SECRET_PROVIDER_GUIDE.md` - 完整使用指南
- `backend/README_SECRET_PROVIDERS.md` - 快速开始指南
- `backend/CHANGELOG_SECRET_PROVIDERS.md` - 功能更新详情

### 🗂️ 文件变更

**新增文件：**
- `backend/src/services/secretProviderStore.ts` - 提供者数据管理
- `backend/src/services/secretSyncService.ts` - 秘钥同步逻辑
- `backend/src/routes/secretProviders.ts` - REST API 路由

**修改文件：**
- `backend/src/services/database.ts` - 添加秘钥提供者表定义
- `backend/src/services/deployService.ts` - 集成自动同步
- `backend/src/services/envStore.ts` - 简化环境变量操作
- `backend/src/index.ts` - 注册新路由
- `backend/src/types/index.ts` - 添加类型定义
- `backend/src/swagger.ts` - 添加 API 文档

### 🎯 使用示例

#### 创建 Infisical 提供者

```bash
curl -X POST http://localhost:9000/api/secret-providers \
  -H "x-admin-token: your-token" \
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
      "environment": "production"
    }
  }'
```

#### 手动同步秘钥

```bash
curl -X POST http://localhost:9000/api/secret-providers/1/sync \
  -H "x-admin-token: your-token"
```

#### 查看同步历史

```bash
curl http://localhost:9000/api/secret-providers/1/history \
  -H "x-admin-token: your-token"
```

### 🔐 安全说明

- 所有秘钥提供者 API 都需要管理员权限
- 建议在生产环境加密存储提供者配置
- 为提供者配置只读权限
- 定期轮换访问凭证
- 查看同步历史进行审计

### 📦 依赖项

**已包含：**
- `@infisical/sdk@^4.0.6` - Infisical 官方 SDK

**可选（按需安装）：**
- `@aws-sdk/client-secrets-manager` - AWS Secrets Manager
- `node-vault` - HashiCorp Vault
- `@azure/keyvault-secrets` + `@azure/identity` - Azure Key Vault
- `@google-cloud/secret-manager` - GCP Secret Manager

### 🚀 下一步计划

- [ ] 实现 AWS Secrets Manager 同步
- [ ] 实现 HashiCorp Vault 同步
- [ ] 实现 Azure Key Vault 同步
- [ ] 实现 GCP Secret Manager 同步
- [ ] 添加秘钥加密存储
- [ ] UI 界面管理秘钥提供者
- [ ] 支持秘钥的选择性同步（标签/前缀）

---

## 历史版本

### [1.0.0] - 之前

初始版本，包含基础的部署功能。

