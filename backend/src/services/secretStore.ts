import { z } from 'zod';
import { getDb } from './database';
import { encryptSecret, decryptSecret, getSecretPreview } from '../utils/encryption';
import { getSecretGroupById } from './secretGroupStore';

/**
 * 秘钥来源
 */
export type SecretSource = 'manual' | 'synced';

/**
 * 秘钥记录（完整，包含加密的值）
 */
export interface SecretRecord {
  id: number;
  name: string;
  groupId: number;
  value: string;                    // 加密后的值
  description: string | null;
  source: SecretSource;
  providerId: number | null;
  providerReference: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 秘钥摘要（用于列表展示，不包含实际值）
 */
export interface SecretSummary {
  id: number;
  name: string;
  groupId: number;
  groupName: string;
  hasValue: boolean;
  valuePreview: string;             // 值的预览（隐藏敏感部分）
  description: string | null;
  source: SecretSource;
  providerId: number | null;
  providerName: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 秘钥输入验证
 */
const secretSchema = z.object({
  name: z.string().min(1).max(128),
  groupId: z.number().int().positive(),
  value: z.string().min(1).max(10240),   // 最大 10KB
  description: z.string().max(512).optional(),
  source: z.enum(['manual', 'synced']).optional(),
  providerId: z.number().int().positive().nullable().optional(),
  providerReference: z.string().max(512).optional(),
});

type SecretInput = z.infer<typeof secretSchema>;

/**
 * 映射数据库行到接口
 */
function mapRow(row: any): SecretRecord {
  return {
    id: row.id,
    name: row.name,
    groupId: row.group_id,
    value: row.value,
    description: row.description,
    source: row.source as SecretSource,
    providerId: row.provider_id,
    providerReference: row.provider_reference,
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 映射到摘要（不包含实际值）
 */
function mapToSummary(record: SecretRecord, groupName: string, providerName: string | null): SecretSummary {
  let valuePreview = '****';
  try {
    const decrypted = decryptSecret(record.value);
    valuePreview = getSecretPreview(decrypted);
  } catch (error) {
    console.error(`[SecretStore] Failed to decrypt secret ${record.id} for preview`);
  }
  
  return {
    id: record.id,
    name: record.name,
    groupId: record.groupId,
    groupName,
    hasValue: Boolean(record.value),
    valuePreview,
    description: record.description,
    source: record.source,
    providerId: record.providerId,
    providerName,
    lastSyncedAt: record.lastSyncedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

/**
 * 列出所有秘钥（返回摘要）
 */
export function listSecrets(): SecretSummary[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT 
      s.id, s.name, s.group_id, s.value, s.description, s.source,
      s.provider_id, s.provider_reference, s.last_synced_at,
      s.created_at, s.updated_at,
      g.name as group_name,
      p.name as provider_name
    FROM secrets s
    LEFT JOIN secret_groups g ON s.group_id = g.id
    LEFT JOIN secret_providers p ON s.provider_id = p.id
    ORDER BY g.name, s.name
  `).all() as any[];
  
  return rows.map(row => {
    const record = mapRow(row);
    return mapToSummary(record, row.group_name, row.provider_name);
  });
}

/**
 * 列出指定分组的秘钥
 */
export function listSecretsByGroup(groupId: number): SecretSummary[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT 
      s.id, s.name, s.group_id, s.value, s.description, s.source,
      s.provider_id, s.provider_reference, s.last_synced_at,
      s.created_at, s.updated_at,
      g.name as group_name,
      p.name as provider_name
    FROM secrets s
    LEFT JOIN secret_groups g ON s.group_id = g.id
    LEFT JOIN secret_providers p ON s.provider_id = p.id
    WHERE s.group_id = ?
    ORDER BY s.name
  `).all(groupId) as any[];
  
  return rows.map(row => {
    const record = mapRow(row);
    return mapToSummary(record, row.group_name, row.provider_name);
  });
}

/**
 * 根据 ID 获取秘钥（完整，包含加密的值）
 */
export function getSecretById(id: number): SecretRecord | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT id, name, group_id, value, description, source,
           provider_id, provider_reference, last_synced_at,
           created_at, updated_at
    FROM secrets
    WHERE id = ?
  `).get(id);
  return row ? mapRow(row) : null;
}

/**
 * 根据分组和名称获取秘钥
 */
export function getSecretByGroupAndName(groupId: number, name: string): SecretRecord | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT id, name, group_id, value, description, source,
           provider_id, provider_reference, last_synced_at,
           created_at, updated_at
    FROM secrets
    WHERE group_id = ? AND name = ?
  `).get(groupId, name);
  return row ? mapRow(row) : null;
}

/**
 * 获取秘钥的解密值
 */
export function getSecretValue(id: number): string {
  const secret = getSecretById(id);
  if (!secret) {
    throw new Error(`Secret with id=${id} not found`);
  }
  
  try {
    return decryptSecret(secret.value);
  } catch (error) {
    console.error(`[SecretStore] Failed to decrypt secret ${id}:`, error);
    throw new Error('Failed to decrypt secret value');
  }
}

/**
 * 创建秘钥
 */
export function createSecret(input: SecretInput): SecretRecord {
  const parsed = secretSchema.parse(input);
  const db = getDb();
  
  // 验证分组是否存在
  const group = getSecretGroupById(parsed.groupId);
  if (!group) {
    throw new Error(`Secret group with id=${parsed.groupId} not found`);
  }
  
  // 检查分组内名称是否已存在
  const existing = getSecretByGroupAndName(parsed.groupId, parsed.name);
  if (existing) {
    throw new Error(`Secret with name "${parsed.name}" already exists in group "${group.name}"`);
  }
  
  // 如果指定了 providerId，验证提供者是否存在
  if (parsed.providerId) {
    const providerExists = db.prepare('SELECT id FROM secret_providers WHERE id = ?').get(parsed.providerId);
    if (!providerExists) {
      throw new Error(`Secret provider with id=${parsed.providerId} not found`);
    }
  }
  
  // 加密值
  const encryptedValue = encryptSecret(parsed.value);
  
  const stmt = db.prepare(`
    INSERT INTO secrets (
      name, group_id, value, description, source, 
      provider_id, provider_reference
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const info = stmt.run(
    parsed.name,
    parsed.groupId,
    encryptedValue,
    parsed.description || null,
    parsed.source || 'manual',
    parsed.providerId || null,
    parsed.providerReference || null
  );
  
  const created = getSecretById(Number(info.lastInsertRowid));
  if (!created) throw new Error('Failed to create secret');
  return created;
}

/**
 * 更新秘钥
 */
export function updateSecret(id: number, input: Partial<SecretInput>): SecretRecord {
  const db = getDb();
  const current = getSecretById(id);
  if (!current) throw new Error(`Secret with id=${id} not found`);
  
  const updates: string[] = [];
  const values: any[] = [];
  
  if (input.name !== undefined) {
    // 检查新名称在分组内是否冲突
    const existing = getSecretByGroupAndName(current.groupId, input.name);
    if (existing && existing.id !== id) {
      throw new Error(`Secret with name "${input.name}" already exists in this group`);
    }
    updates.push('name = ?');
    values.push(input.name);
  }
  
  if (input.value !== undefined) {
    // 加密新值
    const encryptedValue = encryptSecret(input.value);
    updates.push('value = ?');
    values.push(encryptedValue);
  }
  
  if (input.description !== undefined) {
    updates.push('description = ?');
    values.push(input.description || null);
  }
  
  if (input.source !== undefined) {
    updates.push('source = ?');
    values.push(input.source);
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
  
  if (input.providerReference !== undefined) {
    updates.push('provider_reference = ?');
    values.push(input.providerReference || null);
  }
  
  if (updates.length === 0) return current;
  
  values.push(id);
  db.prepare(`UPDATE secrets SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  
  const updated = getSecretById(id);
  if (!updated) throw new Error('Failed to update secret');
  return updated;
}

/**
 * 删除秘钥
 */
export function deleteSecret(id: number): void {
  const db = getDb();
  const secret = getSecretById(id);
  if (!secret) throw new Error(`Secret with id=${id} not found`);
  
  // 检查是否被环境变量引用
  const refCount = db.prepare(`
    SELECT COUNT(*) as count 
    FROM environment_variables 
    WHERE secret_id = ?
  `).get(id) as { count: number };
  
  if (refCount.count > 0) {
    throw new Error(`Cannot delete secret: it is referenced by ${refCount.count} environment variable(s). Please remove the references first.`);
  }
  
  db.prepare('DELETE FROM secrets WHERE id = ?').run(id);
}

/**
 * 批量创建或更新秘钥（用于同步）
 */
export interface UpsertSecretInput {
  name: string;
  groupId: number;
  value: string;
  description?: string;
  providerId?: number;
  providerReference?: string;
}

export function upsertSecrets(inputs: UpsertSecretInput[]): {
  created: number;
  updated: number;
  errors: Array<{ name: string; error: string }>;
} {
  const db = getDb();
  const results = {
    created: 0,
    updated: 0,
    errors: [] as Array<{ name: string; error: string }>,
  };
  
  // 使用事务
  const transaction = db.transaction(() => {
    for (const input of inputs) {
      try {
        const existing = getSecretByGroupAndName(input.groupId, input.name);
        
        if (existing) {
          // 更新现有秘钥
          updateSecret(existing.id, {
            value: input.value,
            description: input.description,
            source: 'synced',
            providerId: input.providerId,
            providerReference: input.providerReference,
          });
          
          // 更新同步时间
          db.prepare('UPDATE secrets SET last_synced_at = datetime("now") WHERE id = ?').run(existing.id);
          
          results.updated++;
        } else {
          // 创建新秘钥
          createSecret({
            name: input.name,
            groupId: input.groupId,
            value: input.value,
            description: input.description,
            source: 'synced',
            providerId: input.providerId,
            providerReference: input.providerReference,
          });
          results.created++;
        }
      } catch (error: any) {
        results.errors.push({
          name: input.name,
          error: error.message,
        });
      }
    }
  });
  
  transaction();
  return results;
}

/**
 * 搜索秘钥
 */
export function searchSecrets(query: string): SecretSummary[] {
  const db = getDb();
  const searchPattern = `%${query}%`;
  
  const rows = db.prepare(`
    SELECT 
      s.id, s.name, s.group_id, s.value, s.description, s.source,
      s.provider_id, s.provider_reference, s.last_synced_at,
      s.created_at, s.updated_at,
      g.name as group_name,
      p.name as provider_name
    FROM secrets s
    LEFT JOIN secret_groups g ON s.group_id = g.id
    LEFT JOIN secret_providers p ON s.provider_id = p.id
    WHERE s.name LIKE ? OR s.description LIKE ? OR g.name LIKE ?
    ORDER BY g.name, s.name
  `).all(searchPattern, searchPattern, searchPattern) as any[];
  
  return rows.map(row => {
    const record = mapRow(row);
    return mapToSummary(record, row.group_name, row.provider_name);
  });
}

