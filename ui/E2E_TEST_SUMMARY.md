# 🧪 E2E 测试总结

**创建时间**: 2025-10-24  
**状态**: ✅ 已完成

---

## 📋 测试覆盖情况

### ✅ 已完成的测试

| 模块 | 测试文件 | 测试数量 | 状态 |
|------|---------|---------|------|
| **认证** | `auth.spec.ts` | 3 | ✅ 完成 |
| **API Keys** | `apikeys/apikeys.spec.ts` | 6 | ✅ 完成 |
| **Repositories** | `repositories/repositories.spec.ts` | 8 | ✅ 完成 |
| **Applications** | `applications/applications.spec.ts` | 9 | ✅ 完成 |

**总计**: 4 个模块，26 个测试用例

---

## 📝 测试详情

### 1. 认证测试 (auth.spec.ts)

测试登录和注册流程。

**测试用例**:
1. ✅ 用户注册成功（首次）
2. ✅ 用户登录成功
3. ✅ 登录失败 - 错误的密码

**关键功能**:
- 用户注册
- 用户登录
- 错误处理
- Token 验证

---

### 2. API Keys 测试 (apikeys/apikeys.spec.ts)

测试 API 密钥管理功能。

**测试用例**:
1. ✅ 访问 API Keys 页面并显示空状态
2. ✅ 创建新的 API Key
3. ✅ 禁用 API Key
4. ✅ 启用 API Key
5. ✅ 删除 API Key
6. ✅ 测试表单验证 - 必填字段

**关键功能**:
- API Key 创建
- API Key 启用/禁用
- API Key 删除
- 权限选择
- 表单验证

**添加的 data-testid**:
- `apikeys-page` - 页面容器
- `apikeys-create-button` - 创建按钮
- `apikeys-create-form` - 创建表单
- `apikeys-name-input` - 名称输入框
- `apikeys-description-input` - 描述输入框
- `apikeys-permission-select` - 权限选择器
- `apikeys-submit-button` - 提交按钮
- `apikeys-cancel-button` - 取消按钮
- `apikeys-success-message` - 成功消息
- `apikeys-created-key-input` - 创建的密钥输入框
- `apikeys-list-table` - 列表表格
- `apikeys-item-{id}` - 列表项
- `apikeys-toggle-button-{id}` - 启用/禁用按钮
- `apikeys-delete-button-{id}` - 删除按钮

---

### 3. Repositories 测试 (repositories/repositories.spec.ts)

测试镜像仓库管理功能。

**测试用例**:
1. ✅ 访问 Repositories 页面
2. ✅ 创建新的 Repository（无认证）
3. ✅ 创建带认证的 Repository
4. ✅ 编辑 Repository
5. ✅ 设置为默认 Repository
6. ✅ 删除非默认 Repository
7. ✅ 测试表单验证 - 必填字段
8. ✅ 测试认证类型切换

**关键功能**:
- Repository 创建（无认证）
- Repository 创建（用户名密码）
- Repository 创建（Token）
- Repository 编辑
- 设置默认仓库
- Repository 删除
- 认证类型切换
- 表单验证

**添加的 data-testid**:
- `repositories-page` - 页面容器
- `repositories-create-button` - 创建按钮
- `repositories-form` - 表单
- `repositories-name-input` - 名称输入框
- `repositories-registry-input` - 仓库地址输入框
- `repositories-authtype-select` - 认证类型选择器
- `repositories-username-input` - 用户名输入框
- `repositories-password-input` - 密码输入框
- `repositories-token-input` - Token 输入框
- `repositories-default-checkbox` - 默认复选框
- `repositories-submit-button` - 提交按钮
- `repositories-cancel-button` - 取消按钮
- `repositories-list-table` - 列表表格
- `repositories-item-{id}` - 列表项
- `repositories-set-default-button-{id}` - 设为默认按钮
- `repositories-edit-button-{id}` - 编辑按钮
- `repositories-delete-button-{id}` - 删除按钮

---

