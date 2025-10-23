# 数据模型 V2 设计方案

> **设计目标**：
> 1. 支持秘钥本地存储和外部同步
> 2. 支持秘钥分组管理
> 3. 环境变量支持引用秘钥
> 4. Webhook 部署采用应用预注册模式

---

## 📊 核心数据表设计

### 1. secret_groups（秘钥分组表）🆕

**用途**：将秘钥组织成逻辑分组，便于批量管理和应用

```sql
CREATE TABLE secret_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  provider_id INTEGER,                    -- 关联的提供者ID（可选，NULL表示手动创建）
  auto_sync INTEGER NOT NULL DEFAULT 0,   -- 是否自动同步（仅当 provider_id 不为空时有效）
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (provider_id) REFERENCES secret_providers(id) ON DELETE SET NULL
);

CREATE INDEX idx_secret_groups_provider_id ON secret_groups(provider_id);
```

**TypeScript 接口**：
```typescript
interface SecretGroup {
  id: number;
  name: string;                    // 如：production-db, staging-api, common
  description: string | null;
  providerId: number | null;       // 关联的提供者（如 Infisical）
  autoSync: boolean;               // 是否自动同步
  createdAt: string;
  updatedAt: string;
}
```

**示例数据**：
```typescript
// 示例1：手动管理的分组
{
  id: 1,
  name: "production-db",
  description: "生产环境数据库配置",
  providerId: null,
  autoSync: false
}

// 示例2：从 Infisical 同步的分组
{
  id: 2,
  name: "infisical-production",
  description: "从 Infisical 同步的生产环境配置",
  providerId: 1,  // 关联到 secret_providers 表
  autoSync: true
}
```

---

### 2. secrets（秘钥表）- 重新设计 ⚡

**用途**：存储秘钥的实际值，支持手动添加和自动同步

```sql
CREATE TABLE secrets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                     -- 秘钥名称（在分组内唯一）
  group_id INTEGER NOT NULL,              -- 所属分组ID
  value TEXT NOT NULL,                    -- 秘钥值（加密存储）
  description TEXT,                       -- 秘钥描述
  source TEXT NOT NULL DEFAULT 'manual',  -- 来源：manual/synced
  provider_id INTEGER,                    -- 同步来源的提供者ID（仅当 source='synced' 时有值）
  provider_reference TEXT,                -- 提供者中的引用路径
  last_synced_at TEXT,                    -- 最后同步时间
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(group_id, name),                 -- 分组内名称唯一
  FOREIGN KEY (group_id) REFERENCES secret_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (provider_id) REFERENCES secret_providers(id) ON DELETE SET NULL
);

CREATE INDEX idx_secrets_group_id ON secrets(group_id);
CREATE INDEX idx_secrets_provider_id ON secrets(provider_id);
CREATE INDEX idx_secrets_source ON secrets(source);
```

**TypeScript 接口**：
```typescript
interface Secret {
  id: number;
  name: string;                      // 如：DATABASE_URL, API_KEY
  groupId: number;
  value: string;                     // 加密存储的值
  description: string | null;
  source: 'manual' | 'synced';       // 手动添加 or 自动同步
  providerId: number | null;
  providerReference: string | null;  // 如：/production/database/url
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// 客户端返回时的安全版本（隐藏值）
interface SecretSummary {
  id: number;
  name: string;
  groupId: number;
  groupName: string;
  hasValue: boolean;
  valuePreview: string;              // 如：postgres://****@****
  description: string | null;
  source: 'manual' | 'synced';
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

**加密存储方案**：
```typescript
import crypto from 'crypto';

// 加密秘钥（从环境变量读取，启动时生成）
const ENCRYPTION_KEY = process.env.SECRET_ENCRYPTION_KEY || 
  crypto.randomBytes(32).toString('hex');

const ALGORITHM = 'aes-256-gcm';

function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // 格式：iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decryptSecret(ciphertext: string): string {
  const [ivHex, authTagHex, encrypted] = ciphertext.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

