# MCP 快速开始指南（SSE 远程连接）

## 🚀 3 分钟快速配置

### 为什么选择 SSE 方式？

✨ **零配置复杂度** - 不需要本地路径、项目构建等技术细节  
🌐 **远程访问** - 从任何地方连接，无需在本地运行服务  
🔄 **自动更新** - 服务器更新后无需重新配置  
🔐 **安全可控** - 通过 API Key 管理访问权限  

---

## 📋 配置步骤

### 第 1 步: 访问 MCP Setup 页面

打开浏览器访问: **http://localhost:3000/mcp-setup**

或者：
1. 登录管理后台
2. 在 Dashboard 点击 **"Setup MCP Integration"** 按钮

### 第 2 步: 创建或选择 API Key

在页面的 "API Key for Authentication" 部分：

**选项 A: 使用现有 Key**
- 从下拉菜单选择一个已有的 API Key

**选项 B: 创建新 Key（推荐）**
1. 在输入框输入名称，如 `MCP Access`
2. 点击 **"Create Key"** 按钮
3. ✅ Key 创建成功！记得点击 "Show" 查看完整的 Key
4. ⚠️ **重要**: 这个 Key 只显示一次，但已经包含在下面的配置中了

### 第 3 步: 复制配置

在 "Configuration (Copy & Paste)" 部分：

1. 点击右上角的 **"Copy"** 按钮
2. ✅ 配置已复制到剪贴板！

配置格式如下（自动生成）：
```json
{
  "mcpServers": {
    "deploy-webhook": {
      "url": "http://localhost:3000/api/mcp/sse?apiKey=dw_your_actual_key_here"
    }
  }
}
```

**就这么简单！** 只需要：
- ✅ 一个 URL（包含服务器地址和 API Key）
- ✅ **新特性**: API Key 在 URL 中，兼容性最佳！

### 第 4 步: 配置 AI 客户端

#### macOS 用户

```bash
# 1. 打开配置文件夹
open ~/Library/Application\ Support/Claude/

# 2. 编辑或创建 claude_desktop_config.json
# 3. 粘贴刚才复制的配置
# 4. 保存文件

# 5. 完全退出 Claude Desktop
# 按 Cmd+Q（不是关闭窗口）

# 6. 重新打开 Claude Desktop
```

#### Windows 用户

```powershell
# 1. 打开配置文件夹
explorer %APPDATA%\Claude\

# 2. 编辑或创建 claude_desktop_config.json
# 3. 粘贴刚才复制的配置
# 4. 保存文件

# 5. 完全退出 Claude Desktop
# 按 Alt+F4

# 6. 重新打开 Claude Desktop
```

#### Linux 用户

```bash
# 1. 打开配置文件夹
xdg-open ~/.config/Claude/

# 2. 编辑或创建 claude_desktop_config.json
# 3. 粘贴刚才复制的配置
# 4. 保存文件

# 5. 完全退出并重新打开 Claude Desktop
```

### 第 5 步: 测试连接

在 Claude Desktop 中输入：

```
"显示所有已部署的应用"
```

如果 Claude 能够列出应用，说明配置成功！🎉

---

## 💬 示例对话

### 部署应用

```
你: "帮我部署 nginx:alpine 到 8080 端口"

Claude: [通过 MCP SSE 连接到服务器]
✅ nginx:alpine 已成功部署！
- 容器名: nginx-xxx
- 端口映射: 8080 → 80
- 状态: Running
- 访问: http://localhost:8080
```

### 管理应用

```
你: "列出所有应用，然后重启 nginx"

Claude: 
当前有 3 个应用：
1. nginx (nginx:alpine) - Running
2. backend-api (node:18) - Running  
3. redis (redis:7) - Running

正在重启 nginx...
✅ nginx 已重启成功！
```

### 配置域名

```
你: "为 nginx 配置域名 www.example.com，启用 HTTPS"

Claude:
✅ 域名配置完成！
- 域名: www.example.com
- 目标: http://localhost:8080
- HTTPS: 自动启用（Let's Encrypt）
- Caddy 已自动重载配置
```

---

## 🆚 对比：SSE vs 本地 stdio

| 特性 | SSE 远程连接 ⭐ | 本地 stdio |
|-----|----------------|------------|
| **配置复杂度** | 简单（2 个字段） | 复杂（路径、环境变量等） |
| **需要本地项目** | ❌ 不需要 | ✅ 需要 |
| **需要构建** | ❌ 不需要 | ✅ 需要 `npm run build` |
| **远程访问** | ✅ 支持 | ❌ 不支持 |
| **配置更新** | ✅ 自动（服务器端） | ❌ 需要重新构建 |
| **权限控制** | ✅ API Key 管理 | ❌ 本地全权限 |
| **适用场景** | 生产环境、远程管理 | 本地开发 |

