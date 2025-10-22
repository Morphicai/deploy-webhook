import { getDb } from './database';

export interface SystemSetting {
  id: number;
  key: string;
  value: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 获取系统设置
 */
export function getSetting(key: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT value FROM system_settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row ? row.value : null;
}

/**
 * 设置系统设置
 */
export function setSetting(key: string, value: string, description?: string): void {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM system_settings WHERE key = ?').get(key);
  
  if (existing) {
    db.prepare('UPDATE system_settings SET value = ?, description = ? WHERE key = ?')
      .run(value, description || null, key);
  } else {
    db.prepare('INSERT INTO system_settings (key, value, description) VALUES (?, ?, ?)')
      .run(key, value, description || null);
  }
}

/**
 * 获取所有设置
 */
export function getAllSettings(): Record<string, string> {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM system_settings').all() as { key: string; value: string }[];
  
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

/**
 * 批量设置
 */
export function setSettings(settings: Record<string, string>): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO system_settings (key, value, description)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `);

  const transaction = db.transaction((items: Array<[string, string]>) => {
    for (const [key, value] of items) {
      stmt.run(key, value, null);
    }
  });

  transaction(Object.entries(settings));
}

/**
 * 获取 OpenAI 配置
 */
export function getOpenAIConfig(): { apiKey: string; baseUrl: string } {
  return {
    apiKey: getSetting('openai_api_key') || '',
    baseUrl: getSetting('openai_base_url') || 'https://api.openai.com/v1',
  };
}

/**
 * 设置 OpenAI 配置
 */
export function setOpenAIConfig(apiKey: string, baseUrl: string): void {
  setSetting('openai_api_key', apiKey, 'OpenAI API Key');
  setSetting('openai_base_url', baseUrl, 'OpenAI Base URL');
}

