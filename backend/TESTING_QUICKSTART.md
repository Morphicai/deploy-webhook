# 测试快速开始指南

## 📦 安装测试依赖

```bash
cd backend
npm install
```

这将安装以下测试相关的包：
- `jest` - 测试框架
- `ts-jest` - TypeScript 支持
- `supertest` - HTTP 测试
- `@types/jest` - Jest 类型定义
- `@types/supertest` - Supertest 类型定义

## 🚀 运行测试

### 1. 运行所有测试

```bash
npm test
```

### 2. 运行特定测试文件

```bash
# 只运行认证测试
npm test -- auth.test.ts

# 只运行部署测试
npm test -- deploy.test.ts

# 只运行秘钥测试
npm test -- secrets.test.ts
```

### 3. 运行集成测试

```bash
npm run test:integration
```

### 4. 监听模式（开发时使用）

```bash
npm run test:watch
```

在此模式下，每次修改代码都会自动重新运行相关测试。

### 5. 生成覆盖率报告

```bash
npm run test:coverage
```

覆盖率报告将保存在 `coverage/` 目录，可以打开 `coverage/lcov-report/index.html` 查看详细报告。

### 6. 详细输出

```bash
npm run test:verbose
```

显示每个测试用例的详细执行信息。

## 🔧 首次运行准备

### 1. 确保 Docker 正在运行

测试需要访问 Docker socket：

```bash
# macOS/Linux
docker ps

# 应该能看到运行中的容器列表（如果有）
```

### 2. 创建测试环境配置（可选）

复制示例配置文件：

```bash
# 如果需要自定义测试配置
cp .env.test.example .env.test
```

如果不创建 `.env.test`，测试将使用默认配置。

### 3. 清理测试数据（可选）

如果之前运行过测试：

```bash
rm -rf data/test/
```

测试会自动创建和清理测试数据库。

## 📋 测试结构

```
backend/tests/
├── setup/              # 测试设置
│   ├── testSetup.ts    # 全局设置
│   ├── testDatabase.ts # 数据库管理
│   ├── testServer.ts   # 服务器管理
│   └── testAppFactory.ts # 应用工厂
├── helpers/            # 测试辅助工具
│   ├── apiClient.ts    # API 客户端
│   ├── fixtures.ts     # 测试数据
│   └── cleanup.ts      # 资源清理
└── integration/        # 集成测试
    ├── auth.test.ts    # 认证测试
    ├── deploy.test.ts  # 部署测试
    └── secrets.test.ts # 秘钥测试
```

## 🎯 测试示例

### 基础测试用例

```typescript
describe('功能模块', () => {
  it('应该成功执行操作', async () => {
    // Arrange: 准备测试数据
    const testData = { key: 'value' };
    
    // Act: 执行操作
    const response = await client.post('/api/endpoint', testData);
    
    // Assert: 验证结果
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

### 使用 API 客户端

```typescript
import { ApiClient } from '../helpers/apiClient';
import { TEST_AUTH } from '../helpers/fixtures';

const client = new ApiClient(app, TEST_AUTH.adminToken);

// 获取列表
const response = await client.listApplications();

// 创建资源
const createResponse = await client.createSecret({
  name: 'test-secret',
  provider: 'file',
  reference: '/path/to/secret',
});
```

### 使用测试数据生成器

```typescript
import { 
  createTestApplication,
  createTestSecret,
  generateTestContainerName 
} from '../helpers/fixtures';

// 生成测试应用配置
const appData = createTestApplication({
  name: generateTestContainerName(),
  port: 9080,
});

// 生成测试秘钥
const secretData = createTestSecret({
  name: 'my-secret',
});
```

## 🐛 调试测试

### 1. 运行单个测试

```bash
npm test -- --testNamePattern="应该成功部署应用"
```

### 2. 查看详细错误

```bash
npm run test:verbose
```

### 3. 使用 console.log

在测试中添加日志：

```typescript
it('测试用例', async () => {
  const response = await client.post('/api/endpoint', data);
  console.log('Response:', response.body);
  expect(response.status).toBe(200);
});
```

### 4. 保留测试容器

默认情况下，测试会清理所有容器。如果需要保留容器进行调试，可以注释掉清理代码：

```typescript
afterEach(async () => {
  // await cleanupTestContainers(); // 注释掉这行
});
```

然后手动检查容器：

```bash
docker ps -a | grep test-
```

## 📊 查看覆盖率报告

运行测试并生成覆盖率：

```bash
npm run test:coverage
```

在浏览器中打开报告：

```bash
# macOS
open coverage/lcov-report/index.html

