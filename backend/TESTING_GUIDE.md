# 测试驱动开发指南

## 📋 测试方案概述

本项目采用**真实环境集成测试**策略，在本地环境下模拟真实的生产场景，包括：
- 真实的 HTTP API 请求
- 真实的数据库读写操作
- 真实的 Docker 容器操作
- 真实的认证和授权流程

## 🎯 测试目标

1. **功能完整性测试**：验证所有 API 端点的功能
2. **数据一致性测试**：验证数据库操作的正确性
3. **安全性测试**：验证认证和授权机制
4. **集成测试**：验证各模块间的协作
5. **回归测试**：防止新功能破坏现有功能

## 🏗️ 测试架构

```
backend/
├── src/                      # 源代码
├── tests/                    # 测试代码
│   ├── setup/               # 测试设置和配置
│   │   ├── testSetup.ts     # 全局测试设置
│   │   ├── testDatabase.ts  # 测试数据库管理
│   │   └── testServer.ts    # 测试服务器
│   ├── helpers/             # 测试辅助工具
│   │   ├── apiClient.ts     # API 客户端封装
│   │   ├── fixtures.ts      # 测试数据生成
│   │   └── assertions.ts    # 自定义断言
│   ├── integration/         # 集成测试
│   │   ├── auth.test.ts
│   │   ├── deploy.test.ts
│   │   ├── applications.test.ts
│   │   ├── secrets.test.ts
│   │   ├── secret-providers.test.ts
│   │   ├── domains.test.ts
│   │   ├── repositories.test.ts
│   │   └── webhooks.test.ts
│   └── e2e/                 # 端到端测试
│       └── deployment-flow.test.ts
├── jest.config.js           # Jest 配置
└── .env.test                # 测试环境变量
```

## 🔧 技术栈

- **测试框架**: Jest
- **HTTP 客户端**: Supertest
- **断言库**: Jest + Chai (可选)
- **Mock 工具**: Jest Mocks
- **数据生成**: faker-js

## 📝 环境配置

### 测试环境变量 (.env.test)

```env
# 测试环境标识
NODE_ENV=test

# 测试服务器配置
PORT=9001
TEST_PORT=9001

# 测试数据库（独立的测试数据库）
DB_PATH=./data/test

# 测试认证
WEBHOOK_SECRET=test-webhook-secret-123
ADMIN_TOKEN=test-admin-token-456

# Docker 配置（使用本地 Docker）
DOCKER_SOCK_PATH=/var/run/docker.sock
REGISTRY_HOST=docker.io

# 测试镜像仓库
DOCKER_USERNAME=
DOCKER_PASSWORD=

# 测试回调
CALLBACK_URL=
CALLBACK_SECRET=

# 禁用镜像清理（测试环境）
PRUNE_IMAGES=false

# 测试日志级别
LOG_LEVEL=error
```

## 🧪 测试策略

### 1. 数据库隔离策略

- **独立数据库**：测试使用 `data/test/` 目录下的独立数据库
- **自动清理**：每次测试运行前清空数据库
- **测试数据**：使用 fixtures 生成一致的测试数据

### 2. 测试用户管理

```typescript
// 测试用户账号
const TEST_USERS = {
  admin: {
    email: 'admin@test.com',
    password: 'test-password-123'
  },
  user: {
    email: 'user@test.com',
    password: 'test-password-456'
  }
};
```

### 3. API 测试策略

- **真实 HTTP 请求**：使用 supertest 发送真实请求
- **认证测试**：测试各种认证方式（Token、API Key、Webhook Secret）
- **错误处理**：测试各种错误场景
- **边界条件**：测试极限情况

### 4. Docker 容器测试策略

- **测试容器前缀**：所有测试容器名称以 `test-` 开头
- **自动清理**：测试结束后自动删除测试容器
- **镜像选择**：使用轻量级镜像（如 nginx:alpine）

## 📦 测试用例设计

### 基础测试模板

```typescript
describe('模块名称', () => {
  let apiClient: ApiClient;
  let authToken: string;
  
  beforeAll(async () => {
    // 初始化测试环境
    await setupTestEnvironment();
  });
  
  beforeEach(async () => {
    // 清理测试数据
    await cleanupTestData();
    
    // 登录获取 token
    authToken = await loginTestUser('admin');
    apiClient = new ApiClient(authToken);
  });
  
  afterEach(async () => {
    // 清理测试产生的资源
    await cleanupTestResources();
  });
  
  afterAll(async () => {
    // 关闭测试服务器
    await teardownTestEnvironment();
  });
  
  describe('功能描述', () => {
    it('应该成功执行操作', async () => {
      // Arrange: 准备测试数据
      const testData = createTestData();
      
      // Act: 执行操作
      const response = await apiClient.post('/api/endpoint', testData);
      
      // Assert: 验证结果
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // 验证数据库状态
      const record = await getFromDatabase(testData.id);
      expect(record).toBeDefined();
    });
    
    it('应该返回错误（错误场景）', async () => {
      // 测试错误处理
    });
  });
});
```

