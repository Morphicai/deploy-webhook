# MCP (Model Context Protocol) Integration Guide

## 🎯 What is MCP?

**MCP (Model Context Protocol)** is an open protocol developed by Anthropic that enables AI assistants like Claude to connect to external tools and data sources. By exposing Deploy Webhook's capabilities through MCP, you can use natural language to:

- 🚀 Deploy applications automatically
- 📦 Manage application lifecycle (start, stop, restart)
- 🌐 Configure domains and reverse proxy
- ⚙️ Update Caddy configurations
- 🤖 Perform complex deployment workflows through conversation

## 📋 Available Tools

Deploy Webhook MCP Server provides **19 tools** across 4 categories:

### 1. Deployment Tools (1 tool)

#### `deploy_application`
Deploy a Docker application with automatic configuration.

**Example prompts:**
- "Deploy nginx:latest on port 8080"
- "Deploy myapp/backend:v1.2.3 with DATABASE_URL=postgres://..."
- "Deploy redis on port 6379 with password protection"

**Parameters:**
- `image` (required): Docker image name
- `version`: Image tag (default: "latest")
- `port` (required): Host port
- `containerPort` (required): Container port
- `name`: Application name (auto-generated if not provided)
- `env`: Environment variables as object
- `repositoryId`: Docker registry ID (optional)

### 2. Application Management Tools (9 tools)

#### `get_applications`
List all deployed applications with status.

**Example:** "Show me all running applications"

#### `get_application`
Get detailed information about a specific application.

**Example:** "Show details for application 5"

**Parameters:**
- `id` (required): Application ID

#### `create_application`
Create a new application configuration.

**Example:** "Create an application named 'api-backend' using node:18 image"

**Parameters:**
- `name` (required): Application name
- `image` (required): Docker image
- `ports` (required): Array of port mappings
- `tag`: Image tag (default: "latest")
- `description`: Application description
- `env`: Environment variables array
- `repositoryId`: Docker registry ID

#### `update_application`
Update existing application configuration.

**Example:** "Update application 3 to use version 2.0"

#### `delete_application`
Delete an application and stop its container.

**Example:** "Delete application 7"

#### `start_application`
Start a stopped application.

**Example:** "Start application 4"

#### `stop_application`
Stop a running application.

**Example:** "Stop the redis application"

#### `restart_application`
Restart an application.

**Example:** "Restart application 2"

#### `redeploy_application`
Pull latest image and redeploy.

**Example:** "Redeploy application 5 with latest changes"

### 3. Domain Management Tools (5 tools)

#### `get_domains`
List all configured domains.

**Example:** "Show all domains"

#### `get_domain`
Get details for a specific domain.

**Example:** "Show me domain configuration for api.example.com"

#### `create_domain`
Configure a domain with automatic HTTPS.

**Example:** "Set up api.myapp.com to point to application 3"

**Parameters:**
- `domainName` (required): Domain name
- `type` (required): "application" or "custom"
- `applicationId`: Application ID (for type="application")
- `applicationPort`: Specific port to use
- `targetUrl`: Custom target URL (for type="custom")
- `description`: Domain description
- `enabled`: Whether domain is active
- `caddyConfig`: Advanced Caddy settings

#### `update_domain`
Update domain configuration.

**Example:** "Update api.example.com to use application 5"

#### `delete_domain`
Remove a domain configuration.

**Example:** "Delete domain old-api.example.com"

### 4. Caddy Management Tools (3 tools)

#### `get_caddy_config`
View current Caddyfile configuration.

**Example:** "Show me the Caddy configuration"

#### `reload_caddy`
Reload Caddy to apply changes.

**Example:** "Reload Caddy configuration"

#### `get_application_urls`
Get all public URLs for applications.

**Example:** "What URLs are available for my applications?"

## 🔌 Connection Setup

### Using Claude Desktop

1. **Install MCP in Claude Desktop**

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application\ Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "deploy-webhook": {
      "command": "node",
      "args": ["/path/to/deploy-webhook/backend/dist/mcp/server.js"],
      "env": {
        "DATABASE_PATH": "/path/to/deploy-webhook/data/deploy-webhook.db"
      }
    }
  }
}
```

2. **Restart Claude Desktop**

### Using SSE (Server-Sent Events) - Remote Access

For remote or web-based access, use the SSE transport:

**Base URL**: `https://your-domain.com/api/mcp`

