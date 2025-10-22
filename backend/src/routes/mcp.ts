import { Router } from 'express';
import { DeployWebhookMCPServer } from '../mcp/server';
import { SSEServerTransport, createSSEHandlers } from '../mcp/transport/sse';
import { requireAnyAuth } from '../middleware/apiKeyAuth';

const router: Router = Router();

console.log('[MCP] Initializing MCP server and SSE transport...');

// Create MCP server instance
const mcpServer = new DeployWebhookMCPServer();
console.log('[MCP] MCP server created successfully');

const sseTransport = new SSEServerTransport();
console.log('[MCP] SSE transport created successfully');

// Connect server to SSE transport
mcpServer.getServer().connect(sseTransport)
  .then(() => {
    console.log('[MCP] ✅ MCP server connected to SSE transport successfully');
  })
  .catch((error) => {
    console.error('[MCP] ❌ Failed to connect MCP server to SSE transport:', error);
  });

// Create SSE handlers
const { handleSSE, handleMessage } = createSSEHandlers(sseTransport);
console.log('[MCP] SSE handlers created successfully');

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
router.get('/sse', requireAnyAuth, (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress;
  console.log(`[MCP SSE] 🔌 New SSE connection request from ${clientIp}`);
  console.log(`[MCP SSE] User-Agent: ${req.headers['user-agent']}`);
  console.log(`[MCP SSE] Auth type: ${(req as any).authType || 'unknown'}`);
  
  handleSSE(req, res);
});

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
router.post('/message', requireAnyAuth, (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress;
  const { method, id } = req.body;
  console.log(`[MCP Message] 📨 Received message from ${clientIp}`);
  console.log(`[MCP Message] Method: ${method}, ID: ${id}`);
  console.log(`[MCP Message] Full body:`, JSON.stringify(req.body, null, 2));
  
  handleMessage(req, res);
});

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

