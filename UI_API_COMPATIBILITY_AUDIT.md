# UI API 兼容性审计报告

## 📋 概述

本文档分析 UI (`ui/src/services/api.ts`) 中的 API 调用与后端 V2 数据模型的兼容性。

**审计日期**: 2025-10-24  
**后端版本**: V2 (已完成 81 个测试)  
**UI 版本**: Current

---

## 🚨 严重问题（需要立即修复）

### 1. 环境变量 API 不兼容 (P0)

**文件**: `ui/src/services/api.ts:195-204`  
**影响页面**: `ui/src/pages/Environment.tsx`

#### 问题 1.1: `deleteEnvVariable` 使用旧的查询参数方式

**当前实现**:
```typescript
// ui/src/services/api.ts:195
async deleteEnvVariable(scope: string, key: string, projectId?: number) {
  const params = new URLSearchParams({ scope, key });
  if (projectId) params.append('projectId', projectId.toString());
  const { data } = await this.client.delete(`/api/env?${params.toString()}`);
  return data;
}
```

**实际使用**:
```typescript
// ui/src/pages/Environment.tsx:115
await api.deleteEnvVariable(variable.scope, variable.key, variable.projectId || undefined);
```

**后端实现**: 
后端现在支持更好的 ID-based 删除方式:
```typescript
// backend/src/routes/env.ts
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  deleteEnvEntryById(id);
  res.json({ success: true });
});
```

**问题**:
- ❌ UI 使用查询参数方式 (`scope`, `key`, `projectId`)
- ❌ 后端已不再支持此方式（已在测试中移除）
- ❌ 会导致删除功能失败

**修复方案**:
```typescript
// ui/src/services/api.ts
async deleteEnvVariable(id: number) {
  const { data } = await this.client.delete(`/api/env/${id}`);
  return data;
}

// ui/src/pages/Environment.tsx
// EnvVariable 接口需要添加 id 字段
interface EnvVariable {
  id: number;  // 新增
  scope: 'global' | 'project';
  key: string;
  value: string;
  projectId?: number | null;
}

// 删除时使用 ID
await api.deleteEnvVariable(variable.id);
```

---

#### 问题 1.2: 缺少 `updateEnvVariable` 方法

**后端实现**:
```typescript
// backend/src/routes/env.ts
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const entry = updateEnvEntryById(id, req.body);
  res.json({ success: true, data: entry });
});
```

**问题**:
- ❌ UI 缺少更新环境变量的方法
- ❌ Environment 页面无法编辑已存在的变量

**修复方案**:
```typescript
// ui/src/services/api.ts
async updateEnvVariable(id: number, payload: {
  value?: string;
  valueType?: 'plain' | 'secret_ref';
  secretId?: number | null;
  description?: string;
}) {
  const { data } = await this.client.put(`/api/env/${id}`, payload);
  return data;
}
```

---

#### 问题 1.3: `getProjectEnv` 路由不存在

**当前实现**:
```typescript
// ui/src/services/api.ts:202
async getProjectEnv(projectIdentifier: string | number) {
  const { data } = await this.client.get(`/api/env/project/${projectIdentifier}`);
  return data;
}
```

**问题**:
- ❌ 后端没有 `/api/env/project/:id` 路由
- ❌ 应该使用 `getEnvVariables` 并传递 `projectId` 参数

**修复方案**:
```typescript
// ui/src/services/api.ts
// 删除 getProjectEnv 方法，使用 getEnvVariables 替代

// 获取项目环境变量
const projectEnv = await api.getEnvVariables('project', projectId);
```

---

#### 问题 1.4: `projectName` 字段已弃用

**当前实现**:
```typescript
// ui/src/pages/Environment.tsx:31
interface EnvVariable {
  scope: 'global' | 'project';
  key: string;
  value: string;
  projectId?: number | null;
  projectName?: string;  // ❌ 已弃用
}
```

**问题**:
- ❌ 后端在 V2 中已完全移除 `projectName` 支持
- ❌ 只支持 `projectId`
- ❌ 在第四层测试中已明确修复此问题