**Endpoints:**
- `GET /api/mcp/sse` - Establish SSE connection
- `POST /api/mcp/message` - Send messages
- `GET /api/mcp/info` - Server information

**Authentication:**
Use API Key or Admin Token:

```bash
# Get server info
curl -H "X-API-Key: your-api-key" \
  https://your-domain.com/api/mcp/info

# Establish SSE connection
curl -H "X-API-Key: your-api-key" \
  https://your-domain.com/api/mcp/sse
```

### Using Custom MCP Client

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

const transport = new SSEClientTransport(
  new URL('https://your-domain.com/api/mcp/sse'),
  {
    headers: {
      'X-API-Key': 'your-api-key'
    }
  }
);

const client = new Client({
  name: 'my-client',
  version: '1.0.0',
}, {
  capabilities: {}
});

await client.connect(transport);

// List available tools
const tools = await client.listTools();

// Call a tool
const result = await client.callTool({
  name: 'get_applications',
  arguments: {}
});
```

## 💬 Example Conversations

### Example 1: Deploy a New Application

**You:** "I need to deploy a PostgreSQL database on port 5432"

**Claude:** "I'll deploy PostgreSQL for you."

*Claude calls: `deploy_application`*
```json
{
  "image": "postgres",
  "version": "15",
  "port": 5432,
  "containerPort": 5432,
  "env": {
    "POSTGRES_PASSWORD": "your-secure-password"
  }
}
```

**Claude:** "✅ PostgreSQL has been deployed successfully on port 5432."

### Example 2: Set Up Domain with HTTPS

**You:** "Configure api.myapp.com to point to my backend application (ID 3)"

**Claude:** "I'll set up the domain with automatic HTTPS."

*Claude calls: `create_domain`*
```json
{
  "domainName": "api.myapp.com",
  "type": "application",
  "applicationId": 3
}
```

**Claude:** "✅ Domain api.myapp.com has been configured to point to application 3. HTTPS will be automatically configured by Let's Encrypt."

### Example 3: Complex Workflow

**You:** "I need to deploy a full-stack application:
- Frontend (nginx) on port 3000
- Backend API (node:18) on port 8000 with DATABASE_URL
- Set up www.myapp.com for frontend and api.myapp.com for backend"

**Claude:** "I'll help you deploy the full stack. Let me do this step by step..."

*Claude performs multiple tool calls:*

1. Deploy frontend:
```json
{
  "name": "deploy_application",
  "arguments": {
    "image": "nginx",
    "port": 3000,
    "containerPort": 80,
    "name": "frontend"
  }
}
```

2. Deploy backend:
```json
{
  "name": "deploy_application",
  "arguments": {
    "image": "node",
    "version": "18",
    "port": 8000,
    "containerPort": 8000,
    "name": "backend-api",
    "env": {
      "DATABASE_URL": "postgres://..."
    }
  }
}
```

3. Configure frontend domain:
```json
{
  "name": "create_domain",
  "arguments": {
    "domainName": "www.myapp.com",
    "type": "application",
    "applicationId": 1
  }
}
```

4. Configure API domain:
```json
{
  "name": "create_domain",
  "arguments": {
    "domainName": "api.myapp.com",
    "type": "application",
    "applicationId": 2
  }
}
```

**Claude:** "✅ Your full-stack application is deployed:
- Frontend: https://www.myapp.com (port 3000)
- Backend API: https://api.myapp.com (port 8000)
Both domains are configured with automatic HTTPS."

### Example 4: Application Management

**You:** "My backend application is acting up. Can you restart it?"

**Claude:** "Let me check your applications first..."

*Calls: `get_applications`*

**Claude:** "I found your backend-api application (ID: 2). I'll restart it now."

*Calls: `restart_application` with `id: 2`*

**Claude:** "✅ Backend application restarted successfully. It should be working now."

### Example 5: Monitoring and Troubleshooting

**You:** "Which applications are currently running? Are there any issues?"

**Claude:** "Let me check..."

*Calls: `get_applications`*

**Claude:** "Here's the status of your applications:

1. **frontend** (ID: 1) - ✅ Running
   - nginx:latest
   - Port: 3000
   
2. **backend-api** (ID: 2) - ✅ Running
   - node:18
   - Port: 8000
   
3. **database** (ID: 3) - ⚠️ Stopped
   - postgres:15
   - Port: 5432

Your database appears to be stopped. Would you like me to start it?"

## 🔒 Authentication

All MCP requests require authentication. You can use:

1. **API Key** (Recommended for programmatic access)
   ```bash
   -H "X-API-Key: your-api-key"
   ```

2. **Admin Token**
   ```bash
   -H "X-Admin-Token: your-admin-token"
   ```

3. **JWT Token**
   ```bash
   -H "Authorization: Bearer your-jwt-token"
   ```

## 🛠️ Advanced Usage

### Custom Environment Variables

```
You: "Deploy a Node.js app with custom environment variables:
- NODE_ENV=production
- DATABASE_URL=postgres://db:5432/myapp
- REDIS_URL=redis://cache:6379
- API_KEY=secret123"
```

### Batch Operations

```
You: "I need to restart all applications that are running node:18"
```

Claude will:
1. Call `get_applications` to list all apps
2. Filter for node:18 images
3. Call `restart_application` for each matching app

### Configuration Review

```
You: "Review my Caddy configuration and tell me if there are any issues"
```

Claude will:
1. Call `get_caddy_config` to get current config
2. Analyze the configuration
3. Report any potential issues

## 📊 Tool Call Format

MCP uses JSON-RPC 2.0 format:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "deploy_application",
    "arguments": {
      "image": "nginx",
      "version": "latest",
      "port": 8080,
      "containerPort": 80
    }
  }
}
```

