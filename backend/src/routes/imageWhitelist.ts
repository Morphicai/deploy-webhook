import { Router } from 'express';
import { buildErrorResponse } from '../utils/errors';
import {
  createImageWhitelist,
  deleteImageWhitelist,
  listImageWhitelists,
  updateImageWhitelist,
} from '../services/imageWhitelistStore';
import { requireAdmin } from '../middleware/adminAuth';

const router = Router();

router.use(requireAdmin);

/**
 * @openapi
 * /api/image-whitelist:
 *   get:
 *     tags:
 *       - Image Whitelist
 *     security:
 *       - AdminToken: []
 *     summary: List all image whitelist rules
 *     description: Get all image whitelist configurations
 *     responses:
 *       '200':
 *         description: Successfully retrieved whitelist rules
 */
router.get('/', (_req, res) => {
  try {
    const rules = listImageWhitelists();
    res.json({ success: true, data: rules });
  } catch (error) {
    console.error('[deploy-webhook] Failed to list image whitelist:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    });
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

/**
 * @openapi
 * /api/image-whitelist:
 *   post:
 *     tags:
 *       - Image Whitelist
 *     security:
 *       - AdminToken: []
 *     summary: Create a new whitelist rule
 *     description: Add a new image whitelist rule
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imagePattern
 *             properties:
 *               repositoryId:
 *                 type: number
 *                 nullable: true
 *                 description: Repository ID (null for all repositories)
 *               imagePattern:
 *                 type: string
 *                 description: Image pattern (* for all images, or specific image name)
 *               description:
 *                 type: string
 *                 description: Optional description
 *     responses:
 *       '200':
 *         description: Whitelist rule created successfully
 */
router.post('/', (req, res) => {
  try {
    const rule = createImageWhitelist(req.body);
    console.log('[deploy-webhook] Image whitelist rule created:', {
      timestamp: new Date().toISOString(),
      ruleId: rule.id,
      repositoryId: rule.repositoryId,
      imagePattern: rule.imagePattern,
    });
    res.json({ success: true, data: rule });
  } catch (error) {
    console.error('[deploy-webhook] Failed to create whitelist rule:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      requestBody: req.body,
    });
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 400).json(fail);
  }
});

/**
 * @openapi
 * /api/image-whitelist/{id}:
 *   put:
 *     tags:
 *       - Image Whitelist
 *     security:
 *       - AdminToken: []
 *     summary: Update whitelist rule
 *     description: Update an existing whitelist rule
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
 *               repositoryId:
 *                 type: number
 *                 nullable: true
 *               imagePattern:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Whitelist rule updated successfully
 */
router.put('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }
    
    const rule = updateImageWhitelist(id, req.body);
    console.log('[deploy-webhook] Image whitelist rule updated:', {
      timestamp: new Date().toISOString(),
      ruleId: id,
    });
    res.json({ success: true, data: rule });
  } catch (error) {
    console.error('[deploy-webhook] Failed to update whitelist rule:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      ruleId: req.params.id,
    });
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 400).json(fail);
  }
});

/**
 * @openapi
 * /api/image-whitelist/{id}:
 *   delete:
 *     tags:
 *       - Image Whitelist
 *     security:
 *       - AdminToken: []
 *     summary: Delete whitelist rule
 *     description: Delete an image whitelist rule
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Whitelist rule deleted successfully
 */
router.delete('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }
    
    deleteImageWhitelist(id);
    console.log('[deploy-webhook] Image whitelist rule deleted:', {
      timestamp: new Date().toISOString(),
      ruleId: id,
    });
    res.json({ success: true });
  } catch (error) {
    console.error('[deploy-webhook] Failed to delete whitelist rule:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      ruleId: req.params.id,
    });
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 400).json(fail);
  }
});

export default router;

