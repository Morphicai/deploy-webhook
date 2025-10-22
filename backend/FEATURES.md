# 功能特性 (Features)

## 核心功能

### 🚀 应用部署
- Docker 容器部署
- 多镜像仓库支持
- 自动生成应用名称
- 环境变量管理
- 端口映射配置

### 🔐 秘钥管理

#### 基础秘钥（已有）
- 手动配置秘钥
- 秘钥引用管理
- 多种秘钥提供者类型支持

#### 秘钥提供者（新增✨）
- **多提供者支持**
  - Infisical ✅（已完全实现）
  - AWS Secrets Manager（框架就绪）
  - HashiCorp Vault（框架就绪）
  - Azure Key Vault（框架就绪）
  - GCP Secret Manager（框架就绪）

- **同步模式**
  - 手动同步：通过 API 手动触发
  - 自动同步：部署前自动执行
  - 批量同步：同时同步多个提供者

- **管理功能**
  - 创建、读取、更新、删除提供者
  - 启用/禁用控制
  - 同步历史追踪
  - 错误日志记录

### 🌐 域名管理
- 域名配置
- Caddy 自动配置
- HTTPS 自动证书

### 📦 镜像仓库
- 多仓库支持
- Docker Hub、私有仓库
- 认证配置（用户名/密码、Token）
- 镜像白名单

### 🔑 访问控制
- 管理员认证
- API 密钥管理
- Webhook 签名验证

### 🤖 AI 集成
- AI 聊天助手
- 智能配置建议

### 📊 MCP 支持
- Model Context Protocol
- 工具扩展

## API 端点

### 秘钥提供者 API（新增✨）

```
GET    /api/secret-providers              # 列出所有提供者
GET    /api/secret-providers/:id          # 获取单个提供者
POST   /api/secret-providers              # 创建提供者
PUT    /api/secret-providers/:id          # 更新提供者
DELETE /api/secret-providers/:id          # 删除提供者
POST   /api/secret-providers/:id/sync     # 手动同步
POST   /api/secret-providers/sync/all     # 同步所有
POST   /api/secret-providers/sync/batch   # 批量同步
GET    /api/secret-providers/:id/history  # 同步历史
```

### 应用部署 API

```
POST   /deploy                    # 部署应用
GET    /api/applications          # 列出应用
GET    /api/applications/:id      # 获取应用详情
```

### 其他 API

```
GET    /api/secrets               # 秘钥管理
GET    /api/env                   # 环境变量
GET    /api/domains               # 域名管理
GET    /api/repositories          # 镜像仓库
GET    /api/api-keys              # API 密钥
GET    /api/caddy                 # Caddy 配置
GET    /health                    # 健康检查
GET    /docs                      # API 文档
```

## 数据库表结构

### 新增表（秘钥提供者）

#### secret_providers
存储秘钥提供者配置：
- 提供者名称和类型
- JSON 配置信息
- 启用状态
- 自动同步设置
- 同步状态和错误信息

#### secret_syncs
记录同步历史：
- 同步状态（成功/失败/进行中）
- 同步的秘钥数量
- 错误信息
- 时间戳

### 现有表

- `applications` - 应用配置
- `domains` - 域名配置
- `repositories` - 镜像仓库
- `secrets` - 基础秘钥
- `environment_variables` - 环境变量
- `api_keys` - API 密钥
- `users` - 用户信息
- `webhooks` - Webhook 配置
- `system_settings` - 系统设置

## 工作流程

### 自动同步秘钥流程

```
1. 用户发起部署请求
   ↓
2. 系统查找启用自动同步的提供者
   ↓
3. 依次连接每个提供者获取秘钥
   ↓
4. 将秘钥写入全局环境变量
   ↓
5. 合并所有环境变量
   ↓
6. 拉取镜像并创建容器
   ↓
7. 启动应用（使用最新秘钥）
```

### 环境变量优先级

```
全局环境变量（包括同步的秘钥）
       ↓ 覆盖
项目特定环境变量
       ↓ 覆盖
部署请求中的环境变量
```

## 使用场景

### 场景 1：开发环境
- 使用 Infisical 管理开发秘钥
- 启用自动同步
- 每次部署自动获取最新秘钥

### 场景 2：生产环境
- 使用 AWS Secrets Manager
- 严格的访问控制
- 审计所有同步操作

### 场景 3：多环境管理
- 不同环境使用不同提供者
- 选择性启用自动同步
- 分别管理秘钥和配置

## 技术栈

### 后端
- Node.js + TypeScript
- Express.js
- Better-SQLite3
- Dockerode
- Zod（数据验证）

### 秘钥管理
- Infisical SDK
- 可扩展的提供者架构

### API 文档
- Swagger/OpenAPI 3.0
- swagger-jsdoc
- swagger-ui-express

### 安全
- JWT 认证
- bcrypt 密码加密
- Webhook 签名验证

## 性能特性

- ✅ 异步秘钥同步
- ✅ 批量操作支持
- ✅ 连接池管理
- ✅ 错误重试机制
- ✅ 日志和监控

## 扩展性

### 添加新的秘钥提供者

1. 在 `secretProviderStore.ts` 中定义配置接口
2. 在 `secretSyncService.ts` 中实现同步函数
3. 更新类型定义和验证 schema
4. 添加到支持的提供者列表

### 自定义同步逻辑

- 支持自定义秘钥过滤
- 支持秘钥转换和映射
- 支持条件同步

## 监控和调试

### 日志
- 详细的同步日志
- 错误追踪和堆栈
- 性能指标

### 调试工具
- API 文档（/docs）
- 同步历史查询
- 状态监控端点

## 文档

- 📖 [秘钥提供者完整指南](../SECRET_PROVIDER_GUIDE.md)
- 📖 [快速开始指南](./README_SECRET_PROVIDERS.md)
- 📖 [更新日志](./CHANGELOG.md)
- 📖 [API 文档](http://localhost:9000/docs)

## 下一步计划

- [ ] UI 界面管理秘钥提供者
- [ ] 实现其他秘钥提供者（AWS、Vault 等）
- [ ] 秘钥加密存储
- [ ] 秘钥版本管理
- [ ] 选择性秘钥同步（标签/前缀）
- [ ] Webhook 通知
- [ ] 性能优化和缓存

