# MCP 本地测试指南

## 📋 测试前准备

### 1. 编译项目

```bash
cd /Users/pengzai/www/morphicai/deploy-webhook/backend
npm run build
```

### 2. 确保数据库存在

```bash
# 检查数据库文件
ls -la ../data/deploy-webhook.db

# 如果不存在，启动一次主服务会自动创建
npm run dev
# Ctrl+C 停止
```

## 🎯 测试方法

### 方法 1: 使用 Claude Desktop（推荐）⭐

这是最真实的使用场景测试。

#### 步骤 1: 配置 Claude Desktop

**macOS:**
```bash
# 编辑配置文件
open ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**添加配置：**
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
        "NODE_ENV": "development"
      }
    }
  }
}
```

#### 步骤 2: 重启 Claude Desktop

完全退出并重新打开 Claude Desktop。

#### 步骤 3: 测试对话

在 Claude Desktop 中输入：

```
你好！请帮我列出所有已部署的应用。
```

Claude 会自动调用 `get_applications` 工具。

**更多测试示例：**

```
1. "帮我部署 nginx:latest 到 8080 端口"
   → 调用 deploy_application

2. "显示所有配置的域名"
   → 调用 get_domains

3. "重启 ID 为 1 的应用"
   → 调用 restart_application

4. "查看当前的 Caddy 配置"
   → 调用 get_caddy_config
```

### 方法 2: 使用 HTTP/SSE 端点

这种方法不需要 Claude Desktop，适合快速测试。

#### 步骤 1: 启动主服务

```bash
cd /Users/pengzai/www/morphicai/deploy-webhook/backend
npm run dev
```

#### 步骤 2: 测试 MCP Info

```bash
# 获取 MCP 服务器信息（无需认证）
curl http://localhost:3000/api/mcp/info | jq
```

**预期输出：**
```json
{
  "name": "deploy-webhook-mcp",
  "version": "1.0.0",
  "protocol": "mcp",
  "transport": ["sse"],
  "description": "Model Context Protocol server for Deploy Webhook system",
  "capabilities": {
    "tools": true,
    "resources": false,
    "prompts": false
  },
  "endpoints": {
    "sse": "/api/mcp/sse",
    "message": "/api/mcp/message"
  }
}
```

#### 步骤 3: 创建测试 API Key

```bash
# 登录管理后台
# http://localhost:3000

# 或使用 curl 创建（需要 admin token）
curl -X POST http://localhost:3000/api/api-keys \
  -H "X-Admin-Token: your-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MCP Test Key",
    "permission": "full"
  }'
```

保存返回的 `plainKey`。

#### 步骤 4: 测试 SSE 连接

```bash
# 建立 SSE 连接（保持连接打开）
curl -N -H "X-API-Key: your-api-key" \
  http://localhost:3000/api/mcp/sse
```

你应该看到：
```
: connected
```

#### 步骤 5: 发送测试消息

在另一个终端窗口：

```bash
# 列出所有工具
curl -X POST http://localhost:3000/api/mcp/message \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

### 方法 3: 使用 MCP Inspector（推荐用于调试）

MCP Inspector 是官方调试工具。

#### 安装 MCP Inspector

```bash
npm install -g @modelcontextprotocol/inspector
```

#### 启动 Inspector

```bash
# 在项目根目录
cd /Users/pengzai/www/morphicai/deploy-webhook

# 启动 Inspector
mcp-inspector node backend/dist/mcp/server.js
```

这会打开一个 Web 界面（通常是 http://localhost:5173），你可以：
- 查看所有可用工具
- 测试每个工具的调用
- 查看工具的输入/输出
- 调试错误

### 方法 4: 编写测试脚本

创建一个简单的测试脚本。

#### 创建测试文件

```bash
# 创建测试目录
mkdir -p backend/test/mcp
```

#### JavaScript 测试脚本（推荐）

我已经为你创建了完整的测试脚本！

```bash
# 1. 启动主服务
cd backend
npm run dev

# 2. 在另一个终端，设置 API Key（从管理后台创建）
export API_KEY=your-actual-api-key

# 3. 运行测试
node test/mcp-test.js
```

**测试输出示例：**
```
╔════════════════════════════════════════════════╗
║        MCP Local Testing Suite                ║
╚════════════════════════════════════════════════╝

🔌 Connecting to: http://localhost:3000
🔑 Using API Key: dw_aBcDeFg...
✅ Connected to: deploy-webhook-mcp v1.0.0

📋 Test 1: List all available tools
──────────────────────────────────────────────────
✅ Found 19 tools:
   1. deploy_application - Deploy a Docker application
   2. get_applications - Get a list of all deployed applications
   3. get_application - Get detailed information about a specific application
   ... (16 more tools)

📦 Test 2: Get applications
──────────────────────────────────────────────────
✅ Found 3 applications:
   - nginx (nginx:latest)
   - backend-api (node:18)
   - redis (redis:7)

🌐 Test 3: Get domains
──────────────────────────────────────────────────
✅ Found 2 domains:
   ✓ api.example.com → http://localhost:8000
   ✓ www.example.com → http://localhost:3000

╔════════════════════════════════════════════════╗
║                Test Summary                    ║
╚════════════════════════════════════════════════╝

  ✅ Test 1: testListTools
  ✅ Test 2: testGetApplications
  ✅ Test 3: testGetDomains
  ✅ Test 4: testGetCaddyConfig
  ✅ Test 5: testDeploy

  Total: 5 tests
  Passed: 5
  Failed: 0

