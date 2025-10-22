import { Router } from 'express';
import { requireAnyAuth } from '../middleware/apiKeyAuth';
import { buildErrorResponse } from '../utils/errors';
import {
  listApplications,
  getApplicationById,
  createApplication,
  updateApplication,
  deleteApplication,
} from '../services/applicationStore';
import { ContainerService } from '../services/containerService';
import type { Router as ExpressRouter } from 'express';

const router: ExpressRouter = Router();
const containerService = new ContainerService();

// Allow both Admin and API Key authentication
router.use(requireAnyAuth);

/**
 * @openapi
 * /api/applications:
 *   get:
 *     tags:
 *       - Applications
 *     security:
 *       - AdminToken: []
 *     summary: List all applications
 *     responses:
 *       '200':
 *         description: Application list
 */
router.get('/', (_req, res) => {
  try {
    res.json({ success: true, data: listApplications() });
  } catch (error) {
    console.error('[deploy-webhook] Failed to list applications:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    });
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

/**
 * @openapi
 * /api/applications/{id}:
 *   get:
 *     tags:
 *       - Applications
 *     security:
 *       - AdminToken: []
 *     summary: Get application by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Application details
 */
router.get('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }
    
    const app = getApplicationById(id);
    if (!app) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }
    
    res.json({ success: true, data: app });
  } catch (error) {
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

/**
 * @openapi
 * /api/applications:
 *   post:
 *     tags:
 *       - Applications
 *     security:
 *       - AdminToken: []
 *     summary: Create a new application
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - image
 *               - ports
 *             properties:
 *               name:
 *                 type: string
 *               image:
 *                 type: string
 *               version:
 *                 type: string
 *               repositoryId:
 *                 type: number
 *               ports:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     host:
 *                       type: number
 *                     container:
 *                       type: number
 *               envVars:
 *                 type: object
 *     responses:
 *       '201':
 *         description: Application created
 */
router.post('/', (req, res) => {
  try {
    const app = createApplication(req.body);
    console.log('[deploy-webhook] Application created:', {
      timestamp: new Date().toISOString(),
      appId: app.id,
      appName: app.name,
    });
    res.status(201).json({ success: true, data: app });
  } catch (error) {
    console.error('[deploy-webhook] Failed to create application:', {
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
 * /api/applications/{id}:
 *   put:
 *     tags:
 *       - Applications
 *     security:
 *       - AdminToken: []
 *     summary: Update application
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
 *         description: Application updated
 */
router.put('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }
    
    const app = updateApplication(id, req.body);
    console.log('[deploy-webhook] Application updated:', {
      timestamp: new Date().toISOString(),
      appId: id,
    });
    res.json({ success: true, data: app });
  } catch (error) {
    console.error('[deploy-webhook] Failed to update application:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      appId: req.params.id,
    });
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 400).json(fail);
  }
});

/**
 * @openapi
 * /api/applications/{id}:
 *   delete:
 *     tags:
 *       - Applications
 *     security:
 *       - AdminToken: []
 *     summary: Delete application
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Application deleted
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }
    
    // 先停止容器
    try {
      await containerService.stopContainer(id);
    } catch (e) {
      console.warn('[deploy-webhook] Failed to stop container before delete:', e);
    }
    
    deleteApplication(id);
    console.log('[deploy-webhook] Application deleted:', {
      timestamp: new Date().toISOString(),
      appId: id,
    });
    res.json({ success: true });
  } catch (error) {
    console.error('[deploy-webhook] Failed to delete application:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      appId: req.params.id,
    });
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 400).json(fail);
  }
});

/**
 * @openapi
 * /api/applications/{id}/deploy:
 *   post:
 *     tags:
 *       - Applications
 *     security:
 *       - AdminToken: []
 *     summary: Deploy application
 *     description: Pull image and start container
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Deployment started
 */
router.post('/:id/deploy', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }
    
    await containerService.deployApplication(id);
    res.json({ success: true, message: 'Application deployed successfully' });
  } catch (error) {
    console.error('[deploy-webhook] Failed to deploy application:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      appId: req.params.id,
    });
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

/**
 * @openapi
 * /api/applications/{id}/start:
 *   post:
 *     tags:
 *       - Applications
 *     security:
 *       - AdminToken: []
 *     summary: Start container
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Container started
 */
router.post('/:id/start', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }
    
    await containerService.startContainer(id);
    res.json({ success: true, message: 'Container started successfully' });
  } catch (error) {
    console.error('[deploy-webhook] Failed to start container:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      appId: req.params.id,
    });
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

/**
 * @openapi
 * /api/applications/{id}/stop:
 *   post:
 *     tags:
 *       - Applications
 *     security:
 *       - AdminToken: []
 *     summary: Stop container
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Container stopped
 */
router.post('/:id/stop', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }
    
    await containerService.stopContainer(id);
    res.json({ success: true, message: 'Container stopped successfully' });
  } catch (error) {
    console.error('[deploy-webhook] Failed to stop container:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      appId: req.params.id,
    });
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

/**
 * @openapi
 * /api/applications/{id}/restart:
 *   post:
 *     tags:
 *       - Applications
 *     security:
 *       - AdminToken: []
 *     summary: Restart container
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Container restarted
 */
router.post('/:id/restart', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }
    
    await containerService.restartContainer(id);
    res.json({ success: true, message: 'Container restarted successfully' });
  } catch (error) {
    console.error('[deploy-webhook] Failed to restart container:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      appId: req.params.id,
    });
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

export default router;
