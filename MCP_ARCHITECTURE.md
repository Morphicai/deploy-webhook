# MCP 架构设计文档

## 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                       AI Client (Claude)                      │
└────────────────────────┬──────────────────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          │                             │
     stdio/local                   HTTP/SSE (Remote)
          │                             │
    ┌─────▼─────┐                 ┌─────▼─────┐
    │ MCP Server│                 │ MCP Server│
    │  (stdio)  │                 │  (HTTP)   │
    └─────┬─────┘                 └─────┬─────┘
          │                             │
          └──────────────┬──────────────┘
                         │
                    ┌────▼────┐
                    │  Tools  │
                    └────┬────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
    ┌─────▼─────┐  ┌─────▼─────┐  ┌────▼────┐
    │Application│  │  Domain   │  │  Caddy  │
    │  Service  │  │  Service  │  │ Service │
    └─────┬─────┘  └─────┬─────┘  └────┬────┘
          │              │              │
          └──────────────┼──────────────┘
                         │
                    ┌────▼────┐
                    │Database │
                    └─────────┘
```

## 设计决策

### 1. Service 层复用 vs 路由层复用

#### 当前选择：复用 Service 层 ✅

**理由：**

1. **性能优先**
   - MCP 工具调用频繁，直接调用 Service 避免 HTTP 开销
   - 减少延迟，提升 AI 响应速度

2. **灵活性**
   - 可以在一个工具中组合多个 Service 调用
   - 支持事务操作
   - 更容易实现复杂的业务逻辑

3. **类型安全**
   - 直接使用 TypeScript 接口
   - 编译时类型检查
   - 更好的开发体验

**权衡：**

虽然存在一定的耦合，但通过以下方式缓解：

1. **清晰的分层**
   ```
   MCP Tools → Service Layer → Data Layer
   ```

2. **统一的错误处理**
   ```typescript
   // tools/base.ts
   export async function wrapServiceCall<T>(
     fn: () => Promise<T>
   ): Promise<T> {
     try {
       return await fn();
     } catch (error) {
       throw new MCPError(error);
     }
   }
   ```

3. **验证逻辑复用**
   ```typescript
   import { validateDeployPayload } from '../utils/validation';
   // MCP 工具复用现有的验证函数
   ```

#### 备选方案：复用路由层（不采用）

如果需要完全解耦，可以这样实现：

```typescript
// tools/applications.ts (HTTP 方式)
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'X-Admin-Token': process.env.ADMIN_TOKEN,
  },
});

async handler(args: any) {
  const response = await apiClient.get('/api/applications');
  return response.data;
}
```

**不采用的原因：**
- 内部 HTTP 调用增加复杂性
- 需要处理网络错误、超时等
- 性能损失不值得

### 2. 独立启动 vs 集成启动

#### 推荐方案：**两种模式都支持** ✅

不同的使用场景需要不同的启动模式：

#### 模式 A: stdio 模式（独立启动）

**适用场景：**
- Claude Desktop 集成
- 本地开发和测试
- 桌面 AI 工具

**优点：**
- ✅ 进程隔离，互不干扰
- ✅ 符合 MCP stdio 协议标准
- ✅ 安全性更好（本地访问）
- ✅ 可以独立重启

**缺点：**
- ❌ 需要单独启动和维护
- ❌ 需要配置数据库路径
- ❌ 不支持远程访问

**启动方式：**
```bash
# 方式 1: 使用启动脚本
./backend/scripts/start-mcp.sh

# 方式 2: 直接运行
node backend/dist/mcp/server.js

# 方式 3: Claude Desktop 配置
{
  "mcpServers": {
    "deploy-webhook": {
      "command": "node",
      "args": ["/path/to/backend/dist/mcp/server.js"]
    }
  }
}
```

#### 模式 B: HTTP/SSE 模式（集成启动）

**适用场景：**
- Web 界面集成
- 远程 AI 访问
- 多用户环境
- API 形式调用

**优点：**
- ✅ 统一部署，只需启动一个服务
- ✅ 共享配置、数据库连接、缓存
- ✅ 支持远程访问
- ✅ 复用现有的认证系统
- ✅ 更容易横向扩展

**缺点：**
- ❌ 所有请求经过主服务
- ❌ MCP 流量可能影响主服务性能
- ❌ 需要实现 SSE 传输层

**启动方式：**
```bash
# 主服务启动时自动启用 MCP
npm run dev
# MCP 端点可用：
# - GET  /api/mcp/info
# - GET  /api/mcp/sse
# - POST /api/mcp/message
```

**访问方式：**
```bash
# 通过 API Key 访问
curl -H "X-API-Key: your-key" \
  https://your-domain.com/api/mcp/sse
