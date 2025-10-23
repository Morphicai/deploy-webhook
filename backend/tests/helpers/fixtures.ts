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
 * 生成测试秘钥配置
 */
export function createTestSecret(overrides?: Partial<{
  name: string;
  provider: string;
  reference: string;
  metadata: Record<string, any>;
}>) {
  return {
    name: 'test-secret',
    provider: 'file',
    reference: '/path/to/secret',
    metadata: {},
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
 * 生成测试环境变量
 */
export function createTestEnvVar(overrides?: Partial<{
  scope: 'global' | 'project';
  projectName: string;
  key: string;
  value: string;
}>) {
  return {
    scope: 'global' as const,
    projectName: '',
    key: 'TEST_VAR',
    value: 'test-value',
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

