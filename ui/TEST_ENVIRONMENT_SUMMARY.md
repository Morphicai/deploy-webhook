# 测试环境配置总结

## ✅ 已完成的配置

### 1. 数据库隔离 ✅

| 环境 | 数据库路径 | 端口 | 环境变量 |
|-----|-----------|------|---------|
| **开发** | `backend/data/deploy-webhook.db` | 9000 | `NODE_ENV=development` |
| **测试** | `backend/data/test/deploy-webhook.db` | 9001 | `NODE_ENV=test` |

**实现方式：**
- 通过 `DB_PATH` 环境变量指定数据库路径
- 测试模式自动使用 `./data/test` 目录
- 测试前后自动清理测试数据库

### 2. Playwright 配置 ✅

**文件：** `ui/playwright.config.ts`

**关键配置：**
```typescript
{
  globalSetup: './e2e/global-setup.ts',      // 测试前清理数据库
  globalTeardown: './e2e/global-teardown.ts', // 测试后清理数据库
  
  webServer: [
    {
      // 前端：指向测试后端
      command: 'VITE_API_BASE_URL=http://localhost:9001 npm run dev',
      port: 5173,
      env: { VITE_API_BASE_URL: 'http://localhost:9001' }
    },
    {
      // 后端：测试模式
      command: 'cd ../backend && NODE_ENV=test PORT=9001 DB_PATH=./data/test npm run dev',
      port: 9001,
      env: {
        NODE_ENV: 'test',
        PORT: '9001',
        DB_PATH: './data/test'
      }
    }
  ]
}
```

### 3. 全局 Setup/Teardown ✅

**Setup (测试前)：**
- 清理测试数据库 (`backend/data/test/`)
- 清理测试容器 (`docker ps -a --filter "name=test-"`)
- 设置环境变量

**Teardown (测试后)：**
- 清理测试数据库（可通过 `KEEP_TEST_DB=true` 保留）
- 清理测试容器

### 4. 测试流程优化 ✅

**从注册开始测试：**
```typescript
test.beforeEach(async ({ page }) => {
  // 1. 清理浏览器存储
  await cleanupTestData(page);
  
  // 2. 注册新用户（确保数据库为空）
  await register(page, 'testuser', 'test@example.com', 'Test123456!');
});
```

## 🚀 运行测试

### 快速开始

```bash
cd ui
npm run test:e2e
```

### 手动启动（推荐调试）

```bash
# 终端 1: 后端测试模式
cd backend
NODE_ENV=test PORT=9001 DB_PATH=./data/test npm run dev

# 终端 2: 前端（指向测试后端）
cd ui
VITE_API_BASE_URL=http://localhost:9001 npm run dev

# 终端 3: 运行测试
cd ui
npm run test:e2e
```

### 调试模式

```bash
# UI 模式（可视化）
npm run test:e2e:ui

# Debug 模式（逐步）
npm run test:e2e:debug

# 保留测试数据库
KEEP_TEST_DB=true npm run test:e2e
```

## 🎯 关键改进点

### ✅ 问题 1: 测试模式启动
- **之前**: 后端以开发模式启动（`npm run dev`）
- **现在**: 后端以测试模式启动（`NODE_ENV=test npm run dev`）

### ✅ 问题 2: 数据库隔离
- **之前**: 测试和开发共用同一数据库
- **现在**: 测试使用独立的 `data/test/` 数据库

### ✅ 问题 3: 端口冲突
- **之前**: 测试和开发共用 9000 端口
- **现在**: 测试使用 9001 端口，与开发端口隔离

### ✅ 问题 4: 数据清理
- **之前**: 手动清理，容易遗漏
- **现在**: 自动清理（测试前后）

### ✅ 问题 5: 测试用户
- **之前**: 假设 admin 用户存在
- **现在**: 每个测试前注册新用户

## 📋 测试检查清单

运行测试前检查：

- [ ] Docker 服务正在运行
- [ ] 端口 5173 和 9001 未被占用
- [ ] 没有运行开发模式的后端（端口 9000）
- [ ] 测试数据库已清理（或由 global-setup 自动清理）

运行测试后检查：

- [ ] 测试全部通过
- [ ] 测试数据库已清理（或查看 `data/test/` 用于调试）
- [ ] 测试容器已清理
- [ ] 没有遗留的测试数据

## 🐛 故障排除

### 端口被占用

```bash
# 查看占用端口的进程
lsof -i :9001

# 杀死进程
kill -9 <PID>
```

### 数据库锁定

```bash
# 清理 WAL 文件
rm backend/data/test/*.db-wal
rm backend/data/test/*.db-shm
```

### 测试容器清理

```bash
# 清理所有测试容器
docker ps -a --filter "name=test-" -q | xargs docker rm -f
```

### 完全重置

```bash
# 停止所有服务
pkill -f "npm run dev"

# 清理测试数据
cd backend
./scripts/cleanup-testing.sh

# 重新运行测试
cd ../ui
npm run test:e2e
```

## 📚 相关文档

- [E2E_TESTING_GUIDE.md](./E2E_TESTING_GUIDE.md) - 完整测试指南
- [E2E_TEST_STRATEGY.md](./E2E_TEST_STRATEGY.md) - 测试策略说明
- [RUN_E2E_TESTS.md](./RUN_E2E_TESTS.md) - 快速运行指南

## 🎓 下一步

1. ✅ 运行注册测试
2. ✅ 运行登录测试
3. ⏳ 实现环境变量测试
4. ⏳ 实现秘钥管理测试
5. ⏳ 实现应用部署测试

---

**配置完成日期**: 2025-10-24
**配置状态**: ✅ 完成并经过验证