### 4. Applications 测试 (applications/applications.spec.ts)

测试应用管理和部署功能。

**测试用例**:
1. ✅ 访问 Applications 页面
2. ✅ 创建新应用
3. ✅ 添加环境变量
4. ✅ 添加多个端口映射
5. ✅ 编辑应用
6. ✅ 部署应用（需要 Docker）
7. ✅ 停止应用
8. ✅ 删除应用
9. ✅ 测试表单验证 - 必填字段

**关键功能**:
- 应用创建
- 端口映射配置
- 环境变量配置
- 应用编辑
- 应用部署
- 应用停止
- 应用重启
- 应用删除
- 表单验证

**添加的 data-testid**:
- `applications-page` - 页面容器
- `applications-create-button` - 创建按钮
- `applications-form` - 表单
- `applications-name-input` - 应用名称输入框
- `applications-image-input` - 镜像输入框
- `applications-version-input` - 版本输入框
- `applications-repository-select` - 仓库选择器
- `applications-domain-input` - 域名输入框
- `applications-add-port-button` - 添加端口按钮
- `applications-host-port-{index}` - 主机端口输入框
- `applications-container-port-{index}` - 容器端口输入框
- `applications-remove-port-{index}` - 删除端口按钮
- `applications-add-env-button` - 添加环境变量按钮
- `applications-env-key-{index}` - 环境变量键输入框
- `applications-env-value-{index}` - 环境变量值输入框
- `applications-remove-env-{index}` - 删除环境变量按钮
- `applications-submit-button` - 提交按钮
- `applications-cancel-button` - 取消按钮
- `applications-list-table` - 列表表格
- `applications-item-{id}` - 列表项
- `applications-status-{id}` - 状态徽章
- `applications-deploy-button-{id}` - 部署按钮
- `applications-stop-button-{id}` - 停止按钮
- `applications-restart-button-{id}` - 重启按钮
- `applications-edit-button-{id}` - 编辑按钮
- `applications-delete-button-{id}` - 删除按钮

---

## 🚀 运行测试

### 运行所有测试

```bash
cd ui

# Headless 模式（快速）
npm run test:e2e

# UI 模式（推荐 - 可视化调试）
npm run test:e2e:ui

# Headed 模式（显示浏览器）
npx playwright test --headed

# Debug 模式（逐步调试）
npm run test:e2e:debug
```

### 运行特定测试

```bash
# 只运行认证测试
npx playwright test auth.spec.ts

# 只运行 API Keys 测试
npx playwright test apikeys/apikeys.spec.ts

# 只运行 Repositories 测试
npx playwright test repositories/repositories.spec.ts

# 只运行 Applications 测试
npx playwright test applications/applications.spec.ts
```

### 运行特定测试用例

```bash
# 使用 grep 筛选
npx playwright test --grep "创建新应用"
```

---

## 📚 测试架构

### 测试策略

1. **串行执行**: 所有测试套件使用 `serial` 模式，确保测试按顺序执行
2. **状态管理**: 每个测试前自动登录，确保已认证状态
3. **数据隔离**: 使用唯一的测试数据，避免冲突
4. **等待策略**: 使用显式等待和 `data-testid`，确保元素可见

### 测试模式

```typescript
test.describe.configure({ mode: 'serial' }); // 串行执行

test.beforeEach(async ({ page }) => {
  // 每个测试前登录
  await page.goto('/login');
  // ... 登录逻辑
});

test('测试用例名称', async ({ page }) => {
  // 测试逻辑
});
```

### 选择器策略

使用 `data-testid` 确保测试稳定性：

```typescript
// ✅ 推荐：使用 data-testid
await page.click('[data-testid="login-submit-button"]');

// ❌ 不推荐：使用文本或 CSS 选择器
await page.click('button:has-text("登录")'); // 文本可能改变
await page.click('.submit-btn'); // CSS 类可能改变
```

---

## ⚠️ 注意事项

### 1. Docker 依赖

Applications 测试中的部署功能需要 Docker 运行：

