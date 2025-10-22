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

    this.tools = new Map();
    this.registerTools();
    this.setupHandlers();
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
      const tools = Array.from(this.tools.values()).map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      console.log(`[MCP] Tool called: ${name}`, args);

      const tool = this.tools.get(name);
      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }

      try {
        const result = await tool.handler(args || {});
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        console.error(`[MCP] Tool execution error:`, error);
        
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

