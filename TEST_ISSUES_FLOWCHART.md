# 测试失败问题诊断流程图

## 问题1：环境变量 API 流程对比

### 当前实现
```
测试期望:                      实际实现:
POST /api/env                 POST /api/env
  ↓                             ↓
返回 201 Created              返回 200 OK ❌
  ↓                             ↓
使用 projectName              使用 projectId ❌
  ↓                             ↓
PUT /api/env/:id              不存在 ❌
  ↓                           
返回 200 OK                   返回 404 Not Found ❌
  ↓                             
DELETE /api/env/:id           DELETE /api/env?scope=xxx&key=xxx ❌
  ↓                             ↓
返回 200 OK                   返回 404 Not Found ❌
```

### 修复后
```
POST /api/env
  ↓
验证 scope
  ↓
如果 scope=project
  ├─ 有 projectName? → 转换为 projectId
  └─ 有 projectId? → 直接使用
  ↓
upsert 操作
  ↓
返回 201 Created（新建）或 200 OK（更新）
  ↓
添加 PUT /api/env/:id 路由
添加 DELETE /api/env/:id 路由
```

---

## 问题2：用户注册逻辑流程

### 当前实现（错误）
```
POST /api/auth/register
  ↓
检查 hasAnyUser()
  ├─ true → 立即返回 403 ❌
  │         (跳过所有验证)
  └─ false → 继续
      ↓
  验证邮箱格式 ← 永远不会执行到这里
      ↓
  验证密码长度 ← 永远不会执行到这里
      ↓
  检查邮箱重复 ← 永远不会执行到这里
      ↓
  创建用户
      ↓
  返回 201 Created
```

### 修复后（正确）
```
POST /api/auth/register
  ↓
验证邮箱格式
  ├─ 无效 → 返回 400 Bad Request
  └─ 有效 → 继续
      ↓
验证密码长度
  ├─ 太短 → 返回 400 Bad Request
  └─ 有效 → 继续
      ↓
检查邮箱是否已存在
  ├─ 已存在 → 返回 400 Bad Request
  └─ 不存在 → 继续
      ↓
检查是否允许注册
  ├─ hasAnyUser()=true → 返回 403 Forbidden
  └─ hasAnyUser()=false → 继续
      ↓
  创建用户
      ↓
  返回 201 Created
```

---

## 问题3：API Key 认证流程

### 当前实现（有问题）
```
测试代码:
client.setAuthToken(apiKey)
  ↓
ApiClient.buildRequest()
  ↓
设置请求头:
req.set('x-admin-token', apiKey) ❌
  ↓
服务器接收到请求
  ↓
requireAnyAuth() 中间件
  ↓
1. 检查 x-admin-token == ADMIN_TOKEN?
   ├─ 相等 → 通过
   └─ 不等 → 继续 ❌ (API Key 被错误处理)
  ↓
2. 检查 Authorization: Bearer <jwt>
   └─ 不是 JWT → 继续
  ↓
3. 调用 requireAPIKey()
   ↓
   extractAPIKey() 函数
     ├─ 检查 X-API-Key 请求头 ← 没有
     ├─ 检查 Authorization: Bearer dw_* ← 没有
     └─ 检查查询参数 ← 没有
   ↓
   返回 null
   ↓
返回 401 Unauthorized ❌
```

### 修复后（正确）
```
测试代码:
client.setAuthToken(apiKey, 'api-key')
  ↓
ApiClient.buildRequest()
  ↓
根据 token 类型设置请求头:
如果是 API Key:
  req.set('Authorization', 'Bearer ' + apiKey)
  或
  req.set('X-API-Key', apiKey)
  ↓
服务器接收到请求
  ↓
requireAnyAuth() 中间件
  ↓
1. 检查 x-admin-token
   └─ 没有 → 继续
  ↓
2. 检查 Authorization: Bearer <token>
   ├─ 不以 dw_ 开头 → 尝试 JWT 验证
   └─ 以 dw_ 开头 → 作为 API Key 处理 ✓
  ↓
3. 验证 API Key
   ├─ 有效 → 通过 ✓
   └─ 无效 → 返回 401
```

---

## 问题4：秘钥创建和删除流程

### 当前实现（有问题）
```
POST /api/secrets
  ↓
验证输入
  ↓
检查名称是否重复
  ├─ 是 → throw Error("already exists")
  │         ↓
  │       catch 处理 → 返回 500 ❌
  └─ 否 → 继续
      ↓
  调用 database.createSecret()
      ↓
  INSERT INTO secrets ...
      ↓
  返回数据（但可能没有 id）❌
      ↓
  res.status(201).json({ data: {...} })
      ↓
测试接收:
response.body.data.id === undefined ❌
```

### 修复后（正确）
```
POST /api/secrets
  ↓
验证输入
  ↓
检查名称是否重复
  ├─ 是 → throw ValidationError("already exists", 400)
  │         ↓
  │       catch 处理 → 返回 400 ✓
  └─ 否 → 继续
      ↓
  调用 database.createSecret()
      ↓
  INSERT INTO secrets ...
      ↓
  SELECT * FROM secrets WHERE id = last_insert_rowid()
      ↓
  返回完整数据（包含 id）✓
      ↓
  res.status(201).json({ data: { id: 1, name: "...", ... } })
      ↓
测试接收:
response.body.data.id === 1 ✓
  ↓
DELETE /api/secrets/1
  ↓
删除成功 ✓
```

---

## 认证方式优先级（当前 vs 推荐）

