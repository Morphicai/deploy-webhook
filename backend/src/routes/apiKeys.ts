import { Router } from 'express';
import { requireAdmin } from '../middleware/adminAuth';
import {
  listAPIKeys,
  getAPIKeyById,
  createAPIKey,
  updateAPIKey,
  deleteAPIKey,
  type APIKeyPermission,
} from '../services/apiKeyStore';

const router = Router();

/**
 * @swagger
 * /api/api-keys:
 *   get:
 *     summary: Get all API keys
 *     tags: [API Keys]
 *     security:
 *       - AdminToken: []
 *     responses:
 *       200:
 *         description: API keys retrieved successfully
 */
router.get('/', requireAdmin, (req, res) => {
  try {
    const apiKeys = listAPIKeys();
    res.json({ data: apiKeys });
  } catch (error: any) {
    console.error('[api-keys] Error listing API keys:', error);
    res.status(500).json({ error: error.message || 'Failed to list API keys' });
  }
});

/**
 * @swagger
 * /api/api-keys/{id}:
 *   get:
 *     summary: Get API key by ID
 *     tags: [API Keys]
 *     security:
 *       - AdminToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: API key retrieved successfully
 *       404:
 *         description: API key not found
 */
router.get('/:id', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const apiKey = getAPIKeyById(id);

    if (!apiKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json({ data: apiKey });
  } catch (error: any) {
    console.error('[api-keys] Error getting API key:', error);
    res.status(500).json({ error: error.message || 'Failed to get API key' });
  }
});

/**
 * @swagger
 * /api/api-keys:
 *   post:
 *     summary: Create a new API key
 *     tags: [API Keys]
 *     security:
 *       - AdminToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               permission:
 *                 type: string
 *                 enum: [full, readonly, deploy]
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: API key created successfully
 */
router.post('/', requireAdmin, (req, res) => {
  try {
    const { name, description, permission, expiresAt } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (permission && !['full', 'readonly', 'deploy'].includes(permission)) {
      return res.status(400).json({ error: 'Invalid permission type' });
    }

    console.log('[api-keys] Creating API key:', name);

    const result = createAPIKey({
      name,
      description,
      permission: permission as APIKeyPermission,
      expiresAt,
    });

    console.log('[api-keys] API key created successfully:', result.apiKey.id);

    // Return the plain key only once
    res.status(201).json({
      data: result.apiKey,
      plainKey: result.plainKey,
      message: 'API key created successfully. Please save this key, it will not be shown again.',
    });
  } catch (error: any) {
    console.error('[api-keys] Error creating API key:', error);
    res.status(500).json({ error: error.message || 'Failed to create API key' });
  }
});

/**
 * @swagger
 * /api/api-keys/{id}:
 *   put:
 *     summary: Update an API key
 *     tags: [API Keys]
 *     security:
 *       - AdminToken: []
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
 *               permission:
 *                 type: string
 *                 enum: [full, readonly, deploy]
 *               enabled:
 *                 type: boolean
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: API key updated successfully
 */
router.put('/:id', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updates = req.body;

    if (updates.permission && !['full', 'readonly', 'deploy'].includes(updates.permission)) {
      return res.status(400).json({ error: 'Invalid permission type' });
    }

    console.log('[api-keys] Updating API key:', id);

    const updated = updateAPIKey(id, updates);

    console.log('[api-keys] API key updated successfully:', id);
    res.json({ data: updated, message: 'API key updated successfully' });
  } catch (error: any) {
    console.error('[api-keys] Error updating API key:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: error.message || 'Failed to update API key' });
  }
});

/**
 * @swagger
 * /api/api-keys/{id}:
 *   delete:
 *     summary: Delete an API key
 *     tags: [API Keys]
 *     security:
 *       - AdminToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: API key deleted successfully
 */
router.delete('/:id', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    console.log('[api-keys] Deleting API key:', id);

    deleteAPIKey(id);

    console.log('[api-keys] API key deleted successfully:', id);
    res.json({ message: 'API key deleted successfully' });
  } catch (error: any) {
    console.error('[api-keys] Error deleting API key:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: error.message || 'Failed to delete API key' });
  }
});

export default router;

