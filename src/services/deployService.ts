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
import { upsertApplication } from './applicationStore';

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
      this.log('Starting deployment', { deploymentId, name, repo, version, port, containerPort });
      this.log('Pulling image', { fullImage });
      await this.pullImage(fullImage);
      this.log('Image pull completed', { fullImage });
      this.log('Stopping and removing existing container if present', { name });
      await this.stopAndRemoveContainer(name);

      const envFromStore = buildEnvironmentForProject(name);
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

      upsertApplication({ name, repo, version, port, containerPort });

      await this.pruneImagesIfNeeded();

      const result: DeployResponse = { success: true, code: 0, stdout: `deploymentId=${deploymentId}`, stderr: '', deploymentId };
      this.log('Deployment completed', { deploymentId, name });
      await this.sendCallback({ ...result, startedAt, finishedAt: new Date().toISOString(), params: { name, repo, version, port, containerPort } });
      return result;
    } catch (error: any) {
      this.logError('Deployment failed', error, { deploymentId, name, repo, version });
      const fail: DeployResponse = buildErrorResponse(error, { deploymentId });
      await this.sendCallback({ ...fail, startedAt, finishedAt: new Date().toISOString(), params: { name, repo, version, port, containerPort } });
      return fail;
    }
  }
}
