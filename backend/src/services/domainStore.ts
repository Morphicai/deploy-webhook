import { z } from 'zod';
import { getDb } from './database';
import type { CaddyAdvancedConfig } from '../types/caddy';
import { getApplicationById } from './applicationStore';

export type DomainType = 'application' | 'custom';

/**
 * 从应用生成 targetUrl
 * @param applicationId 应用ID
 * @param portNumber 可选，指定端口号。如果不指定，使用第一个端口
 * @returns targetUrl 格式如 http://localhost:8001
 */
export function generateTargetUrl(applicationId: number, portNumber?: number): string {
  const app = getApplicationById(applicationId);
  if (!app || app.ports.length === 0) {
    throw new Error(`Application with id=${applicationId} not found or has no ports`);
  }

  let port: number;
  if (portNumber !== undefined) {
    // 验证指定的端口是否存在
    const portConfig = app.ports.find(p => p.host === portNumber);
    if (!portConfig) {
      throw new Error(`Port ${portNumber} not found in application ${app.name}`);
    }
    port = portNumber;
  } else {
    // 使用第一个端口
    port = app.ports[0].host;
  }

  return `http://localhost:${port}`;
}

export interface DomainRecord {
  id: number;
  domainName: string;
  type: DomainType;
  applicationId: number | null;
  targetUrl: string;
  caddyConfig: CaddyAdvancedConfig;
  enabled: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

const domainSchema = z.object({
  domainName: z.string().min(1).max(255),
  type: z.enum(['application', 'custom']),
  applicationId: z.number().nullish(),
  targetUrl: z.string().min(1).max(512),
  caddyConfig: z.any().optional(),
  enabled: z.boolean().optional(),
  description: z.string().max(512).nullish(),
});

type DomainInput = z.infer<typeof domainSchema>;

function mapRow(row: any): DomainRecord {
  return {
    id: row.id,
    domainName: row.domain_name,
    type: row.type,
    applicationId: row.application_id,
    targetUrl: row.target_url,
    caddyConfig: JSON.parse(row.caddy_config || '{}'),
    enabled: Boolean(row.enabled),
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 列出所有域名
 */
export function listDomains(filters?: {
  enabled?: boolean;
  applicationId?: number;
  type?: DomainType;
}): DomainRecord[] {
  const db = getDb();
  let query = `
    SELECT id, domain_name, type, application_id, target_url,
           caddy_config, enabled, description, created_at, updated_at
    FROM domains
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters?.enabled !== undefined) {
    query += ' AND enabled = ?';
    params.push(filters.enabled ? 1 : 0);
  }

  if (filters?.applicationId !== undefined) {
    query += ' AND application_id = ?';
    params.push(filters.applicationId);
  }

  if (filters?.type !== undefined) {
    query += ' AND type = ?';
    params.push(filters.type);
  }

  query += ' ORDER BY id DESC';

  const rows = db.prepare(query).all(...params);
  return rows.map(mapRow);
}

/**
 * 根据 ID 获取域名
 */
export function getDomainById(id: number): DomainRecord | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT id, domain_name, type, application_id, target_url,
           caddy_config, enabled, description, created_at, updated_at
    FROM domains
    WHERE id = ?
  `).get(id);
  return row ? mapRow(row) : null;
}

/**
 * 根据域名获取记录
 */
export function getDomainByName(domainName: string): DomainRecord | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT id, domain_name, type, application_id, target_url,
           caddy_config, enabled, description, created_at, updated_at
    FROM domains
    WHERE domain_name = ?
  `).get(domainName);
  return row ? mapRow(row) : null;
}

/**
 * 创建域名
 */
export function createDomain(input: DomainInput): DomainRecord {
  const parsed = domainSchema.parse(input);
  const db = getDb();

  // 检查域名是否已存在
  const existing = getDomainByName(parsed.domainName);
  if (existing) {
    throw new Error(`Domain "${parsed.domainName}" already exists`);
  }

  // 验证配置
  if (parsed.type === 'application') {
    if (!parsed.applicationId) {
      throw new Error('applicationId is required for application type domain');
    }
    // 验证应用是否存在
    const appCheck = db.prepare('SELECT id FROM applications WHERE id = ?').get(parsed.applicationId);
    if (!appCheck) {
      throw new Error(`Application with id=${parsed.applicationId} not found`);
    }
  }

  // 验证 targetUrl 格式
  try {
    new URL(parsed.targetUrl);
  } catch (error) {
    throw new Error(`Invalid targetUrl format: ${parsed.targetUrl}`);
  }

  const stmt = db.prepare(`
    INSERT INTO domains (
      domain_name, type, application_id, target_url,
      caddy_config, enabled, description
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    parsed.domainName,
    parsed.type,
    parsed.applicationId || null,
    parsed.targetUrl,
    JSON.stringify(parsed.caddyConfig || {}),
    parsed.enabled !== false ? 1 : 0,
    parsed.description || null
  );

  const created = getDomainById(Number(info.lastInsertRowid));
  if (!created) throw new Error('Failed to create domain');
  return created;
}

/**
 * 更新域名
 */
export function updateDomain(id: number, input: Partial<DomainInput>): DomainRecord {
  const db = getDb();
  const current = getDomainById(id);
  if (!current) throw new Error(`Domain with id=${id} not found`);

  const updates: string[] = [];
  const values: any[] = [];

  if (input.domainName !== undefined) {
    // 检查新域名是否已被占用
    const existing = getDomainByName(input.domainName);
    if (existing && existing.id !== id) {
      throw new Error(`Domain "${input.domainName}" already exists`);
    }
    updates.push('domain_name = ?');
    values.push(input.domainName);
  }

  if (input.type !== undefined) {
    updates.push('type = ?');
    values.push(input.type);
  }

  if (input.applicationId !== undefined) {
    if (input.applicationId !== null) {
      // 验证应用是否存在
      const appCheck = db.prepare('SELECT id FROM applications WHERE id = ?').get(input.applicationId);
      if (!appCheck) {
        throw new Error(`Application with id=${input.applicationId} not found`);
      }
    }
    updates.push('application_id = ?');
    values.push(input.applicationId || null);
  }

  if (input.targetUrl !== undefined) {
    // 验证 targetUrl 格式
    try {
      new URL(input.targetUrl);
    } catch (error) {
      throw new Error(`Invalid targetUrl format: ${input.targetUrl}`);
    }
    updates.push('target_url = ?');
    values.push(input.targetUrl);
  }

  if (input.caddyConfig !== undefined) {
    updates.push('caddy_config = ?');
    values.push(JSON.stringify(input.caddyConfig));
  }

  if (input.enabled !== undefined) {
    updates.push('enabled = ?');
    values.push(input.enabled ? 1 : 0);
  }

  if (input.description !== undefined) {
    updates.push('description = ?');
    values.push(input.description || null);
  }

  if (updates.length === 0) return current;

  values.push(id);
  db.prepare(`UPDATE domains SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const updated = getDomainById(id);
  if (!updated) throw new Error('Failed to update domain');
  return updated;
}

/**
 * 删除域名
 */
export function deleteDomain(id: number): void {
  const db = getDb();
  const domain = getDomainById(id);
  if (!domain) throw new Error(`Domain with id=${id} not found`);

  db.prepare('DELETE FROM domains WHERE id = ?').run(id);
}

/**
 * 启用/禁用域名
 */
export function toggleDomain(id: number, enabled: boolean): DomainRecord {
  return updateDomain(id, { enabled });
}

/**
 * 获取应用的所有域名
 */
export function getDomainsByApplicationId(applicationId: number): DomainRecord[] {
  return listDomains({ applicationId, enabled: true });
}

