import { Express } from 'express';
import { createApp } from '../setup/testAppFactory';
import { initializeTestDatabase, cleanTestDatabase } from '../setup/testDatabase';
import { ApiClient } from '../helpers/apiClient';
import { TEST_AUTH, createTestSecret, createTestEnvVar } from '../helpers/fixtures';

/**
 * 秘钥和环境变量测试
 */
describe('Secrets & Environment Variables', () => {
  let app: Express;
  let client: ApiClient;

  beforeAll(async () => {
    initializeTestDatabase();
    app = createApp();
    client = new ApiClient(app, TEST_AUTH.adminToken);
  });

  beforeEach(async () => {
    cleanTestDatabase();
    initializeTestDatabase();
  });

  describe('Secrets Management', () => {
    it('应该成功创建秘钥', async () => {
      const secretData = createTestSecret({
        name: 'test-db-password',
        provider: 'file',
        reference: '/secrets/db-password',
      });

      const response = await client.createSecret(secretData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(secretData.name);
    });

    it('应该能够获取秘钥列表', async () => {
      // 创建几个秘钥
      await client.createSecret(createTestSecret({ name: 'secret-1' }));
      await client.createSecret(createTestSecret({ name: 'secret-2' }));

      const response = await client.listSecrets();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('应该能够更新秘钥', async () => {
      // 创建秘钥
      const createResponse = await client.createSecret(
        createTestSecret({ name: 'test-secret' })
      );
      const secretId = createResponse.body.data.id;

      // 更新秘钥
      const updateResponse = await client.put(`/api/secrets/${secretId}`, {
        reference: '/new/path/to/secret',
      });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.reference).toBe('/new/path/to/secret');
    });

    it('应该能够删除秘钥', async () => {
      // 创建秘钥
      const createResponse = await client.createSecret(
        createTestSecret({ name: 'test-secret' })
      );
      const secretId = createResponse.body.data.id;

      // 删除秘钥
      const deleteResponse = await client.delete(`/api/secrets/${secretId}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      // 验证秘钥已被删除
      const listResponse = await client.listSecrets();
      expect(listResponse.body.data).toHaveLength(0);
    });

    it('应该拒绝重复的秘钥名称', async () => {
      // 创建第一个秘钥
      await client.createSecret(createTestSecret({ name: 'duplicate-secret' }));

      // 尝试创建同名秘钥
      const response = await client.createSecret(
        createTestSecret({ name: 'duplicate-secret' })
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Environment Variables', () => {
    it('应该成功创建全局环境变量', async () => {
      const envData = createTestEnvVar({
        scope: 'global',
        key: 'GLOBAL_VAR',
        value: 'global-value',
      });

      const response = await client.createEnvVar(envData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.key).toBe(envData.key);
      expect(response.body.data.value).toBe(envData.value);
    });

    it('应该成功创建项目环境变量', async () => {
      const envData = createTestEnvVar({
        scope: 'project',
        projectName: 'test-app',
        key: 'PROJECT_VAR',
        value: 'project-value',
      });

      const response = await client.createEnvVar(envData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.scope).toBe('project');
      expect(response.body.data.projectName).toBe('test-app');
    });

    it('应该能够获取环境变量列表', async () => {
      // 创建多个环境变量
      await client.createEnvVar(createTestEnvVar({ key: 'VAR_1', value: 'value1' }));
      await client.createEnvVar(createTestEnvVar({ key: 'VAR_2', value: 'value2' }));

      const response = await client.listEnvVars();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('应该能够按 scope 过滤环境变量', async () => {
      // 创建全局和项目变量
      await client.createEnvVar(createTestEnvVar({ 
        scope: 'global', 
        key: 'GLOBAL_VAR' 
      }));
      await client.createEnvVar(createTestEnvVar({ 
        scope: 'project', 
        projectName: 'test-app',
        key: 'PROJECT_VAR' 
      }));

      const response = await client.listEnvVars('global');

      expect(response.status).toBe(200);
      expect(response.body.data.every((v: any) => v.scope === 'global')).toBe(true);
    });

    it('应该能够按项目名称过滤环境变量', async () => {
      await client.createEnvVar(createTestEnvVar({ 
        scope: 'project', 
        projectName: 'app-1',
        key: 'VAR_1' 
      }));
      await client.createEnvVar(createTestEnvVar({ 
        scope: 'project', 
        projectName: 'app-2',
        key: 'VAR_2' 
      }));

      const response = await client.listEnvVars('project', 'app-1');

      expect(response.status).toBe(200);
      expect(response.body.data.every((v: any) => v.projectName === 'app-1')).toBe(true);
    });

    it('应该能够更新环境变量', async () => {
      // 创建环境变量
      const createResponse = await client.createEnvVar(
        createTestEnvVar({ key: 'UPDATE_VAR', value: 'old-value' })
      );
      const varId = createResponse.body.data.id;

      // 更新
      const updateResponse = await client.put(`/api/env/${varId}`, {
        value: 'new-value',
      });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.value).toBe('new-value');
    });

    it('应该能够删除环境变量', async () => {
      // 创建环境变量
      const createResponse = await client.createEnvVar(
        createTestEnvVar({ key: 'DELETE_VAR' })
      );
      const varId = createResponse.body.data.id;

      // 删除
      const deleteResponse = await client.delete(`/api/env/${varId}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);
    });

    it('应该支持环境变量的 upsert 操作', async () => {
      const envData = createTestEnvVar({ 
        scope: 'global', 
        key: 'UPSERT_VAR', 
        value: 'initial-value' 
      });

      // 第一次创建
      const response1 = await client.createEnvVar(envData);
      expect(response1.status).toBe(201);

      // 第二次应该更新（upsert）
      const response2 = await client.createEnvVar({
        ...envData,
        value: 'updated-value',
      });

      // 根据实际实现，可能返回 200 或 201
      expect([200, 201]).toContain(response2.status);
      
      // 验证值已更新
      const listResponse = await client.listEnvVars();
      const variable = listResponse.body.data.find((v: any) => v.key === 'UPSERT_VAR');
      expect(variable.value).toBe('updated-value');
    });
  });

  describe('Environment Variable Priority', () => {
    it('应该正确处理环境变量优先级（项目覆盖全局）', async () => {
      // 创建全局变量
      await client.createEnvVar(createTestEnvVar({
        scope: 'global',
        key: 'PRIORITY_VAR',
        value: 'global-value',
      }));

      // 创建同名的项目变量
      await client.createEnvVar(createTestEnvVar({
        scope: 'project',
        projectName: 'test-app',
        key: 'PRIORITY_VAR',
        value: 'project-value',
      }));

      // 获取项目的环境变量（应该是项目值）
      const response = await client.listEnvVars('project', 'test-app');
      const projectVar = response.body.data.find((v: any) => v.key === 'PRIORITY_VAR');
      
      expect(projectVar.value).toBe('project-value');
    });
  });

  describe('Authentication', () => {
    it('应该拒绝未认证的秘钥访问', async () => {
      client.clearAuthToken();
      
      const response = await client.listSecrets();

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('应该拒绝未认证的环境变量访问', async () => {
      client.clearAuthToken();
      
      const response = await client.listEnvVars();

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});