**示例数据**：
```typescript
// 手动添加的秘钥
{
  id: 1,
  name: "DATABASE_URL",
  groupId: 1,
  value: "iv:tag:encrypted_postgres_url",
  description: "生产数据库连接字符串",
  source: "manual",
  providerId: null,
  providerReference: null,
  lastSyncedAt: null
}

// 从 Infisical 同步的秘钥
{
  id: 2,
  name: "STRIPE_API_KEY",
  groupId: 2,
  value: "iv:tag:encrypted_stripe_key",
  description: "Stripe 支付密钥",
  source: "synced",
  providerId: 1,
  providerReference: "/production/payment/stripe_key",
  lastSyncedAt: "2025-10-23T10:30:00Z"
}
```

---

### 3. environment_variables（环境变量表）- 增强 ⚡

**用途**：支持直接值和秘钥引用

```sql
CREATE TABLE environment_variables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope TEXT NOT NULL CHECK(scope IN ('global', 'project')),
  project_id INTEGER,
  key TEXT NOT NULL,
  value TEXT NOT NULL,                    -- 可以是直接值或秘钥引用
  value_type TEXT NOT NULL DEFAULT 'plain',  -- plain | secret_ref | group_ref
  secret_id INTEGER,                      -- 引用的秘钥ID（可选）
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(scope, project_id, key),
  FOREIGN KEY (project_id) REFERENCES applications(id) ON DELETE CASCADE,
  FOREIGN KEY (secret_id) REFERENCES secrets(id) ON DELETE SET NULL
);

CREATE INDEX idx_environment_variables_project_id ON environment_variables(project_id);
CREATE INDEX idx_environment_variables_scope ON environment_variables(scope);
CREATE INDEX idx_environment_variables_secret_id ON environment_variables(secret_id);
CREATE INDEX idx_environment_variables_value_type ON environment_variables(value_type);
```

**TypeScript 接口**：
```typescript
type EnvValueType = 'plain' | 'secret_ref' | 'group_ref';

interface EnvironmentVariable {
  id: number;
  scope: 'global' | 'project';
  projectId: number | null;
  key: string;
  value: string;                    // 实际值或引用
  valueType: EnvValueType;
  secretId: number | null;          // 如果是 secret_ref，存储秘钥ID
  description: string | null;
  createdAt: string;
  updatedAt: string;
}
```

**值类型说明**：

1. **plain（纯文本）**：
```typescript
{
  key: "NODE_ENV",
  value: "production",
  valueType: "plain",
  secretId: null
}
```

2. **secret_ref（秘钥引用）**：
```typescript
{
  key: "DATABASE_URL",
  value: "@secret:1",           // 引用 secrets 表中 id=1 的秘钥
  valueType: "secret_ref",
  secretId: 1
}
```

3. **group_ref（分组引用）**：
```typescript
{
  key: "ALL_SECRETS",
  value: "@group:production-db",  // 引用整个分组
  valueType: "group_ref",
  secretId: null
}
```

**解析逻辑**：
```typescript
async function resolveEnvironmentVariable(envVar: EnvironmentVariable): Promise<string> {
  switch (envVar.valueType) {
    case 'plain':
      return envVar.value;
      
    case 'secret_ref':
      if (!envVar.secretId) {
        throw new Error(`Secret reference missing for ${envVar.key}`);
      }
      const secret = await getSecretById(envVar.secretId);
      if (!secret) {
        throw new Error(`Secret ${envVar.secretId} not found for ${envVar.key}`);
      }
      return decryptSecret(secret.value);
      
    case 'group_ref':
      // 暂不支持，或者返回 JSON 格式的所有秘钥
      throw new Error('Group reference not supported in environment variables');
      
    default:
      return envVar.value;
  }
}

// 构建应用的环境变量
async function buildEnvironmentForProject(projectId: number): Promise<Record<string, string>> {
  const envVars = listEnvEntries('project', projectId);
  const globalVars = listEnvEntries('global');
  
  const result: Record<string, string> = {};
  
  // 先处理全局变量
  for (const envVar of globalVars) {
    const resolvedValue = await resolveEnvironmentVariable(envVar);
    result[envVar.key] = resolvedValue;
  }
  
  // 项目变量覆盖全局变量
  for (const envVar of envVars) {
    const resolvedValue = await resolveEnvironmentVariable(envVar);
    result[envVar.key] = resolvedValue;
  }
  
  return result;
}
```

