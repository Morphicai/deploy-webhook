import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middleware/adminAuth';
import {
  listSecretSyncs,
  getSecretSyncById,
  getSecretSyncStats,
  createSecretSync,
  updateSecretSync,
  deleteSecretSync,
  regenerateWebhookToken,
} from '../services/secretSyncStore';
import { executeSecretSync, executeScheduledSyncs } from '../services/secretSyncExecutor';

const router = Router();

/**
 * @openapi
 * /api/secret-syncs:
 *   get:
 *     tags:
 *       - Secret Syncs
 *     summary: List all secret sync configurations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: List of sync configurations
 */
router.get('/', requireAdmin, (req: Request, res: Response) => {
  try {
    const syncs = listSecretSyncs();
    res.json({
      success: true,
      data: syncs,
      total: syncs.length,
    });
  } catch (error: any) {
    console.error('[SecretSync API] List error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list sync configurations',
    });
  }
});

/**
 * @openapi
 * /api/secret-syncs/{id}:
 *   get:
 *     tags:
 *       - Secret Syncs
 *     summary: Get sync configuration by ID
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
 *         description: Sync configuration details
 *       '404':
 *         description: Sync configuration not found
 */
router.get('/:id', requireAdmin, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);

  try {
    const sync = getSecretSyncById(id);
    
    if (!sync) {
      return res.status(404).json({
        success: false,
        error: `Sync configuration with id=${id} not found`,
      });
    }

    res.json({
      success: true,
      data: sync,
    });
  } catch (error: any) {
    console.error('[SecretSync API] Get error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get sync configuration',
    });
  }
});

/**
 * @openapi
 * /api/secret-syncs/{id}/stats:
 *   get:
 *     tags:
 *       - Secret Syncs
 *     summary: Get sync statistics
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
 *         description: Sync statistics
 */
router.get('/:id/stats', requireAdmin, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);

  try {
    const stats = getSecretSyncStats(id);
    
    if (!stats) {
      return res.status(404).json({
        success: false,
        error: `Sync configuration with id=${id} not found`,
      });
    }

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('[SecretSync API] Stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get sync statistics',
    });
  }
});

/**
 * @openapi
 * /api/secret-syncs:
 *   post:
 *     tags:
 *       - Secret Syncs
 *     summary: Create a new sync configuration
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
 *               - sourceType
 *               - sourceConfig
 *               - targetGroupId
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               sourceType:
 *                 type: string
 *                 enum: [infisical]
 *               sourceConfig:
 *                 type: object
 *               targetGroupId:
 *                 type: integer
 *               syncStrategy:
 *                 type: string
 *                 enum: [merge, replace]
 *                 default: merge
 *               syncTrigger:
 *                 type: string
 *                 enum: [manual, webhook, schedule]
 *                 default: manual
 *               enableWebhook:
 *                 type: boolean
 *               scheduleEnabled:
 *                 type: boolean
 *               scheduleInterval:
 *                 type: integer
 *     responses:
 *       '201':
 *         description: Sync configuration created
 */
router.post('/', requireAdmin, (req: Request, res: Response) => {
  try {
    const sync = createSecretSync(req.body);
    
    // 构建 webhook URL（如果启用）
    const baseUrl = process.env.BASE_URL || process.env.PUBLIC_URL;
    const webhookUrl = sync.webhookToken && baseUrl
      ? `${baseUrl}/webhooks/sync/${sync.webhookToken}`
      : undefined;

    res.status(201).json({
      success: true,
      data: {
        ...sync,
        webhookUrl,
      },
      message: 'Sync configuration created successfully',
    });
  } catch (error: any) {
    console.error('[SecretSync API] Create error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create sync configuration',
    });
  }
});

/**
 * @openapi
 * /api/secret-syncs/{id}:
 *   put:
 *     tags:
 *       - Secret Syncs
 *     summary: Update sync configuration
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
 *     responses:
 *       '200':
 *         description: Sync configuration updated
 */
router.put('/:id', requireAdmin, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);

  try {
    const sync = updateSecretSync(id, req.body);
    
    res.json({
      success: true,
      data: sync,
      message: 'Sync configuration updated successfully',
    });
  } catch (error: any) {
    console.error('[SecretSync API] Update error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update sync configuration',
    });
  }
});

/**
 * @openapi
 * /api/secret-syncs/{id}:
 *   delete:
 *     tags:
 *       - Secret Syncs
 *     summary: Delete sync configuration
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
 *         description: Sync configuration deleted
 */
