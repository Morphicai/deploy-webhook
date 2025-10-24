import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9000';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      const token = localStorage.getItem('auth_token');
      if (token && config.headers) {
        // V2: 智能识别 token 类型
        if (token.startsWith('dw_')) {
          // API Key (以 dw_ 开头)
          config.headers['x-api-key'] = token;
        } else if (token.startsWith('eyJ')) {
          // JWT Token (以 eyJ 开头)
          config.headers.Authorization = `Bearer ${token}`;
        } else {
          // Admin Token
          config.headers['x-admin-token'] = token;
        }
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth APIs
  async checkAuthStatus() {
    const { data } = await this.client.get('/api/auth/status');
    return data;
  }

  async login(email: string, password: string) {
    const { data } = await this.client.post('/api/auth/login', { email, password });
    if (data.success && data.data?.token) {
      localStorage.setItem('auth_token', data.data.token);
    }
    return data;
  }

  async register(email: string, password: string) {
    const { data } = await this.client.post('/api/auth/register', { email, password });
    return data;
  }

  // Health Check
  async healthCheck() {
    const { data } = await this.client.get('/health');
    return data;
  }

  // Deploy
  async deploy(payload: {
    name?: string;  // 可选，不填则自动生成
    image: string;  // 镜像名称，如 nginx, library/nginx, focusbe/morphixai
    version: string;
    port: number;
    containerPort?: number;
    env?: Record<string, string>;
    secretRefs?: string[];
    repositoryId?: number;  // 仓库ID，可选
  }) {
    // 注意：已登录用户不需要提供 webhook secret
    // 后端会自动使用 Authorization header 中的 token 进行认证
    const { data } = await this.client.post('/deploy', payload);
    return data;
  }

  // Repositories
  async getRepositories() {
    const { data } = await this.client.get('/api/repositories');
    return data;
  }

  async getRepository(id: number) {
    const { data } = await this.client.get(`/api/repositories/${id}`);
    return data;
  }

  async createRepository(payload: {
    name: string;
    registry: string;
    username?: string;
    password?: string;
    isDefault?: boolean;
  }) {
    const { data } = await this.client.post('/api/repositories', payload);
    return data;
  }

  async updateRepository(id: number, payload: {
    name?: string;
    registry?: string;
    username?: string;
    password?: string;
    isDefault?: boolean;
  }) {
    const { data } = await this.client.put(`/api/repositories/${id}`, payload);
    return data;
  }

  async deleteRepository(id: number) {
    const { data } = await this.client.delete(`/api/repositories/${id}`);
    return data;
  }

  async setDefaultRepository(id: number) {
    const { data } = await this.client.post(`/api/repositories/${id}/set-default`);
    return data;
  }

  // Image Whitelist
  async getImageWhitelists() {
    const { data } = await this.client.get('/api/image-whitelist');
    return data;
  }

  async createImageWhitelist(payload: {
    repositoryId: number | null;
    imagePattern: string;
    description?: string;
  }) {
    const { data } = await this.client.post('/api/image-whitelist', payload);
    return data;
  }

  async updateImageWhitelist(id: number, payload: {
    repositoryId?: number | null;
    imagePattern?: string;
    description?: string;
  }) {
    const { data } = await this.client.put(`/api/image-whitelist/${id}`, payload);
    return data;
  }

  async deleteImageWhitelist(id: number) {
    const { data } = await this.client.delete(`/api/image-whitelist/${id}`);
    return data;
  }

  // Applications
  async getApplications() {
    const { data } = await this.client.get('/api/applications');
    return data;
  }

  async getApplication(id: number) {
    const { data } = await this.client.get(`/api/applications/${id}`);
    return data;
  }

  async createApplication(payload: {
    name: string;
    image: string;
    version?: string;
    repositoryId?: number | null;
    ports: Array<{ host: number; container: number }>;
    envVars?: Record<string, string>;
    webhookEnabled?: boolean;  // V2: Webhook 开关
    webhookToken?: string;     // V2: Webhook Token (可选，自动生成)
    autoDeploy?: boolean;      // V2: 自动部署
  }) {
    const { data } = await this.client.post('/api/applications', payload);
    return data;
  }

  async updateApplication(id: number, payload: {
    name?: string;
    image?: string;
    version?: string;
    repositoryId?: number | null;
    ports?: Array<{ host: number; container: number }>;
    envVars?: Record<string, string>;
    webhookEnabled?: boolean;
    autoDeploy?: boolean;
  }) {
    const { data } = await this.client.put(`/api/applications/${id}`, payload);
    return data;
  }

  async regenerateWebhookToken(id: number) {
    const { data } = await this.client.post(`/api/applications/${id}/regenerate-webhook-token`);
    return data;
  }

  async deleteApplication(id: number) {
    const { data } = await this.client.delete(`/api/applications/${id}`);
    return data;
  }

  async deployApplication(id: number) {
    const { data } = await this.client.post(`/api/applications/${id}/deploy`);
    return data;
  }

  async startContainer(id: number) {
    const { data } = await this.client.post(`/api/applications/${id}/start`);
    return data;
  }

  async stopContainer(id: number) {
    const { data} = await this.client.post(`/api/applications/${id}/stop`);
    return data;
  }

  async restartContainer(id: number) {
    const { data } = await this.client.post(`/api/applications/${id}/restart`);
    return data;
  }

  // Deployment Logs (V2)
  async getDeploymentLogs(options?: {
    applicationId?: number;
    status?: 'pending' | 'success' | 'failed';
    limit?: number;
  }) {
    const params = new URLSearchParams();
    if (options?.applicationId) params.append('applicationId', options.applicationId.toString());
    if (options?.status) params.append('status', options.status);
    if (options?.limit) params.append('limit', options.limit.toString());
    const { data } = await this.client.get(`/api/deployment-logs?${params.toString()}`);
    return data;
  }

  async getDeploymentLog(id: number) {
    const { data } = await this.client.get(`/api/deployment-logs/${id}`);
    return data;
  }

  // Webhook V2 Deployment
  async webhookDeployV2(payload: {
    applicationId: number;
    version: string;
    token: string;
  }) {
    const { data } = await this.client.post('/webhook/deploy', payload);
    return data;
  }

  // Environment Variables (V2)
  async getEnvVariables(scope?: string, projectId?: number) {
    const params = new URLSearchParams();
    if (scope) params.append('scope', scope);
    if (projectId) params.append('projectId', projectId.toString());
    const { data } = await this.client.get(`/api/env?${params.toString()}`);
    return data;
  }

  async createEnvVariable(payload: {
    scope: 'global' | 'project';
    key: string;
    value: string;
    projectId?: number;
    valueType?: 'plain' | 'secret_ref';  // V2: 值类型
    secretId?: number | null;  // V2: 引用的秘钥 ID
    description?: string;  // V2: 描述
  }) {
    const { data } = await this.client.post('/api/env', payload);
    return data;
  }

  async updateEnvVariable(id: number, payload: {
    value?: string;
    valueType?: 'plain' | 'secret_ref';
    secretId?: number | null;
    description?: string;
  }) {
    const { data } = await this.client.put(`/api/env/${id}`, payload);
    return data;
  }

  async deleteEnvVariable(id: number) {
    const { data } = await this.client.delete(`/api/env/${id}`);
    return data;
  }

  // Secret Groups (V2)
  async getSecretGroups() {
    const { data } = await this.client.get('/api/secret-groups');
    return data;
  }

  async getSecretGroup(id: number) {
    const { data } = await this.client.get(`/api/secret-groups/${id}`);
    return data;
  }

  async createSecretGroup(payload: {
    name: string;
    description?: string;
    providerId?: number | null;
    autoSync?: boolean;
    syncEnabled?: boolean;
    syncPath?: string;
    syncStrategy?: 'merge' | 'replace';
  }) {
    const { data } = await this.client.post('/api/secret-groups', payload);
    return data;
  }

  async updateSecretGroup(id: number, payload: {
    name?: string;
    description?: string;
    providerId?: number | null;
    autoSync?: boolean;
    syncEnabled?: boolean;
    syncPath?: string;
    syncStrategy?: 'merge' | 'replace';
  }) {
    const { data } = await this.client.put(`/api/secret-groups/${id}`, payload);
    return data;
  }

  async deleteSecretGroup(id: number) {
    const { data } = await this.client.delete(`/api/secret-groups/${id}`);
    return data;
  }

  // Secrets (V2)
  async getSecrets(groupId?: number) {
    const params = groupId ? `?groupId=${groupId}` : '';
    const { data } = await this.client.get(`/api/secrets${params}`);
    return data;
  }

  async createSecret(payload: {
    groupId: number;  // V2: 必填 - 秘钥分组 ID
    name: string;
    value: string;  // V2: 实际的秘钥值
    source?: 'manual' | 'synced';
    description?: string;
  }) {
    const { data } = await this.client.post('/api/secrets', payload);
    return data;
  }

  async updateSecret(id: number, payload: {
    name?: string;
    value?: string;
    description?: string;
  }) {
    const { data } = await this.client.put(`/api/secrets/${id}`, payload);
    return data;
  }

  async deleteSecret(id: number) {
    const { data } = await this.client.delete(`/api/secrets/${id}`);
    return data;
  }

  // Secret Providers (V2 - Infisical, etc.)
  async getSecretProviders() {
    const { data } = await this.client.get('/api/secret-providers');
    return data;
  }

  async getSecretProvider(id: number) {
    const { data } = await this.client.get(`/api/secret-providers/${id}`);
    return data;
  }

  async createSecretProvider(payload: {
    name: string;
    type: 'infisical';
    config: {
      projectId: string;
      environment: string;
      secretPath?: string;
      clientId: string;
      clientSecret: string;
    };
  }) {
    const { data } = await this.client.post('/api/secret-providers', payload);
    return data;
  }

  async updateSecretProvider(id: number, payload: {
    name?: string;
    config?: {
      projectId?: string;
      environment?: string;
      secretPath?: string;
      clientId?: string;
      clientSecret?: string;
    };
  }) {
    const { data } = await this.client.put(`/api/secret-providers/${id}`, payload);
    return data;
  }

  async deleteSecretProvider(id: number) {
    const { data } = await this.client.delete(`/api/secret-providers/${id}`);
    return data;
  }

  // Secret Syncs (V2)
  async getSecretSyncs(providerId?: number) {
    const params = providerId ? `?providerId=${providerId}` : '';
    const { data } = await this.client.get(`/api/secret-syncs${params}`);
    return data;
  }

  async triggerSecretSync(providerId: number) {
    const { data } = await this.client.post('/api/secret-syncs/trigger', { providerId });
    return data;
  }

  // Settings
  async getSettings() {
    const { data } = await this.client.get('/api/settings');
    return data;
  }

  async updateSettings(settings: Record<string, string>) {
    const { data } = await this.client.put('/api/settings', settings);
    return data;
  }

  async getOpenAIConfig() {
    const { data } = await this.client.get('/api/settings/openai');
    return data;
  }

  async updateOpenAIConfig(config: { apiKey: string; baseUrl: string }) {
    const { data } = await this.client.put('/api/settings/openai', config);
    return data;
  }

  // API Keys
  async listAPIKeys() {
    const { data } = await this.client.get('/api/api-keys');
    return data;
  }

  async getAPIKey(id: number) {
    const { data } = await this.client.get(`/api/api-keys/${id}`);
    return data;
  }

  async createAPIKey(payload: { name: string; description?: string; permission?: string; expiresAt?: string }) {
    const { data } = await this.client.post('/api/api-keys', payload);
    return data;
  }

  async updateAPIKey(id: number, payload: { name?: string; description?: string; permission?: string; enabled?: boolean; expiresAt?: string | null }) {
    const { data } = await this.client.put(`/api/api-keys/${id}`, payload);
    return data;
  }

  async deleteAPIKey(id: number) {
    const { data } = await this.client.delete(`/api/api-keys/${id}`);
    return data;
  }

  // AI Chat
  async sendChatMessage(message: string, history?: Array<{ role: string; content: string }>) {
    const { data } = await this.client.post('/api/ai/chat', { message, history });
    return data;
  }

  // Webhooks
  async listWebhooks() {
    const { data } = await this.client.get('/api/webhooks');
    return data;
  }

  async getWebhook(id: number) {
    const { data } = await this.client.get(`/api/webhooks/${id}`);
    return data;
  }

  async createWebhook(payload: { name: string; type: string; description?: string; secret?: string }) {
    const { data } = await this.client.post('/api/webhooks', payload);
    return data;
  }

  async updateWebhook(id: number, payload: { name?: string; description?: string; enabled?: boolean; secret?: string }) {
    const { data } = await this.client.put(`/api/webhooks/${id}`, payload);
    return data;
  }

  async deleteWebhook(id: number) {
    const { data } = await this.client.delete(`/api/webhooks/${id}`);
    return data;
  }

  // Generic methods for repositories and other resources
  async get(url: string) {
    return this.client.get(url);
  }

  async post(url: string, data?: any) {
    return this.client.post(url, data);
  }

  async put(url: string, data?: any) {
    return this.client.put(url, data);
  }

  async delete(url: string) {
    return this.client.delete(url);
  }
}

const apiInstance = new ApiService();

export const api = apiInstance;
export default apiInstance;

