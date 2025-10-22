# 使用 MCP Inspector 调试 SSE MCP 服务器

## 🎯 问题

MCP Inspector 原生只支持 **stdio** 传输方式，不直接支持 **SSE (Server-Sent Events)** 方式。

## 💡 解决方案

我创建了一个 **SSE to stdio Bridge**（桥接工具），让你可以使用官方的 MCP Inspector 来调试 SSE MCP 服务器！

## 🚀 快速开始

### 第 1 步：确保服务器正在运行

```bash
# 终端 1：启动后端服务
cd /Users/pengzai/www/morphicai/deploy-webhook/backend
npm run dev
```

### 第 2 步：安装 MCP Inspector（如果还没安装）

```bash
npm install -g @modelcontextprotocol/inspector
```

### 第 3 步：使用桥接工具启动 Inspector

```bash
# 终端 2：使用桥接工具
cd /Users/pengzai/www/morphicai/deploy-webhook/backend

# 设置 API Key（已在脚本中）
export API_KEY=dw_1LVVF414WZBXA4hjKwM3KdOoSst9uRFP

# 启动 Inspector + 桥接
npx @modelcontextprotocol/inspector node scripts/sse-inspector-bridge.js
```

### 第 4 步：在浏览器中调试

浏览器会自动打开 **http://localhost:5173**

你会看到：
- ✅ 所有 19 个工具
- ✅ 每个工具的描述和参数
- ✅ 可以点击测试每个工具
- ✅ 实时查看请求和响应

## 📊 工作原理

```
┌─────────────┐      stdio       ┌──────────┐      HTTP/SSE      ┌────────────┐
│             │ ←────────────────→│          │ ←─────────────────→│            │
│  Inspector  │   JSON-RPC        │  Bridge  │   JSON-RPC         │ SSE Server │
│  (Browser)  │   Messages        │  (Node)  │   + SSE Stream     │ (Backend)  │
│             │                   │          │                    │            │
└─────────────┘                   └──────────┘                    └────────────┘
    localhost:5173                  stdio I/O                 localhost:3000
```

**桥接工具做了什么：**
1. 📥 从 Inspector (stdin) 接收 JSON-RPC 消息
2. 📤 通过 HTTP POST 发送到 SSE 服务器
3. 📡 维持 SSE 连接接收响应
4. 📤 将响应发送回 Inspector (stdout)

## 🎨 Inspector 界面使用

### 查看工具列表

打开 Inspector 后，左侧会显示所有工具：

```
Tools:
├─ 📦 Deploy
│  └─ deploy_application
├─ 🔧 Applications
│  ├─ get_applications
│  ├─ get_application
│  ├─ create_application
│  ├─ update_application
│  ├─ delete_application
│  ├─ start_application
│  ├─ stop_application
│  ├─ restart_application
│  └─ redeploy_application
├─ 🌐 Domains
│  ├─ get_domains
│  ├─ get_domain
│  ├─ create_domain
│  ├─ update_domain
│  └─ delete_domain
└─ ⚙️  Caddy
   ├─ get_caddy_config
   ├─ reload_caddy
   └─ get_application_urls
```

### 测试工具

1. **点击任何工具**（例如 `get_applications`）

2. **查看参数 Schema**
   ```json
   {
     "type": "object",
     "properties": {},
     "description": "Get a list of all deployed applications"
   }
   ```

3. **点击 "Execute"**

4. **查看结果**
   ```json
   {
     "success": true,
     "count": 3,
     "applications": [...]
   }
   ```

### 测试带参数的工具

例如 `deploy_application`：

1. **点击工具**

2. **填写参数**
   ```json
   {
     "image": "nginx",
     "version": "alpine",
     "port": 8080,
     "containerPort": 80,
     "name": "test-nginx"
   }
   ```

3. **点击 "Execute"**

4. **查看部署结果**

## 🔍 调试日志

桥接工具会在终端显示详细的调试日志：

```bash
[Bridge] ╔════════════════════════════════════════╗
[Bridge] ║   SSE to stdio Bridge for Inspector   ║
[Bridge] ╚════════════════════════════════════════╝

[Config] Server: http://localhost:3000
[Config] API Key: dw_1LVVF41...
[Bridge] Server connection test: OK
[Bridge] Connecting to SSE server...
[Bridge] SSE connection established
[Bridge] Bridge ready! Waiting for messages...

[stdio→HTTP] {"jsonrpc":"2.0","method":"tools/list","id":1}
[SSE→stdio] {"jsonrpc":"2.0","id":1,"result":{"tools":[...]}}

[stdio→HTTP] {"jsonrpc":"2.0","method":"tools/call","params":{...},"id":2}
[SSE→stdio] {"jsonrpc":"2.0","id":2,"result":{...}}
```

