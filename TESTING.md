# 🧪 测试指南

## 📖 目录

- [快速开始](#-快速开始)
- [后端测试](#-后端测试)
- [前端测试](#-前端测试)
- [测试架构](#-测试架构)
- [常见问题](#-常见问题)

---

## 🚀 快速开始

### 后端测试

```bash
cd backend

# 运行所有测试
npm test

# 运行特定测试
npm test -- auth.test.ts

# 监听模式（开发推荐）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

### 前端 E2E 测试

```bash
cd ui

# 运行所有 E2E 测试
npm run test:e2e

# 使用 UI 模式（推荐）
npm run test:e2e:ui

# Debug 模式
npm run test:e2e:debug
```

---

## 🔧 后端测试

### 测试架构（6层分层）

我们采用自底向上的分层测试策略，确保每一层都稳固后再测试上层：

```
┌────────────────────────────────────────┐
│  第 6 层：部署日志                      │  ✅ 已完成
│  └─ deploymentLogs.test.ts            │
├────────────────────────────────────────┤
│  第 5 层：应用部署                      │  ✅ 已完成
│  └─ deploy.test.ts                     │
├────────────────────────────────────────┤
│  第 4 层：环境变量                      │  ✅ 已完成
│  └─ secrets.test.ts (环境变量部分)     │
├────────────────────────────────────────┤
│  第 3 层：秘钥管理                      │  ✅ 已完成
│  └─ secrets.test.ts (秘钥部分)         │
├────────────────────────────────────────┤
│  第 2 层：秘钥组                        │  ✅ 已完成
│  └─ secrets.test.ts (秘钥组部分)       │
├────────────────────────────────────────┤
│  第 1 层：认证授权                      │  ✅ 已完成
│  └─ auth.test.ts                       │
└────────────────────────────────────────┘
```

### 测试套件

| 测试文件 | 测试内容 | 状态 |
|---------|---------|------|
| `auth.test.ts` | 用户注册、登录、API Key | ✅ 完成 |
| `secrets.test.ts` | 秘钥组、秘钥、环境变量 | ✅ 完成 |
| `deploy.test.ts` | 应用管理、部署 | ✅ 完成 |
| `deploymentLogs.test.ts` | 部署日志记录 | ✅ 完成 |

### 运行测试

```bash
cd backend

# 运行所有测试
npm test

# 运行特定层级
npm test -- auth.test.ts           # 第1层：认证
npm test -- secrets.test.ts        # 第2-4层：秘钥相关
npm test -- deploy.test.ts         # 第5层：部署
npm test -- deploymentLogs.test.ts # 第6层：日志

# 监听模式（开发推荐）
npm run test:watch

# 覆盖率报告
npm run test:coverage
open coverage/lcov-report/index.html
```

### 测试覆盖率

当前测试覆盖情况：

| 模块 | 覆盖率 | 测试数 |
|-----|-------|--------|
| 认证授权 | ✅ ~90% | 15+ |
| 秘钥组 | ✅ ~85% | 8+ |
| 秘钥管理 | ✅ ~85% | 12+ |
| 环境变量 | ✅ ~80% | 10+ |
| 应用部署 | ✅ ~85% | 10+ |
| 部署日志 | ✅ ~80% | 8+ |

---

## 🎭 前端测试

### E2E 测试（Playwright）

我们使用 Playwright 进行端到端测试，确保用户界面正常工作。

#### 测试内容

| 测试套件 | 测试内容 | 状态 |
|---------|---------|------|
| `auth.spec.ts` | 用户注册、登录、错误处理 | ✅ 完成 |

#### 运行方式

```bash
cd ui

# 1. UI 模式（推荐 - 可视化界面）
npm run test:e2e:ui

# 2. Headless 模式（快速）
npm run test:e2e

# 3. Headed 模式（显示浏览器）
npx playwright test --headed

# 4. Debug 模式（逐步调试）
npm run test:e2e:debug
```

#### UI 模式特点

在 UI 模式中，您可以：
- 📋 查看所有测试列表
- ▶️ 单独运行任意测试
- ⏸️ 暂停和单步执行
- 📸 查看每一步的截图和 DOM
- 🌐 查看网络请求

#### 测试环境

E2E 测试会自动：
1. 启动后端测试服务（端口 9001）
2. 启动前端测试服务（端口 5173）
3. 使用独立的测试数据库
4. 测试后自动清理

#### 特别注意

⚠️ **单用户限制**: 系统只支持单用户注册，测试使用固定用户 `admin@example.com`

---

## 🏗️ 测试架构

### 后端测试架构

#### 分层测试策略

我们采用自底向上的测试策略：

1. **第1层：认证授权** - 最基础的用户和权限管理
2. **第2层：秘钥组** - 秘钥的分组管理（V2新功能）
3. **第3层：秘钥管理** - 实际的秘钥存储和加密
4. **第4层：环境变量** - 环境变量管理和秘钥引用
5. **第5层：应用部署** - 应用的部署和管理
6. **第6层：部署日志** - 部署历史和审计

每一层都依赖下面的层，因此测试顺序很重要。

#### 测试隔离

- 每个测试都独立运行
- 使用独立的测试数据库 (`data/test/`)
- 测试前后自动清理数据
- 强制 WAL checkpoint 确保数据一致性

#### 测试辅助工具

- `ApiClient`: 封装 HTTP 请求，自动处理认证
- `createTestXxx`: 生成测试数据的辅助函数
- Global Setup/Teardown: 测试环境初始化和清理

### 前端测试架构

#### E2E 测试策略

- 使用 Playwright 进行真实浏览器测试
- 测试真实的 API 请求（不使用 Mock）
- 使用 `data-testid` 确保选择器稳定
- DOM 等待机制处理 React 异步渲染

#### 测试环境隔离

- 独立的测试数据库路径
- 独立的测试端口
- 测试前清理所有测试数据
- 测试后清理测试容器

---

## ✅ 测试前检查

运行测试前请确保：

### Backend 测试

1. ✅ **Docker 正在运行**
   ```bash
   docker ps
   ```

2. ✅ **依赖已安装**
   ```bash
   cd backend && npm install
   ```

3. ✅ **端口未被占用**
   - 测试使用端口 9001
   - 检查：`lsof -i:9001`

### UI E2E 测试

1. ✅ **后端和前端依赖已安装**
   ```bash
   cd backend && npm install
   cd ../ui && npm install
   ```

2. ✅ **Playwright 浏览器已安装**
   ```bash
   cd ui && npx playwright install
   ```

3. ✅ **端口未被占用**
   - 后端测试：9001
   - 前端测试：5173

---

## 🐛 常见问题

### Backend 测试

#### 1. Docker 未运行

**错误信息**:
```
❌ Docker daemon is not running
```

**解决方案**:
```bash
# macOS
open -a Docker

# Linux
sudo systemctl start docker
```

#### 2. 端口被占用

**错误信息**:
```
Error: Port 9001 is already in use
```

**解决方案**:
```bash
# 查找占用端口的进程
lsof -i:9001

# 杀死进程
kill -9 <PID>
```

#### 3. 测试容器残留

**解决方案**:
```bash
# 清理所有测试容器
docker rm -f $(docker ps -a --filter "name=test-" -q)
```

#### 4. 数据库锁定

**错误信息**:
```
Error: database is locked
```

**解决方案**:
```bash
# 删除测试数据库
cd backend
rm -rf data/test/*
```

### UI E2E 测试

#### 1. 服务启动超时

**错误信息**:
```
TimeoutError: Timeout 120000ms exceeded
```

**解决方案**:
```bash
# 手动启动服务检查是否正常
cd backend && npm run test:serve  # 端口 9001
cd ui && npm run test:serve       # 端口 5173
```

#### 2. 找不到元素

**错误信息**:
```
TimeoutError: waiting for locator('[data-testid="xxx"]')
```

**可能原因**:
- React 渲染未完成
- data-testid 名称错误
- 页面跳转未完成

**解决方案**: 使用 UI 模式查看实际页面状态

#### 3. 测试数据冲突

**问题**: 用户已存在导致注册失败

**解决方案**: 
- 测试会自动清理数据库
- 如果失败，手动删除: `rm -rf backend/data/test/*`

---

## 💡 最佳实践

### 开发时

1. **使用监听模式**
   ```bash
   npm run test:watch  # 后端
   npm run test:e2e:ui # 前端（UI模式）
   ```

2. **单独测试修改的模块**
   ```bash
   npm test -- auth.test.ts
   ```

3. **查看覆盖率确保新代码有测试**
   ```bash
   npm run test:coverage
   ```

### 提交前

1. **运行所有测试**
   ```bash
   cd backend && npm test
   cd ../ui && npm run test:e2e
   ```

2. **检查测试覆盖率**
   ```bash
   cd backend && npm run test:coverage
   ```

3. **清理测试资源**
   ```bash
   docker rm -f $(docker ps -a --filter "name=test-" -q)
   ```

### CI/CD

1. **使用 headless 模式**
   ```bash
   npm test                # 后端
   npm run test:e2e        # 前端
   ```

2. **保存测试报告**
   - 后端: `backend/coverage/`
   - 前端: `ui/playwright-report/`

---

## 📚 相关文档

| 文档 | 说明 |
|------|------|
| [后端测试指南](./backend/TESTING_GUIDE.md) | 详细的后端测试说明 |
| [后端快速开始](./backend/TESTING_QUICKSTART.md) | 5分钟快速上手 |
| [测试代码结构](./backend/tests/README.md) | 测试代码组织 |
| [UI测试标识指南](./ui/DATA_TESTID_GUIDE.md) | data-testid 使用规范 |

---

## 📊 测试状态

### 后端测试

| 测试套件 | 状态 | 测试数 |
|---------|------|--------|
| 认证授权 | ✅ 通过 | 15+ |
| 秘钥组 | ✅ 通过 | 8+ |
| 秘钥管理 | ✅ 通过 | 12+ |
| 环境变量 | ✅ 通过 | 10+ |
| 应用部署 | ✅ 通过 | 10+ |
| 部署日志 | ✅ 通过 | 8+ |

### 前端 E2E 测试

| 测试套件 | 状态 | 测试数 |
|---------|------|--------|
| 认证流程 | ✅ 通过 | 3 |

---

**最后更新**: 2025-10-24  
**状态**: ✅ 所有测试通过

祝测试愉快！🎉
