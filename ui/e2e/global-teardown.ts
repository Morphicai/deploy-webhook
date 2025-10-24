import { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// ES modules 中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Playwright 全局 Teardown
 * 在所有测试运行后执行一次
 */
async function globalTeardown(config: FullConfig) {
  console.log('\n🧹 [Global Teardown] E2E 测试环境清理...\n');
  
  // 1. 清理测试数据库（可选，保留用于调试）
  console.log('💾 [Global Teardown] 清理测试数据库...');
  const backendPath = path.join(__dirname, '../../backend');
  const testDbPath = path.join(backendPath, 'data/test');
  
  // 如果设置了环境变量，则保留测试数据库用于调试
  if (process.env.KEEP_TEST_DB === 'true') {
    console.log('⏭️  [Global Teardown] 保留测试数据库用于调试（KEEP_TEST_DB=true）');
  } else {
    if (fs.existsSync(testDbPath)) {
      try {
        fs.rmSync(testDbPath, { recursive: true, force: true });
        console.log('✅ [Global Teardown] 测试数据库已清理');
      } catch (error) {
        console.warn('⚠️ [Global Teardown] 清理测试数据库失败:', error);
      }
    } else {
      console.log('✅ [Global Teardown] 测试数据库目录不存在');
    }
  }
  
  // 2. 清理测试容器
  console.log('\n🐳 [Global Teardown] 清理测试容器...');
  try {
    execSync('docker ps -a --filter "name=test-" -q | xargs docker rm -f 2>/dev/null || true', {
      stdio: 'pipe',
    });
    console.log('✅ [Global Teardown] 测试容器已清理');
  } catch (error) {
    console.warn('⚠️ [Global Teardown] 清理测试容器失败（可能没有测试容器）');
  }
  
  console.log('\n✨ [Global Teardown] E2E 测试环境清理完成！\n');
  console.log('💡 提示：如果需要保留测试数据库用于调试，请设置环境变量：');
  console.log('   KEEP_TEST_DB=true npm run test:e2e\n');
}

export default globalTeardown;

