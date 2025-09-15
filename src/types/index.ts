export interface DeployRequest {
  name?: string;
  version?: string;
  repo?: string;
  // registry moved to env; keep optional for backward compat but unused
  registry?: string;
  port?: string | number;
  containerPort?: string | number;
  secret?: string;
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
  defaultContainerName: string;
  imageName: string;
  registryHost: string;
  hostPort: string;
  containerPort: string;
  dockerRunOpts: string;
  updateScriptPath: string;
  dockerSockPath: string;
  imageNameWhitelist: string[];
  dockerUsername?: string;
  dockerPassword?: string;
  callbackUrl?: string;
  callbackHeaders: Record<string, string>;
  callbackSecret?: string;
  pruneImages: boolean;
  pruneStrategy: 'dangling' | 'none';
}
