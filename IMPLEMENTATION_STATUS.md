# 数据模型 V2 实施状态

## ✅ 已完成

### 1. 数据库迁移 (100%)
- ✅ `/backend/src/migrations/003_data_model_v2.ts`
  - 创建 `secret_groups` 表
  - 重构 `secrets` 表（支持分组和加密存储）
  - 增强 `applications` 表（添加 webhook 字段）
  - 创建 `deployment_logs` 表
  - 增强 `environment_variables` 表（支持秘钥引用）
  - 自动迁移旧数据

### 2. 工具类 (100%)
- ✅ `/backend/src/utils/encryption.ts`
  - AES-256-GCM 加密/解密
  - 秘钥预览生成
  - 密文格式验证

### 3. 服务层 (100%)
- ✅ `/backend/src/services/secretGroupStore.ts` - 秘钥分组管理
- ✅ `/backend/src/services/secretStoreV2.ts` - 秘钥管理（支持加密）
- ✅ `/backend/src/services/envStoreV2.ts` - 环境变量管理（支持秘钥引用）
- ✅ `/backend/src/services/deploymentLogStore.ts` - 部署日志管理

### 4. 路由层 (50%)
- ✅ `/backend/src/routes/webhookDeploy.ts` - Webhook 部署 V2

## 🔨 待完成

### 5. 路由层补充 (需要创建)

#### A. 秘钥分组路由
创建文件：`/backend/src/routes/secretGroups.ts`

```typescript
import { Router } from 'express';
import { requireAdmin } from '../middleware/adminAuth';
import {
  listSecretGroups,
  getSecretGroupById,
  createSecretGroup,
  updateSecretGroup,
  deleteSecretGroup,
  getAllSecretGroupsStats,
} from '../services/secretGroupStore';

const router = Router();

// GET /api/secret-groups - 列出所有分组
router.get('/', requireAdmin, (req, res) => {
  const groups = getAllSecretGroupsStats();
  res.json({ success: true, data: groups });
});

// POST /api/secret-groups - 创建分组
router.post('/', requireAdmin, (req, res) => {
  const group = createSecretGroup(req.body);
  res.json({ success: true, data: group });
});

// PUT /api/secret-groups/:id - 更新分组
router.put('/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const group = updateSecretGroup(id, req.body);
  res.json({ success: true, data: group });
});

// DELETE /api/secret-groups/:id - 删除分组
router.delete('/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  deleteSecretGroup(id);
  res.json({ success: true });
});

export default router;
```

#### B. 重构秘钥路由
修改文件：`/backend/src/routes/secrets.ts`

使用新的 `secretStoreV2` 替换旧的 `database` 导入：

```typescript
// 旧的
import { listSecrets, createSecret, ... } from '../services/database';

// 改为新的
import { 
  listSecrets,
  getSecretById,
  getSecretValue,
  createSecret,
  updateSecret,
  deleteSecret,
  listSecretsByGroup,
} from '../services/secretStoreV2';
```

添加新的端点：
- `GET /api/secrets/:id/value` - 获取秘钥的解密值（需要二次确认）
- `GET /api/secrets/group/:groupId` - 列出指定分组的秘钥

#### C. 重构环境变量路由
修改文件：`/backend/src/routes/env.ts`

使用新的 `envStoreV2` 替换旧的 `envStore`：

```typescript
// 旧的
import { buildEnvironmentForProject } from '../services/envStore';

// 改为新的
import { 
  buildEnvironmentForProject,
  resolveEnvValue,
  importSecretGroupToProject,
} from '../services/envStoreV2';
```

添加新的端点：
- `POST /api/env/import-group` - 批量导入秘钥分组到项目

#### D. 增强应用路由
修改文件：`/backend/src/routes/applications.ts`

添加新的端点：
- `GET /api/applications/:id/webhook` - 获取 Webhook 配置
- `POST /api/applications/:id/webhook/regenerate` - 重新生成 Webhook Token
- `GET /api/applications/:id/deployments` - 获取部署历史
- `PUT /api/applications/:id/webhook` - 更新 Webhook 配置

### 6. 在 index.ts 中注册新路由

```typescript
import secretGroupsRouter from './routes/secretGroups';

app.use('/api/secret-groups', secretGroupsRouter);
```

### 7. 更新 deployService.ts

在 `deploy()` 方法中：
- 使用 `buildEnvironmentForProject()` 从新的 envStoreV2 读取环境变量
- 自动解析秘钥引用

```typescript
import { buildEnvironmentForProject } from './envStoreV2';

async deploy(params: DeployRequest): Promise<DeployResponse> {
  // ... 现有代码
  
  // 🆕 使用新的环境变量解析
  const envFromStore = await buildEnvironmentForProject(app.id);
  
  const mergedEnv: Record<string, string> = { ...envFromStore };
  
  if (params.env) {
    for (const [key, value] of Object.entries(params.env)) {
      mergedEnv[key] = String(value);
    }
  }
  
  // ... 继续部署
}
```

