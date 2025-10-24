import { z } from 'zod';
import { getDb } from './database';
import Docker from 'dockerode';

export interface PortMapping {
  host: number;
  container: number;
}

export interface ApplicationRecord {
  id: number;
  name: string;
  image: string;
  version: string | null;
  repositoryId: number | null;
  ports: PortMapping[];
  envVars: Record<string, string>;
  status: 'running' | 'stopped' | 'error' | 'deploying';
  lastDeployedAt: string | null;
  webhookEnabled: boolean;
  webhookToken: string | null;
  createdAt: string;
  updatedAt: string;
}

const portMappingSchema = z.object({
  host: z.number().int().min(1).max(65535),
  container: z.number().int().min(1).max(65535),
});

const applicationSchema = z.object({
  name: z.string().min(1).max(128),
  image: z.string().min(1).max(512),
  version: z.string().max(128).nullish(),
  repositoryId: z.number().nullish(),
  ports: z.array(portMappingSchema).min(1),
  envVars: z.record(z.string(), z.string()).optional(),
  status: z.enum(['running', 'stopped', 'error', 'deploying']).optional(),
  lastDeployedAt: z.string().nullish(),
  webhookEnabled: z.boolean().optional(),  // V2: Webhook 部署开关
  webhookToken: z.string().nullish(),      // V2: Webhook Token（创建时可选，自动生成）
});

type ApplicationInput = z.infer<typeof applicationSchema>;

function mapRow(row: any): ApplicationRecord {
  return {
    id: row.id,
    name: row.name,
    image: row.image,
    version: row.version,
    repositoryId: row.repository_id,
    ports: JSON.parse(row.ports || '[]'),
    envVars: JSON.parse(row.env_vars || '{}'),
    status: row.status,
    lastDeployedAt: row.last_deployed_at,
    webhookEnabled: Boolean(row.webhook_enabled),
    webhookToken: row.webhook_token,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 列出所有应用
 */
export function listApplications(): ApplicationRecord[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, name, image, version, repository_id, ports, env_vars,
           status, last_deployed_at, webhook_enabled, webhook_token,
           created_at, updated_at
    FROM applications
    ORDER BY id DESC
  `).all();
  return rows.map(mapRow);
}

/**
 * 根据 ID 获取应用
 */
export function getApplicationById(id: number): ApplicationRecord | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT id, name, image, version, repository_id, ports, env_vars,
           status, last_deployed_at, webhook_enabled, webhook_token,
           created_at, updated_at
    FROM applications
    WHERE id = ?
  `).get(id);
  return row ? mapRow(row) : null;
}

/**
 * 根据名称获取应用
 */
export function getApplicationByName(name: string): ApplicationRecord | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT id, name, image, version, repository_id, ports, env_vars,
           status, last_deployed_at, webhook_enabled, webhook_token,
           created_at, updated_at
    FROM applications
    WHERE name = ?
  `).get(name);
  return row ? mapRow(row) : null;
}

/**
 * 创建应用
 */
export function createApplication(input: ApplicationInput): ApplicationRecord {
  const parsed = applicationSchema.parse(input);
  const db = getDb();
  
  // 检查名称是否已存在
  const existing = getApplicationByName(parsed.name);
  if (existing) {
    throw new Error(`Application with name "${parsed.name}" already exists`);
  }
  
  // V2: 如果启用 webhook 且未提供 token，自动生成
  const webhookEnabled = parsed.webhookEnabled || false;
  let webhookToken = parsed.webhookToken || null;
  
  if (webhookEnabled && !webhookToken) {
    const crypto = require('crypto');
    webhookToken = `whk_${crypto.randomBytes(32).toString('hex')}`;
  }
  
  const stmt = db.prepare(`
    INSERT INTO applications (
      name, image, version, repository_id, ports, env_vars, 
      status, last_deployed_at, webhook_enabled, webhook_token
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const info = stmt.run(
    parsed.name,
    parsed.image,
    parsed.version || null,
    parsed.repositoryId || null,
    JSON.stringify(parsed.ports),
    JSON.stringify(parsed.envVars || {}),
    parsed.status || 'stopped',
    parsed.lastDeployedAt || null,
    webhookEnabled ? 1 : 0,  // V2: webhook_enabled
    webhookToken              // V2: webhook_token
  );
  
  const created = getApplicationById(Number(info.lastInsertRowid));
  if (!created) throw new Error('Failed to create application');
  return created;
}

/**
 * 更新应用
 */
export function updateApplication(id: number, input: Partial<ApplicationInput>): ApplicationRecord {
  const db = getDb();
  const current = getApplicationById(id);
  if (!current) throw new Error(`Application with id=${id} not found`);
  
  const updates: string[] = [];
  const values: any[] = [];
  
  if (input.image !== undefined) {
    updates.push('image = ?');
    values.push(input.image);
  }
  
  if (input.version !== undefined) {
    updates.push('version = ?');
    values.push(input.version || null);
  }
  
  if (input.repositoryId !== undefined) {
    updates.push('repository_id = ?');
    values.push(input.repositoryId || null);
  }
  
  if (input.ports !== undefined) {
    const validated = z.array(portMappingSchema).parse(input.ports);
    updates.push('ports = ?');
    values.push(JSON.stringify(validated));
  }
  
  if (input.envVars !== undefined) {
    updates.push('env_vars = ?');
    values.push(JSON.stringify(input.envVars));
  }
  
  // V2: 处理 webhook 启用/禁用
  if (input.webhookEnabled !== undefined) {
    updates.push('webhook_enabled = ?');
    values.push(input.webhookEnabled ? 1 : 0);
    
    // 如果启用 webhook 且当前没有 token，自动生成
    if (input.webhookEnabled && !current.webhookToken) {
      const crypto = require('crypto');
      updates.push('webhook_token = ?');
      values.push(`whk_${crypto.randomBytes(32).toString('hex')}`);
    }
    
    // 如果禁用 webhook，清除 token
    if (!input.webhookEnabled) {
      updates.push('webhook_token = ?');
      values.push(null);
    }
  }
  
  // V2: 处理 webhook token 更新（手动设置或重新生成）
  if (input.webhookToken !== undefined) {
    updates.push('webhook_token = ?');
    values.push(input.webhookToken);
  }
  
  if (updates.length === 0) return current;
  
  values.push(id);
  db.prepare(`UPDATE applications SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  
  const updated = getApplicationById(id);
  if (!updated) throw new Error('Failed to update application');
  return updated;
}

/**
 * 更新应用状态
 */
export function updateApplicationStatus(id: number, status: ApplicationRecord['status']): void {
  const db = getDb();
  db.prepare('UPDATE applications SET status = ? WHERE id = ?').run(status, id);
}

/**
 * 更新应用部署时间
 */
export function updateApplicationDeployedAt(id: number): void {
  const db = getDb();
  db.prepare(`
    UPDATE applications 
    SET last_deployed_at = datetime('now'), status = 'running'
    WHERE id = ?
  `).run(id);
}

/**
 * 删除应用
 */
export function deleteApplication(id: number): void {
  const db = getDb();
  db.prepare('DELETE FROM applications WHERE id = ?').run(id);
}

/**
 * 检查容器实际运行状态
 */
export async function checkContainerStatus(name: string): Promise<'running' | 'stopped' | 'error'> {
  try {
    const docker = new Docker({ socketPath: process.env.DOCKER_SOCK_PATH || '/var/run/docker.sock' });
    const container = docker.getContainer(name);
    const info = await container.inspect();
    return info.State.Running ? 'running' : 'stopped';
  } catch (error) {
    return 'stopped';
  }
}
