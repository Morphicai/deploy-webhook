import Docker from 'dockerode';

/**
 * Docker 运行状态检查工具
 */

let dockerAvailable: boolean | null = null;

/**
 * 检查 Docker 是否可用
 */
export async function checkDockerAvailable(): Promise<boolean> {
  // 如果已经检查过，返回缓存结果
  if (dockerAvailable !== null) {
    return dockerAvailable;
  }

  try {
    const docker = new Docker({ socketPath: process.env.DOCKER_SOCK_PATH || '/var/run/docker.sock' });
    
    // 尝试 ping Docker 守护进程
    await docker.ping();
    
    // 尝试列出容器（验证权限）
    await docker.listContainers({ limit: 1 });
    
    dockerAvailable = true;
    console.log('[Docker Check] ✅ Docker is available and accessible');
    return true;
  } catch (error: any) {
    dockerAvailable = false;
    
    console.error('[Docker Check] ❌ Docker is not available');
    console.error('[Docker Check] Error:', error.message);
    
    if (error.code === 'ENOENT') {
      console.error('[Docker Check] Docker socket not found. Is Docker installed?');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('[Docker Check] Docker daemon is not running. Please start Docker.');
    } else if (error.code === 'EACCES') {
      console.error('[Docker Check] Permission denied. Try: sudo chmod 666 /var/run/docker.sock');
    }
    
    return false;
  }
}

/**
 * 检查 Docker 版本
 */
export async function getDockerVersion(): Promise<string | null> {
  try {
    const docker = new Docker({ socketPath: process.env.DOCKER_SOCK_PATH || '/var/run/docker.sock' });
    const version = await docker.version();
    return version.Version || null;
  } catch {
    return null;
  }
}

/**
 * 检查 Docker 信息
 */
export async function getDockerInfo(): Promise<{
  available: boolean;
  version?: string;
  containers?: number;
  images?: number;
  error?: string;
}> {
  try {
    const docker = new Docker({ socketPath: process.env.DOCKER_SOCK_PATH || '/var/run/docker.sock' });
    
    await docker.ping();
    
    const version = await docker.version();
    const info = await docker.info();
    
    return {
      available: true,
      version: version.Version,
      containers: info.Containers,
      images: info.Images,
    };
  } catch (error: any) {
    return {
      available: false,
      error: error.message,
    };
  }
}

/**
 * 在测试前验证 Docker（用于测试套件）
 */
export async function ensureDockerForTests(): Promise<void> {
  const available = await checkDockerAvailable();
  
  if (!available) {
    const errorMessage = `
╔════════════════════════════════════════════════════════════════╗
║                    Docker Not Available                         ║
╚════════════════════════════════════════════════════════════════╝

Tests require Docker to be running.

Please:
  1. Install Docker Desktop (https://www.docker.com/products/docker-desktop/)
  2. Start Docker Desktop
  3. Verify Docker is running: docker ps
  4. Run tests again: npm test

Common issues:
  - Docker daemon not started: Start Docker Desktop
  - Permission denied: sudo chmod 666 /var/run/docker.sock
  - Socket not found: Check Docker installation

`;
    
    throw new Error(errorMessage);
  }
  
  // 显示 Docker 信息
  const info = await getDockerInfo();
  if (info.version) {
    console.log(`[Docker Check] Docker version: ${info.version}`);
    console.log(`[Docker Check] Containers: ${info.containers}, Images: ${info.images}`);
  }
}

/**
 * 重置缓存状态（用于测试）
 */
export function resetDockerCheckCache(): void {
  dockerAvailable = null;
}

