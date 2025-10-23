import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

/**
 * 测试数据库管理工具
 */

const TEST_DB_DIR = process.env.DB_PATH || path.join(process.cwd(), 'data/test');
const TEST_DB_FILE = path.join(TEST_DB_DIR, 'deploy-webhook.db');

/**
 * 确保测试数据库目录存在
 */
export function ensureTestDbDirectory(): void {
  if (!fs.existsSync(TEST_DB_DIR)) {
    fs.mkdirSync(TEST_DB_DIR, { recursive: true });
  }
}

/**
 * 清理测试数据库
 * 删除整个测试数据库文件
 */
export function cleanTestDatabase(): void {
  try {
    // 删除主数据库文件
    if (fs.existsSync(TEST_DB_FILE)) {
      fs.unlinkSync(TEST_DB_FILE);
    }
    
    // 删除 WAL 文件
    const walFile = `${TEST_DB_FILE}-wal`;
    if (fs.existsSync(walFile)) {
      fs.unlinkSync(walFile);
    }
    
    // 删除 SHM 文件
    const shmFile = `${TEST_DB_FILE}-shm`;
    if (fs.existsSync(shmFile)) {
      fs.unlinkSync(shmFile);
    }
    
    console.log('[Test DB] Database cleaned');
  } catch (error) {
    console.error('[Test DB] Error cleaning database:', error);
  }
}

/**
 * 清空测试数据库的所有表（保留表结构）
 */
export function clearTestDatabaseTables(): void {
  try {
    // 需要先设置 DB_PATH 为测试路径，然后重新导入 database
    // 这里我们直接操作数据库
    const db = new Database(TEST_DB_FILE);
    
    // 获取所有表名
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%'
    `).all() as Array<{ name: string }>;
    
    // 清空每个表
    db.exec('PRAGMA foreign_keys = OFF');
    for (const { name } of tables) {
      db.prepare(`DELETE FROM ${name}`).run();
    }
    db.exec('PRAGMA foreign_keys = ON');
    
    db.close();
    
    console.log(`[Test DB] Cleared ${tables.length} tables`);
  } catch (error) {
    console.error('[Test DB] Error clearing tables:', error);
  }
}

/**
 * 初始化测试数据库
 * 创建新的干净数据库
 */
export function initializeTestDatabase(): void {
  try {
    ensureTestDbDirectory();
    cleanTestDatabase();
    
    // 数据库会在第一次导入 database.ts 时自动创建
    console.log('[Test DB] Test database initialized');
  } catch (error) {
    console.error('[Test DB] Error initializing database:', error);
    throw error;
  }
}

/**
 * 获取测试数据库连接
 */
export function getTestDatabase(): Database.Database {
  ensureTestDbDirectory();
  return new Database(TEST_DB_FILE);
}

/**
 * 检查测试数据库是否存在
 */
export function testDatabaseExists(): boolean {
  return fs.existsSync(TEST_DB_FILE);
}

/**
 * 备份测试数据库
 */
export function backupTestDatabase(backupName: string = 'backup'): void {
  if (fs.existsSync(TEST_DB_FILE)) {
    const backupFile = path.join(TEST_DB_DIR, `${backupName}.db`);
    fs.copyFileSync(TEST_DB_FILE, backupFile);
    console.log(`[Test DB] Database backed up to ${backupFile}`);
  }
}

/**
 * 恢复测试数据库
 */
export function restoreTestDatabase(backupName: string = 'backup'): void {
  const backupFile = path.join(TEST_DB_DIR, `${backupName}.db`);
  if (fs.existsSync(backupFile)) {
    fs.copyFileSync(backupFile, TEST_DB_FILE);
    console.log(`[Test DB] Database restored from ${backupFile}`);
  }
}

