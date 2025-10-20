import { Router } from 'express';
import { buildErrorResponse } from '../utils/errors';
import {
  createSecretRecord,
  listSecretSummaries,
  removeSecretRecord,
  updateSecretRecord,
} from '../services/secretStore';
import { requireAdmin } from '../middleware/adminAuth';

const router = Router();

router.use(requireAdmin);

/**
 * @openapi
 * /api/secrets:
 *   get:
 *     tags:
 *       - Secrets
 *     security:
 *       - AdminToken: []
 *     summary: List known secret configurations
 *     description: Returns summaries for all stored secret references.
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
 *                     $ref: '#/components/schemas/SecretRecord'
 */
router.get('/', (_req, res) => {
  res.json({ success: true, data: listSecretSummaries() });
});

/**
 * @openapi
 * /api/secrets:
 *   post:
 *     tags:
 *       - Secrets
 *     security:
 *       - AdminToken: []
 *     summary: Create a new secret record
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SecretCreateRequest'
 *     responses:
 *       '201':
 *         description: Secret created
 *       '400':
 *         description: Validation error
 */
router.post('/', (req, res) => {
  try {
    const created = createSecretRecord(req.body);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
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
 *     summary: Update an existing secret
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
 *             $ref: '#/components/schemas/SecretUpdateRequest'
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
    const updated = updateSecretRecord(id, req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
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
 *     summary: Remove a secret
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Secret removed
 */
router.delete('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }
    removeSecretRecord(id);
    res.json({ success: true });
  } catch (error) {
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 400).json(fail);
  }
});

export default router;
