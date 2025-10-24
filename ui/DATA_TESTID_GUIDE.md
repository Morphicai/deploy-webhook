# 📋 测试标识符 (data-testid) 使用指南

**创建时间**: 2025-10-24  
**目的**: 提供稳定、语义化的测试选择器

---

## 🎯 为什么使用 data-testid？

### ✅ 优点

1. **稳定性** - 不依赖于样式、类名或 DOM 结构
2. **语义化** - 清晰表达元素的测试用途
3. **独立性** - 与业务逻辑和样式代码分离
4. **可维护性** - 重构 UI 时测试不会失败

### ❌ 不使用其他选择器的原因

| 选择器类型 | 问题 |
|----------|------|
| `#id` | ID 可能被复用或改变 |
| `.className` | 样式类经常变化 |
| `[name="xxx"]` | name 属性可能不存在或改变 |
| `button[type="submit"]` | 页面可能有多个提交按钮 |
| `text=/登录/` | 文本会因国际化而改变 |

---

## 📝 命名规范

### 格式

```
[页面]-[元素类型]-[操作/描述]
```

### 示例

```tsx
// 注册页面
data-testid="register-form"              // 表单
data-testid="register-email-input"       // 邮箱输入框
data-testid="register-password-input"    // 密码输入框
data-testid="register-submit-button"     // 提交按钮
data-testid="register-error-message"     // 错误消息

// 登录页面
data-testid="login-form"                 // 表单
data-testid="login-email-input"          // 邮箱输入框
data-testid="login-password-input"       // 密码输入框
data-testid="login-submit-button"        // 提交按钮
data-testid="login-error-message"        // 错误消息
data-testid="login-remember-checkbox"    // 记住我复选框

// 应用列表页面
data-testid="app-list-table"             // 应用列表表格
data-testid="app-list-search-input"      // 搜索框
data-testid="app-list-create-button"     // 创建按钮
data-testid="app-item-name-{id}"         // 应用名称（动态 ID）
data-testid="app-item-deploy-button-{id}" // 部署按钮（动态 ID）
data-testid="app-item-delete-button-{id}" // 删除按钮（动态 ID）
```

---

## 🔨 实施步骤

### 1. UI 组件中添加 data-testid

```tsx
// Register.tsx
<form data-testid="register-form">
  <Input
    id="email"
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    data-testid="register-email-input"  // ✅ 添加测试标识
  />
  
  <Input
    id="password"
    type="password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    data-testid="register-password-input"  // ✅ 添加测试标识
  />
  
  <Button 
    type="submit"
    data-testid="register-submit-button"  // ✅ 添加测试标识
  >
    注册
  </Button>
  
  {error && (
    <div data-testid="register-error-message">  {/* ✅ 添加测试标识 */}
      {error}
    </div>
  )}
</form>
```

### 2. 测试中使用 data-testid

```typescript
// register.spec.ts
test('用户注册成功', async ({ page }) => {
  await page.goto('/register');
  
  // ✅ 使用 data-testid 选择器
  await page.fill('[data-testid="register-email-input"]', 'test@example.com');
  await page.fill('[data-testid="register-password-input"]', 'Test123456!');
  await page.click('[data-testid="register-submit-button"]');
  
  // ✅ 验证错误消息
  const errorMessage = page.locator('[data-testid="register-error-message"]');
  await expect(errorMessage).not.toBeVisible();
});
```

---

## 📚 已实施的测试标识

### 注册页面 (`Register.tsx`)

| 元素 | data-testid | 说明 |
|------|-------------|------|
| 表单 | `register-form` | 注册表单容器 |
| 邮箱输入框 | `register-email-input` | 用户邮箱 |
| 密码输入框 | `register-password-input` | 用户密码 |
| 确认密码输入框 | `register-confirm-password-input` | 密码确认 |
| 提交按钮 | `register-submit-button` | 注册提交 |
| 错误消息 | `register-error-message` | 错误提示 |

### 登录页面 (`Login.tsx`)

| 元素 | data-testid | 说明 |
|------|-------------|------|
| 表单 | `login-form` | 登录表单容器 |
| 邮箱输入框 | `login-email-input` | 用户邮箱 |
| 密码输入框 | `login-password-input` | 用户密码 |
| 提交按钮 | `login-submit-button` | 登录提交 |
| 错误消息 | `login-error-message` | 错误提示 |

---

## 🎨 组件库支持

### shadcn/ui 组件

大多数 shadcn/ui 组件都支持传递自定义属性：

```tsx
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// ✅ 直接传递 data-testid
<Input data-testid="my-input" />
<Button data-testid="my-button">Click</Button>
```

### 自定义组件

确保你的自定义组件支持 `data-testid`：

```tsx
interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function CustomInput({ label, error, ...props }: CustomInputProps) {
  return (
    <div>
      <label>{label}</label>
      <input {...props} />  {/* ✅ 会自动传递 data-testid */}
      {error && <span data-testid={`${props['data-testid']}-error`}>{error}</span>}
    </div>
  );
}

// 使用
<CustomInput 
  label="Email"
  data-testid="email-input"
/>
```

