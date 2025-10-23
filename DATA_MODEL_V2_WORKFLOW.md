# 数据模型 V2 - 关键工作流程

## 🔄 核心工作流程对比

### 旧版流程（V1）- 不够安全

```
外部 Webhook
     ↓
验证 webhook secret
     ↓
传入完整配置：
- name (任意)
- image
- version  
- port
- containerPort
     ↓
直接部署容器
     ↓
自动创建应用记录 (upsert)
```

**问题**：
- ❌ 可以部署任意应用
- ❌ 可以占用任意端口
- ❌ 秘钥管理混乱
- ❌ 无法审计

---

### 新版流程（V2）- 安全可控

```
1. 准备阶段（在管理后台）
   ↓
┌─────────────────────────────────────┐
│ 管理员预先注册应用                    │
│ - 配置镜像、端口                      │
│ - 生成 webhook token (whk_xxx)       │
│ - 配置环境变量（可引用秘钥）           │
└─────────────────────────────────────┘
   ↓
2. 部署阶段（CI/CD 触发）
   ↓
┌─────────────────────────────────────┐
│ 外部 Webhook                         │
│ POST /webhook/deploy                 │
│ {                                    │
│   "applicationId": 123,              │
│   "version": "v1.2.3",               │
│   "token": "whk_xxx"                 │
│ }                                    │
└─────────────────────────────────────┘
   ↓
3. 验证阶段
   ↓
┌─────────────────────────────────────┐
│ ✓ 应用是否存在？                      │
│ ✓ Webhook 是否启用？                  │
│ ✓ Token 是否匹配？                    │
│ ✓ 版本号是否有效？                    │
└─────────────────────────────────────┘
   ↓
4. 部署阶段
   ↓
┌─────────────────────────────────────┐
│ 使用预注册的配置：                    │
│ - 镜像名称（从应用记录）               │
│ - 端口映射（从应用记录）               │
│ - 环境变量（解析秘钥引用）             │
│ - 仓库认证（从 repository）           │
└─────────────────────────────────────┘
   ↓
5. 记录阶段
   ↓
┌─────────────────────────────────────┐
│ 记录部署日志                          │
│ - 触发来源: webhook                   │
│ - 触发IP                              │
│ - 部署状态                            │
│ - 错误信息                            │
│ - 耗时统计                            │
└─────────────────────────────────────┘
```

---

## 🔐 秘钥管理流程

### 场景1：手动管理秘钥

```
管理员操作
     ↓
1. 创建秘钥分组
   "production-db"
     ↓
2. 添加秘钥到分组
   DATABASE_URL = "postgresql://..."
   REDIS_URL = "redis://..."
   ↓ (加密存储)
   value = "iv:tag:encrypted_data"
     ↓
3. 在环境变量中引用
   Project: myapp
   - NODE_ENV = "production"        [纯文本]
   - DATABASE_URL = "@secret:1"     [引用秘钥]
     ↓
4. 部署时自动解析
   读取 env 表 → 发现 secret_ref
              ↓
          读取 secrets 表
              ↓
          解密秘钥值
              ↓
   注入到容器环境变量
```

### 场景2：从 Infisical 自动同步

```
1. 配置 Infisical Provider
   ↓
   {
     type: "infisical",
     config: {
       clientId: "xxx",
       clientSecret: "yyy",
       projectId: "zzz"
     },
     autoSync: true
   }
     ↓
2. 创建关联分组
   ↓
   {
     name: "infisical-prod",
     providerId: 1,
     autoSync: true
   }
     ↓
3. 手动/自动触发同步
   ↓
┌─────────────────────────────────────┐
│ Infisical API                        │
│ GET /api/v3/secrets                  │
└─────────────────────────────────────┘
   ↓
   返回秘钥列表
   [
     { key: "DATABASE_URL", value: "..." },
     { key: "API_KEY", value: "..." }
   ]
     ↓
4. 保存到本地
   ↓
   FOR EACH secret:
     - 检查是否已存在
     - 加密 value
     - 保存到 secrets 表
     - 标记 source = "synced"
     - 记录 providerReference
     ↓
5. 更新同步状态
   ↓
   secret_providers.last_sync_at = NOW
   secret_providers.last_sync_status = "success"
     ↓
6. 记录同步日志
   ↓
   secret_syncs 表插入记录
```

