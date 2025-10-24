# 第四层测试调试总结 - Environment Variables

## 🔍 发现的核心问题

### 问题 1: 环境变量使用 projectName 而非 projectId（设计缺陷）

**严重程度**: 🔴 高

**问题描述**:
- 原设计允许通过 `projectName` 和 `projectId` 两种方式操作环境变量
- 这违反了数据库设计原则：应该使用主键 ID 作为唯一标识符
- `name` 字段虽然有唯一约束，但在语义上不是真正的唯一标识符

**受影响的代码**:
```typescript
// ❌ 原来的设计
const envEntrySchema = z.object({
  projectId: z.number().optional(),
  projectName: z.string().optional(), // 混淆了 ID 和 Name
  // ...
});

export function listEnvEntries(scope?: string, projectIdOrName?: number | string) {
  if (typeof projectIdOrName === 'string') {
    // 通过 name 查询 - 不好的实践
    WHERE a.name = ?
  }
}
```

**正确的设计**:
```typescript
// ✅ 修复后的设计
const envEntrySchema = z.object({
  projectId: z.number().int().positive().optional(), // 只使用 ID
  // 移除 projectName
});

export function listEnvEntries(scope?: string, projectId?: number) {
  // 只通过 ID 查询
}
```

**修改的文件**:
- `src/services/envStore.ts` - 移除 projectName 支持
- `src/routes/env.ts` - 移除 projectName 查询参数
- `tests/helpers/apiClient.ts` - 更新 listEnvVars 参数
- `tests/helpers/fixtures.ts` - 移除 projectName
- `tests/integration/secrets.test.ts` - 所有测试改用 projectId

---

### 问题 2: SQLite UPSERT 对 NULL 值处理不当（数据一致性问题）

**严重程度**: 🔴 高

**问题描述**:
SQLite 的 UNIQUE 约束对 NULL 值有特殊处理：
- 每个 NULL 都被认为是不同的值
- `UNIQUE(scope, project_id, key)` 对 `project_id = NULL` 无效
- 导致全局环境变量（`project_id = NULL`）可以插入多个相同的 key
- `ON CONFLICT` 子句不会被触发，无法实现 upsert

**问题演示**:
```sql
-- 表结构
CREATE TABLE environment_variables (
  scope TEXT NOT NULL,
  project_id INTEGER,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  UNIQUE(scope, project_id, key)
);

-- 以下三行都可以成功插入（因为 NULL != NULL）
INSERT INTO environment_variables VALUES ('global', NULL, 'KEY1', 'v1');
INSERT INTO environment_variables VALUES ('global', NULL, 'KEY1', 'v2');
INSERT INTO environment_variables VALUES ('global', NULL, 'KEY1', 'v3');

-- 结果：3 行数据！
```

**原始代码问题**:
```typescript
// ❌ 这个 ON CONFLICT 对 project_id = NULL 不起作用
db.prepare(
  `INSERT INTO environment_variables(scope, project_id, key, value, ...)
   VALUES (@scope, @projectId, @key, @value, ...)
   ON CONFLICT(scope, project_id, key)
   DO UPDATE SET value = excluded.value, ...`
).run(normalized);
```

**修复方案**:
```typescript
// ✅ 使用显式的 SELECT + INSERT/UPDATE 逻辑
let existing: any;
if (normalized.projectId === null) {
  existing = db.prepare(
    `SELECT id FROM environment_variables 
     WHERE scope = ? AND project_id IS NULL AND key = ?`
  ).get(normalized.scope, normalized.key);
} else {
  existing = db.prepare(
    `SELECT id FROM environment_variables 
     WHERE scope = ? AND project_id = ? AND key = ?`
  ).get(normalized.scope, normalized.projectId, normalized.key);
}

if (existing) {
  // 更新
  db.prepare(`UPDATE environment_variables 
    SET value = ?, value_type = ?, secret_id = ?, description = ?
    WHERE id = ?`).run(..., existing.id);
} else {
  // 插入
  db.prepare(`INSERT INTO environment_variables(...) VALUES (...)`).run(...);
}
```

