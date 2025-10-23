# 测试命令使用指南

## 🚀 快速开始

从项目根目录运行测试：

```bash
# 检查 Docker 是否运行
pnpm docker:check

# 运行所有测试
pnpm test

# 监听模式（推荐用于开发）
pnpm test:watch

# 生成覆盖率报告
pnpm test:coverage
```

## 📋 可用命令

### 从根目录运行（推荐）

| 命令 | 说明 |
|------|------|
| `pnpm docker:check` | 检查 Docker 是否运行 |
| `pnpm test` | 运行所有测试（自动检查 Docker） |
| `pnpm test:watch` | 监听模式，文件变化自动重测 |
| `pnpm test:coverage` | 运行测试并生成覆盖率报告 |
| `pnpm test:verbose` | 详细输出模式 |
| `pnpm test:ci` | CI 环境运行（包含覆盖率） |
| `pnpm test:integration` | 只运行集成测试 |
| `pnpm test:e2e` | 只运行端到端测试 |
| `pnpm test:setup` | 运行测试环境设置脚本 |
| `pnpm test:cleanup` | 清理测试资源 |

### 从 backend 目录运行

```bash
cd backend

# 所有测试命令都可以直接使用 npm
npm test
npm run test:watch
npm run test:coverage
```

## 📖 详细文档

- **[快速开始指南](./backend/TESTING_QUICKSTART.md)** - 5分钟快速上手
- **[完整测试指南](./backend/TESTING_GUIDE.md)** - 深入了解测试架构
- **[Docker 检查指南](./backend/DOCKER_CHECK_GUIDE.md)** - Docker 检查机制说明
- **[测试套件说明](./backend/tests/README.md)** - 测试代码结构和 API

## ✅ 测试前检查

运行测试前请确保：

1. ✅ **Docker 正在运行**
   ```bash
   docker ps
   # 或使用项目提供的检查命令
   pnpm docker:check
   ```

2. ✅ **依赖已安装**
   ```bash
   pnpm install
   ```

3. ✅ **端口未被占用**
   - 测试使用端口 9001
   - 检查：`lsof -i:9001`

## 🎯 使用场景

### 开发时使用

```bash
# 启动监听模式
pnpm test:watch

# 修改代码后会自动重新运行相关测试
```

### 提交前检查

```bash
# 运行所有测试
pnpm test

# 查看覆盖率
pnpm test:coverage
open backend/coverage/lcov-report/index.html
```

### CI/CD 集成

```bash
# CI 环境运行
pnpm test:ci
```

## 🐛 常见问题

### 1. Docker 未运行

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

### 2. 端口被占用

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

### 3. 测试容器残留

**解决方案**:
```bash
# 清理所有测试容器
pnpm test:cleanup

# 或手动清理
docker rm -f $(docker ps -a --filter "name=test-" -q)
```

## 📊 测试覆盖情况

当前测试覆盖：

- ✅ 认证和授权 (15+ 测试用例, ~90% 覆盖)
- ✅ 应用部署 (10+ 测试用例, ~85% 覆盖)
- ✅ 秘钥管理 (15+ 测试用例, ~80% 覆盖)
- 📝 秘钥提供者（待添加）
- 📝 域名管理（待添加）
- 📝 镜像仓库（待添加）

## 💡 提示

1. **使用监听模式** - 开发时使用 `pnpm test:watch` 提高效率
2. **定期查看覆盖率** - 确保新功能有测试覆盖
3. **清理测试资源** - 测试失败时可能需要手动清理容器
4. **保持测试快速** - 单个测试应在 5 秒内完成

## 🚦 测试状态指示

测试运行时的输出说明：

```
✅ Pass  - 测试通过
❌ Fail  - 测试失败
⏭️  Skip  - 测试跳过
🏃 Running - 正在运行
```

## 📈 下一步

阅读完整的测试文档以了解更多：

```bash
# 查看快速开始指南
cat backend/TESTING_QUICKSTART.md

# 查看完整指南
cat backend/TESTING_GUIDE.md

# 查看 Docker 检查说明
cat backend/DOCKER_CHECK_GUIDE.md
```

---

**祝测试愉快！** 🎉

如有问题，请查看 [常见问题解答](./backend/TESTING_QUICKSTART.md#常见问题) 或相关文档。

