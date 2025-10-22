# MCP stdio 模式配置（官方 SDK）

## 🎯 说明

现在使用 **官方 MCP SDK** 的 stdio 模式，不再依赖第三方的 `supergateway` 桥接工具。

## 📋 配置步骤

### 1. 构建项目（首次或代码更新后）

```bash
cd backend
npm run build
```

### 2. 配置 Claude Desktop

**文件位置：** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "deploy-webhook": {
      "command": "node",
      "args": ["dist/mcp/server.js"],
      "cwd": "/Users/pengzai/www/morphicai/deploy-webhook/backend",
      "env": {
        "DATABASE_PATH": "/Users/pengzai/www/morphicai/deploy-webhook/data/deploy-webhook.db"
      }
    }
  }
}
```

### 3. 配置 Cursor IDE

**文件位置：** `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "deploy-webhook": {
      "command": "node",
      "args": ["dist/mcp/server.js"],
      "cwd": "/Users/pengzai/www/morphicai/deploy-webhook/backend",
      "env": {
        "DATABASE_PATH": "/Users/pengzai/www/morphicai/deploy-webhook/data/deploy-webhook.db"
      }
    }
  }
}
```

### 4. 重启 AI 客户端

- **Claude Desktop**: 完全退出（Cmd+Q）后重新打开
- **Cursor IDE**: 重新加载窗口或重启

## 🧪 测试

在 Claude Desktop 或 Cursor 中输入：

```
"显示所有已部署的应用"
```

或

```
"列出所有可用的 MCP 工具"
```

## 📊 对比：stdio vs HTTP/SSE

| 特性 | stdio 模式 ⭐ | HTTP/SSE 模式 |
|-----|-------------|--------------|
| **依赖** | 只需官方 SDK | 需要 supergateway |
| **启动方式** | 每次自动启动 | 需要后端服务运行 |
| **认证** | 无需 API Key | 需要 API Key |
| **远程访问** | ❌ 本地only | ✅ 支持 |
| **配置复杂度** | 简单 | 中等 |
| **推荐场景** | 本地开发 | 多客户端/远程 |

## 🔧 可用命令

```bash
# 开发模式（自动重启）
cd backend
npm run dev

# 构建
npm run build

# 运行生产服务
npm start

# 直接运行 MCP 服务器（stdio）
npm run mcp
```

## 📝 工作原理

```
Claude Desktop / Cursor
        ↕ stdio (JSON-RPC)
    node dist/mcp/server.js
        ↕
   Deploy Webhook Services
```

**说明：**
- Claude/Cursor 启动时会自动运行 `node dist/mcp/server.js`
- MCP 服务器通过 stdio 与 AI 客户端通信
- 所有工具直接调用本地的服务层（database, docker, caddy）

## ⚠️ 注意事项

1. **首次使用前必须构建：** `npm run build`
2. **代码更新后需要重新构建**
3. **数据库路径必须正确：** 确保 `DATABASE_PATH` 指向正确的位置
4. **Docker 访问：** 确保有权限访问 Docker socket

## 🐛 故障排查

### 问题 1: "Cannot find module 'dist/mcp/server.js'"

**原因：** 没有构建

**解决：**
```bash
cd backend
npm run build
```

### 问题 2: Claude/Cursor 看不到工具

**检查步骤：**

1. **确认配置文件路径正确**
   ```bash
   # Claude Desktop
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
   
   # Cursor
   cat ~/.cursor/mcp.json
   ```

2. **确认 cwd 路径正确**
   - 必须是绝对路径
   - 指向 backend 目录

3. **完全重启 AI 客户端**
   - 不是关闭窗口，是完全退出（Cmd+Q）

4. **查看日志**
   ```bash
   # Claude Desktop
   tail -f ~/Library/Logs/Claude/mcp*.log
   ```

### 问题 3: 数据库错误

**检查数据库路径：**
```bash
ls -la /Users/pengzai/www/morphicai/deploy-webhook/data/deploy-webhook.db
```

**如果不存在，运行一次后端服务会自动创建：**
```bash
cd backend
npm run dev
# Ctrl+C 停止
```

## ✨ 优势

1. ✅ **无需第三方工具** - 只用官方 SDK
2. ✅ **配置简单** - 直接运行 node 命令
3. ✅ **自动启动** - AI 客户端启动时自动运行
4. ✅ **稳定可靠** - 官方支持，无中间层

---

**快速开始：**
```bash
# 1. 构建
cd backend && npm run build

# 2. 配置（已完成）
# 3. 重启 Claude Desktop（Cmd+Q）
# 4. 测试："显示所有已部署的应用"
```

🎉 就这么简单！

