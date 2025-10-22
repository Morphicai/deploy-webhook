import { z } from 'zod';
import { getDb } from './database';
import { getApplicationById } from './applicationStore';

const envEntrySchema = z.object({
  scope: z.enum(['global', 'project']),
  projectId: z.number().int().positive().optional(),
  key: z.string().min(1).max(128),
  value: z.string().max(2048),
});

export type EnvEntryInput = z.input<typeof envEntrySchema>;
export type EnvEntry = {
  id: number;
  scope: 'global' | 'project';
  projectId: number | null;
  projectName?: string; // 用于显示，从 applications 表关联获取
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
};

function mapRow(row: any): EnvEntry {
  return {
    id: row.id,
    scope: row.scope,
    projectId: row.projectId,
    projectName: row.projectName || undefined,
    key: row.key,
    value: row.value,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function upsertEnvEntry(input: EnvEntryInput): EnvEntry {
  const parsed = envEntrySchema.parse(input);
  
  // 验证：如果是 project 作用域，必须提供 projectId
  if (parsed.scope === 'project' && !parsed.projectId) {
    throw new Error('projectId is required for project scope');
  }
  
  // 验证：如果提供了 projectId，确保应用存在
  if (parsed.projectId) {
    const app = getApplicationById(parsed.projectId);
    if (!app) {
      throw new Error(`Application with id ${parsed.projectId} not found`);
    }
  }
  
  const normalized = {
    scope: parsed.scope,
    projectId: parsed.scope === 'global' ? null : parsed.projectId,
    key: parsed.key,
    value: parsed.value,
  };
  
  const db = getDb();
  db.prepare(
    `INSERT INTO environment_variables(scope, project_id, key, value)
     VALUES (@scope, @projectId, @key, @value)
     ON CONFLICT(scope, project_id, key)
     DO UPDATE SET value = excluded.value`
  ).run(normalized);

  const row = db.prepare(
    `SELECT 
       ev.id, 
       ev.scope, 
       ev.project_id as projectId, 
       a.name as projectName,
       ev.key, 
       ev.value, 
       ev.created_at as createdAt, 
       ev.updated_at as updatedAt
     FROM environment_variables ev
     LEFT JOIN applications a ON ev.project_id = a.id
     WHERE ev.scope = ? AND ev.project_id IS ? AND ev.key = ?`
  ).get(normalized.scope, normalized.projectId, normalized.key);

  return mapRow(row);
}

export function listEnvEntries(scope?: 'global' | 'project', projectId?: number): EnvEntry[] {
  const db = getDb();
  let rows;
  if (!scope) {
    rows = db.prepare(
      `SELECT 
         ev.id, 
         ev.scope, 
         ev.project_id as projectId, 
         a.name as projectName,
         ev.key, 
         ev.value, 
         ev.created_at as createdAt, 
         ev.updated_at as updatedAt
       FROM environment_variables ev
       LEFT JOIN applications a ON ev.project_id = a.id
       ORDER BY ev.scope, ev.project_id, ev.key`
    ).all();
  } else if (scope === 'global') {
    rows = db.prepare(
      `SELECT 
         ev.id, 
         ev.scope, 
         ev.project_id as projectId, 
         a.name as projectName,
         ev.key, 
         ev.value, 
         ev.created_at as createdAt, 
         ev.updated_at as updatedAt
       FROM environment_variables ev
       LEFT JOIN applications a ON ev.project_id = a.id
       WHERE ev.scope = 'global' 
       ORDER BY ev.key`
    ).all();
  } else {
    rows = db.prepare(
      `SELECT 
         ev.id, 
         ev.scope, 
         ev.project_id as projectId, 
         a.name as projectName,
         ev.key, 
         ev.value, 
         ev.created_at as createdAt, 
         ev.updated_at as updatedAt
       FROM environment_variables ev
       LEFT JOIN applications a ON ev.project_id = a.id
       WHERE ev.scope = 'project' AND ev.project_id = ? 
       ORDER BY ev.key`
    ).all(projectId || null);
  }
  return rows.map(mapRow);
}

export function deleteEnvEntry(scope: 'global' | 'project', key: string, projectId?: number): void {
  const db = getDb();
  const normalizedProjectId = scope === 'project' ? projectId : null;
  db.prepare(`DELETE FROM environment_variables WHERE scope = ? AND project_id IS ? AND key = ?`).run(scope, normalizedProjectId, key);
}

/**
 * 根据 scope, projectName 和 key 获取环境变量
 */
export function getEnvVarByKey(scope: 'global' | 'project', projectName: string, key: string): EnvEntry | null {
  const db = getDb();
  const row = db.prepare(
    `SELECT 
       ev.id, 
       ev.scope, 
       ev.project_id as projectId, 
       a.name as projectName,
       ev.key, 
       ev.value, 
       ev.created_at as createdAt, 
       ev.updated_at as updatedAt
     FROM environment_variables ev
     LEFT JOIN applications a ON ev.project_id = a.id
     WHERE ev.scope = ? AND (ev.project_id IS NULL OR a.name = ?) AND ev.key = ?`
  ).get(scope, projectName || null, key);
  return row ? mapRow(row) : null;
}

/**
 * 创建环境变量
 */
export function createEnvVar(input: { scope: 'global' | 'project'; projectName: string; key: string; value: string }): EnvEntry {
  const db = getDb();
  let projectId = null;
  
  if (input.scope === 'project' && input.projectName) {
    const app = db.prepare('SELECT id FROM applications WHERE name = ?').get(input.projectName) as { id: number } | undefined;
    if (!app) {
      throw new Error(`Application with name ${input.projectName} not found`);
    }
    projectId = app.id;
  }
  
  db.prepare(
    `INSERT INTO environment_variables(scope, project_id, key, value)
     VALUES (?, ?, ?, ?)`
  ).run(input.scope, projectId, input.key, input.value);
  
  const row = db.prepare(
    `SELECT 
       ev.id, 
       ev.scope, 
       ev.project_id as projectId, 
       a.name as projectName,
       ev.key, 
       ev.value, 
       ev.created_at as createdAt, 
       ev.updated_at as updatedAt
     FROM environment_variables ev
     LEFT JOIN applications a ON ev.project_id = a.id
     WHERE ev.scope = ? AND ev.project_id IS ? AND ev.key = ?`
  ).get(input.scope, projectId, input.key);
  
  return mapRow(row);
}

/**
 * 更新环境变量
 */
export function updateEnvVar(id: number, input: { value: string }): EnvEntry {
  const db = getDb();
  db.prepare('UPDATE environment_variables SET value = ? WHERE id = ?').run(input.value, id);
  
  const row = db.prepare(
    `SELECT 
       ev.id, 
       ev.scope, 
       ev.project_id as projectId, 
       a.name as projectName,
       ev.key, 
       ev.value, 
       ev.created_at as createdAt, 
       ev.updated_at as updatedAt
     FROM environment_variables ev
     LEFT JOIN applications a ON ev.project_id = a.id
     WHERE ev.id = ?`
  ).get(id);
  
  if (!row) throw new Error(`EnvVar with id=${id} not found`);
  return mapRow(row);
}

export function buildEnvironmentForProject(projectName: string): Record<string, string>;
export function buildEnvironmentForProject(projectId: number): Record<string, string>;
export function buildEnvironmentForProject(projectIdentifier: string | number): Record<string, string> {
  const db = getDb();
  type Row = { scope: 'global' | 'project'; projectId: number | null; key: string; value: string };
  
  let rows: Row[];
  
  if (typeof projectIdentifier === 'number') {
    // 使用 projectId 查询
    rows = db.prepare(
      `SELECT scope, project_id as projectId, key, value
       FROM environment_variables
       WHERE scope = 'global' OR (scope = 'project' AND project_id = ?)`
    ).all(projectIdentifier) as Row[];
  } else {
    // 使用 projectName 查询（向后兼容）
    rows = db.prepare(
      `SELECT ev.scope, ev.project_id as projectId, ev.key, ev.value
       FROM environment_variables ev
       LEFT JOIN applications a ON ev.project_id = a.id
       WHERE ev.scope = 'global' OR (ev.scope = 'project' AND a.name = ?)`
    ).all(projectIdentifier) as Row[];
  }

  const envMap: Record<string, string> = {};
  // 先应用 global 变量
  for (const row of rows) {
    if (row.scope === 'global') {
      envMap[row.key] = row.value;
    }
  }
  // project 变量覆盖 global 变量
  for (const row of rows) {
    if (row.scope === 'project') {
      envMap[row.key] = row.value;
    }
  }
  return envMap;
}
