import { getDb } from './database';
import { z } from 'zod';

/**
 * Repository 认证类型
 */
export type AuthType = 'username-password' | 'token' | 'none';

/**
 * Repository 记录
 */
export interface RepositoryRecord {
  id: number;
  name: string;
  registry: string;
  authType: AuthType;
  username?: string;
  password?: string;
  token?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Repository 摘要（不包含敏感信息）
 */
export interface RepositorySummary {
  id: number;
  name: string;
  registry: string;
  authType: AuthType;
  username?: string;
  hasPassword: boolean;
  hasToken: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Repository 创建/更新输入
 */
const repositorySchema = z.object({
  name: z.string().min(2).max(128),
  registry: z.string().min(1).max(512),
  authType: z.enum(['username-password', 'token', 'none']),
  username: z.string().max(256).optional(),
  password: z.string().max(512).optional(),
  token: z.string().max(1024).optional(),
  isDefault: z.boolean().optional(),
});

export type RepositoryInput = z.infer<typeof repositorySchema>;

/**
 * 列出所有 Repository（摘要信息，不含密码）
 */
export function listRepositories(): RepositorySummary[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT id, name, registry, authType, username, password, token, isDefault, createdAt, updatedAt
    FROM repositories
    ORDER BY isDefault DESC, createdAt DESC
  `);
  
  const rows = stmt.all() as RepositoryRecord[];
  
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    registry: row.registry,
    authType: row.authType,
    username: row.username,
    hasPassword: !!row.password,
    hasToken: !!row.token,
    isDefault: row.isDefault,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

/**
 * 根据 ID 获取 Repository（包含完整信息）
 */
export function getRepositoryById(id: number): RepositoryRecord | null {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT id, name, registry, authType, username, password, token, isDefault, createdAt, updatedAt
    FROM repositories
    WHERE id = ?
  `);
  
  const row = stmt.get(id) as RepositoryRecord | undefined;
  return row || null;
}

/**
 * 根据名称获取 Repository
 */
export function getRepositoryByName(name: string): RepositoryRecord | null {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT id, name, registry, authType, username, password, token, isDefault, createdAt, updatedAt
    FROM repositories
    WHERE name = ?
  `);
  
  const row = stmt.get(name) as RepositoryRecord | undefined;
  return row || null;
}

/**
 * 获取默认 Repository
 */
export function getDefaultRepository(): RepositoryRecord | null {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT id, name, registry, authType, username, password, token, isDefault, createdAt, updatedAt
    FROM repositories
    WHERE isDefault = 1
    LIMIT 1
  `);
  
  const row = stmt.get() as RepositoryRecord | undefined;
  return row || null;
}

/**
 * 创建 Repository
 */
export function createRepository(input: RepositoryInput): RepositoryRecord {
  const validated = repositorySchema.parse(input);
  const db = getDb();

  // 检查名称是否已存在
  const existing = getRepositoryByName(validated.name);
  if (existing) {
    throw new Error(`Repository with name "${validated.name}" already exists`);
  }

  // 如果设置为默认，先取消其他默认
  if (validated.isDefault) {
    db.prepare('UPDATE repositories SET isDefault = 0').run();
  }

  const stmt = db.prepare(`
    INSERT INTO repositories (name, registry, authType, username, password, token, isDefault)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    validated.name,
    validated.registry,
    validated.authType,
    validated.username || null,
    validated.password || null,
    validated.token || null,
    validated.isDefault ? 1 : 0
  );

  const created = getRepositoryById(Number(result.lastInsertRowid));
  if (!created) {
    throw new Error('Failed to create repository');
  }

  return created;
}

/**
 * 更新 Repository
 */
export function updateRepository(id: number, input: Partial<RepositoryInput>): RepositoryRecord {
  const db = getDb();

  // 检查是否存在
  const existing = getRepositoryById(id);
  if (!existing) {
    throw new Error(`Repository with id ${id} not found`);
  }

  // 如果修改了名称，检查新名称是否冲突
  if (input.name && input.name !== existing.name) {
    const nameConflict = getRepositoryByName(input.name);
    if (nameConflict && nameConflict.id !== id) {
      throw new Error(`Repository with name "${input.name}" already exists`);
    }
  }

  // 如果设置为默认，先取消其他默认
  if (input.isDefault) {
    db.prepare('UPDATE repositories SET isDefault = 0 WHERE id != ?').run(id);
  }

  // 构建更新语句
  const updates: string[] = [];
  const values: any[] = [];

  if (input.name !== undefined) {
    updates.push('name = ?');
    values.push(input.name);
  }
  if (input.registry !== undefined) {
    updates.push('registry = ?');
    values.push(input.registry);
  }
  if (input.authType !== undefined) {
    updates.push('authType = ?');
    values.push(input.authType);
  }
  if (input.username !== undefined) {
    updates.push('username = ?');
    values.push(input.username || null);
  }
  if (input.password !== undefined) {
    updates.push('password = ?');
    values.push(input.password || null);
  }
  if (input.token !== undefined) {
    updates.push('token = ?');
    values.push(input.token || null);
  }
  if (input.isDefault !== undefined) {
    updates.push('isDefault = ?');
    values.push(input.isDefault ? 1 : 0);
  }

  if (updates.length > 0) {
    updates.push('updatedAt = datetime("now")');
    values.push(id);

    const stmt = db.prepare(`
      UPDATE repositories
      SET ${updates.join(', ')}
      WHERE id = ?
    `);
    stmt.run(...values);
  }

  const updated = getRepositoryById(id);
  if (!updated) {
    throw new Error('Failed to update repository');
  }

  return updated;
}

/**
 * 设置默认 Repository
 */
export function setDefaultRepository(id: number): void {
  const db = getDb();

  // 检查是否存在
  const existing = getRepositoryById(id);
  if (!existing) {
    throw new Error(`Repository with id ${id} not found`);
  }

  // 取消所有默认
  db.prepare('UPDATE repositories SET isDefault = 0').run();

  // 设置新默认
  db.prepare('UPDATE repositories SET isDefault = 1, updatedAt = datetime("now") WHERE id = ?').run(id);
}

/**
 * 删除 Repository
 */
export function deleteRepository(id: number): void {
  const db = getDb();

  // 检查是否存在
  const existing = getRepositoryById(id);
  if (!existing) {
    throw new Error(`Repository with id ${id} not found`);
  }

  // 不允许删除默认仓库
  if (existing.isDefault) {
    throw new Error('Cannot delete default repository. Please set another repository as default first.');
  }

  const stmt = db.prepare('DELETE FROM repositories WHERE id = ?');
  stmt.run(id);
}

/**
 * 初始化默认 Docker Hub Repository
 */
export function initializeDefaultRepository(): void {
  const db = getDb();
  
  // 检查是否已有仓库
  const count = db.prepare('SELECT COUNT(*) as count FROM repositories').get() as { count: number };
  
  if (count.count === 0) {
    // 创建默认 Docker Hub 仓库
    createRepository({
      name: 'Docker Hub',
      registry: 'https://index.docker.io/v1/',
      authType: 'none',
      isDefault: true,
    });
    
    console.log('[RepositoryStore] Initialized default Docker Hub repository');
  }
}

