import { Router } from 'express';
import { buildErrorResponse } from '../utils/errors';
import {
  createRepository,
  deleteRepository,
  listRepositories,
  updateRepository,
  setDefaultRepository,
  getRepositoryById,
  type RepositoryInput,
} from '../services/repositoryStore';
import { requireAdmin } from '../middleware/adminAuth';

const router = Router();

router.use(requireAdmin);

/**
 * @openapi
 * /api/repositories:
 *   get:
 *     tags:
 *       - Repositories
 *     security:
 *       - AdminToken: []
 *     summary: List all repositories
 *     description: Get all repository configurations (passwords and tokens masked)
 *     responses:
 *       '200':
 *         description: Successfully retrieved repositories
 */
router.get('/', (_req, res) => {
  try {
    const repositories = listRepositories();
    res.json({ success: true, data: repositories });
  } catch (error) {
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

/**
 * @openapi
 * /api/repositories/{id}:
 *   get:
 *     tags:
 *       - Repositories
 *     security:
 *       - AdminToken: []
 *     summary: Get repository by ID
 *     description: Get full repository configuration (including credentials)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Successfully retrieved repository
 */
router.get('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }
    
    const repository = getRepositoryById(id);
    if (!repository) {
      return res.status(404).json({ success: false, error: 'Repository not found' });
    }
    
    res.json({ success: true, data: repository });
  } catch (error) {
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

/**
 * @openapi
 * /api/repositories:
 *   post:
 *     tags:
 *       - Repositories
 *     security:
 *       - AdminToken: []
 *     summary: Create a new repository
 *     description: Add a new image repository configuration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - registry
 *               - authType
 *             properties:
 *               name:
 *                 type: string
 *                 description: Repository name
 *               registry:
 *                 type: string
 *                 description: Registry URL
 *               authType:
 *                 type: string
 *                 enum: [username-password, token, none]
 *                 description: Authentication type
 *               username:
 *                 type: string
 *                 description: Username (for username-password auth)
 *               password:
 *                 type: string
 *                 description: Password (for username-password auth)
 *               token:
 *                 type: string
 *                 description: Access token (for token auth)
 *               isDefault:
 *                 type: boolean
 *                 description: Set as default repository
 *     responses:
 *       '200':
 *         description: Repository created successfully
 */
router.post('/', (req, res) => {
  try {
    const input: RepositoryInput = req.body;
    const repository = createRepository(input);
    res.json({ success: true, data: repository });
  } catch (error) {
    console.error('[deploy-webhook] Failed to create repository:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      repositoryName: req.body?.name,
      registry: req.body?.registry,
      authType: req.body?.authType,
    });
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 400).json(fail);
  }
});

/**
 * @openapi
 * /api/repositories/{id}:
 *   put:
 *     tags:
 *       - Repositories
 *     security:
 *       - AdminToken: []
 *     summary: Update repository
 *     description: Update repository configuration
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
 *               registry:
 *                 type: string
 *               authType:
 *                 type: string
 *                 enum: [username-password, token, none]
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               token:
 *                 type: string
 *               isDefault:
 *                 type: boolean
 *     responses:
 *       '200':
 *         description: Repository updated successfully
 */
router.put('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }
    
    const input: Partial<RepositoryInput> = req.body;
    const repository = updateRepository(id, input);
    res.json({ success: true, data: repository });
  } catch (error) {
    console.error('[deploy-webhook] Failed to update repository:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      repositoryId: req.params.id,
      updates: { name: req.body?.name, authType: req.body?.authType },
    });
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 400).json(fail);
  }
});

/**
 * @openapi
 * /api/repositories/{id}/set-default:
 *   post:
 *     tags:
 *       - Repositories
 *     security:
 *       - AdminToken: []
 *     summary: Set default repository
 *     description: Set a repository as the default for deployments
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Default repository set successfully
 */
router.post('/:id/set-default', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }
    
    setDefaultRepository(id);
    console.log('[deploy-webhook] Default repository set:', {
      timestamp: new Date().toISOString(),
      repositoryId: id,
    });
    res.json({ success: true, message: 'Default repository set successfully' });
  } catch (error) {
    console.error('[deploy-webhook] Failed to set default repository:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      repositoryId: req.params.id,
    });
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 400).json(fail);
  }
});

/**
 * @openapi
 * /api/repositories/{id}:
 *   delete:
 *     tags:
 *       - Repositories
 *     security:
 *       - AdminToken: []
 *     summary: Delete repository
 *     description: Delete a repository configuration (cannot delete default repository)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Repository deleted successfully
 */
router.delete('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }
    
    deleteRepository(id);
    console.log('[deploy-webhook] Repository deleted:', {
      timestamp: new Date().toISOString(),
      repositoryId: id,
    });
    res.json({ success: true });
  } catch (error) {
    console.error('[deploy-webhook] Failed to delete repository:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      repositoryId: req.params.id,
    });
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 400).json(fail);
  }
});

export default router;

