import { getDb } from './database';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export type APIKeyPermission = 'full' | 'readonly' | 'deploy';

export interface APIKeyRecord {
  id: number;
  name: string;
  description: string | null;
  keyPrefix: string;
  permission: APIKeyPermission;
  enabled: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  lastUsedIp: string | null;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface APIKeyRow {
  id: number;
  name: string;
  description: string | null;
  key_hash: string;
  key_prefix: string;
  permission: APIKeyPermission;
  enabled: number;
  expires_at: string | null;
  last_used_at: string | null;
  last_used_ip: string | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

function mapRow(row: APIKeyRow): APIKeyRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    keyPrefix: row.key_prefix,
    permission: row.permission,
    enabled: Boolean(row.enabled),
    expiresAt: row.expires_at,
    lastUsedAt: row.last_used_at,
    lastUsedIp: row.last_used_ip,
    usageCount: row.usage_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 生成 API Key
 * 格式: dw_[32个随机字符]
 */
export function generateAPIKey(): string {
  const randomBytes = crypto.randomBytes(24);
  const key = randomBytes.toString('base64url');
  return `dw_${key}`;
}

/**
 * 获取 Key 前缀（用于显示）
 */
function getKeyPrefix(key: string): string {
  if (key.length >= 12) {
    return key.substring(0, 12) + '...';
  }
  return key;
}

/**
 * 哈希 API Key
 */
function hashKey(key: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(key, salt);
}

/**
 * 验证 API Key
 */
export function verifyAPIKey(key: string): APIKeyRecord | null {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM api_keys WHERE enabled = 1
  `).all() as APIKeyRow[];

  for (const row of rows) {
    const isValid = bcrypt.compareSync(key, row.key_hash);
    if (isValid) {
      // Check expiration
      if (row.expires_at) {
        const expiresAt = new Date(row.expires_at);
        if (expiresAt < new Date()) {
          return null; // Expired
        }
      }
      return mapRow(row);
    }
  }

  return null;
}

/**
 * 创建 API Key
 */
export function createAPIKey(input: {
  name: string;
  description?: string;
  permission?: APIKeyPermission;
  expiresAt?: string;
}): { apiKey: APIKeyRecord; plainKey: string } {
  const plainKey = generateAPIKey();
  const keyHash = hashKey(plainKey);
  const keyPrefix = getKeyPrefix(plainKey);

  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO api_keys (name, description, key_hash, key_prefix, permission, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    input.name,
    input.description || null,
    keyHash,
    keyPrefix,
    input.permission || 'full',
    input.expiresAt || null
  );

  const created = getAPIKeyById(Number(info.lastInsertRowid));
  if (!created) {
    throw new Error('Failed to create API key');
  }

  return {
    apiKey: created,
    plainKey, // Only return the plain key once
  };
}

/**
 * 获取所有 API Keys
 */
export function listAPIKeys(): APIKeyRecord[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM api_keys ORDER BY created_at DESC
  `).all() as APIKeyRow[];

  return rows.map(mapRow);
}

/**
 * 根据 ID 获取 API Key
 */
export function getAPIKeyById(id: number): APIKeyRecord | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT * FROM api_keys WHERE id = ?
  `).get(id) as APIKeyRow | undefined;

  return row ? mapRow(row) : null;
}

/**
 * 更新 API Key
 */
export function updateAPIKey(
  id: number,
  updates: {
    name?: string;
    description?: string;
    permission?: APIKeyPermission;
    enabled?: boolean;
    expiresAt?: string | null;
  }
): APIKeyRecord {
  const db = getDb();
  const current = getAPIKeyById(id);
  if (!current) {
    throw new Error(`API key with id=${id} not found`);
  }

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }

  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }

  if (updates.permission !== undefined) {
    fields.push('permission = ?');
    values.push(updates.permission);
  }

  if (updates.enabled !== undefined) {
    fields.push('enabled = ?');
    values.push(updates.enabled ? 1 : 0);
  }

  if (updates.expiresAt !== undefined) {
    fields.push('expires_at = ?');
    values.push(updates.expiresAt);
  }

  if (fields.length === 0) {
    return current;
  }

  values.push(id);
  const stmt = db.prepare(`
    UPDATE api_keys SET ${fields.join(', ')} WHERE id = ?
  `);
  stmt.run(...values);

  const updated = getAPIKeyById(id);
  if (!updated) {
    throw new Error('Failed to update API key');
  }

  return updated;
}

/**
 * 删除 API Key
 */
export function deleteAPIKey(id: number): void {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM api_keys WHERE id = ?');
  const info = stmt.run(id);

  if (info.changes === 0) {
    throw new Error(`API key with id=${id} not found`);
  }
}

/**
 * 记录 API Key 使用
 */
export function recordAPIKeyUsage(id: number, ip: string): void {
  const db = getDb();
  db.prepare(`
    UPDATE api_keys 
    SET last_used_at = datetime('now'), 
        last_used_ip = ?, 
        usage_count = usage_count + 1
    WHERE id = ?
  `).run(ip, id);
}

