import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { DeployService } from '../services/deployService';
import { buildErrorResponse } from '../utils/errors';
import { getApplicationById, getApplicationByName, updateApplication } from '../services/applicationStore';
import { 
  createDeploymentLog, 
  updateDeploymentLog 
} from '../services/deploymentLogStore';

const router = Router();

/**
 * @openapi
 * /webhook/deploy:
 *   post:
 *     tags:
 *       - Webhook Deploy
 *     summary: Deploy via Webhook (V2 - Secure)
 *     description: |
 *       新的安全 Webhook 部署接口
 *       - 必须使用已注册的应用
 *       - 使用应用专用的 webhook token
 *       - 只需提供版本号，其他配置从应用记录读取
 *       - 所有部署都有审计日志
 *       
 *       ### 使用步骤
 *       1. 在管理后台预先注册应用
 *       2. 启用应用的 Webhook 部署功能
 *       3. 复制应用的 Webhook Token
 *       4. 在 CI/CD 中配置 Webhook 调用
 *       
 *       ### CI/CD 示例 (GitHub Actions)
 *       ```yaml
 *       - name: Trigger Deployment
 *         run: |
 *           curl -X POST https://your-domain.com/webhook/deploy \
 *             -H "Content-Type: application/json" \
 *             -d '{
 *               "applicationId": 123,
 *               "version": "${{ github.ref_name }}",
 *               "token": "${{ secrets.WEBHOOK_TOKEN }}"
 *             }'
 *       ```
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - version
 *               - token
 *             properties:
 *               applicationId:
 *                 type: integer
 *                 description: 应用ID（applicationId 或 applicationName 二选一）
 *                 example: 123
 *               applicationName:
 *                 type: string
 *                 description: 应用名称（applicationId 或 applicationName 二选一）
 *                 example: "myapp"
 *               version:
 *                 type: string
 *                 description: 镜像版本标签
 *                 example: "v1.2.3"
 *               token:
 *                 type: string
 *                 description: 应用的 Webhook Token (whk_xxx 格式)
 *                 example: "whk_abc123..."
 *     responses:
 *       '200':
 *         description: 部署成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 deploymentId:
 *                   type: string
 *                   description: 部署唯一标识符
 *                 application:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     version:
 *                       type: string
 *                 message:
 *                   type: string
 *       '400':
 *         description: 请求参数错误
 *       '401':
 *         description: Webhook Token 无效
 *       '403':
 *         description: Webhook 部署被禁用
 *       '404':
 *         description: 应用不存在
 *       '500':
 *         description: 部署失败
 */
