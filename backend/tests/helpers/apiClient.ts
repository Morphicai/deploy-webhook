import request, { Response } from 'supertest';
import { Express } from 'express';

/**
 * API 测试客户端
 * 封装 supertest 提供便捷的 API 调用方法
 */
export class ApiClient {
  private app: Express;
  private authToken?: string;

  constructor(app: Express, authToken?: string) {
    this.app = app;
    this.authToken = authToken;
  }

  /**
   * 设置认证 Token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * 清除认证 Token
   */
  clearAuthToken(): void {
    this.authToken = undefined;
  }

  /**
   * 通用请求方法
   */
  private buildRequest(method: 'get' | 'post' | 'put' | 'delete', url: string) {
    let req = request(this.app)[method](url);
    
    // 添加认证头
    if (this.authToken) {
      // API Key 以 'dw_' 开头，使用 x-api-key header
      if (this.authToken.startsWith('dw_')) {
        req = req.set('x-api-key', this.authToken);
      } 
      // 否则使用 x-admin-token（用于 Admin Token 和 JWT）
      else {
        req = req.set('x-admin-token', this.authToken);
      }
    }
    
    return req;
  }

  /**
   * GET 请求
   */
  async get(url: string, query?: Record<string, any>): Promise<Response> {
    let req = this.buildRequest('get', url);
    if (query) {
      req = req.query(query);
    }
    return req;
  }

