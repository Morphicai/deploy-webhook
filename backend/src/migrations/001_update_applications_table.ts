import Database from 'better-sqlite3';
import { DB_FILE } from '../services/database';

/**
 * 迁移脚本：更新 applications 表结构
 * 从旧结构迁移到新结构
 */
export function migrateApplicationsTable() {
  const db = new Database(DB_FILE);

  console.log('[Migration] Checking applications table structure...');

  try {
    // 检查表是否存在
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='applications'
    `).get();

    if (!tableExists) {
      console.log('[Migration] Applications table does not exist, will be created by initDb');
      return;
    }

    // 获取当前表结构
    const columns = db.prepare(`PRAGMA table_info(applications)`).all() as any[];
    const columnNames = columns.map((col: any) => col.name);

    console.log('[Migration] Current columns:', columnNames);

    // 检查是否需要迁移
    const needsMigration = 
      columnNames.includes('repo') || // 旧字段
      columnNames.includes('port') || // 旧字段
      columnNames.includes('container_port') || // 旧字段
      !columnNames.includes('ports') || // 新字段
      !columnNames.includes('env_vars'); // 新字段

    if (!needsMigration) {
      console.log('[Migration] Table structure is up to date');
      return;
    }

    console.log('[Migration] Migrating applications table...');

    // 开始事务
    db.exec('BEGIN TRANSACTION');

    try {
      // 1. 重命名旧表
      db.exec('ALTER TABLE applications RENAME TO applications_old');

      // 2. 创建新表
      db.exec(`
        CREATE TABLE applications (
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
        )
      `);

      // 3. 迁移数据
      const oldApps = db.prepare('SELECT * FROM applications_old').all() as any[];
      
      console.log(`[Migration] Migrating ${oldApps.length} applications...`);

      for (const app of oldApps) {
        // 转换旧数据格式到新格式
        const image = app.repo || app.image || 'unknown';
        const version = app.version || null;
        const ports = app.port && app.container_port 
          ? JSON.stringify([{ host: app.port, container: app.container_port }])
          : (app.ports || '[]');
        const envVars = app.env_vars || '{}';
        const status = app.status || 'stopped';

        db.prepare(`
          INSERT INTO applications (
            id, name, image, version, repository_id, ports, env_vars, 
            status, last_deployed_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          app.id,
          app.name,
          image,
          version,
          app.repository_id || null,
          ports,
          envVars,
          status,
          app.last_deployed_at || null,
          app.created_at,
          app.updated_at
        );
      }

      // 4. 删除旧表
      db.exec('DROP TABLE applications_old');

      // 5. 创建触发器
      db.exec(`
        CREATE TRIGGER IF NOT EXISTS applications_updated_at
        AFTER UPDATE ON applications
        BEGIN
          UPDATE applications SET updated_at = datetime('now') WHERE id = NEW.id;
        END
      `);

      // 提交事务
      db.exec('COMMIT');

      console.log('[Migration] ✅ Applications table migration completed successfully');
    } catch (error) {
      // 回滚事务
      db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('[Migration] ❌ Failed to migrate applications table:', error);
    throw error;
  } finally {
    db.close();
  }
}

// 如果直接运行此文件，执行迁移
if (require.main === module) {
  console.log('Running applications table migration...');
  migrateApplicationsTable();
  console.log('Migration completed!');
}

