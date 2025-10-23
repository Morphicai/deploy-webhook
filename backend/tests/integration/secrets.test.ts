import { Express } from 'express';
import { createApp } from '../setup/testAppFactory';
import { initializeTestDatabase, cleanTestDatabase } from '../setup/testDatabase';
import { ApiClient } from '../helpers/apiClient';
import { TEST_AUTH, createTestSecret, createTestSecretGroup, createTestEnvVar } from '../helpers/fixtures';

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

  // 清理测试数据
  afterEach(async () => {
    const { getDb } = require('../../dist/services/database');
    const db = getDb();
    
    // 强制 WAL checkpoint
    db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    
    // 清空所有表
    db.exec('PRAGMA foreign_keys = OFF');
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%'
    `).all();
    
    for (const table of tables) {
      db.prepare(`DELETE FROM ${(table as any).name}`).run();
    }
    db.exec('PRAGMA foreign_keys = ON');
    db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  });

  describe('Secrets Management (V2)', () => {
    it('应该成功创建秘钥（手动创建，加密存储）', async () => {
      // 先创建秘钥分组
      const groupResponse = await client.post('/api/secret-groups', 
        createTestSecretGroup({ name: 'test-group-create' })
      );
      const groupId = groupResponse.body.data.id;

      const secretData = createTestSecret({
        groupId,
        name: 'test-db-password',
        value: 'my-super-secret-password-123',
        source: 'manual',
      });

      const response = await client.createSecret(secretData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(secretData.name);
      expect(response.body.data.source).toBe('manual');
      // 注意：返回的 value 应该是加密后的值，不应该等于原始值
      expect(response.body.data.value).not.toBe(secretData.value);
    });

    it('应该能够获取秘钥列表', async () => {
      // 先创建秘钥分组
      const groupResponse = await client.post('/api/secret-groups', 
        createTestSecretGroup({ name: 'test-group-list' })
      );
      const groupId = groupResponse.body.data.id;

      // 创建几个秘钥
      await client.createSecret(createTestSecret({ groupId, name: 'secret-1' }));
      await client.createSecret(createTestSecret({ groupId, name: 'secret-2' }));

      const response = await client.listSecrets();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('应该能够更新秘钥（V2 - 支持更新值）', async () => {
      // 先创建秘钥分组
      const groupResponse = await client.post('/api/secret-groups', 
        createTestSecretGroup({ name: 'test-group-update' })
      );
      const groupId = groupResponse.body.data.id;

      // 创建秘钥
      const createResponse = await client.createSecret(
        createTestSecret({ groupId, name: 'test-secret', value: 'old-value' })
      );
      const secretId = createResponse.body.data.id;

      // 更新秘钥值
      const updateResponse = await client.put(`/api/secrets/${secretId}`, {
        value: 'new-secret-value-456',
      });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.success).toBe(true);
      // V2: 所有秘钥值都是加密存储，无需 valueType 字段
      // 验证值已更新（加密后的值应该不同）
      expect(updateResponse.body.data.value).not.toBe(createResponse.body.data.value);
    });

    it('应该能够删除秘钥', async () => {
      // 先创建秘钥分组
      const groupResponse = await client.post('/api/secret-groups', 
        createTestSecretGroup({ name: 'test-group-delete' })
      );
      const groupId = groupResponse.body.data.id;

      // 创建秘钥
      const createResponse = await client.createSecret(
        createTestSecret({ groupId, name: 'test-secret' })
      );
      const secretId = createResponse.body.data.id;

      // 删除秘钥
      const deleteResponse = await client.delete(`/api/secrets/${secretId}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      // 验证秘钥已被删除（通过 groupId 过滤）
      const listResponse = await client.get(`/api/secrets?groupId=${groupId}`);
      expect(listResponse.body.data).toHaveLength(0);
    });

    it('应该拒绝重复的秘钥名称', async () => {
      // 先创建秘钥分组
      const groupResponse = await client.post('/api/secret-groups', 
        createTestSecretGroup({ name: 'test-group-duplicate' })
      );
      const groupId = groupResponse.body.data.id;

      // 创建第一个秘钥
      await client.createSecret(createTestSecret({ groupId, name: 'duplicate-secret' }));

      // 尝试创建同名秘钥
      const response = await client.createSecret(
        createTestSecret({ groupId, name: 'duplicate-secret' })
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Secret Groups (V2 新功能)', () => {
    it('应该成功创建秘钥分组', async () => {
      const groupData = createTestSecretGroup({
        name: 'database-secrets',
        description: 'Database connection secrets',
      });

      const response = await client.post('/api/secret-groups', groupData);

      expect(response.status).toBe(201);  // 创建资源返回 201
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(groupData.name);
    });

    it('应该能够获取秘钥分组列表', async () => {
      // 使用唯一名称避免测试冲突
      const timestamp = Date.now();
      
      // 创建几个分组
      await client.post('/api/secret-groups', createTestSecretGroup({ name: `list-group-1-${timestamp}` }));
      await client.post('/api/secret-groups', createTestSecretGroup({ name: `list-group-2-${timestamp}` }));

      const response = await client.get('/api/secret-groups');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      
      // 验证我们创建的两个分组都在列表中
      const groupNames = response.body.data.map((g: any) => g.name);
      expect(groupNames).toContain(`list-group-1-${timestamp}`);
      expect(groupNames).toContain(`list-group-2-${timestamp}`);
    });

    it('应该能够将秘钥关联到分组', async () => {
      // 创建分组
      const groupResponse = await client.post('/api/secret-groups', 
        createTestSecretGroup({ name: 'db-group' })
      );
      const groupId = groupResponse.body.data.id;

      // 创建秘钥并关联到分组
      const secretData = createTestSecret({
        name: 'db-password',
        value: 'password123',
        groupId: groupId,
      });

      const secretResponse = await client.createSecret(secretData);

      expect(secretResponse.status).toBe(201);
      expect(secretResponse.body.success).toBe(true);
      expect(secretResponse.body.data.groupId).toBe(groupId);
    });

    it('应该能够按分组过滤秘钥', async () => {
      // 使用唯一名称避免测试冲突
      const timestamp = Date.now();
      
      // 创建分组
      const group1Response = await client.post('/api/secret-groups', 
        createTestSecretGroup({ name: `filter-group-1-${timestamp}` })
      );
      expect(group1Response.status).toBe(201);
      const group1Id = group1Response.body.data.id;

      const group2Response = await client.post('/api/secret-groups', 
        createTestSecretGroup({ name: `filter-group-2-${timestamp}` })
      );
      expect(group2Response.status).toBe(201);
      const group2Id = group2Response.body.data.id;

      // 创建秘钥到不同分组
      await client.createSecret(createTestSecret({ name: 'secret-1', groupId: group1Id }));
      await client.createSecret(createTestSecret({ name: 'secret-2', groupId: group1Id }));
      await client.createSecret(createTestSecret({ name: 'secret-3', groupId: group2Id }));

      // 查询 group-1 的秘钥
      const response = await client.get(`/api/secrets?groupId=${group1Id}`);

      expect(response.status).toBe(200);
      expect(response.body.data.every((s: any) => s.groupId === group1Id)).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('应该拒绝删除有关联秘钥的分组', async () => {
      // 创建分组
      const groupResponse = await client.post('/api/secret-groups', 
        createTestSecretGroup({ name: 'protected-group' })
      );
      const groupId = groupResponse.body.data.id;

      // 创建秘钥关联到分组
      await client.createSecret(createTestSecret({ 
        name: 'linked-secret', 
        groupId: groupId 
      }));

      // 尝试删除分组
      const deleteResponse = await client.delete(`/api/secret-groups/${groupId}`);

      expect(deleteResponse.status).toBe(409); // Conflict
      expect(deleteResponse.body.success).toBe(false);
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

  describe('Environment Variables with Secret References (V2 新功能)', () => {
    it('应该支持环境变量引用秘钥', async () => {
      // 先创建秘钥分组
      const groupResponse = await client.post('/api/secret-groups', 
        createTestSecretGroup({ name: 'test-group-env-ref' })
      );
      const groupId = groupResponse.body.data.id;

      // 创建秘钥
      const secretResponse = await client.createSecret(createTestSecret({
        groupId,
        name: 'db-password',
        value: 'super-secret-password-123',
      }));
      const secretId = secretResponse.body.data.id;

      // 创建环境变量引用秘钥
      const envData = createTestEnvVar({
        scope: 'global',
        key: 'DATABASE_PASSWORD',
        valueType: 'secret_ref',
        secretId: secretId,
      });

      const response = await client.createEnvVar(envData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.valueType).toBe('secret_ref');
      expect(response.body.data.secretId).toBe(secretId);
      // V2: 引用秘钥的环境变量，value 字段应该为 null
      expect(response.body.data.value).toBeNull();
    });

    it('应该能够查询引用秘钥的环境变量', async () => {
      // 先创建秘钥分组
      const groupResponse = await client.post('/api/secret-groups', 
        createTestSecretGroup({ name: 'test-group-env-query' })
      );
      const groupId = groupResponse.body.data.id;

      // 创建秘钥
      const secretResponse = await client.createSecret(createTestSecret({
        groupId,
        name: 'api-key',
        value: 'api-key-value-456',
      }));
      const secretId = secretResponse.body.data.id;

      // 创建引用秘钥的环境变量
      await client.createEnvVar(createTestEnvVar({
        key: 'API_KEY',
        valueType: 'secret_ref',
        secretId: secretId,
      }));

      // 查询环境变量
      const response = await client.listEnvVars();
      const apiKeyVar = response.body.data.find((v: any) => v.key === 'API_KEY');

      expect(apiKeyVar).toBeDefined();
      expect(apiKeyVar.valueType).toBe('secret_ref');
      expect(apiKeyVar.secretId).toBe(secretId);
    });

    it('应该拒绝创建引用不存在秘钥的环境变量', async () => {
      const envData = createTestEnvVar({
        key: 'INVALID_SECRET_REF',
        valueType: 'secret_ref',
        secretId: 99999, // 不存在的秘钥ID
      });

      const response = await client.createEnvVar(envData);

      // 应该失败（外键约束）
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
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

