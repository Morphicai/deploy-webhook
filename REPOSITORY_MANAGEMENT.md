# Repository（镜像仓库）管理功能

## 🎯 功能概述

Deploy Webhook 现在支持管理多个 Docker 镜像仓库，并在部署时选择使用哪个仓库拉取镜像。

###核心特性

✅ **多仓库管理** - 支持添加、编辑、删除多个镜像仓库  
✅ **多种认证方式** - 支持用户名/密码、Token、无认证  
✅ **默认仓库** - 设置默认仓库，部署时自动使用  
✅ **选择仓库部署** - 部署时可指定使用哪个仓库  
✅ **凭证安全** - 密码和 Token 安全存储，列表时隐藏敏感信息  
✅ **向后兼容** - 兼容旧版配置方式  

---

## 📋 认证方式

### 1. 用户名/密码 (username-password)

适用于大多数私有 Registry：

```json
{
  "name": "Private Registry",
  "registry": "https://registry.example.com",
  "authType": "username-password",
  "username": "myuser",
  "password": "mypassword"
}
```

### 2. Token (token)

适用于 OAuth 2.0 认证的 Registry（如 Google Container Registry, Harbor）：

```json
{
  "name": "GCR",
  "registry": "https://gcr.io",
  "authType": "token",
  "token": "ya29.xxx..."
}
```

### 3. 无认证 (none)

适用于公共 Registry（如 Docker Hub 公共镜像）：

```json
{
  "name": "Docker Hub",
  "registry": "https://index.docker.io/v1/",
  "authType": "none"
}
```

---

## 🚀 快速开始

### 添加镜像仓库

#### 通过 UI

1. 登录 Deploy Webhook UI
2. 导航到 **Repositories** 页面
3. 点击 **添加仓库**
4. 填写仓库信息：
   - **名称**: 仓库显示名称
   - **Registry URL**: 仓库地址
   - **认证类型**: 选择认证方式
   - **认证信息**: 根据类型填写
   - **设为默认**: 是否设为默认仓库
5. 保存

#### 通过 API

```bash
curl -X POST http://localhost:9000/api/repositories \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Aliyun Registry",
    "registry": "https://registry.cn-hangzhou.aliyuncs.com",
    "authType": "username-password",
    "username": "your-username",
    "password": "your-password",
    "isDefault": true
  }'
```

---

## 📊 数据库表结构

```sql
CREATE TABLE repositories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,           -- 仓库名称
  registry TEXT NOT NULL,               -- Registry URL
  authType TEXT NOT NULL,               -- 认证类型: username-password | token | none
  username TEXT,                        -- 用户名（可选）
  password TEXT,                        -- 密码（可选）
  token TEXT,                           -- Token（可选）
  isDefault INTEGER NOT NULL DEFAULT 0, -- 是否为默认仓库
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## 🔧 API 接口

### GET /api/repositories

列出所有仓库（密码和 Token 被隐藏）

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Docker Hub",
      "registry": "https://index.docker.io/v1/",
      "authType": "none",
      "hasPassword": false,
      "hasToken": false,
      "isDefault": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### GET /api/repositories/:id

获取指定仓库的完整信息（包含密码和 Token）

### POST /api/repositories

创建新仓库

### PUT /api/repositories/:id

更新仓库信息

### POST /api/repositories/:id/set-default

设置默认仓库

### DELETE /api/repositories/:id

删除仓库（不能删除默认仓库）

---

## 🎯 部署时使用

### 使用默认仓库

```bash
curl -X POST http://localhost:9000/deploy \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: your-secret" \
  -d '{
    "name": "my-app",
    "repo": "myorg/myapp",
    "version": "1.0.0",
    "port": 8080,
    "containerPort": 3000
  }'
```

系统会自动使用默认仓库的凭证拉取镜像。

### 指定仓库

```bash
curl -X POST http://localhost:9000/deploy \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret": "your-secret" \
  -d '{
    "name": "my-app",
    "repo": "myorg/myapp",
    "version": "1.0.0",
    "port": 8080,
    "containerPort": 3000,
    "repositoryId": 2
  }'
