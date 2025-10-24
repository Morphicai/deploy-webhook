# UI E2E 测试方案 🎯

## 📋 方案概述

**测试策略**: E2E 为主 + 少量单元测试  
**测试工具**: Playwright (推荐) 或 Cypress  
**测试方式**: 真实请求，连接真实后端  
**测试重点**: 用户实际使用场景

---

## 🎯 测试金字塔（调整后）

```
          E2E Tests (80%)
         _______________
        /               \
       /  真实用户场景   \
      /    真实 API       \
     /______________________\
    /                        \
   /  Integration Tests (15%) \
  /    关键业务逻辑           \
 /______________________________\
/                                \
/   Unit Tests (5%)               \
/   仅测试纯函数和工具             \
/__________________________________\
```

**比重分配**:
- 🔴 **E2E 测试**: 80% (重点)
- 🟡 **集成测试**: 15% (关键逻辑)
- 🟢 **单元测试**: 5% (纯函数)

---

## 🧪 技术栈选择

### 推荐方案 A: Playwright (首选)

**优势**:
- ✅ 支持多浏览器 (Chromium, Firefox, WebKit)
- ✅ 速度快，并行执行
- ✅ 优秀的调试工具
- ✅ 自动等待，减少 flaky tests
- ✅ 内置截图和视频录制
- ✅ TypeScript 支持完美

**安装**:
```bash
npm install -D @playwright/test
npx playwright install
```

### 备选方案 B: Cypress

**优势**:
- ✅ 友好的 UI 界面
- ✅ 实时重载
- ✅ 时间旅行调试
- ✅ 社区成熟

**安装**:
```bash
npm install -D cypress
```

**推荐使用 Playwright**，因为更快、更现代、TypeScript 支持更好。

---

## 📊 测试模块划分（E2E 为主）

### Layer 1: 基础单元测试 (5%) - 1天

**目标**: 仅测试纯函数和工具

#### 测试内容
- ✅ `lib/utils.ts` - className 合并 (2 tests)
- ✅ `i18n/translations.ts` - 翻译函数 (3 tests)

**测试数量**: ~5 个
**工具**: Vitest

---

### Layer 2: E2E 测试 - 认证流程 (10%) - 2天

**目标**: 测试用户登录注册流程

#### 测试场景

**2.1 用户注册** (`e2e/auth/register.spec.ts`)
```typescript
test('用户首次注册流程', async ({ page }) => {
  // 1. 访问注册页
  await page.goto('http://localhost:5173/register');
  
  // 2. 填写注册信息
  await page.fill('[name="username"]', 'testuser');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'SecurePass123!');
  await page.fill('[name="confirmPassword"]', 'SecurePass123!');
  
  // 3. 提交注册
  await page.click('button[type="submit"]');
  
  // 4. 验证跳转到登录页
  await expect(page).toHaveURL(/.*login/);
  await expect(page.locator('text=注册成功')).toBeVisible();
});

test('注册验证 - 密码不匹配', async ({ page }) => {
  await page.goto('http://localhost:5173/register');
  
  await page.fill('[name="password"]', 'Pass123!');
  await page.fill('[name="confirmPassword"]', 'Different123!');
  await page.click('button[type="submit"]');
  
  await expect(page.locator('text=密码不匹配')).toBeVisible();
});
```

**2.2 用户登录** (`e2e/auth/login.spec.ts`)
```typescript
test('用户登录成功流程', async ({ page }) => {
  // 1. 访问登录页
  await page.goto('http://localhost:5173/login');
  
  // 2. 填写登录信息
  await page.fill('[name="username"]', 'admin');
  await page.fill('[name="password"]', 'password');
  
  // 3. 勾选"记住我"
  await page.check('[name="rememberMe"]');
  
  // 4. 提交登录
  await page.click('button[type="submit"]');
  
  // 5. 验证跳转到首页
  await expect(page).toHaveURL('http://localhost:5173/');
  
  // 6. 验证 localStorage 存储了 token
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  expect(token).toBeTruthy();
  
  // 7. 验证用户信息显示
  await expect(page.locator('text=admin')).toBeVisible();
});

test('登录失败 - 错误凭证', async ({ page }) => {
  await page.goto('http://localhost:5173/login');
  
  await page.fill('[name="username"]', 'wronguser');
  await page.fill('[name="password"]', 'wrongpass');
  await page.click('button[type="submit"]');
  
  await expect(page.locator('text=用户名或密码错误')).toBeVisible();
});
```

