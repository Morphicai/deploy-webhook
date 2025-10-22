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

  const isNewDatabase = !fs.existsSync(DB_FILE);
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
    CREATE TABLE IF NOT EXISTS environment_variables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scope TEXT NOT NULL CHECK(scope IN ('global', 'project')),
      project_name TEXT NOT NULL DEFAULT '',
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(scope, project_name, key)
    );
    CREATE TRIGGER IF NOT EXISTS environment_variables_updated_at
    AFTER UPDATE ON environment_variables
    BEGIN
      UPDATE environment_variables SET updated_at = datetime('now') WHERE id = NEW.id;
    END;
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      image TEXT NOT NULL,
      version TEXT,
      repository_id INTEGER,
      ports TEXT NOT NULL DEFAULT '[]',
      env_vars TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'stopped',
      last_deployed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE SET NULL
    );
    CREATE TRIGGER IF NOT EXISTS applications_updated_at
    AFTER UPDATE ON applications
    BEGIN
      UPDATE applications SET updated_at = datetime('now') WHERE id = NEW.id;
    END;
    CREATE TABLE IF NOT EXISTS domains (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain_name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      application_id INTEGER,
      target_url TEXT NOT NULL,
      caddy_config TEXT NOT NULL DEFAULT '{}',
      enabled INTEGER NOT NULL DEFAULT 1,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_domains_application_id ON domains(application_id);
    CREATE INDEX IF NOT EXISTS idx_domains_enabled ON domains(enabled);
    CREATE TRIGGER IF NOT EXISTS domains_updated_at
    AFTER UPDATE ON domains
    BEGIN
      UPDATE domains SET updated_at = datetime('now') WHERE id = NEW.id;
    END;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TRIGGER IF NOT EXISTS users_updated_at
    AFTER UPDATE ON users
    BEGIN
      UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id;
    END;
    CREATE TABLE IF NOT EXISTS repositories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      registry TEXT NOT NULL,
      authType TEXT NOT NULL,
      username TEXT,
      password TEXT,
      token TEXT,
      isDefault INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TRIGGER IF NOT EXISTS repositories_updated_at
    AFTER UPDATE ON repositories
    BEGIN
      UPDATE repositories SET updatedAt = datetime('now') WHERE id = NEW.id;
    END;
    CREATE TABLE IF NOT EXISTS image_whitelists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repository_id INTEGER,
      image_pattern TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE
    );
    CREATE TRIGGER IF NOT EXISTS image_whitelists_updated_at
    AFTER UPDATE ON image_whitelists
    BEGIN
      UPDATE image_whitelists SET updated_at = datetime('now') WHERE id = NEW.id;
    END;
    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TRIGGER IF NOT EXISTS system_settings_updated_at
    AFTER UPDATE ON system_settings
    BEGIN
      UPDATE system_settings SET updated_at = datetime('now') WHERE id = NEW.id;
    END;
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      key_hash TEXT NOT NULL UNIQUE,
      key_prefix TEXT NOT NULL,
      permission TEXT NOT NULL DEFAULT 'full',
      enabled INTEGER NOT NULL DEFAULT 1,
      expires_at TEXT,
      last_used_at TEXT,
      last_used_ip TEXT,
      usage_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_api_keys_enabled ON api_keys(enabled);
    CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
    CREATE TRIGGER IF NOT EXISTS api_keys_updated_at
    AFTER UPDATE ON api_keys
    BEGIN
      UPDATE api_keys SET updated_at = datetime('now') WHERE id = NEW.id;
    END;
  `);

  return db;
}

const databaseInstance = ensureDatabase();

// Initialize default repository
import { initializeDefaultRepository } from './repositoryStore';
initializeDefaultRepository();

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
