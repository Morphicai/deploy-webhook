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
 */
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
    projectId: parsed.scope === 'global' ? null : parsed.projectId,
    key: parsed.key,
    value: parsed.value,
    valueType: parsed.valueType || 'plain',
    secretId: parsed.secretId || null,
    description: parsed.description || null,
  };
  
  const db = getDb();
  db.prepare(
    `INSERT INTO environment_variables(scope, project_id, key, value, value_type, secret_id, description)
     VALUES (@scope, @projectId, @key, @value, @valueType, @secretId, @description)
     ON CONFLICT(scope, project_id, key)
     DO UPDATE SET 
       value = excluded.value, 
       value_type = excluded.value_type,
       secret_id = excluded.secret_id,
       description = excluded.description`
  ).run(normalized);

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
     WHERE ev.scope = ? AND ev.project_id IS ? AND ev.key = ?`
  ).get(normalized.scope, normalized.projectId, normalized.key);

  return mapRow(row);
}

/**
 * 列出环境变量
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
    ).all(projectId || null);
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
 * 根据 ID 删除环境变量
 */
export function deleteEnvEntryById(id: number): void {
  const db = getDb();
  db.prepare('DELETE FROM environment_variables WHERE id = ?').run(id);
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