# Linux
xdg-open coverage/lcov-report/index.html

# Windows
start coverage/lcov-report/index.html
```

## ⚠️ 常见问题

### 1. Docker 连接失败

**问题**: `Error: connect EACCES /var/run/docker.sock`

**解决**:
```bash
# 确保 Docker 正在运行
docker ps

# 检查 socket 权限（Linux）
sudo chmod 666 /var/run/docker.sock
```

### 2. 端口冲突

**问题**: `Error: Port 9001 is already in use`

**解决**:
```bash
# 修改 .env.test 中的 TEST_PORT
# 或者杀死占用端口的进程
lsof -ti:9001 | xargs kill -9
```

### 3. 测试超时

**问题**: 测试超过 30 秒超时

**解决**:
- 检查 Docker 是否正常运行
- 检查网络连接（拉取镜像需要网络）
- 增加超时时间：
  ```typescript
  it('测试用例', async () => {
    // ...
  }, 60000); // 60秒超时
  ```

### 4. 数据库锁定

**问题**: `Error: database is locked`

**解决**:
```bash
# 删除测试数据库文件
rm -rf data/test/

# 重新运行测试
npm test
```

### 5. 测试容器未清理

**问题**: 大量 test- 开头的容器占用资源

**解决**:
```bash
# 清理所有测试容器
docker ps -a | grep test- | awk '{print $1}' | xargs docker rm -f

# 或者使用项目提供的清理脚本
npm test -- cleanup.test.ts
```

## 🎓 最佳实践

### 1. 测试命名

使用描述性的测试名称：

```typescript
// 好 ✅
it('应该在提供有效凭据时成功登录', async () => {});

// 不好 ❌
it('test1', async () => {});
```

### 2. 测试隔离

每个测试应该是独立的：

```typescript
beforeEach(async () => {
  // 清理数据
  cleanTestDatabase();
  initializeTestDatabase();
});

afterEach(async () => {
  // 清理资源
  await cleanupTestContainers();
});
```

### 3. 使用辅助函数

不要在测试中重复代码：

```typescript
// 使用 fixtures
const appData = createTestApplication({ port: 9080 });

// 使用 API 客户端
const response = await client.createSecret(secretData);
```

### 4. 测试真实场景

编写端到端测试：

```typescript
it('应该完整地部署和访问应用', async () => {
  // 1. 部署应用
  const deployResponse = await client.deploy(appData);
  expect(deployResponse.status).toBe(200);
  
  // 2. 等待启动
  await wait(2000);
  
  // 3. 验证容器运行
  const running = await isContainerRunning(appData.name);
  expect(running).toBe(true);
  
  // 4. 访问应用（可选）
  // const appResponse = await fetch(`http://localhost:${appData.port}`);
  // expect(appResponse.ok).toBe(true);
});
```

## 📚 更多资源

- [完整测试指南](./TESTING_GUIDE.md)
- [Jest 文档](https://jestjs.io/)
- [Supertest 文档](https://github.com/visionmedia/supertest)
- [测试最佳实践](https://github.com/goldbergyoni/javascript-testing-best-practices)

## 💡 提示

1. **先运行简单测试**: 从 `auth.test.ts` 开始，它不需要 Docker
2. **使用监听模式开发**: `npm run test:watch` 提高开发效率
3. **定期查看覆盖率**: 确保核心功能被测试覆盖
4. **保持测试快速**: 单个测试应该在 5 秒内完成
5. **清理测试资源**: 避免测试容器和镜像占用过多空间

## 🚦 CI/CD 集成

在 GitHub Actions 中运行测试：

```yaml
- name: Run tests
  run: |
    cd backend
    npm ci
    npm run test:ci
```

这将运行所有测试并生成覆盖率报告。

