export interface DeployRequest {
  name?: string;  // 应用名称（可选，不填则自动从 image 生成）
  image?: string;  // 镜像名称，例如 nginx, library/nginx, focusbe/morphixai
  version?: string;  // 镜像版本标签
  port?: string | number;
  containerPort?: string | number;
  secret?: string;
  env?: Record<string, string | number | boolean>;
  secretRefs?: string[];
  repositoryId?: number;  // 指定使用的镜像仓库ID（可选，不填则使用默认仓库）
}

export interface DeployResponse {
  success: boolean;
  code?: number;
  stdout?: string;
  stderr?: string;
  error?: string;
  deploymentId?: string;
}

export interface HealthResponse {
  ok: boolean;
  timestamp?: string;
  uptime?: number;
}

export interface DeployConfig {
  port: number;
  webhookSecret: string;
  imageName: string;
  registryHost: string;
  hostPort: string;
  containerPort: string;
  dockerRunOpts: string;
  updateScriptPath: string;
  dockerSockPath: string;
  dockerHost?: string;
  dockerTlsVerify?: boolean;
  dockerCertPath?: string;
  imageNameWhitelist: string[];
  dockerUsername?: string;
  dockerPassword?: string;
  callbackUrl?: string;
  callbackHeaders: Record<string, string>;
  callbackSecret?: string;
  pruneImages: boolean;
  pruneStrategy: 'dangling' | 'none';
}

// Secret Provider Types
export type SecretProviderType = 
  | 'infisical' 
  | 'aws-secrets-manager' 
  | 'hashicorp-vault' 
  | 'azure-keyvault' 
  | 'gcp-secret-manager';

export interface SecretProviderConfig {
  // Infisical
  clientId?: string;
  clientSecret?: string;
  projectId?: string;
  environment?: string;
  secretPath?: string;
  siteUrl?: string;
  
  // AWS Secrets Manager
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  secretName?: string;
  prefix?: string;
  
  // HashiCorp Vault
  address?: string;
  token?: string;
  namespace?: string;
  path?: string;
  mountPath?: string;
  
  // Azure Key Vault
  vaultUrl?: string;
  tenantId?: string;
  
  // GCP Secret Manager
  credentials?: string;
}

export interface SecretProvider {
  id: number;
  name: string;
  type: SecretProviderType;
  config: SecretProviderConfig;
  enabled: boolean;
  autoSync: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: 'success' | 'failed' | null;
  lastSyncError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SyncResult {
  success: boolean;
  providerId: number;
  providerName: string;
  secretsCount: number;
  error?: string;
  syncedSecrets?: Array<{ key: string; synced: boolean; error?: string }>;
}

export interface SecretSyncRecord {
  id: number;
  providerId: number;
  status: 'success' | 'failed' | 'in_progress';
  secretsCount: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}
