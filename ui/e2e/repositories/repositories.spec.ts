import { test, expect } from '@playwright/test';
import { ensureAuthenticated } from '../utils/helpers';

test.describe.configure({ mode: 'serial' }); // 串行执行，确保测试顺序

test.describe('Repositories 管理测试', () => {
  // 测试用的 Repository 数据
  const testRepo = {
    name: 'Test Registry',
    registry: 'https://registry.example.com',
    authType: 'none' as const
  };

  const testRepoWithAuth = {
    name: 'Docker Hub Test',
    registry: 'https://index.docker.io/v1/',
    authType: 'username-password' as const,
    username: 'testuser',
    password: 'testpass123'
  };

  let createdRepoId: string | null = null;

  // 每个测试前确保已登录
  test.beforeEach(async ({ page }) => {
    const authenticated = await ensureAuthenticated(page);
    if (!authenticated) {
      throw new Error('认证失败：无法登录系统');
    }
  });

  test('1. 访问 Repositories 页面', async ({ page }) => {
    console.log('\n========================================');
    console.log('测试：访问 Repositories 页面');
    console.log('========================================');
    
    // 1. 导航到 Repositories 页面
    await page.goto('/repositories');
    await page.waitForTimeout(1000);
    
    // 2. 等待页面加载
    await page.waitForSelector('[data-testid="repositories-page"]', { 
      state: 'visible',
      timeout: 15000 
    });
    console.log('✓ Repositories 页面加载完成');
    
    // 3. 验证页面元素
    const createButton = page.locator('[data-testid="repositories-create-button"]');
    await expect(createButton).toBeVisible();
    console.log('✓ 找到创建按钮');
    
    console.log('✅ Repositories 页面访问测试通过');
    console.log('========================================\n');
  });

  test('2. 创建新的 Repository（无认证）', async ({ page }) => {
    console.log('\n========================================');
    console.log('测试：创建新的 Repository（无认证）');
    console.log('========================================');
    
    // 1. 访问 Repositories 页面
    await page.goto('/repositories');
    await page.waitForSelector('[data-testid="repositories-page"]', { state: 'visible' });
    
    // 2. 点击创建按钮
    await page.click('[data-testid="repositories-create-button"]');
    console.log('✓ 点击创建按钮');
    
    // 3. 等待表单显示
    await page.waitForSelector('[data-testid="repositories-form"]', { 
      state: 'visible',
      timeout: 5000 
    });
    console.log('✓ 创建表单已显示');
    
    // 4. 填写表单
    await page.fill('[data-testid="repositories-name-input"]', testRepo.name);
    await page.fill('[data-testid="repositories-registry-input"]', testRepo.registry);
    console.log(`✓ 填写表单: ${testRepo.name}`);
    
    // 5. 选择认证类型（默认是 none）
    // 无需操作，默认就是 none
    
    // 6. 提交表单
    await page.click('[data-testid="repositories-submit-button"]');
    console.log('✓ 提交表单');
    
    // 7. 等待表单关闭
    await page.waitForTimeout(2000);
    
    // 8. 验证列表中显示新创建的 Repository
    await page.waitForSelector('[data-testid="repositories-list-table"]', { 
      state: 'visible',
      timeout: 5000 
    });
    
    const repoNameInList = page.locator(`text="${testRepo.name}"`);
    await expect(repoNameInList).toBeVisible();
    console.log('✓ Repository 出现在列表中');
    
    // 9. 获取创建的 Repository ID
    const repoRow = page.locator(`text="${testRepo.name}"`).locator('xpath=ancestor::tr');
    const rowTestId = await repoRow.getAttribute('data-testid');
    if (rowTestId) {
      const match = rowTestId.match(/repositories-item-(\d+)/);
      if (match) {
        createdRepoId = match[1];
        console.log(`✓ Repository ID: ${createdRepoId}`);
      }
    }
    
    console.log('✅ Repository 创建测试通过');
    console.log('========================================\n');
  });

  test('3. 创建带认证的 Repository', async ({ page }) => {
    console.log('\n========================================');
    console.log('测试：创建带认证的 Repository');
    console.log('========================================');
    
    // 1. 访问 Repositories 页面
    await page.goto('/repositories');
    await page.waitForSelector('[data-testid="repositories-page"]', { state: 'visible' });
    
    // 2. 点击创建按钮
    await page.click('[data-testid="repositories-create-button"]');
    await page.waitForSelector('[data-testid="repositories-form"]', { state: 'visible' });
    
    // 3. 填写基本信息
    await page.fill('[data-testid="repositories-name-input"]', testRepoWithAuth.name);
    await page.fill('[data-testid="repositories-registry-input"]', testRepoWithAuth.registry);
    console.log(`✓ 填写基本信息: ${testRepoWithAuth.name}`);
    
    // 4. 选择认证类型
    await page.click('[data-testid="repositories-authtype-select"]');
    await page.waitForTimeout(500);
    await page.click('[data-testid="repositories-authtype-password"]');
    console.log('✓ 选择用户名密码认证');
    
    // 5. 等待认证字段显示
    await page.waitForSelector('[data-testid="repositories-username-input"]', { 
      state: 'visible',
      timeout: 2000 
    });
    
    // 6. 填写认证信息
    await page.fill('[data-testid="repositories-username-input"]', testRepoWithAuth.username);
    await page.fill('[data-testid="repositories-password-input"]', testRepoWithAuth.password);
    console.log('✓ 填写认证信息');
    
    // 7. 提交表单
    await page.click('[data-testid="repositories-submit-button"]');
    console.log('✓ 提交表单');
    
    // 8. 等待表单关闭
    await page.waitForTimeout(2000);
    
    // 9. 验证列表中显示新创建的 Repository
    const repoNameInList = page.locator(`text="${testRepoWithAuth.name}"`);
    await expect(repoNameInList).toBeVisible();
    console.log('✓ Repository 出现在列表中');
    
    console.log('✅ 带认证的 Repository 创建测试通过');
    console.log('========================================\n');
  });

  test('4. 编辑 Repository', async ({ page }) => {
    console.log('\n========================================');
    console.log('测试：编辑 Repository');
    console.log('========================================');
    
    // 1. 访问 Repositories 页面
    await page.goto('/repositories');
    await page.waitForSelector('[data-testid="repositories-page"]', { state: 'visible' });
    
    // 2. 等待列表加载
    await page.waitForSelector('[data-testid="repositories-list-table"]', { 
      state: 'visible',
      timeout: 5000 
    });
    
    // 3. 找到测试创建的 Repository
    if (!createdRepoId) {
      const repoRow = page.locator(`text="${testRepo.name}"`).locator('xpath=ancestor::tr');
      const rowTestId = await repoRow.getAttribute('data-testid');
      if (rowTestId) {
        const match = rowTestId.match(/repositories-item-(\d+)/);
        if (match) {
          createdRepoId = match[1];
        }
      }
    }
    
    if (!createdRepoId) {
      console.log('⚠️ 无法找到测试创建的 Repository');
      test.skip();
      return;
    }
    
    console.log(`✓ 找到 Repository: ${testRepo.name} (ID: ${createdRepoId})`);
    
    // 4. 点击编辑按钮
    const editButton = page.locator(`[data-testid="repositories-edit-button-${createdRepoId}"]`);
    await editButton.click();
    console.log('✓ 点击编辑按钮');
    
    // 5. 等待表单显示
    await page.waitForSelector('[data-testid="repositories-form"]', { 
      state: 'visible',
      timeout: 5000 
    });
    
    // 6. 修改名称
    const newName = testRepo.name + ' (Updated)';
    await page.fill('[data-testid="repositories-name-input"]', newName);
    console.log(`✓ 修改名称为: ${newName}`);
    
    // 7. 提交表单
    await page.click('[data-testid="repositories-submit-button"]');
    console.log('✓ 提交表单');
    
    // 8. 等待更新完成
    await page.waitForTimeout(2000);
    
    // 9. 验证名称已更新
    const updatedName = page.locator(`text="${newName}"`);
    await expect(updatedName).toBeVisible();
    console.log('✓ Repository 名称已更新');
    
    console.log('✅ Repository 编辑测试通过');
    console.log('========================================\n');
  });

  test('5. 设置为默认 Repository', async ({ page }) => {
    console.log('\n========================================');
    console.log('测试：设置为默认 Repository');
    console.log('========================================');
    
    // 1. 访问 Repositories 页面
    await page.goto('/repositories');
    await page.waitForSelector('[data-testid="repositories-page"]', { state: 'visible' });
    
    // 2. 等待列表加载
    await page.waitForSelector('[data-testid="repositories-list-table"]', { 
      state: 'visible',
      timeout: 5000 
    });
    
    // 3. 获取 Repository ID
    if (!createdRepoId) {
      const repoRow = page.locator(`text="${testRepo.name}"`).locator('xpath=ancestor::tr');
      const rowTestId = await repoRow.getAttribute('data-testid');
      if (rowTestId) {
        const match = rowTestId.match(/repositories-item-(\d+)/);
        if (match) {
          createdRepoId = match[1];
        }
      }
    }
    
    if (!createdRepoId) {
      console.log('⚠️ 无法找到测试创建的 Repository');
      test.skip();
      return;
    }
    
    // 4. 检查是否已经是默认
    const defaultBadge = page.locator(`[data-testid="repositories-default-badge-${createdRepoId}"]`);
    const isDefault = await defaultBadge.isVisible().catch(() => false);
    
    if (isDefault) {
      console.log('⚠️ Repository 已经是默认的');
    } else {
      // 5. 点击设为默认按钮
      const setDefaultButton = page.locator(`[data-testid="repositories-set-default-button-${createdRepoId}"]`);
      await setDefaultButton.click();
      console.log('✓ 点击设为默认按钮');
      
      // 6. 等待更新完成
      await page.waitForTimeout(2000);
      
      // 7. 验证已设为默认
      await expect(defaultBadge).toBeVisible();
      console.log('✓ Repository 已设为默认');
    }
    
    console.log('✅ 设置默认 Repository 测试通过');
    console.log('========================================\n');
  });

  test('6. 删除非默认 Repository', async ({ page }) => {
    console.log('\n========================================');
    console.log('测试：删除非默认 Repository');
    console.log('========================================');
    
    // 1. 访问 Repositories 页面
    await page.goto('/repositories');
    await page.waitForSelector('[data-testid="repositories-page"]', { state: 'visible' });
    
    // 2. 等待列表加载
    await page.waitForSelector('[data-testid="repositories-list-table"]', { 
      state: 'visible',
      timeout: 5000 
    });
    
    // 3. 找到带认证的 Repository（它不是默认的）
    const repoRow = page.locator(`text="${testRepoWithAuth.name}"`).locator('xpath=ancestor::tr');
    await expect(repoRow).toBeVisible();
    console.log(`✓ 找到 Repository: ${testRepoWithAuth.name}`);
    
    // 4. 获取 Repository ID
    const rowTestId = await repoRow.getAttribute('data-testid');
    let deleteRepoId: string | null = null;
    if (rowTestId) {
      const match = rowTestId.match(/repositories-item-(\d+)/);
      if (match) {
        deleteRepoId = match[1];
      }
    }
    
    if (!deleteRepoId) {
      console.log('⚠️ 无法获取 Repository ID');
      test.skip();
      return;
    }
    
    // 5. 设置对话框处理
    page.on('dialog', async dialog => {
      console.log(`✓ 确认删除对话框: ${dialog.message()}`);
      await dialog.accept();
    });
    
    // 6. 点击删除按钮
    const deleteButton = page.locator(`[data-testid="repositories-delete-button-${deleteRepoId}"]`);
    await deleteButton.click();
    console.log('✓ 点击删除按钮');
    
    // 7. 等待删除完成
    await page.waitForTimeout(2000);
    
    // 8. 验证 Repository 不再出现在列表中
    const repoNameInList = page.locator(`text="${testRepoWithAuth.name}"`);
    await expect(repoNameInList).not.toBeVisible();
    console.log('✓ Repository 已从列表中移除');
    
    console.log('✅ Repository 删除测试通过');
    console.log('========================================\n');
  });

  test('7. 测试表单验证 - 必填字段', async ({ page }) => {
    console.log('\n========================================');
    console.log('测试：表单验证 - 必填字段');
    console.log('========================================');
    
    // 1. 访问 Repositories 页面
    await page.goto('/repositories');
    await page.waitForSelector('[data-testid="repositories-page"]', { state: 'visible' });
    
    // 2. 点击创建按钮
    await page.click('[data-testid="repositories-create-button"]');
    await page.waitForSelector('[data-testid="repositories-form"]', { state: 'visible' });
    
    // 3. 不填写任何内容，直接提交
    await page.click('[data-testid="repositories-submit-button"]');
    console.log('✓ 尝试提交空表单');
    
    // 4. 验证表单没有提交（表单仍然可见）
    await page.waitForTimeout(1000);
    const form = page.locator('[data-testid="repositories-form"]');
    await expect(form).toBeVisible();
    console.log('✓ 表单验证生效，阻止了提交');
    
    // 5. 取消表单
    await page.click('[data-testid="repositories-cancel-button"]');
    await page.waitForTimeout(500);
    await expect(form).not.toBeVisible();
    console.log('✓ 成功取消表单');
    
    console.log('✅ 表单验证测试通过');
    console.log('========================================\n');
  });

  test('8. 测试认证类型切换', async ({ page }) => {
    console.log('\n========================================');
    console.log('测试：认证类型切换');
    console.log('========================================');
    
    // 1. 访问 Repositories 页面
    await page.goto('/repositories');
    await page.waitForSelector('[data-testid="repositories-page"]', { state: 'visible' });
    
    // 2. 点击创建按钮
    await page.click('[data-testid="repositories-create-button"]');
    await page.waitForSelector('[data-testid="repositories-form"]', { state: 'visible' });
    
    // 3. 填写基本信息
    await page.fill('[data-testid="repositories-name-input"]', 'Test Auth Switch');
    await page.fill('[data-testid="repositories-registry-input"]', 'https://test.com');
    
    // 4. 切换到用户名密码认证
    await page.click('[data-testid="repositories-authtype-select"]');
    await page.waitForTimeout(500);
    await page.click('[data-testid="repositories-authtype-password"]');
    console.log('✓ 切换到用户名密码认证');
    
    // 5. 验证认证字段显示
    await page.waitForSelector('[data-testid="repositories-username-input"]', { state: 'visible' });
    await page.waitForSelector('[data-testid="repositories-password-input"]', { state: 'visible' });
    console.log('✓ 用户名密码字段已显示');
    
    // 6. 切换到 Token 认证
    await page.click('[data-testid="repositories-authtype-select"]');
    await page.waitForTimeout(500);
    await page.click('[data-testid="repositories-authtype-token"]');
    console.log('✓ 切换到 Token 认证');
    
    // 7. 验证 Token 字段显示
    await page.waitForSelector('[data-testid="repositories-token-input"]', { state: 'visible' });
    console.log('✓ Token 字段已显示');
    
    // 8. 切换回无认证
    await page.click('[data-testid="repositories-authtype-select"]');
    await page.waitForTimeout(500);
    await page.click('[data-testid="repositories-authtype-none"]');
    console.log('✓ 切换回无认证');
    
    // 9. 取消表单
    await page.click('[data-testid="repositories-cancel-button"]');
    
    console.log('✅ 认证类型切换测试通过');
    console.log('========================================\n');
  });
});

