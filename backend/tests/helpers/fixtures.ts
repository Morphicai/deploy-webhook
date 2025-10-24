/**
 * 测试数据生成器
 * 提供一致的测试数据
 */

/**
 * 测试用户
 */
export const TEST_USERS = {
  admin: {
    email: 'admin@test.com',
    password: 'test-admin-password-123',
  },
  user: {
    email: 'user@test.com',
    password: 'test-user-password-456',
  },
  guest: {
    email: 'guest@test.com',
    password: 'test-guest-password-789',
  },
};

/**
 * 测试认证凭据
 */
export const TEST_AUTH = {
  webhookSecret: process.env.WEBHOOK_SECRET || 'test-webhook-secret-123456',
  adminToken: process.env.ADMIN_TOKEN || 'test-admin-token-789012',
};

/**
 * 生成测试应用配置
 */
export function createTestApplication(overrides?: Partial<{
  name: string;
  image: string;
  version: string;
  ports: Array<{ host: number; container: number }>;
  port: number;  // 向后兼容
  containerPort: number;  // 向后兼容
  env: Record<string, any>;
  envVars: Record<string, string>;
  repositoryId: number;
}>) {
  // 支持新旧两种 port 格式
  const ports = overrides?.ports || [
    {
      host: overrides?.port || 9080,
      container: overrides?.containerPort || 80
    }
  ];
  
  return {
    name: 'test-app',
    image: 'nginx',
    version: 'alpine',
    ports,
    envVars: overrides?.env || {},
    repositoryId: overrides?.repositoryId || 1,
    ...overrides,
  };
}

/**
 * 生成测试秘钥配置 (V2 - 支持加密存储)
 * 注意：V2 中所有秘钥必须属于一个分组
 */
export function createTestSecret(overrides: {
  groupId: number; // V2: 必填 - 秘钥必须属于一个分组
  name?: string;
  value?: string; // V2: 实际的秘钥值（会被加密存储）
  description?: string;
  source?: 'manual' | 'synced'; // V2: 秘钥来源
}) {
  return {
    name: 'test-secret',
    value: 'test-secret-value-12345', // V2: 必需的秘钥值
    description: 'Test secret',
    source: 'manual' as const, // V2: 默认为手动创建
    ...overrides,
  };
}

/**
 * 生成测试秘钥分组配置 (V2 新增)
 */
export function createTestSecretGroup(overrides?: Partial<{
  name: string;
  description: string;
}>) {
  return {
    name: 'test-secret-group',
    description: 'Test secret group for automated testing',
    ...overrides,
  };
}

/**
 * 生成测试秘钥同步配置 (V2 - 替代 Provider)
 */
export function createTestSecretSync(overrides?: Partial<{
  name: string;
  description: string;
  sourceType: 'infisical';
  sourceConfig: {
    clientId: string;
    clientSecret: string;
    projectId: string;
    environment: string;
    path: string;
    siteUrl: string;
  };
  targetGroupId: number;
  syncStrategy: 'merge' | 'replace';
  syncTrigger: 'manual' | 'webhook' | 'schedule';
  enableWebhook: boolean;
  scheduleEnabled: boolean;
  scheduleInterval: number;
  enabled: boolean;
}>) {
  return {
    name: 'test-secret-sync',
    description: 'Test secret sync configuration',
    sourceType: 'infisical' as const,
    sourceConfig: {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      projectId: 'test-project-id',
      environment: 'dev',
      path: '/',
      siteUrl: 'https://app.infisical.com',
      ...overrides?.sourceConfig,
    },
    targetGroupId: 1,
    syncStrategy: 'merge' as const,
    syncTrigger: 'manual' as const,
    enableWebhook: false,
    scheduleEnabled: false,
    scheduleInterval: 60,
    enabled: true,
    ...overrides,
  };
}

/**
 * 生成测试环境变量 (V2 - 支持秘钥引用)
 */
export function createTestEnvVar(overrides?: Partial<{
  scope: 'global' | 'project';
  projectId: number; // V2: 使用 projectId（project scope 时必需）
  key: string;
  value: string;
  valueType: 'plain' | 'secret_ref'; // V2: 值类型
  secretId: number | null; // V2: 引用的秘钥ID
}>) {
  return {
    scope: 'global' as const,
    key: 'TEST_VAR',
    value: 'test-value',
    valueType: 'plain' as const, // V2: 默认为纯文本
    secretId: null, // V2: 默认不引用秘钥
    ...overrides,
  };
}

/**
 * 生成测试域名配置
 */
export function createTestDomain(overrides?: Partial<{
  domainName: string;
  type: string;
  targetUrl: string;
  applicationId: number;
  enabled: boolean;
  description: string;
}>) {
  return {
    domainName: 'test.example.com',
    type: 'subdomain',
    targetUrl: 'http://localhost:9080',
    enabled: true,
    description: 'Test domain',
    ...overrides,
  };
}

/**
 * 生成测试镜像仓库配置
 */
export function createTestRepository(overrides?: Partial<{
  name: string;
  registry: string;
  authType: string;
  username: string;
  password: string;
  token: string;
  isDefault: boolean;
}>) {
  return {
    name: 'test-registry',
    registry: 'https://registry.test.com',
    authType: 'username-password',
    username: 'test-user',
    password: 'test-password',
    isDefault: false,
    ...overrides,
  };
}

/**
 * 生成测试 API Key 配置
 */
export function createTestApiKey(overrides?: Partial<{
  name: string;
  description: string;
  permission: string;
  expiresAt: string;
}>) {
  return {
    name: 'test-api-key',
    description: 'Test API key',
    permission: 'full',
    ...overrides,
  };
}

/**
 * 生成测试 Webhook 配置
 */
export function createTestWebhook(overrides?: Partial<{
  name: string;
  type: string;
  description: string;
  secret: string;
  enabled: boolean;
}>) {
  return {
    name: 'test-webhook',
    type: 'infisical',
    description: 'Test webhook',
    secret: 'test-webhook-secret',
    enabled: true,
    ...overrides,
  };
}

/**
 * 生成随机字符串
 */
export function randomString(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成唯一的测试容器名称
 */
export function generateTestContainerName(prefix: string = 'test'): string {
  return `${prefix}-${randomString(8)}`;
}

/**
 * 生成测试端口号（避免冲突）
 */
export function generateTestPort(min: number = 10000, max: number = 20000): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 等待指定时间
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重试函数
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
    onRetry?: (error: any, attempt: number) => void;
  } = {}
): Promise<T> {
  const { retries = 3, delay = 1000, onRetry } = options;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      if (onRetry) onRetry(error, i + 1);
      await wait(delay);
    }
  }
  
  throw new Error('Retry failed');
}

