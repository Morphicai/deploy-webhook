/**
 * MCP 本地测试脚本
 * 
 * 使用方法：
 * 1. 确保主服务已启动: npm run dev
 * 2. 设置 API_KEY 环境变量
 * 3. 运行: node test/mcp-test.js
 */

const http = require('http');

// 配置
const API_KEY = process.env.API_KEY || 'your-api-key-here';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * 发送 MCP 消息
 */
async function sendMCPMessage(method, params = {}) {
  const message = {
    jsonrpc: '2.0',
    id: Date.now(),
    method,
    params,
  };

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
  };

  return new Promise((resolve, reject) => {
    const req = http.request(`${BASE_URL}/api/mcp/message`, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(message));
    req.end();
  });
}

/**
 * 测试套件
 */
const tests = {
  // 测试 1: 列出所有工具
  async testListTools() {
    console.log('\n📋 Test 1: List all available tools');
    console.log('─'.repeat(50));
    
    const response = await sendMCPMessage('tools/list');
    
    if (response.result && response.result.tools) {
      console.log(`✅ Found ${response.result.tools.length} tools:`);
      response.result.tools.forEach((tool, index) => {
        console.log(`   ${index + 1}. ${tool.name} - ${tool.description.split('\n')[0]}`);
      });
      return true;
    } else {
      console.error('❌ Failed to list tools');
      console.error(response);
      return false;
    }
  },

  // 测试 2: 获取应用列表
  async testGetApplications() {
    console.log('\n📦 Test 2: Get applications');
    console.log('─'.repeat(50));
    
    const response = await sendMCPMessage('tools/call', {
      name: 'get_applications',
      arguments: {},
    });

    if (response.result && response.result.content) {
      const content = JSON.parse(response.result.content[0].text);
      console.log(`✅ Found ${content.count} applications:`);
      
      if (content.applications && content.applications.length > 0) {
        content.applications.forEach((app) => {
          console.log(`   - ${app.name} (${app.image}:${app.version})`);
        });
      } else {
        console.log('   (No applications deployed yet)');
      }
      return true;
    } else {
      console.error('❌ Failed to get applications');
      console.error(response);
      return false;
    }
  },

  // 测试 3: 获取域名列表
  async testGetDomains() {
    console.log('\n🌐 Test 3: Get domains');
    console.log('─'.repeat(50));
    
    const response = await sendMCPMessage('tools/call', {
      name: 'get_domains',
      arguments: {},
    });

    if (response.result && response.result.content) {
      const content = JSON.parse(response.result.content[0].text);
      console.log(`✅ Found ${content.count} domains:`);
      
      if (content.domains && content.domains.length > 0) {
        content.domains.forEach((domain) => {
          const status = domain.enabled ? '✓' : '✗';
          console.log(`   ${status} ${domain.domainName} → ${domain.targetUrl}`);
        });
      } else {
        console.log('   (No domains configured yet)');
      }
      return true;
    } else {
      console.error('❌ Failed to get domains');
      console.error(response);
      return false;
    }
  },

  // 测试 4: 获取 Caddy 配置
  async testGetCaddyConfig() {
    console.log('\n⚙️  Test 4: Get Caddy configuration');
    console.log('─'.repeat(50));
    
    const response = await sendMCPMessage('tools/call', {
      name: 'get_caddy_config',
      arguments: {},
    });

    if (response.result && response.result.content) {
      const content = JSON.parse(response.result.content[0].text);
      console.log('✅ Caddy configuration retrieved');
      console.log('   Preview (first 200 chars):');
      console.log('   ' + content.caddyfile.substring(0, 200).replace(/\n/g, '\n   '));
      return true;
    } else {
      console.error('❌ Failed to get Caddy config');
      console.error(response);
      return false;
    }
  },

  // 测试 5: 测试部署（可选，注释掉以避免实际部署）
  async testDeploy() {
    console.log('\n🚀 Test 5: Deploy application (skipped by default)');
    console.log('─'.repeat(50));
    console.log('   Uncomment this test to actually deploy nginx');
    console.log('   ⚠️  This will create a real deployment!');
    return true;

    // Uncomment below to test actual deployment
    /*
    const response = await sendMCPMessage('tools/call', {
      name: 'deploy_application',
      arguments: {
        image: 'nginx',
        version: 'alpine',
        port: 18080,
        containerPort: 80,
        name: 'mcp-test-nginx',
      },
    });

    if (response.result && response.result.content) {
      const content = JSON.parse(response.result.content[0].text);
      if (content.success) {
        console.log('✅ Deployment successful!');
        console.log(`   Deployment ID: ${content.deploymentId}`);
        return true;
      } else {
        console.error('❌ Deployment failed');
        console.error(content);
        return false;
      }
    } else {
      console.error('❌ Failed to deploy');
      console.error(response);
      return false;
    }
    */
  },
};

/**
 * 运行所有测试
 */
async function runTests() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║        MCP Local Testing Suite                ║');
  console.log('╚════════════════════════════════════════════════╝');
  
  // 检查配置
  if (API_KEY === 'your-api-key-here') {
    console.error('\n❌ Error: Please set your API_KEY environment variable');
    console.log('\nUsage:');
    console.log('  export API_KEY=your-actual-api-key');
    console.log('  node test/mcp-test.js');
    process.exit(1);
  }

  // 测试服务器连接
  console.log(`\n🔌 Connecting to: ${BASE_URL}`);
  console.log(`🔑 Using API Key: ${API_KEY.substring(0, 10)}...`);

  try {
    // 测试 MCP info 端点
    const infoReq = await new Promise((resolve, reject) => {
      http.get(`${BASE_URL}/api/mcp/info`, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      }).on('error', reject);
    });
    
    console.log(`✅ Connected to: ${infoReq.name} v${infoReq.version}`);
  } catch (error) {
    console.error('\n❌ Failed to connect to MCP server');
    console.error('   Make sure the server is running: npm run dev');
    console.error(`   Error: ${error.message}`);
    process.exit(1);
  }

  // 运行测试
  const results = [];
  for (const [name, testFn] of Object.entries(tests)) {
    try {
      const result = await testFn();
      results.push({ name, success: result });
    } catch (error) {
      console.error(`\n❌ ${name} threw an error:`);
      console.error(`   ${error.message}`);
      results.push({ name, success: false, error: error.message });
    }
  }

  // 输出总结
  console.log('\n\n╔════════════════════════════════════════════════╗');
  console.log('║                Test Summary                    ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  results.forEach((result, index) => {
    const icon = result.success ? '✅' : '❌';
    console.log(`  ${icon} Test ${index + 1}: ${result.name}`);
    if (result.error) {
      console.log(`     Error: ${result.error}`);
    }
  });
  
  console.log(`\n  Total: ${results.length} tests`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed!\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed\n');
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  runTests().catch((error) => {
    console.error('\n💥 Fatal error:');
    console.error(error);
    process.exit(1);
  });
}

module.exports = { sendMCPMessage, tests };

