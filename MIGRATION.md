# Monorepo 迁移完成 ✅

项目已成功迁移至 pnpm workspace 管理的 monorepo 结构。

## 🎉 完成的改造

### 1. ✅ 项目结构重组

```
旧结构:
deploy-webhook/
├── src/              # 后端源码
├── dist/             # 后端编译输出
├── Dockerfile        # 后端 Docker 文件
├── package.json      # 后端依赖
└── ui/               # 前端项目

新结构:
deploy-webhook/
├── backend/          # 后端工作区
│   ├── src/
│   ├── dist/
│   ├── Dockerfile
│   └── package.json
├── ui/               # 前端工作区
│   ├── src/
│   ├── dist/
│   └── package.json
├── data/             # 共享数据
├── pnpm-workspace.yaml
└── package.json      # 根级配置
```

### 2. ✅ 配置文件更新

- ✅ 创建 `pnpm-workspace.yaml` - workspace 配置
- ✅ 创建根级 `package.json` - 统一脚本管理
- ✅ 创建 `.npmrc` - pnpm 配置
- ✅ 更新 `docker-compose.yml` - 调整 context 路径
- ✅ 更新 `Makefile` - 适配 monorepo 命令
- ✅ 创建根级 `.gitignore` - 统一忽略规则

### 3. ✅ Docker 配置迁移

- ✅ 移动 `Dockerfile` → `backend/Dockerfile`
- ✅ 移动 `Dockerfile.dev` → `backend/Dockerfile.dev`
- ✅ 更新 docker-compose.yml 中的 build context
- ✅ 添加数据目录挂载

### 4. ✅ 文档更新

- ✅ 更新 `README.md` - 添加 monorepo 说明
- ✅ 创建 `MONOREPO.md` - monorepo 使用指南
- ✅ 创建 `MIGRATION.md` - 本迁移文档

### 5. ✅ 清理工作

- ✅ 删除根目录的 `src/`, `dist/`, `scripts/`
- ✅ 删除根目录的 `Dockerfile`, `Dockerfile.dev`
- ✅ 删除根目录的 `tsconfig.json`

## 📋 接下来要做的事

### 1. 安装 pnpm (如果还没有)

```bash
npm install -g pnpm
```

### 2. 安装所有依赖

```bash
# 在项目根目录执行
pnpm install

# 这将安装：
# - 根目录的依赖
# - backend/ 的依赖
# - ui/ 的依赖
```

### 3. 验证安装

```bash
# 检查 backend 是否正常
pnpm --filter backend build
pnpm --filter backend dev

# 检查 UI 是否正常
pnpm --filter ui build
pnpm --filter ui dev

# 或同时启动
pnpm dev
```

### 4. 测试 Docker 构建

```bash
# 构建 Docker 镜像
make build-docker

# 或
cd backend
docker build -t deploy-webhook:test .
```

### 5. 测试 Docker Compose

```bash
# 启动生产环境
docker-compose up -d

# 启动开发环境
docker-compose --profile dev up -d

# 查看日志
docker-compose logs -f
```

## ⚠️ 重要变更

### 命令变更对照表

| 旧命令 | 新命令 | 说明 |
|--------|--------|------|
| `npm install` | `pnpm install` | 根目录安装所有依赖 |
| `npm run dev` | `pnpm --filter backend dev` | 启动后端开发服务器 |
| `cd ui && npm run dev` | `pnpm --filter ui dev` | 启动前端开发服务器 |
| `npm run build` | `pnpm --filter backend build` | 构建后端 |
| `cd ui && npm run build` | `pnpm --filter ui build` | 构建前端 |
| - | `pnpm dev` | 同时启动前后端 |
| - | `pnpm build` | 构建所有项目 |
| `./scripts/build.sh` | `cd backend && ./scripts/build.sh` | 构建 Docker |
| `make dev` | `make dev` (保持不变) | Makefile 命令 |

### 路径变更

| 类型 | 旧路径 | 新路径 |
|------|--------|--------|
| 后端源码 | `src/` | `backend/src/` |
| 后端编译输出 | `dist/` | `backend/dist/` |
| Dockerfile | `Dockerfile` | `backend/Dockerfile` |
| 构建脚本 | `scripts/` | `backend/scripts/` |
| 前端项目 | `ui/` | `ui/` (不变) |
| 数据库 | `data/` | `data/` (不变) |

### Docker Compose 变更

```yaml
# 旧配置
services:
  deploy-webhook:
    build: 
      context: .        # 根目录
      
# 新配置
services:
  deploy-webhook:
    build: 
      context: ./backend  # backend 目录
```

## 🔍 验证清单

在提交代码前，请确保以下项目都通过：

- [ ] `pnpm install` 成功执行
- [ ] `pnpm --filter backend build` 成功
- [ ] `pnpm --filter ui build` 成功
- [ ] `pnpm --filter backend dev` 可以启动
- [ ] `pnpm --filter ui dev` 可以启动
- [ ] `make build-docker` 成功构建镜像
- [ ] `docker-compose up -d` 成功启动
- [ ] 后端健康检查通过: `curl http://localhost:9000/health`
- [ ] 前端可以访问: `http://localhost:5173` (开发) 或部署后的地址
- [ ] 数据库文件在 `data/` 目录正常工作

## 🐛 常见问题

### Q1: pnpm install 失败

**解决方案:**
```bash
# 清理缓存
pnpm store prune
rm -rf node_modules backend/node_modules ui/node_modules

# 重新安装
pnpm install
```

### Q2: Docker 构建找不到文件

**原因:** Docker context 已经改为 `backend/`

**解决方案:**
```bash
# 确保在 backend 目录或使用正确的 context
cd backend && docker build -t deploy-webhook .

# 或使用 docker-compose
docker-compose build
```

### Q3: 数据库文件路径错误

**原因:** 数据库文件在 `data/` 目录

**解决方案:**
- 检查 backend 配置中的数据库路径
- 确保 Docker volume 正确挂载 `./data:/app/data`

### Q4: UI 无法访问后端 API

**解决方案:**
- 检查 `ui/src/api/client.ts` 中的 API 地址配置
- 开发环境确保后端在 9000 端口运行
- 检查 CORS 配置

## 📚 更多资源

- [pnpm 官方文档](https://pnpm.io/)
- [pnpm workspace](https://pnpm.io/workspaces)
- [项目 README](./README.md)
- [Monorepo 使用指南](./MONOREPO.md)

## 🎯 下一步建议

1. **CI/CD 更新**: 如果有 GitHub Actions 等 CI/CD 配置，需要更新构建路径
2. **环境变量**: 确保 `.env` 文件配置正确
3. **部署文档**: 更新部署相关文档
4. **团队通知**: 通知团队成员项目结构变更

---

**迁移完成时间:** 2025-10-21

如有问题，请参考 [MONOREPO.md](./MONOREPO.md) 或提交 Issue。

