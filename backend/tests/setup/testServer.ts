import express, { Express } from 'express';
import { Server } from 'http';
import { initializeTestDatabase, cleanTestDatabase } from './testDatabase';

/**
 * 测试服务器管理
 */

let testApp: Express | null = null;
let testServer: Server | null = null;

/**
 * 创建测试应用实例
 * 与生产环境类似，但使用测试配置
 */
export async function createTestApp(): Promise<Express> {
  // 确保使用测试数据库
  initializeTestDatabase();
  
  // 动态导入应用，确保使用测试环境配置
  const { createApp } = await import('./testAppFactory');
  const app = createApp();
  
  testApp = app;
  return app;
}

/**
 * 启动测试服务器
 */
export async function startTestServer(port?: number): Promise<{ app: Express; server: Server }> {
  if (testServer) {
    console.log('[Test Server] Server already running');
    return { app: testApp!, server: testServer };
  }
  
  const app = await createTestApp();
  const testPort = port || parseInt(process.env.TEST_PORT || '9001', 10);
  
  return new Promise((resolve, reject) => {
    try {
      const server = app.listen(testPort, () => {
        console.log(`[Test Server] Started on port ${testPort}`);
        testServer = server;
        resolve({ app, server });
      });
      
      server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`[Test Server] Port ${testPort} is already in use`);
        }
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 停止测试服务器
 */
export async function stopTestServer(): Promise<void> {
  if (!testServer) {
    return;
  }
  
  return new Promise((resolve, reject) => {
    testServer!.close((error) => {
      if (error) {
        console.error('[Test Server] Error stopping server:', error);
        reject(error);
      } else {
        console.log('[Test Server] Stopped');
        testServer = null;
        testApp = null;
        resolve();
      }
    });
  });
}

/**
 * 获取测试应用实例
 */
export function getTestApp(): Express | null {
  return testApp;
}

/**
 * 获取测试服务器实例
 */
export function getTestServer(): Server | null {
  return testServer;
}

/**
 * 重置测试环境
 * 清理数据库但保持服务器运行
 */
export function resetTestEnvironment(): void {
  // 只清空表，不删除数据库文件
  cleanTestDatabase();
  // 需要重新初始化数据库结构
  initializeTestDatabase();
}