## 🔍 测试覆盖范围

### 1. 认证和授权
- ✅ 用户登录/登出
- ✅ Admin Token 验证
- ✅ API Key 验证
- ✅ Webhook Secret 验证
- ✅ 权限检查

### 2. 应用部署
- ✅ 部署新应用
- ✅ 更新现有应用
- ✅ 删除应用
- ✅ 查询应用列表
- ✅ 环境变量注入
- ✅ 容器生命周期管理

### 3. 秘钥管理
- ✅ 创建/读取/更新/删除秘钥
- ✅ 秘钥提供者管理
- ✅ 秘钥同步（手动/自动）
- ✅ 同步历史查询

### 4. 域名和 Caddy
- ✅ 域名 CRUD 操作
- ✅ Caddyfile 生成
- ✅ 配置验证
- ✅ 配置重载

### 5. 镜像仓库
- ✅ 仓库 CRUD 操作
- ✅ 认证配置
- ✅ 默认仓库设置
- ✅ 镜像白名单

### 6. Webhook
- ✅ Webhook 配置管理
- ✅ Infisical Webhook 处理
- ✅ 签名验证

## 🚀 快速开始

### 安装测试依赖

```bash
cd backend
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest @faker-js/faker
```

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- auth.test.ts

# 运行测试并生成覆盖率报告
npm test -- --coverage

# 监听模式（开发时使用）
npm test -- --watch

# 只运行失败的测试
npm test -- --onlyFailures
```

## 📊 测试报告

测试运行后会生成：
- **控制台输出**：测试结果摘要
- **覆盖率报告**：`coverage/` 目录
- **详细日志**：失败测试的详细信息

## 🎯 测试最佳实践

### 1. 测试命名规范

```typescript
// 好的命名
it('应该在提供有效凭据时成功部署应用', async () => {});
it('应该在缺少必需字段时返回 400 错误', async () => {});

// 不好的命名
it('test1', async () => {});
it('works', async () => {});
```

### 2. 测试数据管理

```typescript
// 使用 fixtures 生成一致的测试数据
const testApp = createTestApplication({
  name: 'test-nginx',
  image: 'nginx',
  version: 'alpine',
  port: 9080,
  containerPort: 80
});
```

### 3. 异步操作处理

```typescript
// 使用 async/await
it('应该等待异步操作完成', async () => {
  const result = await deployService.deploy(testData);
  expect(result.success).toBe(true);
});
```

### 4. 清理测试资源

```typescript
afterEach(async () => {
  // 删除测试容器
  await cleanupTestContainers();
  
  // 清空测试数据库
  await clearTestDatabase();
  
  // 重置 mocks
  jest.clearAllMocks();
});
```

### 5. 错误场景测试

```typescript
it('应该在认证失败时返回 401', async () => {
  const response = await request(app)
    .post('/api/secrets')
    .set('x-admin-token', 'invalid-token')
    .send(testData);
    
  expect(response.status).toBe(401);
  expect(response.body.error).toContain('Unauthorized');
});
```

## 🔄 持续集成

### GitHub Actions 配置示例

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        
    - name: Install dependencies
      run: |
        cd backend
        npm ci
        
    - name: Run tests
      run: |
        cd backend
        npm test -- --coverage
        
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        files: ./backend/coverage/coverage-final.json
```

## 🐛 调试测试

### 1. 使用 VSCode 调试器

在 `.vscode/launch.json` 中添加：

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/backend/node_modules/.bin/jest",
  "args": ["--runInBand", "--testPathPattern=${relativeFile}"],
  "cwd": "${workspaceFolder}/backend",
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### 2. 查看详细日志

```bash
# 启用详细日志
LOG_LEVEL=debug npm test
```

### 3. 单独运行失败的测试

```bash
npm test -- --testNamePattern="应该成功部署应用"
```

## 📈 测试指标

### 目标覆盖率
- **语句覆盖率**: > 80%
- **分支覆盖率**: > 75%
- **函数覆盖率**: > 80%
- **行覆盖率**: > 80%

### 测试性能
- 单个测试: < 5秒
- 完整测试套件: < 2分钟

## 🔗 相关资源

- [Jest 文档](https://jestjs.io/)
- [Supertest 文档](https://github.com/visionmedia/supertest)
- [测试最佳实践](https://github.com/goldbergyoni/javascript-testing-best-practices)

