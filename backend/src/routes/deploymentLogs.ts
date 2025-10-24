import { Router, Request, Response } from 'express';
import {
  listDeploymentLogs,
  getDeploymentLogById,
} from '../services/deploymentLogStore';

const router = Router();

/**
 * 获取部署日志列表
 * GET /api/deployment-logs
 * Query params:
 *   - applicationId?: number  按应用ID过滤
 *   - status?: string         按状态过滤（pending|success|failed）
 *   - limit?: number          返回记录数限制
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const applicationId = req.query.applicationId ? Number(req.query.applicationId) : undefined;
    const status = req.query.status as 'pending' | 'success' | 'failed' | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const logs = listDeploymentLogs({
      applicationId,
      status,
      limit,
    });

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('[Deployment Logs API] Error listing deployment logs:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list deployment logs',
    });
  }
});

/**
 * 获取单个部署日志详情
 * GET /api/deployment-logs/:id
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid deployment log ID',
      });
    }

    const log = getDeploymentLogById(id);

    if (!log) {
      return res.status(404).json({
        success: false,
        error: `Deployment log with id=${id} not found`,
      });
    }

    res.json({
      success: true,
      data: log,
    });
  } catch (error) {
    console.error('[Deployment Logs API] Error getting deployment log:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get deployment log',
    });
  }
});

export default router;