router.delete('/:id', requireAdmin, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);

  try {
    deleteSecretSync(id);
    
    res.json({
      success: true,
      message: 'Sync configuration deleted successfully',
    });
  } catch (error: any) {
    console.error('[SecretSync API] Delete error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to delete sync configuration',
    });
  }
});

/**
 * @openapi
 * /api/secret-syncs/{id}/regenerate-webhook-token:
 *   post:
 *     tags:
 *       - Secret Syncs
 *     summary: Regenerate webhook token
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
 *         description: Token regenerated
 */
router.post('/:id/regenerate-webhook-token', requireAdmin, (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);

  try {
    const newToken = regenerateWebhookToken(id);
    
    const baseUrl = process.env.BASE_URL || process.env.PUBLIC_URL;
    const webhookUrl = baseUrl
      ? `${baseUrl}/webhooks/sync/${newToken}`
      : undefined;

    res.json({
      success: true,
      data: {
        token: newToken,
        webhookUrl,
      },
      message: 'Webhook token regenerated successfully',
    });
  } catch (error: any) {
    console.error('[SecretSync API] Regenerate token error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to regenerate webhook token',
    });
  }
});

/**
 * @openapi
 * /api/secret-syncs/{id}/execute:
 *   post:
 *     tags:
 *       - Secret Syncs
 *     summary: Manually execute sync configuration
 *     description: Trigger a sync execution manually (supports all source types)
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
 *         description: Sync executed successfully
 */
router.post('/:id/execute', requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);

  try {
    console.log(`[SecretSync API] Manual execution triggered for sync ${id}`);
    
    // 统一的执行入口，内部会根据 sourceType 分发
    const result = await executeSecretSync(id);

    if (result.success) {
      res.json({
        success: true,
        data: result,
        message: `Sync executed successfully: ${result.created + result.updated} secrets synced in ${result.duration}ms`,
      });
    } else {
      res.status(500).json({
        success: false,
        data: result,
        error: 'Sync execution failed',
      });
    }
  } catch (error: any) {
    console.error('[SecretSync API] Execute error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to execute sync',
    });
  }
});

/**
 * @openapi
 * /api/secret-syncs/execute-all:
 *   post:
 *     tags:
 *       - Secret Syncs
 *     summary: Execute all scheduled syncs
 *     description: Check and execute all enabled scheduled syncs that are due
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: All scheduled syncs executed
 */
router.post('/execute-all', requireAdmin, async (req: Request, res: Response) => {
  try {
    console.log('[SecretSync API] Execute all scheduled syncs triggered');
    
    const results = await executeScheduledSyncs();

    res.json({
      success: true,
      data: {
        total: results.length,
        results,
      },
      message: `Executed ${results.length} scheduled sync(s)`,
    });
  } catch (error: any) {
    console.error('[SecretSync API] Execute all error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to execute scheduled syncs',
    });
  }
});

/**
 * @openapi
 * /api/secret-syncs/{id}/test-connection:
 *   post:
 *     tags:
 *       - Secret Syncs
 *     summary: Test sync source connection
 *     description: Test connection to the sync source without executing sync
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
 *         description: Connection test successful
 */
router.post('/:id/test-connection', requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);

  try {
    const sync = getSecretSyncById(id);
    if (!sync) {
      return res.status(404).json({
        success: false,
        error: `Sync configuration with id=${id} not found`,
      });
    }

    // 根据 sourceType 测试连接
    let connectionTest;
    
    if (sync.sourceType === 'infisical') {
      const InfisicalSDK = require('@infisical/sdk');
      const client = new InfisicalSDK.default({
        clientId: sync.sourceConfig.clientId,
        clientSecret: sync.sourceConfig.clientSecret,
        siteUrl: sync.sourceConfig.siteUrl,
      });

      const secrets = await client.listSecrets({
        projectId: sync.sourceConfig.projectId,
        environment: sync.sourceConfig.environment,
        path: sync.sourceConfig.path || '/',
      });

      connectionTest = {
        success: true,
        sourceType: 'infisical',
        secretsCount: secrets.length,
      };
    } else {
      return res.status(400).json({
        success: false,
        error: `Connection test not implemented for source type: ${sync.sourceType}`,
      });
    }

    res.json({
      success: true,
      data: connectionTest,
      message: 'Connection test successful',
    });
  } catch (error: any) {
    console.error('[SecretSync API] Test connection error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Connection test failed',
    });
  }
});

export default router;