### 场景3：批量导入秘钥到项目

```
管理员在 UI 操作
     ↓
选择分组: "production-db"
选择项目: "myapp"
点击: [导入到项目]
     ↓
后端处理
     ↓
1. 读取分组内所有秘钥
   ↓
   SELECT * FROM secrets 
   WHERE group_id = 1
     ↓
2. 为每个秘钥创建环境变量引用
   ↓
   FOR EACH secret:
     INSERT INTO environment_variables
     (scope, project_id, key, value, value_type, secret_id)
     VALUES 
     ('project', 5, 'DATABASE_URL', '@secret:1', 'secret_ref', 1)
     ↓
3. 返回导入结果
   ↓
   {
     success: true,
     imported: 5,
     skipped: 0,
     secrets: [...]
   }
```

---

## 🚀 完整部署流程示例

### GitHub Actions + Webhook Deploy

```yaml
# .github/workflows/deploy.yml
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
      
      - name: Build and Push Image
        run: |
          docker build -t mycompany/myapp:${{ steps.version.outputs.VERSION }} .
          docker push mycompany/myapp:${{ steps.version.outputs.VERSION }}
      
      - name: Trigger Deployment
        run: |
          curl -X POST https://deploy.example.com/webhook/deploy \
            -H "Content-Type: application/json" \
            -d '{
              "applicationId": 123,
              "version": "${{ steps.version.outputs.VERSION }}",
              "token": "${{ secrets.DEPLOY_WEBHOOK_TOKEN }}"
            }'
```

**服务器端处理流程**：

```
1. 接收 Webhook 请求
   ↓
   POST /webhook/deploy
   {
     applicationId: 123,
     version: "v1.2.3",
     token: "whk_abc..."
   }
     ↓
2. 查询应用
   ↓
   SELECT * FROM applications WHERE id = 123
   ↓
   返回:
   {
     id: 123,
     name: "myapp",
     image: "mycompany/myapp",
     webhookEnabled: 1,
     webhookToken: "whk_abc...",
     repositoryId: 1,
     ports: [{host: 8080, container: 80}]
   }
     ↓
3. 验证 Webhook Token
   ↓
   app.webhookToken === provided token ?
   ✓ 匹配
     ↓
4. 创建部署日志
   ↓
   INSERT INTO deployment_logs
   (application_id, version, status, trigger_type)
   VALUES (123, "v1.2.3", "pending", "webhook")
   ↓
   返回 deploymentId = "uuid-xxx"
     ↓
5. 构建环境变量
   ↓
   SELECT * FROM environment_variables 
   WHERE scope = 'global' 
      OR (scope = 'project' AND project_id = 123)
   ↓
   FOR EACH env_var:
     IF value_type == 'secret_ref':
       ↓
       读取秘钥: SELECT * FROM secrets WHERE id = secret_id
       ↓
       解密: decryptSecret(secret.value)
       ↓
       结果: { key: value }
     ↓
   最终环境变量:
   {
     NODE_ENV: "production",
     DATABASE_URL: "postgresql://...",  // 已解密
     REDIS_URL: "redis://...",          // 已解密
     API_KEY: "sk_live_..."             // 已解密
   }
     ↓
6. 获取镜像仓库认证
   ↓
   SELECT * FROM repositories WHERE id = 1
   ↓
   返回:
   {
     registry: "https://index.docker.io/v1/",
     authType: "username-password",
     username: "myuser",
     password: "mypass"
   }
     ↓
7. 拉取镜像
   ↓
   docker pull mycompany/myapp:v1.2.3
   使用认证信息: myuser:mypass
     ↓
8. 停止旧容器
   ↓
   docker stop myapp
   docker rm myapp
     ↓
9. 启动新容器
   ↓
   docker run -d \
     --name myapp \
     -p 8080:80 \
     -e NODE_ENV=production \
     -e DATABASE_URL=postgresql://... \
     -e REDIS_URL=redis://... \
     -e API_KEY=sk_live_... \
     --restart unless-stopped \
     mycompany/myapp:v1.2.3
     ↓
10. 更新应用状态
    ↓
    UPDATE applications 
    SET version = "v1.2.3",
        status = "running",
        last_deployed_at = NOW()
    WHERE id = 123
      ↓
11. 更新部署日志
    ↓
    UPDATE deployment_logs
    SET status = "success",
        completed_at = NOW(),
        duration_ms = 15234
    WHERE deployment_id = "uuid-xxx"
      ↓
12. 返回响应
    ↓
    {
      success: true,
      deploymentId: "uuid-xxx",
      application: {
        id: 123,
        name: "myapp",
        version: "v1.2.3"
      },
      message: "Deployment completed successfully"
    }
```

