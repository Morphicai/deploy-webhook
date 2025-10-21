import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { buildErrorResponse } from '../utils/errors';

const router = Router();

/**
 * Infisical Webhook 签名验证
 */
function verifyInfisicalWebhook(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

/**
 * @openapi
 * /webhooks/infisical:
 *   post:
 *     tags:
 *       - Webhooks
 *     summary: Receive Infisical webhook notifications
 *     description: |
 *       Automatically syncs secrets when changes occur in Infisical.
 *       Configure this endpoint in your Infisical project settings.
 *       
 *       Setup in Infisical:
 *       1. Go to Project Settings → Webhooks
 *       2. Add webhook URL: https://your-domain.com/webhooks/infisical
 *       3. Set webhook secret (same as INFISICAL_WEBHOOK_SECRET env var)
 *       4. Select events: secret.created, secret.updated, secret.deleted
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event:
 *                 type: string
 *                 description: Event type (secret.created, secret.updated, secret.deleted)
 *               workspace:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *               environment:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   slug:
 *                     type: string
 *               secretPath:
 *                 type: string
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       '200':
 *         description: Webhook processed successfully
 *       '401':
 *         description: Invalid webhook signature
 */
router.post('/infisical', async (req: Request, res: Response) => {
  try {
    const webhookSecret = process.env.INFISICAL_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.warn('[Infisical Webhook] INFISICAL_WEBHOOK_SECRET not configured, skipping verification');
    } else {
      // 验证签名
      const signature = req.headers['x-infisical-signature'] as string;
      if (!signature) {
        return res.status(401).json({ 
          success: false, 
          error: 'Missing x-infisical-signature header' 
        });
      }

      const payload = JSON.stringify(req.body);
      const isValid = verifyInfisicalWebhook(payload, signature, webhookSecret);
      
      if (!isValid) {
        console.error('[Infisical Webhook] Invalid signature');
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid webhook signature' 
        });
      }
    }

    const { event, workspace, environment, secretPath, timestamp } = req.body;

    console.log('[Infisical Webhook] Received event:', {
      event,
      workspace: workspace?.name || workspace?.id,
      environment: environment?.name || environment?.slug,
      secretPath: secretPath || '/',
      timestamp,
    });

    // 根据事件类型处理
    switch (event) {
      case 'secret.created':
      case 'secret.updated':
      case 'secret.deleted':
        // 记录密钥变更事件
        const projectId = workspace?.id || workspace?.name;
        const envSlug = environment?.slug || environment?.name;
        
        console.log(`[Infisical Webhook] Secret ${event} in project ${projectId}, environment ${envSlug}, path ${secretPath || '/'}`);
        
        // 可选：触发自动重新部署
        const autoRedeploy = process.env.INFISICAL_AUTO_REDEPLOY === 'true';
        if (autoRedeploy) {
          console.log('[Infisical Webhook] Auto-redeploy is enabled (future feature)');
          // TODO: 实现自动重新部署逻辑
          // 1. 查找使用了该 projectId + environment 的应用
          // 2. 触发这些应用的重新部署
        }

        break;

      default:
        console.log(`[Infisical Webhook] Ignoring event type: ${event}`);
    }

    res.json({ 
      success: true, 
      message: 'Webhook processed successfully',
      event,
      action: 'logged'
    });

  } catch (error) {
    console.error('[Infisical Webhook] Error processing webhook:', error);
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

/**
 * @openapi
 * /webhooks/infisical/test:
 *   post:
 *     tags:
 *       - Webhooks
 *     summary: Test Infisical webhook configuration
 *     description: Test endpoint to verify webhook is working correctly
 *     responses:
 *       '200':
 *         description: Test successful
 */
router.post('/infisical/test', (req: Request, res: Response) => {
  console.log('[Infisical Webhook] Test webhook received:', req.body);
  res.json({ 
    success: true, 
    message: 'Test webhook received successfully',
    receivedAt: new Date().toISOString(),
    headers: req.headers,
    body: req.body,
  });
});

export default router;

