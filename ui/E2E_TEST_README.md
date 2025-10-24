# E2E 测试使用指南 🧪

## ✅ 已完成的设置

### 安装的工具
- ✅ Playwright Test
- ✅ Chromium 浏览器

### 创建的文件
- ✅ `playwright.config.ts` - Playwright 配置
- ✅ `e2e/utils/helpers.ts` - 测试辅助函数
- ✅ `e2e/auth/login.spec.ts` - 登录测试（8个测试）

### 测试目录结构
```
e2e/
├── auth/          # 认证测试
│   └── login.spec.ts (8 tests) ✅
├── environment/   # 环境变量测试
├── secrets/       # 秘钥管理测试
├── applications/  # 应用部署测试
├── repositories/  # 镜像仓库测试
├── webhooks/      # Webhook 管理测试
├── apikeys/       # API 密钥测试
├── scenarios/     # 综合场景测试
└── utils/         # 辅助函数
    └── helpers.ts
```

---

## 🚀 如何运行测试

### 前提条件

**重要**: 运行测试前，必须确保前后端服务都在运行！

#### Terminal 1: 启动后端
```bash
cd /Users/pengzai/www/morphicai/deploy-webhook/backend
npm run dev

# 等待看到: Server running on port 3000
```

#### Terminal 2: 启动前端
```bash
cd /Users/pengzai/www/morphicai/deploy-webhook/ui
npm run dev

# 等待看到: Local: http://localhost:5173/
```

### 运行测试

#### Terminal 3: 运行 E2E 测试

```bash
cd /Users/pengzai/www/morphicai/deploy-webhook/ui

# 方式 1: UI 模式（推荐 - 可视化调试）⭐
npm run test:e2e:ui

# 方式 2: 命令行模式
npm run test:e2e

# 方式 3: 调试模式
npm run test:e2e:debug

# 运行特定测试文件
npx playwright test e2e/auth/login.spec.ts

# 运行特定测试
npx playwright test -g "用户登录成功"
```

---

## 📊 当前测试状态

| 模块 | 状态 | 测试数 | 文件 |
|------|------|--------|------|
| **认证流程** | ✅ 已创建 | 8 | `e2e/auth/login.spec.ts` |
| 环境变量 | ⏳ 待创建 | 0 | - |
| 秘钥管理 | ⏳ 待创建 | 0 | - |
| 应用部署 | ⏳ 待创建 | 0 | - |
| 配置管理 | ⏳ 待创建 | 0 | - |
| 综合场景 | ⏳ 待创建 | 0 | - |

**总进度**: 8/77 测试已创建 (10%)

---

## 🧪 已创建的测试用例

### 认证流程 (8个测试)

1. ✅ 用户登录成功流程
2. ✅ 登录失败 - 错误的用户名密码
3. ✅ 登录表单验证 - 空用户名
4. ✅ 登录表单验证 - 空密码
5. ✅ 记住我功能
6. ✅ 登出功能
7. ✅ 自动跳转 - 已登录用户访问登录页
8. ✅ 未登录访问受保护页面 - 自动跳转到登录页

---

## 🔧 可用的辅助函数

已在 `e2e/utils/helpers.ts` 中创建：

```typescript
// 登录
await login(page, 'admin', 'password');

// 登出
await logout(page);

// 清理测试数据
await cleanupTestData(page);

// 等待元素可见
await waitForElement(page, 'text=成功');

// 填写表单
await fillForm(page, {
  username: 'admin',
  password: 'password'
});

// 提交表单
await submitForm(page, '提交');

// 验证成功/错误提示
await expectSuccessMessage(page, '创建成功');
await expectErrorMessage(page, '创建失败');

// 获取表格行
const row = getTableRow(page, 'test-app');
```

---

## 📝 下一步计划

### Week 1: 认证 + 环境变量 (5天)

**Day 1-2**: ✅ 认证流程测试已完成
- [x] 用户登录/注册
- [x] Token 管理
- [x] 权限验证

**Day 3-4**: ⏳ 环境变量测试
- [ ] 创建全局环境变量
- [ ] 创建项目环境变量
- [ ] 删除环境变量
- [ ] 按项目过滤

**Day 5**: 回顾和优化

### Week 2-4: 其他模块

详见 `UI_E2E_TEST_PLAN.md`

---

## 🐛 常见问题

### Q1: 测试运行失败 - "Cannot find module"

**解决**: 确保已安装所有依赖
```bash
npm install
```

### Q2: 测试超时

**解决**: 确保前后端服务都在运行
```bash
# 检查端口
lsof -i :3000  # 后端
lsof -i :5173  # 前端
```

### Q3: 浏览器未安装

**解决**: 重新安装浏览器
```bash
npx playwright install chromium
```

### Q4: 测试一直 pending

**解决**: 检查 `playwright.config.ts` 中的 webServer 配置，确保端口正确

---

## 📚 相关文档

- **完整测试计划**: `UI_E2E_TEST_PLAN.md`
- **快速启动指南**: `UI_E2E_QUICK_START.md`
- **策略总结**: `UI_TEST_STRATEGY_SUMMARY.md`
- **本文档**: `E2E_TEST_README.md`

---

## ✨ 测试最佳实践

### 1. 测试隔离

每个测试应该独立：

```typescript
test.beforeEach(async ({ page }) => {
  await cleanupTestData(page);
  await login(page);
});
```

### 2. 明确等待

避免固定延迟，使用明确等待：

```typescript
// ❌ Bad
await page.waitForTimeout(3000);

// ✅ Good
await expect(page.locator('text=成功')).toBeVisible({ timeout: 10000 });
```

### 3. 语义化选择器

```typescript
// ✅ Good
await page.click('button:has-text("部署")');
await page.getByRole('button', { name: '部署' }).click();

// ⚠️ OK
await page.click('[data-testid="deploy-button"]');

// ❌ Bad
await page.click('.btn.btn-primary');
```

---

## 🎯 下一步行动

### 立即可以做的

1. ✅ 运行已创建的登录测试
```bash
npm run test:e2e:ui
```

2. ⏳ 查看测试结果和报告

3. ⏳ 开始创建环境变量测试

### 本周计划

- 完成环境变量测试（10 tests）
- 开始秘钥管理测试

---

**创建日期**: 2025-10-24  
**当前状态**: ✅ Phase 1 完成，8个测试已创建  
**下一步**: 运行测试并创建环境变量测试

