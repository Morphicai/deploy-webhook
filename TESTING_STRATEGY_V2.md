# V2 测试策略 - 从基础到上层

## 📋 测试概览

**当前状态：** 31 个测试通过，40 个测试失败  
**测试文件：** 4 个集成测试文件  
**策略：** 自底向上，逐层测试修复

---

## 🏗️ 测试架构分层

```
┌─────────────────────────────────────┐
│  第 4 层：业务应用层                 │
│  ├─ deploy.test.ts (部署功能)       │
│  └─ Webhook 部署                    │
├─────────────────────────────────────┤
│  第 3 层：业务数据层                 │
│  ├─ secrets.test.ts (秘钥管理)      │
│  ├─ deploymentLogs.test.ts (日志)   │
│  └─ 环境变量管理                    │
├─────────────────────────────────────┤
│  第 2 层：认证授权层                 │
│  └─ auth.test.ts (用户/API Key)     │
├─────────────────────────────────────┤
│  第 1 层：基础设施层                 │
│  ├─ 数据库初始化                    │
│  ├─ Secret Groups (V2 新增)         │
│  └─ 加密服务                        │
└─────────────────────────────────────┘
```

---

## 🎯 推荐测试顺序

### 阶段 1：基础设施层（必须先通过）

**目标：** 确保数据库和基础服务正常

#### 1.1 数据库表结构验证
- ✅ secret_groups 表
- ✅ secrets 表（V2 结构）
- ✅ environment_variables 表（V2 结构）
- ✅ applications 表（包含 webhook 字段）
- ✅ deployment_logs 表

**测试方法：**
```bash
# 手动验证数据库结构
cd backend
npm run build
node -e "
const { getDb } = require('./dist/services/database');
const db = getDb();
console.log('Tables:', db.prepare('SELECT name FROM sqlite_master WHERE type=\"table\"').all());
"
```

#### 1.2 Secret Groups 基础功能
- 创建秘钥组
- 列出秘钥组
- 删除秘钥组

**关键依赖：**
- `secretGroupStore.ts`
- 数据库表 `secret_groups`

---

### 阶段 2：认证授权层（推荐第二测试）

**测试文件：** `tests/integration/auth.test.ts`

**测试内容：**
1. ✅ 用户注册和登录
2. ✅ JWT Token 验证
3. ✅ API Key 创建和验证
4. ✅ API Key 权限控制

**预期结果：** 应该全部通过（认证是最底层，不依赖其他模块）

**运行命令：**
```bash
npm test -- auth.test.ts
```

**关键依赖：**
- `userStore.ts`
- `apiKeyStore.ts`
- JWT 中间件

---

### 阶段 3：业务数据层（核心功能）

#### 3.1 秘钥管理测试

**测试文件：** `tests/integration/secrets.test.ts`

**模块划分：**

**3.1.1 Secret Groups（V2 新功能）**
- [ ] 创建秘钥组
- [ ] 列出秘钥组
- [ ] 查询秘钥组详情
- [ ] 删除秘钥组

**3.1.2 Secrets（V2 重构）**
- [ ] 创建秘钥（加密存储）
- [ ] 列出秘钥（带预览）
- [ ] 查询秘钥（解密）
- [ ] 更新秘钥
- [ ] 删除秘钥
- [ ] 按组查询秘钥

**3.1.3 Environment Variables（V2 增强）**
- [ ] 创建环境变量（纯文本）
- [ ] 创建环境变量（引用秘钥）✨ V2 新功能
- [ ] 列出环境变量
- [ ] 更新环境变量
- [ ] 删除环境变量
- [ ] Upsert 操作
- [ ] 环境变量优先级（全局 vs 项目）

**3.1.4 Secret References（V2 新功能）**
- [ ] 环境变量引用秘钥 ✨
- [ ] 查询引用秘钥的环境变量 ✨
- [ ] 解析秘钥引用 ✨