Response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"success\":true,\"containerName\":\"nginx-abc123\"}"
      }
    ]
  }
}
```

## 🎭 Best Practices

1. **Be Specific**: The more details you provide, the better Claude can help
   - ✅ "Deploy nginx:1.24 on port 8080"
   - ❌ "Deploy something"

2. **Provide Context**: Mention application IDs or names
   - ✅ "Restart the backend-api application"
   - ❌ "Restart that app"

3. **Multi-Step Workflows**: Claude can handle complex scenarios
   - "Deploy app, configure domain, and set up SSL"

4. **Error Handling**: Claude will detect and explain errors
   - Failed deployments
   - Port conflicts
   - Missing configurations

5. **Monitoring**: Regularly check application status
   - "Show me all applications"
   - "Are there any stopped applications?"

## 🚨 Troubleshooting

### Connection Issues

**Problem**: "Cannot connect to MCP server"

**Solutions:**
1. Check server is running: `curl https://your-domain.com/api/mcp/info`
2. Verify authentication: Test with valid API key
3. Check network access and firewall rules

### Tool Execution Errors

**Problem**: "Tool execution failed"

**Common Causes:**
1. Invalid parameters (check required fields)
2. Resource not found (wrong ID)
3. Permission issues (check API key permissions)
4. Docker daemon not accessible

### SSE Connection Drops

**Problem**: "SSE connection keeps disconnecting"

**Solutions:**
1. Check nginx/proxy timeout settings
2. Ensure keep-alive is properly configured
3. Verify no aggressive connection limits

## 📚 Related Documentation

- [API Key Guide](./API_KEY_GUIDE.md) - Authentication setup
- [Application Management](./APPLICATION_GUIDE.md) - Application lifecycle
- [Domain Management](./DOMAIN_MANAGEMENT.md) - Domain configuration
- [Caddy Deployment](./CADDY_DEPLOYMENT.md) - Reverse proxy setup

## 🔗 Resources

- [MCP Official Documentation](https://modelcontextprotocol.io)
- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Anthropic Claude](https://www.anthropic.com/claude)

---

**Need Help?** Use the built-in AI assistant in the Deploy Webhook admin panel, or check the documentation for more details.

