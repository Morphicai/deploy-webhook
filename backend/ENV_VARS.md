# 环境变量文档

所有环境变量统一在 `src/env.ts` 中管理。

## 使用方式

```typescript
// ❌ 不推荐：直接使用 process.env
const port = process.env.PORT || 9000;

// ✅ 推荐：使用 env.ts
import * as env from './env';
const port = env.PORT;
```

## 环境变量列表

### 基础配置

| 变量名 | 说明 | 默认值 | 类型 |
|--------|------|--------|------|
| `NODE_ENV` | 当前运行环境 | `development` | string |
| `PORT` | 服务器端口 | `9000` | number |

### 认证相关

| 变量名 | 说明 | 默认值 | 类型 |
|--------|------|--------|------|
| `ADMIN_TOKEN` | 管理员 Token | - | string |
| `JWT_SECRET` | JWT 密钥 | `dev-secret` | string |
| `WEBHOOK_SECRET` | Webhook 密钥 | - | string |

### Docker 相关

| 变量名 | 说明 | 默认值 | 类型 |
|--------|------|--------|------|
| `DOCKER_SOCK_PATH` | Docker Socket 路径 | `/var/run/docker.sock` | string |
| `DOCKER_HOST` | Docker Host（远程） | - | string |
| `DOCKER_TLS_VERIFY` | Docker TLS 验证 | `false` | boolean |
| `DOCKER_CERT_PATH` | Docker 证书路径 | - | string |
| `DOCKER_USERNAME` | Docker Hub 用户名 | - | string |
| `DOCKER_PASSWORD` | Docker Hub 密码 | - | string |
| `DOCKER_RUN_OPTS` | Docker 运行额外选项 | - | string |
| `PRUNE_IMAGES` | 是否自动清理镜像 | `false` | boolean |
| `PRUNE_STRATEGY` | 镜像清理策略 | `dangling` | string |

### 镜像相关

| 变量名 | 说明 | 默认值 | 类型 |
|--------|------|--------|------|
| `IMAGE_NAME` | 默认镜像名称 | `focusbe/morphicai-app-shell` | string |
| `IMAGE_NAME_WHITELIST` | 镜像白名单（逗号分隔） | - | array |
| `IMAGE_WHITELIST` | 镜像白名单（向后兼容） | - | array |
| `REGISTRY_HOST` | 镜像仓库地址 | `registry.cn-hangzhou.aliyuncs.com` | string |

### 端口配置

| 变量名 | 说明 | 默认值 | 类型 |
|--------|------|--------|------|
| `HOST_PORT` | 主机端口 | `8806` | string |
| `CONTAINER_PORT` | 容器内部端口 | `3000` | string |

### 回调配置

| 变量名 | 说明 | 默认值 | 类型 |
|--------|------|--------|------|
| `CALLBACK_URL` | 部署成功回调 URL | - | string |
| `CALLBACK_HEADERS` | 回调请求头（JSON） | - | string |
| `CALLBACK_SECRET` | 回调密钥 | - | string |

### 数据库

| 变量名 | 说明 | 默认值 | 类型 |
|--------|------|--------|------|
| `DB_PATH` | 数据库路径 | `./data` | string |

### Caddy 配置

| 变量名 | 说明 | 默认值 | 类型 |
|--------|------|--------|------|
| `CADDY_CONFIG_PATH` | Caddy 配置文件路径 | `/etc/caddy/Caddyfile` | string |
| `CADDY_ADMIN_DOMAIN` | 管理后台域名 | `deploy.example.com` | string |
| `CADDY_API_DOMAIN` | API 域名 | `api.deploy.example.com` | string |
| `CADDY_APPS_DOMAIN` | 应用域名 | `apps.example.com` | string |
| `CADDY_EMAIL` | HTTPS 证书邮箱 | `admin@example.com` | string |
| `CADDY_HTTP3` | 是否启用 HTTP/3 | `false` | boolean |

### Infisical 配置

| 变量名 | 说明 | 默认值 | 类型 |
|--------|------|--------|------|
| `INFISICAL_WEBHOOK_SECRET` | Infisical Webhook 密钥 | - | string |
| `INFISICAL_AUTO_REDEPLOY` | 自动重新部署 | `false` | boolean |

### MCP (Model Context Protocol)

| 变量名 | 说明 | 默认值 | 类型 |
|--------|------|--------|------|
| `MCP_ALLOW_ANY_ORIGIN` | 是否允许任何来源 | `false` | boolean |
| `MCP_ALLOWED_ORIGINS` | 允许的来源（逗号分隔） | - | array |

### 其他

| 变量名 | 说明 | 默认值 | 类型 |
|--------|------|--------|------|
| `UPDATE_SCRIPT_PATH` | 部署脚本路径 | `./scripts/deploy.sh` | string |

## 开发指南

### 添加新的环境变量

1. 在 `src/env.ts` 中添加环境变量定义：

```typescript
/** 新功能的配置 */
export const NEW_FEATURE_ENABLED = getEnvBool('NEW_FEATURE_ENABLED', false);
```

2. 在 `ENV_VARS` 中添加导出：

```typescript
export const ENV_VARS = {
  // ... 其他变量
  NEW_FEATURE_ENABLED,
} as const;
```

3. 在 `ENV_METADATA` 中添加元数据：

```typescript
NEW_FEATURE_ENABLED: { 
  description: '是否启用新功能', 
  default: 'false', 
  type: 'boolean' 
},
```

4. 在本文档中更新环境变量列表

### 迁移现有代码

将代码中的 `process.env.XXX` 替换为 `env.XXX`：

```typescript
// 迁移前
import { config } from 'dotenv';
config();
const port = parseInt(process.env.PORT || '9000', 10);

// 迁移后
import * as env from './env';
const port = env.PORT;
```

## 优势

1. **集中管理** - 所有环境变量在一个文件中
2. **类型安全** - 自动类型转换（string/number/boolean/array）
3. **默认值** - 统一的默认值管理
4. **文档化** - 清晰的变量说明和元数据
5. **易于查找** - 快速知道有哪些环境变量可用
6. **易于维护** - 修改环境变量逻辑只需要改一个地方

## 测试环境

测试环境使用 `.env.test` 文件，会自动覆盖默认值：

```bash
# .env.test 示例
NODE_ENV=test
PORT=9001
DB_PATH=./data/test
```

所有环境变量的读取逻辑保持不变，只需要在测试前设置对应的环境变量即可。