**更优的数据库设计建议**:
```sql
-- 方案 1: 使用部分索引（SQLite 3.8.0+）
CREATE UNIQUE INDEX idx_env_global 
ON environment_variables(scope, key) 
WHERE project_id IS NULL;

CREATE UNIQUE INDEX idx_env_project 
ON environment_variables(scope, project_id, key) 
WHERE project_id IS NOT NULL;

-- 方案 2: 使用 COALESCE 将 NULL 转为特殊值
CREATE UNIQUE INDEX idx_env_unique 
ON environment_variables(scope, COALESCE(project_id, -1), key);

-- 方案 3: 分表设计
CREATE TABLE global_env_vars (scope, key, value, UNIQUE(scope, key));
CREATE TABLE project_env_vars (scope, project_id, key, value, UNIQUE(scope, project_id, key));
```

**修改的文件**:
- `src/services/envStore.ts` - 重写 upsertEnvEntry 逻辑

---

### 问题 3: 测试数据清理不完整（测试可靠性问题）

**严重程度**: 🟡 中

**问题描述**:
- `afterEach` 清空所有表数据，但没有重新初始化必需的默认数据
- `repositories` 表的默认 Docker Hub 记录（id=1）被删除
- 后续测试创建应用时，`repositoryId: 1` 的外键约束失败
- 错误: `FOREIGN KEY constraint failed`

**问题代码**:
```typescript
// ❌ 原始代码
afterEach(async () => {
  const { getDb } = require('../../dist/services/database');
  const db = getDb();
  
  db.exec('PRAGMA foreign_keys = OFF');
  for (const table of tables) {
    db.prepare(`DELETE FROM ${table.name}`).run(); // 删除所有数据
  }
  db.exec('PRAGMA foreign_keys = ON');
  // 缺少重新初始化！
});
```

**修复**:
```typescript
// ✅ 修复后的代码
afterEach(async () => {
  const { getDb } = require('../../dist/services/database');
  const { initializeDefaultRepository } = require('../../dist/services/repositoryStore');
  const db = getDb();
  
  db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  db.exec('PRAGMA foreign_keys = OFF');
  
  for (const table of tables) {
    db.prepare(`DELETE FROM ${table.name}`).run();
  }
  
  db.exec('PRAGMA foreign_keys = ON');
  
  // ✅ 重新初始化默认 Docker Hub repository
  initializeDefaultRepository();
  
  db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
});
```

**测试最佳实践**:
1. **清理后重新初始化基础数据**
2. **使用事务 + ROLLBACK** (更快，但不适合跨测试的持久化需求)
3. **使用数据库快照** (备份/恢复机制)
4. **考虑使用内存数据库** (`:memory:`) for unit tests

**修改的文件**:
- `tests/integration/secrets.test.ts` - afterEach 添加 initializeDefaultRepository

---

### 问题 4: 应用创建 Schema 与 Fixture 不匹配（API 一致性问题）

**严重程度**: 🟡 中

**问题描述**:
- `applicationSchema` (Zod) 要求 `ports` 字段为数组: `[{host, container}]`
- 测试 fixture 使用旧的单字段格式: `port` 和 `containerPort`
- Schema 变更但 fixture 没有同步更新
- 导致测试创建应用时 Zod 验证失败: `expected array, received undefined`

**错误信息**:
```json
{
  "expected": "array",
  "code": "invalid_type",
  "path": ["ports"],
  "message": "Invalid input: expected array, received undefined"
}
```

**原始 Fixture**:
```typescript
// ❌ 旧格式
export function createTestApplication(overrides?: {
  port: number;           // 单个 port
  containerPort: number;  // 单个 containerPort
}) {
  return {
    name: 'test-app',
    image: 'nginx',
    port: 9080,          // ❌ Schema 不接受
    containerPort: 80,   // ❌ Schema 不接受
  };
}
```

**修复**:
```typescript
// ✅ 新格式（向后兼容）
export function createTestApplication(overrides?: {
  ports?: Array<{ host: number; container: number }>;
  port?: number;          // 保留用于向后兼容
  containerPort?: number; // 保留用于向后兼容
  // ...
}) {
  // 支持新旧两种格式
  const ports = overrides?.ports || [
    {
      host: overrides?.port || 9080,
      container: overrides?.containerPort || 80
    }
  ];
  
  return {
    name: 'test-app',
    image: 'nginx',
    ports,  // ✅ 数组格式
    envVars: overrides?.env || {},
    repositoryId: overrides?.repositoryId || 1,
    ...overrides,
  };
}
```

