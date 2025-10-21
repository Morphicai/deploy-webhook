import Docker from 'dockerode';
import { deployConfig } from '../config';
import { 
  getApplicationById, 
  updateApplicationStatus, 
  updateApplicationDeployedAt,
  type ApplicationRecord,
  type PortMapping
} from './applicationStore';
import { getRepositoryById } from './repositoryStore';
import { buildEnvironmentForProject } from './envStore';
import path from 'path';
import fs from 'fs';

export class ContainerService {
  private docker: Docker;

  constructor() {
    this.docker = new Docker(this.buildDockerOptions());
  }

  private buildDockerOptions(): Docker.DockerOptions {
    const dockerHost = deployConfig.dockerHost?.trim();
    if (!dockerHost) {
      return { socketPath: deployConfig.dockerSockPath } as Docker.DockerOptions;
    }

    try {
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

      if (certDir) {
        if (fs.existsSync(caPath)) (options as any).ca = fs.readFileSync(caPath);
        if (fs.existsSync(certPath)) (options as any).cert = fs.readFileSync(certPath);
        if (fs.existsSync(keyPath)) (options as any).key = fs.readFileSync(keyPath);
      }

      return options;
    } catch (e) {
      return { socketPath: deployConfig.dockerSockPath } as Docker.DockerOptions;
    }
  }

  private log(message: string, meta?: Record<string, unknown>): void {
    const suffix = meta ? ` ${JSON.stringify(meta)}` : '';
    console.log(`[container-service] ${message}${suffix}`);
  }

  private logError(message: string, error: unknown, meta?: Record<string, unknown>): void {
    const suffix = meta ? ` ${JSON.stringify(meta)}` : '';
    const description = error instanceof Error ? `${error.message}\n${error.stack || ''}` : String(error);
    console.error(`[container-service] ${message}${suffix}\n${description}`);
  }

  /**
   * 部署应用（拉取镜像、创建并启动容器）
   */
  async deployApplication(appId: number): Promise<void> {
    const app = getApplicationById(appId);
    if (!app) throw new Error(`Application with id=${appId} not found`);

    try {
      updateApplicationStatus(appId, 'deploying');
      this.log('Starting deployment', { appId, appName: app.name });

      // 构建完整镜像名称
      const version = app.version || 'latest';
      const fullImage = await this.buildFullImageName(app.image, version, app.repositoryId);

      // 拉取镜像
      this.log('Pulling image', { fullImage });
      await this.pullImage(fullImage, app.repositoryId);

      // 停止并删除旧容器
      await this.stopAndRemoveContainer(app.name);

      // 合并环境变量
      const envFromStore = buildEnvironmentForProject(app.name);
      const mergedEnv = { ...envFromStore, ...app.envVars };
      const envArray = Object.entries(mergedEnv).map(([key, value]) => `${key}=${value}`);

      // 构建端口映射
      const portBindings: Docker.PortMap = {};
      const exposedPorts: { [port: string]: {} } = {};
      
      for (const portMap of app.ports) {
        const containerPortKey = `${portMap.container}/tcp`;
        portBindings[containerPortKey] = [{ HostPort: String(portMap.host) }];
        exposedPorts[containerPortKey] = {};
      }

      // 创建容器
      const createOptions: Docker.ContainerCreateOptions = {
        name: app.name,
        Image: fullImage,
        Env: envArray.length ? envArray : undefined,
        HostConfig: {
          RestartPolicy: { Name: 'unless-stopped' },
          PortBindings: portBindings,
        },
        ExposedPorts: exposedPorts,
      };

      this.log('Creating container', { name: app.name, fullImage });
      const container = await this.docker.createContainer(createOptions);
      
      this.log('Starting container', { name: app.name });
      await container.start();

      updateApplicationDeployedAt(appId);
      this.log('Deployment completed', { appId, appName: app.name });
    } catch (error) {
      this.logError('Deployment failed', error, { appId, appName: app.name });
      updateApplicationStatus(appId, 'error');
      throw error;
    }
  }

  /**
   * 启动容器
   */
  async startContainer(appId: number): Promise<void> {
    const app = getApplicationById(appId);
    if (!app) throw new Error(`Application with id=${appId} not found`);

    try {
      const container = this.docker.getContainer(app.name);
      await container.start();
      updateApplicationStatus(appId, 'running');
      this.log('Container started', { appId, appName: app.name });
    } catch (error: any) {
      if (error.statusCode === 304) {
        // Container already started
        updateApplicationStatus(appId, 'running');
        return;
      }
      if (error.statusCode === 404) {
        throw new Error('Container not found. Please deploy the application first.');
      }
      this.logError('Failed to start container', error, { appId, appName: app.name });
      throw error;
    }
  }