---

### 4. applications（应用表）- 增强 ⚡

**用途**：应用预注册，生成 webhook token

```sql
CREATE TABLE applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  image TEXT NOT NULL,
  version TEXT,
  repository_id INTEGER,
  ports TEXT NOT NULL DEFAULT '[]',
  env_vars TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'stopped',
  webhook_enabled INTEGER NOT NULL DEFAULT 1,    -- 是否启用 webhook 部署
  webhook_token TEXT UNIQUE,                     -- Webhook 专用 token
  auto_deploy INTEGER NOT NULL DEFAULT 0,        -- 是否自动部署最新版本
  last_deployed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE SET NULL
);

CREATE INDEX idx_applications_webhook_token ON applications(webhook_token);
CREATE INDEX idx_applications_webhook_enabled ON applications(webhook_enabled);
```

**TypeScript 接口**：
```typescript
interface Application {
  id: number;
  name: string;
  image: string;
  version: string | null;
  repositoryId: number | null;
  ports: PortMapping[];
  envVars: Record<string, string>;
  status: 'running' | 'stopped' | 'error' | 'deploying';
  webhookEnabled: boolean;          // 🆕
  webhookToken: string | null;      // 🆕 格式：whk_[32位随机字符]
  autoDeploy: boolean;              // 🆕
  lastDeployedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

**Webhook Token 生成**：
```typescript
function generateWebhookToken(): string {
  const randomBytes = crypto.randomBytes(24);
  return `whk_${randomBytes.toString('base64url')}`;
}

// 创建应用时自动生成
export function createApplication(input: ApplicationInput): Application {
  const webhookToken = generateWebhookToken();
  // ... 保存到数据库
}
```

---

### 5. secret_providers（秘钥提供者表）- 保持不变 ✅

**用途**：配置外部秘钥管理服务

```sql
CREATE TABLE secret_providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK(type IN ('infisical', 'aws-secrets-manager', 'hashicorp-vault', 'azure-keyvault', 'gcp-secret-manager')),
  config TEXT NOT NULL DEFAULT '{}',
  enabled INTEGER NOT NULL DEFAULT 1,
  auto_sync INTEGER NOT NULL DEFAULT 0,
  last_sync_at TEXT,
  last_sync_status TEXT,
  last_sync_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

### 6. deployment_logs（部署日志表）🆕

**用途**：记录所有部署操作，包括 webhook 触发的部署

```sql
CREATE TABLE deployment_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL,
  version TEXT NOT NULL,
  deployment_id TEXT NOT NULL,              -- UUID
  trigger_type TEXT NOT NULL,               -- manual | webhook | api | scheduled
  trigger_source TEXT,                      -- 触发来源（IP、用户ID等）
  status TEXT NOT NULL,                     -- pending | success | failed
  error_message TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  duration_ms INTEGER,                      -- 部署耗时（毫秒）
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

CREATE INDEX idx_deployment_logs_application_id ON deployment_logs(application_id);
CREATE INDEX idx_deployment_logs_status ON deployment_logs(status);
CREATE INDEX idx_deployment_logs_trigger_type ON deployment_logs(trigger_type);
CREATE INDEX idx_deployment_logs_started_at ON deployment_logs(started_at);
```

---

## 🔄 数据关系图（ER Diagram）