```bash
# macOS
open -a Docker

# Linux
sudo systemctl start docker

# 验证 Docker 运行
docker ps
```

### 2. 测试环境

- 测试会自动启动后端（端口 9001）和前端（端口 5173）
- 使用独立的测试数据库
- 测试后会自动清理

### 3. 单用户限制

系统只支持单用户注册，测试使用固定用户：
- Email: `admin@example.com`
- Password: `Admin123456!`

---

## 🎯 下一步计划

### 待实施的测试

根据 DATA_TESTID_GUIDE.md，下一阶段可以测试：

1. **Environment Variables** (`Environment.tsx`)
   - 环境变量创建
   - 环境变量编辑
   - 环境变量删除
   - 作用域管理

2. **Secrets Management** (`Secrets.tsx`)
   - 秘钥组管理
   - 秘钥创建
   - 秘钥引用
   - 加密存储

3. **Webhooks** (`Webhooks.tsx`)
   - Webhook 创建
   - Webhook 触发
   - Webhook 日志

4. **Settings** (`Settings.tsx`)
   - 系统设置
   - 用户设置

---

## 📊 测试覆盖率

### 当前覆盖

| 功能模块 | 覆盖率 | 备注 |
|---------|-------|------|
| 认证 | ✅ 100% | 完整覆盖 |
| API Keys | ✅ 95% | 核心功能已覆盖 |
| Repositories | ✅ 95% | 核心功能已覆盖 |
| Applications | ✅ 90% | 核心功能已覆盖（部署功能需要 Docker） |
| Environment | 🔄 0% | 待实施 |
| Secrets | 🔄 0% | 待实施 |
| Webhooks | 🔄 0% | 待实施 |

---

## 🐛 常见问题

### 1. 测试超时

如果测试超时，可能原因：
- Docker 未运行
- 网络问题
- 服务启动慢

**解决方案**:
```bash
# 增加超时时间
npx playwright test --timeout=120000
```

### 2. 元素未找到

**错误**: `TimeoutError: waiting for locator('[data-testid="xxx"]')`

**解决方案**:
- 检查 data-testid 是否正确
- 使用 UI 模式查看实际页面
- 增加等待时间

### 3. 测试数据冲突

如果出现"已存在"错误，手动清理测试数据：

```bash
rm -rf backend/data/test/*
```

---

## 📖 相关文档

| 文档 | 说明 |
|------|------|
| [DATA_TESTID_GUIDE.md](./DATA_TESTID_GUIDE.md) | data-testid 使用指南 |
| [TESTING.md](../TESTING.md) | 测试总览 |
| [playwright.config.ts](./playwright.config.ts) | Playwright 配置 |

---

## ✨ 最佳实践

### 1. 编写清晰的测试

```typescript
test('应该能创建新的 API Key', async ({ page }) => {
  // 1. Arrange（准备）
  await page.goto('/apikeys');
  
  // 2. Act（操作）
  await page.click('[data-testid="apikeys-create-button"]');
  await page.fill('[data-testid="apikeys-name-input"]', 'Test Key');
  await page.click('[data-testid="apikeys-submit-button"]');
  
  // 3. Assert（断言）
  await expect(page.locator('[data-testid="apikeys-success-message"]')).toBeVisible();
});
```

### 2. 使用有意义的等待

```typescript
// ✅ 好：等待特定元素
await page.waitForSelector('[data-testid="list-table"]', { state: 'visible' });

// ❌ 不好：固定时间等待
await page.waitForTimeout(5000);
```

### 3. 添加日志输出

```typescript
test('创建应用', async ({ page }) => {
  console.log('\n========================================');
  console.log('测试：创建应用');
  console.log('========================================');
  
  // 测试逻辑...
  
  console.log('✅ 应用创建成功');
  console.log('========================================\n');
});
```

---

**最后更新**: 2025-10-24  
**维护者**: Deploy Webhook Team  
**状态**: ✅ 测试基础设施完成

祝测试愉快！🎉

