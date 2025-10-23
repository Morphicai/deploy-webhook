import { Express } from 'express';
import { createApp } from '../setup/testAppFactory';
import { initializeTestDatabase, cleanTestDatabase } from '../setup/testDatabase';
import { ApiClient } from '../helpers/apiClient';
import { 
  TEST_AUTH, 
  generateTestContainerName,
  generateTestPort,
  wait 
} from '../helpers/fixtures';
import { 
  cleanupTestContainers, 
  removeContainer,
  isContainerRunning 
} from '../helpers/cleanup';

/**
 * 部署日志测试 (V2 新功能)
 */
describe('Deployment Logs (V2)', () => {
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

  describe('Deployment Log Recording', () => {
    it('应该记录 webhook 触发的部署日志', async () => {
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
      
      // 应该能找到部署记录
      const deployLog = logsResponse.body.data.find((log: any) => log.deploymentId === deploymentId);
      expect(deployLog).toBeDefined();
      expect(deployLog.triggerType).toBe('webhook');
      expect(deployLog.applicationId).toBe(appId);
      expect(deployLog.version).toBe('alpine');
      expect(deployLog.status).toBe('success');

      // 清理
      await removeContainer(containerName);
    }, 60000);

    it('应该记录失败的部署日志', async () => {
      const testPort = generateTestPort();
      
      // 预注册应用（使用不存在的镜像）
      const appData = {
        name: 'fail-app',
        image: 'nonexistent-image-xyz-123',
        ports: [{ host: testPort, container: 80 }],
        webhookEnabled: true,
      };

      const createResponse = await client.createApplication(appData);
      const appId = createResponse.body.data.id;
      const webhookToken = createResponse.body.data.webhookToken;

      // 尝试部署应用（应该失败）
      const deployResponse = await client.webhookDeployV2({
        applicationId: appId,
        version: 'latest',
        token: webhookToken,
      });

      // 等待失败处理
      await wait(2000);

      // 查询部署日志
      const logsResponse = await client.get(`/api/deployment-logs?applicationId=${appId}`);
      
      expect(logsResponse.status).toBe(200);
      
      // 应该能找到失败的部署记录
      const failedLogs = logsResponse.body.data.filter(
        (log: any) => log.status === 'failed'
      );
      expect(failedLogs.length).toBeGreaterThan(0);
      
      const latestFailLog = failedLogs[0];
      expect(latestFailLog.triggerType).toBe('webhook');
      expect(latestFailLog.errorMessage).toBeDefined();
    }, 60000);

    it('应该包含部署时长信息', async () => {
      const containerName = generateTestContainerName();
      const testPort = generateTestPort();
      
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
      await client.webhookDeployV2({
        applicationId: appId,
        version: 'alpine',
        token: webhookToken,
      });

      await wait(2000);

      // 查询部署日志
      const logsResponse = await client.get(`/api/deployment-logs?applicationId=${appId}`);
      const deployLog = logsResponse.body.data[0];

      expect(deployLog.durationMs).toBeDefined();
      expect(typeof deployLog.durationMs).toBe('number');
      expect(deployLog.durationMs).toBeGreaterThan(0);

      // 清理
      await removeContainer(containerName);
    }, 60000);
  });

  describe('Deployment Log Queries', () => {
    it('应该能够按应用ID查询部署日志', async () => {
      const testPort1 = generateTestPort();
      const testPort2 = generateTestPort();
      
      // 创建两个应用
      const app1Response = await client.createApplication({
        name: 'app-1',
        image: 'nginx',
        ports: [{ host: testPort1, container: 80 }],
        webhookEnabled: true,
      });
      const app1Id = app1Response.body.data.id;

      const app2Response = await client.createApplication({
        name: 'app-2',
        image: 'nginx',
        ports: [{ host: testPort2, container: 80 }],
        webhookEnabled: true,
      });
      const app2Id = app2Response.body.data.id;

      // 各部署一次
      await client.webhookDeployV2({
        applicationId: app1Id,
        version: 'alpine',
        token: app1Response.body.data.webhookToken,
      });

      await client.webhookDeployV2({
        applicationId: app2Id,
        version: 'alpine',
        token: app2Response.body.data.webhookToken,
      });

      await wait(2000);

      // 查询 app1 的部署日志
      const logsResponse = await client.get(`/api/deployment-logs?applicationId=${app1Id}`);
      
      expect(logsResponse.status).toBe(200);
      expect(logsResponse.body.data.every((log: any) => log.applicationId === app1Id)).toBe(true);

      // 清理
      await removeContainer('app-1');
      await removeContainer('app-2');
    }, 60000);

    it('应该能够获取所有部署日志', async () => {
      const testPort = generateTestPort();
      
      const appData = {
        name: 'test-app',
        image: 'nginx',
        ports: [{ host: testPort, container: 80 }],
        webhookEnabled: true,
      };

      const createResponse = await client.createApplication(appData);
      const appId = createResponse.body.data.id;
      const webhookToken = createResponse.body.data.webhookToken;

      // 部署多次
      await client.webhookDeployV2({
        applicationId: appId,
        version: 'alpine',
        token: webhookToken,
      });

      await wait(1000);

      await client.webhookDeployV2({
        applicationId: appId,
        version: '1.25-alpine',
        token: webhookToken,
      });

      await wait(2000);

      // 查询所有部署日志
      const logsResponse = await client.get('/api/deployment-logs');
      
      expect(logsResponse.status).toBe(200);
      expect(Array.isArray(logsResponse.body.data)).toBe(true);
      expect(logsResponse.body.data.length).toBeGreaterThanOrEqual(2);

      // 清理
      await removeContainer('test-app');
    }, 60000);

    it('应该按时间倒序返回部署日志', async () => {
      const testPort = generateTestPort();
      
      const appData = {
        name: 'time-order-app',
        image: 'nginx',
        ports: [{ host: testPort, container: 80 }],
        webhookEnabled: true,
      };

      const createResponse = await client.createApplication(appData);
      const appId = createResponse.body.data.id;
      const webhookToken = createResponse.body.data.webhookToken;

      // 部署多次
      await client.webhookDeployV2({
        applicationId: appId,
        version: 'alpine',
        token: webhookToken,
      });

      await wait(1000);

      await client.webhookDeployV2({
        applicationId: appId,
        version: '1.25-alpine',
        token: webhookToken,
      });

      await wait(2000);

      // 查询部署日志
      const logsResponse = await client.get(`/api/deployment-logs?applicationId=${appId}`);
      const logs = logsResponse.body.data;
      
      // 验证时间顺序（最新的在前）
      expect(logs.length).toBeGreaterThanOrEqual(2);
      const firstLogTime = new Date(logs[0].startedAt).getTime();
      const secondLogTime = new Date(logs[1].startedAt).getTime();
      expect(firstLogTime).toBeGreaterThanOrEqual(secondLogTime);

      // 清理
      await removeContainer('time-order-app');
    }, 60000);
  });

  describe('Deployment Log Details', () => {
    it('应该记录触发来源信息', async () => {
      const containerName = generateTestContainerName();
      const testPort = generateTestPort();
      
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
      await client.webhookDeployV2({
        applicationId: appId,
        version: 'alpine',
        token: webhookToken,
      });

      await wait(2000);

      // 查询部署日志
      const logsResponse = await client.get(`/api/deployment-logs?applicationId=${appId}`);
      const deployLog = logsResponse.body.data[0];

      expect(deployLog.triggerSource).toBeDefined();
      // 触发来源应该是 IP 地址或其他标识
      expect(typeof deployLog.triggerSource).toBe('string');

      // 清理
      await removeContainer(containerName);
    }, 60000);

    it('应该包含应用名称和镜像信息', async () => {
      const containerName = generateTestContainerName();
      const testPort = generateTestPort();
      
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
      await client.webhookDeployV2({
        applicationId: appId,
        version: 'alpine',
        token: webhookToken,
      });

      await wait(2000);

      // 查询部署日志
      const logsResponse = await client.get(`/api/deployment-logs?applicationId=${appId}`);
      const deployLog = logsResponse.body.data[0];

      expect(deployLog.applicationName).toBe(containerName);
      expect(deployLog.image).toBe('nginx');
      expect(deployLog.version).toBe('alpine');

      // 清理
      await removeContainer(containerName);
    }, 60000);

    it('应该记录部署唯一ID', async () => {
      const containerName = generateTestContainerName();
      const testPort = generateTestPort();
      
      const appData = {
        name: containerName,
        image: 'nginx',
        ports: [{ host: testPort, container: 80 }],
        webhookEnabled: true,
      };

      const createResponse = await client.createApplication(appData);
      const appId = createResponse.body.data.id;
      const webhookToken = createResponse.body.data.webhookToken;

      // 部署两次
      const deploy1 = await client.webhookDeployV2({
        applicationId: appId,
        version: 'alpine',
        token: webhookToken,
      });

      await wait(1000);

      const deploy2 = await client.webhookDeployV2({
        applicationId: appId,
        version: '1.25-alpine',
        token: webhookToken,
      });

      await wait(2000);

      // 查询部署日志
      const logsResponse = await client.get(`/api/deployment-logs?applicationId=${appId}`);
      const logs = logsResponse.body.data;

      expect(logs.length).toBeGreaterThanOrEqual(2);
      
      // 每次部署应该有唯一的 deploymentId
      const deploymentIds = logs.map((log: any) => log.deploymentId);
      const uniqueIds = new Set(deploymentIds);
      expect(uniqueIds.size).toBe(deploymentIds.length);

      // 清理
      await removeContainer(containerName);
    }, 90000);
  });

  describe('Authentication', () => {
    it('应该拒绝未认证的部署日志访问', async () => {
      client.clearAuthToken();
      
      const response = await client.get('/api/deployment-logs');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});

