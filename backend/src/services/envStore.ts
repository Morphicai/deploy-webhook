import { z } from 'zod';
import { getDb } from './database';
import { getApplicationById } from './applicationStore';
import { getSecretById, getSecretValue } from './secretStore';

/**
 * 环境变量值类型
 */
export type EnvValueType = 'plain' | 'secret_ref';

/**
 * 环境变量记录
 */
export interface EnvEntry {
  id: number;
  scope: 'global' | 'project';
  projectId: number | null;
  projectName?: string;
  key: string;
  value: string;
  valueType: EnvValueType;
  secretId: number | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 环境变量输入验证
 */
const envEntrySchema = z.object({
  scope: z.enum(['global', 'project']),
  projectId: z.number().int().positive().optional(),
  key: z.string().min(1).max(128),
  value: z.string().max(2048),
  valueType: z.enum(['plain', 'secret_ref']).optional(),
  secretId: z.number().int().positive().nullable().optional(),
  description: z.string().max(512).optional(),
});

export type EnvEntryInput = z.input<typeof envEntrySchema>;

/**
 * 映射数据库行到接口
 */
function mapRow(row: any): EnvEntry {
  return {
    id: row.id,
    scope: row.scope,
    projectId: row.projectId,
    projectName: row.projectName || undefined,
    key: row.key,
    value: row.value,
    valueType: row.value_type || 'plain',
    secretId: row.secret_id,
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * 创建或更新环境变量
 * @returns {entry: EnvEntry, created: boolean} entry 和是否新创建的标志
 */
export function upsertEnvEntry(input: EnvEntryInput): { entry: EnvEntry; created: boolean } {
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
  
  // 验证：如果 valueType 是 secret_ref，必须提供 secretId
  if (parsed.valueType === 'secret_ref') {
    if (!parsed.secretId) {
      throw new Error('secretId is required when valueType is secret_ref');
    }
    
    // 验证秘钥是否存在
    const secret = getSecretById(parsed.secretId);
    if (!secret) {
      throw new Error(`Secret with id ${parsed.secretId} not found`);
    }
    
    // value 应该是 @secret:id 格式
    if (!parsed.value.startsWith('@secret:')) {
      parsed.value = `@secret:${parsed.secretId}`;
    }
  }
  
  const normalized = {
    scope: parsed.scope,
    projectId: parsed.scope === 'global' ? null : (parsed.projectId || null),
    key: parsed.key,
    value: parsed.value,
    valueType: parsed.valueType || 'plain',
    secretId: parsed.secretId || null,
    description: parsed.description || null,
  };
  
  const db = getDb();
  
  // 检查是否已存在
  let existing: any;
  if (normalized.projectId === null) {
    existing = db.prepare(
      `SELECT id FROM environment_variables WHERE scope = ? AND project_id IS NULL AND key = ?`
    ).get(normalized.scope, normalized.key);
  } else {
    existing = db.prepare(
      `SELECT id FROM environment_variables WHERE scope = ? AND project_id = ? AND key = ?`
    ).get(normalized.scope, normalized.projectId, normalized.key);
  }
  
  const created = !existing;
  
  // 根据是否存在，执行 INSERT 或 UPDATE
  if (existing) {
    // 更新现有记录
    db.prepare(
      `UPDATE environment_variables 
       SET value = ?, value_type = ?, secret_id = ?, description = ?
       WHERE id = ?`
    ).run(normalized.value, normalized.valueType, normalized.secretId, normalized.description, existing.id);
  } else {
    // 插入新记录
    db.prepare(
      `INSERT INTO environment_variables(scope, project_id, key, value, value_type, secret_id, description)
       VALUES (@scope, @projectId, @key, @value, @valueType, @secretId, @description)`
    ).run(normalized);
  }

  // 查询创建/更新后的记录
  let row;
  if (normalized.projectId === null) {
    row = db.prepare(
      `SELECT 
         ev.id, 
         ev.scope, 
         ev.project_id as projectId, 
         a.name as projectName,
         ev.key, 
         ev.value,
         ev.value_type,
         ev.secret_id,
         ev.description,
         ev.created_at as createdAt, 
         ev.updated_at as updatedAt
       FROM environment_variables ev
       LEFT JOIN applications a ON ev.project_id = a.id
       WHERE ev.scope = ? AND ev.project_id IS NULL AND ev.key = ?`
    ).get(normalized.scope, normalized.key);
  } else {
    row = db.prepare(
      `SELECT 
         ev.id, 
         ev.scope, 
         ev.project_id as projectId, 
         a.name as projectName,
         ev.key, 
         ev.value,
         ev.value_type,
         ev.secret_id,
         ev.description,
         ev.created_at as createdAt, 
         ev.updated_at as updatedAt
       FROM environment_variables ev
       LEFT JOIN applications a ON ev.project_id = a.id
       WHERE ev.scope = ? AND ev.project_id = ? AND ev.key = ?`
    ).get(normalized.scope, normalized.projectId, normalized.key);
  }

  return { entry: mapRow(row), created };
}

/**
 * 通过 ID 获取环境变量
 */
export function getEnvEntryById(id: number): EnvEntry | null {
  const db = getDb();
  const row = db.prepare(
    `SELECT 
       ev.id, 
       ev.scope, 
       ev.project_id as projectId, 
       a.name as projectName,
       ev.key, 
       ev.value,
       ev.value_type,
       ev.secret_id,
       ev.description,
       ev.created_at as createdAt, 
       ev.updated_at as updatedAt
     FROM environment_variables ev
     LEFT JOIN applications a ON ev.project_id = a.id
     WHERE ev.id = ?`
  ).get(id);
  
  return row ? mapRow(row) : null;
}

/**
 * 通过 ID 更新环境变量
 */
const updateEnvEntrySchema = z.object({
  value: z.string().max(2048).optional(),
  valueType: z.enum(['plain', 'secret_ref']).optional(),
  secretId: z.number().int().positive().nullable().optional(),
  description: z.string().max(512).optional(),
});

export function updateEnvEntryById(id: number, input: z.input<typeof updateEnvEntrySchema>): EnvEntry {
  const parsed = updateEnvEntrySchema.parse(input);
  const db = getDb();
  
  const current = getEnvEntryById(id);
  if (!current) {
    throw new Error(`Environment variable with id=${id} not found`);
  }
  
  // 验证：如果 valueType 是 secret_ref，必须提供 secretId
  if (parsed.valueType === 'secret_ref' || (parsed.secretId && !parsed.valueType)) {
    const secretId = parsed.secretId ?? current.secretId;
    if (!secretId) {
      throw new Error('secretId is required when valueType is secret_ref');
    }
    
    // 验证秘钥是否存在
    const secret = getSecretById(secretId);
    if (!secret) {
      throw new Error(`Secret with id ${secretId} not found`);
    }
  }
  
  const updates: string[] = [];
  const values: any[] = [];
  
  if (parsed.value !== undefined) {
    updates.push('value = ?');
    values.push(parsed.value);
  }
  
  if (parsed.valueType !== undefined) {
    updates.push('value_type = ?');
    values.push(parsed.valueType);
  }
  
  if (parsed.secretId !== undefined) {
    updates.push('secret_id = ?');
    values.push(parsed.secretId);
  }
  
  if (parsed.description !== undefined) {
    updates.push('description = ?');
    values.push(parsed.description || null);
  }
  
  if (updates.length === 0) return current;
  
  values.push(id);
  db.prepare(`UPDATE environment_variables SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  
  const updated = getEnvEntryById(id);
  if (!updated) throw new Error('Failed to update environment variable');
  return updated;
}

/**
 * 通过 ID 删除环境变量
 */
export function deleteEnvEntryById(id: number): void {
  const db = getDb();
  const entry = getEnvEntryById(id);
  if (!entry) {
    throw new Error(`Environment variable with id=${id} not found`);
  }
  db.prepare('DELETE FROM environment_variables WHERE id = ?').run(id);
}

/**
 * 列出环境变量
 * @param scope - 作用域过滤 (global | project)
 * @param projectId - 项目 ID 过滤（仅当 scope 为 project 时使用）
 */
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
         ev.value_type,
         ev.secret_id,
         ev.description,
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
         ev.value_type,
         ev.secret_id,
         ev.description,
         ev.created_at as createdAt, 
         ev.updated_at as updatedAt
       FROM environment_variables ev
       LEFT JOIN applications a ON ev.project_id = a.id
       WHERE ev.scope = 'global' 
       ORDER BY ev.key`
    ).all();
  } else {
    // project scope
    if (projectId === undefined) {
      // 返回所有项目作用域的环境变量
      rows = db.prepare(
        `SELECT 
           ev.id, 
           ev.scope, 
           ev.project_id as projectId, 
           a.name as projectName,
           ev.key, 
           ev.value,
           ev.value_type,
           ev.secret_id,
           ev.description,
           ev.created_at as createdAt, 
           ev.updated_at as updatedAt
         FROM environment_variables ev
         LEFT JOIN applications a ON ev.project_id = a.id
         WHERE ev.scope = 'project'
         ORDER BY ev.key`
      ).all();
    } else {
      // 通过 projectId 过滤
      rows = db.prepare(
        `SELECT 
           ev.id, 
           ev.scope, 
           ev.project_id as projectId, 
           a.name as projectName,
           ev.key, 
           ev.value,
           ev.value_type,
           ev.secret_id,
           ev.description,
           ev.created_at as createdAt, 
           ev.updated_at as updatedAt
         FROM environment_variables ev
         LEFT JOIN applications a ON ev.project_id = a.id
         WHERE ev.scope = 'project' AND ev.project_id = ? 
         ORDER BY ev.key`
      ).all(projectId);
    }
  }
  
  return rows.map(mapRow);
}

/**
 * 删除环境变量
 */
export function deleteEnvEntry(scope: 'global' | 'project', key: string, projectId?: number): void {
  const db = getDb();
  const normalizedProjectId = scope === 'project' ? projectId : null;
  db.prepare(`DELETE FROM environment_variables WHERE scope = ? AND project_id IS ? AND key = ?`).run(scope, normalizedProjectId, key);
}

/**
 * 解析环境变量值（处理秘钥引用）
 */
export function resolveEnvValue(envVar: EnvEntry): string {
  switch (envVar.valueType) {
    case 'plain':
      return envVar.value;
      
    case 'secret_ref':
      if (!envVar.secretId) {
        throw new Error(`Secret reference missing for ${envVar.key}`);
      }
      
      try {
        return getSecretValue(envVar.secretId);
      } catch (error: any) {
        console.error(`[EnvStore] Failed to resolve secret for ${envVar.key}:`, error);
        throw new Error(`Failed to resolve secret for ${envVar.key}: ${error.message}`);
      }
      
    default:
      return envVar.value;
  }
}

/**
 * 构建项目的环境变量映射（解析所有秘钥引用）
 */
export function buildEnvironmentForProject(projectId: number): Promise<Record<string, string>>;
export function buildEnvironmentForProject(projectName: string): Promise<Record<string, string>>;
export async function buildEnvironmentForProject(projectIdentifier: string | number): Promise<Record<string, string>> {
  const db = getDb();
  type Row = { 
    scope: 'global' | 'project'; 
    projectId: number | null; 
    key: string; 
    value: string;
    value_type: EnvValueType;
    secret_id: number | null;
  };
  
  let rows: Row[];
  
  if (typeof projectIdentifier === 'number') {
    // 使用 projectId 查询
    rows = db.prepare(
      `SELECT scope, project_id as projectId, key, value, value_type, secret_id
       FROM environment_variables
       WHERE scope = 'global' OR (scope = 'project' AND project_id = ?)`
    ).all(projectIdentifier) as Row[];
  } else {
    // 使用 projectName 查询（向后兼容）
    rows = db.prepare(
      `SELECT ev.scope, ev.project_id as projectId, ev.key, ev.value, ev.value_type, ev.secret_id
       FROM environment_variables ev
       LEFT JOIN applications a ON ev.project_id = a.id
       WHERE ev.scope = 'global' OR (ev.scope = 'project' AND a.name = ?)`
    ).all(projectIdentifier) as Row[];
  }

  const envMap: Record<string, string> = {};
  
  // 先应用 global 变量
  for (const row of rows) {
    if (row.scope === 'global') {
      const envVar = mapRow({ ...row, value_type: row.value_type, secret_id: row.secret_id });
      try {
        envMap[row.key] = resolveEnvValue(envVar);
      } catch (error: any) {
        console.error(`[EnvStore] Failed to resolve global env var ${row.key}:`, error);
        // 跳过无法解析的变量
      }
    }
  }
  
  // project 变量覆盖 global 变量
  for (const row of rows) {
    if (row.scope === 'project') {
      const envVar = mapRow({ ...row, value_type: row.value_type, secret_id: row.secret_id });
      try {
        envMap[row.key] = resolveEnvValue(envVar);
      } catch (error: any) {
        console.error(`[EnvStore] Failed to resolve project env var ${row.key}:`, error);
        // 跳过无法解析的变量
      }
    }
  }
  
  return envMap;
}

/**
 * 批量导入秘钥分组到项目
 */
export function importSecretGroupToProject(groupId: number, projectId: number): {
  success: boolean;
  imported: number;
  skipped: number;
  errors: Array<{ key: string; error: string }>;
} {
  const db = getDb();
  
  // 获取分组内的所有秘钥
  const secrets = db.prepare(`
    SELECT id, name FROM secrets WHERE group_id = ?
  `).all(groupId) as Array<{ id: number; name: string }>;
  
  const results = {
    success: true,
    imported: 0,
    skipped: 0,
    errors: [] as Array<{ key: string; error: string }>,
  };
  
  for (const secret of secrets) {
    try {
      // 检查是否已存在
      const existing = db.prepare(`
        SELECT id FROM environment_variables 
        WHERE scope = 'project' AND project_id = ? AND key = ?
      `).get(projectId, secret.name);
      
      if (existing) {
        results.skipped++;
        continue;
      }
      
      // 创建环境变量引用
      upsertEnvEntry({
        scope: 'project',
        projectId,
        key: secret.name,
        value: `@secret:${secret.id}`,
        valueType: 'secret_ref',
        secretId: secret.id,
      });
      
      results.imported++;
    } catch (error: any) {
      results.success = false;
      results.errors.push({
        key: secret.name,
        error: error.message,
      });
    }
  }
  
  return results;
}

