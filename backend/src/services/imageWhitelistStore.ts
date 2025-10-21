import { z } from 'zod';
import { getDb } from './database';

export interface ImageWhitelistRecord {
  id: number;
  repositoryId: number | null;  // null 表示"全部仓库"
  imagePattern: string;  // "*" 表示"全部镜像"
  description?: string;
  createdAt: string;
  updatedAt: string;
}

const whitelistSchema = z.object({
  repositoryId: z.number().nullable(),
  imagePattern: z.string().min(1).max(512),
  description: z.string().max(512).optional(),
});

type WhitelistInput = z.infer<typeof whitelistSchema>;

function mapRow(row: any): ImageWhitelistRecord {
  return {
    id: row.id,
    repositoryId: row.repository_id,
    imagePattern: row.image_pattern,
    description: row.description || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 列出所有白名单规则
 */
export function listImageWhitelists(): ImageWhitelistRecord[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, repository_id, image_pattern, description, created_at, updated_at
    FROM image_whitelists
    ORDER BY id DESC
  `).all();
  return rows.map(mapRow);
}

/**
 * 获取单个白名单规则
 */
export function getWhitelistById(id: number): ImageWhitelistRecord | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT id, repository_id, image_pattern, description, created_at, updated_at
    FROM image_whitelists
    WHERE id = ?
  `).get(id);
  return row ? mapRow(row) : null;
}

/**
 * 创建白名单规则
 */
export function createImageWhitelist(input: WhitelistInput): ImageWhitelistRecord {
  const parsed = whitelistSchema.parse(input);
  const db = getDb();
  
  const stmt = db.prepare(`
    INSERT INTO image_whitelists (repository_id, image_pattern, description)
    VALUES (?, ?, ?)
  `);
  
  const info = stmt.run(
    parsed.repositoryId,
    parsed.imagePattern,
    parsed.description || null
  );
  
  const created = getWhitelistById(Number(info.lastInsertRowid));
  if (!created) throw new Error('Failed to create whitelist rule');
  return created;
}

/**
 * 更新白名单规则
 */
export function updateImageWhitelist(id: number, input: Partial<WhitelistInput>): ImageWhitelistRecord {
  const db = getDb();
  const current = getWhitelistById(id);
  if (!current) throw new Error(`Whitelist rule with id=${id} not found`);
  
  const updates: string[] = [];
  const values: any[] = [];
  
  if (input.repositoryId !== undefined) {
    updates.push('repository_id = ?');
    values.push(input.repositoryId);
  }
  
  if (input.imagePattern !== undefined) {
    updates.push('image_pattern = ?');
    values.push(input.imagePattern);
  }
  
  if (input.description !== undefined) {
    updates.push('description = ?');
    values.push(input.description || null);
  }
  
  if (updates.length === 0) return current;
  
  values.push(id);
  db.prepare(`UPDATE image_whitelists SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  
  const updated = getWhitelistById(id);
  if (!updated) throw new Error('Failed to update whitelist rule');
  return updated;
}

/**
 * 删除白名单规则
 */
export function deleteImageWhitelist(id: number): void {
  const db = getDb();
  db.prepare('DELETE FROM image_whitelists WHERE id = ?').run(id);
}

/**
 * 检查镜像是否在白名单中
 * @param repositoryId 仓库ID
 * @param imageName 镜像名称
 * @returns true 如果允许，false 如果不允许
 */
export function isImageWhitelisted(repositoryId: number | null, imageName: string): boolean {
  const rules = listImageWhitelists();
  
  // 如果没有任何白名单规则，默认允许所有
  if (rules.length === 0) {
    return true;
  }
  
  // 检查是否有匹配的规则
  for (const rule of rules) {
    // 检查仓库是否匹配
    const repositoryMatches = rule.repositoryId === null || rule.repositoryId === repositoryId;
    if (!repositoryMatches) continue;
    
    // 检查镜像是否匹配
    const imageMatches = rule.imagePattern === '*' || rule.imagePattern === imageName || matchPattern(imageName, rule.imagePattern);
    if (imageMatches) {
      return true;
    }
  }
  
  return false;
}

/**
 * 简单的模式匹配，支持通配符 *
 */
function matchPattern(text: string, pattern: string): boolean {
  // 将模式转换为正则表达式
  const regexPattern = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')  // 转义正则特殊字符
    .replace(/\*/g, '.*');  // * 转换为 .*
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(text);
}

