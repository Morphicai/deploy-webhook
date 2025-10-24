import { Page, expect } from '@playwright/test';

/**
 * 测试用户信息（系统只支持单用户）
 */
export const TEST_USER = {
  email: 'admin@example.com',
  password: 'Admin123456!'
};

/**
 * 统一的认证函数：处理首次注册和登录
 * 
 * 这个函数会智能处理：
 * 1. 如果是首次运行（数据库为空），先注册用户
 * 2. 如果注册后已自动登录，则无需再登录
 * 3. 否则执行登录
 * 4. 验证 token
 * 
 * @param page Playwright Page 对象
 * @returns 是否认证成功
 */
export async function ensureAuthenticated(page: Page): Promise<boolean> {
  console.log('\n========================================');
  console.log('🔐 确保用户已认证');
  console.log('========================================');

  // 清理本地存储
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // 尝试注册（如果是首次使用）
  const registeredWithAutoLogin = await tryRegisterIfNeeded(page);

  // 检查是否已经有 token（注册后自动登录）
  let token = await page.evaluate(() => localStorage.getItem('auth_token'));
  
  if (token && registeredWithAutoLogin) {
    console.log('✅ 用户认证成功（注册后自动登录）');
    console.log('========================================\n');
    return true;
  }

  // 如果没有 token，执行登录
  const loginSuccess = await loginUser(page);

  if (loginSuccess) {
    console.log('✅ 用户认证成功');
    console.log('========================================\n');
  } else {
    console.log('❌ 用户认证失败');
    console.log('========================================\n');
  }

  return loginSuccess;
}

/**
 * 尝试注册用户（如果系统是首次使用）
 * @returns 是否注册成功并自动登录
 */
async function tryRegisterIfNeeded(page: Page): Promise<boolean> {
  try {
    console.log('📝 检查是否需要注册...');
    
    await page.goto('/register');
    await page.waitForTimeout(1000);

    // 检查是否在注册页面
    const registerForm = page.locator('[data-testid="register-form"]');
    const formVisible = await registerForm.isVisible().catch(() => false);

    if (!formVisible) {
      console.log('ℹ️  已跳转，系统可能已有用户');
      return false;
    }

    console.log('📝 正在注册新用户...');
    
    // 填写注册信息
    await page.fill('[data-testid="register-email-input"]', TEST_USER.email);
    await page.fill('[data-testid="register-password-input"]', TEST_USER.password);
    await page.fill('[data-testid="register-confirm-password-input"]', TEST_USER.password);
    
    // 提交注册
    await page.click('[data-testid="register-submit-button"]');
    await page.waitForTimeout(2000);

    // 检查注册结果
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    const currentUrl = page.url();

    if (token) {
      console.log('✅ 注册成功并自动登录');
      return true; // 注册成功且已自动登录
    } else if (!currentUrl.includes('/register')) {
      console.log('✅ 注册成功已跳转');
      return false; // 注册成功但需要手动登录
    } else {
      // 检查错误消息
      const errorMsg = page.locator('[data-testid="register-error-message"]');
      const hasError = await errorMsg.isVisible().catch(() => false);
      
      if (hasError) {
        const errorText = await errorMsg.textContent();
        if (errorText && (errorText.includes('exist') || errorText.includes('已存在'))) {
          console.log('ℹ️  用户已存在，将直接登录');
        } else {
          console.log(`⚠️  注册返回错误: ${errorText}`);
        }
      }
      return false;
    }
  } catch (error) {
    console.log('ℹ️  注册过程出现异常（可能用户已存在）');
    return false;
  }
}

/**
 * 登录用户
 */
async function loginUser(page: Page): Promise<boolean> {
  try {
    console.log('🔑 正在登录用户...');
    
    await page.goto('/login');
    
    // 等待登录表单加载
    await page.waitForSelector('[data-testid="login-form"]', { 
      state: 'visible',
      timeout: 15000 
    });

    // 填写登录信息
    await page.fill('[data-testid="login-email-input"]', TEST_USER.email);
    await page.fill('[data-testid="login-password-input"]', TEST_USER.password);
    
    // 提交登录
    await page.click('[data-testid="login-submit-button"]');
    await page.waitForTimeout(2000);

    // 验证登录成功
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    const currentUrl = page.url();

    if (token) {
      console.log('✅ 登录成功（已获取 token）');
      return true;
    } else {
      // 检查错误消息
      const errorMsg = page.locator('[data-testid="login-error-message"]');
      const hasError = await errorMsg.isVisible().catch(() => false);
      
      if (hasError) {
        const errorText = await errorMsg.textContent();
        console.log(`❌ 登录失败: ${errorText}`);
      } else {
        console.log('❌ 登录失败：无 token 且无错误消息');
      }
      return false;
    }
  } catch (error) {
    console.log('❌ 登录过程出现错误:', (error as Error).message);
    return false;
  }
}

/**
 * 等待页面DOM稳定（React渲染完成）
 */
export async function waitForPageReady(page: Page, testId: string, timeout: number = 15000) {
  await page.waitForSelector(`[data-testid="${testId}"]`, { 
    state: 'visible',
    timeout 
  });
  // 额外等待一小段时间确保所有异步操作完成
  await page.waitForTimeout(500);
}

/**
 * 用户注册辅助函数
 * 
 * 注意：当前 UI 只有 email 字段，没有 username 字段
 * username 参数暂时保留以保持接口兼容性
 */
export async function register(
  page: Page, 
  username: string = 'testuser',  // 保留参数但不使用
  email: string = 'test@example.com',
  password: string = 'Test123456!'
) {
  await page.goto('/register');
  
  // 等待 React 渲染完成 - 等待表单出现
  await page.waitForSelector('[data-testid="register-form"]', { 
    state: 'visible',
    timeout: 15000 
  });
  
  // 等待输入框可交互
  await page.waitForSelector('[data-testid="register-email-input"]', { 
    state: 'visible',
    timeout: 10000 
  });
  
  // 使用 data-testid 选择器（更稳定）
  await page.fill('[data-testid="register-email-input"]', email);
  await page.fill('[data-testid="register-password-input"]', password);
  await page.fill('[data-testid="register-confirm-password-input"]', password);
  await page.click('[data-testid="register-submit-button"]');
  
  // 等待注册完成（可能跳转到首页或登录页）
  await page.waitForTimeout(2000);
}

/**
 * 用户登录辅助函数
 * 
 * 注意：当前 UI 使用 email 登录，不是 username
 * username 参数被当作 email 使用
 */
export async function login(
  page: Page,
  username = 'test@example.com',  // 实际上是 email
  password = 'Test123456!'
) {
  await page.goto('/login');
  
  // 等待 React 渲染完成 - 等待表单出现
  await page.waitForSelector('[data-testid="login-form"]', { 
    state: 'visible',
    timeout: 15000 
  });
  
  // 等待输入框可交互
  await page.waitForSelector('[data-testid="login-email-input"]', { 
    state: 'visible',
    timeout: 10000 
  });
  
  // 使用 data-testid 选择器（更稳定）
  await page.fill('[data-testid="login-email-input"]', username);
  await page.fill('[data-testid="login-password-input"]', password);
  await page.click('[data-testid="login-submit-button"]');
  
  // 等待跳转到首页
  await page.waitForURL('/', { timeout: 10000 });
  
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
  try {
    // 先导航到应用页面（避免 about:blank 的 localStorage 访问错误）
    await page.goto('/');
    
    // 清除 localStorage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  } catch (error) {
    // 如果清理失败，忽略错误（可能是第一次运行）
    console.log('[cleanupTestData] Warning:', error);
  }
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