**测试数量**: ~8 个测试

---

### Layer 3: E2E 测试 - 环境变量管理 (10%) - 2天

**目标**: 测试环境变量的完整 CRUD 流程

#### 测试场景 (`e2e/environment/crud.spec.ts`)

```typescript
test.describe('环境变量管理', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('http://localhost:5173/login');
    await page.fill('[name="username"]', 'admin');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('http://localhost:5173/');
  });

  test('创建全局环境变量', async ({ page }) => {
    // 1. 导航到环境变量页面
    await page.click('text=环境变量');
    await expect(page).toHaveURL(/.*environment/);
    
    // 2. 点击创建按钮
    await page.click('button:has-text("新建变量")');
    
    // 3. 填写表单
    await page.selectOption('[name="scope"]', 'global');
    await page.fill('[name="key"]', 'TEST_VAR');
    await page.fill('[name="value"]', 'test_value');
    
    // 4. 提交
    await page.click('button[type="submit"]');
    
    // 5. 验证成功提示
    await expect(page.locator('text=创建成功')).toBeVisible();
    
    // 6. 验证列表中显示新变量
    await expect(page.locator('text=TEST_VAR')).toBeVisible();
    await expect(page.locator('text=test_value')).toBeVisible();
  });

  test('创建项目环境变量', async ({ page }) => {
    await page.click('text=环境变量');
    
    // 先创建一个应用（如果不存在）
    // ...
    
    await page.click('button:has-text("新建变量")');
    await page.selectOption('[name="scope"]', 'project');
    await page.selectOption('[name="projectId"]', '1'); // 选择项目
    await page.fill('[name="key"]', 'PROJECT_VAR');
    await page.fill('[name="value"]', 'project_value');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=创建成功')).toBeVisible();
  });

  test('删除环境变量', async ({ page }) => {
    await page.click('text=环境变量');
    
    // 定位到要删除的变量行
    const row = page.locator('tr:has-text("TEST_VAR")');
    await row.locator('button:has-text("删除")').click();
    
    // 确认删除
    await page.click('button:has-text("确认")');
    
    // 验证删除成功
    await expect(page.locator('text=删除成功')).toBeVisible();
    await expect(page.locator('text=TEST_VAR')).not.toBeVisible();
  });

  test('按项目过滤环境变量', async ({ page }) => {
    await page.click('text=环境变量');
    
    // 选择过滤器
    await page.selectOption('[name="projectFilter"]', '1');
    
    // 验证只显示该项目的变量
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    
    for (let i = 0; i < count; i++) {
      const projectName = await rows.nth(i).locator('td:nth-child(2)').textContent();
      expect(projectName).toContain('项目1');
    }
  });
});
```

**测试数量**: ~10 个测试

---

### Layer 4: E2E 测试 - 秘钥管理 (15%) - 3天

**目标**: 测试秘钥分组和秘钥的完整管理流程

#### 测试场景 (`e2e/secrets/management.spec.ts`)

