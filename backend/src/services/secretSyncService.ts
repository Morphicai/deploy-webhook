import * as InfisicalSDK from '@infisical/sdk';
import {
  SecretProviderRecord,
  InfisicalConfig,
  AWSSecretsManagerConfig,
  HashiCorpVaultConfig,
  AzureKeyVaultConfig,
  GCPSecretManagerConfig,
  updateSyncStatus,
  createSyncRecord,
  completeSyncRecord,
  listAutoSyncProviders,
  getSecretProviderById,
} from './secretProviderStore';
import { upsertEnvEntry, listEnvEntries, deleteEnvEntry } from './envStore';

/**
 * 秘钥同步结果
 */
export interface SyncResult {
  success: boolean;
  providerId: number;
  providerName: string;
  secretsCount: number;
  error?: string;
  syncedSecrets?: Array<{ key: string; synced: boolean; error?: string }>;
}

/**
 * 从 Infisical 同步秘钥
 */
async function syncFromInfisical(
  provider: SecretProviderRecord,
  config: InfisicalConfig
): Promise<{ secrets: Record<string, string>; count: number }> {
  try {
    const client = new (InfisicalSDK as any).default({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      siteUrl: config.siteUrl,
    });

    const secretsResponse = await client.listSecrets({
      projectId: config.projectId,
      environment: config.environment,
      path: config.secretPath || '/',
    });

    const secrets: Record<string, string> = {};
    for (const secret of secretsResponse) {
      if (secret.secretKey && secret.secretValue) {
        secrets[secret.secretKey] = secret.secretValue;
      }
    }

    return { secrets, count: Object.keys(secrets).length };
  } catch (error) {
    throw new Error(`Infisical sync failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 从 AWS Secrets Manager 同步秘钥
 */
async function syncFromAWS(
  provider: SecretProviderRecord,
  config: AWSSecretsManagerConfig
): Promise<{ secrets: Record<string, string>; count: number }> {
  // 注意：需要安装 @aws-sdk/client-secrets-manager
  // 这里提供基本结构，实际使用时需要安装相应的 SDK
  throw new Error('AWS Secrets Manager sync not implemented yet. Please install @aws-sdk/client-secrets-manager');
  
  // 示例实现（需要先安装 SDK）：
  /*
  const { SecretsManagerClient, GetSecretValueCommand, ListSecretsCommand } = require('@aws-sdk/client-secrets-manager');
  
  const client = new SecretsManagerClient({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  const secrets: Record<string, string> = {};
  
  if (config.secretName) {
    // 获取单个秘钥
    const command = new GetSecretValueCommand({ SecretId: config.secretName });
    const response = await client.send(command);
    if (response.SecretString) {
      const parsed = JSON.parse(response.SecretString);
      Object.assign(secrets, parsed);
    }
  } else {
    // 列出所有秘钥
    const listCommand = new ListSecretsCommand({});
    const listResponse = await client.send(listCommand);
    
    for (const secret of listResponse.SecretList || []) {
      if (secret.Name && (!config.prefix || secret.Name.startsWith(config.prefix))) {
        const getCommand = new GetSecretValueCommand({ SecretId: secret.Name });
        const getResponse = await client.send(getCommand);
        if (getResponse.SecretString) {
          const key = config.prefix ? secret.Name.replace(config.prefix, '') : secret.Name;
          secrets[key] = getResponse.SecretString;
        }
      }
    }
  }

  return { secrets, count: Object.keys(secrets).length };
  */
}

/**
 * 从 HashiCorp Vault 同步秘钥
 */
async function syncFromVault(
  provider: SecretProviderRecord,
  config: HashiCorpVaultConfig
): Promise<{ secrets: Record<string, string>; count: number }> {
  // 注意：需要安装 node-vault
  throw new Error('HashiCorp Vault sync not implemented yet. Please install node-vault');
  
  // 示例实现（需要先安装 SDK）：
  /*
  const vault = require('node-vault');
  
  const client = vault({
    apiVersion: 'v1',
    endpoint: config.address,
    token: config.token,
    namespace: config.namespace,
  });

  const mountPath = config.mountPath || 'secret';
  const fullPath = `${mountPath}/data/${config.path}`;
  
  const response = await client.read(fullPath);
  const secrets = response.data?.data || {};

  return { secrets, count: Object.keys(secrets).length };
  */
}

/**
 * 从 Azure Key Vault 同步秘钥
 */
async function syncFromAzure(
  provider: SecretProviderRecord,
  config: AzureKeyVaultConfig
): Promise<{ secrets: Record<string, string>; count: number }> {
  // 注意：需要安装 @azure/keyvault-secrets 和 @azure/identity
  throw new Error('Azure Key Vault sync not implemented yet. Please install @azure/keyvault-secrets');
  
  // 示例实现：
  /*
  const { SecretClient } = require('@azure/keyvault-secrets');
  const { ClientSecretCredential } = require('@azure/identity');
  
  const credential = new ClientSecretCredential(
    config.tenantId,
    config.clientId,
    config.clientSecret
  );
  
  const client = new SecretClient(config.vaultUrl, credential);
  
  const secrets: Record<string, string> = {};
  for await (const properties of client.listPropertiesOfSecrets()) {
    if (properties.name) {
      const secret = await client.getSecret(properties.name);
      if (secret.value) {
        secrets[properties.name] = secret.value;
      }
    }
  }
  
  return { secrets, count: Object.keys(secrets).length };
  */
}

/**
 * 从 GCP Secret Manager 同步秘钥
 */
async function syncFromGCP(
  provider: SecretProviderRecord,
  config: GCPSecretManagerConfig
): Promise<{ secrets: Record<string, string>; count: number }> {
  // 注意：需要安装 @google-cloud/secret-manager
  throw new Error('GCP Secret Manager sync not implemented yet. Please install @google-cloud/secret-manager');
  
  // 示例实现：
  /*
  const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
  
  const credentials = JSON.parse(config.credentials);
  const client = new SecretManagerServiceClient({ credentials });
  
  const projectPath = client.projectPath(config.projectId);
  const [secrets] = await client.listSecrets({ parent: projectPath });
  
  const result: Record<string, string> = {};
  for (const secret of secrets) {
    if (!secret.name) continue;
    
    const secretName = secret.name.split('/').pop() || '';
    if (config.prefix && !secretName.startsWith(config.prefix)) continue;
    
    const [version] = await client.accessSecretVersion({
      name: `${secret.name}/versions/latest`,
    });
    
    if (version.payload?.data) {
      const key = config.prefix ? secretName.replace(config.prefix, '') : secretName;
      result[key] = version.payload.data.toString();
    }
  }
  
  return { secrets: result, count: Object.keys(result).length };
  */
}

/**
 * 同步单个秘钥提供者
 */
export async function syncSecretProvider(providerId: number): Promise<SyncResult> {
  const provider = getSecretProviderById(providerId);
  if (!provider) {
    throw new Error(`Secret provider with id=${providerId} not found`);
  }

  if (!provider.enabled) {
    throw new Error(`Secret provider "${provider.name}" is disabled`);
  }

  const syncId = createSyncRecord(providerId);
  
  try {
    console.log(`[SecretSync] Starting sync for provider: ${provider.name} (${provider.type})`);
    
    let syncedSecrets: { secrets: Record<string, string>; count: number };
    
    // 根据提供者类型调用相应的同步函数
    switch (provider.type) {
      case 'infisical':
        syncedSecrets = await syncFromInfisical(provider, provider.config as InfisicalConfig);
        break;
      case 'aws-secrets-manager':
        syncedSecrets = await syncFromAWS(provider, provider.config as AWSSecretsManagerConfig);
        break;
      case 'hashicorp-vault':
        syncedSecrets = await syncFromVault(provider, provider.config as HashiCorpVaultConfig);
        break;
      case 'azure-keyvault':
        syncedSecrets = await syncFromAzure(provider, provider.config as AzureKeyVaultConfig);
        break;
      case 'gcp-secret-manager':
        syncedSecrets = await syncFromGCP(provider, provider.config as GCPSecretManagerConfig);
        break;
      default:
        throw new Error(`Unsupported provider type: ${provider.type}`);
    }

    // 将秘钥写入环境变量存储
    const syncResults: Array<{ key: string; synced: boolean; error?: string }> = [];
    for (const [key, value] of Object.entries(syncedSecrets.secrets)) {
      try {
        // 使用 upsertEnvEntry，它会自动处理创建和更新
        upsertEnvEntry({
          scope: 'global',
          key,
          value,
        });
        syncResults.push({ key, synced: true });
      } catch (error) {
        syncResults.push({
          key,
          synced: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // 更新同步状态
    updateSyncStatus(providerId, 'success');
    completeSyncRecord(syncId, 'success', syncedSecrets.count);

    console.log(`[SecretSync] Successfully synced ${syncedSecrets.count} secrets from ${provider.name}`);

    return {
      success: true,
      providerId,
      providerName: provider.name,
      secretsCount: syncedSecrets.count,
      syncedSecrets: syncResults,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[SecretSync] Failed to sync provider ${provider.name}:`, errorMessage);
    
    updateSyncStatus(providerId, 'failed', errorMessage);
    completeSyncRecord(syncId, 'failed', 0, errorMessage);

    return {
      success: false,
      providerId,
      providerName: provider.name,
      secretsCount: 0,
      error: errorMessage,
    };
  }
}

/**
 * 同步所有启用自动同步的秘钥提供者
 */
export async function syncAllAutoSyncProviders(): Promise<SyncResult[]> {
  const providers = listAutoSyncProviders();
  
  if (providers.length === 0) {
    console.log('[SecretSync] No auto-sync providers found');
    return [];
  }

  console.log(`[SecretSync] Starting auto-sync for ${providers.length} provider(s)`);
  
  const results: SyncResult[] = [];
  for (const provider of providers) {
    try {
      const result = await syncSecretProvider(provider.id);
      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        providerId: provider.id,
        providerName: provider.name,
        secretsCount: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  console.log(`[SecretSync] Auto-sync completed: ${successCount}/${results.length} successful`);

  return results;
}

/**
 * 同步多个秘钥提供者
 */
export async function syncMultipleProviders(providerIds: number[]): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  
  for (const providerId of providerIds) {
    try {
      const result = await syncSecretProvider(providerId);
      results.push(result);
    } catch (error) {
      const provider = getSecretProviderById(providerId);
      results.push({
        success: false,
        providerId,
        providerName: provider?.name || `Unknown (${providerId})`,
        secretsCount: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

