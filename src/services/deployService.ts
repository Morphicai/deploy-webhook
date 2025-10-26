import Docker from 'dockerode';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DeployRequest, DeployResponse } from '../types';
import { deployConfig } from '../config';
import https from 'https';
import http from 'http';

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

  private async pullImage(fullImage: string): Promise<void> {
    const [registry] = fullImage.split('/');
    const authconfig = (deployConfig.dockerUsername && deployConfig.dockerPassword)
      ? { username: deployConfig.dockerUsername, password: deployConfig.dockerPassword, serveraddress: registry }
      : undefined;

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

  private parseVolumes(volumes?: string[]): Docker.MountSettings[] {
    if (!volumes || !Array.isArray(volumes)) return [];
    
    return volumes.map(volume => {
      const [hostPath, containerPath, ...rest] = volume.split(':');
      const mode = rest.length > 0 ? rest[0] : 'rw';
      
      return {
        Type: 'bind',
        Source: hostPath,
        Target: containerPath,
        ReadOnly: mode === 'ro'
      } as Docker.MountSettings;
    });
  }

  private parseEnvironment(environment?: string[]): string[] {
    if (!environment || !Array.isArray(environment)) return [];
    return environment.filter(env => typeof env === 'string' && env.includes('='));
  }

  async deploy(params: DeployRequest): Promise<DeployResponse> {
    const deploymentId = this.generateDeploymentId();
    const startedAt = new Date().toISOString();
    const name = String(params.name);
    const repo = String(params.repo);
    const version = String(params.version);
    const port = Number(params.port);
    const containerPort = Number(params.containerPort);

    const fullImage = `${deployConfig.registryHost}/${repo}:${version}`;

    try {
      await this.pullImage(fullImage);
      await this.stopAndRemoveContainer(name);

      // Parse volumes and environment variables
      const mounts = this.parseVolumes(params.volumes);
      const env = this.parseEnvironment(params.environment);

      const createOptions: Docker.ContainerCreateOptions = {
        name,
        Image: fullImage,
        Env: env.length > 0 ? env : undefined,
        HostConfig: {
          RestartPolicy: { Name: 'unless-stopped' },
          PortBindings: { [`${containerPort}/tcp`]: [{ HostPort: String(port) }] },
          Mounts: mounts.length > 0 ? mounts : undefined,
        },
        ExposedPorts: { [`${containerPort}/tcp`]: {} },
      };

      const container = await this.docker.createContainer(createOptions);
      await container.start();

      await this.pruneImagesIfNeeded();

      const result: DeployResponse = { success: true, code: 0, stdout: `deploymentId=${deploymentId}`, stderr: '', deploymentId };
      await this.sendCallback({ 
        ...result, 
        startedAt, 
        finishedAt: new Date().toISOString(), 
        params: { name, repo, version, port, containerPort, volumes: params.volumes, environment: params.environment } 
      });
      return result;
    } catch (error: any) {
      const fail: DeployResponse = { success: false, error: error?.message || String(error), stderr: error?.stack || String(error), deploymentId };
      await this.sendCallback({ 
        ...fail, 
        startedAt, 
        finishedAt: new Date().toISOString(), 
        params: { name, repo, version, port, containerPort, volumes: params.volumes, environment: params.environment } 
      });
      return fail;
    }
  }
}
