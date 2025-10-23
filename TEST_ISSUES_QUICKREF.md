# 测试失败快速参考卡片

## 🎯 一分钟问题总结

| 问题类别 | 失败数 | 核心原因 | 修复时间估计 |
|---------|-------|---------|------------|
| 环境变量 API | 7 | 路由缺失 + 参数不匹配 | 2-3小时 |
| 秘钥 API | 2 | 响应数据缺失 + 错误码 | 1小时 |
| 用户注册 | 3 | 验证逻辑顺序错误 | 30分钟 |
| API Key 认证 | 2 | 认证流程 bug | 1-2小时 |
| **总计** | **16/44** | **多种问题** | **4-6小时** |

---

## 🔴 最严重的3个问题

### 1️⃣ 环境变量路由不存在 (7个失败)

**症状：**
```
PUT  /api/env/1    → 404 Not Found
DELETE /api/env/1  → 404 Not Found
```

**快速修复：**
```typescript
// backend/src/routes/env.ts

// 添加 PUT 路由
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const entry = updateEnvVar(id, req.body);
  res.json({ success: true, data: entry });
});

// 添加 DELETE 路由
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  deleteEnvVarById(id);
  res.json({ success: true });
});

// 需要添加的服务函数
export function updateEnvVar(id: number, input: { value: string }): EnvEntry { ... }
export function deleteEnvVarById(id: number): void { ... }
```

---

### 2️⃣ 用户注册验证被跳过 (3个失败)

**症状：**
```
POST /api/auth/register
{
  "email": "invalid-email",      ← 无效格式
  "password": "123"              ← 过短
}
→ 返回 403 而不是 400
```

**快速修复：**
```typescript
// backend/src/routes/auth.ts:15

router.post('/register', async (req, res) => {
  try {
    // ✅ 第一步：验证输入（移到最前面）
    const { email, password } = req.body;
    
    // 邮箱格式验证
    if (!isValidEmail(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email format' 
      });
    }
    
    // 密码长度验证
    if (!password || password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 6 characters' 
      });
    }
    
    // ✅ 第二步：检查是否允许注册
    if (hasAnyUser()) {
      return res.status(403).json({ 
        success: false, 
        error: 'Registration disabled' 
      });
    }
    
    // ✅ 第三步：创建用户（会再次验证重复）
    const created = await createUser({ email, password });
    res.status(201).json({ 
      success: true, 
      data: { user: { id: created.id, email: created.email } } 
    });
  } catch (error) {
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 400).json(fail);
  }
});
```

---

### 3️⃣ API Key 认证失败 (2个失败)

**症状：**
```
使用有效的 API Key → 返回 401 Unauthorized
```

**快速修复：**
```typescript
// backend/tests/helpers/apiClient.ts:17-42

export class ApiClient {
  private authToken?: string;
  private tokenType?: 'admin' | 'jwt' | 'api-key';

  setAuthToken(token: string, type: 'admin' | 'jwt' | 'api-key' = 'admin'): void {
    this.authToken = token;
    this.tokenType = type;
  }

  private buildRequest(method: 'get' | 'post' | 'put' | 'delete', url: string) {
    let req = request(this.app)[method](url);
    
    if (this.authToken) {
      // ✅ 根据 token 类型设置不同的请求头
      switch (this.tokenType) {
        case 'api-key':
          req = req.set('Authorization', `Bearer ${this.authToken}`);
          break;
        case 'jwt':
          req = req.set('Authorization', `Bearer ${this.authToken}`);
          break;
        case 'admin':
        default:
          req = req.set('x-admin-token', this.authToken);
          break;
      }
    }
    
    return req;
  }
}

// 测试中使用：
const apiKeyValue = response.body.data.key;
client.setAuthToken(apiKeyValue, 'api-key');  // ✅ 指定类型
```

---

## 📝 其他需要修复的问题

### 4. 环境变量参数不匹配

**问题：**
- 测试发送 `projectName: "test-app"`
- API 期望 `projectId: 1`

**快速修复：**
```typescript
// backend/src/routes/env.ts:74

router.post('/', (req, res) => {
  try {
    let input = req.body;
    
    // ✅ 如果提供了 projectName，转换为 projectId
    if (input.projectName && !input.projectId) {
      const db = getDb();
      const app = db.prepare('SELECT id FROM applications WHERE name = ?')
        .get(input.projectName);
      if (!app) {
        return res.status(400).json({ 
          success: false, 
          error: `Project '${input.projectName}' not found` 
        });
      }
      input.projectId = app.id;
      delete input.projectName;
    }
    
    const entry = upsertEnvEntry(input);
    res.status(201).json({ success: true, data: entry });  // ✅ 改为 201
  } catch (error) {
    // ...
  }
});
```

---

### 5. 秘钥响应缺失 ID

**问题：**
```javascript
createResponse.body.data.id  // undefined
```

**检查位置：**
```typescript
// backend/src/services/database.ts

export function createSecret(input: ...): SecretRecord {
  const result = db.prepare(
    'INSERT INTO secrets (name, provider, reference, metadata) VALUES (?, ?, ?, ?)'
  ).run(input.name, input.provider, input.reference, JSON.stringify(input.metadata));
  
  // ✅ 确保返回完整记录
  const created = db.prepare('SELECT * FROM secrets WHERE id = ?')
    .get(result.lastInsertRowid);
  
  return mapSecretRow(created);  // ✅ 必须包含 id 字段
}
```