🎉 All tests passed!
```

#### Bash 快速测试脚本

如果你喜欢使用 bash：

```bash
# 运行快速测试
./backend/test/mcp-test.sh
```

**或者手动测试：**

```bash
# 设置环境变量
export API_KEY=your-actual-api-key

# 测试 1: 服务器信息（无需认证）
curl http://localhost:3000/api/mcp/info | jq

# 测试 2: 列出所有工具
curl -X POST http://localhost:3000/api/mcp/message \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }' | jq

# 测试 3: 调用工具 - 获取应用列表
curl -X POST http://localhost:3000/api/mcp/message \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "get_applications",
      "arguments": {}
    }
  }' | jq

# 测试 4: 部署应用（真实部署！）
curl -X POST http://localhost:3000/api/mcp/message \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "deploy_application",
      "arguments": {
        "image": "nginx",
        "version": "alpine",
        "port": 18080,
        "containerPort": 80,
        "name": "test-nginx"
      }
    }
  }' | jq
```

### 方法 5: 使用 Postman / Insomnia

#### 导入 MCP 测试集合

创建一个 Postman Collection：

**1. MCP Info（GET）**
```
GET http://localhost:3000/api/mcp/info
```

**2. List Tools（POST）**
```
POST http://localhost:3000/api/mcp/message
Headers:
  X-API-Key: your-api-key
  Content-Type: application/json

Body:
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

**3. Call Tool - Get Applications（POST）**
```
POST http://localhost:3000/api/mcp/message
Headers:
  X-API-Key: your-api-key
  Content-Type: application/json

Body:
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "get_applications",
    "arguments": {}
  }
}
```

## 🐛 常见问题

### 问题 1: "Cannot connect to MCP server"

**解决方案：**
```bash
# 检查主服务是否运行
curl http://localhost:3000/health

# 如果没有运行，启动它
cd backend
npm run dev
```

### 问题 2: "401 Unauthorized"

**解决方案：**
```bash
# 1. 登录管理后台创建 API Key
open http://localhost:3000

# 2. 或使用 admin token
export ADMIN_TOKEN=your-admin-token

curl -X POST http://localhost:3000/api/api-keys \
  -H "X-Admin-Token: $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Key",
    "permission": "full"
  }'
```

### 问题 3: Claude Desktop 连接失败

**检查清单：**

1. **配置文件路径正确？**
   ```bash
   # macOS
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

2. **项目已编译？**
   ```bash
   cd backend
   npm run build
   ls dist/mcp/server.js  # 应该存在
   ```

3. **数据库路径正确？**
   ```bash
   ls ../data/deploy-webhook.db  # 应该存在
   ```

4. **重启 Claude Desktop**
   - 完全退出（Cmd+Q）
   - 重新打开

5. **查看 Claude Desktop 日志**
   ```bash
   # macOS
   tail -f ~/Library/Logs/Claude/mcp*.log
   ```

### 问题 4: "Tool execution failed"

**调试步骤：**

1. **查看后端日志**
   ```bash
   # 主服务日志
   npm run dev
   # 观察输出
   ```

2. **测试工具参数**
   ```bash
   # 确保参数格式正确
   node test/mcp-test.js
   ```

3. **检查数据库**
   ```bash
   sqlite3 ../data/deploy-webhook.db
   sqlite> .tables
   sqlite> SELECT * FROM applications;
   sqlite> .quit
   ```

## 📊 测试检查清单

在提交 PR 或部署前，运行这个检查清单：

- [ ] ✅ MCP Info 端点可访问
- [ ] ✅ 可以列出所有 19 个工具
- [ ] ✅ 可以获取应用列表
- [ ] ✅ 可以获取域名列表
- [ ] ✅ 可以获取 Caddy 配置
- [ ] ✅ Claude Desktop 可以连接（如果使用）
- [ ] ✅ 测试部署一个简单应用（nginx）
- [ ] ✅ 测试应用生命周期（start/stop/restart）
- [ ] ✅ 测试域名配置
- [ ] ✅ 所有测试脚本通过

## 🎯 下一步

测试通过后，你可以：

1. **集成到 CI/CD**
   ```yaml
   # .github/workflows/test.yml
   - name: Test MCP
     run: |
       npm run dev &
       sleep 5
       node test/mcp-test.js
   ```

2. **配置 Claude Desktop**
   - 参考 [MCP_GUIDE.md](./MCP_GUIDE.md)

3. **编写自定义工具**
   - 参考 [MCP_ARCHITECTURE.md](./MCP_ARCHITECTURE.md)

4. **生产部署**
   - 配置 HTTPS
   - 设置 API Key 轮换
   - 启用速率限制

## 📚 相关文档

- [MCP_GUIDE.md](./MCP_GUIDE.md) - 完整使用指南
- [MCP_ARCHITECTURE.md](./MCP_ARCHITECTURE.md) - 架构设计文档
- [API_KEY_GUIDE.md](./API_KEY_GUIDE.md) - API Key 管理

---

**快速开始测试：**

```bash
# 1. 启动服务
npm run dev

# 2. 运行测试（在另一个终端）
export API_KEY=your-key
node test/mcp-test.js
```

🎉 开始测试吧！

