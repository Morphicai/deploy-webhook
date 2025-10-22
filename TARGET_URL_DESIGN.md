# Target URL 统一设计

## 🎯 设计理念

**核心思想**：所有域名配置统一使用 `targetUrl` 字段，简化配置，提高一致性。

## ✅ 设计优势

| 优势 | 说明 |
|------|------|
| **统一性** | 一个字段适用于所有场景（应用和自定义URL） |
| **灵活性** | URL 本身包含完整信息（协议、主机、端口、路径） |
| **简洁性** | 不需要单独的 `targetPort` 字段 |
| **可扩展性** | 支持未来更多场景（如 HTTPS upstream、路径前缀等） |

## 📊 数据库结构

```sql
CREATE TABLE domains (
  id INTEGER PRIMARY KEY,
  domain_name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,              -- 'application' 或 'custom'
  application_id INTEGER,           -- 关联应用ID（仅 type='application' 时）
  target_url TEXT NOT NULL,        -- 统一的目标URL
  caddy_config TEXT DEFAULT '{}',
  enabled INTEGER DEFAULT 1,
  description TEXT,
  created_at TEXT,
  updated_at TEXT
);
```

**关键变化**：
- ❌ 删除：`target_port` 字段
- ✅ 保留：`target_url` 统一字段
- ✅ 必填：`target_url` 不再可选

## 💡 使用示例

### 场景 1：指向应用（手动指定 targetUrl）

```bash
curl -X POST http://localhost:9000/api/domains \
  -H "x-admin-token: YOUR_TOKEN" \
  -d '{
    "domainName": "api.example.com",
    "type": "application",
    "applicationId": 1,
    "targetUrl": "http://localhost:8001"
  }'
```

### 场景 2：指向应用（使用辅助函数）

**后端 API 层**：
```typescript
import { generateTargetUrl } from './services/domainStore';

// 自动生成 targetUrl（使用第一个端口）
const targetUrl = generateTargetUrl(applicationId);
// 结果：http://localhost:8001

// 指定特定端口
const targetUrl = generateTargetUrl(applicationId, 8002);
// 结果：http://localhost:8002
```

### 场景 3：指向外部服务

```bash
curl -X POST http://localhost:9000/api/domains \
  -H "x-admin-token: YOUR_TOKEN" \
  -d '{
    "domainName": "external.example.com",
    "type": "custom",
    "targetUrl": "http://external-service:3000"
  }'
```

### 场景 4：指向 HTTPS upstream

```bash
curl -X POST http://localhost:9000/api/domains \
  -H "x-admin-token: YOUR_TOKEN" \
  -d '{
    "domainName": "secure.example.com",
    "type": "custom",
    "targetUrl": "https://secure-backend:443"
  }'
```

### 场景 5：指向带路径的服务

```bash
curl -X POST http://localhost:9000/api/domains \
  -H "x-admin-token: YOUR_TOKEN" \
  -d '{
    "domainName": "api.example.com",
    "type": "custom",
    "targetUrl": "http://backend-service:8080/api/v1"
  }'
```

## 🔧 辅助函数

### generateTargetUrl

帮助开发者从应用配置生成 targetUrl：

```typescript
/**
 * 从应用生成 targetUrl
 * @param applicationId 应用ID
 * @param portNumber 可选，指定端口号。如果不指定，使用第一个端口
 * @returns targetUrl 格式如 http://localhost:8001
 */
export function generateTargetUrl(
  applicationId: number, 
  portNumber?: number
): string
```

**使用示例**：

```typescript
// 示例 1：使用默认端口（第一个）
const url1 = generateTargetUrl(1);
// => "http://localhost:8001"

// 示例 2：指定端口号
const url2 = generateTargetUrl(1, 8002);
// => "http://localhost:8002"

// 示例 3：创建域名
import { createDomain, generateTargetUrl } from './services/domainStore';

const domain = createDomain({
  domainName: 'api.example.com',
  type: 'application',
  applicationId: 1,
  targetUrl: generateTargetUrl(1, 8001),
});
```

## 🔄 Caddy 配置生成

简化后的逻辑：

```typescript
// 旧逻辑（复杂）
if (domain.type === 'application') {
  // 查找应用
  // 检查端口
  // 选择端口
  targetPort = ...;
} else if (domain.type === 'custom') {
  // 解析 URL
  // 处理端口
}

// 新逻辑（简单）
const url = new URL(domain.targetUrl);
const targetHost = url.hostname;
const targetPort = url.port || (url.protocol === 'https:' ? 443 : 80);
```

**生成的 Caddyfile**：

```caddyfile
# api.example.com -> Application: my-app (http://localhost:8001)
api.example.com {
    reverse_proxy localhost:8001
}

# external.example.com -> http://external-service:3000
external.example.com {
    reverse_proxy external-service:3000
}
```

## 📝 API 接口

### 创建域名

