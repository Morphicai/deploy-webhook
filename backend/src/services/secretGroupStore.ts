import { z } from 'zod';
import { getDb } from './database';

/**
 * 秘钥分组记录
 */
export interface SecretGroupRecord {
  id: number;
  name: string;
  description: string | null;
  providerId: number | null;
  autoSync: boolean;
  syncEnabled: boolean;
  syncPath: string;
  syncStrategy: 'merge' | 'replace';
  createdAt: string;
  updatedAt: string;
}

/**
 * 秘钥分组输入验证
 */
const secretGroupSchema = z.object({
  name: z.string().min(2).max(128),
  description: z.string().max(512).optional(),
  providerId: z.number().int().positive().nullable().optional(),
  autoSync: z.boolean().optional(),
});

type SecretGroupInput = z.infer<typeof secretGroupSchema>;

/**
 * 映射数据库行到接口
 */
function mapRow(row: any): SecretGroupRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    providerId: row.provider_id,
    autoSync: Boolean(row.auto_sync),
    syncEnabled: Boolean(row.sync_enabled),
    syncPath: row.sync_path || '/',
    syncStrategy: (row.sync_strategy || 'merge') as 'merge' | 'replace',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 列出所有秘钥分组
 */
export function listSecretGroups(): SecretGroupRecord[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, name, description, provider_id, auto_sync, sync_enabled, sync_path, sync_strategy, created_at, updated_at
    FROM secret_groups
    ORDER BY id ASC
  `).all();
  return rows.map(mapRow);
}

/**
 * 根据 ID 获取秘钥分组
 */
export function getSecretGroupById(id: number): SecretGroupRecord | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT id, name, description, provider_id, auto_sync, sync_enabled, sync_path, sync_strategy, created_at, updated_at
    FROM secret_groups
    WHERE id = ?
  `).get(id);
  return row ? mapRow(row) : null;
}

/**
 * 根据名称获取秘钥分组
 */
export function getSecretGroupByName(name: string): SecretGroupRecord | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT id, name, description, provider_id, auto_sync, sync_enabled, sync_path, sync_strategy, created_at, updated_at
    FROM secret_groups
    WHERE name = ?
  `).get(name);
  return row ? mapRow(row) : null;
}

/**
 * 获取与提供者关联的秘钥分组
 */
export function getSecretGroupsByProviderId(providerId: number): SecretGroupRecord[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, name, description, provider_id, auto_sync, created_at, updated_at
    FROM secret_groups
    WHERE provider_id = ?
    ORDER BY id ASC
  `).all(providerId);
  return rows.map(mapRow);
}

/**
 * 获取启用自动同步的秘钥分组
 */
