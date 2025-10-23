# Webhook 统一管理方案

## 📋 目标

将 `/webhook/deploy` 迁移到 `/webhooks/deploy`，统一管理所有 webhook，简化架构。

---

## 🎯 核心改进

### 当前架构（V2）

```
/webhooks/infisical      → 第三方服务 webhook
/webhook/deploy          → 应用部署 webhook
```

**问题：**
- ❌ 两套路由分开管理
- ❌ 应用的 webhook token 存储在 applications 表
- ❌ 缺少统一的 webhook 管理界面
- ❌ 认证机制不统一

### 统一架构（V3）

```
/webhooks/infisical      → 第三方服务 webhook
/webhooks/deploy/:appId  → 应用部署 webhook（统一管理）
```

**优势：**
- ✅ 统一路由管理
- ✅ 统一 webhook secret 存储
- ✅ 统一管理界面
- ✅ 统一认证机制
- ✅ 更好的审计和监控

---

## 🏗️ 数据模型设计

### 1. 扩展 Webhook 类型

```typescript
// 旧版本
export type WebhookType = 'infisical';

// 新版本
export type WebhookType = 
  | 'infisical'           // 第三方服务 - Infisical
  | 'deploy'              // 应用部署
  | 'github'              // 未来扩展 - GitHub
  | 'gitlab';             // 未来扩展 - GitLab
```

### 2. 扩展 Webhook 表结构

```sql
-- 当前表结构
CREATE TABLE webhooks (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  secret TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  description TEXT,
  last_triggered_at TEXT,
  trigger_count INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);

-- 新增字段
ALTER TABLE webhooks ADD COLUMN application_id INTEGER;
ALTER TABLE webhooks ADD COLUMN metadata TEXT;

-- 添加外键约束
-- FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
```

### 3. Webhook 记录接口

```typescript
export interface WebhookRecord {
  id: number;
  name: string;
  type: WebhookType;
  secret: string;                    // webhook secret
  enabled: boolean;
  description: string | null;
  applicationId: number | null;      // ⭐ 新增：关联的应用ID
  metadata: Record<string, any>;     // ⭐ 新增：额外的元数据
  lastTriggeredAt: string | null;
  triggerCount: number;
  createdAt: string;
  updatedAt: string;
}
```

---

## 🔄 迁移方案

### 方案 A: 直接迁移（推荐）

**优势：** 架构最清晰  
**适用：** 应用未上线

#### 步骤：

1. **扩展 webhooks 表**
   ```sql
   ALTER TABLE webhooks ADD COLUMN application_id INTEGER;
   ALTER TABLE webhooks ADD COLUMN metadata TEXT DEFAULT '{}';
   CREATE INDEX idx_webhooks_application_id ON webhooks(application_id);
   ```

2. **迁移数据**
   ```sql
   -- 将 applications 表的 webhook_token 迁移到 webhooks 表
   INSERT INTO webhooks (name, type, secret, enabled, application_id)
   SELECT 
     'deploy-' || name,
     'deploy',
     webhook_token,
     webhook_enabled,
     id
   FROM applications
   WHERE webhook_token IS NOT NULL;
   ```

3. **删除冗余字段**
   ```sql
   -- 从 applications 表移除 webhook 字段（可选）
   -- ALTER TABLE applications DROP COLUMN webhook_token;
   -- ALTER TABLE applications DROP COLUMN webhook_enabled;
   ```

### 方案 B: 保持兼容（暂时保留两套）

**优势：** 平滑过渡  
**适用：** 应用已上线

---

## 📡 API 设计

### 统一的 Webhook 端点

```typescript
// 第三方服务 webhook
POST /webhooks/infisical
Header: X-Infisical-Signature

// 应用部署 webhook
POST /webhooks/deploy/:applicationId
Header: X-Webhook-Secret

// 或者使用查询参数
POST /webhooks/deploy?app=123&secret=xxx
```

### Webhook 管理 API

```typescript
// 列出所有 webhook
GET /api/webhooks?type=deploy&applicationId=1

// 创建 webhook
POST /api/webhooks
{
  "type": "deploy",
  "applicationId": 1,
  "description": "Production deployment webhook"
}

// 获取 webhook 详情
GET /api/webhooks/:id

// 更新 webhook
PUT /api/webhooks/:id
{
  "enabled": false,
  "description": "Updated description"
}

// 重新生成 secret
POST /api/webhooks/:id/regenerate-secret

// 删除 webhook
DELETE /api/webhooks/:id

// 查看 webhook 触发历史
GET /api/webhooks/:id/triggers
```

---

## 🔐 认证机制统一

### 选项 1: Header 认证（推荐）

```typescript
// 所有 webhook 使用统一的 Header
POST /webhooks/:type/:id?
Headers:
  X-Webhook-Secret: <secret>
```

**优势：**
- 标准做法
- 不暴露在 URL 中
- 易于实现

### 选项 2: HMAC 签名

