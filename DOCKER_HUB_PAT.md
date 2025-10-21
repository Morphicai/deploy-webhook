# Docker Hub Personal Access Token (PAT) 配置指南

## 🎯 为什么使用 PAT？

Docker Hub Personal Access Token (PAT) 提供了比密码更安全的认证方式：

- ✅ **更安全**: 可以随时撤销，不暴露密码
- ✅ **必需的**: 启用 2FA 后，命令行必须使用 PAT
- ✅ **细粒度权限**: 可以设置 Read、Write、Delete 权限
- ✅ **审计跟踪**: 可以追踪哪个 Token 被使用

---

## 📋 创建 Docker Hub PAT

### Step 1: 登录 Docker Hub

访问 [https://hub.docker.com/](https://hub.docker.com/)

### Step 2: 进入安全设置

1. 点击右上角用户名
2. 选择 **Account Settings**
3. 点击左侧 **Security** 菜单
4. 找到 **Personal Access Tokens** 部分

### Step 3: 创建新 Token

1. 点击 **New Access Token**
2. 填写 **Token Description**: `Deploy Webhook`
3. 选择 **Access permissions**:
   - **Read**: 拉取镜像 ✓
   - **Write**: 推送镜像（按需）
   - **Delete**: 删除镜像（按需）
4. 点击 **Generate**
5. **⚠️ 重要**: 复制生成的 Token（格式：`dckr_pat_xxxxxxxxxxxxx`）
6. **⚠️ 注意**: 关闭页面后无法再次查看

---

## 🚀 在 Deploy Webhook 中配置

### 方式 1: username-password 认证类型（推荐）

这是**最简单**的方式，适用于所有情况：

#### UI 配置

```
名称: Docker Hub (PAT)
Registry URL: https://index.docker.io/v1/
认证类型: 用户名和密码 ✓
用户名: your-dockerhub-username
密码: dckr_pat_xxxxxxxxxxxxx
设为默认: ✓
```

#### API 配置

```bash
curl -X POST http://localhost:9000/api/repositories \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Docker Hub (PAT)",
    "registry": "https://index.docker.io/v1/",
    "authType": "username-password",
    "username": "your-dockerhub-username",
    "password": "dckr_pat_xxxxxxxxxxxxx",
    "isDefault": true
  }'
```

**说明**: 
- 虽然选择的是"用户名和密码"类型
- 但实际上密码字段填入的是 PAT Token
- Docker 会自动识别并正确处理

---

### 方式 2: token 认证类型（新增支持）

我们已经优化代码，现在也支持使用 `token` 认证类型：

#### UI 配置

```
名称: Docker Hub (Token)
Registry URL: https://index.docker.io/v1/
认证类型: 访问令牌 ✓
用户名: your-dockerhub-username (必须填写)
Token: dckr_pat_xxxxxxxxxxxxx
设为默认: ✓
```

#### API 配置

```bash
curl -X POST http://localhost:9000/api/repositories \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Docker Hub (Token)",
    "registry": "https://index.docker.io/v1/",
    "authType": "token",
    "username": "your-dockerhub-username",
    "token": "dckr_pat_xxxxxxxxxxxxx",
    "isDefault": true
  }'
```

**说明**:
- Docker Hub 需要同时提供 `username` 和 `token`
- 系统会自动识别 Docker Hub 并使用正确的认证方式

---

## 🔍 验证配置

### 测试部署

```bash
curl -X POST http://localhost:9000/deploy \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: your-secret" \
  -d '{
    "name": "test-app",
    "repo": "library/nginx",
    "version": "latest",
    "port": 8080,
    "containerPort": 80,
    "repositoryId": 1
  }'
```

### 检查日志

```bash
docker logs deploy-webhook | grep "Pulling image"
docker logs deploy-webhook | grep "Using repository"
```

成功的日志应该显示：
```
[deploy-webhook] Using repository { repositoryName: 'Docker Hub (PAT)', registry: 'index.docker.io' }
[deploy-webhook] Pulling image { fullImage: 'index.docker.io/library/nginx:latest' }
[deploy-webhook] Image pull completed
```

---

## 🔐 安全最佳实践

### 1. Token 权限

**只拉取镜像**（推荐）：
- ✅ Read Only

**需要推送镜像**：
- ✅ Read
- ✅ Write

**完全控制**（不推荐）：
- ⚠️ Read
- ⚠️ Write
- ⚠️ Delete

### 2. Token 管理

✅ **定期轮换**: 每 3-6 个月更换一次
✅ **分用途创建**: 不同系统使用不同 Token
✅ **描述清晰**: 便于识别和管理
✅ **及时撤销**: 不再使用时立即删除

### 3. Token 存储

✅ **环境变量**: 推荐使用环境变量
✅ **密钥管理**: 使用 Infisical 等工具
❌ **代码中硬编码**: 绝对不要
❌ **明文配置文件**: 避免

---

## 📊 对比: 密码 vs PAT

| 特性 | 密码 | PAT Token |
|-----|------|-----------|
| **安全性** | ⚠️ 低 | ✅ 高 |
| **可撤销性** | ❌ 需要改密码 | ✅ 随时撤销 |
| **2FA 兼容** | ❌ 不支持 | ✅ 支持 |
| **权限控制** | ❌ 全部权限 | ✅ 细粒度 |
| **审计追踪** | ❌ 无 | ✅ 有 |
| **泄露风险** | ⚠️ 高（影响整个账户） | ✅ 低（只影响该 Token） |

**推荐**: 始终使用 PAT Token，不要使用密码！

---

## 🛠️ 故障排除

### 问题 1: 拉取镜像失败 - 401 Unauthorized

**错误日志**:
```
Error: unauthorized: authentication required
```

**原因**: Token 无效或过期

**解决方案**:
1. 在 Docker Hub 检查 Token 是否还有效
2. 重新生成 Token
3. 更新 Repository 配置：
   ```bash
   curl -X PUT http://localhost:9000/api/repositories/1 \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "password": "dckr_pat_new_token"
     }'
   ```

### 问题 2: Token 认证类型配置错误

**症状**: 使用 `token` 认证类型但未填写 `username`

**错误**: 拉取失败

**解决方案**:
- 方案 A: 改用 `username-password` 认证类型（推荐）
- 方案 B: 填写 `username` 字段

### 问题 3: Registry URL 错误

**常见错误**:
- ❌ `https://hub.docker.com`
- ❌ `https://docker.io`
- ❌ `registry.hub.docker.com`

**正确格式**:
- ✅ `https://index.docker.io/v1/`

---

## 📚 相关链接

- [Docker Hub Access Tokens 官方文档](https://docs.docker.com/docker-hub/access-tokens/)
- [Docker Hub Security Best Practices](https://docs.docker.com/docker-hub/repos/#security-best-practices)
- [Deploy Webhook Repository 管理文档](./REPOSITORY_MANAGEMENT.md)

---

## 🎉 总结

### ✅ 推荐配置

**最简单的方式**:
```
认证类型: 用户名和密码
用户名: your-dockerhub-username
密码: dckr_pat_xxxxxxxxxxxxx (PAT Token)
```

**或者使用 Token 类型**（需要填写用户名）:
```
认证类型: 访问令牌
用户名: your-dockerhub-username
Token: dckr_pat_xxxxxxxxxxxxx
```

### 🔐 安全提示

1. ✅ 始终使用 PAT，不要使用密码
2. ✅ 只授予必要的权限（Read Only 通常足够）
3. ✅ 定期轮换 Token
4. ✅ 为不同系统创建不同 Token
5. ✅ 及时撤销不再使用的 Token

**🌟 现在您可以安全地使用 Docker Hub PAT 进行镜像拉取了！**

---

**文档版本**: v1.0  
**更新时间**: 2025-10-21  
**适用版本**: Deploy Webhook v1.2.0+

