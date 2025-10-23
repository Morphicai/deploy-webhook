import { Express } from 'express';
import { createApp } from '../setup/testAppFactory';
import { initializeTestDatabase, cleanTestDatabase } from '../setup/testDatabase';
import { ApiClient } from '../helpers/apiClient';
import { 
  TEST_AUTH, 
  createTestApplication,
  generateTestContainerName,
  generateTestPort,
  wait 
} from '../helpers/fixtures';
import { 
  cleanupTestContainers, 
  removeContainer, 
  waitForContainer,
  isContainerRunning 
} from '../helpers/cleanup';

/**
 * 应用部署测试
 */
describe('Application Deployment', () => {
  let app: Express;
  let client: ApiClient;

  beforeAll(async () => {
    initializeTestDatabase();
    app = createApp();
    client = new ApiClient(app, TEST_AUTH.adminToken);
    
    // 清理可能存在的测试容器
    await cleanupTestContainers();
  });

  beforeEach(async () => {
    cleanTestDatabase();
    initializeTestDatabase();
  });

  afterEach(async () => {
    // 清理本次测试创建的容器
    await cleanupTestContainers();
  });

  afterAll(async () => {
    // 最终清理
    await cleanupTestContainers();
  });

  describe('Basic Deployment', () => {
    it('应该成功部署一个简单的应用', async () => {
      const containerName = generateTestContainerName();
      const testPort = generateTestPort();
      
      const deployData = createTestApplication({
        name: containerName,
        image: 'nginx',
        version: 'alpine',
        port: testPort,
        containerPort: 80,
      });

      const response = await client.deploy(deployData, TEST_AUTH.webhookSecret);

      // 验证响应
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.deploymentId).toBeDefined();

      // 等待容器启动
      await wait(2000);

      // 验证容器是否在运行
      const running = await isContainerRunning(containerName);
      expect(running).toBe(true);

      // 清理
      await removeContainer(containerName);
    }, 60000); // 60秒超时

    it('应该在不提供 name 时自动生成应用名称', async () => {
      const testPort = generateTestPort();
      
      const deployData = createTestApplication({
        name: undefined, // 不提供名称
        image: 'nginx',
        version: 'alpine',
        port: testPort,
        containerPort: 80,
      });

      const response = await client.deploy(deployData, TEST_AUTH.webhookSecret);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // 等待并查询应用列表
      await wait(2000);
      const appsResponse = await client.listApplications();
      
      expect(appsResponse.body.data).toBeDefined();
      expect(appsResponse.body.data.length).toBeGreaterThan(0);
      
      // 应该有一个应用名称类似 "nginx" 的应用
      const app = appsResponse.body.data.find((a: any) => a.image === 'nginx');
      expect(app).toBeDefined();
      expect(app.name).toBeTruthy();
      
      // 清理
      if (app) {
        await removeContainer(app.name);
      }
    }, 60000);

    it('应该支持环境变量注入', async () => {
      const containerName = generateTestContainerName();
      const testPort = generateTestPort();
      
      const deployData = createTestApplication({
        name: containerName,
        image: 'nginx',
        version: 'alpine',
        port: testPort,
        containerPort: 80,
        env: {
          TEST_ENV_VAR: 'test-value',
          NODE_ENV: 'test',
        },
      });

      const response = await client.deploy(deployData, TEST_AUTH.webhookSecret);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // 等待容器启动
      await wait(2000);

      // 验证容器在运行
      const running = await isContainerRunning(containerName);
      expect(running).toBe(true);

      // 清理
      await removeContainer(containerName);
    }, 60000);
  });

  describe('Deployment Validation', () => {
    it('应该拒绝缺少必需字段的请求', async () => {
      const response = await client.post('/deploy', {
        // 缺少 port 和 containerPort
        image: 'nginx',
        version: 'alpine',
      }, { 'x-webhook-secret': TEST_AUTH.webhookSecret });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('应该拒绝无效的端口号', async () => {
      const response = await client.deploy({
        image: 'nginx',
        version: 'alpine',
        port: -1, // 无效端口
        containerPort: 80,
      }, TEST_AUTH.webhookSecret);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('应该拒绝空的镜像名称', async () => {
      const response = await client.deploy({
        image: '', // 空镜像名
        version: 'alpine',
        port: 9080,
        containerPort: 80,
      }, TEST_AUTH.webhookSecret);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Container Updates', () => {
    it('应该成功替换现有容器', async () => {
      const containerName = generateTestContainerName();
      const testPort = generateTestPort();
      
      const deployData = createTestApplication({
        name: containerName,
        image: 'nginx',
        version: 'alpine',
        port: testPort,
        containerPort: 80,
      });

      // 第一次部署
      const response1 = await client.deploy(deployData, TEST_AUTH.webhookSecret);
      expect(response1.status).toBe(200);
      await wait(2000);

      // 第二次部署（更新）
      const response2 = await client.deploy({
        ...deployData,
        version: '1.25-alpine', // 不同版本
      }, TEST_AUTH.webhookSecret);

      expect(response2.status).toBe(200);
      expect(response2.body.success).toBe(true);

      // 等待容器更新
      await wait(2000);

      // 验证容器仍在运行
      const running = await isContainerRunning(containerName);
      expect(running).toBe(true);

      // 清理
      await removeContainer(containerName);
    }, 90000);
  });

  describe('Application Management', () => {
    it('应该能够查询应用列表', async () => {
      const response = await client.listApplications();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('应该能够查询单个应用详情', async () => {
      // 先部署一个应用
      const containerName = generateTestContainerName();
      const testPort = generateTestPort();
      
      await client.deploy(
        createTestApplication({
          name: containerName,
          port: testPort,
        }),
        TEST_AUTH.webhookSecret
      );

      await wait(2000);

      // 获取应用列表
      const listResponse = await client.listApplications();
      const apps = listResponse.body.data;
      
      if (apps.length > 0) {
        const app = apps[0];
        const detailResponse = await client.getApplication(app.id);

        expect(detailResponse.status).toBe(200);
        expect(detailResponse.body.success).toBe(true);
        expect(detailResponse.body.data.id).toBe(app.id);
      }

      // 清理
      await removeContainer(containerName);
    }, 60000);
  });

  describe('Error Handling', () => {
    it('应该处理无效镜像名称的错误', async () => {
      const containerName = generateTestContainerName();
      const testPort = generateTestPort();
      
      const response = await client.deploy({
        name: containerName,
        image: 'nonexistent-image-that-does-not-exist',
        version: 'latest',
        port: testPort,
        containerPort: 80,
      }, TEST_AUTH.webhookSecret);

      // 部署应该失败
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    }, 60000);

    it('应该在认证失败时返回 401', async () => {
      const response = await client.deploy({
        image: 'nginx',
        version: 'alpine',
        port: 9080,
        containerPort: 80,
      }, 'invalid-secret');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Health Check', () => {
    it('应该响应健康检查请求', async () => {
      const response = await client.health();

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
    });
  });

  describe('Application Pre-registration (V2 新功能)', () => {
    it('应该成功预注册应用', async () => {
      const testPort = generateTestPort();
      const appData = {
        name: 'pre-registered-app',
        image: 'nginx',
        ports: [{ host: testPort, container: 80 }],
        webhookEnabled: true,
      };

      const response = await client.createApplication(appData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('webhookToken'); // V2: 自动生成 webhook token
      expect(response.body.data.webhookEnabled).toBe(true);
    });

    it('应该支持启用/禁用应用的 webhook', async () => {
      const testPort = generateTestPort();
      const appData = {
        name: 'webhook-toggle-app',
        image: 'nginx',
        ports: [{ host: testPort, container: 80 }],
        webhookEnabled: false,
      };

      // 创建应用，不启用 webhook
      const createResponse = await client.createApplication(appData);
      const appId = createResponse.body.data.id;

      expect(createResponse.body.data.webhookEnabled).toBe(false);
      expect(createResponse.body.data.webhookToken).toBeNull();

      // 启用 webhook
      const updateResponse = await client.updateApplication(appId, {
        webhookEnabled: true,
      });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.webhookEnabled).toBe(true);
      expect(updateResponse.body.data.webhookToken).toBeTruthy(); // 应该自动生成 token
    });

    it('应该能够重新生成应用的 webhook token', async () => {
      const testPort = generateTestPort();
      const appData = {
        name: 'regenerate-token-app',
        image: 'nginx',
        ports: [{ host: testPort, container: 80 }],
        webhookEnabled: true,
      };

      const createResponse = await client.createApplication(appData);
      const appId = createResponse.body.data.id;
      const originalToken = createResponse.body.data.webhookToken;

      // 重新生成 token（通过更新 webhookToken 字段）
      const newToken = `whk_${Math.random().toString(36).substring(2, 15)}`;
      const updateResponse = await client.updateApplication(appId, {
        webhookToken: newToken,
      });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.webhookToken).toBe(newToken);
      expect(updateResponse.body.data.webhookToken).not.toBe(originalToken);
    });
  });

  describe('Webhook Deployment V2', () => {
    it('应该通过 webhook 成功部署预注册的应用', async () => {
      const containerName = generateTestContainerName();
      const testPort = generateTestPort();
      
      // 1. 预注册应用
      const appData = {
        name: containerName,
        image: 'nginx',
        ports: [{ host: testPort, container: 80 }],
        webhookEnabled: true,
      };

      const createResponse = await client.createApplication(appData);
      const appId = createResponse.body.data.id;
      const webhookToken = createResponse.body.data.webhookToken;

      expect(webhookToken).toBeTruthy();

      // 2. 通过 webhook 部署应用
      const deployResponse = await client.webhookDeployV2({
        applicationId: appId,
        version: 'alpine',
        token: webhookToken,
      });

      expect(deployResponse.status).toBe(200);
      expect(deployResponse.body.success).toBe(true);
      expect(deployResponse.body.deploymentId).toBeDefined();

      // 等待容器启动
      await wait(2000);

      // 验证容器是否在运行
      const running = await isContainerRunning(containerName);
      expect(running).toBe(true);

      // 清理
      await removeContainer(containerName);
    }, 60000);

    it('应该拒绝未注册应用的 webhook 部署', async () => {
      const response = await client.webhookDeployV2({
        applicationId: 99999, // 不存在的应用ID
        version: 'alpine',
        token: 'fake-token',
      });

      expect(response.status).toBe(400); // Bad Request
      expect(response.body.success).toBe(false);
    });

    it('应该拒绝使用无效 token 的 webhook 部署', async () => {
      const testPort = generateTestPort();
      
      // 创建应用
      const appData = {
        name: 'invalid-token-app',
        image: 'nginx',
        ports: [{ host: testPort, container: 80 }],
        webhookEnabled: true,
      };

      const createResponse = await client.createApplication(appData);
      const appId = createResponse.body.data.id;

      // 使用错误的 token 尝试部署
      const deployResponse = await client.webhookDeployV2({
        applicationId: appId,
        version: 'alpine',
        token: 'invalid-token-12345',
      });

      expect(deployResponse.status).toBe(401); // Unauthorized
      expect(deployResponse.body.success).toBe(false);
    });

    it('应该拒绝 webhook 未启用的应用部署', async () => {
      const testPort = generateTestPort();
      
      // 创建应用，不启用 webhook
      const appData = {
        name: 'webhook-disabled-app',
        image: 'nginx',
        ports: [{ host: testPort, container: 80 }],
        webhookEnabled: false,
      };

      const createResponse = await client.createApplication(appData);
      const appId = createResponse.body.data.id;

      // 尝试通过 webhook 部署
      const deployResponse = await client.webhookDeployV2({
        applicationId: appId,
        version: 'alpine',
        token: 'any-token',
      });

      expect(deployResponse.status).toBe(401); // Unauthorized
      expect(deployResponse.body.success).toBe(false);
    });

    it('应该支持通过 webhook 更新应用版本', async () => {
      const containerName = generateTestContainerName();
      const testPort = generateTestPort();
      
      // 预注册应用
      const appData = {
        name: containerName,
        image: 'nginx',
        ports: [{ host: testPort, container: 80 }],
        webhookEnabled: true,
      };

      const createResponse = await client.createApplication(appData);
      const appId = createResponse.body.data.id;
      const webhookToken = createResponse.body.data.webhookToken;

      // 第一次部署 (alpine 版本)
      const deploy1 = await client.webhookDeployV2({
        applicationId: appId,
        version: 'alpine',
        token: webhookToken,
      });

      expect(deploy1.status).toBe(200);
      await wait(2000);

      // 第二次部署 (更新到 1.25-alpine 版本)
      const deploy2 = await client.webhookDeployV2({
        applicationId: appId,
        version: '1.25-alpine',
        token: webhookToken,
      });

      expect(deploy2.status).toBe(200);
      expect(deploy2.body.success).toBe(true);

      await wait(2000);

      // 验证容器仍在运行
      const running = await isContainerRunning(containerName);
      expect(running).toBe(true);

      // 清理
      await removeContainer(containerName);
    }, 90000);
  });

  describe('Deployment Logging (V2 新功能)', () => {
    it('应该记录 webhook 部署日志', async () => {
      const containerName = generateTestContainerName();
      const testPort = generateTestPort();
      
      // 预注册应用
      const appData = {
        name: containerName,
        image: 'nginx',
        ports: [{ host: testPort, container: 80 }],
        webhookEnabled: true,
      };

      const createResponse = await client.createApplication(appData);
      const appId = createResponse.body.data.id;
      const webhookToken = createResponse.body.data.webhookToken;

      // 部署应用
      const deployResponse = await client.webhookDeployV2({
        applicationId: appId,
        version: 'alpine',
        token: webhookToken,
      });

      expect(deployResponse.status).toBe(200);
      const deploymentId = deployResponse.body.deploymentId;

      await wait(2000);

      // 查询部署日志
      const logsResponse = await client.get(`/api/deployment-logs?applicationId=${appId}`);
      
      expect(logsResponse.status).toBe(200);
      expect(logsResponse.body.success).toBe(true);
      expect(Array.isArray(logsResponse.body.data)).toBe(true);
      
      // 应该能找到刚才的部署记录
      const deployLog = logsResponse.body.data.find((log: any) => log.deploymentId === deploymentId);
      expect(deployLog).toBeDefined();
      expect(deployLog.triggerType).toBe('webhook');
      expect(deployLog.status).toBe('success');

      // 清理
      await removeContainer(containerName);
    }, 60000);
  });
});