```typescript
// 高级安全选项
POST /webhooks/:type/:id?
Headers:
  X-Webhook-Signature: <hmac-sha256>
Body:
  { ... }
  
// 服务端验证
const expectedSig = crypto
  .createHmac('sha256', webhook.secret)
  .update(JSON.stringify(body))
  .digest('hex');
```

**优势：**
- 更安全（防篡改）
- 适合第三方集成

---

## 🎨 代码结构

### 文件组织

```
backend/src/
├── routes/
│   ├── webhooks.ts              ✅ 统一的 webhook 路由
│   │   ├── POST /webhooks/infisical
│   │   ├── POST /webhooks/deploy/:appId
│   │   └── POST /webhooks/:type/:id
│   └── webhookManagement.ts     ⭐ 新增：webhook 管理 API
│       ├── GET /api/webhooks
│       ├── POST /api/webhooks
│       ├── PUT /api/webhooks/:id
│       └── DELETE /api/webhooks/:id
├── services/
│   ├── webhookStore.ts          ✅ 统一的 webhook 存储
│   └── webhookDispatcher.ts     ⭐ 新增：webhook 分发器
└── middleware/
    └── webhookAuth.ts            ⭐ 新增：统一的 webhook 认证
```

### webhookDispatcher.ts

```typescript
/**
 * Webhook 分发器
 * 根据 webhook 类型分发到不同的处理器
 */
export class WebhookDispatcher {
  private handlers: Map<WebhookType, WebhookHandler>;

  async dispatch(webhook: WebhookRecord, payload: any) {
    const handler = this.handlers.get(webhook.type);
    if (!handler) {
      throw new Error(`No handler for webhook type: ${webhook.type}`);
    }
    return handler.handle(webhook, payload);
  }
}

interface WebhookHandler {
  handle(webhook: WebhookRecord, payload: any): Promise<void>;
}

// 部署 webhook 处理器
class DeployWebhookHandler implements WebhookHandler {
  async handle(webhook: WebhookRecord, payload: any) {
    if (!webhook.applicationId) {
      throw new Error('Deploy webhook must have applicationId');
    }
    
    const app = await getApplicationById(webhook.applicationId);
    const deployService = new DeployService();
    
    await deployService.deploy({
      name: app.name,
      image: app.image,
      version: payload.version,
      // ... 其他配置
    });
  }
}
```

---

## 📊 对比总结

### 架构对比

| 特性 | V2（当前） | V3（统一） |
|-----|----------|----------|
| 路由数量 | 2 个 | 1 个 |
| Secret 存储 | 2 处 | 1 处 |
| 管理界面 | 分散 | 统一 |
| 扩展性 | 一般 | 优秀 |
| 维护成本 | 高 | 低 |

### 迁移成本

| 任务 | 工作量 | 风险 |
|-----|-------|-----|
| 数据库迁移 | 1 小时 | 低 |
| 代码重构 | 2-3 小时 | 中 |
| 测试更新 | 1-2 小时 | 低 |
| 文档更新 | 1 小时 | 低 |
| **总计** | **5-7 小时** | **低** |

---

## 🚀 实施计划

### 阶段 1: 数据库扩展（30分钟）

- [ ] 添加 `application_id` 字段
- [ ] 添加 `metadata` 字段
- [ ] 创建索引
- [ ] 迁移现有数据

### 阶段 2: Service 层重构（1小时）

- [ ] 扩展 `WebhookType`
- [ ] 更新 `webhookStore` 接口
- [ ] 创建 `WebhookDispatcher`
- [ ] 创建 webhook 处理器

### 阶段 3: Route 层统一（1小时）

- [ ] 合并路由到 `/webhooks`
- [ ] 创建 webhook 管理 API
- [ ] 统一认证中间件

### 阶段 4: 测试更新（1小时）

- [ ] 更新单元测试
- [ ] 更新集成测试
- [ ] 添加新的测试用例

### 阶段 5: 清理和文档（30分钟）

- [ ] 删除旧的 `/webhook/deploy` 路由
- [ ] 更新 API 文档
- [ ] 更新使用指南

---

## ✅ 验证清单

- [ ] 所有 webhook 类型都能正常工作
- [ ] Secret 验证正确
- [ ] 部署日志记录完整
- [ ] Webhook 触发计数更新
- [ ] 管理 API 功能完整
- [ ] 测试全部通过
- [ ] 文档已更新

---

## 📝 后续优化

1. **Webhook 重试机制**
   - 失败自动重试
   - 指数退避算法
   - 最大重试次数

2. **Webhook 日志**
   - 详细的请求/响应日志
   - 性能监控
   - 错误追踪

3. **Webhook 管理界面**
   - 可视化配置
   - 触发历史查看
   - Secret 管理

4. **Webhook 测试工具**
   - 测试发送功能
   - Payload 预览
   - 响应验证

---

**设计完成时间：** 2025-10-23  
**预计实施时间：** 5-7 小时  
**风险评估：** 🟢 低风险

