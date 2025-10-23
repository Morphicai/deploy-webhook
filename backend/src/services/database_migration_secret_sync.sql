-- 创建 secret_syncs 表（替代 secret_providers）
CREATE TABLE IF NOT EXISTS secret_syncs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  
  -- 来源配置
  source_type TEXT NOT NULL DEFAULT 'infisical' CHECK(source_type = 'infisical'),
  source_config TEXT NOT NULL,  -- JSON: {clientId, clientSecret, projectId, environment, path, siteUrl}
  
  -- 目标配置
  target_group_id INTEGER NOT NULL,
  
  -- 同步配置
  sync_strategy TEXT NOT NULL DEFAULT 'merge' CHECK(sync_strategy IN ('merge', 'replace')),
  sync_trigger TEXT NOT NULL DEFAULT 'manual' CHECK(sync_trigger IN ('manual', 'webhook', 'schedule')),
  
  -- Webhook 配置
  webhook_token TEXT UNIQUE,
  
  -- 定时配置
  schedule_enabled INTEGER NOT NULL DEFAULT 0,
  schedule_interval INTEGER,  -- 分钟
  
  -- 状态
  enabled INTEGER NOT NULL DEFAULT 1,
  last_sync_at TEXT,
  last_sync_status TEXT CHECK(last_sync_status IN ('success', 'failed', 'in_progress')),
  last_sync_error TEXT,
  
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (target_group_id) REFERENCES secret_groups(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_secret_syncs_target_group ON secret_syncs(target_group_id);
CREATE INDEX IF NOT EXISTS idx_secret_syncs_webhook_token ON secret_syncs(webhook_token);
CREATE INDEX IF NOT EXISTS idx_secret_syncs_enabled ON secret_syncs(enabled);
CREATE INDEX IF NOT EXISTS idx_secret_syncs_schedule ON secret_syncs(schedule_enabled, schedule_interval);

-- 触发器
CREATE TRIGGER IF NOT EXISTS secret_syncs_updated_at
AFTER UPDATE ON secret_syncs
BEGIN
  UPDATE secret_syncs SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- 迁移说明：
-- 1. 旧的 secret_providers 表可以保留或删除
-- 2. secret_groups 表移除 provider_id, sync_enabled, sync_path, sync_strategy
-- 3. secrets 表保留 synced_from_provider_id (重命名为 synced_from_sync_id)

-- 简化 secret_groups 表
-- ALTER TABLE secret_groups DROP COLUMN provider_id;
-- ALTER TABLE secret_groups DROP COLUMN auto_sync;
-- ALTER TABLE secret_groups DROP COLUMN sync_path;
-- ALTER TABLE secret_groups DROP COLUMN sync_strategy;

-- 更新 secrets 表字段名
-- ALTER TABLE secrets RENAME COLUMN synced_from_provider_id TO synced_from_sync_id;

