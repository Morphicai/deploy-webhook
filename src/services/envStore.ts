import { z } from 'zod';
import { getDb } from './database';

const envEntrySchema = z.object({
  scope: z.enum(['global', 'project']),
  projectName: z.string().max(128).default(''),
  key: z.string().min(1).max(128),
  value: z.string().max(2048),
});

export type EnvEntryInput = z.input<typeof envEntrySchema>;
export type EnvEntry = {
  id: number;
  scope: 'global' | 'project';
  projectName: string;
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
};

function mapRow(row: any): EnvEntry {
  return {
    id: row.id,
    scope: row.scope,
    projectName: row.projectName,
    key: row.key,
    value: row.value,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function upsertEnvEntry(input: EnvEntryInput): EnvEntry {
  const parsed = envEntrySchema.parse(input);
  const normalized = {
    ...parsed,
    projectName: parsed.scope === 'global' ? '' : parsed.projectName,
  };
  const db = getDb();
  db.prepare(
    `INSERT INTO environment_variables(scope, project_name, key, value)
     VALUES (@scope, @projectName, @key, @value)
     ON CONFLICT(scope, project_name, key)
     DO UPDATE SET value = excluded.value`
  ).run(normalized);

  const row = db.prepare(
    `SELECT id, scope, project_name as projectName, key, value, created_at as createdAt, updated_at as updatedAt
     FROM environment_variables WHERE scope = ? AND project_name = ? AND key = ?`
  ).get(normalized.scope, normalized.projectName, normalized.key);

  return mapRow(row);
}

export function listEnvEntries(scope?: 'global' | 'project', projectName?: string): EnvEntry[] {
  const db = getDb();
  let rows;
  if (!scope) {
    rows = db.prepare(
      `SELECT id, scope, project_name as projectName, key, value, created_at as createdAt, updated_at as updatedAt
       FROM environment_variables ORDER BY scope, project_name, key`
    ).all();
  } else if (scope === 'global') {
    rows = db.prepare(
      `SELECT id, scope, project_name as projectName, key, value, created_at as createdAt, updated_at as updatedAt
       FROM environment_variables WHERE scope = 'global' ORDER BY key`
    ).all();
  } else {
    rows = db.prepare(
      `SELECT id, scope, project_name as projectName, key, value, created_at as createdAt, updated_at as updatedAt
       FROM environment_variables WHERE scope = 'project' AND project_name = ? ORDER BY key`
    ).all(projectName || '');
  }
  return rows.map(mapRow);
}

export function deleteEnvEntry(scope: 'global' | 'project', key: string, projectName = ''): void {
  const db = getDb();
  const normalizedProject = scope === 'project' ? projectName : '';
  db.prepare(`DELETE FROM environment_variables WHERE scope = ? AND project_name = ? AND key = ?`).run(scope, normalizedProject, key);
}

export function buildEnvironmentForProject(projectName: string): Record<string, string> {
  const db = getDb();
  type Row = { scope: 'global' | 'project'; projectName: string; key: string; value: string };
  const rows = db.prepare(
    `SELECT scope, project_name as projectName, key, value
     FROM environment_variables
     WHERE scope = 'global' OR (scope = 'project' AND project_name = ?)`
  ).all(projectName) as Row[];

  const envMap: Record<string, string> = {};
  for (const row of rows) {
    if (row.scope === 'global') {
      envMap[row.key] = row.value;
    }
  }
  for (const row of rows) {
    if (row.scope === 'project') {
      envMap[row.key] = row.value;
    }
  }
  return envMap;
}
