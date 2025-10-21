export interface DeployRequest {
  name?: string;  // 应用名称（可选，不填则自动从 image 生成）
  image?: string;  // 镜像名称，例如 nginx, library/nginx, focusbe/morphixai
  version?: string;  // 镜像版本标签
  repo?: string;  // 已废弃，保留向后兼容性，使用 image 替代
  // registry moved to env; keep optional for backward compat but unused
  registry?: string;
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