**推荐使用 SSE 方式！** ⭐

---

## 🐛 常见问题

### 问题 1: "MCP 服务器未显示"

**检查清单：**
- [ ] 配置文件格式正确（valid JSON）
- [ ] API Key 有效且已启用
- [ ] 已**完全重启** Claude Desktop（Cmd+Q / Alt+F4）

**解决方案：**
```bash
# 验证配置文件
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | jq

# 如果报错，说明 JSON 格式有问题
```

### 问题 2: "连接错误"

**可能原因：**
- ❌ 服务器未运行
- ❌ 网络连接问题
- ❌ API Key 无效

**解决方案：**
1. 确认服务器运行中：
   ```bash
   curl http://localhost:3000/api/mcp/info
   ```

2. 测试 API Key：
   ```bash
   curl -H "X-API-Key: your-key" http://localhost:3000/api/mcp/sse
   ```

3. 查看 API Key 状态：
   - 访问 http://localhost:3000/api-keys
   - 确认 Key 状态为 "Enabled"
   - 权限为 "full" 或 "deploy"

### 问题 3: "工具调用失败"

**可能原因：**
- ❌ API Key 权限不足
- ❌ Key 已过期
- ❌ Key 已禁用

**解决方案：**
1. 在 API Keys 页面检查 Key 状态
2. 如需要，创建新的 API Key
3. 更新配置文件中的 Key
4. 重启 Claude Desktop

---

## 🔐 安全建议

### API Key 管理

1. **定期轮换** - 每 30-90 天更换一次 API Key
2. **最小权限** - 如果只需要部署，使用 `deploy` 权限而不是 `full`
3. **监控使用** - 在 API Keys 页面查看使用记录
4. **立即删除** - 如果 Key 泄露，立即禁用或删除

### 生产环境

如果在生产环境使用：

```json
{
  "mcpServers": {
    "deploy-webhook-prod": {
      "url": "https://your-domain.com/api/mcp/sse",
      "headers": {
        "X-API-Key": "dw_production_key_here"
      }
    }
  }
}
```

**建议：**
- ✅ 使用 HTTPS
- ✅ 使用独立的生产环境 API Key
- ✅ 设置 Key 过期时间
- ✅ 启用 IP 白名单（如果需要）

---

## 📊 配置检查清单

在开始使用前，确认：

- [ ] ✅ 服务器正在运行
- [ ] ✅ 已创建 API Key
- [ ] ✅ API Key 权限正确（full 或 deploy）
- [ ] ✅ 配置文件格式正确
- [ ] ✅ 已粘贴配置到 AI 客户端
- [ ] ✅ 已**完全重启** AI 客户端
- [ ] ✅ 测试连接成功

---

## 🎯 下一步

配置完成后，你可以：

### 1. **探索所有功能**

```
"列出所有可用的 MCP 工具"
```

你会看到 19 个工具，包括：
- 📦 部署管理
- 🔧 应用控制  
- 🌐 域名配置
- ⚙️  Caddy 管理

### 2. **自动化部署**

```
"帮我部署 nginx:latest 到 8080 端口，然后配置域名 nginx.local"
```

AI 会自动：
1. 部署 nginx 容器
2. 配置端口映射
3. 创建域名记录
4. 重载 Caddy 配置

### 3. **批量操作**

```
"列出所有应用，重启状态为 Running 的应用"
```

AI 会智能地：
1. 获取应用列表
2. 筛选运行中的应用
3. 依次重启每个应用
4. 报告结果

---

## 📚 更多资源

- **UI 配置页面**: http://localhost:3000/mcp-setup
- **API Keys 管理**: http://localhost:3000/api-keys
- **完整文档**: http://localhost:3000/docs
- **MCP 官方文档**: https://modelcontextprotocol.io

---

## ✨ 总结

使用 SSE 方式配置 MCP，你只需要：

1. ✅ 创建一个 API Key
2. ✅ 复制粘贴配置（**只需 1 个字段** - URL，API Key 已包含在 URL 中）
3. ✅ 重启 AI 客户端

**就这么简单！** 不需要：
- ❌ 配置本地路径
- ❌ 构建项目
- ❌ 管理环境变量
- ❌ 设置 HTTP Headers
- ❌ 处理复杂的技术细节

### 🆕 新特性：URL 参数认证

- **更高兼容性** - 几乎所有 MCP 客户端都支持
- **更简单配置** - 只需一个 `url` 字段
- **更方便测试** - 可直接在浏览器测试
- **向后兼容** - 仍然支持 Header 方式

---

**开始使用吧！** 🚀

访问: http://localhost:3000/mcp-setup