```
┌─────────────────────┐
│  secret_providers   │ 1
│  (秘钥提供者)        │─────┐
└─────────────────────┘     │
                            │ N
                            ↓
                    ┌──────────────────┐      1       ┌──────────────┐
                    │  secret_groups   │──────────────→│   secrets    │
                    │  (秘钥分组)       │              N│   (秘钥)      │
                    └──────────────────┘               └──────────────┘
                                                              │ 1
                                                              │
                                                              │ N (可选引用)
                                                              ↓
┌─────────────────┐      1       ┌──────────────────────────────────┐
│  repositories   │──────────────→│        applications              │
│  (镜像仓库)      │              N│        (应用)                    │
└─────────────────┘               │  + webhookToken                  │
                                  │  + webhookEnabled                │
                                  │  + autoDeploy                    │
                                  └──────────────────────────────────┘
                                        │ 1                    │ 1
                                        │                      │
                          ┌─────────────┴──────┐               │ N
                          │ N                 N│               ↓
                          ↓                    ↓        ┌──────────────────┐
              ┌──────────────────────┐  ┌─────────┐    │ deployment_logs  │
              │ environment_variables│  │ domains │    │  (部署日志)       │
              │  (环境变量)           │  │ (域名)   │    └──────────────────┘
              │  + valueType         │  └─────────┘
              │  + secretId          │
              └──────────────────────┘

独立表：
┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   users     │  │  api_keys   │  │ system_settings  │  │    webhooks      │
└─────────────┘  └─────────────┘  └──────────────────┘  └──────────────────┘
│ image_whitelists │  │ secret_syncs │
└──────────────────┘  └──────────────┘
```

---

## 🚀 新的 Webhook 部署流程

### Webhook 端点设计

**旧版本（不安全）**：
```bash
POST /deploy
{
  "name": "myapp",           # 可任意指定
  "image": "nginx",
  "version": "latest",
  "port": 8080,
  "containerPort": 80,
  "secret": "webhook-secret"
}
```

**新版本（安全）**：
```bash
POST /webhook/deploy
{
  "applicationId": 123,          # 必须是已注册的应用ID
  "version": "v1.2.3",           # 只需要提供版本号
  "token": "whk_xxxxx"           # 应用专用的 webhook token
}

# 或者使用应用名称
POST /webhook/deploy
{
  "applicationName": "myapp",    # 已注册的应用名称
  "version": "v1.2.3",
  "token": "whk_xxxxx"
}
```

### 部署逻辑

```typescript
// routes/webhookDeploy.ts
router.post('/webhook/deploy', async (req, res) => {
  const { applicationId, applicationName, version, token } = req.body;
  
  // 1. 验证必填参数
  if ((!applicationId && !applicationName) || !version || !token) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: (applicationId or applicationName), version, token'
    });
  }
  
  // 2. 获取应用
  const app = applicationId 
    ? getApplicationById(applicationId)
    : getApplicationByName(applicationName);
    
  if (!app) {
    return res.status(404).json({
      success: false,
      error: 'Application not found. Please register the application first.'
    });
  }
  
  // 3. 验证 webhook 是否启用
  if (!app.webhookEnabled) {
    return res.status(403).json({
      success: false,
      error: `Webhook deployment is disabled for application "${app.name}"`
    });
  }
  
  // 4. 验证 webhook token
  if (!app.webhookToken || app.webhookToken !== token) {
    console.error('[Webhook Deploy] Invalid token', {
      applicationId: app.id,
      applicationName: app.name,
      providedToken: token.substring(0, 10) + '...',
      clientIp: req.ip
    });
    
    return res.status(401).json({
      success: false,
      error: 'Invalid webhook token'
    });
  }
  
  // 5. 创建部署日志
  const deploymentId = crypto.randomUUID();
  const logId = createDeploymentLog({
    applicationId: app.id,
    version,
    deploymentId,
    triggerType: 'webhook',
    triggerSource: req.ip || 'unknown',
    status: 'pending'
  });
  
  // 6. 执行部署
  try {
    const deployService = new DeployService();
    const result = await deployService.deploy({
      name: app.name,
      image: app.image,
      version,
      port: app.ports[0].host,
      containerPort: app.ports[0].container,
      repositoryId: app.repositoryId || undefined,
      env: {} // 从环境变量表读取
    });
    
    // 7. 更新部署日志
    updateDeploymentLog(logId, {
      status: result.success ? 'success' : 'failed',
      errorMessage: result.error || null,
      completedAt: new Date().toISOString()
    });
    
    // 8. 更新应用版本
    if (result.success) {
      updateApplication(app.id, { version });
    }
    
    return res.json({
      success: result.success,
      deploymentId,
      application: {
        id: app.id,
        name: app.name,
        version
      },
      message: result.success 
        ? 'Deployment completed successfully'
        : 'Deployment failed'
    });
    
  } catch (error) {
    updateDeploymentLog(logId, {
      status: 'failed',
      errorMessage: error.message,
      completedAt: new Date().toISOString()
    });
    
    throw error;
  }
});
```

