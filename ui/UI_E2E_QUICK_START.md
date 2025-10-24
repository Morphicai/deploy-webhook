# UI E2E 测试快速启动指南 ⚡

## 🎯 10分钟快速开始

### Step 1: 安装 Playwright (2分钟)

```bash
cd /Users/pengzai/www/morphicai/deploy-webhook/ui

# 安装 Playwright
npm install -D @playwright/test

# 安装浏览器
npx playwright install chromium
```

### Step 2: 创建配置文件 (3分钟)

**创建文件**: `playwright.config.ts`

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 2,
  
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  
  webServer: [
    {
      command: 'npm run dev',
      port: 5173,
      reuseExistingServer: true,
    },
    {
      command: 'cd ../backend && npm run dev',
      port: 3000,
      reuseExistingServer: true,
    }
  ],
  
  projects: [
    {
      name: 'chromium',
      use: { channel: 'chrome' },
    },
  ],
});
```

### Step 3: 创建目录结构 (1分钟)

```bash
mkdir -p e2e/auth
mkdir -p e2e/utils
```

### Step 4: 创建辅助函数 (2分钟)

**文件**: `e2e/utils/helpers.ts`

```typescript
import { Page } from '@playwright/test';

export async function login(
  page: Page,
  username = 'admin',
  password = 'password'
) {
  await page.goto('/login');
  await page.fill('[name="username"]', username);
  await page.fill('[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}
```

### Step 5: 创建第一个测试 (2分钟)

**文件**: `e2e/auth/login.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { login } from '../utils/helpers';

test('用户登录成功', async ({ page }) => {
  await login(page);
  
  // 验证登录成功
  await expect(page).toHaveURL('/');
  await expect(page.locator('text=admin')).toBeVisible();
});
```

### Step 6: 运行测试 (即刻)

```bash
# 确保后端和前端都在运行
# Terminal 1: cd backend && npm run dev
# Terminal 2: cd ui && npm run dev

# Terminal 3: 运行测试
cd ui
npx playwright test

# 或使用 UI 模式（推荐）
npx playwright test --ui
```

---

## 🎯 测试策略总结

### 测试比重

```
📊 E2E 测试: 80% (重点)
├── 认证流程 (10%)
├── 环境变量 (10%)
├── 秘钥管理 (15%)
├── 应用部署 (20%)
├── 配置管理 (15%)
└── 综合场景 (15%)

📝 单元测试: 5% (少量)
└── 工具函数测试

🧪 集成测试: 15% (可选)
```

### 核心原则

1. ✅ **真实请求** - 连接真实后端 API
2. ✅ **用户视角** - 测试真实用户操作
3. ✅ **端到端** - 测试完整业务流程
4. ✅ **最少模拟** - 避免 Mock，使用真实环境

---

## 📋 完整测试计划

### 按优先级分层

#### 🔴 P0 - 必须完成 (10天)

1. **认证流程** (2天)
   - 用户登录/注册
   - Token 管理
   - 权限验证

2. **环境变量** (2天)
   - 创建/删除全局变量
   - 创建/删除项目变量
   - 引用秘钥

3. **应用部署** (4天)
   - 创建应用
   - 部署/启动/停止
   - 查看日志
   - Webhook 配置

4. **秘钥管理** (3天)
   - 秘钥分组
   - CRUD 操作
   - 加密显示

#### 🟡 P1 - 应该完成 (5天)

5. **配置管理** (3天)
   - 镜像仓库
   - Webhook 管理
   - API 密钥

6. **综合场景** (3天)
   - 完整部署流程
   - 多环境部署
   - 配置更新

#### 🟢 P2 - 可以完成 (3天)

7. **单元测试** (1天)
   - 工具函数
   - 纯函数逻辑

8. **优化和文档** (2天)
   - 测试稳定性
   - CI/CD 集成

---

## 🎯 测试模板

### 基础测试模板

```typescript
import { test, expect } from '@playwright/test';
import { login } from '../utils/helpers';

test.describe('功能模块', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('测试用例描述', async ({ page }) => {
    // 1. 导航
    await page.click('text=菜单');
    
    // 2. 操作
    await page.click('button:has-text("操作")');
    await page.fill('[name="field"]', 'value');
    await page.click('button[type="submit"]');
    
    // 3. 验证
    await expect(page.locator('text=成功')).toBeVisible();
  });
});
```

### CRUD 测试模板

```typescript
test.describe('资源管理', () => {
  test('创建资源', async ({ page }) => {
    await page.click('button:has-text("创建")');
    await page.fill('[name="name"]', 'test-resource');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=创建成功')).toBeVisible();
  });

  test('查看资源列表', async ({ page }) => {
    await expect(page.locator('text=test-resource')).toBeVisible();
  });

  test('更新资源', async ({ page }) => {
    const row = page.locator('tr:has-text("test-resource")');
    await row.locator('button:has-text("编辑")').click();
    await page.fill('[name="name"]', 'updated-resource');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=更新成功')).toBeVisible();
  });

  test('删除资源', async ({ page }) => {
    const row = page.locator('tr:has-text("test-resource")');
    await row.locator('button:has-text("删除")').click();
    await page.click('button:has-text("确认")');
    await expect(page.locator('text=删除成功')).toBeVisible();
  });
});
```

---

## 🚀 常用命令

```bash
# 运行所有测试
npx playwright test

# UI 模式（推荐 - 可视化调试）
npx playwright test --ui

# 调试单个测试
npx playwright test --debug

# 运行特定文件
npx playwright test e2e/auth/login.spec.ts

# 运行特定测试
npx playwright test -g "用户登录"

# 查看报告
npx playwright show-report

# 生成代码（录制测试）
npx playwright codegen http://localhost:5173
```

---

## 📊 实施时间表

### Week 1: 基础 + 认证 (5天)

**Day 1-2**: 
- ✅ 安装配置 Playwright
- ✅ 创建辅助函数
- ✅ 认证流程测试 (8 tests)

**Day 3-4**: 
- ✅ 环境变量测试 (10 tests)

**Day 5**: 
- ✅ 回顾和优化

### Week 2: 核心功能 (5天)

**Day 1-3**: 
- ✅ 秘钥管理测试 (12 tests)

**Day 4-5**: 
- ✅ 应用部署测试 (开始 15 tests)

### Week 3: 应用 + 配置 (5天)

**Day 1-2**: 
- ✅ 应用部署测试 (完成)

**Day 3-5**: 
- ✅ 配置管理测试 (12 tests)

### Week 4: 综合 + 优化 (3天)

**Day 1-2**: 
- ✅ 综合场景测试 (10 tests)

**Day 3**: 
- ✅ 优化和文档

**总计**: 18 工作日

---

## 🎯 成功指标

### 定量指标

- [x] 72 个 E2E 测试通过
- [x] 5 个单元测试通过
- [x] 测试执行时间 < 10 分钟
- [x] 失败率 < 1%

### 定性指标

- [x] 所有核心用户流程覆盖
- [x] 真实后端 API 集成
- [x] 测试稳定可靠
- [x] 易于维护和扩展

---

## 💡 最佳实践

### 1. 页面对象模式

```typescript
// e2e/pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async login(username: string, password: string) {
    await this.page.fill('[name="username"]', username);
    await this.page.fill('[name="password"]', password);
    await this.page.click('button[type="submit"]');
  }

  async expectLoginSuccess() {
    await expect(this.page).toHaveURL('/');
  }
}

