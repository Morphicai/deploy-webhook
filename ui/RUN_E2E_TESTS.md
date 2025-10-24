# 运行 E2E 测试 - 快速指南 🚀

## ⚡ 3步快速启动

### Step 1: 启动后端（Terminal 1）

```bash
cd /Users/pengzai/www/morphicai/deploy-webhook/backend
npm run dev
```

**等待看到**: `Server running on port 3000`

---

### Step 2: 启动前端（Terminal 2）

```bash
cd /Users/pengzai/www/morphicai/deploy-webhook/ui
npm run dev
```

**等待看到**: `Local: http://localhost:5173/`

---

### Step 3: 运行测试（Terminal 3）

```bash
cd /Users/pengzai/www/morphicai/deploy-webhook/ui

# 方式 1: 命令行模式（快速查看结果）
npm run test:e2e

# 方式 2: UI 模式（可视化，推荐）
npm run test:e2e:ui

# 方式 3: 调试模式
npm run test:e2e:debug

# 方式 4: 只运行登录测试
npx playwright test e2e/auth/login.spec.ts
```

---

## 📊 预期结果

如果一切正常，你应该看到：

```
Running 8 tests using 1 worker

  ✓ e2e/auth/login.spec.ts:6:3 › 用户登录 › 用户登录成功流程 (5s)
  ✓ e2e/auth/login.spec.ts:27:3 › 用户登录 › 登录失败 - 错误的用户名密码 (3s)
  ✓ e2e/auth/login.spec.ts:42:3 › 用户登录 › 登录表单验证 - 空用户名 (2s)
  ✓ e2e/auth/login.spec.ts:52:3 › 用户登录 › 登录表单验证 - 空密码 (2s)
  ✓ e2e/auth/login.spec.ts:62:3 › 用户登录 › 记住我功能 (3s)
  ✓ e2e/auth/login.spec.ts:81:3 › 用户登录 › 登出功能 (4s)
  ✓ e2e/auth/login.spec.ts:97:3 › 用户登录 › 自动跳转 - 已登录用户访问登录页 (3s)
  ✓ e2e/auth/login.spec.ts:108:3 › 用户登录 › 未登录访问受保护页面 (2s)

  8 passed (24s)
```

---

## 🐛 常见问题

### Q1: 后端启动失败

**检查**:
```bash
cd backend
npm install
npm run dev
```

### Q2: 前端启动失败

**检查**:
```bash
cd ui
npm install
npm run dev
```

### Q3: 端口被占用

**查看端口占用**:
```bash
lsof -i :3000  # 后端
lsof -i :5173  # 前端
```

**杀死占用进程**:
```bash
kill -9 <PID>
```

### Q4: 测试超时

**原因**: 服务未启动或启动慢

**解决**: 确保前后端都在运行，并等待完全启动后再运行测试

---

## 📝 测试命令速查

```bash
# 运行所有测试
npm run test:e2e

# 运行特定文件
npx playwright test e2e/auth/login.spec.ts

# 运行特定测试
npx playwright test -g "用户登录成功"

# UI 模式（可视化）
npm run test:e2e:ui

# 调试模式（逐步执行）
npm run test:e2e:debug

# 显示浏览器（非 headless）
npx playwright test --headed

# 查看测试报告
npx playwright show-report
```

---

## ✅ 检查清单

在运行测试前，确保：

- [ ] 后端服务在运行 (`http://localhost:3000`)
- [ ] 前端服务在运行 (`http://localhost:5173`)
- [ ] 可以在浏览器访问 `http://localhost:5173`
- [ ] 后端 API 可以访问 `http://localhost:3000/health`

---

## 🎯 下一步

测试通过后：

1. ✅ 查看测试报告
2. ⏳ 创建环境变量测试
3. ⏳ 创建更多测试用例

---

**创建日期**: 2025-10-24  
**当前测试**: 8 个登录测试  
**状态**: ✅ Ready to Run

