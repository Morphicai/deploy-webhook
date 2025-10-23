# 测试套件说明

这是 Deploy Webhook 项目的完整测试套件，采用测试驱动开发（TDD）方法，提供真实环境的集成测试。

## 🎯 测试策略

本测试套件采用**真实环境集成测试**策略：

- ✅ **真实的 HTTP 请求**: 使用 supertest 发送实际的 HTTP 请求
- ✅ **真实的数据库操作**: 使用独立的测试数据库进行真实的读写操作
- ✅ **真实的 Docker 操作**: 实际创建和管理 Docker 容器
- ✅ **真实的认证流程**: 测试实际的 JWT、API Key、Webhook Secret 等认证机制

## 📁 目录结构

```
tests/
├── setup/                    # 测试环境设置
│   ├── testSetup.ts         # 全局测试配置和初始化
│   ├── testDatabase.ts      # 测试数据库管理（创建、清理、重置）
│   ├── testServer.ts        # 测试服务器管理（启动、停止）
│   └── testAppFactory.ts    # 测试应用工厂（创建 Express 实例）
│
├── helpers/                  # 测试辅助工具
│   ├── apiClient.ts         # API 客户端封装（简化 HTTP 请求）
│   ├── fixtures.ts          # 测试数据生成器（一致的测试数据）
│   └── cleanup.ts           # 资源清理工具（Docker 容器清理）
│
├── integration/              # 集成测试
│   ├── auth.test.ts         # 认证和授权测试
│   ├── deploy.test.ts       # 应用部署测试
│   ├── secrets.test.ts      # 秘钥和环境变量测试
│   ├── secret-providers.test.ts  # 秘钥提供者测试（待添加）
│   ├── domains.test.ts      # 域名管理测试（待添加）
│   ├── repositories.test.ts # 镜像仓库测试（待添加）
│   └── webhooks.test.ts     # Webhook 测试（待添加）
│
└── e2e/                      # 端到端测试
    └── deployment-flow.test.ts  # 完整部署流程测试（待添加）
```

## 🔧 测试组件

### Setup 模块

#### testSetup.ts
- 加载测试环境变量
- 设置全局测试配置
- 配置测试超时时间
- 全局清理钩子

#### testDatabase.ts
- `initializeTestDatabase()` - 创建全新的测试数据库
- `cleanTestDatabase()` - 删除测试数据库文件
- `clearTestDatabaseTables()` - 清空所有表但保留结构
- `getTestDatabase()` - 获取数据库连接
- `backupTestDatabase()` / `restoreTestDatabase()` - 备份和恢复

#### testServer.ts
- `startTestServer()` - 启动测试服务器
- `stopTestServer()` - 停止测试服务器
- `getTestApp()` - 获取 Express 应用实例
- `resetTestEnvironment()` - 重置测试环境

#### testAppFactory.ts
- `createApp()` - 创建完整的 Express 应用实例
- 包含所有生产环境的路由和中间件
- 使用测试数据库配置

### Helpers 模块

#### apiClient.ts
封装的 API 客户端，提供便捷方法：

```typescript
const client = new ApiClient(app, authToken);

// 认证
await client.login(email, password);
await client.register(email, password);

// 部署
await client.deploy({ image, port, containerPort });

// 应用管理
await client.listApplications();
await client.getApplication(id);
await client.deleteApplication(id);

// 秘钥管理
await client.createSecret(data);
await client.listSecrets();

// 环境变量
await client.createEnvVar(data);
await client.listEnvVars(scope, projectName);

// 域名管理
await client.createDomain(data);
await client.listDomains();
```

#### fixtures.ts
测试数据生成器，提供一致的测试数据：

```typescript
// 预定义的测试用户
TEST_USERS.admin    // admin@test.com
TEST_USERS.user     // user@test.com

// 测试认证凭据
TEST_AUTH.webhookSecret
TEST_AUTH.adminToken

// 数据生成函数
createTestApplication(overrides)
createTestSecret(overrides)
createTestEnvVar(overrides)
createTestDomain(overrides)
createTestRepository(overrides)

// 工具函数
generateTestContainerName()
generateTestPort()
randomString(length)
wait(ms)
retry(fn, options)
```

#### cleanup.ts
Docker 资源清理工具：

```typescript
// 清理所有测试容器
await cleanupTestContainers();

// 删除特定容器
await removeContainer(containerName);

// 检查容器状态
const exists = await containerExists(containerName);
const running = await isContainerRunning(containerName);

// 等待容器启动
const ready = await waitForContainer(containerName, timeout);

// 获取容器日志（调试用）
const logs = await getContainerLogs(containerName);

// 完整清理
await fullTestCleanup();
```

## 📝 测试用例

### auth.test.ts - 认证和授权

测试范围：
- ✅ 用户注册（成功、重复邮箱、无效格式、密码强度）
- ✅ 用户登录（成功、错误密码、不存在的用户）
- ✅ Admin Token 认证（有效 token、无效 token、缺少 token）
- ✅ Webhook Secret 认证（有效 secret、无效 secret）
- ✅ API Key 认证（创建、使用、无效 key）
- ✅ JWT Token 认证（有效 token、无效 token）

### deploy.test.ts - 应用部署