```typescript
test.describe('秘钥管理', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.click('text=秘钥管理');
  });

  test('完整的秘钥管理工作流', async ({ page }) => {
    // 1. 创建秘钥分组
    await page.click('button:has-text("新建分组")');
    await page.fill('[name="groupName"]', 'Production Secrets');
    await page.fill('[name="description"]', '生产环境秘钥');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=分组创建成功')).toBeVisible();
    
    // 2. 在分组中添加秘钥
    await page.click('text=Production Secrets');
    await page.click('button:has-text("新建秘钥")');
    await page.fill('[name="name"]', 'DATABASE_PASSWORD');
    await page.fill('[name="value"]', 'super_secure_password_123');
    await page.fill('[name="description"]', '数据库密码');
    await page.click('button[type="submit"]');
    
    // 3. 验证秘钥列表显示
    await expect(page.locator('text=DATABASE_PASSWORD')).toBeVisible();
    
    // 4. 秘钥值应该被加密显示
    await expect(page.locator('text=super_secure_password_123')).not.toBeVisible();
    await expect(page.locator('text=***')).toBeVisible();
    
    // 5. 点击显示秘钥
    await page.click('button:has-text("显示")');
    await expect(page.locator('text=super_secure_password_123')).toBeVisible();
    
    // 6. 更新秘钥
    await page.click('button:has-text("编辑")');
    await page.fill('[name="value"]', 'new_secure_password_456');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=更新成功')).toBeVisible();
    
    // 7. 删除秘钥
    await page.click('button:has-text("删除")');
    await page.click('button:has-text("确认")');
    await expect(page.locator('text=删除成功')).toBeVisible();
    await expect(page.locator('text=DATABASE_PASSWORD')).not.toBeVisible();
  });

  test('Infisical 秘钥同步', async ({ page }) => {
    // 1. 配置 Infisical Provider
    await page.click('text=秘钥提供者');
    await page.click('button:has-text("添加提供者")');
    
    await page.selectOption('[name="type"]', 'infisical');
    await page.fill('[name="name"]', 'My Infisical');
    await page.fill('[name="projectId"]', 'test-project-id');
    await page.fill('[name="environment"]', 'production');
    await page.fill('[name="clientId"]', 'client-id-123');
    await page.fill('[name="clientSecret"]', 'client-secret-456');
    
    await page.click('button[type="submit"]');
    await expect(page.locator('text=提供者添加成功')).toBeVisible();
    
    // 2. 触发同步
    await page.click('button:has-text("同步")');
    await expect(page.locator('text=同步中')).toBeVisible();
    
    // 3. 等待同步完成
    await expect(page.locator('text=同步成功')).toBeVisible({ timeout: 10000 });
    
    // 4. 验证秘钥已同步
    await page.click('text=秘钥列表');
    // 验证从 Infisical 同步的秘钥存在
  });
});
```

**测试数量**: ~12 个测试

---

### Layer 5: E2E 测试 - 应用部署 (20%) - 4天

**目标**: 测试应用的完整生命周期

#### 测试场景 (`e2e/applications/lifecycle.spec.ts`)

