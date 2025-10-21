# Monorepo 使用指南

本项目使用 pnpm workspace 管理 monorepo，包含以下工作区：

- **backend**: 后端 API 服务
- **ui**: 前端管理界面

## 📦 依赖管理

### 安装依赖

```bash
# 安装所有工作区的依赖
pnpm install

# 仅安装后端依赖
pnpm --filter backend install

# 仅安装前端依赖
pnpm --filter ui install
```

### 添加依赖

```bash
# 为根项目添加开发依赖
pnpm add -Dw <package-name>

# 为后端添加依赖
pnpm --filter backend add <package-name>

# 为前端添加依赖
pnpm --filter ui add <package-name>

# 添加开发依赖
pnpm --filter backend add -D <package-name>
```

### 移除依赖

```bash
# 从后端移除依赖
pnpm --filter backend remove <package-name>

# 从前端移除依赖
pnpm --filter ui remove <package-name>
```

## 🛠️ 开发命令

### 启动开发服务器

```bash
# 同时启动所有服务 (backend + ui)
pnpm dev

# 仅启动后端 (端口 9000)
pnpm --filter backend dev

# 仅启动前端 (端口 5173)
pnpm --filter ui dev
```

### 构建项目

```bash
# 构建所有项目
pnpm build

# 仅构建后端
pnpm --filter backend build

# 仅构建前端
pnpm --filter ui build
```

### 运行脚本

```bash
# 在所有工作区并行运行脚本
pnpm -r <script-name>

# 在所有工作区串行运行脚本
pnpm -r --workspace-concurrency=1 <script-name>

# 在特定工作区运行脚本
pnpm --filter backend <script-name>
pnpm --filter ui <script-name>
```

## 🧹 清理

```bash
# 清理所有构建产物
pnpm run clean

# 清理所有 node_modules
rm -rf node_modules backend/node_modules ui/node_modules

# 或使用 Makefile
make clean-deps
make clean-dist
make clean-all-build
```

## 📝 工作区脚本

### Backend (backend/package.json)

```json
{
  "scripts": {
    "dev": "PORT=9000 nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

### UI (ui/package.json)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  }
}
```

## 🎯 最佳实践

1. **统一使用 pnpm**: 确保所有团队成员使用 pnpm 而不是 npm 或 yarn
2. **根目录操作**: 尽量在根目录执行命令，使用 `--filter` 指定工作区
3. **共享依赖**: 将多个工作区使用的相同依赖提升到根目录
4. **版本控制**: 锁定 pnpm 版本以确保一致性（package.json 中的 engines 字段）

## 🔧 配置文件

### pnpm-workspace.yaml

```yaml
packages:
  - 'backend'
  - 'ui'
```

### .npmrc

```
shamefully-hoist=true
strict-peer-dependencies=false
auto-install-peers=true
```

## 🐛 常见问题

### Q: 为什么使用 pnpm 而不是 npm/yarn?

A: pnpm 的优势：
- 更快的安装速度
- 节省磁盘空间（硬链接机制）
- 更严格的依赖管理
- 原生支持 monorepo

### Q: 如何在 CI/CD 中使用?

A: 示例 GitHub Actions:

```yaml
- name: Install pnpm
  uses: pnpm/action-setup@v2
  with:
    version: 8

- name: Install dependencies
  run: pnpm install --frozen-lockfile

- name: Build
  run: pnpm build
```

### Q: 如何调试特定工作区?

A: 使用 `--filter` 参数：

```bash
pnpm --filter backend dev --inspect
```

## 📚 参考资源

- [pnpm 官方文档](https://pnpm.io/)
- [pnpm workspace 指南](https://pnpm.io/workspaces)
- [Monorepo 最佳实践](https://monorepo.tools/)

