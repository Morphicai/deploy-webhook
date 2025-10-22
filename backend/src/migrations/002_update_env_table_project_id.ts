import { getDb } from '../services/database';

/**
 * 迁移：将 environment_variables 表的 project_name 改为 project_id
 * 并添加外键关联到 applications 表
 */
export function migration002_updateEnvTableProjectId() {
  const db = getDb();
  
  console.log('[Migration 002] Starting: Update environment_variables table to use project_id');
  
  try {
    // 检查是否已经有 project_id 列
    const tableInfo = db.pragma('table_info(environment_variables)') as Array<{ name: string }>;
    const hasProjectId = tableInfo.some((col) => col.name === 'project_id');
    
    if (hasProjectId) {
      console.log('[Migration 002] project_id column already exists, skipping migration');
      return;
    }
    
    // 1. 创建新表
    db.exec(`
      CREATE TABLE environment_variables_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scope TEXT NOT NULL CHECK(scope IN ('global', 'project')),
        project_id INTEGER,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(scope, project_id, key),
        FOREIGN KEY (project_id) REFERENCES applications(id) ON DELETE CASCADE
      );
    `);
    
    // 2. 迁移数据：将 project_name 转换为 project_id
    db.exec(`
      INSERT INTO environment_variables_new (id, scope, project_id, key, value, created_at, updated_at)
      SELECT 
        ev.id,
        ev.scope,
        CASE 
          WHEN ev.scope = 'global' THEN NULL
          ELSE a.id
        END as project_id,
        ev.key,
        ev.value,
        ev.created_at,
        ev.updated_at
      FROM environment_variables ev
      LEFT JOIN applications a ON ev.project_name = a.name
      WHERE ev.scope = 'global' OR (ev.scope = 'project' AND a.id IS NOT NULL);
    `);
    
    // 3. 删除旧表，重命名新表
    db.exec(`
      DROP TABLE environment_variables;
      ALTER TABLE environment_variables_new RENAME TO environment_variables;
    `);
    
    // 4. 重新创建触发器
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS environment_variables_updated_at
      AFTER UPDATE ON environment_variables
      BEGIN
        UPDATE environment_variables SET updated_at = datetime('now') WHERE id = NEW.id;
      END;
    `);
    
    // 5. 创建索引
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_environment_variables_project_id 
      ON environment_variables(project_id);
      
      CREATE INDEX IF NOT EXISTS idx_environment_variables_scope 
      ON environment_variables(scope);
    `);
    
    console.log('[Migration 002] Completed: environment_variables table updated successfully');
  } catch (error) {
    console.error('[Migration 002] Failed:', error);
    throw error;
  }
}

