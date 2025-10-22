import express, { NextFunction, Request, Response } from 'express';
import morgan from 'morgan';
import { deployConfig } from './config';
import { validateDeployAuth, validateDeployPayload } from './utils/validation';
import { DeployService } from './services/deployService';
import { buildErrorResponse } from './utils/errors';
import { DeployRequest, HealthResponse } from './types';
import docsRouter from './routes/docs';
import envRouter from './routes/env';
import secretRouter from './routes/secrets';
import applicationsRouter from './routes/applications';
import authRouter from './routes/auth';
import webhooksRouter from './routes/webhooks';
import repositoriesRouter from './routes/repositories';
import imageWhitelistRouter from './routes/imageWhitelist';
import caddyRouter from './routes/caddy';
import domainsRouter from './routes/domains';
import settingsRouter from './routes/settings';
import aiChatRouter from './routes/aiChat';
import apiKeysRouter from './routes/apiKeys';
import mcpRouter from './routes/mcp';
import cors from 'cors';
import { swaggerSpec } from './swagger';

const app = express();
const deployService = new DeployService();

// Middleware
app.use(express.json());
if (process.env.NODE_ENV !== 'production') {
  app.use(cors({ origin: '*', credentials: true }));
}
// app.use(morgan('combined', {
//   skip: (req) => req.url === '/health'  // 跳过健康检查端点的日志
// }));

// Admin API routes
app.use('/api/secrets', secretRouter);
app.use('/api/env', envRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/domains', domainsRouter);
app.use('/api/repositories', repositoriesRouter);
app.use('/api/image-whitelist', imageWhitelistRouter);
app.use('/api/caddy', caddyRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/ai', aiChatRouter);
app.use('/api/api-keys', apiKeysRouter);
app.use('/api/mcp', mcpRouter);
app.use('/api/auth', authRouter);
app.use('/docs', docsRouter);
app.get('/docs.json', (_req: Request, res: Response) => {
  res.json(swaggerSpec);
});

// Webhook routes (不需要认证，使用签名验证)
app.use('/webhooks', webhooksRouter);

/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Check service availability
 *     responses:
 *       '200':
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
// Health check endpoint
app.get('/health', (_req: Request, res: Response<HealthResponse>) => {
  res.json({ 
    ok: true, 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * @openapi
 * /deploy:
 *   post:
 *     tags:
 *       - Deployments
 *     summary: Trigger a deployment for the specified image
 *     description: |
 *       Supports two authentication methods:
 *       1. User token (JWT or Admin token) - for authenticated users from admin panel
 *       2. Webhook secret - for external webhook calls
 *     security:
 *       - AdminToken: []
 *       - WebhookSecret: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeployRequest'
 *     responses:
 *       '200':
 *         description: Deployment succeeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeployResponse'
 *       '400':
 *         description: Invalid request payload
 *       '401':
 *         description: Missing or invalid webhook secret
 *       '500':
 *         description: Internal error during deployment
 */
// Deploy endpoint
app.post('/deploy', async (req: Request<{}, any, DeployRequest>, res: Response) => {
  try {
    // 支持两种认证方式：已登录用户（管理后台）或 webhook secret（外部调用）
    const auth = validateDeployAuth(req);
    
    if (!auth.authorized) {
      console.error('[deploy-webhook] Deploy authentication failed:', {
        timestamp: new Date().toISOString(),
        clientIp: req.ip || req.socket.remoteAddress,
        hasUserToken: !!req.header('authorization') || !!req.header('x-admin-token'),
        hasWebhookSecret: !!req.header('x-webhook-secret') || !!(req.body && req.body.secret),
        headerSecretLength: req.header('x-webhook-secret')?.length || 0,
        bodySecretLength: (req.body?.secret as string)?.length || 0,
        configuredSecretLength: (process.env.WEBHOOK_SECRET || '').length,
        requestBody: { name: req.body?.name, repo: req.body?.repo, version: req.body?.version },
      });
      return res.status(401).json({ 
        success: false, 
        code: 401, 
        error: 'Unauthorized: Please provide valid user token or webhook secret' 
      });
    }

    console.log(`[deploy-webhook] Deploy request authenticated via ${auth.authType}`, {
      authType: auth.authType,
      clientIp: req.ip || req.socket.remoteAddress,
    });

    const payload: DeployRequest = {
      name: req.body?.name,
      image: req.body?.image,
      version: req.body?.version,
      repo: req.body?.repo,  // 向后兼容
      port: req.body?.port,
      containerPort: req.body?.containerPort,
      env: req.body?.env,
      repositoryId: req.body?.repositoryId,
    };

    const valid = validateDeployPayload(payload);
    if (!valid.ok) {
      return res.status(400).json({ success: false, code: 400, error: valid.error });
    }

    const result = await deployService.deploy(payload);
    res.status(result.success ? 200 : (result.code ?? 500)).json(result);
  } catch (error) {
    const fail = buildErrorResponse(error);
    const status = fail.code && fail.code >= 400 && fail.code < 600 ? fail.code : 500;
    res.status(status).json(fail);
  }
});

// Global error handler to ensure consistent JSON responses
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const fail = buildErrorResponse(err);
  const status = fail.code && fail.code >= 400 && fail.code < 600 ? fail.code : 500;
  res.status(status).json(fail);
});

// Start server
app.listen(deployConfig.port, () => {
  console.log(`[deploy-webhook] Server listening on port ${deployConfig.port}`);
  console.log(`[deploy-webhook] Infisical Webhook endpoint: /webhooks/infisical`);
});

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
