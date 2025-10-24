# E2E 测试完整指南

## 🎯 测试环境隔离

### ✅ 数据库隔离

- **开发模式**: `backend/data/deploy-webhook.db` (端口 9000)
- **测试模式**: `backend/data/test/deploy-webhook.db` (端口 9001)

### ✅ 服务器隔离

| 模式 | 前端端口 | 后端端口 | 数据库路径 | 环境变量 |
|------|---------|---------|-----------|---------|
| 开发 | 5173 | 9000 | `./data` | `NODE_ENV=development` |
| 测试 | 5173 | 9001 | `./data/test` | `NODE_ENV=test` |

## 🚀 运行测试的两种方式

### 方式 1: 自动启动服务（推荐新手）

Playwright 会自动启动前后端服务并运行测试：

```bash
cd ui
npm run test:e2e
```

**特点：**
- ✅ 一条命令完成所有操作
- ✅ 自动清理测试数据库
- ✅ 自动以测试模式启动后端
- ⚠️ 如果已有服务运行会复用（可能导致混淆）

### 方式 2: 手动启动服务（推荐调试）

分别启动前后端服务，然后运行测试：

```bash
# 终端 1: 启动后端（测试模式）
cd backend
NODE_ENV=test PORT=9001 DB_PATH=./data/test npm run dev

# 终端 2: 启动前端（指向测试后端）
cd ui
VITE_API_BASE_URL=http://localhost:9001 npm run dev

# 终端 3: 运行测试
cd ui
npm run test:e2e
```

**特点：**
- ✅ 更容易调试
- ✅ 可以看到服务器日志
- ✅ 可以手动清理数据库
- ⚠️ 需要管理多个终端

## 🧪 测试数据流程

### 测试前（Global Setup）

1. 清理测试数据库 (`backend/data/test/`)
2. 清理测试 Docker 容器 (`test-*`)
3. 设置环境变量

### 每个测试前（beforeEach）

1. 清理浏览器存储（localStorage, sessionStorage）
2. 注册新的测试用户
3. 准备测试数据

### 每个测试后（afterEach）

1. 可选：清理测试数据
2. 可选：截图（失败时）

### 测试后（Global Teardown）

1. 清理测试数据库（可选，通过 `KEEP_TEST_DB` 控制）
2. 清理测试 Docker 容器

## 🔧 环境变量配置

### 后端测试环境变量

在 `backend/tests/setup/testSetup.ts` 中自动设置：

```typescript
NODE_ENV=test
PORT=9001
TEST_PORT=9001
DB_PATH=./data/test
WEBHOOK_SECRET=test-webhook-secret-123456
ADMIN_TOKEN=test-admin-token-789012
```

### 前端测试环境变量

在 Playwright 启动前端时自动设置：

```bash
VITE_API_BASE_URL=http://localhost:9001
```

## 📊 测试命令

```bash
# 运行所有测试
npm run test:e2e

# 运行特定测试文件
npx playwright test e2e/auth/register.spec.ts

# 运行特定测试套件
npx playwright test e2e/auth/

# UI 模式（可视化调试）
npm run test:e2e:ui

# Debug 模式（逐步调试）
npm run test:e2e:debug

# 仅运行失败的测试
npx playwright test --last-failed

# 生成测试报告
npx playwright show-report
```

## 🐛 调试技巧

### 1. 保留测试数据库

```bash
KEEP_TEST_DB=true npm run test:e2e
```

测试完成后可以检查 `backend/data/test/deploy-webhook.db`

### 2. 查看浏览器操作

```bash
npm run test:e2e:ui
```

### 3. 单步调试

```bash
npm run test:e2e:debug
```

### 4. 查看失败截图

测试失败时自动保存在 `test-results/` 目录

### 5. 查看服务器日志

使用方式 2（手动启动服务）可以实时查看日志

## 🧹 清理测试环境

### 手动清理测试数据库

```bash
cd backend
rm -rf data/test/*
```

### 使用清理脚本

```bash
cd backend
./scripts/cleanup-testing.sh
```

### 清理测试容器

```bash
docker ps -a --filter "name=test-" -q | xargs docker rm -f
```

## ✅ 测试最佳实践

### 1. 测试隔离

- ✅ 每个测试独立运行
- ✅ 不依赖其他测试的状态
- ✅ 使用唯一的测试数据

### 2. 测试数据准备

```typescript
test.beforeEach(async ({ page }) => {
  // 清理浏览器存储
  await cleanupTestData(page);
  
  // 注册测试用户
  await register(page, 'testuser', 'test@example.com', 'Test123456!');
});
```

### 3. 测试用户命名

使用唯一的用户名避免冲突：

```typescript
const username = `testuser_${Date.now()}`;
```

### 4. 等待策略

优先使用：
- `await expect(page).toHaveURL('/path')`
- `await expect(element).toBeVisible()`

避免使用：
- `await page.waitForTimeout(5000)` // 固定等待

### 5. 错误处理

```typescript
test('should handle errors', async ({ page }) => {
  // 验证错误消息
  await expect(page.locator('text=/错误|Error/i')).toBeVisible();
  
  // 验证仍在当前页
  await expect(page).toHaveURL(/.*current-page/);
});
```

## 🔍 常见问题

### Q1: 测试失败提示端口被占用

**A:** 检查是否有其他服务占用了 9001 端口：

```bash
lsof -i :9001
kill -9 <PID>
```

### Q2: 测试失败提示数据库锁定

**A:** 确保测试前清理了 WAL 文件：

```bash
rm backend/data/test/*.db-wal
rm backend/data/test/*.db-shm
```

### Q3: 前端调用的是开发模式后端

**A:** 确保设置了 `VITE_API_BASE_URL` 环境变量：

```bash
VITE_API_BASE_URL=http://localhost:9001 npm run dev
```

### Q4: 测试用户注册失败

**A:** 检查后端是否以测试模式启动：

```bash
# 应该看到
NODE_ENV=test
PORT=9001
Database path: ./data/test
```

## 📝 测试覆盖清单

### ✅ 已完成

- [x] 用户注册（6 个测试）
- [x] 用户登录（8 个测试）

### ⏳ 进行中

- [ ] 环境变量管理（10 个测试）
- [ ] 秘钥管理（12 个测试）
- [ ] 应用部署（15 个测试）
- [ ] 配置管理（12 个测试）
- [ ] 综合场景（10 个测试）

## 🎓 学习资源

- [Playwright 官方文档](https://playwright.dev/docs/intro)
- [测试最佳实践](https://playwright.dev/docs/best-practices)
- [调试指南](https://playwright.dev/docs/debug)

