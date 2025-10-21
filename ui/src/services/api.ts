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
        config.headers.Authorization = `Bearer ${token}`;
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
    name: string;
    version: string;
    repo: string;
    port: number;
    containerPort?: number;
    env?: Record<string, string>;
    secretRefs?: string[];
  }) {
    const { data } = await this.client.post('/deploy', payload, {
      headers: {
        'x-webhook-secret': import.meta.env.VITE_WEBHOOK_SECRET || '',
      },
    });
    return data;
  }

  // Applications
  async getApplications() {
    const { data } = await this.client.get('/api/applications');
    return data;
  }

  // Environment Variables
  async getEnvVariables(scope?: string, projectName?: string) {
    const params = new URLSearchParams();
    if (scope) params.append('scope', scope);
    if (projectName) params.append('projectName', projectName);
    const { data } = await this.client.get(`/api/env?${params.toString()}`);
    return data;
  }

  async createEnvVariable(payload: {
    scope: 'global' | 'project';
    key: string;
    value: string;
    projectName?: string;
  }) {
    const { data } = await this.client.post('/api/env', payload);
    return data;
  }

  async deleteEnvVariable(scope: string, key: string, projectName?: string) {
    const params = new URLSearchParams({ scope, key });
    if (projectName) params.append('projectName', projectName);
    const { data } = await this.client.delete(`/api/env?${params.toString()}`);
    return data;
  }

  async getProjectEnv(projectName: string) {
    const { data } = await this.client.get(`/api/env/project/${projectName}`);
    return data;
  }

  // Secrets
  async getSecrets() {
    const { data } = await this.client.get('/api/secrets');
    return data;
  }

  async createSecret(payload: any) {
    const { data } = await this.client.post('/api/secrets', payload);
    return data;
  }

  async updateSecret(id: number, payload: any) {
    const { data } = await this.client.put(`/api/secrets/${id}`, payload);
    return data;
  }

  async deleteSecret(id: number) {
    const { data } = await this.client.delete(`/api/secrets/${id}`);
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

