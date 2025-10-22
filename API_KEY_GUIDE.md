# API Key 使用指南

## 📖 简介

API Key 是一种用于程序化访问 Deploy Webhook 系统的认证方式。通过 API Key，您可以在 CI/CD 流程、自动化脚本或第三方应用中调用系统 API，实现自动化部署和管理。

## 🔑 什么是 API Key？

API Key 是一个唯一的字符串标识符，格式为 `dw_` 开头加上随机字符。例如：

```
dw_A1B2C3D4E5F6G7H8I9J0K1L2M3N4
```

每个 API Key 都有以下属性：

- **名称**：便于识别的Key名称
- **描述**：Key的用途说明
- **权限级别**：full（完全权限）、readonly（只读）或 deploy（仅部署）
- **状态**：启用或禁用
- **使用统计**：调用次数、最后使用时间和IP

## 🎯 权限类型

### 1. Full Access（完全权限）

**适用场景**：需要完全控制系统的自动化工具

**可访问的API**：
- ✅ 所有应用管理操作（CRUD）
- ✅ 所有域名管理操作
- ✅ 部署操作
- ✅ Caddy 配置管理
- ✅ AI 助手

**示例用途**：
- 完整的CI/CD自动化系统
- 管理面板集成
- 自动化运维工具

### 2. Read Only（只读权限）

**适用场景**：监控系统、数据展示应用

**可访问的API**：
- ✅ 查看应用列表和详情
- ✅ 查看域名配置
- ✅ 查看 Caddy 配置
- ✅ AI 助手查询
- ❌ 不能创建、修改或删除任何资源

**示例用途**：
- 监控看板
- 状态页面
- 报告工具

### 3. Deploy Only（仅部署权限）

**适用场景**：专门用于触发部署的系统

**可访问的API**：
- ✅ 触发应用部署
- ✅ 查看应用状态（用于检查部署结果）
- ❌ 不能修改应用配置
- ❌ 不能管理域名和其他资源

**示例用途**：
- GitHub Actions 部署
- Jenkins 集成
- GitLab CI/CD

## 📝 创建 API Key

### 通过 Web 界面创建

1. 登录管理后台
2. 点击侧边栏的 **API Keys**
3. 点击 **Create API Key** 按钮
4. 填写以下信息：
   - **Name**（必填）：例如 "Production CI/CD"
   - **Description**（可选）：例如 "GitHub Actions deployment key"
   - **Permission**（必填）：选择权限级别
5. 点击 **Create API Key**
6. **重要**：立即复制显示的 API Key，这是唯一一次可以看到完整 Key 的机会

### 安全提示

⚠️ **创建后请立即保存 API Key**
- API Key 只在创建时显示一次
- 系统中只存储加密后的哈希值
- 如果丢失，需要删除旧 Key 并创建新 Key

## 🔒 使用 API Key

### 方式 1：通过 X-API-Key Header

```bash
curl -X GET \
  -H "X-API-Key: dw_YOUR_API_KEY_HERE" \
  https://your-domain.com/api/applications
```

### 方式 2：通过 Authorization Bearer

```bash
curl -X GET \
  -H "Authorization: Bearer dw_YOUR_API_KEY_HERE" \
  https://your-domain.com/api/applications
```

## 💡 使用示例

### 示例 1：GitHub Actions 自动部署

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Deployment
        run: |
          curl -X POST \
            -H "X-API-Key: ${{ secrets.DEPLOY_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{
              "image": "myapp/backend",
              "version": "${{ github.sha }}",
              "port": 3000,
              "containerPort": 3000
            }' \
            https://your-domain.com/deploy
```

**配置步骤**：
1. 在 Deploy Webhook 中创建一个 **Deploy Only** API Key
2. 在 GitHub 仓库中添加 Secret：`DEPLOY_API_KEY`
3. 将 API Key 的值粘贴到 Secret 中

### 示例 2：Node.js 应用集成

```javascript
// deploy-client.js
const axios = require('axios');

const deployClient = axios.create({
  baseURL: 'https://your-domain.com',
  headers: {
    'X-API-Key': process.env.DEPLOY_API_KEY
  }
});

// 触发部署
async function deploy(image, version) {
  try {
    const response = await deployClient.post('/deploy', {
      image,
      version,
      port: 3000,
      containerPort: 3000
    });
    
    console.log('Deployment successful:', response.data);
  } catch (error) {
    console.error('Deployment failed:', error.response?.data || error.message);
  }
}