router.post('/deploy', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { applicationId, applicationName, version, token } = req.body;
  
  try {
    // ============================================
    // Step 1: 验证必填参数
    // ============================================
    if ((!applicationId && !applicationName) || !version || !token) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields. Need: (applicationId or applicationName), version, token',
      });
    }
    
    // ============================================
    // Step 2: 获取应用
    // ============================================
    const app = applicationId 
      ? getApplicationById(applicationId)
      : getApplicationByName(applicationName);
      
    if (!app) {
      console.error('[Webhook Deploy] Application not found', {
        applicationId,
        applicationName,
        clientIp: req.ip,
      });
      
      return res.status(404).json({
        success: false,
        error: 'Application not found. Please register the application in admin panel first.',
      });
    }
    
    // ============================================
    // Step 3: 验证 Webhook 是否启用
    // ============================================
    if (!app.webhookEnabled) {
      console.error('[Webhook Deploy] Webhook disabled', {
        applicationId: app.id,
        applicationName: app.name,
        clientIp: req.ip,
      });
      
      return res.status(403).json({
        success: false,
        error: `Webhook deployment is disabled for application "${app.name}". Please enable it in admin panel.`,
      });
    }
    
    // ============================================
    // Step 4: 验证 Webhook Token
    // ============================================
    if (!app.webhookToken || app.webhookToken !== token) {
      console.error('[Webhook Deploy] Invalid token', {
        applicationId: app.id,
        applicationName: app.name,
        providedTokenPrefix: token ? token.substring(0, 10) + '...' : 'none',
        clientIp: req.ip,
      });
      
      return res.status(401).json({
        success: false,
        error: 'Invalid webhook token',
      });
    }
    
    // ============================================
    // Step 5: 验证端口配置
    // ============================================
    if (!app.ports || app.ports.length === 0) {
      return res.status(400).json({
        success: false,
        error: `Application "${app.name}" has no port configuration. Please configure ports in admin panel.`,
      });
    }
    
    // ============================================
    // Step 6: 创建部署日志
    // ============================================
    const deploymentId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const logId = createDeploymentLog({
      applicationId: app.id,
      version,
      deploymentId,
      triggerType: 'webhook',
      triggerSource: req.ip || req.socket.remoteAddress || 'unknown',
      status: 'pending',
    });
    
    console.log('[Webhook Deploy] Starting deployment', {
      deploymentId,
      applicationId: app.id,
      applicationName: app.name,
      version,
      logId,
    });
    
    // ============================================
    // Step 7: 执行部署
    // ============================================
    try {
      const deployService = new DeployService();
      
      const result = await deployService.deploy({
        name: app.name,
        image: app.image,
        version,
        port: app.ports[0].host,
        containerPort: app.ports[0].container,
        repositoryId: app.repositoryId || undefined,
        env: {},  // 环境变量从 environment_variables 表读取
      });
      
      // ============================================
      // Step 8: 更新部署日志
      // ============================================
      const completedAt = new Date().toISOString();
      updateDeploymentLog(logId, {
        status: result.success ? 'success' : 'failed',
        errorMessage: result.error || undefined,
        completedAt,
      });
      
      // ============================================
      // Step 9: 更新应用版本
      // ============================================
      if (result.success) {
        updateApplication(app.id, { version });
        
        console.log('[Webhook Deploy] Deployment completed successfully', {
          deploymentId,
          applicationId: app.id,
          applicationName: app.name,
          version,
          durationMs: Date.now() - startTime,
        });
      } else {
        console.error('[Webhook Deploy] Deployment failed', {
          deploymentId,
          applicationId: app.id,
          applicationName: app.name,
          version,
          error: result.error,
          durationMs: Date.now() - startTime,
        });
      }
      
      // ============================================
      // Step 10: 返回响应
      // ============================================
      return res.status(result.success ? 200 : 500).json({
        success: result.success,
        deploymentId,
        application: {
          id: app.id,
          name: app.name,
          version: result.success ? version : app.version,
        },
        message: result.success 
          ? 'Deployment completed successfully'
          : `Deployment failed: ${result.error}`,
        error: result.error,
      });
      
    } catch (error: any) {
      // ============================================
      // 部署异常处理
      // ============================================
      const completedAt = new Date().toISOString();
      updateDeploymentLog(logId, {
        status: 'failed',
        errorMessage: error.message,
        completedAt,
      });
      
      console.error('[Webhook Deploy] Deployment exception', {
        deploymentId,
        applicationId: app.id,
        applicationName: app.name,
        error: error.message,
        stack: error.stack,
      });
      
      throw error;
    }
    
  } catch (error) {
    console.error('[Webhook Deploy] Error processing webhook:', error);
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

/**
 * @openapi
 * /webhook/deploy/status/{deploymentId}:
 *   get:
 *     tags:
 *       - Webhook Deploy
 *     summary: Check deployment status
 *     description: 查询部署状态
 *     parameters:
 *       - in: path
 *         name: deploymentId
 *         required: true
 *         schema:
 *           type: string
 *         description: 部署 ID
 *     responses:
 *       '200':
 *         description: 部署状态
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 deployment:
 *                   type: object
 *       '404':
 *         description: 部署记录不存在
 */
router.get('/deploy/status/:deploymentId', async (req: Request, res: Response) => {
  try {
    const { deploymentId } = req.params;
    
    const { getDeploymentLogByDeploymentId } = await import('../services/deploymentLogStore');
    const deployment = getDeploymentLogByDeploymentId(deploymentId);
    
    if (!deployment) {
      return res.status(404).json({
        success: false,
        error: 'Deployment not found',
      });
    }
    
    return res.json({
      success: true,
      deployment: {
        id: deployment.id,
        deploymentId: deployment.deploymentId,
        applicationId: deployment.applicationId,
        applicationName: deployment.applicationName,
        version: deployment.version,
        status: deployment.status,
        triggerType: deployment.triggerType,
        startedAt: deployment.startedAt,
        completedAt: deployment.completedAt,
        durationMs: deployment.durationMs,
        errorMessage: deployment.errorMessage,
      },
    });
  } catch (error) {
    console.error('[Webhook Deploy] Error checking status:', error);
    const fail = buildErrorResponse(error);
    res.status(fail.code ?? 500).json(fail);
  }
});

export default router;

