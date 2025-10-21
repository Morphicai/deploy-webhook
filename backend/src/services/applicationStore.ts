import { z } from 'zod';
import { getDb } from './database';

const applicationSchema = z.object({
  name: z.string().min(1).max(128),
  repo: z.string().min(1).max(256),
  version: z.string().min(1).max(128),
  port: z.number().int(),
  containerPort: z.number().int(),
});

export type ApplicationUpsertInput = z.input<typeof applicationSchema>;
export type ApplicationRecord = {
  id: number;
  name: string;
  repo: string;
  version: string;
  port: number;
  containerPort: number;
  lastDeployedAt: string;
  createdAt: string;
  updatedAt: string;
};

function mapRow(row: any): ApplicationRecord {
  return {
    id: row.id,
    name: row.name,
    repo: row.repo,
    version: row.version,
    port: row.port,
    containerPort: row.containerPort,
    lastDeployedAt: row.lastDeployedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function upsertApplication(input: ApplicationUpsertInput): ApplicationRecord {
  const parsed = applicationSchema.parse(input);
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO applications(name, repo, version, port, container_port, last_deployed_at, created_at, updated_at)
     VALUES (@name, @repo, @version, @port, @containerPort, @lastDeployedAt, @createdAt, @updatedAt)
     ON CONFLICT(name) DO UPDATE SET
       repo = excluded.repo,
       version = excluded.version,
       port = excluded.port,
       container_port = excluded.container_port,
       last_deployed_at = excluded.last_deployed_at,
       updated_at = excluded.updated_at`
  ).run({
    ...parsed,
    lastDeployedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  const row = db.prepare(
    `SELECT id, name, repo, version, port, container_port as containerPort, last_deployed_at as lastDeployedAt,
            created_at as createdAt, updated_at as updatedAt
     FROM applications WHERE name = ?`
  ).get(parsed.name);

  return mapRow(row);
}

export function listApplications(): ApplicationRecord[] {
  const db = getDb();
  const rows = db.prepare(
    `SELECT id, name, repo, version, port, container_port as containerPort, last_deployed_at as lastDeployedAt,
            created_at as createdAt, updated_at as updatedAt
     FROM applications ORDER BY updated_at DESC`
  ).all();
  return rows.map(mapRow);
}
