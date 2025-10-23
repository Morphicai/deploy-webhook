import { z } from 'zod';
import crypto from 'crypto';
import { getDb } from './database';

/**
 * 同步来源类型
 */
export type SyncSourceType = 'infisical';

/**
 * 同步策略
 */
export type SyncStrategy = 'merge' | 'replace';

/**
 * 触发方式
 */
export type SyncTrigger = 'manual' | 'webhook' | 'schedule';

/**
 * Infisical 源配置
 */
export interface InfisicalSourceConfig {
  clientId: string;
  clientSecret: string;
  projectId: string;
  environment: string;
  path?: string;
  siteUrl?: string;
}

/**
 * 同步配置记录
 */
export interface SecretSyncRecord {
  id: number;
  name: string;
  description: string | null;
  
  // 来源配置
  sourceType: SyncSourceType;
  sourceConfig: InfisicalSourceConfig;
  
  // 目标配置
  targetGroupId: number;
  targetGroupName?: string;
  
  // 同步配置
  syncStrategy: SyncStrategy;
  syncTrigger: SyncTrigger;
  
  // Webhook 配置
  webhookToken: string | null;
  webhookUrl?: string;
  
  // 定时配置
  scheduleEnabled: boolean;
  scheduleInterval: number | null;  // 分钟
  
  // 状态
  enabled: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: 'success' | 'failed' | 'in_progress' | null;
  lastSyncError: string | null;
  
  createdAt: string;
  updatedAt: string;
}

/**
 * 同步配置摘要（不包含敏感信息）
 */