**日志说明：**
- 🔵 `[stdio→HTTP]` - Inspector 发送的消息
- 🟣 `[SSE→stdio]` - SSE 服务器的响应
- 🟢 `[Bridge]` - 桥接工具状态
- 🟢 `[Config]` - 配置信息

## 🛠️ 高级配置

### 自定义服务器 URL

```bash
export SERVER_URL=https://your-domain.com
export API_KEY=your-api-key
npx @modelcontextprotocol/inspector node scripts/sse-inspector-bridge.js
```

**注意：** 桥接工具现在使用 URL 参数传递 API Key（`?apiKey=xxx`），这提供了最大的兼容性！

### 只启动桥接（不用 Inspector）

如果你想单独测试桥接：

```bash
node scripts/sse-inspector-bridge.js

# 然后在另一个终端手动发送消息
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node scripts/sse-inspector-bridge.js
```

## 📊 对比：不同的调试方法

| 方法 | 图形界面 | SSE 支持 | 实时监控 | 自动化 | 推荐度 |
|-----|---------|---------|---------|--------|-------|
| **Inspector + Bridge** | ✅ | ✅ | ✅ | ❌ | ⭐⭐⭐⭐⭐ |
| **test-sse.sh** | ❌ | ✅ | ❌ | ✅ | ⭐⭐⭐⭐ |
| **monitor-sse.sh** | ❌ | ✅ | ✅ | ❌ | ⭐⭐⭐ |
| **curl 手动测试** | ❌ | ✅ | ❌ | ❌ | ⭐⭐ |

**推荐组合：**
1. 🏆 **Inspector + Bridge** - 日常开发和调试
2. 🧪 **test-sse.sh** - 自动化测试和 CI/CD
3. 📡 **monitor-sse.sh** - 实时监控和问题排查

## 🐛 故障排查

### 问题 1: "Server connection test: FAILED"

**原因：** 后端服务未运行

**解决：**
```bash
cd backend
npm run dev
```

### 问题 2: "SSE connection failed: 401"

**原因：** API Key 无效或未设置

**解决：**
```bash
export API_KEY=your-valid-api-key
```

或在管理后台创建新的 API Key：
```bash
open http://localhost:3000/api-keys
```

### 问题 3: Inspector 打开但看不到工具

**检查步骤：**

1. **查看桥接日志**
   - 是否显示 "SSE connection established"？
   - 是否有错误消息？

2. **查看后端日志**
   ```bash
   # 在后端终端查看
   [MCP SSE] 🔌 New SSE connection request
   [SSE Transport] ✅ Initial connection message sent
   ```

3. **手动测试 SSE**
   ```bash
   export API_KEY=dw_1LVVF414WZBXA4hjKwM3KdOoSst9uRFP
   ./scripts/test-sse.sh
   ```

### 问题 4: Inspector 卡住不响应

**解决：**
1. 关闭 Inspector (Ctrl+C)
2. 确保后端服务正常
3. 重新启动桥接

## 💡 使用技巧

### 技巧 1: 同时查看三个终端

```
┌─────────────────┬─────────────────┬─────────────────┐
│   Terminal 1    │   Terminal 2    │   Terminal 3    │
│   Backend Dev   │   Inspector     │   Monitor       │
├─────────────────┼─────────────────┼─────────────────┤
│ npm run dev     │ npx inspector   │ monitor-sse.sh  │
│                 │ + bridge        │                 │
│ 后端日志         │ 桥接日志         │ SSE 实时消息     │
└─────────────────┴─────────────────┴─────────────────┘
```

**优势：**
- 👀 全方位监控
- 🐛 快速定位问题
- 📊 完整的数据流可视化

### 技巧 2: 保存测试场景

在 Inspector 中测试成功的工具调用，可以复制参数：

```json
{
  "image": "nginx",
  "version": "alpine",
  "port": 8080,
  "containerPort": 80
}
```

保存到文件 `test-scenarios.json`，用于后续测试。

### 技巧 3: 快速切换环境

```bash
# 本地环境
export SERVER_URL=http://localhost:3000
export API_KEY=dw_local_key

# 测试环境
export SERVER_URL=https://test.example.com
export API_KEY=dw_test_key

# 生产环境
export SERVER_URL=https://api.example.com
export API_KEY=dw_prod_key
```

## 🎉 总结

现在你可以：

✅ 使用官方 **MCP Inspector** 图形界面  
✅ 调试 **SSE** 方式的 MCP 服务器  
✅ 交互式测试所有 **19 个工具**  
✅ 实时查看 **请求和响应**  
✅ 快速排查 **问题**  

---

## 🚀 快速命令

```bash
# 一键启动（确保后端已运行）
cd /Users/pengzai/www/morphicai/deploy-webhook/backend
export API_KEY=dw_1LVVF414WZBXA4hjKwM3KdOoSst9uRFP
npx @modelcontextprotocol/inspector node scripts/sse-inspector-bridge.js
```

**浏览器会自动打开，开始调试吧！** 🎨

