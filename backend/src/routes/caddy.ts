import { Router } from 'express';
import { requireAdmin } from '../middleware/adminAuth';
import { buildErrorResponse } from '../utils/errors';
import { caddyService } from '../services/caddyService';

const router = Router();

router.use(requireAdmin);

/**
 * @openapi
 * /api/caddy/config:
 *   get:
 *     tags:
 *       - Caddy
 *     security:
 *       - AdminToken: []
 *     summary: Get generated Caddyfile content
 *     responses:
 *       '200':
 *         description: Caddyfile content
 */
router.get('/config', (_req, res) => {
  try {
    const config = caddyService.generateCaddyfile();
    res.type('text/plain').send(config);
  } catch (error) {
    console.error('[deploy-webhook] Failed to generate Caddyfile:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    });
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

/**
 * @openapi
 * /api/caddy/urls:
 *   get:
 *     tags:
 *       - Caddy
 *     security:
 *       - AdminToken: []
 *     summary: Get application URLs
 *     responses:
 *       '200':
 *         description: Map of application names to URLs
 */
router.get('/urls', (_req, res) => {
  try {
    const urls = caddyService.listApplicationUrls();
    res.json({ success: true, data: urls });
  } catch (error) {
    console.error('[deploy-webhook] Failed to list application URLs:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    });
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

/**
 * @openapi
 * /api/caddy/reload:
 *   post:
 *     tags:
 *       - Caddy
 *     security:
 *       - AdminToken: []
 *     summary: Regenerate and reload Caddy configuration
 *     description: Generates new Caddyfile based on current applications and reloads Caddy
 *     responses:
 *       '200':
 *         description: Caddy reloaded successfully
 */
router.post('/reload', async (_req, res) => {
  try {
    caddyService.updateAndReload();
    console.log('[deploy-webhook] Caddy configuration reloaded:', {
      timestamp: new Date().toISOString(),
    });
    res.json({ 
      success: true, 
      message: 'Caddy configuration reloaded successfully',
      urls: caddyService.listApplicationUrls()
    });
  } catch (error) {
    console.error('[deploy-webhook] Failed to reload Caddy:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    });
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

/**
 * @openapi
 * /api/caddy/validate:
 *   post:
 *     tags:
 *       - Caddy
 *     security:
 *       - AdminToken: []
 *     summary: Validate Caddyfile syntax
 *     responses:
 *       '200':
 *         description: Validation result
 */
router.post('/validate', (_req, res) => {
  try {
    const newConfig = caddyService.generateCaddyfile();
    caddyService.writeCaddyfile(newConfig);
    const isValid = caddyService.validateCaddyfile();
    
    res.json({ 
      success: true, 
      valid: isValid,
      message: isValid ? 'Caddyfile is valid' : 'Caddyfile validation failed'
    });
  } catch (error) {
    console.error('[deploy-webhook] Failed to validate Caddyfile:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    });
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

export default router;

