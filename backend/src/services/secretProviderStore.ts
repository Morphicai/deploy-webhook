import { z } from 'zod';
import { getDb } from './database';

/**
 * 秘钥提供者类型
 */
export type SecretProviderType = 
  | 'infisical' 
  | 'aws-secrets-manager' 
  | 'hashicorp-vault' 
  | 'azure-keyvault' 
  | 'gcp-secret-manager';

/**
 * Infisical 配置
 */
export interface InfisicalConfig {
  clientId: string;
  clientSecret: string;
  projectId: string;
  environment: string;
  secretPath?: string;
  siteUrl?: string;
}

/**
 * AWS Secrets Manager 配置
 */
export interface AWSSecretsManagerConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  secretName?: string;
  prefix?: string;
}

/**
 * HashiCorp Vault 配置
 */
export interface HashiCorpVaultConfig {
  address: string;
  token: string;
  namespace?: string;
  path: string;
  mountPath?: string;
}

/**
 * Azure Key Vault 配置
 */
export interface AzureKeyVaultConfig {
  vaultUrl: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

/**
 * GCP Secret Manager 配置
 */
export interface GCPSecretManagerConfig {
  projectId: string;
  credentials: string; // JSON string of service account key
  prefix?: string;
}

/**
 * 秘钥提供者配置联合类型
 */
export type SecretProviderConfig = 
  | InfisicalConfig 
  | AWSSecretsManagerConfig 
  | HashiCorpVaultConfig
  | AzureKeyVaultConfig
  | GCPSecretManagerConfig;

/**
 * 秘钥提供者记录
 */
export interface SecretProviderRecord {
  id: number;
  name: string;
  type: SecretProviderType;
  config: SecretProviderConfig;
  enabled: boolean;
  autoSync: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: 'success' | 'failed' | null;
  lastSyncError: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 秘钥同步记录
 */
export interface SecretSyncRecord {
  id: number;
  providerId: number;
  status: 'success' | 'failed' | 'in_progress';
  secretsCount: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

// Validation schemas
const infisicalConfigSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  projectId: z.string().min(1),
  environment: z.string().min(1),
  secretPath: z.string().optional(),
  siteUrl: z.string().url().optional(),
});

const awsConfigSchema = z.object({
  region: z.string().min(1),
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
  secretName: z.string().optional(),
  prefix: z.string().optional(),
});

const vaultConfigSchema = z.object({
  address: z.string().url(),
  token: z.string().min(1),
  namespace: z.string().optional(),
  path: z.string().min(1),
  mountPath: z.string().optional(),
});

const azureConfigSchema = z.object({
  vaultUrl: z.string().url(),
  tenantId: z.string().min(1),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
});

const gcpConfigSchema = z.object({
  projectId: z.string().min(1),
  credentials: z.string().min(1),
  prefix: z.string().optional(),
});

const secretProviderSchema = z.object({
  name: z.string().min(2).max(128),
  type: z.enum(['infisical', 'aws-secrets-manager', 'hashicorp-vault', 'azure-keyvault', 'gcp-secret-manager']),
  config: z.unknown(),
  enabled: z.boolean().optional(),
  autoSync: z.boolean().optional(),
});

function validateConfig(type: SecretProviderType, config: unknown): SecretProviderConfig {
  switch (type) {
    case 'infisical':
      return infisicalConfigSchema.parse(config);
    case 'aws-secrets-manager':
      return awsConfigSchema.parse(config);
    case 'hashicorp-vault':
      return vaultConfigSchema.parse(config);
    case 'azure-keyvault':
      return azureConfigSchema.parse(config);
    case 'gcp-secret-manager':
      return gcpConfigSchema.parse(config);
    default:
      throw new Error(`Unsupported provider type: ${type}`);
  }
}

function mapRow(row: any): SecretProviderRecord {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    config: JSON.parse(row.config),
    enabled: Boolean(row.enabled),
    autoSync: Boolean(row.auto_sync),
    lastSyncAt: row.last_sync_at,
    lastSyncStatus: row.last_sync_status,
    lastSyncError: row.last_sync_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSyncRow(row: any): SecretSyncRecord {
  return {
    id: row.id,
    providerId: row.provider_id,
    status: row.status,
    secretsCount: row.secrets_count,
    errorMessage: row.error_message,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

/**
 * 列出所有秘钥提供者
 */
export function listSecretProviders(): SecretProviderRecord[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, name, type, config, enabled, auto_sync, last_sync_at, 
           last_sync_status, last_sync_error, created_at, updated_at
    FROM secret_providers
    ORDER BY id DESC
  `).all();
  return rows.map(mapRow);
}

/**
 * 根据 ID 获取秘钥提供者
 */
export function getSecretProviderById(id: number): SecretProviderRecord | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT id, name, type, config, enabled, auto_sync, last_sync_at,
           last_sync_status, last_sync_error, created_at, updated_at
    FROM secret_providers
    WHERE id = ?
  `).get(id);
  return row ? mapRow(row) : null;
}

/**
 * 根据名称获取秘钥提供者
 */
export function getSecretProviderByName(name: string): SecretProviderRecord | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT id, name, type, config, enabled, auto_sync, last_sync_at,
           last_sync_status, last_sync_error, created_at, updated_at
    FROM secret_providers
    WHERE name = ?
  `).get(name);
  return row ? mapRow(row) : null;
}

/**
 * 获取启用的秘钥提供者
 */
export function listEnabledSecretProviders(): SecretProviderRecord[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, name, type, config, enabled, auto_sync, last_sync_at,
           last_sync_status, last_sync_error, created_at, updated_at
    FROM secret_providers
    WHERE enabled = 1
    ORDER BY id ASC
  `).all();
  return rows.map(mapRow);
}

/**
 * 获取启用自动同步的秘钥提供者
 */
export function listAutoSyncProviders(): SecretProviderRecord[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, name, type, config, enabled, auto_sync, last_sync_at,
           last_sync_status, last_sync_error, created_at, updated_at
    FROM secret_providers
    WHERE enabled = 1 AND auto_sync = 1
    ORDER BY id ASC
  `).all();
  return rows.map(mapRow);
}

/**
 * 创建秘钥提供者
 */
export function createSecretProvider(payload: unknown): SecretProviderRecord {
  const parsed = secretProviderSchema.parse(payload);
  
  // 验证配置
  const validatedConfig = validateConfig(parsed.type, parsed.config);
  
  // 检查名称是否已存在
  if (getSecretProviderByName(parsed.name)) {
    throw new Error(`Secret provider with name "${parsed.name}" already exists`);
  }
  
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO secret_providers (name, type, config, enabled, auto_sync)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const info = stmt.run(
    parsed.name,
    parsed.type,
    JSON.stringify(validatedConfig),
    parsed.enabled === undefined ? 1 : (parsed.enabled ? 1 : 0),
    parsed.autoSync === undefined ? 0 : (parsed.autoSync ? 1 : 0)
  );
  
  const created = getSecretProviderById(Number(info.lastInsertRowid));
  if (!created) throw new Error('Failed to create secret provider');
  return created;
}

/**
 * 更新秘钥提供者
 */
export function updateSecretProvider(id: number, payload: unknown): SecretProviderRecord {
  const db = getDb();
  const current = getSecretProviderById(id);
  if (!current) throw new Error(`Secret provider with id=${id} not found`);
  
  const parsed = secretProviderSchema.partial().parse(payload);
  
  const updates: string[] = [];
  const values: any[] = [];
  
  if (parsed.name !== undefined) {
    // 检查新名称是否与其他记录冲突
    const existing = getSecretProviderByName(parsed.name);
    if (existing && existing.id !== id) {
      throw new Error(`Secret provider with name "${parsed.name}" already exists`);
    }
    updates.push('name = ?');
    values.push(parsed.name);
  }
  
  if (parsed.type !== undefined) {
    updates.push('type = ?');
    values.push(parsed.type);
  }
  
  if (parsed.config !== undefined) {
    const type = parsed.type || current.type;
    const validatedConfig = validateConfig(type, parsed.config);
    updates.push('config = ?');
    values.push(JSON.stringify(validatedConfig));
  }
  
  if (parsed.enabled !== undefined) {
    updates.push('enabled = ?');
    values.push(parsed.enabled ? 1 : 0);
  }
  
  if (parsed.autoSync !== undefined) {
    updates.push('auto_sync = ?');
    values.push(parsed.autoSync ? 1 : 0);
  }
  
  if (updates.length === 0) return current;
  
  values.push(id);
  db.prepare(`UPDATE secret_providers SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  
  const updated = getSecretProviderById(id);
  if (!updated) throw new Error('Failed to update secret provider');
  return updated;
}

/**
 * 删除秘钥提供者
 */
export function deleteSecretProvider(id: number): void {
  const db = getDb();
  const result = db.prepare('DELETE FROM secret_providers WHERE id = ?').run(id);
  if (result.changes === 0) {
    throw new Error(`Secret provider with id=${id} not found`);
  }
}

/**
 * 更新同步状态
 */
export function updateSyncStatus(
  providerId: number,
  status: 'success' | 'failed',
  error?: string
): void {
  const db = getDb();
  db.prepare(`
    UPDATE secret_providers 
    SET last_sync_at = datetime('now'), 
        last_sync_status = ?,
        last_sync_error = ?
    WHERE id = ?
  `).run(status, error || null, providerId);
}

/**
 * 创建同步记录
 */
export function createSyncRecord(providerId: number): number {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO secret_syncs (provider_id, status)
    VALUES (?, 'in_progress')
  `);
  const info = stmt.run(providerId);
  return Number(info.lastInsertRowid);
}

/**
 * 完成同步记录
 */
export function completeSyncRecord(
  syncId: number,
  status: 'success' | 'failed',
  secretsCount: number,
  errorMessage?: string
): void {
  const db = getDb();
  db.prepare(`
    UPDATE secret_syncs 
    SET status = ?, 
        secrets_count = ?,
        error_message = ?,
        completed_at = datetime('now')
    WHERE id = ?
  `).run(status, secretsCount, errorMessage || null, syncId);
}

/**
 * 获取提供者的同步历史
 */
export function getProviderSyncHistory(providerId: number, limit: number = 20): SecretSyncRecord[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, provider_id, status, secrets_count, error_message, started_at, completed_at
    FROM secret_syncs
    WHERE provider_id = ?
    ORDER BY id DESC
    LIMIT ?
  `).all(providerId, limit);
  return rows.map(mapSyncRow);
}