**修复方案**:
```typescript
// ui/src/pages/Environment.tsx
interface EnvVariable {
  id: number;  // 新增
  scope: 'global' | 'project';
  key: string;
  value: string;
  valueType?: 'plain' | 'secret_ref';  // V2: 值类型
  secretId?: number | null;  // V2: 引用的秘钥 ID
  projectId?: number | null;
  description?: string;  // V2: 描述
  createdAt?: string;
  updatedAt?: string;
}
```

---

### 2. 秘钥管理 API 严重不兼容 (P0)

**文件**: `ui/src/services/api.ts:208-226`  
**影响页面**: `ui/src/pages/Secrets.tsx`

#### 问题 2.1: Secret 数据结构完全不匹配

**UI 当前理解**:
```typescript
// ui/src/pages/Secrets.tsx:20
interface Secret {
  id: number;
  name: string;
  type: string;  // ❌ V2 中不存在
  provider?: string;  // ❌ 这是 SecretProvider 的字段
  projectId?: string;  // ❌ 这是 Infisical 的字段
  environment?: string;  // ❌ 这是 Infisical 的字段
  secretPath?: string;  // ❌ 这是 Infisical 的字段
  clientId?: string;  // ❌ 这是 Infisical 的字段
}
```

**后端 V2 实际结构**:
```typescript
// backend/src/services/secretStore.ts
interface SecretRecord {
  id: number;
  groupId: number;  // ✅ V2: 必填 - 秘钥分组 ID
  name: string;
  value: string;  // ✅ V2: 实际的秘钥值（加密存储）
  source: 'manual' | 'synced';  // ✅ V2: 秘钥来源
  description: string | null;
  createdAt: string;
  updatedAt: string;
}
```

**问题**:
- ❌ UI 中的 Secret 结构是 V1 的 SecretProvider
- ❌ 缺少 `groupId`（V2 中必填）
- ❌ 缺少 `value`（实际的秘钥值）
- ❌ 缺少 `source`（manual/synced）
- ❌ 包含很多不相关的字段

**根本原因**:
UI 混淆了两个概念：
1. **Secret** (秘钥) - 实际存储的秘钥值
2. **SecretProvider** (秘钥提供者) - Infisical 等外部服务配置

---

#### 问题 2.2: 缺少秘钥分组 API

**后端 V2 结构**:
```typescript
// backend/src/services/secretGroupStore.ts
interface SecretGroupRecord {
  id: number;
  name: string;
  description: string | null;
  providerId: number | null;
  autoSync: boolean;
  syncEnabled: boolean;
  syncPath: string;
  syncStrategy: 'merge' | 'replace';
  createdAt: string;
  updatedAt: string;
}
```

**问题**:
- ❌ UI 完全缺少 Secret Groups 相关的 API
- ❌ 无法创建、查询、更新、删除秘钥分组
- ❌ 创建秘钥时无法指定分组

**修复方案**:
```typescript
// ui/src/services/api.ts

// Secret Groups
async getSecretGroups() {
  const { data } = await this.client.get('/api/secret-groups');
  return data;
}

async getSecretGroup(id: number) {
  const { data } = await this.client.get(`/api/secret-groups/${id}`);
  return data;
}

async createSecretGroup(payload: {
  name: string;
  description?: string;
  providerId?: number;
  autoSync?: boolean;
  syncEnabled?: boolean;
  syncPath?: string;
  syncStrategy?: 'merge' | 'replace';
}) {
  const { data } = await this.client.post('/api/secret-groups', payload);
  return data;
}

async updateSecretGroup(id: number, payload: any) {
  const { data } = await this.client.put(`/api/secret-groups/${id}`, payload);
  return data;
}

async deleteSecretGroup(id: number) {
  const { data } = await this.client.delete(`/api/secret-groups/${id}`);
  return data;
}

// Secrets (V2)
async getSecrets(groupId?: number) {
  const params = groupId ? `?groupId=${groupId}` : '';
  const { data } = await this.client.get(`/api/secrets${params}`);
  return data;
}

async createSecret(payload: {
  groupId: number;  // V2: 必填
  name: string;
  value: string;  // V2: 实际的秘钥值
  source?: 'manual' | 'synced';
  description?: string;
}) {
  const { data } = await this.client.post('/api/secrets', payload);
  return data;
}

async updateSecret(id: number, payload: {
  name?: string;
  value?: string;
  description?: string;
}) {
  const { data } = await this.client.put(`/api/secrets/${id}`, payload);
  return data;
}
```

