# 第二层测试进展 - Secret Groups (V2)

## 📊 当前状态

**测试文件：** `tests/integration/secrets.test.ts` - Secret Groups  
**进展：** 3 通过 / 2 失败（进行中）  
**问题：** 数据库测试隔离

---

## ✅ 已完成的修复

### 1. 数据库 Schema 修复 ✅
**问题：** `SqliteError: no such column: group_id`

**原因：** `secret_groups` 表定义不完整，缺少 `provider_id` 和 `auto_sync` 字段

**修复：**
```sql
CREATE TABLE IF NOT EXISTS secret_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  provider_id INTEGER,
  auto_sync INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (provider_id) REFERENCES secret_providers(id) ON DELETE SET NULL
);
```

**文件：** `backend/src/services/database.ts`

---

### 2. API 响应状态码修复 ✅
**问题：**
- 创建资源时返回 200 而不是 201
- 删除关联分组时返回 400 而不是 409

**修复：**
```typescript
// 创建成功返回 201
res.status(201).json({ success: true, data: group, ... });

// 冲突返回 409
if (error.message.includes('Cannot delete')) {
  return res.status(409).json({ success: false, error: error.message });
}
```

**文件：** `backend/src/routes/secretGroups.ts`

---

### 3. 测试预期调整 ✅
**问题：** 测试预期状态码不正确

**修复：**
- 创建分组：`200` → `201`
- 删除关联分组：`400` → `409`

---

## ✅ 通过的测试（3个）

1. ✅ 应该成功创建秘钥分组
2. ✅ 应该能够将秘钥关联到分组
3. ✅ 应该拒绝删除有关联秘钥的分组

---

## 🔴 当前问题：测试隔离

### 失败的测试（2个）

4. ❌ 应该能够获取秘钥分组列表
5. ❌ 应该能够按分组过滤秘钥

### 问题现象

**单独运行时：** ✅ 两个测试都通过  
**一起运行时：** ❌ 两个测试都失败

**日志分析：**
```
[Test] Cleaned 14 tables, before: 1 rows, deleted: 1 rows    <- 第一次 beforeEach
[Test] Cleaned 14 tables, before: 0 rows, deleted: 0 rows    <- 第二次 beforeEach
[Test] Cleaned 14 tables, before: 0 rows, deleted: 0 rows    <- 第三次 beforeEach

[Test] Initial groups: 1                                      <- 但测试开始时有1个分组！
[Test] After creating 2, got: 3                               <- 预期2个，实际3个
[Test] Group names: database-secrets, group-1, group-2
```

### 根本原因

**beforeEach 看不到测试创建的数据！**

- 第一个测试创建了 "database-secrets"
- beforeEach 查询显示 `before: 0 rows`（看不到）
- 但是第二个测试查询时却能看到 "database-secrets"

**可能原因：**
1. 数据在事务中，还没有提交
2. SQLite WAL 模式的读写隔离
3. better-sqlite3 的缓存机制

---

## 🔧 已尝试的解决方案

### 方案 1：使用应用的数据库实例 ❌
```typescript
const { getDb } = require('../../dist/services/database');
const db = getDb();
```
**结果：** 失败，仍然看不到数据

### 方案 2：添加 WAL Checkpoint ❌
```typescript
db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
// 删除操作
db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
```
**结果：** 失败，仍然看不到数据

### 方案 3：查询验证 ❌
```typescript
const countResult = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
// 显示 count = 0，但数据实际存在
```
**结果：** 确认了问题 - beforeEach 确实看不到测试创建的数据

---

## 🤔 可能的解决方案

### 方案 A：使用 `beforeAll` 而不是 `beforeEach`
只在所有测试开始前清理一次，每个测试使用唯一的名称避免冲突

**优点：** 简单  
**缺点：** 测试不独立，失去隔离性

### 方案 B：在每个测试结束后清理 (`afterEach`)
```typescript
afterEach(async () => {
  // 清理当前测试创建的数据
});
```

**优点：** 可能能看到数据  
**缺点：** 需要追踪每个测试创建了什么

### 方案 C：强制同步数据库写入
```typescript
db.exec('PRAGMA synchronous = FULL');
db.exec('PRAGMA journal_mode = DELETE');  // 禁用 WAL
```

**优点：** 强制立即写入  
**缺点：** 可能影响性能，且可能不兼容现有代码

### 方案 D：重新创建数据库连接
在 beforeEach 中关闭并重新打开数据库连接

**优点：** 强制刷新状态  
**缺点：** 复杂，可能影响应用状态

### 方案 E：使用唯一的测试数据名称
每个测试使用不同的名称（如 `group-1-test1`, `group-2-test2`）

**优点：** 简单，避免冲突  
**缺点：** 治标不治本，没有解决根本问题

---

## 📝 建议

**推荐方案：** 方案 B（afterEach）+ 方案 E（唯一名称）

1. 使用 `afterEach` 清理数据，因为那时数据已经被写入
2. 同时使用唯一的测试数据名称作为额外保护
3. 如果还不行，考虑方案 C（禁用 WAL）

---

## 📊 整体进展

| 层级 | 模块 | 通过 | 失败 | 状态 |
|------|------|------|------|------|
| 第一层 | 认证授权 (auth.test.ts) | 16 | 0 | ✅ 100% |
| 第二层 | Secret Groups | 3 | 2 | 🔄 60% |

**下一步：** 解决测试隔离问题，完成第二层测试

---

**更新时间：** 2025-10-23 08:25  
**状态：** 🔄 进行中

