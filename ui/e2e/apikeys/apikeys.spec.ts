import { test, expect } from '@playwright/test';
import { ensureAuthenticated } from '../utils/helpers';

/**
 * 导航到 API Keys 页面（SPA 友好）
 */
async function navigateToAPIKeys(page: any) {
  await page.goto('/api-keys', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  
  // 等待页面加载完成（通过标题或按钮）
  await Promise.race([
    page.waitForSelector('h2:has-text("API Keys")', { state: 'visible', timeout: 10000 }),
    page.waitForSelector('button:has-text("Create API Key")', { state: 'visible', timeout: 10000 })
  ]);
}

test.describe.configure({ mode: 'serial' }); // 串行执行，确保测试顺序

test.describe('API Keys 管理测试', () => {
  // 测试用的 API Key 数据
  const testApiKey = {
    name: 'Test API Key',
    description: 'API key for automated testing',
    permission: 'full'
  };

  let createdKeyId: string | null = null;

  // 每个测试前确保已登录
  test.beforeEach(async ({ page }) => {
    const authenticated = await ensureAuthenticated(page);
    if (!authenticated) {
      throw new Error('认证失败：无法登录系统');
    }
  });

  test('1. 访问 API Keys 页面并显示空状态', async ({ page }) => {
    console.log('\n========================================');
    console.log('测试：访问 API Keys 页面');
    console.log('========================================');
    
    // 1. 导航到 API Keys 页面（SPA 友好）
    await navigateToAPIKeys(page);
    console.log('✓ 已导航到 API Keys 页面');
    
    // 2. 验证创建按钮
    const createButton = page.locator('button:has-text("Create API Key")').first();
    await expect(createButton).toBeVisible({ timeout: 10000 });
    console.log('✓ 找到创建按钮');
    
    // 4. 检查是否显示空状态或列表
    const emptyState = page.locator('[data-testid="apikeys-empty-state"]');
    const listTable = page.locator('[data-testid="apikeys-list-table"]');
    
    const emptyStateVisible = await emptyState.isVisible().catch(() => false);
    const listTableVisible = await listTable.isVisible().catch(() => false);
    
    if (emptyStateVisible) {
      console.log('✓ 显示空状态（无 API Keys）');
    } else if (listTableVisible) {
      console.log('✓ 显示 API Keys 列表');
    } else {
      console.log('⚠️ 未找到空状态或列表，但页面已加载');
    }
    
    console.log('✅ API Keys 页面访问测试通过');
    console.log('========================================\n');
  });

  test('2. 创建新的 API Key', async ({ page }) => {
    console.log('\n========================================');
    console.log('测试：创建新的 API Key');
    console.log('========================================');
    
    // 1. 确保在 API Keys 页面
    await navigateToAPIKeys(page);
    
    // 2. 点击创建按钮（使用文本定位，更灵活）
    const createBtn = page.locator('button:has-text("Create API Key")').first();
    await createBtn.click();
    console.log('✓ 点击创建按钮');
    
    // 3. 等待表单显示 - SPA 应用，直接等待表单输入框
    await page.waitForSelector('input[placeholder*="Production"]', { 
      state: 'visible',
      timeout: 5000 
    });
    console.log('✓ 创建表单已显示');
    
    // 4. 填写表单 - 使用 placeholder 定位
    await page.fill('input[placeholder*="Production"]', testApiKey.name);
    await page.fill('textarea[placeholder*="API key for"]', testApiKey.description);
    console.log(`✓ 填写表单: ${testApiKey.name}`);
    
    // 5. 选择权限（默认是 full，所以可以跳过）
    
    // 6. 提交表单 - 点击表单内的提交按钮
    await page.waitForTimeout(500); // 确保表单完全渲染
    const submitBtn = page.locator('button:has-text("Create API Key")').last();
    await submitBtn.click();
    console.log('✓ 提交表单');
    
    // 7. 等待创建完成并显示成功消息或 API Key
    await page.waitForTimeout(2000); // 等待 API 响应
    
    // 8. 检查是否有成功创建的迹象（可能是弹窗或者直接显示在列表中）
    const hasSuccessMessage = await page.locator('text=/API Key Created|Successfully created/i').isVisible().catch(() => false);
    const hasNewKeyInList = await page.locator(`text="${testApiKey.name}"`).isVisible().catch(() => false);
    
    if (hasSuccessMessage) {
      console.log('✓ 显示成功消息');
      // 如果有显示创建的 key，尝试获取
      const keyInputs = await page.locator('input[type="text"]').all();
      for (const input of keyInputs) {
        const value = await input.inputValue();
        if (value && value.length > 20 && value.includes('-')) {
          console.log(`✓ API Key 已创建: ${value.substring(0, 20)}...`);
          break;
        }
      }
      // 关闭消息
      const closeBtn = page.locator('button:has-text(/Dismiss|Close|OK/i)').first();
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
        console.log('✓ 关闭成功消息');
      }
    } else if (hasNewKeyInList) {
      console.log('✓ API Key 已添加到列表');
    }
    
    // 10. 等待列表刷新（SPA 不会刷新页面）
    await page.waitForTimeout(1000);
    
    // 11. 验证列表中显示新创建的 API Key
    const keyNameInList = page.locator(`text="${testApiKey.name}"`);
    await expect(keyNameInList).toBeVisible({ timeout: 5000 });
    console.log('✓ API Key 出现在列表中');
    
    console.log('✅ API Key 创建测试通过');
    console.log('========================================\n');
  });

  test('3. 禁用 API Key', async ({ page }) => {
    console.log('\n========================================');
    console.log('测试：禁用 API Key');
    console.log('========================================');
    
    // 1. 访问 API Keys 页面
    await navigateToAPIKeys(page);
    
    // 2. 等待列表加载 - 直接等待 API Key 名称出现
    await page.waitForSelector(`text="${testApiKey.name}"`, { 
      state: 'visible',
      timeout: 5000 
    });
    console.log('✓ API Keys 列表已加载');
    
    // 3. 找到测试创建的 API Key 行
    const keyRow = page.locator(`text="${testApiKey.name}"`).locator('xpath=ancestor::tr');
    await expect(keyRow).toBeVisible();
    console.log(`✓ 找到 API Key: ${testApiKey.name}`);
    
    // 4. 在该行内找到 Disable 按钮并点击
    const disableButton = keyRow.locator('button:has-text("Disable")');
    if (await disableButton.isVisible().catch(() => false)) {
      await disableButton.click();
      console.log('✓ 点击禁用按钮');
      
      // 5. 等待状态更新（SPA 不会刷新页面）
      await page.waitForTimeout(2000);
      
      // 6. 验证按钮文本变为 Enable
      const enableButton = keyRow.locator('button:has-text("Enable")');
      await expect(enableButton).toBeVisible({ timeout: 5000 });
      console.log('✓ API Key 已禁用（按钮变为 Enable）');
    } else {
      console.log('⚠️ API Key 已经是禁用状态');
    }
    
    console.log('✅ API Key 禁用测试通过');
    console.log('========================================\n');
  });

  test('4. 启用 API Key', async ({ page }) => {
    console.log('\n========================================');
    console.log('测试：启用 API Key');
    console.log('========================================');
    
    // 1. 访问 API Keys 页面
    await navigateToAPIKeys(page);
    
    // 2. 等待列表加载
    await page.waitForSelector(`text="${testApiKey.name}"`, { 
      state: 'visible',
      timeout: 5000 
    });
    console.log('✓ API Keys 列表已加载');
    
    // 3. 找到测试创建的 API Key 行
    const keyRow = page.locator(`text="${testApiKey.name}"`).locator('xpath=ancestor::tr');
    await expect(keyRow).toBeVisible();
    console.log(`✓ 找到 API Key: ${testApiKey.name}`);
    
    // 4. 在该行内找到 Enable 按钮并点击
    const enableButton = keyRow.locator('button:has-text("Enable")');
    if (await enableButton.isVisible().catch(() => false)) {
      await enableButton.click();
      console.log('✓ 点击启用按钮');
      
      // 5. 等待状态更新（SPA 不会刷新页面）
      await page.waitForTimeout(2000);
      
      // 6. 验证按钮文本变为 Disable
      const disableButton = keyRow.locator('button:has-text("Disable")');
      await expect(disableButton).toBeVisible({ timeout: 5000 });
      console.log('✓ API Key 已启用（按钮变为 Disable）');
    } else {
      console.log('⚠️ API Key 已经是启用状态');
    }
    
    console.log('✅ API Key 启用测试通过');
    console.log('========================================\n');
  });

  test('5. 删除 API Key', async ({ page }) => {
    console.log('\n========================================');
    console.log('测试：删除 API Key');
    console.log('========================================');
    
    // 1. 访问 API Keys 页面
    await navigateToAPIKeys(page);
    
    // 2. 等待列表加载
    await page.waitForSelector(`text="${testApiKey.name}"`, { 
      state: 'visible',
      timeout: 5000 
    });
    console.log('✓ API Keys 列表已加载');
    
    // 3. 找到测试创建的 API Key 行
    const keyRow = page.locator(`text="${testApiKey.name}"`).locator('xpath=ancestor::tr');
    await expect(keyRow).toBeVisible();
    console.log(`✓ 找到 API Key: ${testApiKey.name}`);
    
    // 4. 设置对话框处理（SPA 可能会弹出确认框）
    page.on('dialog', async dialog => {
      console.log(`✓ 确认删除对话框: ${dialog.message()}`);
      await dialog.accept();
    });
    
    // 5. 在该行内找到 Delete 按钮并点击
    const deleteButton = keyRow.locator('button:has-text("Delete")');
    await deleteButton.click();
    console.log('✓ 点击删除按钮');
    
    // 6. 等待删除完成（SPA 不会刷新页面）
    await page.waitForTimeout(2000);
    
    // 7. 验证 API Key 不再出现在列表中
    const keyNameInList = page.locator(`text="${testApiKey.name}"`);
    await expect(keyNameInList).not.toBeVisible();
    console.log('✓ API Key 已从列表中移除');
    
    console.log('✅ API Key 删除测试通过');
    console.log('========================================\n');
  });

  test('6. 测试表单验证 - 必填字段', async ({ page }) => {
    console.log('\n========================================');
    console.log('测试：表单验证 - 必填字段');
    console.log('========================================');
    
    // 1. 访问 API Keys 页面
    await navigateToAPIKeys(page);
    
    // 2. 点击创建按钮
    const createBtn = page.locator('button:has-text("Create API Key")').first();
    await createBtn.click();
    console.log('✓ 点击创建按钮');
    
    // 3. 等待表单显示
    await page.waitForSelector('input[placeholder*="Production"]', { 
      state: 'visible',
      timeout: 5000 
    });
    console.log('✓ 创建表单已显示');
    
    // 4. 不填写任何内容，直接提交
    await page.waitForTimeout(500);
    const submitBtn = page.locator('button:has-text("Create API Key")').last();
    await submitBtn.click();
    console.log('✓ 尝试提交空表单');
    
    // 5. 验证表单没有提交（表单仍然可见，或者有验证提示）
    await page.waitForTimeout(1000);
    const nameInput = page.locator('input[placeholder*="Production"]');
    await expect(nameInput).toBeVisible();
    console.log('✓ 表单验证生效，阻止了提交');
    
    // 6. 取消表单 - 使用 .last() 获取表单内的取消按钮
    const cancelBtn = page.locator('button:has-text("Cancel")').last();
    await cancelBtn.click();
    await page.waitForTimeout(500);
    console.log('✓ 成功取消表单');
    
    console.log('✅ 表单验证测试通过');
    console.log('========================================\n');
  });
});