---

## 🎯 使用场景示例

### 场景1：手动管理秘钥

```typescript
// 1. 创建秘钥分组
const group = createSecretGroup({
  name: "production-db",
  description: "生产数据库配置"
});

// 2. 添加秘钥到分组
const secret = createSecret({
  name: "DATABASE_URL",
  groupId: group.id,
  value: "postgresql://user:pass@host:5432/db",
  description: "主数据库连接",
  source: "manual"
});

// 3. 在环境变量中引用秘钥
createEnvVar({
  scope: "project",
  projectId: 1,
  key: "DATABASE_URL",
  value: `@secret:${secret.id}`,
  valueType: "secret_ref",
  secretId: secret.id
});

// 4. 部署时自动解析
const env = await buildEnvironmentForProject(1);
// env = { DATABASE_URL: "postgresql://user:pass@host:5432/db" }
```

### 场景2：从 Infisical 同步秘钥

```typescript
// 1. 配置 Infisical 提供者
const provider = createSecretProvider({
  name: "Infisical Production",
  type: "infisical",
  config: {
    clientId: "xxx",
    clientSecret: "yyy",
    projectId: "zzz",
    environment: "production",
    secretPath: "/"
  },
  enabled: true,
  autoSync: true
});

// 2. 创建与提供者关联的秘钥分组
const group = createSecretGroup({
  name: "infisical-production",
  description: "从 Infisical 同步",
  providerId: provider.id,
  autoSync: true
});

// 3. 执行同步（手动或自动）
const syncResult = await syncSecretProvider(provider.id);
// 同步后，secrets 表会自动创建/更新记录
// {
//   name: "DATABASE_URL",
//   groupId: group.id,
//   value: "encrypted...",
//   source: "synced",
//   providerId: provider.id,
//   providerReference: "/production/DATABASE_URL"
// }

// 4. 使用同步的秘钥
createEnvVar({
  scope: "project",
  projectId: 1,
  key: "DATABASE_URL",
  value: `@secret:${secret.id}`,
  valueType: "secret_ref",
  secretId: secret.id
});
```

### 场景3：批量应用秘钥分组

```typescript
// UI 功能：快速导入分组到项目
async function importSecretGroupToProject(groupId: number, projectId: number) {
  const secrets = listSecretsByGroup(groupId);
  
  for (const secret of secrets) {
    // 检查是否已存在
    const existing = getEnvVarByKey('project', projectId, secret.name);
    if (existing) {
      console.log(`Skipping ${secret.name}: already exists`);
      continue;
    }
    
    // 创建环境变量引用
    createEnvVar({
      scope: 'project',
      projectId,
      key: secret.name,
      value: `@secret:${secret.id}`,
      valueType: 'secret_ref',
      secretId: secret.id,
      description: `From group: ${secret.groupName}`
    });
  }
  
  return {
    success: true,
    imported: secrets.length
  };
}

// 使用示例
await importSecretGroupToProject(
  1,  // production-db 分组
  5   // myapp 项目
);
```

### 场景4：安全的 Webhook 部署

```typescript
// 1. 在管理后台预注册应用
const app = createApplication({
  name: "myapp",
  image: "mycompany/myapp",
  version: "v1.0.0",
  repositoryId: 1,
  ports: [{ host: 8080, container: 80 }],
  webhookEnabled: true,    // 启用 webhook
  autoDeploy: false
});
// app.webhookToken = "whk_abc123..."

// 2. 在 CI/CD 中配置 webhook（如 GitHub Actions）
// .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Extract version
        id: version
        run: echo "VERSION=${GITHUB_REF#refs/tags/}" >> $GITHUB_OUTPUT
      
      - name: Trigger deployment
        run: |
          curl -X POST https://deploy.example.com/webhook/deploy \
            -H "Content-Type: application/json" \
            -d '{
              "applicationName": "myapp",
              "version": "${{ steps.version.outputs.VERSION }}",
              "token": "${{ secrets.DEPLOY_WEBHOOK_TOKEN }}"
            }'

// 3. 服务器接收 webhook，验证并部署
// ✅ 只能部署已注册的应用
// ✅ 使用应用专用的 token，泄露后只影响单个应用
// ✅ 无法修改端口、镜像等配置
// ✅ 所有操作都有审计日志
```

