# MCP 调试指南

## 📋 调试日志说明

我已经在 MCP 相关的代码中添加了详细的调试信息，帮助你排查 SSE 连接和工具列表获取的问题。

### 日志标签说明

所有调试日志都带有标签前缀，方便识别：

- `[MCP]` - MCP 服务器初始化
- `[MCP Server]` - MCP 服务器核心逻辑
- `[MCP SSE]` - SSE 连接请求
- `[MCP Message]` - 消息处理
- `[SSE Transport]` - SSE 传输层
- `[SSE Handlers]` - SSE 处理器

### 完整的日志流程

当一个客户端连接并请求工具列表时，你应该看到以下日志序列：

```
服务器启动时：
[MCP] Initializing MCP server and SSE transport...
[MCP Server] Initializing Deploy Webhook MCP Server...
[MCP Server] Server instance created
[MCP Server] Registering tools...
[MCP] Registered 19 tools
[MCP Server] Setting up handlers...
[MCP Server] ✅ Request handlers registered
[MCP Server] ✅ Initialization complete
[MCP] MCP server created successfully
[MCP] SSE transport created successfully
[SSE Handlers] Creating SSE handlers...
[MCP] SSE handlers created successfully
[MCP] ✅ MCP server connected to SSE transport successfully

SSE 连接建立：
[MCP SSE] 🔌 New SSE connection request from ::ffff:127.0.0.1
[MCP SSE] User-Agent: Mozilla/5.0 (...)
[MCP SSE] Auth type: apikey
[SSE Handlers] handleSSE called
[SSE Transport] 🔌 New connection from ::ffff:127.0.0.1
[SSE Transport] ✅ SSE headers set
[SSE Transport] ✅ Initial connection message sent

请求工具列表：
[MCP Message] 📨 Received message from ::ffff:127.0.0.1
[MCP Message] Method: tools/list, ID: 1
[MCP Message] Full body: { ... }
[SSE Handlers] handleMessage called
[SSE Handlers] Parsing message...
[SSE Transport] 📥 Received message: { method: 'tools/list', id: 1 }
[SSE Transport] Full message: { ... }
[SSE Transport] 🔄 Dispatching message to onmessage handler...
[MCP Server] 📋 ListTools request received
[MCP Server] Available tools count: 19
[MCP Server] Tool names: deploy_application, get_applications, ...
[MCP Server] ✅ Returning tools list
[SSE Transport] ✅ Message dispatched successfully
[SSE Handlers] ✅ Message handled successfully
[SSE Transport] 📤 Sending message: { id: 1, hasResult: true }
[SSE Transport] Message content: { ... }
[SSE Transport] ✅ Message sent successfully
```

---

## 🔍 排查步骤

### 第 1 步：检查服务器启动

启动后端服务：

```bash
cd backend
npm run dev
```

**预期输出（关键日志）：**
```
[MCP] Initializing MCP server and SSE transport...
[MCP Server] ✅ Initialization complete
[MCP] ✅ MCP server connected to SSE transport successfully
```

**❌ 如果没有看到这些日志：**
- 检查 `backend/src/routes/mcp.ts` 是否正确导入
- 检查 `backend/src/index.ts` 中是否注册了 MCP 路由

### 第 2 步：测试 MCP Info 端点

```bash
curl http://localhost:3000/api/mcp/info | jq
```

**预期输出：**
```json
{
  "name": "deploy-webhook-mcp",
  "version": "1.0.0",
  "protocol": "mcp",
  "transport": ["sse"],
  "capabilities": {
    "tools": true
  }
}
```

**✅ 如果成功：** MCP 路由已正确注册

### 第 3 步：创建 API Key

```bash
# 访问管理后台
open http://localhost:3000

# 或使用 curl（需要 admin token）
export ADMIN_TOKEN=your-admin-token

curl -X POST http://localhost:3000/api/api-keys \
  -H "X-Admin-Token: $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MCP Debug",
    "permission": "full"
  }'
```

保存返回的 `plainKey`。

### 第 4 步：测试 SSE 连接

在一个终端窗口中：

