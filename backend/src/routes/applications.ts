import { Router } from 'express';
import { requireAdmin } from '../middleware/adminAuth';
import { listApplications } from '../services/applicationStore';

const router = Router();

router.use(requireAdmin);

/**
 * @openapi
 * /api/applications:
 *   get:
 *     tags:
 *       - Applications
 *     security:
 *       - AdminToken: []
 *     summary: List tracked application deployments
 *     responses:
 *       '200':
 *         description: Application list
 */
router.get('/', (_req, res) => {
  res.json({ success: true, data: listApplications() });
});

export default router;
