import { Router } from 'express';
import { requireAnyAuth } from '../middleware/apiKeyAuth';
import { buildErrorResponse } from '../utils/errors';
import {
  listDomains,
  getDomainById,
  createDomain,
  updateDomain,
  deleteDomain,
  toggleDomain,
  getDomainsByApplicationId,
} from '../services/domainStore';
import { caddyService } from '../services/caddyService';

const router = Router();

// Allow both Admin and API Key authentication
router.use(requireAnyAuth);

/**
 * @openapi
 * /api/domains:
 *   get:
 *     tags:
 *       - Domains
 *     security:
 *       - AdminToken: []
 *     summary: List all domains
 *     parameters:
 *       - in: query
 *         name: enabled
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: applicationId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [application, custom]
 *     responses:
 *       '200':
 *         description: List of domains
 */
router.get('/', (req, res) => {
  try {
    const filters: any = {};
    
    if (req.query.enabled !== undefined) {
      filters.enabled = req.query.enabled === 'true';
    }
    
    if (req.query.applicationId) {
      filters.applicationId = Number(req.query.applicationId);
    }
    
    if (req.query.type) {
      filters.type = req.query.type;
    }
    
    const domains = listDomains(filters);
    res.json({ success: true, data: domains });
  } catch (error) {
    console.error('[domains] Failed to list domains:', error);
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

/**
 * @openapi
 * /api/domains/{id}:
 *   get:
 *     tags:
 *       - Domains
 *     security:
 *       - AdminToken: []
 *     summary: Get domain by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Domain details
 */
router.get('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const domain = getDomainById(id);
    
    if (!domain) {
      return res.status(404).json({ error: `Domain with id=${id} not found` });
    }
    
    res.json({ success: true, data: domain });
  } catch (error) {
    console.error('[domains] Failed to get domain:', error);
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

/**
 * @openapi
 * /api/domains:
 *   post:
 *     tags:
 *       - Domains
 *     security:
 *       - AdminToken: []
 *     summary: Create a new domain
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - domainName
 *               - type
 *             properties:
 *               domainName:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [application, custom]
 *               applicationId:
 *                 type: integer
 *               targetUrl:
 *                 type: string
 *               targetPort:
 *                 type: integer
 *               caddyConfig:
 *                 type: object
 *               enabled:
 *                 type: boolean
 *               description:
 *                 type: string
 *     responses:
 *       '201':
 *         description: Domain created
 */
router.post('/', async (req, res) => {
  try {
    const domain = createDomain(req.body);
    
    console.log('[domains] Created domain:', {
      id: domain.id,
      domainName: domain.domainName,
      type: domain.type,
    });
    
    // 自动重载 Caddy 配置
    try {
      caddyService.updateAndReload();
      console.log('[domains] Caddy configuration reloaded');
    } catch (caddyError) {
      console.error('[domains] Failed to reload Caddy, but domain created:', caddyError);
    }
    
    res.status(201).json({ success: true, data: domain });
  } catch (error) {
    console.error('[domains] Failed to create domain:', error);
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

/**
 * @openapi
 * /api/domains/{id}:
 *   put:
 *     tags:
 *       - Domains
 *     security:
 *       - AdminToken: []
 *     summary: Update domain
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
 *         description: Domain updated
 */
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const domain = updateDomain(id, req.body);
    
    console.log('[domains] Updated domain:', {
      id: domain.id,
      domainName: domain.domainName,
    });
    
    // 自动重载 Caddy 配置
    try {
      caddyService.updateAndReload();
      console.log('[domains] Caddy configuration reloaded');
    } catch (caddyError) {
      console.error('[domains] Failed to reload Caddy, but domain updated:', caddyError);
    }
    
    res.json({ success: true, data: domain });
  } catch (error) {
    console.error('[domains] Failed to update domain:', error);
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

/**
 * @openapi
 * /api/domains/{id}:
 *   delete:
 *     tags:
 *       - Domains
 *     security:
 *       - AdminToken: []
 *     summary: Delete domain
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Domain deleted
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    deleteDomain(id);
    
    console.log('[domains] Deleted domain:', { id });
    
    // 自动重载 Caddy 配置
    try {
      caddyService.updateAndReload();
      console.log('[domains] Caddy configuration reloaded');
    } catch (caddyError) {
      console.error('[domains] Failed to reload Caddy, but domain deleted:', caddyError);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('[domains] Failed to delete domain:', error);
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

/**
 * @openapi
 * /api/domains/{id}/toggle:
 *   post:
 *     tags:
 *       - Domains
 *     security:
 *       - AdminToken: []
 *     summary: Enable/disable domain
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
 *             required:
 *               - enabled
 *             properties:
 *               enabled:
 *                 type: boolean
 *     responses:
 *       '200':
 *         description: Domain toggled
 */
router.post('/:id/toggle', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }
    
    const domain = toggleDomain(id, enabled);
    
    console.log('[domains] Toggled domain:', {
      id: domain.id,
      domainName: domain.domainName,
      enabled: domain.enabled,
    });
    
    // 自动重载 Caddy 配置
    try {
      caddyService.updateAndReload();
      console.log('[domains] Caddy configuration reloaded');
    } catch (caddyError) {
      console.error('[domains] Failed to reload Caddy, but domain toggled:', caddyError);
    }
    
    res.json({ success: true, data: domain });
  } catch (error) {
    console.error('[domains] Failed to toggle domain:', error);
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

/**
 * @openapi
 * /api/applications/{id}/domains:
 *   get:
 *     tags:
 *       - Domains
 *     security:
 *       - AdminToken: []
 *     summary: Get all domains for an application
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: List of domains
 */
router.get('/application/:id', (req, res) => {
  try {
    const applicationId = Number(req.params.id);
    const domains = getDomainsByApplicationId(applicationId);
    res.json({ success: true, data: domains });
  } catch (error) {
    console.error('[domains] Failed to get domains for application:', error);
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

export default router;

