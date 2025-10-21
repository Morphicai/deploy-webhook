export interface DeployRequest {
  name?: string;
  version?: string;
  repo?: string;
  // registry moved to env; keep optional for backward compat but unused
  registry?: string;
  port?: string | number;
  containerPort?: string | number;
  secret?: string;
  env?: Record<string, string | number | boolean>;
  secretRefs?: string[];
  repositoryId?: number;  // 指定使用的镜像仓库ID（可选，默认使用默认仓库）
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
