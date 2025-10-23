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
  port: number;
  containerPort: number;
  env: Record<string, any>;
  repositoryId: number;
}>) {
  return {
    name: 'test-app',
    image: 'nginx',
    version: 'alpine',
    port: 9080,
    containerPort: 80,
    env: {},
    ...overrides,
  };
}

/**
 * 生成测试秘钥配置 (V2 - 支持加密存储)
 */
export function createTestSecret(overrides?: Partial<{
  name: string;
  value: string; // V2: 实际的秘钥值（会被加密存储）
  provider: 'infisical' | 'file' | 'docker-secret' | 'manual';
  reference: string | null; // V2: 可选的外部引用
  groupId: number | null; // V2: 秘钥分组ID
  metadata: Record<string, any>;
}>) {
  return {
    name: 'test-secret',
    value: 'test-secret-value-12345', // V2: 必需的秘钥值
    provider: 'manual' as const, // V2: 默认为手动创建
    reference: null, // V2: 默认无外部引用
    groupId: null, // V2: 默认不属于任何分组
    metadata: {},
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
 * 生成测试秘钥提供者配置 - Infisical
 */
export function createTestInfisicalProvider(overrides?: Partial<{
  name: string;
  enabled: boolean;
  autoSync: boolean;
  config: {
    clientId: string;
    clientSecret: string;
    projectId: string;
    environment: string;
    secretPath: string;
  };
}>) {
  return {
    name: 'test-infisical-provider',
    type: 'infisical',
    enabled: true,
    autoSync: false,
    config: {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      projectId: 'test-project-id',
      environment: 'dev',
      secretPath: '/',
      ...overrides?.config,
    },
    ...overrides,
  };
}

/**
 * 生成测试环境变量 (V2 - 支持秘钥引用)
 */
export function createTestEnvVar(overrides?: Partial<{
  scope: 'global' | 'project';
  projectId: number; // V2: 使用 projectId 代替 projectName
  projectName: string; // 保留用于兼容性
  key: string;
  value: string;
  valueType: 'plain' | 'secret_ref'; // V2: 值类型
  secretId: number | null; // V2: 引用的秘钥ID
}>) {
  return {
    scope: 'global' as const,
    projectName: '', // 向后兼容
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