```bash
export API_KEY=your-api-key-here

curl -N -H "X-API-Key: $API_KEY" \
  http://localhost:3000/api/mcp/sse
```

**预期输出：**
```
: connected
```

**预期日志（后端）：**
```
[MCP SSE] 🔌 New SSE connection request from ::1
[MCP SSE] User-Agent: curl/...
[MCP SSE] Auth type: apikey
[SSE Handlers] handleSSE called
[SSE Transport] 🔌 New connection from ::1
[SSE Transport] ✅ SSE headers set
[SSE Transport] ✅ Initial connection message sent
```

**❌ 如果出错：**
- 检查 API Key 是否正确
- 检查 API Key 是否启用
- 检查 API Key 权限是否为 `full` 或 `deploy`

### 第 5 步：请求工具列表

在另一个终端窗口中（保持 SSE 连接打开）：

```bash
export API_KEY=your-api-key-here

curl -X POST http://localhost:3000/api/mcp/message \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

**预期输出：**
```json
{
  "success": true
}
```

**预期日志（后端）：**
```
[MCP Message] 📨 Received message from ::1
[MCP Message] Method: tools/list, ID: 1
[SSE Transport] 📥 Received message: { method: 'tools/list', id: 1 }
[MCP Server] 📋 ListTools request received
[MCP Server] Available tools count: 19
[MCP Server] Tool names: deploy_application, get_applications, ...
[MCP Server] ✅ Returning tools list
[SSE Transport] 📤 Sending message
[SSE Transport] ✅ Message sent successfully
```

**SSE 连接窗口应该收到：**
```
data: {"jsonrpc":"2.0","id":1,"result":{"tools":[...]}}
```

---

## 🐛 常见问题和解决方案

### 问题 1: "No onmessage handler registered!"

**日志：**
```
[SSE Transport] ⚠️  No onmessage handler registered!
```

**原因：** MCP Server 没有正确连接到 SSE Transport

**解决方案：**
1. 检查日志中是否有：
   ```
   [MCP] ✅ MCP server connected to SSE transport successfully
   ```
2. 如果没有，检查是否有连接错误：
   ```
   [MCP] ❌ Failed to connect MCP server to SSE transport
   ```
3. 重启服务

### 问题 2: "SSE connection not established"

**日志：**
```
[SSE Transport] ❌ SSE connection not established
```

**原因：** 在建立 SSE 连接前就发送了消息

**解决方案：**
1. 先建立 SSE 连接（`GET /api/mcp/sse`）
2. 等待看到 `: connected`
3. 再发送消息（`POST /api/mcp/message`）

### 问题 3: "401 Unauthorized"

**可能原因：**
- API Key 无效
- API Key 已禁用
- API Key 权限不足
- API Key 已过期

**解决方案：**
1. 在管理后台检查 API Key 状态
2. 确认 Key 的权限为 `full` 或 `deploy`
3. 如需要，创建新的 API Key

### 问题 4: 工具列表为空

**日志中应该显示：**
```
[MCP] Registered 19 tools
```

**如果看到 `Registered 0 tools`：**
1. 检查 `backend/src/mcp/tools/` 目录下的文件
2. 确认所有工具文件都正确导出
3. 重新编译：`npm run build`
4. 重启服务

### 问题 5: Claude Desktop 连接失败

**检查清单：**

1. **配置文件格式正确？**
   ```bash
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | jq
   ```
   如果 `jq` 报错，说明 JSON 格式有问题

2. **服务器 URL 正确？**
   ```json
   {
     "mcpServers": {
       "deploy-webhook": {
         "url": "http://localhost:3000/api/mcp/sse",
         "headers": {
           "X-API-Key": "dw_..."
         }
       }
     }
   }
   ```

3. **已完全重启 Claude Desktop？**
   - 使用 `Cmd+Q` 完全退出（不是关闭窗口）
   - 重新打开

4. **查看 Claude 日志：**
   ```bash
   tail -f ~/Library/Logs/Claude/mcp*.log
   ```

---

## 📊 完整测试脚本

我为你准备了一个完整的测试脚本：

```bash
#!/bin/bash

