import express, { Request, Response } from 'express';
import morgan from 'morgan';
import { deployConfig } from './config';
import { validateSecret, validateDeployPayload } from './utils/validation';
import { DeployService } from './services/deployService';
import { DeployRequest, HealthResponse } from './types';

const app = express();
const deployService = new DeployService();

// Middleware
app.use(express.json());
app.use(morgan('combined', {
  skip: (req) => req.url === '/health'  // 跳过健康检查端点的日志
}));

// Health check endpoint
app.get('/health', (_req: Request, res: Response<HealthResponse>) => {
  res.json({ 
    ok: true, 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Deploy endpoint
app.post('/deploy', async (req: Request<{}, any, DeployRequest>, res: Response) => {
  try {
    if (!validateSecret(req)) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid webhook secret' });
    }

    const payload: DeployRequest = {
      name: req.body?.name,
      version: req.body?.version,
      repo: req.body?.repo,
      port: req.body?.port,
      containerPort: req.body?.containerPort,
    };

    const valid = validateDeployPayload(payload);
    if (!valid.ok) {
      return res.status(400).json({ success: false, error: valid.error });
    }

    const result = await deployService.deploy(payload);
    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Start server
app.listen(deployConfig.port, () => {
  console.log(`[deploy-webhook] Server listening on port ${deployConfig.port}`);
});

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