---

### 6. 秘钥重复返回 500

**问题：**
```javascript
throw new Error('already exists')  // → 500
```

**快速修复：**
```typescript
// backend/src/services/secretStore.ts:27

if (getSecretByName(parsed.name)) {
  // ❌ 旧代码
  // throw new Error(`Secret with name ${parsed.name} already exists`);
  
  // ✅ 新代码
  const error: any = new Error(`Secret with name ${parsed.name} already exists`);
  error.code = 400;
  throw error;
}
```

或使用自定义错误类：
```typescript
class ValidationError extends Error {
  code = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

if (getSecretByName(parsed.name)) {
  throw new ValidationError(`Secret with name ${parsed.name} already exists`);
}
```

---

### 7. 环境变量创建返回 200 而不是 201

**快速修复：**
```typescript
// backend/src/routes/env.ts:76

// ❌ 旧代码
res.json({ success: true, data: entry });

// ✅ 新代码
res.status(201).json({ success: true, data: entry });
```

---

## 🛠️ 完整修复脚本

创建一个补丁文件 `fix-tests.sh`：

```bash
#!/bin/bash

echo "🔧 开始修复测试问题..."

# 1. 备份原始文件
echo "📦 备份原始文件..."
cp backend/src/routes/env.ts backend/src/routes/env.ts.backup
cp backend/src/routes/auth.ts backend/src/routes/auth.ts.backup
cp backend/tests/helpers/apiClient.ts backend/tests/helpers/apiClient.ts.backup

# 2. 应用补丁（需要创建补丁文件）
echo "✨ 应用修复补丁..."
# patch -p1 < fixes.patch

# 3. 运行测试
echo "🧪 运行测试..."
cd backend
npm test

# 4. 显示结果
echo "✅ 修复完成！查看上方测试结果。"
```

---

## 🎯 修复验证检查清单

修复后运行测试，确保以下测试通过：

**环境变量测试 (7个):**
```bash
✅ 应该成功创建全局环境变量
✅ 应该成功创建项目环境变量
✅ 应该能够更新环境变量
✅ 应该能够删除环境变量
✅ 应该支持环境变量的 upsert 操作
✅ 应该正确处理环境变量优先级
✅ 应该能够按项目名称过滤环境变量
```

**秘钥测试 (2个):**
```bash
✅ 应该能够删除秘钥
✅ 应该拒绝重复的秘钥名称
```

**用户注册测试 (3个):**
```bash
✅ 应该拒绝重复的邮箱
✅ 应该拒绝无效的邮箱格式
✅ 应该拒绝过短的密码
```

**API Key 测试 (2个):**
```bash
✅ 应该接受有效的 API Key
✅ 应该拒绝无效的 API Key
```

---

## 🚀 快速执行步骤

### 方案 A：一次性修复所有问题（推荐）

```bash
# 1. 创建功能分支
git checkout -b fix/test-failures

# 2. 按优先级修复
# - 修复环境变量路由（30分钟）
# - 修复用户注册逻辑（15分钟）
# - 修复 API Key 认证（30分钟）
# - 修复秘钥问题（30分钟）
# - 修复状态码（15分钟）

# 3. 运行测试
cd backend
npm test

# 4. 提交修复
git add .
git commit -m "fix: resolve 16 failing test cases"
git push origin fix/test-failures
```

### 方案 B：分批修复（适合团队协作）

```bash
# 批次1：环境变量 API
git checkout -b fix/env-api
# 修复 env.ts 路由
git commit -m "fix: add PUT/DELETE routes for environment variables"

# 批次2：用户注册
git checkout -b fix/auth-validation
# 修复 auth.ts 验证顺序
git commit -m "fix: validate input before checking registration permission"

# 批次3：API Key
git checkout -b fix/api-key-auth
# 修复 apiClient.ts 和 apiKeyAuth.ts
git commit -m "fix: correct API key authentication flow"
```

---

## 📞 需要帮助？

如果修复后仍有问题，检查以下内容：

1. **数据库状态：** 测试数据是否正确清理？
2. **环境变量：** `ADMIN_TOKEN`, `JWT_SECRET` 等是否设置？
3. **依赖版本：** `npm` 包是否是最新的？
4. **Docker：** Docker 服务是否正常运行？
5. **端口冲突：** 测试端口 9001 是否被占用？

**查看详细日志：**
```bash
# 开启 DEBUG 模式
DEBUG=* npm test

# 查看数据库内容
sqlite3 backend/data/test/deploy-webhook.db "SELECT * FROM environment_variables;"
```

---

## 📚 相关文档

- 详细分析：`TEST_ISSUES_ANALYSIS.md`
- 中文总结：`TEST_ISSUES_SUMMARY.zh.md`
- 流程图：`TEST_ISSUES_FLOWCHART.md`
- 测试指南：`backend/TESTING_GUIDE.md`
- 快速开始：`backend/TESTING_QUICKSTART.md`