echo "=== MCP SSE 调试测试 ==="
echo ""

# 1. 测试 MCP Info
echo "1️⃣  测试 MCP Info 端点..."
curl -s http://localhost:3000/api/mcp/info | jq .name
echo ""

# 2. 检查 API Key（需要设置）
if [ -z "$API_KEY" ]; then
  echo "❌ 请设置 API_KEY 环境变量"
  echo "   export API_KEY=your-api-key"
  exit 1
fi

echo "2️⃣  API Key: ${API_KEY:0:10}..."
echo ""

# 3. 测试认证
echo "3️⃣  测试 API Key 认证..."
response=$(curl -s -w "\n%{http_code}" \
  -H "X-API-Key: $API_KEY" \
  http://localhost:3000/api/mcp/info)
status=$(echo "$response" | tail -n1)

if [ "$status" -eq 200 ]; then
  echo "✅ 认证成功"
else
  echo "❌ 认证失败 (HTTP $status)"
  exit 1
fi
echo ""

# 4. 建立 SSE 连接（后台）
echo "4️⃣  建立 SSE 连接..."
curl -N -H "X-API-Key: $API_KEY" \
  http://localhost:3000/api/mcp/sse > /tmp/mcp_sse.log 2>&1 &
SSE_PID=$!
sleep 2

if ps -p $SSE_PID > /dev/null; then
  echo "✅ SSE 连接已建立 (PID: $SSE_PID)"
else
  echo "❌ SSE 连接失败"
  exit 1
fi
echo ""

# 5. 请求工具列表
echo "5️⃣  请求工具列表..."
response=$(curl -s -X POST http://localhost:3000/api/mcp/message \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }')

success=$(echo "$response" | jq -r .success)
if [ "$success" = "true" ]; then
  echo "✅ 工具列表请求成功"
else
  echo "❌ 工具列表请求失败"
  echo "$response" | jq
fi
echo ""

# 6. 检查 SSE 响应
echo "6️⃣  检查 SSE 响应..."
sleep 1
if grep -q "tools" /tmp/mcp_sse.log; then
  echo "✅ SSE 收到工具列表"
  echo "   工具数量: $(grep -o '"name":' /tmp/mcp_sse.log | wc -l)"
else
  echo "❌ SSE 未收到工具列表"
  echo "   日志内容:"
  cat /tmp/mcp_sse.log
fi
echo ""

# 清理
kill $SSE_PID 2>/dev/null
rm /tmp/mcp_sse.log

echo "=== 测试完成 ==="
```

保存为 `test-mcp-sse.sh`，然后运行：

```bash
chmod +x test-mcp-sse.sh
export API_KEY=your-api-key
./test-mcp-sse.sh
```

---

## 📝 后端日志查看

### 查看实时日志

```bash
cd backend
npm run dev

# 日志会实时输出到终端
```

### 过滤特定日志

```bash
# 只看 MCP 相关日志
npm run dev 2>&1 | grep '\[MCP'

# 只看 SSE 相关日志
npm run dev 2>&1 | grep '\[SSE'

# 只看工具调用日志
npm run dev 2>&1 | grep 'Tool'
```

### 保存日志到文件

```bash
npm run dev 2>&1 | tee mcp-debug.log
```

---

## 🎯 下一步

如果所有测试都通过，但 Claude Desktop 仍然无法连接：

1. **检查网络问题**
   - 确认 `localhost:3000` 可访问
   - 尝试使用实际 IP 地址而不是 localhost

2. **检查 Claude 配置**
   - 确认配置文件路径正确
   - 确认 JSON 格式无误
   - 尝试使用绝对路径

3. **查看详细日志**
   - 后端日志：`npm run dev`
   - Claude 日志：`~/Library/Logs/Claude/`
   - 网络日志：浏览器开发者工具

---

**如果问题仍然存在，请提供：**
1. 完整的后端日志（包括启动日志）
2. SSE 连接测试的结果
3. 工具列表请求的结果
4. Claude Desktop 的配置文件内容
5. Claude Desktop 的日志（如果有）

这将帮助我更好地定位问题！🔍

