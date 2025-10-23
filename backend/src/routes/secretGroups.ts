import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middleware/adminAuth';
import { buildErrorResponse } from '../utils/errors';
import {
  listSecretGroups,
  getSecretGroupById,
  getSecretGroupStats,
  createSecretGroup,
  updateSecretGroup,
  deleteSecretGroup,
  getAllSecretGroupsStats,
} from '../services/secretGroupStore';

const router = Router();

/**
 * @openapi
 * /api/secret-groups:
 *   get:
 *     tags:
 *       - Secret Groups
 *     summary: List all secret groups
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: List of secret groups with statistics
 */
router.get('/', requireAdmin, (req: Request, res: Response) => {
  try {
    const groups = getAllSecretGroupsStats();
    res.json({
      success: true,
      data: groups,
    });
  } catch (error) {
    console.error('[SecretGroups] Error listing groups:', error);
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

/**
 * @openapi
 * /api/secret-groups/{id}:
 *   get:
 *     tags:
 *       - Secret Groups
 *     summary: Get secret group by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Secret group details with statistics
 *       '404':
 *         description: Secret group not found
 */
router.get('/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const group = getSecretGroupStats(id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Secret group not found',
      });
    }
    
    res.json({
      success: true,
      data: group,
    });
  } catch (error) {
    console.error('[SecretGroups] Error getting group:', error);
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

/**
 * @openapi
 * /api/secret-groups:
 *   post:
 *     tags:
 *       - Secret Groups
 *     summary: Create a new secret group
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "production-db"
 *               description:
 *                 type: string
 *                 example: "Production database secrets"
 *               providerId:
 *                 type: integer
 *                 nullable: true
 *                 example: 1
 *               autoSync:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       '200':
 *         description: Secret group created successfully
 *       '400':
 *         description: Invalid input or name already exists
 */
router.post('/', requireAdmin, (req: Request, res: Response) => {
  try {
    const group = createSecretGroup(req.body);
    res.json({
      success: true,
      data: group,
      message: 'Secret group created successfully',
    });
  } catch (error: any) {
    console.error('[SecretGroups] Error creating group:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
    
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

/**
 * @openapi
 * /api/secret-groups/{id}:
 *   put:
 *     tags:
 *       - Secret Groups
 *     summary: Update a secret group
 *     security:
 *       - bearerAuth: []
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
 *               description:
 *                 type: string
 *               providerId:
 *                 type: integer
 *                 nullable: true
 *               autoSync:
 *                 type: boolean
 *     responses:
 *       '200':
 *         description: Secret group updated successfully
 *       '404':
 *         description: Secret group not found
 */
router.put('/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const group = updateSecretGroup(id, req.body);
    
    res.json({
      success: true,
      data: group,
      message: 'Secret group updated successfully',
    });
  } catch (error: any) {
    console.error('[SecretGroups] Error updating group:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    
    if (error.message.includes('already exists') || error.message.includes('Cannot rename')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
    
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

/**
 * @openapi
 * /api/secret-groups/{id}:
 *   delete:
 *     tags:
 *       - Secret Groups
 *     summary: Delete a secret group
 *     description: Cannot delete if the group contains secrets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Secret group deleted successfully
 *       '400':
 *         description: Cannot delete group with secrets
 *       '404':
 *         description: Secret group not found
 */
router.delete('/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    deleteSecretGroup(id);
    
    res.json({
      success: true,
      message: 'Secret group deleted successfully',
    });
  } catch (error: any) {
    console.error('[SecretGroups] Error deleting group:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    
    if (error.message.includes('Cannot delete')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
    
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

export default router;