// 查询应用状态
async function getApplications() {
  try {
    const response = await deployClient.get('/api/applications');
    return response.data;
  } catch (error) {
    console.error('Failed to get applications:', error.response?.data || error.message);
  }
}

// 使用示例
deploy('myapp/backend', 'v1.2.3');
```

### 示例 3：Python 监控脚本

```python
# monitor.py
import requests
import os

API_KEY = os.getenv('DEPLOY_API_KEY')
BASE_URL = 'https://your-domain.com'

headers = {
    'X-API-Key': API_KEY
}

def check_application_health():
    """检查所有应用的健康状态"""
    response = requests.get(f'{BASE_URL}/api/applications', headers=headers)
    
    if response.status_code == 200:
        apps = response.json().get('data', [])
        
        for app in apps:
            name = app['name']
            status = app.get('status', 'unknown')
            
            if status != 'running':
                print(f'⚠️ Alert: Application {name} is {status}')
                send_alert(name, status)
            else:
                print(f'✅ Application {name} is healthy')
    else:
        print(f'Error: {response.status_code} - {response.text}')

def send_alert(app_name, status):
    """发送告警通知（示例）"""
    # 实现您的告警逻辑
    pass

if __name__ == '__main__':
    check_application_health()
```

### 示例 4：Jenkins Pipeline

```groovy
// Jenkinsfile
pipeline {
    agent any
    
    environment {
        DEPLOY_API_KEY = credentials('deploy-api-key')
        DEPLOY_URL = 'https://your-domain.com'
    }
    
    stages {
        stage('Build') {
            steps {
                // 构建镜像
                sh 'docker build -t myapp/backend:${BUILD_NUMBER} .'
                sh 'docker push myapp/backend:${BUILD_NUMBER}'
            }
        }
        
        stage('Deploy') {
            steps {
                script {
                    def response = sh(
                        script: """
                            curl -X POST \
                                -H "X-API-Key: ${DEPLOY_API_KEY}" \
                                -H "Content-Type: application/json" \
                                -d '{
                                    "image": "myapp/backend",
                                    "version": "${BUILD_NUMBER}",
                                    "port": 3000,
                                    "containerPort": 3000
                                }' \
                                ${DEPLOY_URL}/deploy
                        """,
                        returnStdout: true
                    ).trim()
                    
                    echo "Deployment response: ${response}"
                }
            }
        }
    }
}
```

### 示例 5：使用 AI 助手

```bash
# 通过 API 使用 AI 助手
curl -X POST \
  -H "X-API-Key: dw_YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How do I deploy a Docker image with environment variables?",
    "history": []
  }' \
  https://your-domain.com/api/ai/chat