**API 设计建议**:
1. **Schema 变更时同步更新所有相关代码** (fixtures, docs, tests)
2. **考虑版本化 API** (v1, v2) 避免破坏性变更
3. **提供迁移指南** 当 API 发生不兼容变更时
4. **使用 TypeScript 类型检查** 在编译时捕获不匹配

**修改的文件**:
- `tests/helpers/fixtures.ts` - 更新 createTestApplication

---

## 📝 完整修改清单

### 1. `src/services/envStore.ts`
**修改**:
- ✅ 移除 `projectName` 字段支持
- ✅ `envEntrySchema` 只保留 `projectId`
- ✅ `upsertEnvEntry` 重写为显式 INSERT/UPDATE 逻辑
- ✅ `listEnvEntries` 只接受 `projectId` (number)
- ✅ 移除 `getApplicationByName` 导入

**关键代码变更**:
```typescript
// 1. Schema 简化
const envEntrySchema = z.object({
  scope: z.enum(['global', 'project']),
  projectId: z.number().int().positive().optional(), // 只用 ID
  key: z.string().min(1).max(128),
  // ...
});

// 2. Upsert 重写
export function upsertEnvEntry(input: EnvEntryInput) {
  // 查询是否存在
  let existing: any;
  if (normalized.projectId === null) {
    existing = db.prepare(
      `SELECT id FROM environment_variables 
       WHERE scope = ? AND project_id IS NULL AND key = ?`
    ).get(normalized.scope, normalized.key);
  } else {
    existing = db.prepare(
      `SELECT id FROM environment_variables 
       WHERE scope = ? AND project_id = ? AND key = ?`
    ).get(normalized.scope, normalized.projectId, normalized.key);
  }
  
  // 显式 INSERT 或 UPDATE
  if (existing) {
    db.prepare(`UPDATE environment_variables 
      SET value = ?, value_type = ?, secret_id = ?, description = ?
      WHERE id = ?`).run(..., existing.id);
  } else {
    db.prepare(`INSERT INTO environment_variables(...) VALUES (...)`).run(...);
  }
  
  return { entry: mapRow(row), created: !existing };
}

// 3. List 简化
export function listEnvEntries(
  scope?: 'global' | 'project', 
  projectId?: number  // 只接受 number
): EnvEntry[] {
  // ...
}
```

---

### 2. `src/routes/env.ts`
**修改**:
- ✅ GET `/api/env` 移除 `projectName` 查询参数
- ✅ 只支持 `projectId` 过滤

**代码变更**:
```typescript
router.get('/', (req, res) => {
  const scope = req.query.scope as 'global' | 'project' | undefined;
  const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
  // 移除 projectName 支持
  
  res.json({ success: true, data: listEnvEntries(scope, projectId) });
});
```

---

### 3. `tests/helpers/fixtures.ts`
**修改**:
- ✅ `createTestApplication` 支持 `ports` 数组格式
- ✅ 向后兼容旧的 `port`/`containerPort` 格式
- ✅ `createTestEnvVar` 移除 `projectName`

**代码变更**:
```typescript
export function createTestApplication(overrides?: Partial<{
  ports: Array<{ host: number; container: number }>;
  port: number;  // 向后兼容
  containerPort: number;  // 向后兼容
  // ...
}>) {
  const ports = overrides?.ports || [
    { host: overrides?.port || 9080, container: overrides?.containerPort || 80 }
  ];
  
  return {
    name: 'test-app',
    image: 'nginx',
    version: 'alpine',
    ports,  // 数组格式
    envVars: overrides?.env || {},
    repositoryId: overrides?.repositoryId || 1,
    ...overrides,
  };
}

export function createTestEnvVar(overrides?: Partial<{
  scope: 'global' | 'project';
  projectId: number;  // 只用 ID
  // 移除 projectName
}>) {
  return {
    scope: 'global' as const,
    key: 'TEST_VAR',
    value: 'test-value',
    ...overrides,
  };
}
```

---

### 4. `tests/helpers/apiClient.ts`
**修改**:
- ✅ `listEnvVars` 改为接受 `projectId` (number)

