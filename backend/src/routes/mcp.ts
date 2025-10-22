import { Router } from 'express';
import { DeployWebhookMCPServer } from '../mcp/server';
import { SSEServerTransport, createSSEHandlers } from '../mcp/transport/sse';
import { requireAnyAuth } from '../middleware/apiKeyAuth';

const router: Router = Router();

// Create MCP server instance
const mcpServer = new DeployWebhookMCPServer();
const sseTransport = new SSEServerTransport();

// Connect server to SSE transport
mcpServer.getServer().connect(sseTransport).catch(console.error);

// Create SSE handlers
const { handleSSE, handleMessage } = createSSEHandlers(sseTransport);

/**
 * @swagger
 * /mcp/sse:
 *   get:
 *     summary: Establish MCP SSE connection
 *     tags: [MCP]
 *     security:
 *       - AdminToken: []
 *       - APIKey: []
 *     responses:
 *       200:
 *         description: SSE connection established
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 */
router.get('/sse', requireAnyAuth, handleSSE);

/**
 * @swagger
 * /mcp/message:
 *   post:
 *     summary: Send message to MCP server
 *     tags: [MCP]
 *     security:
 *       - AdminToken: []
 *       - APIKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jsonrpc:
 *                 type: string
 *                 example: "2.0"
 *               method:
 *                 type: string
 *               params:
 *                 type: object
 *               id:
 *                 oneOf:
 *                   - type: string
 *                   - type: number
 *     responses:
 *       200:
 *         description: Message received
 */
router.post('/message', requireAnyAuth, handleMessage);

/**
 * @swagger
 * /mcp/info:
 *   get:
 *     summary: Get MCP server information
 *     tags: [MCP]
 *     responses:
 *       200:
 *         description: MCP server info
 */
router.get('/info', (req, res) => {
  res.json({
    name: 'deploy-webhook-mcp',
    version: '1.0.0',
    protocol: 'mcp',
    transport: ['sse'],
    description: 'Model Context Protocol server for Deploy Webhook system',
    capabilities: {
      tools: true,
      resources: false,
      prompts: false,
    },
    endpoints: {
      sse: '/api/mcp/sse',
      message: '/api/mcp/message',
    },
    documentation: 'https://github.com/your-repo/deploy-webhook#mcp-integration',
  });
});

export default router;

