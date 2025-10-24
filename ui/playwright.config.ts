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
      // 后端测试服务器（使用 ts-node，不带 nodemon）
      name: 'Backend',                              // 服务名称，便于日志识别
      command: 'npm run test:serve',
      url: 'http://localhost:9001/health',          // 使用健康检查端点，确保服务完全就绪
      cwd: '../backend',                            // 工作目录
      timeout: 120000,                              // 2分钟超时
      reuseExistingServer: !process.env.CI,         // CI 环境不复用，本地开发复用
      stdout: 'pipe',                               // 捕获日志用于调试
      stderr: 'pipe',
      env: {
        // 后端环境变量
        // 注意：不能设置 NODE_ENV=test，否则服务器不会启动（代码中if (env.NODE_ENV !== 'test')判断）
        // NODE_ENV: 'test',         // ❌ 会导致服务器不启动
        PORT: '9001',               // 测试端口（与开发端口 9000 隔离）
        DB_PATH: './data/test',     // 测试数据库路径（与开发数据库隔离）
        TEST_MODE: 'e2e',           // E2E 测试模式标识
        LOG_LEVEL: 'error',         // 减少日志输出
      },
    },
    {
      // 前端测试服务器
      name: 'Frontend',                             // 服务名称，便于日志识别
      command: 'npm run test:serve',
      url: 'http://localhost:5173',                 // 使用 URL 而不是 port
      timeout: 60000,                               // 1分钟超时（Vite 启动快）
      reuseExistingServer: !process.env.CI,         // CI 环境不复用，本地开发复用
      stdout: 'pipe',                               // 捕获日志用于调试
      stderr: 'pipe',
      env: {
        // 前端环境变量
        VITE_API_BASE_URL: 'http://localhost:9001', // 指向测试后端
        TEST_MODE: 'e2e',                           // E2E 测试模式标识
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

