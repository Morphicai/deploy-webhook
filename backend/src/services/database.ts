import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

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
    CREATE TABLE IF NOT EXISTS secret_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      provider_id INTEGER,
      auto_sync INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (provider_id) REFERENCES secret_providers(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_secret_groups_provider_id ON secret_groups(provider_id);
    CREATE INDEX IF NOT EXISTS idx_secret_groups_auto_sync ON secret_groups(auto_sync);
    CREATE TRIGGER IF NOT EXISTS secret_groups_updated_at
    AFTER UPDATE ON secret_groups
    BEGIN
      UPDATE secret_groups SET updated_at = datetime('now') WHERE id = NEW.id;
    END;
    CREATE TABLE IF NOT EXISTS secrets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      group_id INTEGER NOT NULL,
      value TEXT NOT NULL,
      description TEXT,
      source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual', 'synced')),
      provider_id INTEGER,
      provider_reference TEXT,
      last_synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(group_id, name),
      FOREIGN KEY (group_id) REFERENCES secret_groups(id) ON DELETE CASCADE,
      FOREIGN KEY (provider_id) REFERENCES secret_providers(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_secrets_group_id ON secrets(group_id);
    CREATE INDEX IF NOT EXISTS idx_secrets_source ON secrets(source);
    CREATE INDEX IF NOT EXISTS idx_secrets_provider_id ON secrets(provider_id);
    CREATE TRIGGER IF NOT EXISTS secrets_updated_at
    AFTER UPDATE ON secrets
    BEGIN
      UPDATE secrets SET updated_at = datetime('now') WHERE id = NEW.id;
    END;
    CREATE TABLE IF NOT EXISTS environment_variables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scope TEXT NOT NULL CHECK(scope IN ('global', 'project')),
      project_id INTEGER,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      value_type TEXT NOT NULL DEFAULT 'plain' CHECK(value_type IN ('plain', 'secret_ref')),
      secret_id INTEGER,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(scope, project_id, key),
      FOREIGN KEY (project_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (secret_id) REFERENCES secrets(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_env_vars_project_id ON environment_variables(project_id);
    CREATE INDEX IF NOT EXISTS idx_env_vars_secret_id ON environment_variables(secret_id);
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
      webhook_enabled INTEGER NOT NULL DEFAULT 1,
      webhook_token TEXT,
      auto_deploy INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_applications_webhook_token ON applications(webhook_token);
    CREATE INDEX IF NOT EXISTS idx_applications_webhook_enabled ON applications(webhook_enabled);
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
    CREATE TABLE IF NOT EXISTS secret_providers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK(type IN ('infisical', 'aws-secrets-manager', 'hashicorp-vault', 'azure-keyvault', 'gcp-secret-manager')),
      config TEXT NOT NULL DEFAULT '{}',
      enabled INTEGER NOT NULL DEFAULT 1,
      auto_sync INTEGER NOT NULL DEFAULT 0,
      last_sync_at TEXT,
      last_sync_status TEXT,
      last_sync_error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_secret_providers_enabled ON secret_providers(enabled);
    CREATE INDEX IF NOT EXISTS idx_secret_providers_auto_sync ON secret_providers(auto_sync);
    CREATE TRIGGER IF NOT EXISTS secret_providers_updated_at
    AFTER UPDATE ON secret_providers
    BEGIN
      UPDATE secret_providers SET updated_at = datetime('now') WHERE id = NEW.id;
    END;
    CREATE TABLE IF NOT EXISTS secret_syncs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_id INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('success', 'failed', 'in_progress')),
      secrets_count INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (provider_id) REFERENCES secret_providers(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_secret_syncs_provider_id ON secret_syncs(provider_id);
    CREATE INDEX IF NOT EXISTS idx_secret_syncs_status ON secret_syncs(status);
    CREATE TABLE IF NOT EXISTS deployment_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      version TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'success', 'failed')),
      triggered_by TEXT NOT NULL CHECK(triggered_by IN ('webhook', 'manual', 'api')),
      error_message TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_deployment_logs_application_id ON deployment_logs(application_id);
    CREATE INDEX IF NOT EXISTS idx_deployment_logs_status ON deployment_logs(status);
    CREATE INDEX IF NOT EXISTS idx_deployment_logs_started_at ON deployment_logs(started_at);
  `);

  return db;
}

const databaseInstance = ensureDatabase();

// Initialize default repository
import { initializeDefaultRepository } from './repositoryStore';
initializeDefaultRepository();

// Initialize webhooks table
import { initializeWebhooksTable } from './webhookStore';
initializeWebhooksTable();

export function getDb(): Database.Database {
  return databaseInstance;
}
