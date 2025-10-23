import { DeployConfig } from './types';
import * as env from './env';

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
  port: env.PORT,
  webhookSecret: env.WEBHOOK_SECRET,
  imageName: env.IMAGE_NAME,
  registryHost: env.REGISTRY_HOST,
  hostPort: env.HOST_PORT,
  containerPort: env.CONTAINER_PORT,
  dockerRunOpts: env.DOCKER_RUN_OPTS,
  updateScriptPath: env.UPDATE_SCRIPT_PATH,
  dockerSockPath: env.DOCKER_SOCK_PATH,
  dockerHost: env.DOCKER_HOST,
  dockerTlsVerify: env.DOCKER_TLS_VERIFY,
  dockerCertPath: env.DOCKER_CERT_PATH,
  imageNameWhitelist: env.IMAGE_WHITELIST_MERGED,
  dockerUsername: env.DOCKER_USERNAME,
  dockerPassword: env.DOCKER_PASSWORD,
  callbackUrl: env.CALLBACK_URL,
  callbackHeaders: parseHeadersEnv(env.CALLBACK_HEADERS),
  callbackSecret: env.CALLBACK_SECRET,
  pruneImages: env.PRUNE_IMAGES,
  pruneStrategy: env.PRUNE_STRATEGY,
};