```typescript
test.describe('应用部署完整流程', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('部署一个新应用的完整流程', async ({ page }) => {
    // 1. 导航到应用管理
    await page.click('text=应用管理');
    
    // 2. 创建新应用
    await page.click('button:has-text("创建应用")');
    
    await page.fill('[name="name"]', 'test-nginx');
    await page.fill('[name="image"]', 'nginx');
    await page.fill('[name="version"]', 'alpine');
    
    // 配置端口映射
    await page.fill('[name="hostPort"]', '8080');
    await page.fill('[name="containerPort"]', '80');
    
    // 添加环境变量
    await page.click('button:has-text("添加环境变量")');
    await page.fill('[name="envKey"]', 'ENV');
    await page.fill('[name="envValue"]', 'production');
    
    // 提交创建
    await page.click('button[type="submit"]');
    await expect(page.locator('text=应用创建成功')).toBeVisible();
    
    // 3. 部署应用
    const appRow = page.locator('tr:has-text("test-nginx")');
    await appRow.locator('button:has-text("部署")').click();
    
    // 等待部署完成
    await expect(page.locator('text=部署中')).toBeVisible();
    await expect(page.locator('text=部署成功')).toBeVisible({ timeout: 30000 });
    
    // 4. 验证应用状态
    await expect(appRow.locator('text=运行中')).toBeVisible();
    
    // 5. 查看部署日志
    await appRow.locator('button:has-text("日志")').click();
    await expect(page.locator('text=Container started')).toBeVisible();
    
    // 6. 停止应用
    await appRow.locator('button:has-text("停止")').click();
    await expect(page.locator('text=已停止')).toBeVisible({ timeout: 10000 });
    
    // 7. 重启应用
    await appRow.locator('button:has-text("启动")').click();
    await expect(appRow.locator('text=运行中')).toBeVisible({ timeout: 10000 });
    
    // 8. 删除应用
    await appRow.locator('button:has-text("删除")').click();
    await page.click('button:has-text("确认删除")');
    await expect(page.locator('text=删除成功')).toBeVisible();
    await expect(page.locator('text=test-nginx')).not.toBeVisible();
  });

  test('Webhook 部署配置', async ({ page }) => {
    await page.click('text=应用管理');
    
    // 选择一个应用
    const appRow = page.locator('tr:has-text("my-app")').first();
    await appRow.locator('button:has-text("设置")').click();
    
    // 启用 Webhook
    await page.check('[name="webhookEnabled"]');
    
    // 验证 Token 自动生成
    const webhookToken = await page.locator('[name="webhookToken"]').inputValue();
    expect(webhookToken).toMatch(/^whk_/);
    
    // 复制 Webhook URL
    await page.click('button:has-text("复制 URL")');
    await expect(page.locator('text=已复制')).toBeVisible();
    
    // 保存设置
    await page.click('button[type="submit"]');
    await expect(page.locator('text=设置已保存')).toBeVisible();
  });

  test('查看部署日志历史', async ({ page }) => {
    await page.click('text=应用管理');
    
    const appRow = page.locator('tr:has-text("my-app")').first();
    await appRow.locator('button:has-text("部署历史")').click();
    
    // 验证部署日志列表
    await expect(page.locator('table')).toBeVisible();
    
    // 查看第一条日志详情
    await page.locator('tr').first().click();
    
    // 验证详情信息
    await expect(page.locator('text=部署时间')).toBeVisible();
    await expect(page.locator('text=触发方式')).toBeVisible();
    await expect(page.locator('text=部署状态')).toBeVisible();
    await expect(page.locator('text=耗时')).toBeVisible();
  });
});
```

**测试数量**: ~15 个测试

---

### Layer 6: E2E 测试 - 配置管理 (15%) - 3天

**目标**: 测试系统配置功能

#### 测试场景

**6.1 镜像仓库管理** (`e2e/repositories/management.spec.ts`)
```typescript
test('添加私有镜像仓库', async ({ page }) => {
  await login(page);
  await page.click('text=镜像仓库');
  
  await page.click('button:has-text("添加仓库")');
  await page.fill('[name="name"]', 'My Private Registry');
  await page.fill('[name="registry"]', 'registry.example.com');
  await page.fill('[name="username"]', 'myuser');
  await page.fill('[name="password"]', 'mypassword');
  
  await page.click('button[type="submit"]');
  await expect(page.locator('text=仓库添加成功')).toBeVisible();
  
  // 验证列表显示
  await expect(page.locator('text=My Private Registry')).toBeVisible();
});

test('设置默认镜像仓库', async ({ page }) => {
  await login(page);
  await page.click('text=镜像仓库');
  
  const row = page.locator('tr:has-text("My Private Registry")');
  await row.locator('button:has-text("设为默认")').click();
  
  await expect(row.locator('text=默认')).toBeVisible();
});
```

**6.2 Webhook 管理** (`e2e/webhooks/management.spec.ts`)
```typescript
test('创建和测试 Webhook', async ({ page }) => {
  await login(page);
  await page.click('text=Webhook 管理');
  
  // 创建 Webhook
  await page.click('button:has-text("新建 Webhook")');
  await page.fill('[name="name"]', 'GitHub Webhook');
  await page.selectOption('[name="type"]', 'github');
  await page.fill('[name="description"]', 'Sync with GitHub');
  
  await page.click('button[type="submit"]');
  await expect(page.locator('text=Webhook 创建成功')).toBeVisible();
  
  // 复制 Webhook Secret
  const row = page.locator('tr:has-text("GitHub Webhook")');
  await row.locator('button:has-text("复制 Secret")').click();
  await expect(page.locator('text=已复制')).toBeVisible();
  
  // 查看 Webhook 日志
  await row.locator('button:has-text("日志")').click();
  await expect(page.locator('text=暂无日志')).toBeVisible();
});
```

