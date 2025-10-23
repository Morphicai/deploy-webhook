import { Router, type Router as ExpressRouter } from 'express';
import { buildErrorResponse } from '../utils/errors';
import {
  createSecret,
  listSecrets,
  deleteSecret,
  updateSecret,
  listSecretsByGroup,
} from '../services/secretStore';
import { requireAdmin } from '../middleware/adminAuth';

const router: ExpressRouter = Router();

router.use(requireAdmin);

/**
 * @openapi
 * /api/secrets:
 *   get:
 *     tags:
 *       - Secrets
 *     security:
 *       - AdminToken: []
 *     summary: List all secrets (V2)
 *     description: Returns summaries for all stored secrets with encrypted values
 *     parameters:
 *       - in: query
 *         name: groupId
 *         schema:
 *           type: integer
 *         description: Filter by secret group ID
 *     responses:
 *       '200':
 *         description: Secret list
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
 *                     $ref: '#/components/schemas/SecretSummary'
 */
router.get('/', (req, res) => {
  try {
    const groupId = req.query.groupId ? Number(req.query.groupId) : undefined;
    const secrets = groupId ? listSecretsByGroup(groupId) : listSecrets();
    res.json({ success: true, data: secrets });
  } catch (error) {
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

/**
 * @openapi
 * /api/secrets:
 *   post:
 *     tags:
 *       - Secrets
 *     security:
 *       - AdminToken: []
 *     summary: Create a new secret (V2 - with encryption)
 *     description: Creates a new secret with the actual value encrypted and stored locally
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - groupId
 *               - value
 *             properties:
 *               name:
 *                 type: string
 *               groupId:
 *                 type: integer
 *               value:
 *                 type: string
 *                 description: The actual secret value (will be encrypted)
 *               description:
 *                 type: string
 *               source:
 *                 type: string
 *                 enum: [manual, synced]
 *     responses:
 *       '201':
 *         description: Secret created
 *       '400':
 *         description: Validation error
 */
router.post('/', (req, res) => {
  try {
    const created = createSecret(req.body);
    res.status(201).json({ success: true, data: created, message: 'Secret created successfully' });
  } catch (error) {
    console.error('[deploy-webhook] Failed to create secret:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      secretName: req.body?.name,
      groupId: req.body?.groupId,
    });
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 400).json(fail);
  }
});

/**
 * @openapi
 * /api/secrets/{id}:
 *   put:
 *     tags:
 *       - Secrets
 *     security:
 *       - AdminToken: []
 *     summary: Update an existing secret (V2)
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
 *               value:
 *                 type: string
 *                 description: New secret value (will be re-encrypted)
 *               groupId:
 *                 type: integer
 *               description:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Secret updated
 *       '400':
 *         description: Validation error
 */
router.put('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }
    const updated = updateSecret(id, req.body);
    res.json({ success: true, data: updated, message: 'Secret updated successfully' });
  } catch (error) {
    console.error('[deploy-webhook] Failed to update secret:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      secretId: req.params.id,
    });
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 400).json(fail);
  }
});

/**
 * @openapi
 * /api/secrets/{id}:
 *   delete:
 *     tags:
 *       - Secrets
 *     security:
 *       - AdminToken: []
 *     summary: Delete a secret (V2)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Secret deleted
 *       '404':
 *         description: Secret not found
 */
router.delete('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }
    deleteSecret(id);
    res.json({ success: true, message: 'Secret deleted successfully' });
  } catch (error) {
    console.error('[deploy-webhook] Failed to delete secret:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      secretId: req.params.id,
    });
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 400).json(fail);
  }
});

export default router;