---

## 🔒 安全层级

### 认证层级（从弱到强）

```
Level 1: Webhook Secret（已废弃）
├── 全局 secret
├── 所有应用共享
└── ❌ 泄露后影响所有应用

Level 2: API Key
├── dw_xxxxx 格式
├── 可设置权限（full/deploy/readonly）
├── 可设置过期时间
└── ⚠️ 泄露后影响多个应用

Level 3: Application Webhook Token（推荐）
├── whk_xxxxx 格式
├── 每个应用独立
├── 只能部署特定应用
└── ✅ 泄露后影响最小

Level 4: JWT Token（管理员）
├── 用户登录后获得
├── 短期有效
├── 可以执行所有操作
└── ✅ 最高权限
```

### 数据加密层级

```
传输层
├── HTTPS/TLS
└── 防止中间人攻击

存储层
├── 秘钥加密（AES-256-GCM）
│   ├── value 字段加密存储
│   ├── 查看需要解密
│   └── 环境变量注入时自动解密
│
├── 密码哈希（bcrypt）
│   ├── users.password_hash
│   ├── api_keys.key_hash
│   └── 不可逆加密
│
└── Token 存储（明文）
    ├── applications.webhook_token
    └── 需要完全匹配验证
```

---

## 📊 数据流向图

```
┌──────────────┐
│   用户操作    │
└──────┬───────┘
       │
       ├─────────────────────────────────────────┐
       │                                         │
       ↓                                         ↓
┌──────────────┐                        ┌──────────────┐
│  秘钥管理     │                        │  应用管理     │
├──────────────┤                        ├──────────────┤
│ • 创建分组    │                        │ • 注册应用    │
│ • 添加秘钥    │                        │ • 配置端口    │
│ • 配置同步    │                        │ • 生成token   │
└──────┬───────┘                        └──────┬───────┘
       │                                       │
       │ 引用                                  │
       │                                       │
       ↓                                       ↓
┌──────────────────────────────────────────────────┐
│              环境变量管理                         │
├──────────────────────────────────────────────────┤
│ • 创建变量                                        │
│ • 引用秘钥（@secret:id）                         │
│ • 关联项目                                        │
└──────────────────┬───────────────────────────────┘
                   │
                   │ 使用
                   │
                   ↓
┌──────────────────────────────────────────────────┐
│                部署流程                           │
├──────────────────────────────────────────────────┤
│ 1. Webhook 验证                                   │
│ 2. 读取应用配置                                   │
│ 3. 解析环境变量（解密秘钥）                       │
│ 4. 拉取镜像（使用仓库认证）                       │
│ 5. 启动容器                                       │
│ 6. 记录日志                                       │
└──────────────────────────────────────────────────┘
                   │
                   │
                   ↓
┌──────────────────────────────────────────────────┐
│              运行中的容器                         │
├──────────────────────────────────────────────────┤
│ 环境变量:                                         │
│ - NODE_ENV=production                            │
│ - DATABASE_URL=postgresql://... (已解密)          │
│ - API_KEY=sk_live_... (已解密)                   │
└──────────────────────────────────────────────────┘
```

