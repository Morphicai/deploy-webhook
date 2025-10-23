import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';
import { ensureDockerForTests } from './dockerCheck';

/**
 * 全局测试设置
 * 在所有测试运行前执行
 */

// 加载测试环境变量
const envPath = path.join(__dirname, '../../.env.test');
if (fs.existsSync(envPath)) {
  config({ path: envPath });
} else {
  // 如果没有 .env.test 文件，使用默认测试配置
  process.env.NODE_ENV = 'test';
  process.env.PORT = '9001';
  process.env.TEST_PORT = '9001';
  process.env.DB_PATH = './data/test';
  process.env.WEBHOOK_SECRET = 'test-webhook-secret-123456';
  process.env.ADMIN_TOKEN = 'test-admin-token-789012';
  process.env.DOCKER_SOCK_PATH = '/var/run/docker.sock';
  process.env.REGISTRY_HOST = 'docker.io';
  process.env.PRUNE_IMAGES = 'false';
  process.env.LOG_LEVEL = 'error';
}

// 确保是测试环境
process.env.NODE_ENV = 'test';

// 全局测试超时
jest.setTimeout(30000);

// 在测试运行前检查 Docker
beforeAll(async () => {
  console.log('[Test Setup] Checking Docker availability...');
  try {
    await ensureDockerForTests();
  } catch (error: any) {
    console.error(error.message);
    throw error;
  }
}, 10000); // 10秒超时用于 Docker 检查

// 全局清理
afterAll(async () => {
  // 延迟关闭，确保所有清理完成
  await new Promise(resolve => setTimeout(resolve, 1000));
});

// 捕获未处理的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in test:', reason);
});

console.log('[Test Setup] Test environment initialized');
console.log(`[Test Setup] Database path: ${process.env.DB_PATH}`);
console.log(`[Test Setup] Test port: ${process.env.TEST_PORT}`);