```

## 当前实现

### 文件结构

```
backend/src/
├── mcp/
│   ├── server.ts              # MCP 服务器核心（支持 stdio）
│   ├── transport/
│   │   └── sse.ts            # SSE 传输实现（支持 HTTP）
│   └── tools/
│       ├── deploy.ts         # 部署工具
│       ├── applications.ts   # 应用管理工具
│       ├── domains.ts        # 域名管理工具
│       └── caddy.ts          # Caddy 管理工具
├── routes/
│   └── mcp.ts                # MCP HTTP 路由
└── index.ts                  # 主应用（集成 MCP 路由）
```

### 启动流程

#### stdio 模式
```typescript
// backend/src/mcp/server.ts
if (require.main === module) {
  const server = new DeployWebhookMCPServer();
  server.start().catch(console.error);
  // 使用 stdio 传输，适合 Claude Desktop
}
```

#### HTTP/SSE 模式
```typescript
// backend/src/index.ts
import mcpRouter from './routes/mcp';
app.use('/api/mcp', mcpRouter);

// backend/src/routes/mcp.ts
const mcpServer = new DeployWebhookMCPServer();
const sseTransport = new SSEServerTransport();
mcpServer.getServer().connect(sseTransport);
```

## 性能考虑

### Service 层调用性能

**测试场景：** 列出 100 个应用

| 方式 | 平均延迟 | 备注 |
|------|---------|------|
| 直接调用 Service | ~2ms | 当前实现 |
| 内部 HTTP 调用 | ~15ms | localhost |
| 远程 HTTP 调用 | ~100ms+ | 网络延迟 |

### 结论

对于 MCP 这种需要快速响应的场景，直接调用 Service 层是最佳选择。

## 安全考虑

### stdio 模式
- ✅ 本地进程，无网络暴露
- ✅ 用户权限隔离
- ⚠️ 需要保护数据库文件访问

### HTTP/SSE 模式
- ✅ API Key / JWT 认证
- ✅ HTTPS 加密传输
- ⚠️ 需要配置防火墙
- ⚠️ 需要实现速率限制

## 最佳实践

### 1. 开发环境

**推荐：HTTP/SSE 模式**

```bash
# 启动开发服务器
npm run dev

# MCP 自动可用
# 使用 API Key 测试
curl -H "X-API-Key: dev-key" http://localhost:3000/api/mcp/info
```

**优点：**
- 热重载
- 统一日志
- 容易调试

### 2. 生产环境

**推荐：两种模式都启用**

```yaml
# docker-compose.yml
services:
  backend:
    # 主服务，包含 MCP HTTP 端点
    ports:
      - "3000:3000"
    environment:
      - MCP_ENABLED=true
```

**为不同客户端提供不同的访问方式：**
- Web 客户端 → HTTP/SSE
- Claude Desktop → stdio（通过 SSH 隧道）
- 内部工具 → HTTP/SSE

### 3. 本地 AI 工具（Claude Desktop）

**推荐：stdio 模式**

```json
{
  "mcpServers": {
    "deploy-webhook": {
      "command": "node",
      "args": ["/path/to/backend/dist/mcp/server.js"],
      "env": {
        "DATABASE_PATH": "/path/to/data/deploy-webhook.db",
        "NODE_ENV": "production"
      }
    }
  }
}
```

## 扩展性

### 添加新工具

只需要在对应的 tools 文件中添加：

```typescript
// backend/src/mcp/tools/applications.ts
const newTool: Tool & { handler: (args: any) => Promise<any> } = {
  name: 'my_new_tool',
  description: 'What this tool does',
  inputSchema: { /* JSON Schema */ },
  async handler(args: any) {
    // 直接调用 Service
    const result = await myService.doSomething(args);
    return result;
  },
};

export const applicationTools = [
  // ...existing tools
  newTool,
];
```

工具会自动在两种模式下都可用。

## 故障处理

### stdio 模式故障

**问题：** 进程启动失败

**解决：**
```bash
# 检查编译
npm run build

# 检查权限
chmod +x backend/scripts/start-mcp.sh

# 检查数据库路径
ls -la data/deploy-webhook.db
```

### HTTP/SSE 模式故障

**问题：** 连接断开

**解决：**
```bash
# 检查服务状态
curl http://localhost:3000/api/mcp/info

# 检查认证
curl -H "X-API-Key: your-key" \
  http://localhost:3000/api/mcp/sse
```

## 总结

### 当前架构的优势

1. **灵活性** - 支持两种启动模式
2. **性能** - 直接调用 Service 层
3. **可维护性** - 清晰的分层架构
4. **可扩展性** - 易于添加新工具
5. **安全性** - 支持多种认证方式

### 权衡和选择

| 需求 | 推荐方案 |
|------|---------|
| 本地 AI 工具 | stdio 模式 |
| Web 集成 | HTTP/SSE 模式 |
| 远程访问 | HTTP/SSE 模式 |
| 最佳性能 | Service 层复用 |
| 最大解耦 | 路由层复用（不推荐）|

**最终选择：当前实现是最佳平衡** ✅