测试范围：
- ✅ 基础部署（简单应用、自动生成名称、环境变量注入）
- ✅ 部署验证（缺少字段、无效端口、空镜像名）
- ✅ 容器更新（替换现有容器）
- ✅ 应用管理（列表查询、详情查询）
- ✅ 错误处理（无效镜像、认证失败）
- ✅ 健康检查

### secrets.test.ts - 秘钥和环境变量

测试范围：
- ✅ 秘钥管理（创建、列表、更新、删除、重复名称）
- ✅ 环境变量（全局变量、项目变量、列表查询、过滤、更新、删除）
- ✅ Upsert 操作
- ✅ 优先级处理（项目变量覆盖全局变量）
- ✅ 认证检查

## 🚀 运行测试

```bash
# 安装依赖
npm install

# 运行所有测试
npm test

# 运行特定测试文件
npm test -- auth.test.ts

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# 详细输出
npm run test:verbose

# CI 模式
npm run test:ci
```

## 🎯 测试覆盖目标

- **语句覆盖率**: > 80%
- **分支覆盖率**: > 75%
- **函数覆盖率**: > 80%
- **行覆盖率**: > 80%

当前已实现的测试用例覆盖了以下核心功能：
- ✅ 认证和授权（90%+ 覆盖）
- ✅ 应用部署（85%+ 覆盖）
- ✅ 秘钥管理（80%+ 覆盖）
- ⏳ 秘钥提供者（待添加）
- ⏳ 域名管理（待添加）
- ⏳ 镜像仓库（待添加）
- ⏳ Webhook（待添加）

## 🔍 测试模式

### 单元测试
针对单个函数或模块的测试（暂未实现，可后续添加）

### 集成测试（当前重点）
测试多个模块协作的场景：
- API 路由 + 服务层 + 数据库
- 认证中间件 + 业务逻辑
- Docker 操作 + 状态管理

### 端到端测试（E2E）
模拟真实用户场景的完整流程测试（待添加）

## 📊 测试报告

运行 `npm run test:coverage` 后，在 `coverage/` 目录生成报告：

```
coverage/
├── lcov-report/
│   └── index.html      # HTML 格式的覆盖率报告
├── lcov.info           # LCOV 格式（用于 CI）
└── coverage-final.json # JSON 格式
```

## 🐛 调试技巧

### 1. 运行单个测试
```bash
npm test -- --testNamePattern="应该成功登录"
```

### 2. 查看容器状态
```bash
docker ps -a | grep test-
```

### 3. 查看容器日志
在测试中使用：
```typescript
const logs = await getContainerLogs(containerName);
console.log('Container logs:', logs);
```

### 4. 保留测试数据
注释掉清理代码进行调试：
```typescript
afterEach(async () => {
  // await cleanTestDatabase();  // 暂时注释掉
});
```

### 5. 使用 Jest 调试器
在 VS Code 中设置断点，使用 Jest 调试配置运行。

## 💡 编写新测试

### 基础模板

```typescript
import { Express } from 'express';
import { createApp } from '../setup/testAppFactory';
import { initializeTestDatabase, cleanTestDatabase } from '../setup/testDatabase';
import { ApiClient } from '../helpers/apiClient';
import { TEST_AUTH } from '../helpers/fixtures';

describe('功能模块名称', () => {
  let app: Express;
  let client: ApiClient;

  beforeAll(async () => {
    initializeTestDatabase();
    app = createApp();
    client = new ApiClient(app, TEST_AUTH.adminToken);
  });

  beforeEach(async () => {
    cleanTestDatabase();
    initializeTestDatabase();
  });

  afterEach(async () => {
    // 清理测试资源
  });

  describe('子功能', () => {
    it('应该成功执行操作', async () => {
      // Arrange: 准备
      const testData = { /* ... */ };
      
      // Act: 执行
      const response = await client.post('/api/endpoint', testData);
      
      // Assert: 验证
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
```

## 📚 参考文档

- [完整测试指南](../TESTING_GUIDE.md)
- [快速开始指南](../TESTING_QUICKSTART.md)
- [Jest 文档](https://jestjs.io/)
- [Supertest 文档](https://github.com/visionmedia/supertest)

## 🤝 贡献指南

添加新测试时：

1. 在 `tests/integration/` 创建新的测试文件
2. 使用一致的命名：`feature.test.ts`
3. 遵循 AAA 模式（Arrange-Act-Assert）
4. 添加清晰的测试描述
5. 确保测试独立性（可以单独运行）
6. 添加必要的清理代码
7. 更新此 README

## 🎓 最佳实践

1. **测试独立性**: 每个测试应该能够独立运行
2. **测试清理**: 每个测试后清理资源（容器、数据）
3. **有意义的命名**: 测试名称应该描述测试内容
4. **避免硬编码**: 使用 fixtures 生成测试数据
5. **错误场景**: 不只测试成功场景，也要测试失败场景
6. **真实性**: 尽可能模拟真实使用场景
7. **速度**: 保持测试快速（单个测试 < 5秒）
8. **可读性**: 代码清晰，注释充分

## ⚠️ 注意事项

1. **Docker 依赖**: 大部分测试需要 Docker 运行
2. **测试隔离**: 使用独立的测试数据库（`data/test/`）
3. **端口占用**: 测试使用 9001 端口，确保未被占用
4. **清理资源**: 测试失败时可能留下容器，需要手动清理
5. **网络要求**: 部署测试需要拉取 Docker 镜像
6. **超时设置**: Docker 操作可能较慢，设置合理超时