---

#### 问题 2.3: 秘钥提供者 API 缺失

**后端实现**:
- `/api/secret-providers` - 管理 Infisical 等外部秘钥服务

**问题**:
- ❌ UI 将 SecretProvider 误认为 Secret
- ❌ 缺少真正的 SecretProvider API

**修复方案**:
```typescript
// ui/src/services/api.ts

// Secret Providers (Infisical, etc.)
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

async updateSecretProvider(id: number, payload: any) {
  const { data } = await this.client.put(`/api/secret-providers/${id}`, payload);
  return data;
}

async deleteSecretProvider(id: number) {
  const { data } = await this.client.delete(`/api/secret-providers/${id}`);
  return data;
}

// Secret Syncs (同步日志)
async getSecretSyncs(providerId?: number) {
  const params = providerId ? `?providerId=${providerId}` : '';
  const { data } = await this.client.get(`/api/secret-syncs${params}`);
  return data;
}

async triggerSecretSync(providerId: number) {
  const { data } = await this.client.post(`/api/secret-syncs/trigger`, { providerId });
  return data;
}
```

---

### 3. 应用部署 API 缺失 V2 功能 (P0)

**文件**: `ui/src/services/api.ts:130-174`

#### 问题 3.1: 缺少 Webhook V2 相关字段

**当前实现**:
```typescript
// ui/src/services/api.ts:141
async createApplication(payload: any) {
  const { data } = await this.client.post('/api/applications', payload);
  return data;
}
```

**V2 新增字段**:
```typescript
interface Application {
  // ... 现有字段
  webhookEnabled: boolean;  // ❌ UI 缺失
  webhookToken: string | null;  // ❌ UI 缺失
  autoD

eploy: boolean;  // ❌ UI 缺失
}
```

**修复方案**:
```typescript
// ui/src/services/api.ts
async createApplication(payload: {
  name: string;
  image: string;
  version?: string;
  repositoryId?: number;
  ports: Array<{ host: number; container: number }>;
  envVars?: Record<string, string>;
  webhookEnabled?: boolean;  // V2: Webhook 开关
  webhookToken?: string;     // V2: Webhook Token
  autoDeploy?: boolean;      // V2: 自动部署
}) {
  const { data } = await this.client.post('/api/applications', payload);
  return data;
}

async regenerateWebhookToken(id: number) {
  const { data } = await this.client.post(`/api/applications/${id}/regenerate-webhook-token`);
  return data;
}
```

---

#### 问题 3.2: 缺少部署日志 API

**后端实现**:
- `/api/deployment-logs` - 查询部署日志
- `/api/deployment-logs/:id` - 获取单个日志

**问题**:
- ❌ UI 完全缺少部署日志相关的 API
- ❌ 无法查看历史部署记录
- ❌ 无法查看部署失败原因

**修复方案**:
```typescript
// ui/src/services/api.ts

// Deployment Logs (V2)
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

#### 问题 3.3: Webhook V2 部署端点缺失

**后端 V2 实现**:
```typescript
// backend/src/routes/webhookDeploy.ts
POST /webhook/deploy-v2
Body: {
  applicationId: number;
  version: string;
  token: string;
}
```

**问题**:
- ❌ UI 缺少 Webhook V2 部署方法
- ❌ 只有传统的 `/deploy` 端点

**修复方案**:
```typescript
// ui/src/services/api.ts

// Webhook V2 Deployment
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

## ⚠️ 中等问题（影响功能但非致命）

### 4. 认证 Header 不完整 (P1)

**文件**: `ui/src/services/api.ts:16-22`

**当前实现**:
```typescript
this.client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('auth_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;  // ❌ 只支持 Bearer
  }
  return config;
});
```

**后端支持的认证方式**:
1. `Authorization: Bearer <jwt_token>` - JWT Token
2. `x-admin-token: <admin_token>` - Admin Token
3. `x-api-key: dw_<api_key>` - API Key

**问题**:
- ❌ UI 只支持 JWT Bearer Token
- ❌ 无法使用 Admin Token
- ❌ 无法使用 API Key

