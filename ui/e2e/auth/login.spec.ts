import { test, expect } from '@playwright/test';
import { register, login, logout, cleanupTestData } from '../utils/helpers';

test.describe('用户登录', () => {
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'Test123456!'
  };

  test.beforeEach(async ({ page }) => {
    await cleanupTestData(page);
    // 先注册一个测试用户
    await register(page, testUser.username, testUser.email, testUser.password);
  });

  test('用户登录成功流程', async ({ page }) => {
    // 1. 访问登录页
    await page.goto('/login');
    
    // 2. 填写登录信息
    await page.fill('[name="username"]', testUser.username);
    await page.fill('[name="password"]', testUser.password);
    
    // 3. 提交登录
    await page.click('button[type="submit"]');
    
    // 4. 验证跳转到首页
    await expect(page).toHaveURL('/');
    
    // 5. 验证 localStorage 存储了 token
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeTruthy();
    expect(token).not.toBe('');
    
    // 6. 验证页面显示用户信息
    await expect(page.locator(`text=${testUser.username}`)).toBeVisible();
  });

  test('登录失败 - 错误的用户名密码', async ({ page }) => {
    await page.goto('/login');
    
    // 填写错误的凭证
    await page.fill('[name="username"]', 'wronguser');
    await page.fill('[name="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    
    // 验证显示错误信息
    await expect(page.locator('text=/用户名或密码|Invalid|错误/i')).toBeVisible();
    
    // 验证仍在登录页
    await expect(page).toHaveURL(/.*login/);
    
    // 验证没有 token
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeNull();
  });

  test('登录表单验证 - 空用户名', async ({ page }) => {
    await page.goto('/login');
    
    // 只填写密码
    await page.fill('[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    
    // 验证仍在登录页（表单验证失败）
    await expect(page).toHaveURL(/.*login/);
  });

  test('登录表单验证 - 空密码', async ({ page }) => {
    await page.goto('/login');
    
    // 只填写用户名
    await page.fill('[name="username"]', testUser.username);
    await page.click('button[type="submit"]');
    
    // 验证仍在登录页（表单验证失败）
    await expect(page).toHaveURL(/.*login/);
  });

  test('记住我功能', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[name="username"]', testUser.username);
    await page.fill('[name="password"]', testUser.password);
    
    // 勾选"记住我"（如果存在）
    const rememberMeCheckbox = page.locator('[name="rememberMe"]');
    if (await rememberMeCheckbox.count() > 0) {
      await rememberMeCheckbox.check();
    }
    
    await page.click('button[type="submit"]');
    
    // 验证登录成功
    await expect(page).toHaveURL('/');
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeTruthy();
  });

  test('登出功能', async ({ page }) => {
    // 先登录
    await login(page, testUser.username, testUser.password);
    
    // 验证已登录
    await expect(page).toHaveURL('/');
    
    // 登出
    await logout(page);
    
    // 验证跳转到登录页
    await expect(page).toHaveURL(/.*login/);
    
    // 验证 token 已清除
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeNull();
  });

  test('自动跳转 - 已登录用户访问登录页', async ({ page }) => {
    // 先登录
    await login(page, testUser.username, testUser.password);
    
    // 再次访问登录页
    await page.goto('/login');
    
    // 应该自动跳转到首页
    await expect(page).toHaveURL('/');
  });

  test('未登录访问受保护页面 - 自动跳转到登录页', async ({ page }) => {
    // 清除所有认证信息
    await cleanupTestData(page);
    
    // 尝试直接访问受保护的页面（如环境变量页）
    await page.goto('/environment');
    
    // 应该被重定向到登录页
    await expect(page).toHaveURL(/.*login/);
  });
});
