import { z } from 'zod';
import { getDb } from './database';
import Docker from 'dockerode';
import type { CaddyAdvancedConfig } from '../types/caddy';

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
  domain: string | null;
  ports: PortMapping[];
  envVars: Record<string, string>;
  caddyConfig: CaddyAdvancedConfig;
  status: 'running' | 'stopped' | 'error' | 'deploying';
  lastDeployedAt: string | null;
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
  domain: z.string().max(255).nullish(),
  ports: z.array(portMappingSchema).min(1),
  envVars: z.record(z.string(), z.string()).optional(),
  caddyConfig: z.any().optional(),
});

type ApplicationInput = z.infer<typeof applicationSchema>;

function mapRow(row: any): ApplicationRecord {
  return {
    id: row.id,
    name: row.name,
    image: row.image,
    version: row.version,
    repositoryId: row.repository_id,
    domain: row.domain,
    ports: JSON.parse(row.ports || '[]'),
    envVars: JSON.parse(row.env_vars || '{}'),
    caddyConfig: JSON.parse(row.caddy_config || '{}'),
    status: row.status,
    lastDeployedAt: row.last_deployed_at,
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
    SELECT id, name, image, version, repository_id, domain, ports, env_vars, caddy_config,
           status, last_deployed_at, created_at, updated_at
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
    SELECT id, name, image, version, repository_id, domain, ports, env_vars, caddy_config,
           status, last_deployed_at, created_at, updated_at
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
    SELECT id, name, image, version, repository_id, domain, ports, env_vars, caddy_config,
           status, last_deployed_at, created_at, updated_at
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
  
  const stmt = db.prepare(`
    INSERT INTO applications (name, image, version, repository_id, domain, ports, env_vars, caddy_config, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'stopped')
  `);
  
  const info = stmt.run(
    parsed.name,
    parsed.image,
    parsed.version || null,
    parsed.repositoryId || null,
    parsed.domain || null,
    JSON.stringify(parsed.ports),
    JSON.stringify(parsed.envVars || {}),
    JSON.stringify(parsed.caddyConfig || {})
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
  
  if (input.domain !== undefined) {
    updates.push('domain = ?');
    values.push(input.domain || null);
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
  
  if (input.caddyConfig !== undefined) {
    updates.push('caddy_config = ?');
    values.push(JSON.stringify(input.caddyConfig));
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

/**
 * 向后兼容：旧的 upsert 函数（已废弃，保留用于部署服务）
 * @deprecated 使用 createApplication 或 updateApplication 替代
 */
export function upsertApplication(params: { 
  name: string; 
  repo: string; 
  version: string; 
  port: number; 
  containerPort: number 
}): void {
  const db = getDb();
  const existing = getApplicationByName(params.name);
  
  if (existing) {
    // 更新
    db.prepare(`
      UPDATE applications 
      SET image = ?, version = ?, ports = ?, last_deployed_at = datetime('now'), status = 'running'
      WHERE name = ?
    `).run(
      params.repo,
      params.version,
      JSON.stringify([{ host: params.port, container: params.containerPort }]),
      params.name
    );
  } else {
    // 创建
    db.prepare(`
      INSERT INTO applications (name, image, version, ports, status, last_deployed_at)
      VALUES (?, ?, ?, ?, 'running', datetime('now'))
    `).run(
      params.name,
      params.repo,
      params.version,
      JSON.stringify([{ host: params.port, container: params.containerPort }])
    );
  }
}
