#!/usr/bin/env node

/**
 * Docker 运行状态检查脚本
 * 在运行测试前检查 Docker 是否可用
 */

const { execSync } = require('child_process');

console.log('🐳 Checking Docker availability...\n');

try {
  // 检查 Docker 命令是否存在
  try {
    execSync('docker --version', { stdio: 'pipe' });
  } catch (error) {
    console.error('❌ Docker is not installed');
    console.error('\n📖 Please install Docker:');
    console.error('   https://docs.docker.com/get-docker/\n');
    process.exit(1);
  }

  // 检查 Docker 守护进程是否运行
  try {
    const output = execSync('docker ps', { stdio: 'pipe', encoding: 'utf-8' });
    console.log('✅ Docker is running');
    
    // 显示 Docker 版本
    const version = execSync('docker version --format "{{.Server.Version}}"', { 
      stdio: 'pipe', 
      encoding: 'utf-8' 
    }).trim();
    console.log(`✅ Docker version: ${version}`);
    
    // 统计容器数量
    const lines = output.trim().split('\n').length - 1; // 减去标题行
    console.log(`✅ Running containers: ${Math.max(0, lines)}`);
    
    // 检查是否有测试容器残留
    try {
      const testContainers = execSync('docker ps -a --filter "name=test-" --format "{{.ID}}"', {
        stdio: 'pipe',
        encoding: 'utf-8'
      }).trim();
      
      if (testContainers) {
        const count = testContainers.split('\n').length;
        console.log(`⚠️  Found ${count} test container(s) from previous runs`);
        console.log('   Run: npm run test:cleanup to clean them up\n');
      } else {
        console.log('✅ No test containers from previous runs\n');
      }
    } catch (error) {
      // 忽略错误
    }
    
    console.log('✨ Docker check passed! You can run tests now.\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Docker daemon is not running');
    console.error('\n📖 Please start Docker:');
    console.error('   - macOS: Start Docker Desktop');
    console.error('   - Linux: sudo systemctl start docker');
    console.error('   - Windows: Start Docker Desktop\n');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Unexpected error:', error.message);
  process.exit(1);
}

