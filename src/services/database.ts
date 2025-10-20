import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export type SecretProvider = 'infisical' | 'file' | 'docker-secret';

export interface SecretRecord {
  id: number;
  name: string;
  provider: SecretProvider;
  reference: string;
  metadata: string;
  createdAt: string;
  updatedAt: string;
}

type RawSecretRow = {
  id: number;
  name: string;
  provider: SecretProvider;
  reference: string;
  metadata: string | null;
  createdAt: string;
  updatedAt: string;
};

export const DB_DIR = process.env.DB_PATH || path.join(process.cwd(), 'data');
export const DB_FILE = path.join(DB_DIR, 'deploy-webhook.db');

function ensureDatabase(): Database.Database {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const db = new Database(DB_FILE);

  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS secrets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      provider TEXT NOT NULL,
      reference TEXT NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TRIGGER IF NOT EXISTS secrets_updated_at
    AFTER UPDATE ON secrets
    BEGIN
      UPDATE secrets SET updated_at = datetime('now') WHERE id = NEW.id;
    END;
  `);

  return db;
}

const databaseInstance = ensureDatabase();

export function getDb(): Database.Database {
  return databaseInstance;
}

function mapRow(row: RawSecretRow): SecretRecord {
  return {
    id: row.id,
    name: row.name,
    provider: row.provider,
    reference: row.reference,
    metadata: row.metadata ?? '{}',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function listSecrets(): SecretRecord[] {
  const stmt = databaseInstance.prepare<[], RawSecretRow>(
    `SELECT id, name, provider, reference, metadata, created_at as createdAt, updated_at as updatedAt FROM secrets ORDER BY id DESC`
  );
  return stmt.all().map(mapRow);
}

export function getSecretByName(name: string): SecretRecord | undefined {
  const stmt = databaseInstance.prepare<[string], RawSecretRow>(
    `SELECT id, name, provider, reference, metadata, created_at as createdAt, updated_at as updatedAt FROM secrets WHERE name = ?`
  );
  const row = stmt.get(name);
  return row ? mapRow(row) : undefined;
}

interface CreateSecretInput {
  name: string;
  provider: 'infisical' | 'file' | 'docker-secret';
  reference: string;
  metadata?: Record<string, unknown>;
}

export function createSecret(input: CreateSecretInput): SecretRecord {
  const stmt = databaseInstance.prepare<{ name: string; provider: string; reference: string; metadata: string }>(
    `INSERT INTO secrets (name, provider, reference, metadata) VALUES (@name, @provider, @reference, @metadata)`
  );
  const metadata = JSON.stringify(input.metadata || {});
  const info = stmt.run({ ...input, metadata });
  return {
    id: Number(info.lastInsertRowid),
    name: input.name,
    provider: input.provider,
    reference: input.reference,
    metadata,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

interface UpdateSecretInput {
  id: number;
  provider?: 'infisical' | 'file' | 'docker-secret';
  reference?: string;
  metadata?: Record<string, unknown>;
}

export function updateSecret(input: UpdateSecretInput): SecretRecord {
  const currentRaw = databaseInstance
    .prepare<[number], RawSecretRow & { created_at?: string; updated_at?: string }>(`SELECT id, name, provider, reference, metadata, created_at as createdAt, updated_at as updatedAt FROM secrets WHERE id = ?`)
    .get(input.id);
  if (!currentRaw) throw new Error(`Secret with id=${input.id} not found`);
  const current = mapRow(currentRaw);
  if (!current) throw new Error(`Secret with id=${input.id} not found`);

  const provider = input.provider ?? current.provider;
  const reference = input.reference ?? current.reference;
  const metadata = JSON.stringify(input.metadata ?? JSON.parse(current.metadata || '{}'));

  databaseInstance
    .prepare<{ id: number; provider: string; reference: string; metadata: string }>(
      `UPDATE secrets SET provider = @provider, reference = @reference, metadata = @metadata WHERE id = @id`
    )
    .run({ id: input.id, provider, reference, metadata });

  return {
    id: input.id,
    name: current.name,
    provider,
    reference,
    metadata,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
  };
}

export function deleteSecret(id: number): void {
  databaseInstance.prepare(`DELETE FROM secrets WHERE id = ?`).run(id);
}
