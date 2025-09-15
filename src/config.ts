import { config } from 'dotenv';
import { DeployConfig } from './types';

config();

const whitelistEnv = process.env.IMAGE_NAME_WHITELIST || process.env.IMAGE_WHITELIST || '';
const imageNameWhitelist = whitelistEnv
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

function parseHeadersEnv(raw?: string): Record<string, string> {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    // Fallback: key1=value1;key2=value2
    return raw.split(';').reduce((acc, kv) => {
      const [k, v] = kv.split('=');
      if (k && v) acc[k.trim()] = v.trim();
      return acc;
    }, {} as Record<string, string>);
  }
}

export const deployConfig: DeployConfig = {
  port: parseInt(process.env.PORT || '9000', 10),
  webhookSecret: process.env.WEBHOOK_SECRET || '',
  defaultContainerName: process.env.DEFAULT_CONTAINER_NAME || 'morphicai-app-shell',
  imageName: process.env.IMAGE_NAME || 'focusbe/morphicai-app-shell',
  registryHost: process.env.REGISTRY_HOST || 'registry.cn-hangzhou.aliyuncs.com',
  hostPort: process.env.HOST_PORT || '8806',
  containerPort: process.env.CONTAINER_PORT || '3000',
  dockerRunOpts: process.env.DOCKER_RUN_OPTS || '',
  updateScriptPath: process.env.UPDATE_SCRIPT_PATH || './scripts/deploy.sh',
  dockerSockPath: process.env.DOCKER_SOCK_PATH || '/var/run/docker.sock',
  imageNameWhitelist,
  dockerUsername: process.env.DOCKER_USERNAME,
  dockerPassword: process.env.DOCKER_PASSWORD,
  callbackUrl: process.env.CALLBACK_URL,
  callbackHeaders: parseHeadersEnv(process.env.CALLBACK_HEADERS),
  callbackSecret: process.env.CALLBACK_SECRET,
  pruneImages: (process.env.PRUNE_IMAGES || '').toLowerCase() === 'true',
  pruneStrategy: (process.env.PRUNE_STRATEGY as 'dangling' | 'none') || 'dangling',
};
