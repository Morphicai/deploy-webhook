import { Router } from 'express';
import { DeployWebhookMCPServer } from '../mcp/server';
import { HttpServerTransport } from '../mcp/transport/http';
import { requireAnyAuth } from '../middleware/apiKeyAuth';
import crypto from 'crypto';

const router: Router = Router();

console.log('[MCP] Streamable HTTP mode enabled (single endpoint)');

type SessionRecord = {
  id: string;
  server: DeployWebhookMCPServer;
  transport: HttpServerTransport;
  createdAt: number;
  lastUsedAt: number;
};

const sessions = new Map<string, SessionRecord>();

const SUPPORTED_PROTOCOL_VERSIONS = new Set([ '2025-06-18', '2025-03-26' ]);

function pickProtocolVersion(req: any): string | null {
  const header = req.header('MCP-Protocol-Version');
  if (!header) return '2025-03-26';
  if (SUPPORTED_PROTOCOL_VERSIONS.has(header)) return header;
  return null;
}

function validateOrigin(originHeader: string | undefined): boolean {
  const allowAny = process.env.MCP_ALLOW_ANY_ORIGIN === 'true';
  if (allowAny) return true;
  const allowed = (process.env.MCP_ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (allowed.length === 0) return true; // no policy configured => allow
  if (!originHeader) return true; // non-browser or no origin
  return allowed.includes(originHeader);
}

function getSession(id: string | undefined): SessionRecord | undefined {
  if (!id) return undefined;
  const rec = sessions.get(id);
  if (rec) rec.lastUsedAt = Date.now();
  return rec;
}

function createSession(): SessionRecord {
  const id = crypto.randomUUID();
  const server = new DeployWebhookMCPServer();
  const transport = new HttpServerTransport();
  server.getServer().connect(transport).catch(err => {
    console.error('[MCP] Failed to connect transport for session', id, err);
  });
  const now = Date.now();
  const rec: SessionRecord = { id, server, transport, createdAt: now, lastUsedAt: now };
  sessions.set(id, rec);
  return rec;
}

// New single MCP endpoint per Streamable HTTP
router.get('/', requireAnyAuth, (req, res) => {
  // We do not offer a server-initiated SSE stream in this minimal implementation
  res.setHeader('Allow', 'POST, DELETE');
  res.status(405).json({ error: 'Method Not Allowed' });
});

router.delete('/', requireAnyAuth, async (req, res) => {
  const sessionId = req.header('Mcp-Session-Id') || req.header('MCP-Session-Id');
  const rec = getSession(sessionId || undefined);
  if (!rec) return res.status(405).json({ error: 'Method Not Allowed' });
  try {
    await rec.transport.close();
  } finally {
    sessions.delete(rec.id);
  }
  res.status(204).end();
});

router.post('/', requireAnyAuth, async (req, res) => {
  if (!validateOrigin(req.header('origin') || req.header('Origin'))) {
    return res.status(403).json({ error: 'Forbidden origin' });
  }

  const protocol = pickProtocolVersion(req);
  if (!protocol) {
    return res.status(400).json({ error: 'Unsupported MCP protocol version' });
  }
  res.setHeader('MCP-Protocol-Version', protocol);

  const message = req.body;

  // Notification or response from client => 202 Accepted, no body
  const isRequest = typeof message?.method === 'string';
  const hasId = message && Object.prototype.hasOwnProperty.call(message, 'id') && message.id !== null && message.id !== undefined;
  if (!isRequest) {
    // route to session if provided, otherwise ignore
    const sessionId = req.header('Mcp-Session-Id') || req.header('MCP-Session-Id') || '';
    const rec = getSession(sessionId || undefined);
    if (rec) {
      try { await rec.transport.handleRequest(message); } catch {}
    }
    return res.status(202).end();
  }

  // Initialize flow creates a new session when header is absent
  const method = message.method as string;
  if (method === 'initialize') {
    const rec = createSession();
    try {
      const response = await rec.transport.handleRequest(message);
      res.setHeader('Mcp-Session-Id', rec.id);
      res.type('application/json').status(200).send(response);
    } catch (err: any) {
      console.error('[MCP] initialize failed', err);
      res.status(500).json({ error: err?.message || 'initialize failed' });
    }
    return;
  }

  // Non-initialize requests must include a valid session
  const sessionId = req.header('Mcp-Session-Id') || req.header('MCP-Session-Id');
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing Mcp-Session-Id' });
  }
  const rec = getSession(sessionId);
  if (!rec) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (!hasId) {
    // Notification
    try { await rec.transport.handleRequest(message); } catch {}
    return res.status(202).end();
  }

  try {
    const response = await rec.transport.handleRequest(message);
    res.type('application/json').status(200).send(response);
  } catch (err: any) {
    console.error('[MCP] request failed', err);
    res.status(500).json({ error: err?.message || 'request failed' });
  }
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
    transport: ['http'],
    description: 'Model Context Protocol server for Deploy Webhook system',
    capabilities: {
      tools: true,
      resources: false,
      prompts: false,
    },
    endpoints: {
      mcp: '/api/mcp',
    },
    documentation: 'https://github.com/your-repo/deploy-webhook#mcp-integration',
  });
});

export default router;

