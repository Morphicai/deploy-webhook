# UI API 修复快速参考

## 🚨 必须立即修复的问题

| # | 问题 | 文件 | 影响 | 修复难度 |
|---|------|------|------|---------|
| 1 | 环境变量删除使用错误的 API | `api.ts:195` | 🔴 无法删除 | 简单 |
| 2 | 缺少环境变量更新方法 | `api.ts` | 🔴 无法编辑 | 简单 |
| 3 | `projectName` 字段已弃用 | `Environment.tsx:31` | 🔴 数据不匹配 | 简单 |
| 4 | Secret 数据结构完全错误 | `Secrets.tsx:20` | 🔴 功能不可用 | 困难 |
| 5 | 缺少秘钥分组 API | `api.ts` | 🔴 V2 功能缺失 | 中等 |
| 6 | 缺少 SecretProvider API | `api.ts` | 🔴 Infisical 不可用 | 中等 |
| 7 | 缺少部署日志 API | `api.ts` | 🔴 无法查看历史 | 简单 |
| 8 | 缺少 Webhook V2 字段 | `Applications.tsx:24` | 🔴 V2 功能不可用 | 简单 |
| 9 | 缺少 Webhook V2 部署端点 | `api.ts` | 🔴 新部署方式不可用 | 简单 |

---

## 📋 快速修复代码片段

### 1. 修复环境变量 API

```typescript
// ✅ ui/src/services/api.ts

// 修复删除方法（使用 ID）
async deleteEnvVariable(id: number) {
  const { data } = await this.client.delete(`/api/env/${id}`);
  return data;
}

// 新增更新方法
async updateEnvVariable(id: number, payload: {
  value?: string;
  valueType?: 'plain' | 'secret_ref';
  secretId?: number | null;
  description?: string;
}) {
  const { data } = await this.client.put(`/api/env/${id}`, payload);
  return data;
}

// 删除这个方法（不存在）
// ❌ async getProjectEnv(projectIdentifier: string | number)
```

```typescript
// ✅ ui/src/pages/Environment.tsx

// 修复接口定义
interface EnvVariable {
  id: number;  // ✅ 新增
  scope: 'global' | 'project';
  key: string;
  value: string;
  valueType?: 'plain' | 'secret_ref';  // ✅ V2
  secretId?: number | null;  // ✅ V2
  projectId?: number | null;
  // ❌ 删除: projectName?: string;
  description?: string;  // ✅ V2
  createdAt?: string;
  updatedAt?: string;
}

// 修复删除调用
const handleDelete = async (variable: EnvVariable) => {
  await api.deleteEnvVariable(variable.id);  // ✅ 使用 ID
};
```

---

### 2. 添加秘钥相关 API

```typescript
// ✅ ui/src/services/api.ts

// Secret Groups (秘钥分组)
async getSecretGroups() {
  const { data } = await this.client.get('/api/secret-groups');
  return data;
}

async createSecretGroup(payload: {
  name: string;
  description?: string;
  providerId?: number;
}) {
  const { data } = await this.client.post('/api/secret-groups', payload);
  return data;
}

async deleteSecretGroup(id: number) {
  const { data } = await this.client.delete(`/api/secret-groups/${id}`);
  return data;
}

// Secrets (V2) - 修复
async getSecrets(groupId?: number) {
  const params = groupId ? `?groupId=${groupId}` : '';
  const { data } = await this.client.get(`/api/secrets${params}`);
  return data;
}

async createSecret(payload: {
  groupId: number;  // ✅ V2: 必填
  name: string;
  value: string;  // ✅ V2: 实际秘钥值
  source?: 'manual' | 'synced';
  description?: string;
}) {
  const { data } = await this.client.post('/api/secrets', payload);
  return data;
}

// Secret Providers (Infisical 等)
async getSecretProviders() {
  const { data } = await this.client.get('/api/secret-providers');
  return data;
}

async createSecretProvider(payload: {
  name: string;
  type: 'infisical';
  config: {
    projectId: string;
    environment: string;
    secretPath?: string;
    clientId: string;
    clientSecret: string;
  };
}) {
  const { data } = await this.client.post('/api/secret-providers', payload);
  return data;
}
```

```typescript
// ✅ ui/src/pages/Secrets.tsx

// 修复接口定义
interface Secret {
  id: number;
  groupId: number;  // ✅ V2: 必填
  name: string;
  value?: string;  // ✅ V2: 实际秘钥值（显示时可能隐藏）
  source: 'manual' | 'synced';  // ✅ V2
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// 新增 SecretProvider 接口
interface SecretProvider {
  id: number;
  name: string;
  type: 'infisical';
  config: {
    projectId: string;
    environment: string;
    secretPath?: string;
    clientId: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

---

### 3. 添加部署日志 API

```typescript
// ✅ ui/src/services/api.ts