  /**
   * POST 请求
   */
  async post(url: string, data?: any, headers?: Record<string, string>): Promise<Response> {
    let req = this.buildRequest('post', url);
    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        req = req.set(key, value);
      }
    }
    if (data) {
      req = req.send(data);
    }
    return req;
  }

  /**
   * PUT 请求
   */
  async put(url: string, data?: any): Promise<Response> {
    let req = this.buildRequest('put', url);
    if (data) {
      req = req.send(data);
    }
    return req;
  }

  /**
   * DELETE 请求
   */
  async delete(url: string): Promise<Response> {
    return this.buildRequest('delete', url);
  }

  // ========== 便捷方法 ==========

  /**
   * 用户登录
   */
  async login(email: string, password: string): Promise<Response> {
    return this.post('/api/auth/login', { email, password });
  }

  /**
   * 用户注册
   */
  async register(email: string, password: string): Promise<Response> {
    return this.post('/api/auth/register', { email, password });
  }

  /**
   * 部署应用
   */
  async deploy(params: {
    image: string;
    version?: string;
    name?: string;
    port: number;
    containerPort: number;
    env?: Record<string, any>;
    repositoryId?: number;
  }, webhookSecret?: string): Promise<Response> {
    const headers: Record<string, string> = {};
    if (webhookSecret) {
      headers['x-webhook-secret'] = webhookSecret;
    }
    return this.post('/deploy', params, headers);
  }

  /**
   * 获取应用列表
   */
  async listApplications(): Promise<Response> {
    return this.get('/api/applications');
  }

  /**
   * 获取应用详情
   */
  async getApplication(id: number): Promise<Response> {
    return this.get(`/api/applications/${id}`);
  }

  /**
   * 创建应用 (V2 - 预注册)
   */
  async createApplication(data: {
    name: string;
    image: string;
    ports?: Array<{ host: number; container: number }>;
    repositoryId?: number;
    envVars?: Record<string, any>;
    webhookEnabled?: boolean;
  }): Promise<Response> {
    return this.post('/api/applications', data);
  }

  /**
   * 更新应用
   */
  async updateApplication(id: number, data: Partial<{
    name: string;
    image: string;
    ports: Array<{ host: number; container: number }>;
    repositoryId: number;
    envVars: Record<string, any>;
    webhookEnabled: boolean;
    webhookToken: string;
  }>): Promise<Response> {
    return this.put(`/api/applications/${id}`, data);
  }

  /**
   * 删除应用
   */
  async deleteApplication(id: number): Promise<Response> {
    return this.delete(`/api/applications/${id}`);
  }

  /**
   * Webhook 部署 V2
   */
  async webhookDeployV2(data: {
    applicationId: number;
    version: string;
    token: string; // 应用专用 webhook token
  }): Promise<Response> {
    return this.post('/webhook/deploy', data);
  }

  /**
   * 创建秘钥 (V2 - 支持加密存储)
   */
  async createSecret(data: {
    name: string;
    value: string; // V2: 实际的秘钥值
    provider?: 'infisical' | 'file' | 'docker-secret' | 'manual';
    reference?: string | null;
    groupId?: number | null;
    metadata?: Record<string, any>;
  }): Promise<Response> {
    return this.post('/api/secrets', data);
  }

  /**
   * 获取秘钥列表
   */
  async listSecrets(): Promise<Response> {
    return this.get('/api/secrets');
  }

  /**
   * 创建秘钥提供者
   */
  async createSecretProvider(data: {
    name: string;
    type: string;
    config: Record<string, any>;
    enabled?: boolean;
    autoSync?: boolean;
  }): Promise<Response> {
    return this.post('/api/secret-providers', data);
  }

  /**
   * 同步秘钥提供者
   */
  async syncSecretProvider(id: number): Promise<Response> {
    return this.post(`/api/secret-providers/${id}/sync`);
  }

  /**
   * 创建环境变量 (V2 - 支持秘钥引用)
   */
  async createEnvVar(data: {
    scope: 'global' | 'project';
    projectId?: number; // V2: 使用 projectId
    projectName?: string; // 向后兼容
    key: string;
    value?: string;
    valueType?: 'plain' | 'secret_ref'; // V2: 值类型
    secretId?: number | null; // V2: 引用的秘钥ID
  }): Promise<Response> {
    return this.post('/api/env', data);
  }

  /**
   * 获取环境变量列表
   */
  async listEnvVars(scope?: string, projectName?: string): Promise<Response> {
    const query: Record<string, any> = {};
    if (scope) query.scope = scope;
    if (projectName) query.projectName = projectName;
    return this.get('/api/env', query);
  }

  /**
   * 创建域名
   */
  async createDomain(data: {
    domainName: string;
    type: string;
    targetUrl: string;
    applicationId?: number;
    enabled?: boolean;
    description?: string;
  }): Promise<Response> {
    return this.post('/api/domains', data);
  }

  /**
   * 获取域名列表
   */
  async listDomains(): Promise<Response> {
    return this.get('/api/domains');
  }

  /**
   * 创建镜像仓库
   */
  async createRepository(data: {
    name: string;
    registry: string;
    authType: string;
    username?: string;
    password?: string;
    token?: string;
    isDefault?: boolean;
  }): Promise<Response> {
    return this.post('/api/repositories', data);
  }

  /**
   * 获取仓库列表
   */
  async listRepositories(): Promise<Response> {
    return this.get('/api/repositories');
  }

  /**
   * 创建 API Key
   */
  async createApiKey(data: {
    name: string;
    description?: string;
    permission?: string;
    expiresAt?: string;
  }): Promise<Response> {
    return this.post('/api/api-keys', data);
  }

  /**
   * 获取 API Key 列表
   */
  async listApiKeys(): Promise<Response> {
    return this.get('/api/api-keys');
  }

  /**
   * 健康检查
   */
  async health(): Promise<Response> {
    return this.get('/health');
  }

  /**
   * 重新加载 Caddy
   */
  async reloadCaddy(): Promise<Response> {
    return this.post('/api/caddy/reload');
  }

  /**
   * 获取 Caddy 配置
   */
  async getCaddyConfig(): Promise<Response> {
    return this.get('/api/caddy/config');
  }
}

/**
 * 创建未认证的 API 客户端
 */
export function createApiClient(app: Express): ApiClient {
  return new ApiClient(app);
}

/**
 * 创建已认证的 API 客户端
 */
export function createAuthenticatedClient(app: Express, token: string): ApiClient {
  return new ApiClient(app, token);
}

