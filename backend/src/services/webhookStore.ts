import { getDb } from './database';
import crypto from 'crypto';

export type WebhookType = 'infisical';

export interface WebhookRecord {
  id: number;
  name: string;
  type: WebhookType;
  secret: string;
  enabled: boolean;
  description: string | null;
  lastTriggeredAt: string | null;
  triggerCount: number;
  createdAt: string;
  updatedAt: string;
}

interface WebhookRow {
  id: number;
  name: string;
  type: WebhookType;
  secret: string;
  enabled: number;
  description: string | null;
  last_triggered_at: string | null;
  trigger_count: number;
  created_at: string;
  updated_at: string;
}

function mapRow(row: WebhookRow): WebhookRecord {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    secret: row.secret,
    enabled: Boolean(row.enabled),
    description: row.description,
    lastTriggeredAt: row.last_triggered_at,
    triggerCount: row.trigger_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 生成 Webhook Secret
 */
export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 初始化 webhooks 表
 */
export function initializeWebhooksTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS webhooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      secret TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      description TEXT,
      last_triggered_at TEXT,
      trigger_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_webhooks_type ON webhooks(type);
    CREATE INDEX IF NOT EXISTS idx_webhooks_enabled ON webhooks(enabled);
    CREATE TRIGGER IF NOT EXISTS webhooks_updated_at
    AFTER UPDATE ON webhooks
    BEGIN
      UPDATE webhooks SET updated_at = datetime('now') WHERE id = NEW.id;
    END;
  `);
}

/**
 * 创建 Webhook
 */
export function createWebhook(input: {
  name: string;
  type: WebhookType;
  description?: string;
  secret?: string;
}): WebhookRecord {
  const secret = input.secret || generateWebhookSecret();
  
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO webhooks (name, type, secret, description)
    VALUES (?, ?, ?, ?)
  `);

  const info = stmt.run(
    input.name,
    input.type,
    secret,
    input.description || null
  );

  const created = getWebhookById(Number(info.lastInsertRowid));
  if (!created) {
    throw new Error('Failed to create webhook');
  }

  return created;
}

/**
 * 获取所有 Webhooks
 */
export function listWebhooks(): WebhookRecord[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM webhooks ORDER BY created_at DESC
  `).all() as WebhookRow[];

  return rows.map(mapRow);
}

/**
 * 根据 ID 获取 Webhook
 */
export function getWebhookById(id: number): WebhookRecord | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT * FROM webhooks WHERE id = ?
  `).get(id) as WebhookRow | undefined;

  return row ? mapRow(row) : null;
}

/**
 * 根据类型获取 Webhook
 */
export function getWebhookByType(type: WebhookType): WebhookRecord | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT * FROM webhooks WHERE type = ? AND enabled = 1 LIMIT 1
  `).get(type) as WebhookRow | undefined;

  return row ? mapRow(row) : null;
}

/**
 * 更新 Webhook
 */
export function updateWebhook(
  id: number,
  updates: {
    name?: string;
    description?: string;
    enabled?: boolean;
    secret?: string;
  }
): WebhookRecord {
  const db = getDb();
  const current = getWebhookById(id);
  if (!current) {
    throw new Error(`Webhook with id=${id} not found`);
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

  if (updates.enabled !== undefined) {
    fields.push('enabled = ?');
    values.push(updates.enabled ? 1 : 0);
  }

  if (updates.secret !== undefined) {
    fields.push('secret = ?');
    values.push(updates.secret);
  }

  if (fields.length === 0) {
    return current;
  }

  values.push(id);
  const stmt = db.prepare(`
    UPDATE webhooks SET ${fields.join(', ')} WHERE id = ?
  `);
  stmt.run(...values);

  const updated = getWebhookById(id);
  if (!updated) {
    throw new Error('Failed to update webhook');
  }

  return updated;
}

/**
 * 删除 Webhook
 */
export function deleteWebhook(id: number): void {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM webhooks WHERE id = ?');
  const info = stmt.run(id);

  if (info.changes === 0) {
    throw new Error(`Webhook with id=${id} not found`);
  }
}

/**
 * 记录 Webhook 触发
 */
export function recordWebhookTrigger(id: number): void {
  const db = getDb();
  db.prepare(`
    UPDATE webhooks 
    SET last_triggered_at = datetime('now'), 
        trigger_count = trigger_count + 1
    WHERE id = ?
  `).run(id);
}

/**
 * 验证 Webhook Secret
 */
export function verifyWebhookSecret(type: WebhookType, secret: string): WebhookRecord | null {
  const webhook = getWebhookByType(type);
  if (!webhook || !webhook.enabled) {
    return null;
  }

  if (webhook.secret !== secret) {
    return null;
  }

  return webhook;
}

