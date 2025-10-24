import { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Playwright 全局 Setup
 * 在所有测试运行前执行一次
 */
async function globalSetup(config: FullConfig) {
  console.log('\n🚀 [Global Setup] E2E 测试环境初始化...\n');
  
  // 1. 清理测试数据库
  console.log('💾 [Global Setup] 清理测试数据库...');
  const backendPath = path.join(__dirname, '../../backend');
  const testDbPath = path.join(backendPath, 'data/test');
  
  if (fs.existsSync(testDbPath)) {
    try {
      // 删除测试数据库目录
      fs.rmSync(testDbPath, { recursive: true, force: true });
      console.log('✅ [Global Setup] 测试数据库已清理');
    } catch (error) {
      console.warn('⚠️ [Global Setup] 清理测试数据库失败:', error);
    }
  } else {
    console.log('✅ [Global Setup] 测试数据库目录不存在，跳过清理');
  }
  
  // 2. 清理测试容器（可选）
  console.log('\n🐳 [Global Setup] 清理测试容器...');
  try {
    execSync('docker ps -a --filter "name=test-" -q | xargs docker rm -f 2>/dev/null || true', {
      stdio: 'pipe',
    });
    console.log('✅ [Global Setup] 测试容器已清理');
  } catch (error) {
    console.warn('⚠️ [Global Setup] 清理测试容器失败（可能没有测试容器）');
  }
  
  // 3. 确保环境变量设置正确
  console.log('\n🔧 [Global Setup] 设置测试环境变量...');
  process.env.NODE_ENV = 'test';
  process.env.VITE_API_BASE_URL = 'http://localhost:9001';
  console.log('   - NODE_ENV=test');
  console.log('   - VITE_API_BASE_URL=http://localhost:9001');
  console.log('✅ [Global Setup] 环境变量已设置');
  
  console.log('\n✨ [Global Setup] E2E 测试环境初始化完成！\n');
}

export default globalSetup;