---

## 🎯 关键改进总结

### 1. 秘钥管理

**V1 (旧)**:
```
secrets 表
├── name: "prod-db"
├── provider: "infisical"
├── reference: "/path/to/secret"
└── ❌ 没有存储实际值
```

**V2 (新)**:
```
secret_groups 表 (分组)
├── production-db
├── staging-api
└── common

secrets 表 (秘钥)
├── name: "DATABASE_URL"
├── groupId: 1
├── value: "encrypted_value"  ✅ 加密存储
├── source: "manual" | "synced"
└── providerId: 1 (如果是同步的)
```

### 2. Webhook 部署

**V1 (旧)**:
```bash
POST /deploy
{
  "name": "任意名称",      # ❌ 不安全
  "image": "任意镜像",     # ❌ 不安全
  "port": "任意端口",      # ❌ 不安全
  "secret": "全局secret"   # ❌ 泄露影响大
}
```

**V2 (新)**:
```bash
POST /webhook/deploy
{
  "applicationId": 123,        # ✅ 必须预注册
  "version": "v1.2.3",         # ✅ 只能改版本
  "token": "whk_app_specific"  # ✅ 应用专用
}
```

### 3. 环境变量

**V1 (旧)**:
```typescript
{
  key: "DATABASE_URL",
  value: "postgresql://..."  // ❌ 明文存储
}
```

**V2 (新)**:
```typescript
{
  key: "DATABASE_URL",
  value: "@secret:1",        // ✅ 引用秘钥
  valueType: "secret_ref",
  secretId: 1
}

// 部署时自动解析：
// @secret:1 → 从 secrets 表读取 → 解密 → 注入容器
```

### 4. 审计日志

**V1 (旧)**:
```
❌ 没有部署日志
```

**V2 (新)**:
```typescript
deployment_logs 表
├── applicationId: 123
├── version: "v1.2.3"
├── deploymentId: "uuid"
├── triggerType: "webhook"
├── triggerSource: "192.168.1.100"
├── status: "success"
├── startedAt: "2025-10-23T10:30:00Z"
├── completedAt: "2025-10-23T10:30:15Z"
└── durationMs: 15234

✅ 完整的部署历史
✅ 可追溯触发来源
✅ 性能统计
```

---

## 🚀 实施建议

### 阶段1：核心表结构（1-2天）
- [ ] 创建 `secret_groups` 表
- [ ] 重构 `secrets` 表
- [ ] 修改 `applications` 表（添加 webhook 字段）
- [ ] 创建 `deployment_logs` 表
- [ ] 编写数据迁移脚本

### 阶段2：秘钥管理（2-3天）
- [ ] 实现秘钥加密/解密
- [ ] 实现秘钥分组 CRUD
- [ ] 实现秘钥 CRUD
- [ ] 实现秘钥同步逻辑
- [ ] UI：秘钥管理页面

### 阶段3：环境变量增强（1-2天）
- [ ] 支持秘钥引用
- [ ] 实现解析逻辑
- [ ] UI：环境变量编辑器改进
- [ ] UI：批量导入分组

### 阶段4：Webhook 重构（2-3天）
- [ ] 新增 `/webhook/deploy` 端点
- [ ] 实现 token 验证
- [ ] 实现部署日志记录
- [ ] UI：应用 webhook 配置页面
- [ ] UI：部署历史查看

### 阶段5：测试和文档（1-2天）
- [ ] 单元测试
- [ ] 集成测试
- [ ] API 文档更新
- [ ] 用户指南
- [ ] 迁移指南

**总计：7-12 天开发时间**

