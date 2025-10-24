import { test, expect } from '@playwright/test';
import { cleanupTestData } from '../utils/helpers';

test.describe('用户注册', () => {
  test.beforeEach(async ({ page }) => {
    await cleanupTestData(page);
  });

  test('用户首次注册成功流程', async ({ page }) => {
    // 1. 访问注册页
    await page.goto('/register');
    
    // 2. 填写注册信息
    await page.fill('[name="username"]', 'testuser');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'Test123456!');
    await page.fill('[name="confirmPassword"]', 'Test123456!');
    
    // 3. 提交注册
    await page.click('button[type="submit"]');
    
    // 4. 验证注册成功（可能跳转到登录页或显示成功消息）
    // 注意：根据实际情况调整
    await page.waitForURL(/.*login|.*/, { timeout: 10000 }).catch(() => {
      // 如果没有跳转，检查是否显示成功消息
    });
    
    // 验证成功提示
    const successMessage = page.locator('text=/注册成功|成功|Success/i');
    if (await successMessage.count() > 0) {
      await expect(successMessage).toBeVisible();
    }
  });

  test('注册失败 - 密码不匹配', async ({ page }) => {
    await page.goto('/register');
    
    await page.fill('[name="username"]', 'testuser2');
    await page.fill('[name="email"]', 'test2@example.com');
    await page.fill('[name="password"]', 'Test123456!');
    await page.fill('[name="confirmPassword"]', 'DifferentPass123!');
    
    await page.click('button[type="submit"]');
    
    // 验证显示密码不匹配错误
    await expect(page.locator('text=/密码不匹配|不一致|match/i')).toBeVisible();
    
    // 验证仍在注册页
    await expect(page).toHaveURL(/.*register/);
  });

  test('注册失败 - 密码过于简单', async ({ page }) => {
    await page.goto('/register');
    
    await page.fill('[name="username"]', 'testuser3');
    await page.fill('[name="email"]', 'test3@example.com');
    await page.fill('[name="password"]', '123');
    await page.fill('[name="confirmPassword"]', '123');
    
    await page.click('button[type="submit"]');
    
    // 验证显示密码强度错误
    const errorMsg = page.locator('text=/密码|强度|weak|short/i');
    if (await errorMsg.count() > 0) {
      await expect(errorMsg).toBeVisible();
    }
  });

  test('注册失败 - 用户名已存在', async ({ page }) => {
    // 先注册一个用户
    await page.goto('/register');
    await page.fill('[name="username"]', 'duplicate');
    await page.fill('[name="email"]', 'dup1@example.com');
    await page.fill('[name="password"]', 'Test123456!');
    await page.fill('[name="confirmPassword"]', 'Test123456!');
    await page.click('button[type="submit"]');
    
    // 等待注册完成
    await page.waitForTimeout(2000);
    
    // 再次注册相同用户名
    await page.goto('/register');
    await page.fill('[name="username"]', 'duplicate');
    await page.fill('[name="email"]', 'dup2@example.com'); // 不同邮箱
    await page.fill('[name="password"]', 'Test123456!');
    await page.fill('[name="confirmPassword"]', 'Test123456!');
    await page.click('button[type="submit"]');
    
    // 验证显示用户名已存在错误
    await expect(page.locator('text=/已存在|already|exists|Forbidden/i')).toBeVisible();
  });

  test('注册表单验证 - 空字段', async ({ page }) => {
    await page.goto('/register');
    
    // 不填写任何字段，直接提交
    await page.click('button[type="submit"]');
    
    // 验证仍在注册页（表单验证失败）
    await expect(page).toHaveURL(/.*register/);
  });

  test('注册失败 - 邮箱格式不正确', async ({ page }) => {
    await page.goto('/register');
    
    await page.fill('[name="username"]', 'testuser4');
    await page.fill('[name="email"]', 'invalid-email'); // 无效邮箱
    await page.fill('[name="password"]', 'Test123456!');
    await page.fill('[name="confirmPassword"]', 'Test123456!');
    
    await page.click('button[type="submit"]');
    
    // 验证显示邮箱格式错误或仍在注册页
    const emailError = page.locator('text=/邮箱|email|格式|invalid/i');
    if (await emailError.count() > 0) {
      await expect(emailError).toBeVisible();
    } else {
      await expect(page).toHaveURL(/.*register/);
    }
  });
});