// Deployment Logs (部署日志)
async getDeploymentLogs(options?: {
  applicationId?: number;
  status?: 'pending' | 'success' | 'failed';
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (options?.applicationId) params.append('applicationId', options.applicationId.toString());
  if (options?.status) params.append('status', options.status);
  if (options?.limit) params.append('limit', options.limit.toString());
  const { data } = await this.client.get(`/api/deployment-logs?${params.toString()}`);
  return data;
}

async getDeploymentLog(id: number) {
  const { data } = await this.client.get(`/api/deployment-logs/${id}`);
  return data;
}
```

---

### 4. 添加应用 V2 字段

```typescript
// ✅ ui/src/pages/Applications.tsx

interface Application {
  id: number;
  name: string;
  image: string;
  version: string | null;
  repositoryId: number | null;
  domain: string | null;
  ports: PortMapping[];
  envVars: Record<string, string>;
  status: 'running' | 'stopped' | 'error' | 'deploying';
  lastDeployedAt: string | null;
  // ✅ V2 新增字段
  webhookEnabled: boolean;
  webhookToken: string | null;
  autoDeploy: boolean;
  createdAt: string;
  updatedAt: string;
}
```

```typescript
// ✅ ui/src/services/api.ts

// 应用创建（支持 V2 字段）
async createApplication(payload: {
  name: string;
  image: string;
  version?: string;
  repositoryId?: number;
  ports: Array<{ host: number; container: number }>;
  envVars?: Record<string, string>;
  webhookEnabled?: boolean;  // ✅ V2
  webhookToken?: string;     // ✅ V2
  autoDeploy?: boolean;      // ✅ V2
}) {
  const { data } = await this.client.post('/api/applications', payload);
  return data;
}

// 重新生成 Webhook Token
async regenerateWebhookToken(id: number) {
  const { data } = await this.client.post(`/api/applications/${id}/regenerate-webhook-token`);
  return data;
}

// Webhook V2 部署
async webhookDeployV2(payload: {
  applicationId: number;
  version: string;
  token: string;
}) {
  const { data } = await this.client.post('/webhook/deploy-v2', payload);
  return data;
}
```

---

### 5. 优化认证 Header

```typescript
// ✅ ui/src/services/api.ts

this.client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('auth_token');
  if (token && config.headers) {
    // ✅ 智能识别 token 类型
    if (token.startsWith('dw_')) {
      // API Key
      config.headers['x-api-key'] = token;
    } else if (token.startsWith('eyJ')) {
      // JWT Token
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      // Admin Token
      config.headers['x-admin-token'] = token;
    }
  }
  return config;
});
```

---

## 📊 修复检查清单

### Phase 1: 环境变量（30 分钟）
- [ ] 修改 `deleteEnvVariable` 使用 ID
- [ ] 添加 `updateEnvVariable` 方法
- [ ] 删除 `getProjectEnv` 方法
- [ ] 更新 `EnvVariable` 接口
- [ ] 移除 `projectName` 字段
- [ ] 添加 V2 字段（valueType, secretId, description）
- [ ] 更新 `Environment.tsx` 删除逻辑
- [ ] 测试环境变量 CRUD

### Phase 2: 秘钥管理（2 小时）
- [ ] 添加 Secret Groups API（5 个方法）
- [ ] 修复 Secrets API（更新接口）
- [ ] 添加 Secret Providers API（5 个方法）
- [ ] 添加 Secret Syncs API（2 个方法）
- [ ] 更新 `Secret` 接口
- [ ] 创建 `SecretProvider` 接口
- [ ] 创建 `SecretGroup` 接口
- [ ] 重新设计 `Secrets.tsx` 页面
- [ ] 测试秘钥 CRUD

### Phase 3: 应用部署（1 小时）
- [ ] 添加 Deployment Logs API（2 个方法）
- [ ] 添加 `webhookDeployV2` 方法
- [ ] 添加 `regenerateWebhookToken` 方法
- [ ] 更新 `Application` 接口
- [ ] 在 Applications 页面显示 Webhook 信息
- [ ] 创建部署日志页面/组件
- [ ] 测试 Webhook 功能

### Phase 4: 认证优化（15 分钟）
- [ ] 更新认证拦截器
- [ ] 支持多种 token 类型
- [ ] 测试不同认证方式

---

## 🎯 测试验证

### 环境变量
```bash
# 测试创建
curl -X POST http://localhost:9000/api/env \
  -H "x-admin-token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"scope":"global","key":"TEST","value":"test"}'

# 测试更新（使用 ID）
curl -X PUT http://localhost:9000/api/env/1 \
  -H "x-admin-token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value":"new-value"}'

# 测试删除（使用 ID）
curl -X DELETE http://localhost:9000/api/env/1 \
  -H "x-admin-token: YOUR_TOKEN"
```

### 秘钥管理
```bash
# 测试创建秘钥分组
curl -X POST http://localhost:9000/api/secret-groups \
  -H "x-admin-token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Group","description":"Test group"}'

# 测试创建秘钥（需要 groupId）
curl -X POST http://localhost:9000/api/secrets \
  -H "x-admin-token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"groupId":1,"name":"API_KEY","value":"secret123","source":"manual"}'
```

### 部署日志
```bash
# 测试查询部署日志
curl -X GET "http://localhost:9000/api/deployment-logs?applicationId=1" \
  -H "x-admin-token: YOUR_TOKEN"
```

---

## 💡 提示

### 数据迁移
如果你已经有旧数据，可能需要：
1. 备份现有数据
2. 为环境变量添加 ID
3. 重新组织秘钥（按分组）
4. 清理不兼容的数据

### 调试技巧
1. 打开浏览器开发者工具 Network 标签
2. 查看 API 请求和响应
3. 检查请求头是否正确
4. 验证请求体格式

### 常见错误
- **401**: 认证失败，检查 token
- **404**: 路由不存在，检查 URL
- **400**: 参数错误，检查请求体
- **409**: 冲突，如重复名称

---

## 📚 参考

- **完整审计报告**: `UI_API_COMPATIBILITY_AUDIT.md`
- **后端测试总结**: `backend/FINAL_TESTING_SUMMARY.md`
- **后端 API 路由**: `backend/src/routes/`
- **后端数据模型**: `backend/src/services/*Store.ts`

---

**预计修复时间**: 3-4 小时（核心功能）  
**完整修复时间**: 5-8 天（包括 UI 重构和测试）

