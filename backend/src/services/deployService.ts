import Docker from 'dockerode';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DeployRequest, DeployResponse } from '../types';
import { deployConfig } from '../config';
import { buildErrorResponse } from '../utils/errors';
import https from 'https';
import http from 'http';
import { buildEnvironmentForProject } from './envStore';
import { 
  getApplicationByName, 
  createApplication, 
  updateApplication 
} from './applicationStore';
import { getRepositoryById, getDefaultRepository, type RepositoryRecord } from './repositoryStore';
import { executeScheduledSyncs } from './secretSyncExecutor';

function postJson(urlString: string, body: unknown, headers: Record<string, string> = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlString);
      const data = Buffer.from(JSON.stringify(body));
      const options: https.RequestOptions = {
        method: 'POST',
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + (url.search || ''),
        headers: {
          'content-type': 'application/json',
          'content-length': String(data.length),
          ...headers,
        },
      };
      const client = url.protocol === 'https:' ? https : http;
      const req = client.request(options, (res) => {
        res.on('data', () => {});
        res.on('end', () => resolve());
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

export class DeployService {
  private docker: Docker;

  constructor() {
    this.docker = new Docker(this.buildDockerOptions());
  }

  private log(message: string, meta?: Record<string, unknown>): void {
    const suffix = meta ? ` ${this.safeStringify(meta)}` : '';
    console.log(`[deploy-webhook] ${message}${suffix}`);
  }

  private logError(message: string, error: unknown, meta?: Record<string, unknown>): void {
    const suffix = meta ? ` ${this.safeStringify(meta)}` : '';
    const description = error instanceof Error ? `${error.message}\n${error.stack || ''}` : String(error);
    console.error(`[deploy-webhook] ${message}${suffix}\n${description}`);
  }

  private safeStringify(meta: Record<string, unknown>): string {
    try {
      return JSON.stringify(meta);
    } catch {
      return '[unserializable-meta]';
    }
  }

  private buildDockerOptions(): Docker.DockerOptions {
    const dockerHost = deployConfig.dockerHost?.trim();
    if (!dockerHost) {
      return { socketPath: deployConfig.dockerSockPath } as Docker.DockerOptions;
    }

    try {
      // Support DOCKER_HOST formats: tcp://host:port, unix:///path
      const url = new URL(dockerHost);
      if (url.protocol === 'unix:') {
        return { socketPath: url.pathname } as Docker.DockerOptions;
      }

      if (url.protocol !== 'tcp:') {
        throw new Error(`Unsupported DOCKER_HOST protocol: ${url.protocol}`);
      }

      const host = url.hostname;
      const port = url.port ? Number(url.port) : (deployConfig.dockerTlsVerify ? 2376 : 2375);
      const useTls = !!deployConfig.dockerTlsVerify;

      if (!useTls) {
        return { host, port, protocol: 'http' } as Docker.DockerOptions;
      }

      const certDir = (deployConfig.dockerCertPath || '').trim();
      const caPath = certDir ? path.join(certDir, 'ca.pem') : '';
      const certPath = certDir ? path.join(certDir, 'cert.pem') : '';
      const keyPath = certDir ? path.join(certDir, 'key.pem') : '';

      const options: Docker.DockerOptions = { host, port, protocol: 'https' } as Docker.DockerOptions;

      // Load certificates if present (typical for dockerd --tlsverify)
      if (certDir) {
        if (fs.existsSync(caPath)) (options as any).ca = fs.readFileSync(caPath);
        if (fs.existsSync(certPath)) (options as any).cert = fs.readFileSync(certPath);
        if (fs.existsSync(keyPath)) (options as any).key = fs.readFileSync(keyPath);
      }

      return options;
    } catch (e) {
      // If DOCKER_HOST cannot be parsed, fallback to socket
      return { socketPath: deployConfig.dockerSockPath } as Docker.DockerOptions;
    }
  }

  private generateDeploymentId(): string {
    return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  }

  private async pullImage(fullImage: string, repository?: RepositoryRecord | null): Promise<void> {
    const [registry] = fullImage.split('/');
    let authconfig: any = undefined;

    // 使用指定仓库的认证信息
    if (repository) {
      if (repository.authType === 'username-password' && repository.username && repository.password) {
        authconfig = {
          username: repository.username,
          password: repository.password,
          serveraddress: registry,
        };
        this.log('Using username-password auth', { 
          registry, 
          username: repository.username,
          repositoryName: repository.name,
        });
      } else if (repository.authType === 'token' && repository.token) {
        // Docker Hub PAT: 需要提供用户名 + Token
        // GCR/其他 OAuth2: 使用 oauth2accesstoken + Token
        const isDockerHub = registry.includes('docker.io') || registry.includes('index.docker.io');
        
        if (isDockerHub && repository.username) {
          // Docker Hub PAT: username + token (as password)
          authconfig = {
            username: repository.username,
            password: repository.token,
            serveraddress: registry,
          };
          this.log('Using Docker Hub PAT auth', { 
            registry, 
            username: repository.username,
            repositoryName: repository.name,
          });
        } else {
          // GCR 等 OAuth2 认证
          authconfig = {
            username: 'oauth2accesstoken',
            password: repository.token,
            serveraddress: registry,
          };
          this.log('Using OAuth2 token auth', { 
            registry,
            repositoryName: repository.name,
          });
        }
      }
    } else if (deployConfig.dockerUsername && deployConfig.dockerPassword) {
      // 向后兼容：使用配置文件中的认证信息
      authconfig = {
        username: deployConfig.dockerUsername,
        password: deployConfig.dockerPassword,
        serveraddress: registry,
      };
      this.log('Using legacy config auth', { 
        registry, 
        username: deployConfig.dockerUsername,
      });
    } else {
      this.log('No authentication configured for registry', { registry });
    }

    try {
      await new Promise<void>((resolve, reject) => {
        this.docker.pull(fullImage, { authconfig }, (err, stream) => {
          if (err) return reject(err);
          if (!stream) return reject(new Error('docker pull returned no stream'));
          this.docker.modem.followProgress(stream, (err2) => (err2 ? reject(err2) : resolve()));
        });
      });
    } catch (error: any) {
      // 检查是否是认证错误 (401)
      const errorMessage = error?.message || String(error);
      const isAuthError = errorMessage.includes('401') || 
                          errorMessage.includes('unauthorized') || 
                          errorMessage.includes('authentication') ||
                          errorMessage.includes('Authentication required');
      
      if (isAuthError) {
        this.logError('Docker image pull failed - Authentication error (401)', error, {
          fullImage,
          registry,
          authType: repository?.authType || 'legacy-config',
          repositoryName: repository?.name || 'default',
          hasAuthConfig: !!authconfig,
          hasUsername: !!authconfig?.username,
          hasPassword: !!authconfig?.password,
          usernameLength: authconfig?.username?.length || 0,
          passwordLength: authconfig?.password?.length || 0,
          serverAddress: authconfig?.serveraddress || 'none',
        });
      }
      throw error;
    }
  }

  private async stopAndRemoveContainer(containerName: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerName);
      await container.inspect();
      try { await container.stop({ t: 10 }); } catch {}
      try { await container.remove({ force: true }); } catch {}
    } catch { /* not exists */ }
  }

  private async pruneImagesIfNeeded(): Promise<void> {
    if (!deployConfig.pruneImages) return;
    if (deployConfig.pruneStrategy === 'dangling') {
      await this.docker.pruneImages({ filters: { dangling: { true: true } as any } as any });
    }
  }

  private async sendCallback(payload: any): Promise<void> {
    if (!deployConfig.callbackUrl) return;
    const headers = { ...deployConfig.callbackHeaders };
    if (deployConfig.callbackSecret) {
      const signature = crypto.createHmac('sha256', deployConfig.callbackSecret).update(JSON.stringify(payload)).digest('hex');
      headers['x-webhook-signature'] = signature;
    }
    try {
      await postJson(deployConfig.callbackUrl, payload, headers);
    } catch (e) {
      console.error('[deploy-webhook] callback failed:', e);
    }
  }

  /**
   * 从镜像名称生成应用名称
   * 例如：
   * - nginx -> nginx
   * - library/nginx -> library-nginx
   * - focusbe/morphixai -> focusbe-morphixai
   * - gcr.io/project/image -> gcr-io-project-image
   */
  private generateAppName(imageName: string): string {
    return imageName
      .replace(/[/:]/g, '-')  // 替换 / 和 : 为 -
      .replace(/[^a-zA-Z0-9-]/g, '')  // 移除其他特殊字符
      .replace(/-+/g, '-')  // 多个连续的 - 合并为一个
      .replace(/^-|-$/g, '')  // 移除首尾的 -
      .toLowerCase();
  }

  async deploy(params: DeployRequest): Promise<DeployResponse> {
    const deploymentId = this.generateDeploymentId();
    const startedAt = new Date().toISOString();
    
    const image = String(params.image);
    
    // 自动生成应用名称（如果未提供）
    const name = params.name ? String(params.name) : this.generateAppName(image);
    
    // 如果未提供版本，默认使用 "latest"
    const version = params.version ? String(params.version) : 'latest';
    
    const port = Number(params.port);
    const containerPort = Number(params.containerPort);

    // 获取仓库配置
    let repository: RepositoryRecord | null = null;
    if (params.repositoryId) {
      repository = getRepositoryById(params.repositoryId);
      if (!repository) {
        throw new Error(`Repository with id ${params.repositoryId} not found`);
      }
    } else {
      // 使用默认仓库
      repository = getDefaultRepository();
    }

    // 构建完整的镜像名称
    let fullImage: string;
    if (repository) {
      // 从 registry URL 中提取主机名
      const registryHost = new URL(repository.registry).hostname;
      fullImage = `${registryHost}/${image}:${version}`;
      this.log('Using repository', { repositoryName: repository.name, registry: registryHost });
    } else {
      // 向后兼容：使用配置文件中的 registryHost
      // 如果 image 中已经包含完整路径（如 docker.io/nginx），则不添加前缀
      if (image.includes('.') || image.includes('/') && !image.startsWith('library/')) {
        fullImage = `${image}:${version}`;
      } else {
        fullImage = `${deployConfig.registryHost}/${image}:${version}`;
      }
    }

    try {
      this.log('Starting deployment', { deploymentId, name, image, version, port, containerPort, generatedName: !params.name });
      
      // 在部署前自动同步秘钥
      this.log('Syncing secrets from scheduled syncs');
      try {
        const syncResults = await executeScheduledSyncs();
        const successCount = syncResults.filter(r => r.success).length;
        const totalCount = syncResults.length;
        if (totalCount > 0) {
          this.log(`Secret sync completed: ${successCount}/${totalCount} successful`, {
            results: syncResults.map(r => ({
              syncName: r.syncName,
              success: r.success,
              created: r.created,
              updated: r.updated,
              unchanged: r.unchanged,
              errors: r.errors.length > 0 ? r.errors : undefined,
            })),
          });
        }
      } catch (syncError) {
        // 秘钥同步失败不应阻止部署，但需要记录日志
        this.logError('Secret sync failed, continuing with deployment', syncError);
      }
      
      this.log('Pulling image', { fullImage });
      await this.pullImage(fullImage, repository);
      this.log('Image pull completed', { fullImage });
      this.log('Stopping and removing existing container if present', { name });
      await this.stopAndRemoveContainer(name);

      const envFromStore = await buildEnvironmentForProject(name);
      const mergedEnv: Record<string, string> = { ...envFromStore };
      
      if (params.env) {
        for (const [key, value] of Object.entries(params.env)) {
          mergedEnv[key] = String(value);
        }
      }
      const envArray = Object.entries(mergedEnv).map(([key, value]) => `${key}=${value}`);

      const createOptions: Docker.ContainerCreateOptions = {
        name,
        Image: fullImage,
        Env: envArray.length ? envArray : undefined,
        HostConfig: {
          RestartPolicy: { Name: 'unless-stopped' },
          PortBindings: { [`${containerPort}/tcp`]: [{ HostPort: String(port) }] },
        },
        ExposedPorts: { [`${containerPort}/tcp`]: {} },
      };

      this.log('Creating container', { name, fullImage });
      const container = await this.docker.createContainer(createOptions);
      this.log('Starting container', { name });
      await container.start();

      // 保存或更新应用信息
      const existing = getApplicationByName(name);
      if (existing) {
        updateApplication(existing.id, {
          version,
          ports: [{ host: port, container: containerPort }],
          lastDeployedAt: new Date().toISOString(),
          status: 'running',
        });
      } else {
        createApplication({
          name,
          image,
          version,
          ports: [{ host: port, container: containerPort }],
          status: 'running',
          lastDeployedAt: new Date().toISOString(),
        });
      }

      await this.pruneImagesIfNeeded();

      const result: DeployResponse = { success: true, code: 0, stdout: `deploymentId=${deploymentId}`, stderr: '', deploymentId };
      this.log('Deployment completed', { deploymentId, name });
      await this.sendCallback({ ...result, startedAt, finishedAt: new Date().toISOString(), params: { name, image, version, port, containerPort } });
      return result;
    } catch (error: any) {
      this.logError('Deployment failed', error, { deploymentId, name, image, version });
      const fail: DeployResponse = buildErrorResponse(error, { deploymentId });
      await this.sendCallback({ ...fail, startedAt, finishedAt: new Date().toISOString(), params: { name, image, version, port, containerPort } });
      return fail;
    }
  }
}
