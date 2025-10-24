import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 测试配置
 * 文档: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  
  // 全局 setup 和 teardown
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  
  // 并行运行测试
  fullyParallel: true,
  
  // 失败时重试次数
  retries: process.env.CI ? 2 : 0,
  
  // 并行 worker 数量
  workers: process.env.CI ? 1 : undefined,
  
  // 报告配置
  reporter: [
    ['html'],
    ['list'],
  ],
  
  use: {
    // Base URL
    baseURL: 'http://localhost:5173',
    
    // 截图设置
    screenshot: 'only-on-failure',
    
    // 视频设置
    video: 'retain-on-failure',
    
    // 追踪设置
    trace: 'on-first-retry',
    
    // 超时设置
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  
  // 测试前启动开发服务器
  // 注意: 如果服务已在运行，会自动复用
  // 如果自动启动失败，请手动启动前后端服务
  webServer: [
    {
      // 前端开发服务器，设置环境变量指向测试后端
      command: 'VITE_API_BASE_URL=http://localhost:9001 npm run dev',
      port: 5173,
      reuseExistingServer: true, // 总是复用现有服务
      timeout: 120000,
      env: {
        VITE_API_BASE_URL: 'http://localhost:9001', // 指向测试后端
      },
    },
    {
      // 后端以测试模式启动，使用独立的测试数据库
      command: 'cd ../backend && NODE_ENV=test PORT=9001 DB_PATH=./data/test npm run dev',
      port: 9001, // 测试端口，与开发端口隔离
      reuseExistingServer: true, // 总是复用现有服务
      timeout: 120000,
      env: {
        NODE_ENV: 'test',
        PORT: '9001',
        DB_PATH: './data/test',
      },
    }
  ],
  
  // 浏览器配置
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

