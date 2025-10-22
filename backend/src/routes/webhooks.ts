import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { buildErrorResponse } from '../utils/errors';
import { requireAdmin } from '../middleware/adminAuth';
import {
  listWebhooks,
  getWebhookById,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  recordWebhookTrigger,
  getWebhookByType,
  WebhookType,
} from '../services/webhookStore';

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
    // 从数据库获取 Infisical webhook 配置
    const webhook = getWebhookByType('infisical');
    
    if (!webhook) {
      console.warn('[Infisical Webhook] No Infisical webhook configured in database');
      // 回退到环境变量
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
    } else {
      // 使用数据库中的配置验证签名
      const signature = req.headers['x-infisical-signature'] as string;
      if (!signature) {
        return res.status(401).json({ 
          success: false, 
          error: 'Missing x-infisical-signature header' 
        });
      }

      const payload = JSON.stringify(req.body);
      const isValid = verifyInfisicalWebhook(payload, signature, webhook.secret);
      
      if (!isValid) {
        console.error('[Infisical Webhook] Invalid signature');
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid webhook signature' 
        });
      }

      // 记录触发
      recordWebhookTrigger(webhook.id);
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

/**
 * @openapi
 * /webhooks:
 *   get:
 *     tags:
 *       - Webhooks
 *     summary: List all webhooks
 *     description: Get a list of all configured webhooks
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: List of webhooks
 */
router.get('/', requireAdmin, (req: Request, res: Response) => {
  try {
    const webhooks = listWebhooks();
    res.json({
      success: true,
      data: webhooks,
    });
  } catch (error) {
    console.error('[Webhooks] Error listing webhooks:', error);
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

/**
 * @openapi
 * /webhooks/{id}:
 *   get:
 *     tags:
 *       - Webhooks
 *     summary: Get webhook by ID
 *     description: Get details of a specific webhook
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Webhook details
 *       '404':
 *         description: Webhook not found
 */
router.get('/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const webhook = getWebhookById(id);
    
    if (!webhook) {
      return res.status(404).json({
        success: false,
        error: 'Webhook not found',
      });
    }

    res.json({
      success: true,
      data: webhook,
    });
  } catch (error) {
    console.error('[Webhooks] Error getting webhook:', error);
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

/**
 * @openapi
 * /webhooks:
 *   post:
 *     tags:
 *       - Webhooks
 *     summary: Create a new webhook
 *     description: Create a new webhook configuration
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [infisical]
 *               description:
 *                 type: string
 *               secret:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Webhook created successfully
 */
router.post('/', requireAdmin, (req: Request, res: Response) => {
  try {
    const { name, type, description, secret } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        error: 'Name and type are required',
      });
    }

    if (!['infisical'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid webhook type. Supported types: infisical',
      });
    }

    const webhook = createWebhook({
      name,
      type: type as WebhookType,
      description,
      secret,
    });

    res.json({
      success: true,
      data: webhook,
      message: 'Webhook created successfully',
    });
  } catch (error: any) {
    console.error('[Webhooks] Error creating webhook:', error);
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

/**
 * @openapi
 * /webhooks/{id}:
 *   put:
 *     tags:
 *       - Webhooks
 *     summary: Update a webhook
 *     description: Update webhook configuration
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               enabled:
 *                 type: boolean
 *               secret:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Webhook updated successfully
 *       '404':
 *         description: Webhook not found
 */
router.put('/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, description, enabled, secret } = req.body;

    const webhook = updateWebhook(id, {
      name,
      description,
      enabled,
      secret,
    });

    res.json({
      success: true,
      data: webhook,
      message: 'Webhook updated successfully',
    });
  } catch (error: any) {
    console.error('[Webhooks] Error updating webhook:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

/**
 * @openapi
 * /webhooks/{id}:
 *   delete:
 *     tags:
 *       - Webhooks
 *     summary: Delete a webhook
 *     description: Delete a webhook configuration
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Webhook deleted successfully
 *       '404':
 *         description: Webhook not found
 */
router.delete('/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    deleteWebhook(id);

    res.json({
      success: true,
      message: 'Webhook deleted successfully',
    });
  } catch (error: any) {
    console.error('[Webhooks] Error deleting webhook:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

export default router;