**请求**：
```json
POST /api/domains
{
  "domainName": "api.example.com",
  "type": "application",
  "applicationId": 1,
  "targetUrl": "http://localhost:8001"
}
```

**响应**：
```json
{
  "id": 1,
  "domainName": "api.example.com",
  "type": "application",
  "applicationId": 1,
  "targetUrl": "http://localhost:8001",
  "enabled": true,
  "createdAt": "2025-01-01T00:00:00Z"
}
```

### 更新域名

**请求**：
```json
PUT /api/domains/1
{
  "targetUrl": "http://localhost:8002"
}
```

**系统行为**：
1. 验证 targetUrl 格式
2. 更新数据库
3. 重新生成 Caddyfile
4. 重载 Caddy（零停机）

## ⚙️ URL 格式验证

系统会自动验证 `targetUrl` 的格式：

```typescript
try {
  new URL(targetUrl);  // 验证格式
} catch (error) {
  throw new Error(`Invalid targetUrl format: ${targetUrl}`);
}
```

**有效格式**：
- ✅ `http://localhost:8001`
- ✅ `http://127.0.0.1:8001`
- ✅ `http://backend-service:3000`
- ✅ `https://secure-backend:443`
- ✅ `http://api-server:8080/v1`

**无效格式**：
- ❌ `localhost:8001` （缺少协议）
- ❌ `8001` （只有端口号）
- ❌ `http://` （不完整）

## 🆚 新旧设计对比

### 旧设计

```typescript
interface DomainRecord {
  targetUrl?: string;      // custom 类型使用
  targetPort?: number;     // application 类型使用
  applicationHostPort?: number;  // 冗余字段
}
```

**问题**：
- 字段职责不清
- application 和 custom 使用不同字段
- 端口信息分散

### 新设计

```typescript
interface DomainRecord {
  targetUrl: string;  // 统一字段，必填
}
```

**优势**：
- 单一职责
- 所有类型统一
- 完整的连接信息

## 🎓 最佳实践

### 1. 使用辅助函数生成 URL

```typescript
// ✅ 推荐：使用辅助函数
const targetUrl = generateTargetUrl(applicationId, 8001);

// ❌ 不推荐：硬编码
const targetUrl = "http://localhost:8001";
```

### 2. 明确指定端口

```typescript
// ✅ 推荐：明确端口
generateTargetUrl(1, 8001)  // "http://localhost:8001"

// ⚠️ 可以但不明确：使用默认
generateTargetUrl(1)  // 使用第一个端口，可能不清楚是哪个
```

### 3. 文档记录映射关系

```bash
# 在域名描述中记录
curl -X POST /api/domains -d '{
  "domainName": "api.example.com",
  "targetUrl": "http://localhost:8001",
  "description": "API Server - Port 8001 maps to container port 3000"
}'
```

## 🔍 调试和验证

### 查看域名配置

```bash
curl http://localhost:9000/api/domains/1 \
  -H "x-admin-token: YOUR_TOKEN"
```

**响应**：
```json
{
  "id": 1,
  "domainName": "api.example.com",
  "targetUrl": "http://localhost:8001",
  "type": "application",
  "applicationId": 1
}
```

### 测试目标 URL

```bash
# 直接测试 targetUrl 是否可达
curl http://localhost:8001
```

### 查看生成的 Caddyfile

```bash
curl http://localhost:9000/api/caddy/config \
  -H "x-admin-token: YOUR_TOKEN"
```

## 🚀 迁移指南

如果你有旧的配置使用了 `targetPort` 或 `applicationHostPort`：

### 步骤 1：重建数据库

```bash
# 备份现有数据（如需要）
sqlite3 data/deploy-webhook.db ".backup backup.db"

# 删除 domains 表
sqlite3 data/deploy-webhook.db "DROP TABLE IF EXISTS domains;"

# 重启后端服务，系统会自动创建新表结构
```

### 步骤 2：使用新 API 创建域名

```bash
# 旧方式（不再支持）
{
  "applicationId": 1,
  "targetPort": 8001
}

# 新方式
{
  "applicationId": 1,
  "targetUrl": "http://localhost:8001"
}
```

### 步骤 3：在代码中使用 generateTargetUrl

```typescript
// 旧代码
const domain = await createDomain({
  domainName: 'api.example.com',
  applicationId: 1,
  targetPort: 8001,  // ❌ 已移除
});

// 新代码
import { createDomain, generateTargetUrl } from './services/domainStore';

const domain = await createDomain({
  domainName: 'api.example.com',
  applicationId: 1,
  targetUrl: generateTargetUrl(1, 8001),  // ✅ 使用新方法
});
```

## 📚 相关文档

- [域名管理完全指南](./DOMAIN_MANAGEMENT.md)
- [Caddy 部署指南](./CADDY_DEPLOYMENT.md)
- [API 文档](http://localhost:9000/api-docs)

---

**现在所有域名配置都统一使用 targetUrl！** 🎉

