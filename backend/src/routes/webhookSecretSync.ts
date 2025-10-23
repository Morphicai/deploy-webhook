import { Router, Request, Response } from 'express';
import { getSecretSyncByWebhookToken } from '../services/secretSyncStore';
import { executeSecretSync } from '../services/secretSyncExecutor';

const router = Router();

/**
 * @openapi
 * /webhooks/sync/{token}:
 *   post:
 *     tags:
 *       - Webhook Secret Sync
 *     summary: Trigger secret sync via webhook
 *     description: Webhook endpoint to trigger a specific secret sync configuration using token authentication
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Webhook token for authentication (64 character hex string)
 *     responses:
 *       '200':
 *         description: Sync executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     syncId:
 *                       type: integer
 *                     syncName:
 *                       type: string
 *                     targetGroupId:
 *                       type: integer
 *                     targetGroupName:
 *                       type: string
 *                     created:
 *                       type: integer
 *                     updated:
 *                       type: integer
 *                     unchanged:
 *                       type: integer
 *                     deleted:
 *                       type: integer
 *                     errors:
 *                       type: array
 *                     duration:
 *                       type: integer
 *                 message:
 *                   type: string
 *       '401':
 *         description: Invalid token or sync is disabled
 *       '500':
 *         description: Sync execution failed
 */
router.post('/:token', async (req: Request, res: Response) => {
  const token = req.params.token;
  
  console.log(`[Webhook] Sync trigger received, token length: ${token.length}`);
  
  try {
    // 通过 token 查找同步配置
    const sync = getSecretSyncByWebhookToken(token);
    
    if (!sync) {
      console.warn(`[Webhook] Invalid token or disabled sync`);
      return res.status(401).json({
        success: false,
        error: 'Invalid webhook token or sync is disabled',
      });
    }
    
    console.log(`[Webhook] Executing sync: ${sync.name} (id=${sync.id})`);
    
    // 执行同步
    const result = await executeSecretSync(sync.id);
    
    if (result.success) {
      res.json({
        success: true,
        data: {
          syncId: result.syncId,
          syncName: result.syncName,
          targetGroupId: result.targetGroupId,
          targetGroupName: result.targetGroupName,
          created: result.created,
          updated: result.updated,
          unchanged: result.unchanged,
          deleted: result.deleted,
          errors: result.errors,
          duration: result.duration,
        },
        message: `Synced ${result.created + result.updated} secrets in ${result.duration}ms`,
      });
    } else {
      res.status(500).json({
        success: false,
        data: result,
        error: 'Sync execution failed',
      });
    }
  } catch (error: any) {
    console.error('[Webhook] Sync execution error:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to execute sync',
    });
  }
});

/**
 * 健康检查
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: 'webhook-secret-sync',
    timestamp: new Date().toISOString(),
  });
});

export default router;

