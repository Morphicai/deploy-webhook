import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { deployTools } from './tools/deploy';
import { applicationTools } from './tools/applications';
import { domainTools } from './tools/domains';
import { caddyTools } from './tools/caddy';

/**
 * Deploy Webhook MCP Server
 * 
 * Provides tools for automated deployment, application management,
 * domain configuration, and Caddy reverse proxy management.
 */
export class DeployWebhookMCPServer {
  private server: Server;
  private tools: Map<string, Tool & { handler: (args: any) => Promise<any> }>;

  constructor() {
    console.log('[MCP Server] Initializing Deploy Webhook MCP Server...');
    
    this.server = new Server(
      {
        name: 'deploy-webhook-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    console.log('[MCP Server] Server instance created');

    this.tools = new Map();
    console.log('[MCP Server] Registering tools...');
    this.registerTools();
    console.log('[MCP Server] Setting up handlers...');
    this.setupHandlers();
    console.log('[MCP Server] ✅ Initialization complete');
  }

  /**
   * Register all available tools
   */
  private registerTools() {
    // Deploy tools
    for (const tool of deployTools) {
      this.tools.set(tool.name, tool);
    }

    // Application management tools
    for (const tool of applicationTools) {
      this.tools.set(tool.name, tool);
    }

    // Domain management tools
    for (const tool of domainTools) {
      this.tools.set(tool.name, tool);
    }

    // Caddy management tools
    for (const tool of caddyTools) {
      this.tools.set(tool.name, tool);
    }

    console.log(`[MCP] Registered ${this.tools.size} tools`);
  }

  /**
   * Setup request handlers
   */
  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.log('[MCP Server] 📋 ListTools request received');
      console.log(`[MCP Server] Available tools count: ${this.tools.size}`);
      
      const tools = Array.from(this.tools.values()).map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));

      console.log('[MCP Server] Tool names:', tools.map(t => t.name).join(', '));
      console.log('[MCP Server] ✅ Returning tools list');

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      console.log(`[MCP Server] 🔧 Tool call received: ${name}`);
      console.log(`[MCP Server] Arguments:`, JSON.stringify(args, null, 2));

      const tool = this.tools.get(name);
      if (!tool) {
        console.error(`[MCP Server] ❌ Unknown tool: ${name}`);
        console.error(`[MCP Server] Available tools:`, Array.from(this.tools.keys()).join(', '));
        throw new Error(`Unknown tool: ${name}`);
      }

      try {
        console.log(`[MCP Server] 🚀 Executing tool: ${name}`);
        const result = await tool.handler(args || {});
        console.log(`[MCP Server] ✅ Tool execution successful: ${name}`);
        console.log(`[MCP Server] Result:`, JSON.stringify(result, null, 2));
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        console.error(`[MCP Server] ❌ Tool execution error for ${name}:`, error);
        console.error(`[MCP Server] Error stack:`, error.stack);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: error.message || 'Tool execution failed',
                details: error.stack,
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });
    
    console.log('[MCP Server] ✅ Request handlers registered');
  }

  /**
   * Start the MCP server with stdio transport
   */
  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('[MCP] Server started on stdio transport');
  }

  /**
   * Get the underlying server instance (for SSE transport)
   */
  getServer(): Server {
    return this.server;
  }
}

// Start server if running directly
if (require.main === module) {
  const server = new DeployWebhookMCPServer();
  server.start().catch(console.error);
}