---

## 🚀 最佳实践

### ✅ 推荐做法

1. **所有交互元素都添加 data-testid**
   ```tsx
   <Button data-testid="submit-button">提交</Button>
   <Input data-testid="email-input" />
   <Select data-testid="role-select" />
   ```

2. **错误和成功消息添加 data-testid**
   ```tsx
   {error && <div data-testid="error-message">{error}</div>}
   {success && <div data-testid="success-message">{success}</div>}
   ```

3. **列表项使用动态 ID**
   ```tsx
   {items.map(item => (
     <div key={item.id} data-testid={`item-${item.id}`}>
       <button data-testid={`delete-button-${item.id}`}>删除</button>
     </div>
   ))}
   ```

4. **表单容器添加 data-testid**
   ```tsx
   <form data-testid="login-form">
     {/* 表单内容 */}
   </form>
   ```

### ❌ 避免做法

1. **不要在纯展示元素上添加**
   ```tsx
   ❌ <div data-testid="container">  {/* 没有交互，不需要 */}
   ❌ <p data-testid="text">Hello</p>  {/* 静态文本，不需要 */}
   ```

2. **不要使用过于通用的名称**
   ```tsx
   ❌ data-testid="button"           // 太通用
   ✅ data-testid="submit-button"    // 具体明确
   
   ❌ data-testid="input"            // 太通用
   ✅ data-testid="email-input"      // 具体明确
   ```

3. **不要包含变化的内容**
   ```tsx
   ❌ data-testid="button-点击次数-5"  // 包含变化的数据
   ✅ data-testid="click-counter"     // 稳定的标识
   ```

---

## 🧪 测试示例

### 基础交互

```typescript
// 填写表单
await page.fill('[data-testid="email-input"]', 'test@example.com');
await page.fill('[data-testid="password-input"]', 'password123');

// 点击按钮
await page.click('[data-testid="submit-button"]');

// 验证消息
await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
```

### 列表操作

```typescript
// 查找特定列表项
const item = page.locator('[data-testid="item-123"]');
await expect(item).toBeVisible();

// 点击列表项中的按钮
await page.click('[data-testid="delete-button-123"]');

// 验证删除对话框
await expect(page.locator('[data-testid="confirm-dialog"]')).toBeVisible();
```

### 条件渲染

```typescript
// 检查元素是否存在
const errorMessage = page.locator('[data-testid="error-message"]');
if (await errorMessage.count() > 0) {
  await expect(errorMessage).toBeVisible();
  await expect(errorMessage).toContainText('错误');
}
```

---

## 📋 待实施的页面

### 高优先级

- [ ] **应用管理页面** (`Applications.tsx`)
  - `app-list-table`
  - `app-create-button`
  - `app-item-{id}`
  - `app-deploy-button-{id}`
  - `app-delete-button-{id}`

- [ ] **环境变量页面** (`Environment.tsx`)
  - `env-list-table`
  - `env-create-button`
  - `env-key-input`
  - `env-value-input`
  - `env-scope-select`

- [ ] **秘钥管理页面** (`Secrets.tsx`)
  - `secret-list-table`
  - `secret-create-button`
  - `secret-group-select`
  - `secret-name-input`
  - `secret-value-input`

### 中优先级

- [ ] **设置页面** (`Settings.tsx`)
- [ ] **域名管理页面** (`Domains.tsx`)
- [ ] **Webhook 管理页面** (`Webhooks.tsx`)

---

## 🎯 迁移计划

### 第一阶段：认证页面 ✅

- [x] Register.tsx
- [x] Login.tsx
- [x] register.spec.ts
- [x] login.spec.ts

### 第二阶段：核心功能页面

1. Applications.tsx
2. Environment.tsx
3. Secrets.tsx

### 第三阶段：其他功能页面

1. Settings.tsx
2. Domains.tsx
3. Webhooks.tsx

---

## 📚 参考资源

- [Playwright 选择器最佳实践](https://playwright.dev/docs/selectors)
- [Testing Library 查询优先级](https://testing-library.com/docs/queries/about/#priority)
- [Kent C. Dodds: Making your UI tests resilient to change](https://kentcdodds.com/blog/making-your-ui-tests-resilient-to-change)

---

## 🔄 变更日志

### 2025-10-24

- ✅ 创建测试标识符指南
- ✅ 在 Register.tsx 添加 data-testid
- ✅ 在 Login.tsx 添加 data-testid
- ✅ 更新 register.spec.ts 使用 data-testid
- ✅ 更新 login.spec.ts 使用 data-testid
- ✅ 更新测试辅助函数使用 data-testid

---

**总结**: 使用 `data-testid` 可以让测试更加稳定和可维护。这是一个渐进式的改进过程，先从最重要的页面开始实施。