export interface SecretSyncSummary {
  id: number;
  name: string;
  description: string | null;
  sourceType: SyncSourceType;
  targetGroupId: number;
  targetGroupName: string;
  syncStrategy: SyncStrategy;
  syncTrigger: SyncTrigger;
  enabled: boolean;
  hasWebhook: boolean;
  webhookUrl?: string;
  scheduleEnabled: boolean;
  scheduleInterval: number | null;
  lastSyncAt: string | null;
  lastSyncStatus: 'success' | 'failed' | 'in_progress' | null;
  lastSyncError: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 输入验证
 */
const secretSyncSchema = z.object({
  name: z.string().min(2).max(128),
  description: z.string().max(512).optional(),
  sourceType: z.literal('infisical'),
  sourceConfig: z.object({
    clientId: z.string().min(1),
    clientSecret: z.string().min(1),
    projectId: z.string().min(1),
    environment: z.string().min(1),
    path: z.string().optional(),
    siteUrl: z.string().url().optional(),
  }),
  targetGroupId: z.number().int().positive(),
  syncStrategy: z.enum(['merge', 'replace']),
  syncTrigger: z.enum(['manual', 'webhook', 'schedule']),
  enableWebhook: z.boolean().optional(),
  scheduleEnabled: z.boolean().optional(),
  scheduleInterval: z.number().int().positive().optional(),
  enabled: z.boolean().optional(),
});

type SecretSyncInput = z.infer<typeof secretSyncSchema>;

/**
 * 生成 Webhook Token
 */
function generateWebhookToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 映射数据库行
 */
function mapRow(row: any): SecretSyncRecord {
  const sourceConfig = typeof row.source_config === 'string' 
    ? JSON.parse(row.source_config) 
    : row.source_config;

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sourceType: row.source_type as SyncSourceType,
    sourceConfig,
    targetGroupId: row.target_group_id,
    targetGroupName: row.target_group_name,
    syncStrategy: row.sync_strategy as SyncStrategy,
    syncTrigger: row.sync_trigger as SyncTrigger,
    webhookToken: row.webhook_token,
    scheduleEnabled: Boolean(row.schedule_enabled),
    scheduleInterval: row.schedule_interval,
    enabled: Boolean(row.enabled),
    lastSyncAt: row.last_sync_at,
    lastSyncStatus: row.last_sync_status,
    lastSyncError: row.last_sync_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 映射到摘要（隐藏敏感信息）
 */
function mapToSummary(record: SecretSyncRecord, baseUrl?: string): SecretSyncSummary {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    sourceType: record.sourceType,
    targetGroupId: record.targetGroupId,
    targetGroupName: record.targetGroupName || 'Unknown',
    syncStrategy: record.syncStrategy,
    syncTrigger: record.syncTrigger,
    enabled: record.enabled,
    hasWebhook: Boolean(record.webhookToken),
    webhookUrl: record.webhookToken && baseUrl
      ? `${baseUrl}/webhooks/sync/${record.webhookToken}`
      : undefined,
    scheduleEnabled: record.scheduleEnabled,
    scheduleInterval: record.scheduleInterval,
    lastSyncAt: record.lastSyncAt,
    lastSyncStatus: record.lastSyncStatus,
    lastSyncError: record.lastSyncError,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

/**
 * 列出所有同步配置
 */
export function listSecretSyncs(): SecretSyncSummary[] {
  const db = getDb();
  
  const rows = db.prepare(`
    SELECT 
      ss.*,
      sg.name as target_group_name
    FROM secret_syncs ss
    LEFT JOIN secret_groups sg ON ss.target_group_id = sg.id
    ORDER BY ss.created_at DESC
  `).all() as any[];

  const baseUrl = process.env.BASE_URL || process.env.PUBLIC_URL;
  return rows.map(row => {
    const record = mapRow(row);
    return mapToSummary(record, baseUrl);
  });
}

/**
 * 根据 ID 获取同步配置
 */
export function getSecretSyncById(id: number): SecretSyncRecord | null {
  const db = getDb();
  
  const row = db.prepare(`
    SELECT 
      ss.*,
      sg.name as target_group_name
    FROM secret_syncs ss
    LEFT JOIN secret_groups sg ON ss.target_group_id = sg.id
    WHERE ss.id = ?
  `).get(id);

  return row ? mapRow(row) : null;
}

/**
 * 根据名称获取同步配置
 */
export function getSecretSyncByName(name: string): SecretSyncRecord | null {
  const db = getDb();
  
  const row = db.prepare(`
    SELECT 
      ss.*,
      sg.name as target_group_name
    FROM secret_syncs ss
    LEFT JOIN secret_groups sg ON ss.target_group_id = sg.id
    WHERE ss.name = ?
  `).get(name);

  return row ? mapRow(row) : null;
}

/**
 * 根据 Webhook Token 获取同步配置
 */
export function getSecretSyncByWebhookToken(token: string): SecretSyncRecord | null {
  const db = getDb();
  
  const row = db.prepare(`
    SELECT 
      ss.*,
      sg.name as target_group_name
    FROM secret_syncs ss
    LEFT JOIN secret_groups sg ON ss.target_group_id = sg.id
    WHERE ss.webhook_token = ? AND ss.enabled = 1
  `).get(token);

  return row ? mapRow(row) : null;
}

/**
 * 创建同步配置
 */
export function createSecretSync(input: SecretSyncInput): SecretSyncRecord {
  const parsed = secretSyncSchema.parse(input);
  const db = getDb();

  // 检查名称是否已存在
  const existing = getSecretSyncByName(parsed.name);
  if (existing) {
    throw new Error(`Secret sync with name "${parsed.name}" already exists`);
  }

  // 验证目标分组存在
  const groupExists = db.prepare('SELECT id FROM secret_groups WHERE id = ?').get(parsed.targetGroupId);
  if (!groupExists) {
    throw new Error(`Target group with id=${parsed.targetGroupId} not found`);
  }

  // 生成 webhook token（如果需要）
  const webhookToken = (parsed.syncTrigger === 'webhook' || parsed.enableWebhook)
    ? generateWebhookToken()
    : null;

  const stmt = db.prepare(`
    INSERT INTO secret_syncs (
      name, description, source_type, source_config,
      target_group_id, sync_strategy, sync_trigger,
      webhook_token, schedule_enabled, schedule_interval, enabled
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    parsed.name,
    parsed.description || null,
    parsed.sourceType,
    JSON.stringify(parsed.sourceConfig),
    parsed.targetGroupId,
    parsed.syncStrategy,
    parsed.syncTrigger,
    webhookToken,
    parsed.scheduleEnabled ? 1 : 0,
    parsed.scheduleInterval || null,
    parsed.enabled !== false ? 1 : 0
  );

  const created = getSecretSyncById(Number(info.lastInsertRowid));
  if (!created) throw new Error('Failed to create secret sync');
  
  return created;
}

/**
 * 更新同步配置
 */
export function updateSecretSync(
  id: number,
  input: Partial<SecretSyncInput>
): SecretSyncRecord {
  const db = getDb();
  const current = getSecretSyncById(id);
  if (!current) {
    throw new Error(`Secret sync with id=${id} not found`);
  }

  const updates: string[] = [];
  const values: any[] = [];

  if (input.name !== undefined) {
    const existing = getSecretSyncByName(input.name);
    if (existing && existing.id !== id) {
      throw new Error(`Secret sync with name "${input.name}" already exists`);
    }
    updates.push('name = ?');
    values.push(input.name);
  }

  if (input.description !== undefined) {
    updates.push('description = ?');
    values.push(input.description || null);
  }

  if (input.sourceConfig !== undefined) {
    const newConfig = {
      ...current.sourceConfig,
      ...input.sourceConfig,
    };
    updates.push('source_config = ?');
    values.push(JSON.stringify(newConfig));
  }

  if (input.targetGroupId !== undefined) {
    const groupExists = db.prepare('SELECT id FROM secret_groups WHERE id = ?').get(input.targetGroupId);
    if (!groupExists) {
      throw new Error(`Target group with id=${input.targetGroupId} not found`);
    }
    updates.push('target_group_id = ?');
    values.push(input.targetGroupId);
  }

  if (input.syncStrategy !== undefined) {
    updates.push('sync_strategy = ?');
    values.push(input.syncStrategy);
  }

  if (input.syncTrigger !== undefined) {
    updates.push('sync_trigger = ?');
    values.push(input.syncTrigger);
    
    // 如果改为 webhook 但没有 token，生成一个
    if (input.syncTrigger === 'webhook' && !current.webhookToken) {
      updates.push('webhook_token = ?');
      values.push(generateWebhookToken());
    }
  }

  if (input.scheduleEnabled !== undefined) {
    updates.push('schedule_enabled = ?');
    values.push(input.scheduleEnabled ? 1 : 0);
  }

  if (input.scheduleInterval !== undefined) {
    updates.push('schedule_interval = ?');
    values.push(input.scheduleInterval || null);
  }

  if (input.enabled !== undefined) {
    updates.push('enabled = ?');
    values.push(input.enabled ? 1 : 0);
  }

  if (updates.length === 0) return current;

  values.push(id);
  db.prepare(`UPDATE secret_syncs SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const updated = getSecretSyncById(id);
  if (!updated) throw new Error('Failed to update secret sync');
  
  return updated;
}

/**
 * 删除同步配置
 */
export function deleteSecretSync(id: number): void {
  const db = getDb();
  const sync = getSecretSyncById(id);
  if (!sync) {
    throw new Error(`Secret sync with id=${id} not found`);
  }

  db.prepare('DELETE FROM secret_syncs WHERE id = ?').run(id);
}

/**
 * 重新生成 Webhook Token
 */
export function regenerateWebhookToken(id: number): string {
  const db = getDb();
  const sync = getSecretSyncById(id);
  if (!sync) {
    throw new Error(`Secret sync with id=${id} not found`);
  }

  const newToken = generateWebhookToken();
  db.prepare('UPDATE secret_syncs SET webhook_token = ? WHERE id = ?').run(newToken, id);
  
  return newToken;
}

/**
 * 更新同步状态
 */
export function updateSecretSyncStatus(
  id: number,
  status: 'success' | 'failed' | 'in_progress',
  error?: string
): void {
  const db = getDb();
  
  db.prepare(`
    UPDATE secret_syncs
    SET last_sync_at = datetime('now'),
        last_sync_status = ?,
        last_sync_error = ?
    WHERE id = ?
  `).run(status, error || null, id);
}

/**
 * 获取需要定时同步的配置
 */
export function getScheduledSyncs(): SecretSyncRecord[] {
  const db = getDb();
  
  const rows = db.prepare(`
    SELECT 
      ss.*,
      sg.name as target_group_name
    FROM secret_syncs ss
    LEFT JOIN secret_groups sg ON ss.target_group_id = sg.id
    WHERE ss.enabled = 1 
      AND ss.schedule_enabled = 1 
      AND ss.schedule_interval IS NOT NULL
    ORDER BY ss.last_sync_at ASC NULLS FIRST
  `).all() as any[];

  return rows.map(mapRow);
}

/**
 * 获取统计信息
 */
export interface SecretSyncStats {
  id: number;
  name: string;
  enabled: boolean;
  secretsCount: number;
  lastSyncAt: string | null;
  lastSyncStatus: 'success' | 'failed' | 'in_progress' | null;
}

export function getSecretSyncStats(id: number): SecretSyncStats | null {
  const db = getDb();
  const sync = getSecretSyncById(id);
  if (!sync) return null;

  const stats = db.prepare(`
    SELECT COUNT(*) as count
    FROM secrets
    WHERE group_id = ? AND source = 'synced'
  `).get(sync.targetGroupId) as { count: number };

  return {
    id: sync.id,
    name: sync.name,
    enabled: sync.enabled,
    secretsCount: stats.count || 0,
    lastSyncAt: sync.lastSyncAt,
    lastSyncStatus: sync.lastSyncStatus,
  };
}