**6.3 API 密钥管理** (`e2e/apikeys/management.spec.ts`)
```typescript
test('创建和使用 API Key', async ({ page }) => {
  await login(page);
  await page.click('text=API 密钥');
  
  // 创建 API Key
  await page.click('button:has-text("创建密钥")');
  await page.fill('[name="name"]', 'CI/CD Key');
  await page.selectOption('[name="expiresIn"]', '30'); // 30 天
  
  await page.click('button[type="submit"]');
  
  // 验证 API Key 显示（一次性）
  await expect(page.locator('text=请妥善保管')).toBeVisible();
  const apiKey = await page.locator('[data-testid="api-key"]').textContent();
  expect(apiKey).toMatch(/^dw_/);
  
  // 复制 API Key
  await page.click('button:has-text("复制")');
  
  // 关闭对话框
  await page.click('button:has-text("我已保存")');
  
  // 验证列表中只显示部分 Key
  await expect(page.locator('text=dw_***')).toBeVisible();
});
```

**测试数量**: ~12 个测试

---

### Layer 7: E2E 测试 - 综合场景 (15%) - 3天

**目标**: 测试跨模块的复杂用户场景

#### 测试场景 (`e2e/scenarios/real-world.spec.ts`)

```typescript
test('场景1: 从零部署一个完整的 Web 应用', async ({ page }) => {
  await login(page);
  
  // Step 1: 创建秘钥分组和秘钥
  await page.click('text=秘钥管理');
  await page.click('button:has-text("新建分组")');
  await page.fill('[name="groupName"]', 'WebApp Secrets');
  await page.click('button[type="submit"]');
  
  await page.click('text=WebApp Secrets');
  await page.click('button:has-text("新建秘钥")');
  await page.fill('[name="name"]', 'DB_PASSWORD');
  await page.fill('[name="value"]', 'secure_password');
  await page.click('button[type="submit"]');
  
  // Step 2: 创建环境变量并引用秘钥
  await page.click('text=环境变量');
  await page.click('button:has-text("新建变量")');
  await page.selectOption('[name="scope"]', 'global');
  await page.fill('[name="key"]', 'DATABASE_URL');
  await page.selectOption('[name="valueType"]', 'secret_ref');
  // 选择刚创建的秘钥
  const secretId = await page.locator('[data-secret-name="DB_PASSWORD"]').getAttribute('data-secret-id');
  await page.selectOption('[name="secretId"]', secretId);
  await page.click('button[type="submit"]');
  
  // Step 3: 创建应用
  await page.click('text=应用管理');
  await page.click('button:has-text("创建应用")');
  await page.fill('[name="name"]', 'my-web-app');
  await page.fill('[name="image"]', 'myregistry/webapp');
  await page.fill('[name="version"]', 'latest');
  await page.fill('[name="hostPort"]', '3000');
  await page.fill('[name="containerPort"]', '3000');
  await page.click('button[type="submit"]');
  
  // Step 4: 启用 Webhook 自动部署
  const appRow = page.locator('tr:has-text("my-web-app")');
  await appRow.locator('button:has-text("设置")').click();
  await page.check('[name="webhookEnabled"]');
  await page.check('[name="autoDeploy"]');
  await page.click('button[type="submit"]');
  
  // Step 5: 部署应用
  await appRow.locator('button:has-text("部署")').click();
  await expect(page.locator('text=部署成功')).toBeVisible({ timeout: 30000 });
  
  // Step 6: 验证应用运行中
  await expect(appRow.locator('text=运行中')).toBeVisible();
  
  // Step 7: 查看部署日志
  await appRow.locator('button:has-text("部署历史")').click();
  await expect(page.locator('tr').first()).toContainText('成功');
});

test('场景2: 更新应用配置并重新部署', async ({ page }) => {
  await login(page);
  
  // Step 1: 更新环境变量
  await page.click('text=环境变量');
  const envRow = page.locator('tr:has-text("DATABASE_URL")');
  await envRow.locator('button:has-text("编辑")').click();
  await page.fill('[name="value"]', 'postgresql://new-host:5432/db');
  await page.click('button[type="submit"]');
  
  // Step 2: 重新部署应用
  await page.click('text=应用管理');
  const appRow = page.locator('tr:has-text("my-web-app")');
  await appRow.locator('button:has-text("重新部署")').click();
  await expect(page.locator('text=部署成功')).toBeVisible({ timeout: 30000 });
  
  // Step 3: 验证新配置生效
  await appRow.locator('button:has-text("日志")').click();
  // 验证日志中显示新的环境变量
});

test('场景3: 多环境部署（开发、测试、生产）', async ({ page }) => {
  await login(page);
  
  // 为每个环境创建独立的环境变量和应用
  const environments = ['dev', 'staging', 'prod'];
  
  for (const env of environments) {
    // 创建环境变量
    await page.click('text=环境变量');
    await page.click('button:has-text("新建变量")');
    await page.fill('[name="key"]', `${env.toUpperCase()}_CONFIG`);
    await page.fill('[name="value"]', `config for ${env}`);
    await page.click('button[type="submit"]');
    
    // 创建应用
    await page.click('text=应用管理');
    await page.click('button:has-text("创建应用")');
    await page.fill('[name="name"]', `webapp-${env}`);
    await page.fill('[name="image"]', 'myapp');
    await page.fill('[name="version"]', env);
    await page.fill('[name="hostPort"]', String(3000 + environments.indexOf(env)));
    await page.click('button[type="submit"]');
    
    // 部署
    const appRow = page.locator(`tr:has-text("webapp-${env}")`);
    await appRow.locator('button:has-text("部署")').click();
    await expect(page.locator('text=部署成功')).toBeVisible({ timeout: 30000 });
  }
  
  // 验证所有环境都在运行
  for (const env of environments) {
    const appRow = page.locator(`tr:has-text("webapp-${env}")`);
    await expect(appRow.locator('text=运行中')).toBeVisible();
  }
});
```