## 📝 环境变量配置

需要在 `.env` 文件中添加：

```bash
# 秘钥加密密钥（生产环境必须设置）
# 生成方法：node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SECRET_ENCRYPTION_KEY=your-64-character-hex-key-here
```

## 🧪 测试步骤

### 1. 启动应用
```bash
cd backend
npm run dev
```

### 2. 测试迁移
检查数据库是否正确创建新表：
```bash
sqlite3 data/deploy-webhook.db "PRAGMA table_info(secret_groups)"
sqlite3 data/deploy-webhook.db "PRAGMA table_info(deployment_logs)"
```

### 3. 测试秘钥加密
```typescript
// 在 Node REPL 中测试
const { encryptSecret, decryptSecret } = require('./dist/utils/encryption');

const plain = "my-secret-value";
const encrypted = encryptSecret(plain);
console.log('Encrypted:', encrypted);

const decrypted = decryptSecret(encrypted);
console.log('Decrypted:', decrypted);
console.log('Match:', plain === decrypted);
```

### 4. 测试 Webhook 部署

#### A. 在管理后台创建应用
```bash
POST /api/applications
{
  "name": "test-app",
  "image": "nginx",
  "version": "latest",
  "repositoryId": 1,
  "ports": [{"host": 8080, "container": 80}],
  "webhookEnabled": true
}
```

#### B. 获取 Webhook Token
```bash
GET /api/applications/1
# 响应中包含 webhookToken: "whk_xxx..."
```

#### C. 测试 Webhook 部署
```bash
POST /webhook/deploy
{
  "applicationId": 1,
  "version": "1.19",
  "token": "whk_xxx..."
}
```

#### D. 查看部署日志
```bash
GET /api/applications/1/deployments
```

## 🎯 下一步行动

### 立即需要 (高优先级)
1. ✅ 数据库迁移 - 已完成
2. ✅ 核心服务层 - 已完成
3. ✅ Webhook 部署路由 - 已完成
4. 🔨 补全路由层 (20分钟)
   - 秘钥分组路由
   - 重构秘钥路由
   - 增强应用路由
5. 🔨 更新 deployService (10分钟)
6. 🧪 集成测试 (30分钟)

### 后续优化 (中优先级)
1. UI 更新 - 秘钥管理界面
2. UI 更新 - Webhook 配置界面
3. UI 更新 - 部署历史查看
4. 文档更新 - API 文档
5. 文档更新 - 用户指南

### 可选增强 (低优先级)
1. 秘钥导入/导出功能
2. 部署通知（邮件/Slack）
3. 部署回滚功能
4. A/B 部署支持

## 📋 文件清单

### 新创建的文件
- ✅ `backend/src/migrations/003_data_model_v2.ts`
- ✅ `backend/src/utils/encryption.ts`
- ✅ `backend/src/services/secretGroupStore.ts`
- ✅ `backend/src/services/secretStoreV2.ts`
- ✅ `backend/src/services/envStoreV2.ts`
- ✅ `backend/src/services/deploymentLogStore.ts`
- ✅ `backend/src/routes/webhookDeploy.ts`
- 🔨 `backend/src/routes/secretGroups.ts` (待创建)
- ✅ `DATA_MODEL_V2_DESIGN.md`
- ✅ `DATA_MODEL_V2_WORKFLOW.md`
- ✅ `IMPLEMENTATION_STATUS.md` (本文件)

### 需要修改的文件
- ✅ `backend/src/services/database.ts` (添加迁移调用)
- ✅ `backend/src/index.ts` (注册 webhookDeploy 路由)
- 🔨 `backend/src/routes/secrets.ts` (使用新服务)
- 🔨 `backend/src/routes/env.ts` (使用新服务)
- 🔨 `backend/src/routes/applications.ts` (添加 webhook 端点)
- 🔨 `backend/src/services/deployService.ts` (使用新环境变量解析)

## 🚀 快速完成指南

如果你想快速完成剩余部分，按照这个顺序：

1. **创建秘钥分组路由** (5分钟)
   - 复制上面的代码到 `routes/secretGroups.ts`
   - 在 `index.ts` 注册路由

2. **重构秘钥路由** (5分钟)
   - 修改 `routes/secrets.ts` 使用 `secretStoreV2`
   - 添加新的端点

3. **增强应用路由** (10分钟)
   - 在 `routes/applications.ts` 添加 webhook 相关端点
   - 添加部署历史端点

4. **更新部署服务** (10分钟)
   - 修改 `deployService.ts` 使用新的环境变量解析

5. **测试** (20分钟)
   - 启动应用，检查日志
   - 测试 Webhook 部署流程
   - 测试秘钥管理

总计：约 50 分钟可完成所有剩余工作！