**代码变更**:
```typescript
async listEnvVars(scope?: string, projectId?: number): Promise<Response> {
  const query: Record<string, any> = {};
  if (scope) query.scope = scope;
  if (projectId) query.projectId = projectId;  // 只用 projectId
  return this.get('/api/env', query);
}
```

---

### 5. `tests/integration/secrets.test.ts`
**修改**:
- ✅ 所有创建应用的测试使用唯一名称（避免冲突）
- ✅ 所有环境变量操作使用 `projectId` 而非 `projectName`
- ✅ `afterEach` 添加 `initializeDefaultRepository()`
- ✅ 修复 `projectName` 断言使用实际的应用名称

**关键变更**:
```typescript
// 1. afterEach 重新初始化
afterEach(async () => {
  const { getDb } = require('../../dist/services/database');
  const { initializeDefaultRepository } = require('../../dist/services/repositoryStore');
  const db = getDb();
  
  // ... 清空表
  
  initializeDefaultRepository();  // ✅ 重新初始化
  
  db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
});

// 2. 使用唯一名称
const timestamp = Date.now();
const appName = `test-app-${timestamp}`;
const appResponse = await client.createApplication(
  createTestApplication({ name: appName, port: 9080 + Math.floor(Math.random() * 1000) })
);

// 3. 使用 projectId
const projectId = appResponse.body.data?.id;
await client.createEnvVar(createTestEnvVar({ 
  scope: 'project', 
  projectId,  // ✅ 只用 ID
  key: 'PROJECT_VAR' 
}));

// 4. 修复断言
expect(response.body.data.projectName).toBe(appName);  // 使用实际名称
```

---

## 🎯 测试结果

**最终结果**: ✅ 24/24 通过 (100%)

**测试覆盖**:
- ✅ 创建全局/项目环境变量
- ✅ 列出和过滤环境变量
- ✅ 更新和删除环境变量
- ✅ Upsert 操作（创建/更新）
- ✅ 秘钥引用
- ✅ 优先级（项目覆盖全局）
- ✅ 认证和授权

---

## 💡 经验教训

### 1. **数据库设计原则**
- ✅ 使用 ID 作为唯一标识符，不要用 Name
- ✅ 注意 NULL 值在约束中的特殊处理
- ✅ 考虑使用部分索引处理 NULL 场景

### 2. **测试最佳实践**
- ✅ 测试数据清理要彻底，包括重新初始化基础数据
- ✅ 使用唯一标识符（如时间戳）避免测试数据冲突
- ✅ SQLite WAL 模式需要显式 checkpoint

### 3. **API 设计一致性**
- ✅ Schema 变更时同步更新所有相关代码
- ✅ 提供向后兼容或清晰的迁移路径
- ✅ 使用 TypeScript 类型系统在编译时捕获不一致

### 4. **Zod Schema 验证**
- ✅ 确保 Schema 与实际使用匹配
- ✅ 提供清晰的错误信息
- ✅ 考虑使用 Schema.parse() 在开发时捕获问题

---

## 🔄 建议的进一步优化

### 1. 数据库层面
```sql
-- 使用部分索引解决 NULL 唯一性问题
CREATE UNIQUE INDEX idx_env_global 
ON environment_variables(scope, key) 
WHERE project_id IS NULL;

CREATE UNIQUE INDEX idx_env_project 
ON environment_variables(scope, project_id, key) 
WHERE project_id IS NOT NULL;
```

### 2. 代码层面
```typescript
// 考虑使用 Repository 模式封装数据库操作
class EnvVarRepository {
  upsert(input: EnvEntryInput): { entry: EnvEntry; created: boolean } {
    // 封装复杂的 UPSERT 逻辑
  }
  
  findByProjectId(projectId: number): EnvEntry[] {
    // ...
  }
}
```

### 3. 测试层面
```typescript
// 考虑使用测试 fixtures 管理器
class TestFixtureManager {
  private createdApps: number[] = [];
  
  async createApp(data?: Partial<Application>): Promise<Application> {
    const app = await createApplication(data);
    this.createdApps.push(app.id);
    return app;
  }
  
  async cleanup(): Promise<void> {
    // 只清理本次测试创建的数据
    for (const id of this.createdApps) {
      await deleteApplication(id);
    }
  }
}
```

