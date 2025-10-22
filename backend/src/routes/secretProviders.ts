import { Router, type Router as ExpressRouter } from 'express';
import { buildErrorResponse } from '../utils/errors';
import {
  listSecretProviders,
  getSecretProviderById,
  createSecretProvider,
  updateSecretProvider,
  deleteSecretProvider,
  getProviderSyncHistory,
  listEnabledSecretProviders,
  listAutoSyncProviders,
} from '../services/secretProviderStore';
import {
  syncSecretProvider,
  syncAllAutoSyncProviders,
  syncMultipleProviders,
} from '../services/secretSyncService';
import { requireAdmin } from '../middleware/adminAuth';

const router: ExpressRouter = Router();

// 所有秘钥提供者相关的路由都需要管理员权限
router.use(requireAdmin);

/**
 * @openapi
 * /api/secret-providers:
 *   get:
 *     tags:
 *       - Secret Providers
 *     security:
 *       - AdminToken: []
 *     summary: List all secret providers
 *     description: Returns a list of all configured secret providers
 *     parameters:
 *       - in: query
 *         name: enabled
 *         schema:
 *           type: boolean
 *         description: Filter by enabled status
 *       - in: query
 *         name: autoSync
 *         schema:
 *           type: boolean
 *         description: Filter by auto-sync status
 *     responses:
 *       '200':
 *         description: List of secret providers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SecretProvider'
 */
router.get('/', (req, res) => {
  try {
    let providers;
    
    if (req.query.autoSync === 'true') {
      providers = listAutoSyncProviders();
    } else if (req.query.enabled === 'true') {
      providers = listEnabledSecretProviders();
    } else {
      providers = listSecretProviders();
    }
    
    res.json({ success: true, data: providers });
  } catch (error) {
    console.error('[deploy-webhook] Failed to list secret providers:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    });
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

/**
 * @openapi
 * /api/secret-providers/{id}:
 *   get:
 *     tags:
 *       - Secret Providers
 *     security:
 *       - AdminToken: []
 *     summary: Get a secret provider by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Secret provider details
 *       '404':
 *         description: Secret provider not found
 */
router.get('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }
    
    const provider = getSecretProviderById(id);
    if (!provider) {
      return res.status(404).json({ success: false, error: 'Secret provider not found' });
    }
    
    res.json({ success: true, data: provider });
  } catch (error) {
    console.error('[deploy-webhook] Failed to get secret provider:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      providerId: req.params.id,
    });
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

/**
 * @openapi
 * /api/secret-providers:
 *   post:
 *     tags:
 *       - Secret Providers
 *     security:
 *       - AdminToken: []
 *     summary: Create a new secret provider
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SecretProviderCreateRequest'
 *     responses:
 *       '201':
 *         description: Secret provider created
 *       '400':
 *         description: Validation error
 */
router.post('/', async (req, res) => {
  try {
    const created = createSecretProvider(req.body);
    
    // 如果创建时启用了自动同步，立即执行一次同步
    if (created.autoSync && created.enabled) {
      console.log(`[deploy-webhook] Auto-syncing newly created provider: ${created.name}`);
      syncSecretProvider(created.id).catch(error => {
        console.error(`[deploy-webhook] Initial sync failed for provider ${created.name}:`, error);
      });
    }
    
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('[deploy-webhook] Failed to create secret provider:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      providerName: req.body?.name,
      providerType: req.body?.type,
    });
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 400).json(fail);
  }
});

/**
 * @openapi
 * /api/secret-providers/{id}:
 *   put:
 *     tags:
 *       - Secret Providers
 *     security:
 *       - AdminToken: []
 *     summary: Update a secret provider
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
 *             $ref: '#/components/schemas/SecretProviderUpdateRequest'
 *     responses:
 *       '200':
 *         description: Secret provider updated
 *       '400':
 *         description: Validation error
 *       '404':
 *         description: Secret provider not found
 */
router.put('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }
    
    const updated = updateSecretProvider(id, req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[deploy-webhook] Failed to update secret provider:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      providerId: req.params.id,
    });
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 400).json(fail);
  }
});