**修复方案**:
```typescript
this.client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('auth_token');
  if (token && config.headers) {
    // 智能识别 token 类型
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

### 5. 应用接口缺少关键字段 (P1)

**文件**: `ui/src/pages/Applications.tsx:24`

**当前接口**:
```typescript
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
  createdAt: string;
  updatedAt: string;
  // ❌ 缺少 V2 字段
}
```

**V2 应该包含**:
```typescript
interface Application {
  // ... 现有字段
  webhookEnabled: boolean;       // V2: Webhook 开关
  webhookToken: string | null;   // V2: Webhook Token
  autoDeploy: boolean;           // V2: 自动部署
}
```

---

## 📝 轻微问题（不影响主要功能）

### 6. Webhook 管理 API 不完整 (P2)

**文件**: `ui/src/services/api.ts:282-305`

**当前实现**:
- ✅ `listWebhooks()`
- ✅ `getWebhook(id)`
- ✅ `createWebhook(payload)`
- ✅ `updateWebhook(id, payload)`
- ✅ `deleteWebhook(id)`

**问题**:
- ⚠️ 这些 API 用于第三方 Webhook（如 GitHub, GitLab）
- ⚠️ 与应用的 Webhook 部署功能是两个不同的概念
- ⚠️ 可能造成混淆

**建议**:
- 重命名为 `listIncomingWebhooks`, `createIncomingWebhook` 等
- 或添加注释说明区别

---

## 📊 问题统计

| 优先级 | 数量 | 说明 |
|--------|------|------|
| **P0 - 严重** | 9 | 阻塞核心功能，必须修复 |
| **P1 - 中等** | 2 | 影响功能但可暂时绕过 |
| **P2 - 轻微** | 1 | 优化项，不影响主要功能 |
| **总计** | **12** | - |

---

## 🔧 修复优先级建议

### 立即修复（本周内）

1. **环境变量 API 重构** (P0)
   - 添加 ID-based CRUD
   - 移除 `projectName` 支持
   - 添加 V2 字段支持（valueType, secretId）

2. **秘钥管理完全重构** (P0)
   - 区分 Secret 和 SecretProvider
   - 添加 Secret Groups API
   - 添加 SecretProvider API
   - 重新实现 Secrets 页面

3. **应用部署增强** (P0)
   - 添加 Webhook V2 字段
   - 添加部署日志 API
   - 实现 Webhook Token 管理

### 近期修复（下周）

4. **认证增强** (P1)
   - 支持多种认证方式
   - API Key 管理完善

5. **应用接口完善** (P1)
   - 添加所有 V2 字段
   - 更新 TypeScript 接口

### 可选优化（有时间时）

6. **Webhook 命名优化** (P2)
   - 区分应用 Webhook 和第三方 Webhook
   - 添加清晰的注释

---

## 📁 需要修改的文件清单

### API 服务层
- `ui/src/services/api.ts` - **重点修改**
  - 环境变量 API 重构
  - 秘钥管理 API 重构
  - 应用部署 API 增强
  - 认证 Header 优化

### 页面组件
- `ui/src/pages/Environment.tsx` - **需要修改**
  - 更新接口定义
  - 使用 ID-based API
  - 移除 `projectName`

- `ui/src/pages/Secrets.tsx` - **完全重构**
  - 区分 Secret 和 SecretProvider
  - 实现秘钥分组管理
  - 重新设计 UI

- `ui/src/pages/Applications.tsx` - **需要修改**
  - 添加 Webhook 管理 UI
  - 显示部署日志
  - 添加 V2 字段

### TypeScript 接口
- 创建 `ui/src/types/api.ts` - **新建**
  - 统一定义所有 API 接口
  - 与后端保持一致

---

## 🎯 修复后的预期效果

### 环境变量管理
- ✅ 支持 ID-based CRUD 操作
- ✅ 支持秘钥引用 (`@secret:id`)
- ✅ 支持项目和全局作用域
- ✅ 正确的字段和 API 调用

### 秘钥管理
- ✅ 清晰的分组管理
- ✅ 实际秘钥值的存储和显示
- ✅ SecretProvider 独立管理
- ✅ 自动同步功能

### 应用部署
- ✅ Webhook Token 管理
- ✅ 部署历史查看
- ✅ 失败原因分析
- ✅ V2 所有功能可用

---

## 🚀 建议的修复流程

### Phase 1: 基础修复（1-2 天）
1. 修复 `api.ts` 中的环境变量 API
2. 添加基础的秘钥分组 API
3. 测试基本 CRUD 功能

### Phase 2: 秘钥系统重构（2-3 天）
1. 区分 Secret 和 SecretProvider
2. 实现完整的秘钥分组 UI
3. 重新设计 Secrets 页面
4. 集成 Infisical 同步功能

### Phase 3: 应用部署增强（1-2 天）
1. 添加 Webhook V2 字段和 UI
2. 实现部署日志页面
3. 添加 Token 管理功能

### Phase 4: 测试和优化（1 天）
1. 端到端测试
2. 修复发现的问题
3. 性能优化

**总预计时间**: 5-8 个工作日

---

## 📚 参考文档

### 后端测试文档
- `backend/LAYER1_TEST_COMPLETE.md` - 认证测试
- `backend/LAYER2_TEST_COMPLETE.md` - Secret Groups 测试
- `backend/LAYER3_TEST_COMPLETE.md` - Secrets 测试
- `backend/LAYER4_TEST_COMPLETE.md` - Environment Variables 测试
- `backend/LAYER5_TEST_COMPLETE.md` - Application Deployment 测试
- `backend/LAYER6_TEST_COMPLETE.md` - Deployment Logs 测试
- `backend/FINAL_TESTING_SUMMARY.md` - 完整测试总结

### 后端 API 实现
- `backend/src/routes/env.ts` - 环境变量路由
- `backend/src/routes/secrets.ts` - 秘钥路由
- `backend/src/routes/secretGroups.ts` - 秘钥分组路由
- `backend/src/routes/applications.ts` - 应用路由
- `backend/src/routes/webhookDeploy.ts` - Webhook 部署路由
- `backend/src/routes/deploymentLogs.ts` - 部署日志路由

### 数据模型
- `backend/src/services/database.ts` - V2 数据库表定义
- `backend/src/services/secretStore.ts` - 秘钥数据结构
- `backend/src/services/secretGroupStore.ts` - 秘钥分组结构
- `backend/src/services/envStore.ts` - 环境变量结构
- `backend/src/services/applicationStore.ts` - 应用结构
- `backend/src/services/deploymentLogStore.ts` - 部署日志结构

---

## ✅ 验证清单

在修复完成后，请验证以下功能：

### 环境变量
- [ ] 创建全局环境变量
- [ ] 创建项目环境变量
- [ ] 更新环境变量（使用 ID）
- [ ] 删除环境变量（使用 ID）
- [ ] 引用秘钥到环境变量
- [ ] 查看项目的合并环境变量

### 秘钥管理
- [ ] 创建秘钥分组
- [ ] 在分组中创建秘钥
- [ ] 更新秘钥值
- [ ] 删除秘钥
- [ ] 查看秘钥列表（按分组过滤）
- [ ] 配置 Infisical Provider
- [ ] 触发秘钥同步

### 应用部署
- [ ] 创建应用（启用 Webhook）
- [ ] 查看 Webhook Token
- [ ] 重新生成 Webhook Token
- [ ] 通过 Webhook 部署
- [ ] 查看部署日志
- [ ] 查看失败原因

---

## 🎯 总结

UI 中的 API 调用与后端 V2 数据模型存在 **严重不兼容**：

**关键问题**:
1. ❌ 环境变量使用旧的查询参数删除方式
2. ❌ 秘钥管理完全混淆了 Secret 和 SecretProvider
3. ❌ 缺少所有 V2 新增功能（Webhook Token, 部署日志等）
4. ❌ 数据结构不匹配（缺少 ID、groupId 等关键字段）

**影响**:
- 🔴 环境变量无法正确删除和更新
- 🔴 秘钥管理功能完全无法使用
- 🔴 V2 新功能无法在 UI 中使用
- 🔴 可能导致数据损坏或操作失败

**建议**:
- 🚨 **立即修复 P0 问题**，这些问题阻塞核心功能
- 📅 计划 5-8 个工作日进行完整修复
- 🧪 每个阶段完成后进行测试
- 📝 更新 API 文档和 TypeScript 接口定义

---

**审计完成时间**: 2025-10-24  
**下一步**: 开始 Phase 1 基础修复