  /**
   * 停止容器
   */
  async stopContainer(appId: number): Promise<void> {
    const app = getApplicationById(appId);
    if (!app) throw new Error(`Application with id=${appId} not found`);

    try {
      const container = this.docker.getContainer(app.name);
      await container.stop({ t: 10 });
      updateApplicationStatus(appId, 'stopped');
      this.log('Container stopped', { appId, appName: app.name });
    } catch (error: any) {
      if (error.statusCode === 304) {
        // Container already stopped
        updateApplicationStatus(appId, 'stopped');
        return;
      }
      if (error.statusCode === 404) {
        updateApplicationStatus(appId, 'stopped');
        return;
      }
      this.logError('Failed to stop container', error, { appId, appName: app.name });
      throw error;
    }
  }

  /**
   * 重启容器
   */
  async restartContainer(appId: number): Promise<void> {
    const app = getApplicationById(appId);
    if (!app) throw new Error(`Application with id=${appId} not found`);

    try {
      const container = this.docker.getContainer(app.name);
      await container.restart({ t: 10 });
      updateApplicationStatus(appId, 'running');
      this.log('Container restarted', { appId, appName: app.name });
    } catch (error: any) {
      if (error.statusCode === 404) {
        throw new Error('Container not found. Please deploy the application first.');
      }
      this.logError('Failed to restart container', error, { appId, appName: app.name });
      throw error;
    }
  }

  /**
   * 获取容器状态
   */
  async getContainerStatus(appName: string): Promise<{
    exists: boolean;
    running: boolean;
    info?: any;
  }> {
    try {
      const container = this.docker.getContainer(appName);
      const info = await container.inspect();
      return {
        exists: true,
        running: info.State.Running,
        info: {
          status: info.State.Status,
          startedAt: info.State.StartedAt,
          finishedAt: info.State.FinishedAt,
        },
      };
    } catch (error: any) {
      if (error.statusCode === 404) {
        return { exists: false, running: false };
      }
      throw error;
    }
  }

  private async buildFullImageName(image: string, version: string, repositoryId: number | null): Promise<string> {
    if (repositoryId) {
      const repository = getRepositoryById(repositoryId);
      if (repository) {
        const registryHost = new URL(repository.registry).hostname;
        return `${registryHost}/${image}:${version}`;
      }
    }
    
    // 默认使用配置的 registry 或者镜像自带的 registry
    if (image.includes('.') || image.includes('/') && !image.startsWith('library/')) {
      return `${image}:${version}`;
    }
    
    return `${deployConfig.registryHost}/${image}:${version}`;
  }

  private async pullImage(fullImage: string, repositoryId: number | null): Promise<void> {
    const [registry] = fullImage.split('/');
    let authconfig: any = undefined;

    if (repositoryId) {
      const repository = getRepositoryById(repositoryId);
      if (repository) {
        if (repository.authType === 'username-password' && repository.username && repository.password) {
          authconfig = {
            username: repository.username,
            password: repository.password,
            serveraddress: registry,
          };
        } else if (repository.authType === 'token' && repository.token) {
          const isDockerHub = registry.includes('docker.io') || registry.includes('index.docker.io');
          if (isDockerHub && repository.username) {
            authconfig = {
              username: repository.username,
              password: repository.token,
              serveraddress: registry,
            };
          } else {
            authconfig = {
              username: 'oauth2accesstoken',
              password: repository.token,
              serveraddress: registry,
            };
          }
        }
      }
    }

    await new Promise<void>((resolve, reject) => {
      this.docker.pull(fullImage, { authconfig }, (err, stream) => {
        if (err) return reject(err);
        if (!stream) return reject(new Error('docker pull returned no stream'));
        this.docker.modem.followProgress(stream, (err2) => (err2 ? reject(err2) : resolve()));
      });
    });
  }

  private async stopAndRemoveContainer(containerName: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerName);
      await container.inspect();
      try { await container.stop({ t: 10 }); } catch {}
      try { await container.remove({ force: true }); } catch {}
    } catch { /* not exists */ }
  }
}