/**
 * @openapi
 * /api/secret-providers/{id}:
 *   delete:
 *     tags:
 *       - Secret Providers
 *     security:
 *       - AdminToken: []
 *     summary: Delete a secret provider
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Secret provider deleted
 *       '404':
 *         description: Secret provider not found
 */
router.delete('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }
    
    deleteSecretProvider(id);
    res.json({ success: true });
  } catch (error) {
    console.error('[deploy-webhook] Failed to delete secret provider:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      providerId: req.params.id,
    });
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 400).json(fail);
  }
});

/**
 * @openapi
 * /api/secret-providers/{id}/sync:
 *   post:
 *     tags:
 *       - Secret Providers
 *     security:
 *       - AdminToken: []
 *     summary: Manually sync secrets from a provider
 *     description: Triggers a manual synchronization of secrets from the specified provider
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Sync completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/SyncResult'
 *       '400':
 *         description: Invalid request
 *       '404':
 *         description: Secret provider not found
 */
router.post('/:id/sync', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }
    
    console.log(`[deploy-webhook] Manual sync requested for provider id: ${id}`);
    const result = await syncSecretProvider(id);
    
    if (result.success) {
      res.json({ success: true, data: result });
    } else {
      res.status(500).json({ success: false, error: result.error, data: result });
    }
  } catch (error) {
    console.error('[deploy-webhook] Failed to sync secret provider:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      providerId: req.params.id,
    });
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

/**
 * @openapi
 * /api/secret-providers/sync/all:
 *   post:
 *     tags:
 *       - Secret Providers
 *     security:
 *       - AdminToken: []
 *     summary: Sync all auto-sync enabled providers
 *     description: Triggers synchronization for all providers that have auto-sync enabled
 *     responses:
 *       '200':
 *         description: Sync completed for all providers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SyncResult'
 */
router.post('/sync/all', async (req, res) => {
  try {
    console.log('[deploy-webhook] Manual sync all auto-sync providers requested');
    const results = await syncAllAutoSyncProviders();
    
    const allSuccess = results.every(r => r.success);
    res.json({ 
      success: allSuccess, 
      data: results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      }
    });
  } catch (error) {
    console.error('[deploy-webhook] Failed to sync all providers:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    });
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

/**
 * @openapi
 * /api/secret-providers/sync/batch:
 *   post:
 *     tags:
 *       - Secret Providers
 *     security:
 *       - AdminToken: []
 *     summary: Sync multiple providers by IDs
 *     description: Triggers synchronization for specific providers
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               providerIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       '200':
 *         description: Sync completed
 */
router.post('/sync/batch', async (req, res) => {
  try {
    const { providerIds } = req.body;
    
    if (!Array.isArray(providerIds) || providerIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'providerIds must be a non-empty array' 
      });
    }
    
    console.log(`[deploy-webhook] Batch sync requested for ${providerIds.length} provider(s)`);
    const results = await syncMultipleProviders(providerIds);
    
    const allSuccess = results.every(r => r.success);
    res.json({ 
      success: allSuccess, 
      data: results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      }
    });
  } catch (error) {
    console.error('[deploy-webhook] Failed to batch sync providers:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    });
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

/**
 * @openapi
 * /api/secret-providers/{id}/history:
 *   get:
 *     tags:
 *       - Secret Providers
 *     security:
 *       - AdminToken: []
 *     summary: Get sync history for a provider
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       '200':
 *         description: Sync history
 */
router.get('/:id/history', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }
    
    const limit = Number(req.query.limit) || 20;
    const history = getProviderSyncHistory(id, limit);
    
    res.json({ success: true, data: history });
  } catch (error) {
    console.error('[deploy-webhook] Failed to get sync history:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      providerId: req.params.id,
    });
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

export default router;