**运行命令：**
```bash
# 完整测试
npm test -- secrets.test.ts

# 分段测试
npm test -- secrets.test.ts -t "Secret Groups"
npm test -- secrets.test.ts -t "Secrets Management"
npm test -- secrets.test.ts -t "Environment Variables"
npm test -- secrets.test.ts -t "Secret References"
```

**关键依赖：**
- `secretGroupStore.ts` ✨ V2 新增
- `secretStore.ts`（V2 重构）
- `envStore.ts`（V2 重构）
- `encryption.ts`（加密工具）

**已知问题：**
- ❌ 环境变量更新/删除 404 错误
- ❌ Secret 创建返回数据结构问题
- ❌ 环境变量引用秘钥功能未实现

---

#### 3.2 部署日志测试

**测试文件：** `tests/integration/deploymentLogs.test.ts`

**测试内容：**
1. [ ] 创建部署日志
2. [ ] 查询部署日志（按应用）
3. [ ] 查询部署日志（按状态）
4. [ ] 更新部署日志状态
5. [ ] 部署日志分页

**运行命令：**
```bash
npm test -- deploymentLogs.test.ts
```

**关键依赖：**
- `deploymentLogStore.ts` ✨ V2 新增
- `applications` 表
- `deployment_logs` 表

---

### 阶段 4：业务应用层（最上层）

**测试文件：** `tests/integration/deploy.test.ts`

**模块划分：**

**4.1 应用管理（V2 增强）**
- [ ] 创建应用
- [ ] 更新应用
- [ ] 启用/禁用 Webhook ✨ V2 新功能
- [ ] 重新生成 Webhook Token ✨ V2 新功能

**4.2 应用部署**
- [ ] 基础部署流程
- [ ] 使用环境变量部署
- [ ] 使用秘钥引用部署 ✨ V2 新功能
- [ ] 镜像白名单验证

**4.3 Webhook 部署（V2 新功能）**
- [ ] Webhook 部署（带 Token 验证）✨
- [ ] Webhook 禁用检查 ✨
- [ ] 部署日志记录 ✨

**运行命令：**
```bash
# 完整测试
npm test -- deploy.test.ts

# 分段测试
npm test -- deploy.test.ts -t "Application Management"
npm test -- deploy.test.ts -t "Deployment"
npm test -- deploy.test.ts -t "Webhook"
```

**关键依赖：**
- `applicationStore.ts`（V2 增强）
- `deployService.ts`
- `webhookDeploy.ts` ✨ V2 新增
- `deploymentLogStore.ts` ✨ V2 新增

---

## 📝 测试执行计划

### Step 1: 基础设施验证（手动）

```bash
cd /Users/pengzai/www/morphicai/deploy-webhook/backend

# 1. 清空测试数据库
rm -f data/test/deploy-webhook.db*

# 2. 重新构建
npm run build

# 3. 验证数据库表结构
node -e "
const { getDb } = require('./dist/services/database');
const db = getDb();
const tables = db.prepare('SELECT name FROM sqlite_master WHERE type=\"table\" ORDER BY name').all();
console.log('📊 数据库表:', tables.map(t => t.name));

// 验证关键表
const requiredTables = ['secret_groups', 'secrets', 'environment_variables', 'applications', 'deployment_logs'];
requiredTables.forEach(table => {
  const exists = tables.some(t => t.name === table);
  console.log(exists ? '✅' : '❌', table);
});
"
```

### Step 2: 分层测试执行

#### 第 1 轮：认证层
```bash
npm test -- auth.test.ts --verbose
```
**预期：** 全部通过 ✅

#### 第 2 轮：秘钥管理（分段）
```bash
# 2.1 Secret Groups
npm test -- secrets.test.ts -t "Secret Groups" --verbose

# 2.2 Secrets Management
npm test -- secrets.test.ts -t "Secrets Management" --verbose

# 2.3 Environment Variables (基础)
npm test -- secrets.test.ts -t "Environment Variables" --verbose

# 2.4 Secret References (V2 新功能)
npm test -- secrets.test.ts -t "Secret References" --verbose
```

