module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts', // 主入口文件不测试
    '!src/mcp/server.ts', // MCP 服务器单独测试
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/testSetup.ts'],
  testTimeout: 30000, // 30秒超时（用于 Docker 操作）
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  // 串行运行测试，避免数据库锁定问题
  maxWorkers: 1,
  // 忽略 node_modules 和 dist
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  // 环境变量
  globals: {
    'ts-jest': {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    },
  },
};

