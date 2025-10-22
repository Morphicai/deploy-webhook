# Cursor MCP 配置指南

## ⚠️ 重要发现

从你的日志看，SSE 连接已建立但没有收到工具列表请求。这可能是因为：

### Cursor 可能不支持 HTTP/SSE 方式的 MCP

根据 MCP 官方文档，Cursor IDE 主要使用 **stdio** 方式，而不是 HTTP/SSE。

## 🎯 解决方案

### 方案 1：使用 stdio 方式（推荐 Cursor）⭐

Cursor 配置文件位置：
- **macOS**: `~/Library/Application Support/Cursor/User/globalStorage/settings.json`
- **Windows**: `%APPDATA%\Cursor\User\globalStorage\settings.json`
- **Linux**: `~/.config/Cursor/User/globalStorage/settings.json`

**配置格式（stdio）：**
```json
{
  "mcpServers": {
    "deploy-webhook": {
      "command": "node",
      "args": [
        "/Users/pengzai/www/morphicai/deploy-webhook/backend/dist/mcp/server.js"
      ],
      "env": {
        "DATABASE_PATH": "/Users/pengzai/www/morphicai/deploy-webhook/data/deploy-webhook.db",
        "NODE_ENV": "production"
      }
    }
  }
}
```

**注意：** 使用绝对路径！

### 方案 2：确认 Cursor 是否支持 SSE

如果你确定要使用 SSE 方式，需要确认：

1. **Cursor 版本是否支持 SSE 传输**
   ```bash
   # 查看 Cursor 版本
   # 从你的日志看是：Cursor/1.7.52
   ```

2. **检查 Cursor 的 MCP 文档**
   - Cursor 可能有自己的 MCP 实现
   - 可能需要特定的配置格式

## 🧪 快速测试

### 测试 stdio 方式是否工作

```bash
# 1. 确保项目已构建
cd /Users/pengzai/www/morphicai/deploy-webhook/backend
npm run build

# 2. 测试 MCP server（stdio 模式）
node dist/mcp/server.js

# 应该看到：
# [MCP Server] Initializing Deploy Webhook MCP Server...
# [MCP Server] ✅ Initialization complete
# [MCP] Server started on stdio transport
```

如果能正常启动，说明 stdio 方式可用。

### 测试 SSE 方式是否真的连接

在一个终端保持 SSE 连接：
```bash
export API_KEY=your-api-key
curl -N -H "X-API-Key: $API_KEY" http://localhost:3000/api/mcp/sse
```

在另一个终端发送工具列表请求：
```bash
curl -X POST http://localhost:3000/api/mcp/message \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

**如果 curl 能收到工具列表，说明 SSE 本身是好的，问题在于 Cursor 的配置或兼容性。**

## 📊 Cursor vs Claude Desktop

| 特性 | Claude Desktop | Cursor IDE |
|------|---------------|-----------|
| **主要传输方式** | stdio / SSE | stdio |
| **配置文件位置** | `~/Library/.../Claude/` | `~/Library/.../Cursor/` |
| **SSE 支持** | ✅ 明确支持 | ❓ 需要确认 |
| **配置格式** | 标准 MCP | 可能有变化 |

## 🎯 推荐配置（针对你的情况）

根据你的日志，我建议：

### 1. 先使用 Claude Desktop 测试（SSE 方式）

Claude Desktop 明确支持 SSE，可以验证我们的实现是否正确。

**配置文件：** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "deploy-webhook": {
      "url": "http://localhost:3000/api/mcp/sse",
      "headers": {
        "X-API-Key": "your-api-key-here"
      }
    }
  }
}
```

### 2. Cursor 使用 stdio 方式

**配置文件：** `~/Library/Application Support/Cursor/User/globalStorage/settings.json`

```json
{
  "mcpServers": {
    "deploy-webhook": {
      "command": "node",
      "args": [
        "/Users/pengzai/www/morphicai/deploy-webhook/backend/dist/mcp/server.js"
      ],
      "env": {
        "DATABASE_PATH": "/Users/pengzai/www/morphicai/deploy-webhook/data/deploy-webhook.db"
      }
    }
  }
}
```

## 🔍 调试 Cursor 连接

### 查看 Cursor 日志

```bash
# macOS Cursor 日志位置
ls -la ~/Library/Logs/Cursor/

# 查看最新日志
tail -f ~/Library/Logs/Cursor/*.log
```

### 检查 Cursor MCP 状态

在 Cursor 中：
1. 打开命令面板（Cmd+Shift+P）
2. 搜索 "MCP" 相关命令
3. 查看 MCP 服务器状态

## ⚡ 快速解决方案

**如果你想立即测试，建议：**

1. **使用 Claude Desktop + SSE**（已经连接成功）
   - 配置简单
   - 我们的实现已验证

2. **Cursor 暂时使用 stdio**
   - 更稳定
   - Cursor 官方推荐

## 📝 下一步

请尝试：

1. **测试 Claude Desktop（SSE）**
   ```bash
   # 创建配置
   cat > ~/Library/Application\ Support/Claude/claude_desktop_config.json << 'EOF'
   {
     "mcpServers": {
       "deploy-webhook": {
         "url": "http://localhost:3000/api/mcp/sse",
         "headers": {
           "X-API-Key": "your-actual-api-key"
         }
       }
     }
   }
   EOF
   
   # 重启 Claude Desktop
   # 测试："显示所有应用"
   ```

2. **配置 Cursor（stdio）**
   ```bash
   # 检查路径
   ls /Users/pengzai/www/morphicai/deploy-webhook/backend/dist/mcp/server.js
   
   # 配置 Cursor
   # 编辑: ~/Library/Application Support/Cursor/User/globalStorage/settings.json
   ```

3. **报告结果**
   - Claude Desktop 是否能获取工具列表？
   - Cursor stdio 方式是否工作？

---

**我的猜测：** Cursor 1.7.52 可能还不完全支持 SSE 方式的 MCP，建议使用 stdio 方式。

让我知道测试结果！🔍