---

## 📝 迁移方案

### Step 1: 创建新表

```sql
-- 1. 创建秘钥分组表
CREATE TABLE secret_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  provider_id INTEGER,
  auto_sync INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (provider_id) REFERENCES secret_providers(id) ON DELETE SET NULL
);

-- 2. 创建部署日志表
CREATE TABLE deployment_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL,
  version TEXT NOT NULL,
  deployment_id TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_source TEXT,
  status TEXT NOT NULL,
  error_message TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  duration_ms INTEGER,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

CREATE INDEX idx_deployment_logs_application_id ON deployment_logs(application_id);
CREATE INDEX idx_deployment_logs_status ON deployment_logs(status);
```

### Step 2: 修改现有表

```sql
-- 1. 备份 secrets 表
CREATE TABLE secrets_backup AS SELECT * FROM secrets;

-- 2. 重建 secrets 表
DROP TABLE secrets;
CREATE TABLE secrets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  group_id INTEGER NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  provider_id INTEGER,
  provider_reference TEXT,
  last_synced_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(group_id, name),
  FOREIGN KEY (group_id) REFERENCES secret_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (provider_id) REFERENCES secret_providers(id) ON DELETE SET NULL
);

-- 3. 创建默认分组
INSERT INTO secret_groups (name, description) 
VALUES ('default', 'Default secret group (migrated from old data)');

-- 4. 迁移旧数据到新表
INSERT INTO secrets (name, group_id, value, description, source, created_at, updated_at)
SELECT 
  name,
  1,  -- 默认分组ID
  reference AS value,  -- 旧的 reference 字段作为 value
  metadata AS description,
  'manual',
  created_at,
  updated_at
FROM secrets_backup;

-- 5. 修改 applications 表
ALTER TABLE applications ADD COLUMN webhook_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE applications ADD COLUMN webhook_token TEXT UNIQUE;
ALTER TABLE applications ADD COLUMN auto_deploy INTEGER NOT NULL DEFAULT 0;

-- 为现有应用生成 webhook token
-- 需要通过应用代码生成

-- 6. 修改 environment_variables 表
ALTER TABLE environment_variables ADD COLUMN value_type TEXT NOT NULL DEFAULT 'plain';
ALTER TABLE environment_variables ADD COLUMN secret_id INTEGER;
ALTER TABLE environment_variables ADD COLUMN description TEXT;

CREATE INDEX idx_environment_variables_secret_id ON environment_variables(secret_id);
CREATE INDEX idx_environment_variables_value_type ON environment_variables(value_type);
```

### Step 3: 数据迁移脚本

```typescript
// migrations/003_secrets_v2_migration.ts
export async function migration003_secretsV2() {
  const db = getDb();
  
  console.log('[Migration 003] Starting: Secrets V2 migration');
  
  try {
    // 1. 为所有现有应用生成 webhook token
    const apps = db.prepare('SELECT id FROM applications WHERE webhook_token IS NULL').all();
    const updateStmt = db.prepare('UPDATE applications SET webhook_token = ? WHERE id = ?');
    
    for (const app of apps) {
      const token = generateWebhookToken();
      updateStmt.run(token, app.id);
    }
    
    console.log(`[Migration 003] Generated webhook tokens for ${apps.length} applications`);
    
    // 2. 加密现有 secrets 表中的值
    const secrets = db.prepare('SELECT id, value FROM secrets').all();
    const encryptStmt = db.prepare('UPDATE secrets SET value = ? WHERE id = ?');
    
    for (const secret of secrets) {
      const encrypted = encryptSecret(secret.value);
      encryptStmt.run(encrypted, secret.id);
    }
    
    console.log(`[Migration 003] Encrypted ${secrets.length} secrets`);
    
    console.log('[Migration 003] Completed successfully');
  } catch (error) {
    console.error('[Migration 003] Failed:', error);
    throw error;
  }
}
```