#### 第 3 轮：部署日志
```bash
npm test -- deploymentLogs.test.ts --verbose
```

#### 第 4 轮：部署功能
```bash
# 4.1 应用管理
npm test -- deploy.test.ts -t "Application" --verbose

# 4.2 部署功能
npm test -- deploy.test.ts -t "Deploy" --verbose

# 4.3 Webhook 部署
npm test -- deploy.test.ts -t "Webhook" --verbose
```

### Step 3: 完整回归测试
```bash
npm test --verbose
```

---

## 🔧 修复策略

### 优先级 1（阻塞性问题）

1. **环境变量 API 路由问题**
   - 问题：更新/删除返回 404
   - 文件：`backend/src/routes/envVars.ts`
   - 修复：检查路由定义和参数解析

2. **Secret 创建返回数据结构**
   - 问题：`secretResponse.body.data.id` 未定义
   - 文件：`backend/src/routes/secrets.ts`
   - 修复：确保返回格式为 `{ success: true, data: { id, ... } }`

3. **环境变量 Upsert 逻辑**
   - 问题：期望 201，实际返回 200
   - 文件：`backend/src/services/envStore.ts`
   - 修复：区分创建和更新的返回状态码

### 优先级 2（功能问题）

4. **Secret References 解析**
   - 问题：环境变量引用秘钥功能
   - 文件：`backend/src/services/envStore.ts`
   - 修复：实现 `buildEnvironmentForProject` 解析秘钥引用

5. **环境变量优先级**
   - 问题：项目级别环境变量未正确覆盖全局变量
   - 文件：`backend/src/services/envStore.ts`
   - 修复：确保项目级别优先级高于全局

---

## 📊 测试覆盖率目标

| 模块 | 当前 | 目标 | 优先级 |
|-----|------|------|--------|
| 认证层 | ✅ 100% | 100% | 高 |
| Secret Groups | ❌ 0% | 100% | 高 |
| Secrets | ⚠️ 60% | 100% | 高 |
| Environment Variables | ⚠️ 40% | 100% | 高 |
| Deployment Logs | ❌ 0% | 90% | 中 |
| Application Management | ⚠️ 70% | 100% | 高 |
| Deployment | ⚠️ 50% | 90% | 高 |
| Webhook Deploy | ❌ 0% | 100% | 高 |

---

## 🎯 今日测试目标

### 最小目标（2 小时）
- ✅ 清理所有迁移脚本
- ✅ 验证数据库表结构
- ✅ 认证层测试通过
- ⏳ Secret Groups 测试通过

### 理想目标（4 小时）
- ✅ 清理所有迁移脚本
- ✅ 验证数据库表结构
- ✅ 认证层测试通过
- ✅ Secret Groups + Secrets 测试通过
- ✅ Environment Variables 基础功能通过

### 完美目标（6 小时）
- ✅ 所有测试通过
- ✅ V2 功能完整覆盖
- ✅ 文档更新完成

---

## 💡 测试建议

### 1. 单元测试优先
对于复杂的业务逻辑（如秘钥引用解析），建议先写单元测试。

### 2. 隔离测试
每个测试应该独立，不依赖其他测试的执行顺序。

### 3. 数据清理
每个测试前后都要清理数据库，避免测试污染。

### 4. 错误处理
测试不仅要覆盖成功场景，还要覆盖各种错误场景。

### 5. 性能测试
对于部署等耗时操作，可以设置合理的超时时间。

---

## 📚 相关文档

- [V2 数据模型设计](./DATA_MODEL_V2_DESIGN.md)
- [V2 工作流程](./DATA_MODEL_V2_WORKFLOW.md)
- [V2 实现状态](./IMPLEMENTATION_STATUS.md)
- [V2 清理完成](./CLEANUP_V2_COMPLETE.md)

---

**最后更新：** 2025-10-23  
**状态：** 🔴 测试中（40 失败，31 通过）  
**下一步：** 从认证层开始，逐层测试修复

