# AI Assistant 使用指南

## 🤖 功能概述

Deploy Webhook 系统内置了 AI 助手功能，可以帮助你：
- 理解系统功能和使用方法
- 配置应用和域名
- 设置 Caddy 反向代理
- 管理 Docker 容器
- 排查部署问题
- 回答技术问题

## 📋 前置要求

在使用 AI 助手之前，需要配置 OpenAI API：

1. 获取 OpenAI API Key
2. 在系统设置中配置 API 信息

## ⚙️ 配置步骤

### 1. 获取 OpenAI API Key

**选项 A：使用 OpenAI 官方 API**
1. 访问 [OpenAI Platform](https://platform.openai.com/)
2. 注册/登录账号
3. 前往 [API Keys](https://platform.openai.com/api-keys)
4. 点击 "Create new secret key"
5. 复制生成的 API Key（格式：`sk-...`）

**选项 B：使用兼容 API（如 Azure OpenAI）**
1. 获取你的 API Key
2. 获取 API Base URL

### 2. 配置系统设置

1. 登录 Deploy Webhook 管理后台
2. 点击侧边栏的 "Settings"
3. 找到 "AI Assistant Configuration" 部分
4. 填写配置信息：
   - **OpenAI API Key**: 输入你的 API Key
   - **Base URL**: 默认为 `https://api.openai.com/v1`
     - OpenAI 官方：`https://api.openai.com/v1`
     - Azure OpenAI：`https://YOUR-RESOURCE.openai.azure.com/openai/deployments/YOUR-DEPLOYMENT`
     - 其他兼容 API：根据服务商提供的 URL
5. 点击 "Save OpenAI Configuration"
6. 看到 "✓ API Key is configured" 表示配置成功

## 💬 使用 AI 助手

### 打开对话窗口

在任何页面的右下角，你会看到一个蓝色的圆形按钮（带有机器人图标）：
- 点击按钮打开 AI 对话窗口
- 窗口会显示在页面右下角

### 与 AI 对话

1. 在输入框中输入你的问题
2. 按 Enter 发送消息（Shift+Enter 换行）
3. AI 会在几秒内回复你的问题

### 对话窗口功能

- **最小化**：点击 `-` 按钮，窗口会最小化到工具栏
- **关闭**：点击 `X` 按钮，关闭对话窗口（会清空聊天记录）
- **滚动查看**：对话框支持滚动查看历史消息

## 📝 使用示例

### 示例 1：询问如何部署应用

```
你：如何部署一个 Docker 应用？

AI：要部署 Docker 应用，你可以按照以下步骤：

1. 前往 "Applications" 页面
2. 点击 "Add Application" 按钮
3. 填写应用信息：
   - Name：应用名称
   - Image：Docker 镜像名称
   - Version：镜像版本（默认 latest）
   - Ports：端口映射配置
   - Environment Variables：环境变量（可选）
4. 点击 "Create" 创建应用
5. 在应用列表中点击 "Deploy" 开始部署

需要更详细的帮助吗？
```

### 示例 2：询问配置问题

```
你：如何配置 Caddy 反向代理？

AI：配置 Caddy 反向代理有两种方式：

方式 1：通过域名管理
1. 前往 "Settings" 页面
2. 配置域名：
   - Domain Name：你的域名
   - Target URL：目标地址（如 http://localhost:8001）
   - Caddy Config：高级配置（可选）
3. 系统会自动生成 Caddyfile 并重载 Caddy

方式 2：手动配置
1. 编辑 Caddyfile 文件
2. 使用 Caddy API 重载配置

建议使用方式 1，更加简单和安全。
```

### 示例 3：故障排查

```
你：我的应用部署失败了，错误信息是 401 authentication required

AI：401 错误通常表示 Docker 镜像仓库认证失败。请检查：

1. 确认镜像仓库配置：
   - 前往 Settings → Repositories
   - 检查仓库的认证信息（用户名/密码或 Token）

2. 验证镜像访问权限：
   - 确认你的账号有权限拉取该镜像
   - 如果是私有镜像，确保已配置正确的认证

3. 检查镜像白名单：
   - 前往 Settings → Image Whitelist
   - 确认你的镜像在白名单中

需要我帮你排查具体的哪个步骤吗？
```

## ⚠️ 注意事项

### API 使用成本

- OpenAI API 按使用量计费
- 每次对话会消耗 tokens（输入 + 输出）
- 建议定期检查 OpenAI 账单
- 可以设置使用限额

### 数据隐私

- AI 助手不会存储你的对话历史
- 每次打开新窗口都是全新对话
- OpenAI 会接收你的问题内容（用于生成回答）
- 不建议在对话中包含敏感信息（如密码、密钥）

### 使用限制

- 单次对话最多 1000 tokens 回复
- 受 OpenAI API 速率限制约束
- 网络不稳定可能导致响应延迟

## 🔧 故障排查

### AI 助手按钮不显示

**可能原因**：
- 未登录系统
- 浏览器兼容性问题

**解决方案**：
1. 确认已登录
2. 刷新页面
3. 尝试不同浏览器

### 发送消息后没有响应

**可能原因**：
- OpenAI API Key 未配置
- API Key 无效或过期
- 网络连接问题
- API 服务暂时不可用

**解决方案**：
1. 检查 Settings 中的 API 配置
2. 验证 API Key 是否有效
3. 查看浏览器控制台是否有错误
4. 检查网络连接

### 收到错误消息

**常见错误及解决方案**：

1. **"OpenAI API Key not configured"**
   - 前往 Settings 配置 API Key

2. **"HTTP 401: Unauthorized"**
   - API Key 无效，请重新配置

3. **"HTTP 429: Rate limit exceeded"**
   - API 调用频率过高，稍后再试
   - 或升级 OpenAI 账户套餐

4. **"Failed to communicate with OpenAI API"**
   - 网络问题，检查连接
   - 或 Base URL 配置错误

## 💡 最佳实践

### 1. 提问技巧

**✅ 好的提问方式**：
- "如何配置应用的环境变量？"
- "部署时出现 'image not found' 错误怎么办？"
- "域名配置中的 targetUrl 是什么意思？"

**❌ 不好的提问方式**：
- "不行"（太模糊）
- "帮我修复"（没有上下文）
- "这个怎么办"（指代不明）

### 2. 分步骤提问

对于复杂问题，分步骤提问效果更好：

```
第一步：什么是镜像白名单？
第二步：如何添加白名单规则？
第三步：通配符怎么用？
```

### 3. 提供上下文

包含必要的上下文信息：

```
我在部署一个 nginx 镜像，镜像名称是 nginx:1.25-alpine，
部署时报错 "connection refused"，应该如何排查？
```

## 🔐 安全建议

1. **保护 API Key**
   - 不要在公开场合分享
   - 定期轮换 API Key
   - 设置使用限额

2. **避免敏感信息**
   - 不要在对话中包含密码
   - 不要包含完整的 Token
   - 不要包含私人信息

3. **使用专用账户**
   - 为生产环境创建专用的 OpenAI 账户
   - 设置合理的使用限额
   - 启用账单提醒

## 📚 相关文档

- [OpenAI API 文档](https://platform.openai.com/docs)
- [Deploy Webhook 用户指南](./README.md)
- [域名管理指南](./DOMAIN_MANAGEMENT.md)
- [Caddy 配置指南](./CADDY_DEPLOYMENT.md)

---

**享受 AI 助手带来的便利！** 🎉

如有问题或建议，欢迎反馈。

