import { Page, expect } from '@playwright/test';

/**
 * 用户注册辅助函数
 */
export async function register(
  page: Page, 
  username: string = 'testuser',
  email: string = 'test@example.com',
  password: string = 'Test123456!'
) {
  await page.goto('/register');
  await page.fill('[name="username"]', username);
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', password);
  await page.fill('[name="confirmPassword"]', password);
  await page.click('button[type="submit"]');
  
  // 等待注册完成（可能跳转到登录页或显示成功消息）
  await page.waitForTimeout(2000);
}

/**
 * 用户登录辅助函数
 */
export async function login(
  page: Page,
  username = 'testuser',
  password = 'Test123456!'
) {
  await page.goto('/login');
  await page.fill('[name="username"]', username);
  await page.fill('[name="password"]', password);
  await page.click('button[type="submit"]');
  
  // 等待跳转到首页
  await page.waitForURL('/');
  
  // 验证登录成功
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  if (!token) {
    throw new Error('Login failed: No auth token found');
  }
}

/**
 * 用户登出辅助函数
 */
export async function logout(page: Page) {
  // 点击用户菜单
  await page.click('[data-testid="user-menu"]').catch(() => {
    // 如果找不到 testid，尝试其他选择器
    return page.click('text=admin').catch(() => {
      // 直接清除 token
      return page.evaluate(() => localStorage.clear());
    });
  });
  
  // 点击退出登录
  await page.click('text=退出登录').catch(() => {
    // 如果找不到，直接清除 token
    return page.evaluate(() => localStorage.clear());
  });
  
  // 等待跳转到登录页
  await page.waitForURL('/login').catch(() => {
    // 如果没有跳转，手动跳转
    return page.goto('/login');
  });
}

/**
 * 等待元素可见
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeout = 10000
) {
  await expect(page.locator(selector)).toBeVisible({ timeout });
}

/**
 * 等待加载完成
 */
export async function waitForLoading(page: Page) {
  // 等待加载指示器消失
  await page.waitForSelector('[data-loading="true"]', { state: 'hidden' }).catch(() => {
    // 如果没有加载指示器，就等待一小段时间
    return page.waitForTimeout(500);
  });
}

/**
 * 清理测试数据（仅用于测试环境）
 */
export async function cleanupTestData(page: Page) {
  // 清除 localStorage
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * 获取表格行
 */
export function getTableRow(page: Page, text: string) {
  return page.locator(`tr:has-text("${text}")`);
}

/**
 * 填写表单
 */
export async function fillForm(
  page: Page,
  fields: Record<string, string | number>
) {
  for (const [name, value] of Object.entries(fields)) {
    await page.fill(`[name="${name}"]`, String(value));
  }
}

/**
 * 提交表单并等待响应
 */
export async function submitForm(page: Page, buttonText = '提交') {
  await page.click(`button[type="submit"]:has-text("${buttonText}")`);
  await waitForLoading(page);
}

/**
 * 验证成功提示
 */
export async function expectSuccessMessage(
  page: Page,
  message: string = '成功'
) {
  await expect(page.locator(`text=${message}`)).toBeVisible({ timeout: 5000 });
}

/**
 * 验证错误提示
 */
export async function expectErrorMessage(
  page: Page,
  message: string = '失败'
) {
  await expect(page.locator(`text=${message}`)).toBeVisible({ timeout: 5000 });
}

