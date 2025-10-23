import * as InfisicalSDK from '@infisical/sdk';
import { getDb } from './database';
import {
  SecretSyncRecord,
  getSecretSyncById,
  updateSecretSyncStatus,
} from './secretSyncStore';
import {
  getSecretByGroupAndName,
  createSecret,
  updateSecret,
  deleteSecret,
  getSecretValue,
} from './secretStore';

/**
 * 同步执行结果
 */
export interface SyncExecutionResult {
  success: boolean;
  syncId: number;
  syncName: string;
  targetGroupId: number;
  targetGroupName: string;
  created: number;
  updated: number;
  unchanged: number;
  deleted?: number;
  errors: Array<{ secretName: string; error: string }>;
  duration: number;
}

/**
 * 执行同步配置（统一入口，根据 sourceType 分发）
 */
export async function executeSecretSync(
  syncId: number
): Promise<SyncExecutionResult> {
  const startTime = Date.now();
  
  console.log(`[SecretSync] Executing sync ${syncId}`);
  
  // 1. 验证
  const sync = getSecretSyncById(syncId);
  if (!sync) {
    throw new Error(`Secret sync with id=${syncId} not found`);
  }
  
  if (!sync.enabled) {
    throw new Error(`Secret sync "${sync.name}" is disabled`);
  }
  
  console.log(`[SecretSync] Sync: ${sync.name}`);
  console.log(`[SecretSync] Source: ${sync.sourceType}, Target Group: ${sync.targetGroupName}`);
  console.log(`[SecretSync] Strategy: ${sync.syncStrategy}`);
  
  // 2. 更新状态为"同步中"
  updateSecretSyncStatus(syncId, 'in_progress');
  
  try {
    // 3. 根据 sourceType 获取远程秘钥
    let remoteSecrets: Record<string, string>;
    
    switch (sync.sourceType) {
      case 'infisical':
        remoteSecrets = await fetchFromInfisical(sync);
        break;
      
      // 未来可以扩展其他源
      // case 'aws-secrets-manager':
      //   remoteSecrets = await fetchFromAWS(sync);
      //   break;
      // case 'hashicorp-vault':
      //   remoteSecrets = await fetchFromVault(sync);
      //   break;
      
      default:
        throw new Error(`Unsupported source type: ${sync.sourceType}`);
    }
    
    console.log(`[SecretSync] Fetched ${Object.keys(remoteSecrets).length} secrets from ${sync.sourceType}`);
    
    // 4. 根据策略同步（策略处理与来源无关）
    let result: Omit<SyncExecutionResult, 'success' | 'duration'>;
    
    if (sync.syncStrategy === 'merge') {
      result = await mergeSecrets(sync, remoteSecrets);
    } else {
      result = await replaceSecrets(sync, remoteSecrets);
    }
    
    // 5. 更新状态为"成功"
    updateSecretSyncStatus(syncId, 'success');
    
    const duration = Date.now() - startTime;
    
    console.log(`[SecretSync] ✅ Completed in ${duration}ms`);
    console.log(`[SecretSync] Created: ${result.created}, Updated: ${result.updated}, Unchanged: ${result.unchanged}`);
    
    return {
      success: true,
      ...result,
      duration
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[SecretSync] ❌ Failed:`, errorMessage);
    
    // 更新状态为"失败"
    updateSecretSyncStatus(syncId, 'failed', errorMessage);
    
    const duration = Date.now() - startTime;
    
    return {
      success: false,
      syncId: sync.id,
      syncName: sync.name,
      targetGroupId: sync.targetGroupId,
      targetGroupName: sync.targetGroupName || 'Unknown',
      created: 0,
      updated: 0,
      unchanged: 0,
      errors: [{ secretName: 'sync', error: errorMessage }],
      duration
    };
  }
}

/**
 * 从 Infisical 获取秘钥
 */
async function fetchFromInfisical(
  sync: SecretSyncRecord
): Promise<Record<string, string>> {
  const config = sync.sourceConfig;
  
  console.log(`[SecretSync] Connecting to Infisical: ${config.siteUrl || 'https://app.infisical.com'}`);
  
  const client = new (InfisicalSDK as any)({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    siteUrl: config.siteUrl,
  });

  // 批量获取
  const secretsResponse = await client.listSecrets({
    projectId: config.projectId,
    environment: config.environment,
    path: config.path || '/',
  });

  const secrets: Record<string, string> = {};
  for (const secret of secretsResponse) {
    if (secret.secretKey && secret.secretValue) {
      secrets[secret.secretKey] = secret.secretValue;
    }
  }

  return secrets;
}

/**
 * 合并策略
 */
async function mergeSecrets(
  sync: SecretSyncRecord,
  remoteSecrets: Record<string, string>
): Promise<Omit<SyncExecutionResult, 'success' | 'duration'>> {
  const db = getDb();
  const groupId = sync.targetGroupId;
  
  // 获取本地秘钥
  const existingSecrets = db.prepare(`
    SELECT id, name, source, value
    FROM secrets
    WHERE group_id = ?
  `).all(groupId) as Array<{
    id: number;
    name: string;
    source: string;
    value: string;
  }>;
  
  const existingMap = new Map(existingSecrets.map(s => [s.name, s]));
  
  const results = {
    syncId: sync.id,
    syncName: sync.name,
    targetGroupId: groupId,
    targetGroupName: sync.targetGroupName || 'Unknown',
    created: 0,
    updated: 0,
    unchanged: 0,
    errors: [] as Array<{ secretName: string; error: string }>
  };
  
  // 遍历远程秘钥
  for (const [name, value] of Object.entries(remoteSecrets)) {
    try {
      const existing = existingMap.get(name);
      
      if (existing) {
        if (existing.source === 'synced') {
          // 检查值是否变化
          try {
            const currentValue = getSecretValue(existing.id);
            
            if (currentValue !== value) {
              console.log(`[SecretSync] Updating: ${name}`);
              updateSecret(existing.id, { value });
              
              // 更新同步时间和来源
              db.prepare(`
                UPDATE secrets 
                SET last_synced_at = datetime('now'),
                    synced_from_provider_id = ?
                WHERE id = ?
              `).run(sync.id, existing.id);
              
              results.updated++;
            } else {
              console.log(`[SecretSync] Unchanged: ${name}`);
              db.prepare(
                'UPDATE secrets SET last_synced_at = datetime("now") WHERE id = ?'
              ).run(existing.id);
              results.unchanged++;
            }
          } catch (error) {
            console.error(`[SecretSync] Failed to process ${name}:`, error);
            results.errors.push({
              secretName: name,
              error: 'Failed to process existing secret'
            });
          }
        } else {
          // 手动创建的，跳过
          console.log(`[SecretSync] Skipping manual secret: ${name}`);
          results.unchanged++;
        }
      } else {
        // 创建新秘钥
        console.log(`[SecretSync] Creating: ${name}`);
        createSecret({
          groupId,
          name,
          value,
          source: 'synced',
        });
        
        // 更新同步时间和来源
        db.prepare(`
          UPDATE secrets 
          SET last_synced_at = datetime('now'),
              synced_from_provider_id = ?
          WHERE group_id = ? AND name = ?
        `).run(sync.id, groupId, name);
        
        results.created++;
      }
    } catch (error) {
      console.error(`[SecretSync] Error processing ${name}:`, error);
      results.errors.push({
        secretName: name,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  return results;
}

/**
 * 替换策略
 */
async function replaceSecrets(
  sync: SecretSyncRecord,
  remoteSecrets: Record<string, string>
): Promise<Omit<SyncExecutionResult, 'success' | 'duration'>> {
  const db = getDb();
  const groupId = sync.targetGroupId;
  
  const results = {
    syncId: sync.id,
    syncName: sync.name,
    targetGroupId: groupId,
    targetGroupName: sync.targetGroupName || 'Unknown',
    created: 0,
    updated: 0,
    unchanged: 0,
    deleted: 0,
    errors: [] as Array<{ secretName: string; error: string }>
  };
  
  // 1. 删除所有同步来的秘钥
  const syncedSecrets = db.prepare(`
    SELECT id, name
    FROM secrets
    WHERE group_id = ? AND source = 'synced'
  `).all(groupId) as Array<{ id: number; name: string }>;
  
  for (const secret of syncedSecrets) {
    try {
      // 检查是否被引用
      const refCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM environment_variables
        WHERE secret_id = ?
      `).get(secret.id) as { count: number };
      
      if (refCount.count > 0) {
        console.warn(`[SecretSync] Cannot delete ${secret.name}: referenced`);
        results.errors.push({
          secretName: secret.name,
          error: `Referenced by ${refCount.count} env var(s)`
        });
      } else {
        console.log(`[SecretSync] Deleting: ${secret.name}`);
        deleteSecret(secret.id);
        results.deleted++;
      }
    } catch (error) {
      results.errors.push({
        secretName: secret.name,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  // 2. 创建所有远程秘钥
  for (const [name, value] of Object.entries(remoteSecrets)) {
    try {
      // 检查是否有手动创建的同名秘钥
      const existing = getSecretByGroupAndName(groupId, name);
      
      if (existing && existing.source === 'manual') {
        console.log(`[SecretSync] Preserving manual: ${name}`);
        results.unchanged++;
        continue;
      }
      
      console.log(`[SecretSync] Creating: ${name}`);
      createSecret({
        groupId,
        name,
        value,
        source: 'synced',
      });
      
      // 更新同步时间和来源
      db.prepare(`
        UPDATE secrets 
        SET last_synced_at = datetime('now'),
            synced_from_provider_id = ?
        WHERE group_id = ? AND name = ?
      `).run(sync.id, groupId, name);
      
      results.created++;
    } catch (error) {
      results.errors.push({
        secretName: name,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  return results;
}

/**
 * 执行所有定时同步
 */
export async function executeScheduledSyncs(): Promise<SyncExecutionResult[]> {
  const { getScheduledSyncs } = require('./secretSyncStore');
  const syncs = getScheduledSyncs();
  
  if (syncs.length === 0) {
    console.log('[SecretSync] No scheduled syncs found');
    return [];
  }
  
  console.log(`[SecretSync] Executing ${syncs.length} scheduled sync(s)`);
  
  const results: SyncExecutionResult[] = [];
  
  for (const sync of syncs) {
    // 检查是否该同步了
    const now = Date.now();
    const lastSync = sync.lastSyncAt ? new Date(sync.lastSyncAt).getTime() : 0;
    const interval = (sync.scheduleInterval || 60) * 60 * 1000;  // 转换为毫秒
    
    if (now - lastSync >= interval) {
      try {
        const result = await executeSecretSync(sync.id);
        results.push(result);
      } catch (error) {
        console.error(`[SecretSync] Failed to execute ${sync.name}:`, error);
      }
    }
  }
  
  return results;
}