### 当前实现
```
请求到达
  ↓
1. x-admin-token 请求头?
   ├─ 存在且匹配 ADMIN_TOKEN → 通过 ✓
   └─ 不匹配或不存在 → 继续
  ↓
2. Authorization: Bearer <token>
   ├─ 不以 dw_ 开头
   │   └─ 尝试 JWT 验证
   │       ├─ 有效 → 通过 ✓
   │       └─ 无效 → 继续
   └─ 以 dw_ 开头
       └─ 作为 API Key 验证
  ↓
3. X-API-Key 请求头?
   └─ extractAPIKey() → requireAPIKey()
  ↓
4. 查询参数中的 API Key?
   └─ extractAPIKey() → requireAPIKey()
  ↓
都不匹配 → 返回 401
```

### 推荐实现
```
请求到达
  ↓
1. 检查 x-admin-token
   ├─ 存在 → 验证 Admin Token
   │   ├─ 有效 → 通过 ✓
   │   └─ 无效 → 返回 401（不继续）
   └─ 不存在 → 继续
  ↓
2. 检查 Authorization: Bearer <token>
   ├─ 存在 → 根据格式判断
   │   ├─ JWT 格式 → 验证 JWT
   │   │   ├─ 有效 → 通过 ✓
   │   │   └─ 无效 → 返回 401
   │   └─ API Key 格式 (dw_*) → 验证 API Key
   │       ├─ 有效 → 通过 ✓
   │       └─ 无效 → 返回 401
   └─ 不存在 → 继续
  ↓
3. 检查 X-API-Key
   ├─ 存在 → 验证 API Key
   │   ├─ 有效 → 通过 ✓
   │   └─ 无效 → 返回 401
   └─ 不存在 → 继续
  ↓
4. 检查 x-webhook-secret（仅部署端点）
   ├─ 存在 → 验证 Webhook Secret
   │   ├─ 有效 → 通过 ✓
   │   └─ 无效 → 返回 401
   └─ 不存在 → 继续
  ↓
都不存在 → 返回 401
```

---

## 数据流问题总结

### 环境变量参数转换流程
```
测试层:
{
  scope: "project",
  projectName: "test-app",  ← 字符串
  key: "VAR",
  value: "value"
}
  ↓
API 层（需要添加转换）:
router.post('/api/env', (req, res) => {
  let input = req.body;
  
  // 如果提供了 projectName，转换为 projectId
  if (input.projectName && !input.projectId) {
    const app = getApplicationByName(input.projectName);
    input.projectId = app.id;
  }
  
  upsertEnvEntry(input);  ← 传递包含 projectId 的对象
})
  ↓
服务层:
upsertEnvEntry({
  scope: "project",
  projectId: 1,  ← 数字
  key: "VAR",
  value: "value"
})
  ↓
数据库:
INSERT INTO environment_variables
  (scope, project_id, key, value)
VALUES
  ('project', 1, 'VAR', 'value')
```

---

## 错误响应统一格式

### 当前实现（不一致）
```
情况1: 验证错误
{ success: false, error: "Invalid input" }  ← 有时有 success
{ error: "Invalid input" }                   ← 有时没有 success

情况2: 业务错误
{ success: false, error: "Already exists" }

情况3: 系统错误
{ error: "Internal server error" }           ← 缺少 success
```

### 推荐实现（统一）
```
所有错误响应格式:
{
  success: false,
  error: "错误类型/代码",
  message: "详细错误信息",
  details?: {  // 可选，用于验证错误
    field: "email",
    issue: "invalid format"
  }
}

示例:
400 Bad Request:
{
  success: false,
  error: "VALIDATION_ERROR",
  message: "Invalid email format",
  details: { field: "email" }
}

401 Unauthorized:
{
  success: false,
  error: "UNAUTHORIZED",
  message: "Invalid API key"
}

403 Forbidden:
{
  success: false,
  error: "FORBIDDEN",
  message: "Registration is disabled"
}

500 Internal Server Error:
{
  success: false,
  error: "INTERNAL_ERROR",
  message: "An unexpected error occurred"
}
```

---

## 修复优先级矩阵

```
影响范围 ↑
│
│  高  │ P0: 环境变量路由      │ P0: API Key 认证
│      │     (7个失败)        │     (2个失败)
│      │ ─────────────────────┼─────────────────────
│  中  │ P1: 用户注册逻辑     │ P1: 秘钥响应结构
│      │     (3个失败)        │     (1个失败)
│      │ ─────────────────────┼─────────────────────
│  低  │ P2: 状态码统一       │ P2: 错误处理优化
│      │     (多个测试)       │     (1个失败)
└──────┴─────────────────────┴─────────────────────→
       低                    高                  修复复杂度
```

---

## 快速诊断命令

```bash
# 1. 运行测试并查看详细输出
cd backend
npm test -- --verbose

# 2. 只运行失败的测试
npm test -- --testNamePattern="应该成功创建全局环境变量"

# 3. 查看测试覆盖率
npm test -- --coverage

# 4. 运行特定测试文件
npm test -- tests/integration/secrets.test.ts

# 5. 监听模式（开发时使用）
npm test -- --watch

# 6. 检查 API 端点
curl -X GET http://localhost:9001/api/env \
  -H "x-admin-token: your-token"

# 7. 测试环境变量创建
curl -X POST http://localhost:9001/api/env \
  -H "x-admin-token: your-token" \
  -H "Content-Type: application/json" \
  -d '{"scope":"global","key":"TEST","value":"test"}'
```

