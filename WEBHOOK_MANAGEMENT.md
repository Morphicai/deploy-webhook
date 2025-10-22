# Webhook 管理功能

## 概述

本系统新增了 Webhook 管理功能，允许您通过 Web UI 配置和管理多个 webhook。每个 webhook 对应一个类型，目前支持 Infisical 类型的 webhook。

## 功能特性

### ✨ 主要功能

- **多 Webhook 支持**：可以创建和管理多个不同的 webhook
- **类型化管理**：每个 webhook 都有明确的类型（目前支持 Infisical）
- **安全密钥管理**：每个 webhook 都有独立的安全密钥用于签名验证
- **状态管理**：可以启用/禁用 webhook
- **使用统计**：追踪 webhook 触发次数和最后触发时间
- **UI 管理界面**：友好的 Web 界面进行 webhook 配置

### 🔧 技术实现

#### 后端

1. **数据库表**：`webhooks`
   - `id`: 主键
   - `name`: Webhook 名称
   - `type`: Webhook 类型（infisical）
   - `secret`: 安全密钥
   - `enabled`: 是否启用
   - `description`: 描述信息
   - `last_triggered_at`: 最后触发时间
   - `trigger_count`: 触发次数
   - `created_at`: 创建时间
   - `updated_at`: 更新时间

2. **服务层**：`webhookStore.ts`
   - 提供 webhook 的 CRUD 操作
   - 自动生成安全密钥
   - 记录触发统计

3. **API 路由**：`/api/webhooks`
   - `GET /api/webhooks` - 获取所有 webhook
   - `GET /api/webhooks/:id` - 获取单个 webhook
   - `POST /api/webhooks` - 创建新 webhook
   - `PUT /api/webhooks/:id` - 更新 webhook
   - `DELETE /api/webhooks/:id` - 删除 webhook

4. **Webhook 接收端点**：
   - `POST /api/webhooks/infisical` - Infisical webhook 接收端点
   - 自动从数据库读取配置
   - 向后兼容环境变量配置

#### 前端

1. **页面**：`/webhooks`
   - 展示所有已配置的 webhook
   - 创建新 webhook
   - 编辑和删除 webhook
   - 复制 webhook URL 和密钥
   - 查看使用统计

2. **导航**：
   - 在侧边栏添加了 "Webhooks" 导航项
   - 支持中英文

## 使用指南

### 1. 创建 Infisical Webhook

1. 登录系统后，点击左侧导航栏的 "Webhooks"
2. 点击 "Create Webhook" 按钮
3. 填写以下信息：
   - **名称**：为 webhook 起一个有意义的名称（如 "Production Infisical Hook"）
   - **类型**：选择 "Infisical"
   - **描述**（可选）：添加描述信息
   - **密钥**（可选）：留空将自动生成安全密钥
4. 点击 "Create Webhook" 完成创建

### 2. 在 Infisical 中配置 Webhook

1. 复制系统生成的 Webhook URL（如 `https://your-domain.com/api/webhooks/infisical`）
2. 复制 Webhook 密钥
3. 打开 Infisical 项目设置
4. 进入 "Webhooks" 部分
5. 点击 "Add Webhook"
6. 粘贴 Webhook URL
7. 粘贴密钥
8. 选择事件：
   - `secret.created`
   - `secret.updated`
   - `secret.deleted`
9. 保存配置

### 3. 管理 Webhook

#### 查看 Webhook 信息
- 在 Webhooks 页面可以看到所有已配置的 webhook
- 每个 webhook 显示：
  - 名称和状态
  - Webhook URL
  - 密钥（可点击复制）
  - 触发次数
  - 最后触发时间
  - 创建时间

#### 启用/禁用 Webhook
- 点击电源按钮图标可以切换 webhook 的启用状态
- 禁用的 webhook 不会处理传入的请求

#### 删除 Webhook
- 点击删除按钮
- 确认删除操作
- 注意：删除操作不可撤销

## API 使用示例

### 创建 Webhook

```bash
curl -X POST http://localhost:9000/api/webhooks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Infisical",
    "type": "infisical",
    "description": "Webhook for production environment"
  }'
```

### 获取所有 Webhooks

```bash
curl -X GET http://localhost:9000/api/webhooks \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 更新 Webhook

```bash
curl -X PUT http://localhost:9000/api/webhooks/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": false,
    "description": "Updated description"
  }'
```

### 删除 Webhook

```bash
curl -X DELETE http://localhost:9000/api/webhooks/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 向后兼容

系统仍然支持通过环境变量配置 Infisical webhook：

```bash
INFISICAL_WEBHOOK_SECRET=your_secret_key
```

如果数据库中没有配置 Infisical webhook，系统会自动回退到使用环境变量配置。

## 安全建议

1. **保护密钥**：不要将 webhook 密钥提交到版本控制系统
2. **使用 HTTPS**：生产环境必须使用 HTTPS 来保护 webhook 通信
3. **定期轮换**：建议定期更换 webhook 密钥
4. **监控使用**：定期检查 webhook 触发统计，发现异常活动
5. **最小权限**：只授予必要的权限

## 未来扩展

当前版本只支持 Infisical 类型的 webhook，未来可以扩展支持：

- GitHub Webhooks
- GitLab Webhooks
- Docker Hub Webhooks
- 其他 CI/CD 平台的 webhooks

要添加新的 webhook 类型，只需要：

1. 在 `WebhookType` 中添加新类型
2. 在 webhook 路由中添加对应的处理逻辑
3. 在前端 `WEBHOOK_TYPES` 数组中添加新类型
4. 实现对应的签名验证和事件处理

## 故障排查

### Webhook 没有触发

1. 检查 webhook 是否已启用
2. 验证 webhook URL 是否正确
3. 确认 webhook 密钥配置正确
4. 查看服务器日志确认是否收到请求
5. 检查 Infisical 中的 webhook 配置

### 签名验证失败

1. 确认使用的密钥与系统中配置的一致
2. 检查 Infisical 中的密钥是否正确
3. 查看服务器日志获取详细错误信息

### 数据库错误

1. 确认数据库文件权限正确
2. 检查数据库表是否正确创建
3. 查看服务器启动日志

## 相关文档

- [Infisical Webhook Guide](./INFISICAL_WEBHOOK_GUIDE.md)
- [API Documentation](http://localhost:9000/api-docs)
- [User Guide](./USER_GUIDE.md)