**测试数量**: ~10 个测试

---

## 📦 配置文件

### Playwright 配置 (`playwright.config.ts`)

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  
  // 并行运行测试
  fullyParallel: true,
  
  // 失败时重试次数
  retries: process.env.CI ? 2 : 0,
  
  // 并行 worker 数量
  workers: process.env.CI ? 1 : undefined,
  
  // 报告配置
  reporter: [
    ['html'],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  
  use: {
    // Base URL
    baseURL: 'http://localhost:5173',
    
    // 截图设置
    screenshot: 'only-on-failure',
    
    // 视频设置
    video: 'retain-on-failure',
    
    // 追踪设置
    trace: 'on-first-retry',
    
    // API 超时
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  
  // 测试前启动开发服务器
  webServer: [
    {
      command: 'npm run dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'cd ../backend && npm run dev',
      port: 3000,
      reuseExistingServer: !process.env.CI,
    }
  ],
  
  // 浏览器配置
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // 如果需要测试其他浏览器
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
});
```

### 少量单元测试配置 (`vitest.config.ts`)

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.unit.test.ts'], // 只测试 .unit.test.ts 文件
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

---

## 🎯 测试统计

| Layer | 模块 | 文件数 | 测试数 | 预计时间 |
|-------|------|--------|--------|----------|
| 1 | 单元测试 | 2 | 5 | 1天 |
| 2 | 认证流程 | 2 | 8 | 2天 |
| 3 | 环境变量 | 1 | 10 | 2天 |
| 4 | 秘钥管理 | 1 | 12 | 3天 |
| 5 | 应用部署 | 1 | 15 | 4天 |
| 6 | 配置管理 | 3 | 12 | 3天 |
| 7 | 综合场景 | 1 | 10 | 3天 |
| **总计** | **11** | **72** | **18天** |

---

## 🚀 快速开始

### 1. 安装 Playwright

```bash
cd /Users/pengzai/www/morphicai/deploy-webhook/ui

# 安装 Playwright
npm install -D @playwright/test

# 安装浏览器
npx playwright install

