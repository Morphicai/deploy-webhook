import Docker from 'dockerode';

/**
 * 测试资源清理工具
 */

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

/**
 * 清理所有测试容器
 * 删除所有名称以 'test-' 开头的容器
 */
export async function cleanupTestContainers(): Promise<void> {
  try {
    const containers = await docker.listContainers({ all: true });
    
    const testContainers = containers.filter(c => 
      c.Names.some(name => name.includes('test-'))
    );
    
    console.log(`[Cleanup] Found ${testContainers.length} test containers`);
    
    for (const containerInfo of testContainers) {
      try {
        const container = docker.getContainer(containerInfo.Id);
        
        // 停止容器（如果正在运行）
        if (containerInfo.State === 'running') {
          await container.stop({ t: 5 });
          console.log(`[Cleanup] Stopped container: ${containerInfo.Names[0]}`);
        }
        
        // 删除容器
        await container.remove({ force: true });
        console.log(`[Cleanup] Removed container: ${containerInfo.Names[0]}`);
      } catch (error: any) {
        console.error(`[Cleanup] Error removing container ${containerInfo.Names[0]}:`, error.message);
      }
    }
  } catch (error: any) {
    console.error('[Cleanup] Error cleaning up test containers:', error.message);
  }
}

/**
 * 停止并删除指定的容器
 */
export async function removeContainer(containerName: string): Promise<void> {
  try {
    const container = docker.getContainer(containerName);
    
    try {
      await container.inspect();
    } catch {
      // 容器不存在
      return;
    }
    
    try {
      await container.stop({ t: 5 });
    } catch {
      // 容器可能已经停止
    }
    
    await container.remove({ force: true });
    console.log(`[Cleanup] Removed container: ${containerName}`);
  } catch (error: any) {
    console.error(`[Cleanup] Error removing container ${containerName}:`, error.message);
  }
}

/**
 * 检查容器是否存在
 */
export async function containerExists(containerName: string): Promise<boolean> {
  try {
    const container = docker.getContainer(containerName);
    await container.inspect();
    return true;
  } catch {
    return false;
  }
}

/**
 * 检查容器是否正在运行
 */
export async function isContainerRunning(containerName: string): Promise<boolean> {
  try {
    const container = docker.getContainer(containerName);
    const info = await container.inspect();
    return info.State.Running;
  } catch {
    return false;
  }
}

/**
 * 等待容器启动
 */
export async function waitForContainer(
  containerName: string, 
  timeout: number = 30000
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await isContainerRunning(containerName)) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return false;
}

/**
 * 清理测试镜像（dangling images）
 */
export async function cleanupTestImages(): Promise<void> {
  try {
    await docker.pruneImages({ 
      filters: { dangling: { true: true } } 
    });
    console.log('[Cleanup] Cleaned up dangling images');
  } catch (error: any) {
    console.error('[Cleanup] Error cleaning up images:', error.message);
  }
}

/**
 * 获取容器日志
 * 用于调试失败的测试
 */
export async function getContainerLogs(containerName: string): Promise<string> {
  try {
    const container = docker.getContainer(containerName);
    const stream = await container.logs({
      stdout: true,
      stderr: true,
      tail: 100,
    });
    return stream.toString();
  } catch (error: any) {
    return `Error getting logs: ${error.message}`;
  }
}

/**
 * 完整的测试清理
 * 清理所有测试资源
 */
export async function fullTestCleanup(): Promise<void> {
  console.log('[Cleanup] Starting full test cleanup...');
  
  // 清理容器
  await cleanupTestContainers();
  
  // 清理镜像（可选）
  // await cleanupTestImages();
  
  console.log('[Cleanup] Full test cleanup completed');
}