```

系统会使用 ID 为 2 的仓库凭证拉取镜像。

---

## 📝 常见仓库配置

### Docker Hub

```json
{
  "name": "Docker Hub",
  "registry": "https://index.docker.io/v1/",
  "authType": "none"
}
```

或使用认证：

```json
{
  "name": "Docker Hub (Authenticated)",
  "registry": "https://index.docker.io/v1/",
  "authType": "username-password",
  "username": "your-dockerhub-username",
  "password": "your-dockerhub-password"
}
```

### 阿里云容器镜像服务

```json
{
  "name": "Aliyun Registry (杭州)",
  "registry": "https://registry.cn-hangzhou.aliyuncs.com",
  "authType": "username-password",
  "username": "your-aliyun-username",
  "password": "your-aliyun-password"
}
```

### 腾讯云容器镜像服务

```json
{
  "name": "Tencent Registry (广州)",
  "registry": "https://ccr.ccs.tencentyun.com",
  "authType": "username-password",
  "username": "your-tencent-username",
  "password": "your-tencent-password"
}
```

### Harbor

```json
{
  "name": "Harbor",
  "registry": "https://harbor.example.com",
  "authType": "username-password",
  "username": "admin",
  "password": "Harbor12345"
}
```

### Google Container Registry

```json
{
  "name": "GCR",
  "registry": "https://gcr.io",
  "authType": "token",
  "token": "ya29.xxx..."
}
```

### AWS ECR

```json
{
  "name": "AWS ECR",
  "registry": "https://123456789012.dkr.ecr.us-west-2.amazonaws.com",
  "authType": "username-password",
  "username": "AWS",
  "password": "eyJwYXlsb2FkIjoi..."
}
```

**注意**: AWS ECR 的密码是临时的，需要定期更新（通过 `aws ecr get-login-password`）

---

## 🔐 安全最佳实践

### 1. 密码管理

- ✅ 使用强密码
- ✅ 定期轮换密码
- ✅ 不要在日志中记录密码
- ✅ 使用只读账号（如果只需拉取镜像）

### 2. Token 管理

- ✅ 使用最小权限 Token
- ✅ 设置 Token 过期时间
- ✅ 定期轮换 Token

### 3. 数据库安全

- ✅ 加密数据库文件
- ✅ 限制数据库文件访问权限
- ✅ 定期备份数据库

### 4. API 安全

- ✅ 使用 HTTPS
- ✅ 启用 JWT 认证
- ✅ 限制 API 访问 IP

---

## 🛠️ 故障排除

### 问题 1: 拉取镜像失败 - 401 Unauthorized

**原因**: 凭证错误或过期

**解决方案**:
```bash
# 1. 检查仓库凭证是否正确
curl -X GET http://localhost:9000/api/repositories/:id \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 2. 更新凭证
curl -X PUT http://localhost:9000/api/repositories/:id \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "new-username",
    "password": "new-password"
  }'
```

### 问题 2: 无法删除仓库

**错误**: `Cannot delete default repository`

**原因**: 不能删除默认仓库

**解决方案**:
```bash
# 1. 先设置另一个仓库为默认
curl -X POST http://localhost:9000/api/repositories/2/set-default \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 2. 再删除原仓库
curl -X DELETE http://localhost:9000/api/repositories/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 问题 3: Registry URL 格式错误

**常见错误**:
- ❌ `registry.example.com` (缺少协议)
- ❌ `http://registry.example.com` (应使用 HTTPS)
- ❌ `registry.example.com/` (多余的斜杠)

**正确格式**:
- ✅ `https://registry.example.com`
- ✅ `https://index.docker.io/v1/` (Docker Hub)

---

## 💡 使用场景

### 场景 1: 多云部署

```
组织使用多个云服务商:
- 阿里云镜像服务（中国区域）
- AWS ECR（美国区域）
- GCR（全球）

配置:
1. 添加三个仓库，分别对应不同云服务商
2. 根据部署区域选择对应的仓库
3. 减少跨区域传输，提升拉取速度
```

### 场景 2: 开发/生产环境隔离

```
开发环境:
- 使用 Harbor 内部仓库
- 无需认证，快速迭代

生产环境:
- 使用阿里云企业版镜像服务
- 严格认证，安全扫描
```

### 场景 3: 镜像缓存加速

```
主仓库:
- Docker Hub (官方镜像)
- 速度较慢

镜像仓库:
- 阿里云 Docker Hub 镜像
- registry.cn-hangzhou.aliyuncs.com
- 拉取速度提升 10 倍
```

---

## 🎉 总结

### ✅ 已实现功能

1. **后端**:
   - ✅ Repository 数据库表和 Schema
   - ✅ Repository CRUD API
   - ✅ 默认仓库管理
   - ✅ 部署时支持选择仓库
   - ✅ 多种认证方式支持
   - ✅ 向后兼容

2. **安全**:
   - ✅ 密码和 Token 安全存储
   - ✅ 列表 API 隐藏敏感信息
   - ✅ JWT 认证保护

3. **文档**:
   - ✅ API 文档
   - ✅ 使用指南
   - ✅ 常见仓库配置
   - ✅ 故障排除

### 📖 相关文档

- **API 文档**: `http://your-domain.com/docs`
- **Swagger JSON**: `http://your-domain.com/docs.json`

---

**文档版本**: v1.0  
**更新时间**: 2025-10-21  
**适用版本**: Deploy Webhook v1.2.0+

