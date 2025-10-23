/**
 * Infisical 相关类型定义
 */

/**
 * Infisical Provider 配置
 */
export interface InfisicalProviderConfig {
  clientId: string;
  clientSecret: string;
  projectId: string;
  environment: string;
  siteUrl?: string;
}

/**
 * Infisical Provider 记录
 */
export interface InfisicalProviderRecord {
  id: number;
  name: string;
  config: InfisicalProviderConfig;
  enabled: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: 'success' | 'failed' | 'in_progress' | null;
  lastSyncError: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Infisical Provider 摘要（前端显示用）
 */
export interface InfisicalProviderSummary {
  id: number;
  name: string;
  projectId: string;
  environment: string;
  siteUrl: string;
  enabled: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: 'success' | 'failed' | 'in_progress' | null;
  lastSyncError: string | null;
  groupsCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Infisical Provider 统计
 */
export interface InfisicalProviderStats {
  id: number;
  name: string;
  enabled: boolean;
  groupsCount: number;
  secretsCount: number;
  lastSyncAt: string | null;
  lastSyncStatus: 'success' | 'failed' | 'in_progress' | null;
}

/**
 * 同步结果
 */
export interface InfisicalSyncResult {
  success: boolean;
  groupId: number;
  groupName: string;
  providerId: number;
  providerName: string;
  created: number;
  updated: number;
  unchanged: number;
  deleted?: number;
  errors: Array<{
    secretName: string;
    error: string;
  }>;
  duration: number;
}

/**
 * 同步预览
 */
export interface InfisicalSyncPreview {
  group: {
    id: number;
    name: string;
    syncStrategy: 'merge' | 'replace';
  };
  remote: {
    count: number;
    secrets: string[];
  };
  local: {
    count: number;
    manual: number;
    synced: number;
  };
  changes: {
    toCreate: string[];
    toUpdate: string[];
    unchanged: string[];
    willSkip: string[];
  };
  summary: {
    wouldCreate: number;
    wouldUpdate: number;
    wouldSkip: number;
    wouldUnchange: number;
  };
}

/**
 * 连接测试结果
 */
export interface InfisicalConnectionTest {
  connected: boolean;
  message: string;
  duration: string;
  secretsCount?: number;
  error?: string;
  hint?: string;
  config?: {
    projectId: string;
    environment: string;
    siteUrl: string;
  };
  provider?: {
    name: string;
    projectId: string;
    environment: string;
    siteUrl: string;
  };
}