// 使用
test('登录测试', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('admin', 'password');
  await loginPage.expectLoginSuccess();
});
```

### 2. 测试数据管理

```typescript
// e2e/fixtures/data.ts
export const testUsers = {
  admin: {
    username: 'admin',
    password: 'password',
  },
  user: {
    username: 'testuser',
    password: 'test123',
  },
};

export const testApplications = {
  nginx: {
    name: 'test-nginx',
    image: 'nginx',
    version: 'alpine',
    hostPort: 8080,
    containerPort: 80,
  },
};
```

### 3. 测试隔离

```typescript
test.beforeEach(async ({ page }) => {
  // 清理测试数据
  await cleanupTestData();
  
  // 登录
  await login(page);
});

test.afterEach(async ({ page, context }) => {
  // 清理 cookies 和 storage
  await context.clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});
```

---

## 🐛 故障排查

### 常见问题

**Q1: 测试超时**
```typescript
// 增加超时时间
test('长时间操作', async ({ page }) => {
  // ...
}, { timeout: 60000 }); // 60 秒
```

**Q2: 元素找不到**
```typescript
// 添加明确等待
await page.waitForSelector('text=加载完成', { timeout: 10000 });
```

**Q3: 测试不稳定 (Flaky)**
```typescript
// 使用 auto-waiting
await expect(page.locator('text=内容')).toBeVisible();

// 而不是
await page.waitForTimeout(1000);
```

**Q4: 后端连接失败**
```bash
# 确保后端在运行
cd backend && npm run dev

# 检查端口
lsof -i :3000
```

---

## 📚 资源链接

- [Playwright 官方文档](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [UI E2E 测试完整计划](./UI_E2E_TEST_PLAN.md)

---

## ✅ 下一步

### 今天立即开始 (30分钟)

```bash
# 1. 安装 Playwright
cd ui
npm install -D @playwright/test
npx playwright install chromium

# 2. 创建配置和目录
# (按照上面 Step 2-4)

# 3. 创建第一个测试
# (按照上面 Step 5)

# 4. 运行测试
npx playwright test --ui
```

### 本周计划

1. ✅ 完成认证流程测试
2. ✅ 完成环境变量测试
3. ✅ 开始秘钥管理测试

---

**创建日期**: 2025-10-24  
**测试策略**: E2E 为主 + 真实请求  
**预计完成**: 18 工作日  
**状态**: 🚀 Ready to Start

🎯 **立即开始 10 分钟快速启动！**

