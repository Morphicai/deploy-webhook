# 🚀 开始测试 - 快速指南

## ✅ 已完成的配置

### 1. 测试环境隔离
- ✅ **数据库隔离**: 测试使用 `backend/data/test/` 独立数据库
- ✅ **端口隔离**: 测试使用端口 9001，开发使用 9000
- ✅ **自动清理**: 测试前后自动清理数据库和容器

### 2. 测试流程优化
- ✅ **从注册开始**: 每个测试前自动注册新用户
- ✅ **数据隔离**: 每个测试使用独立的测试数据
- ✅ **环境变量**: 前端自动指向测试后端

### 3. 测试文件
- ✅ `e2e/auth/register.spec.ts` - 用户注册（6 个测试）
- ✅ `e2e/auth/login.spec.ts` - 用户登录（8 个测试）

## 🚀 开始测试（3 步）

### 方式 1: 使用准备脚本 + 手动启动

```bash
# 步骤 1: 运行准备脚本
./start-test-servers.sh

# 步骤 2: 启动后端（新终端）
cd backend
NODE_ENV=test PORT=9001 DB_PATH=./data/test npm run dev

# 步骤 3: 启动前端（新终端）
cd ui
VITE_API_BASE_URL=http://localhost:9001 npm run dev

# 步骤 4: 运行测试（新终端）
cd ui
npm run test:e2e
```

### 方式 2: 一条命令（自动启动）

```bash
cd ui
npm run test:e2e
```

**注意**: 如果超时，请使用方式 1 手动启动

## 📊 验证配置是否正确

### 1. 检查后端端口
```bash
# 应该看到后端运行在 9001 端口
lsof -i :9001
```

### 2. 检查数据库路径
后端启动时应该显示:
```
Database path: ./data/test
NODE_ENV: test
PORT: 9001
```

### 3. 检查前端环境变量
浏览器控制台检查：
```javascript
console.log(import.meta.env.VITE_API_BASE_URL)
// 应该输出: http://localhost:9001
```

## 🎯 当前测试覆盖

### ✅ 已完成
- [x] 测试环境配置
- [x] 数据库隔离
- [x] 用户注册测试（6 个）
- [x] 用户登录测试（8 个）

### ⏳ 待实现
- [ ] 环境变量测试（10 个）
- [ ] 秘钥管理测试（12 个）
- [ ] 应用部署测试（15 个）
- [ ] 配置管理测试（12 个）
- [ ] 综合场景测试（10 个）

## 🐛 常见问题

### Q: 测试超时怎么办？
**A**: 使用方式 1 手动启动服务，确保服务正常运行后再测试

### Q: 端口被占用？
**A**: 运行 `./start-test-servers.sh` 清理端口

### Q: 数据库被锁定？
**A**: 
```bash
rm backend/data/test/*.db-wal
rm backend/data/test/*.db-shm
```

### Q: 前端调用的还是开发后端？
**A**: 确保启动前端时设置了环境变量：
```bash
VITE_API_BASE_URL=http://localhost:9001 npm run dev
```

## 📚 详细文档

- [E2E_TESTING_GUIDE.md](./E2E_TESTING_GUIDE.md) - 完整测试指南
- [TEST_ENVIRONMENT_SUMMARY.md](./TEST_ENVIRONMENT_SUMMARY.md) - 环境配置总结
- [E2E_TEST_STRATEGY.md](./E2E_TEST_STRATEGY.md) - 测试策略

## 🎓 下一步

准备就绪后，运行测试：

```bash
# 运行所有认证测试
cd ui
npx playwright test e2e/auth/

# 运行特定测试
npx playwright test e2e/auth/register.spec.ts

# UI 模式（可视化）
npm run test:e2e:ui

# Debug 模式
npm run test:e2e:debug
```

---

**准备完成！可以开始测试了！** 🎉