```

## 📊 API Key 管理

### 查看使用统计

在 API Keys 页面，您可以看到每个 Key 的：
- 总调用次数
- 最后使用时间
- 最后使用的 IP 地址
- 创建时间

### 启用/禁用 API Key

如果您怀疑 API Key 可能泄露，可以立即禁用它：

1. 进入 **API Keys** 页面
2. 找到对应的 Key
3. 点击 **Disable** 按钮

禁用的 Key 不会被删除，可以随时重新启用。

### 删除 API Key

删除操作不可撤销，请谨慎操作：

1. 进入 **API Keys** 页面
2. 找到要删除的 Key
3. 点击 **Delete** 按钮
4. 确认删除

## 🔐 安全最佳实践

### 1. 存储安全

**✅ 推荐做法**：
- 使用环境变量存储 API Key
- 使用密钥管理服务（如 AWS Secrets Manager、Azure Key Vault）
- 在 CI/CD 系统中使用加密的 Secrets

**❌ 避免做法**：
- 不要在代码中硬编码 API Key
- 不要提交 API Key 到版本控制系统
- 不要在日志中打印完整的 API Key
- 不要通过明文邮件或即时通讯工具发送 API Key

### 2. 权限最小化原则

- 为每个用途创建独立的 API Key
- 使用最小必要权限
- 示例：
  - GitHub Actions 部署 → Deploy Only
  - 监控看板 → Read Only
  - 管理工具 → Full Access

### 3. 定期轮换

- 建议每 3-6 个月轮换一次 API Key
- 发生安全事件后立即轮换
- 保留旧 Key 的最后使用时间，确认没有活跃使用后再删除

### 4. 监控使用

- 定期检查 API Key 的使用统计
- 注意异常的调用频率或 IP 地址
- 对于生产环境的 Key，设置告警机制

### 5. 网络安全

- 始终通过 HTTPS 传输 API Key
- 考虑使用 IP 白名单（未来功能）
- 在不安全的网络环境中不要使用 API Key

## 🚨 泄露应对

如果您怀疑 API Key 已经泄露：

1. **立即禁用该 Key**
   - 进入 API Keys 页面
   - 禁用或删除可疑的 Key

2. **创建新的 API Key**
   - 生成新的 Key
   - 更新所有使用旧 Key 的服务

3. **审查使用日志**
   - 检查最后使用时间和 IP
   - 确认是否有未授权的访问

4. **更新所有引用**
   - GitHub Secrets
   - CI/CD 配置
   - 环境变量
   - 配置文件

## 📋 API 端点参考

### 可通过 API Key 访问的端点

#### 部署相关
- `POST /deploy` - 触发部署（deploy/full 权限）
- `GET /api/applications` - 查看应用列表（所有权限）
- `GET /api/applications/:id` - 查看应用详情（所有权限）
- `POST /api/applications` - 创建应用（full 权限）
- `PUT /api/applications/:id` - 更新应用（full 权限）
- `DELETE /api/applications/:id` - 删除应用（full 权限）
- `POST /api/applications/:id/start` - 启动应用（full 权限）
- `POST /api/applications/:id/stop` - 停止应用（full 权限）
- `POST /api/applications/:id/restart` - 重启应用（full 权限）
- `POST /api/applications/:id/deploy` - 重新部署应用（deploy/full 权限）

#### 域名相关
- `GET /api/domains` - 查看域名列表（所有权限）
- `GET /api/domains/:id` - 查看域名详情（所有权限）
- `POST /api/domains` - 创建域名（full 权限）
- `PUT /api/domains/:id` - 更新域名（full 权限）
- `DELETE /api/domains/:id` - 删除域名（full 权限）

#### Caddy 相关
- `GET /api/caddy/config` - 查看 Caddy 配置（所有权限）
- `GET /api/caddy/urls` - 查看应用 URLs（所有权限）
- `POST /api/caddy/reload` - 重载 Caddy（full 权限）
- `POST /api/caddy/validate` - 验证 Caddy 配置（full 权限）

#### AI 助手
- `POST /api/ai/chat` - AI 聊天（所有权限）

## 🆘 常见问题

### Q: API Key 忘记了怎么办？
A: API Key 只在创建时显示一次，无法找回。您需要删除旧 Key 并创建新的 Key。

### Q: 可以为一个 API Key 设置多种权限吗？
A: 不可以。每个 API Key 只能有一种权限类型。如果需要不同权限，请创建多个 Key。

### Q: API Key 会过期吗？
A: 目前 API Key 不会自动过期，但我们建议定期手动轮换。未来版本将支持设置过期时间。

### Q: 如何查看 API Key 的使用历史？
A: 在 API Keys 页面可以看到基本的使用统计（调用次数、最后使用时间和 IP）。详细的审计日志功能将在未来版本中提供。

### Q: 可以同时使用多个 API Key 吗？
A: 可以。您可以创建多个 API Key，每个用于不同的用途或环境。

### Q: API Key 和 Admin Token 有什么区别？
A: Admin Token 是系统级别的超级管理员令牌，而 API Key 是用户级别的可管理认证方式，支持不同的权限级别和使用统计。

## 📚 相关文档

- [API 能力梳理](./API_CAPABILITIES.md) - 系统能力和权限详细说明
- [快速开始指南](./QUICKSTART.md) - 系统快速部署指南
- [应用管理文档](./APPLICATION_GUIDE.md) - 应用管理详细说明
- [域名管理文档](./DOMAIN_MANAGEMENT.md) - 域名和反向代理配置

## 💬 获取帮助

如果您在使用 API Key 时遇到问题：

1. 查看本文档的常见问题部分
2. 使用系统内置的 AI 助手（右下角）
3. 检查 API 返回的错误信息
4. 查看系统文档页面

---

**安全提醒**：请妥善保管您的 API Key，不要与他人分享。如有疑问，请联系系统管理员。