---

## 🎨 UI 改进建议

### 1. 秘钥管理页面

```
秘钥管理
├── 秘钥分组
│   ├── [+] 新建分组
│   ├── 📁 production-db (5 个秘钥)
│   ├── 📁 staging-api (3 个秘钥)
│   └── 🔄 infisical-production (自动同步, 12 个秘钥)
│
└── 秘钥列表
    ├── DATABASE_URL        [production-db]  ****@****  🔒 手动
    ├── REDIS_URL          [production-db]  redis://*  🔒 手动
    ├── STRIPE_API_KEY     [infisical-prod] sk_****    🔄 同步
    └── [+] 添加秘钥
```

**功能**：
- 创建/编辑/删除分组
- 添加/编辑秘钥（支持查看明文，需要二次确认）
- 批量导入秘钥（从文件或 JSON）
- 快速复制分组到项目

### 2. 应用管理页面

```
应用详情: myapp
├── 基本信息
│   ├── 名称: myapp
│   ├── 镜像: mycompany/myapp:v1.2.3
│   ├── 状态: 🟢 运行中
│   └── 最后部署: 2025-10-23 10:30
│
├── Webhook 配置
│   ├── ☑ 启用 Webhook 部署
│   ├── Token: whk_abc123...  [显示] [重新生成]
│   ├── Webhook URL: https://deploy.example.com/webhook/deploy
│   └── 示例请求:
│       curl -X POST ... (可复制)
│
├── 环境变量 (8)
│   ├── NODE_ENV = production           [纯文本]
│   ├── DATABASE_URL = @secret:1        [秘钥引用] 🔒
│   ├── REDIS_URL = @secret:2           [秘钥引用] 🔒
│   └── [+] 添加变量  [📦 导入分组]
│
└── 部署历史 (最近10次)
    ├── v1.2.3  2025-10-23 10:30  ✅ 成功  [webhook]
    ├── v1.2.2  2025-10-22 15:20  ✅ 成功  [手动]
    └── v1.2.1  2025-10-21 09:10  ❌ 失败  [api]
```

### 3. 环境变量编辑器

```
添加环境变量
├── 变量名: DATABASE_URL
├── 值类型:
│   ○ 纯文本
│   ● 引用秘钥
│   ○ 引用分组
│
└── 选择秘钥:
    [搜索秘钥...]
    
    production-db/
    ● DATABASE_URL     postgresql://****@****
      REDIS_URL        redis://****
      
    staging-api/
      API_KEY          sk_****
      
    [或创建新秘钥]
```

---

## ✅ 总结

### 核心改进

1. **✅ 秘钥本地存储**：`secrets` 表存储加密的实际值
2. **✅ 秘钥分组管理**：`secret_groups` 表组织秘钥
3. **✅ 秘钥引用机制**：环境变量支持 `@secret:id` 引用
4. **✅ 安全的 Webhook**：应用预注册 + 专用 token
5. **✅ 审计日志**：`deployment_logs` 记录所有部署
6. **✅ 加密存储**：使用 AES-256-GCM 加密秘钥

### 安全特性

- 🔒 秘钥加密存储（AES-256-GCM）
- 🔐 应用专用 Webhook Token（泄露影响最小化）
- 📋 完整的部署审计日志
- 🚫 Webhook 只能部署已注册的应用
- ⚠️ 秘钥查看需要二次确认

### 向后兼容

- 旧的 `/deploy` 端点保留，标记为 deprecated
- 新的 `/webhook/deploy` 端点使用新模式
- 提供数据迁移脚本

需要我帮你实现某个具体的部分吗？比如：
1. 秘钥加密/解密的完整实现
2. Webhook 部署的路由和控制器
3. 秘钥分组管理的 CRUD API
4. 数据迁移脚本

