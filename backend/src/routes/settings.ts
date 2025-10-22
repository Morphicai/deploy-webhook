import { Router } from 'express';
import { requireAdmin } from '../middleware/adminAuth';
import { getAllSettings, setSetting, getOpenAIConfig, setOpenAIConfig } from '../services/settingsStore';

const router = Router();

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Get all system settings
 *     tags: [Settings]
 *     security:
 *       - AdminToken: []
 *     responses:
 *       200:
 *         description: System settings retrieved successfully
 */
router.get('/', requireAdmin, (req, res) => {
  try {
    const settings = getAllSettings();
    res.json(settings);
  } catch (error: any) {
    console.error('[settings-api] Error getting settings:', error);
    res.status(500).json({ error: error.message || 'Failed to get settings' });
  }
});

/**
 * @swagger
 * /api/settings:
 *   put:
 *     summary: Update system settings
 *     tags: [Settings]
 *     security:
 *       - AdminToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: Settings updated successfully
 */
router.put('/', requireAdmin, (req, res) => {
  try {
    const settings = req.body;
    
    for (const [key, value] of Object.entries(settings)) {
      if (typeof value === 'string') {
        setSetting(key, value);
      }
    }
    
    res.json({ message: 'Settings updated successfully' });
  } catch (error: any) {
    console.error('[settings-api] Error updating settings:', error);
    res.status(500).json({ error: error.message || 'Failed to update settings' });
  }
});

/**
 * @swagger
 * /api/settings/openai:
 *   get:
 *     summary: Get OpenAI configuration
 *     tags: [Settings]
 *     security:
 *       - AdminToken: []
 *     responses:
 *       200:
 *         description: OpenAI config retrieved successfully
 */
router.get('/openai', requireAdmin, (req, res) => {
  try {
    const config = getOpenAIConfig();
    // Mask API key for security
    res.json({
      apiKey: config.apiKey ? '********' + config.apiKey.slice(-4) : '',
      baseUrl: config.baseUrl,
      hasApiKey: !!config.apiKey,
    });
  } catch (error: any) {
    console.error('[settings-api] Error getting OpenAI config:', error);
    res.status(500).json({ error: error.message || 'Failed to get OpenAI config' });
  }
});

/**
 * @swagger
 * /api/settings/openai:
 *   put:
 *     summary: Update OpenAI configuration
 *     tags: [Settings]
 *     security:
 *       - AdminToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               apiKey:
 *                 type: string
 *               baseUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: OpenAI config updated successfully
 */
router.put('/openai', requireAdmin, (req, res) => {
  try {
    const { apiKey, baseUrl } = req.body;
    
    if (!apiKey || !baseUrl) {
      return res.status(400).json({ error: 'apiKey and baseUrl are required' });
    }
    
    setOpenAIConfig(apiKey, baseUrl);
    res.json({ message: 'OpenAI config updated successfully' });
  } catch (error: any) {
    console.error('[settings-api] Error updating OpenAI config:', error);
    res.status(500).json({ error: error.message || 'Failed to update OpenAI config' });
  }
});

export default router;