export function getAutoSyncSecretGroups(): SecretGroupRecord[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, name, description, provider_id, auto_sync, created_at, updated_at
    FROM secret_groups
    WHERE auto_sync = 1
    ORDER BY id ASC
  `).all();
  return rows.map(mapRow);
}

/**
 * 创建秘钥分组
 */
export function createSecretGroup(input: SecretGroupInput): SecretGroupRecord {
  const parsed = secretGroupSchema.parse(input);
  const db = getDb();
  
  // 检查名称是否已存在
  const existing = getSecretGroupByName(parsed.name);
  if (existing) {
    throw new Error(`Secret group with name "${parsed.name}" already exists`);
  }
  
  // 如果指定了 providerId，验证提供者是否存在
  if (parsed.providerId) {
    const providerExists = db.prepare('SELECT id FROM secret_providers WHERE id = ?').get(parsed.providerId);
    if (!providerExists) {
      throw new Error(`Secret provider with id=${parsed.providerId} not found`);
    }
  }
  
  const stmt = db.prepare(`
    INSERT INTO secret_groups (name, description, provider_id, auto_sync)
    VALUES (?, ?, ?, ?)
  `);
  
  const info = stmt.run(
    parsed.name,
    parsed.description || null,
    parsed.providerId || null,
    parsed.autoSync ? 1 : 0
  );
  
  const created = getSecretGroupById(Number(info.lastInsertRowid));
  if (!created) throw new Error('Failed to create secret group');
  return created;
}

/**
 * 更新秘钥分组
 */
export function updateSecretGroup(id: number, input: Partial<SecretGroupInput>): SecretGroupRecord {
  const db = getDb();
  const current = getSecretGroupById(id);
  if (!current) throw new Error(`Secret group with id=${id} not found`);
  
  // 不允许修改 default 分组的名称
  if (current.name === 'default' && input.name && input.name !== 'default') {
    throw new Error('Cannot rename the default secret group');
  }
  
  const updates: string[] = [];
  const values: any[] = [];
  
  if (input.name !== undefined) {
    // 检查新名称是否与其他分组冲突
    const existing = getSecretGroupByName(input.name);
    if (existing && existing.id !== id) {
      throw new Error(`Secret group with name "${input.name}" already exists`);
    }
    updates.push('name = ?');
    values.push(input.name);
  }
  
  if (input.description !== undefined) {
    updates.push('description = ?');
    values.push(input.description || null);
  }
  
  if (input.providerId !== undefined) {
    if (input.providerId !== null) {
      const providerExists = db.prepare('SELECT id FROM secret_providers WHERE id = ?').get(input.providerId);
      if (!providerExists) {
        throw new Error(`Secret provider with id=${input.providerId} not found`);
      }
    }
    updates.push('provider_id = ?');
    values.push(input.providerId || null);
  }
  
  if (input.autoSync !== undefined) {
    updates.push('auto_sync = ?');
    values.push(input.autoSync ? 1 : 0);
  }
  
  if (updates.length === 0) return current;
  
  values.push(id);
  db.prepare(`UPDATE secret_groups SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  
  const updated = getSecretGroupById(id);
  if (!updated) throw new Error('Failed to update secret group');
  return updated;
}

/**
 * 删除秘钥分组
 */
export function deleteSecretGroup(id: number): void {
  const db = getDb();
  const group = getSecretGroupById(id);
  if (!group) throw new Error(`Secret group with id=${id} not found`);
  
  // 不允许删除 default 分组
  if (group.name === 'default') {
    throw new Error('Cannot delete the default secret group');
  }
  
  // 检查是否有秘钥属于该分组
  const secretCount = db.prepare('SELECT COUNT(*) as count FROM secrets WHERE group_id = ?').get(id) as { count: number };
  if (secretCount.count > 0) {
    throw new Error(`Cannot delete secret group: ${secretCount.count} secrets belong to this group. Please delete or move the secrets first.`);
  }
  
  db.prepare('DELETE FROM secret_groups WHERE id = ?').run(id);
}

/**
 * 获取分组的统计信息
 */
export interface SecretGroupStats {
  id: number;
  name: string;
  description: string | null;
  providerId: number | null;
  autoSync: boolean;
  secretsCount: number;
  manualSecretsCount: number;
  syncedSecretsCount: number;
  createdAt: string;
  updatedAt: string;
}

export function getSecretGroupStats(id: number): SecretGroupStats | null {
  const db = getDb();
  const group = getSecretGroupById(id);
  if (!group) return null;
  
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN source = 'manual' THEN 1 ELSE 0 END) as manual,
      SUM(CASE WHEN source = 'synced' THEN 1 ELSE 0 END) as synced
    FROM secrets
    WHERE group_id = ?
  `).get(id) as { total: number; manual: number; synced: number };
  
  return {
    ...group,
    secretsCount: stats.total,
    manualSecretsCount: stats.manual,
    syncedSecretsCount: stats.synced,
  };
}

/**
 * 获取所有分组的统计信息
 */
export function getAllSecretGroupsStats(): SecretGroupStats[] {
  const groups = listSecretGroups();
  return groups.map(group => {
    const stats = getSecretGroupStats(group.id);
    return stats!;
  });
}

/**
 * 更新秘钥分组的同步状态
 * 这是一个简化的占位函数，实际同步状态应该在 secret_syncs 表中跟踪
 */
export function updateSecretGroupSyncStatus(
  groupId: number,
  status: 'success' | 'failed' | 'in_progress',
  errorMessage?: string
): void {
  // 占位实现 - 实际应该更新相关的同步记录
  console.log(`[SecretGroupStore] Sync status for group ${groupId}: ${status}`, errorMessage);
}

