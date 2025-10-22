import { Router } from 'express';
import { requireAdmin } from '../middleware/adminAuth';
import {
  buildEnvironmentForProject,
  deleteEnvEntry,
  listEnvEntries,
  upsertEnvEntry,
} from '../services/envStore';

const router = Router();

router.use(requireAdmin);

/**
 * @openapi
 * /api/env:
 *   get:
 *     tags:
 *       - Environment
 *     security:
 *       - AdminToken: []
 *     summary: List stored environment variables
 *     parameters:
 *       - in: query
 *         name: scope
 *         schema:
 *           type: string
 *           enum: [global, project]
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Environment variable entries
 */
router.get('/', (req, res) => {
  const scope = (req.query.scope as 'global' | 'project' | undefined);
  const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
  res.json({ success: true, data: listEnvEntries(scope, projectId) });
});

/**
 * @openapi
 * /api/env:
 *   post:
 *     tags:
 *       - Environment
 *     security:
 *       - AdminToken: []
 *     summary: Create or update an environment variable entry
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [scope, key, value]
 *             properties:
 *               scope:
 *                 type: string
 *                 enum: [global, project]
 *               projectId:
 *                 type: integer
 *                 description: Required when scope is 'project'
 *               key:
 *                 type: string
 *               value:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Created or updated entry
 */
router.post('/', (req, res) => {
  try {
    const entry = upsertEnvEntry(req.body);
    res.json({ success: true, data: entry });
  } catch (error) {
    console.error('[deploy-webhook] Failed to create/update environment variable:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      requestBody: req.body,
    });
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create/update environment variable' 
    });
  }
});

/**
 * @openapi
 * /api/env:
 *   delete:
 *     tags:
 *       - Environment
 *     security:
 *       - AdminToken: []
 *     summary: Delete an environment variable entry
 *     parameters:
 *       - in: query
 *         name: scope
 *         required: true
 *         schema:
 *           type: string
 *           enum: [global, project]
 *       - in: query
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Entry removed
 */
router.delete('/', (req, res) => {
  const scope = req.query.scope as 'global' | 'project';
  const key = req.query.key as string;
  const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
  if (!scope || !key) {
    return res.status(400).json({ success: false, error: 'Missing scope or key' });
  }
  deleteEnvEntry(scope, key, projectId);
  res.json({ success: true });
});

router.get('/project/:identifier', (req, res) => {
  const identifier = req.params.identifier;
  // 支持通过 ID 或名称查询
  const projectIdentifier = /^\d+$/.test(identifier) ? Number(identifier) : identifier;
  const merged = buildEnvironmentForProject(projectIdentifier as any);
  res.json({ success: true, data: merged });
});

export default router;