# （可选）安装少量单元测试工具
npm install -D vitest happy-dom
```

### 2. 创建目录结构

```bash
mkdir -p e2e/auth
mkdir -p e2e/environment
mkdir -p e2e/secrets
mkdir -p e2e/applications
mkdir -p e2e/repositories
mkdir -p e2e/webhooks
mkdir -p e2e/apikeys
mkdir -p e2e/scenarios
mkdir -p e2e/utils
```

### 3. 创建辅助函数

**文件**: `e2e/utils/helpers.ts`

```typescript
import { Page } from '@playwright/test';

export async function login(page: Page, username = 'admin', password = 'password') {
  await page.goto('http://localhost:5173/login');
  await page.fill('[name="username"]', username);
  await page.fill('[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:5173/');
}

export async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]');
  await page.click('text=退出登录');
  await page.waitForURL('http://localhost:5173/login');
}

export async function clearDatabase() {
  // 调用后端 API 清空测试数据
  // 仅在测试环境使用
}
```

### 4. 更新 package.json

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:unit": "vitest run src/**/*.unit.test.ts",
    "test:all": "npm run test:unit && npm run test:e2e"
  }
}
```

### 5. 运行第一个测试

```bash
# 运行所有 E2E 测试
npm run test:e2e

# UI 模式（推荐）
npm run test:e2e:ui

# 调试模式
npm run test:e2e:debug

# 运行特定文件
npx playwright test e2e/auth/login.spec.ts

# 运行单元测试
npm run test:unit
```

---

## ✅ 最佳实践

### 1. 测试隔离

每个测试应该独立，不依赖其他测试：

```typescript
test.beforeEach(async ({ page }) => {
  // 清理数据
  await clearTestData();
  
  // 登录
  await login(page);
});

test.afterEach(async ({ page }) => {
  // 清理创建的资源
  await cleanupResources();
});
```

### 2. 等待策略

Playwright 自动等待，但复杂场景需要明确等待：

```typescript
// ❌ Bad: 使用固定延迟
await page.waitForTimeout(3000);

// ✅ Good: 等待元素出现
await expect(page.locator('text=部署成功')).toBeVisible({ timeout: 30000 });

// ✅ Good: 等待 API 响应
await page.waitForResponse(resp => 
  resp.url().includes('/api/applications') && resp.status() === 200
);
```

### 3. 选择器策略

优先使用语义化选择器：

```typescript
// ✅ Good: 使用 role 和 text
await page.click('button:has-text("部署")');
await page.getByRole('button', { name: '部署' }).click();

// ⚠️ OK: 使用 data-testid
await page.click('[data-testid="deploy-button"]');

// ❌ Bad: 使用不稳定的 CSS
await page.click('.btn.btn-primary.deploy-btn');
```

---

## 📊 覆盖率目标

由于是 E2E 测试，不强求代码覆盖率，但应确保：

- ✅ **所有核心用户流程**: 100%
- ✅ **关键业务场景**: 100%
- ✅ **边界情况和错误处理**: 80%+

---

## 🎯 实施建议

### 推荐顺序

1. **Week 1**: Layer 1-2 (单元测试 + 认证)
2. **Week 2**: Layer 3-4 (环境变量 + 秘钥)
3. **Week 3**: Layer 5-6 (应用部署 + 配置)
4. **Week 4**: Layer 7 (综合场景) + 优化

### 每日计划

**每天工作量**: 3-5 个测试用例
**每周回顾**: 检查测试质量和覆盖率
**持续改进**: 修复 flaky tests，优化测试速度

---

## 📝 总结

| 维度 | 说明 |
|------|------|
| **测试类型** | E2E 为主 (80%) + 少量单元测试 (5%) |
| **测试工具** | Playwright + Vitest (minimal) |
| **测试方式** | 真实请求，连接真实后端 |
| **测试数量** | 72 个 E2E + 5 个单元测试 = 77 个 |
| **预计工期** | 18 工作日 |
| **覆盖重点** | 核心用户流程 100% |

---

**创建日期**: 2025-10-24  
**测试策略**: E2E 为主 + 真实请求  
**状态**: 📋 Ready to Start

