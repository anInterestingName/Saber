import { test, expect } from './fixtures';
import { mockLoginApi } from './mocks/login';
import { AUTH_CSRF, AUTH_CSRF_RENEWED, MOCK_PASSWORD } from './support/constants';
import { interceptNativeForm } from './support/forms';

test.describe('TC-001 登录与上下文恢复', () => {
  test('待授权上下文显示登录表单、隐藏 AUTH CSRF 和注册入口', async ({ page }) => {
    await mockLoginApi(page);
    await page.goto('/auth/login');
    await expect(page.locator('h1')).toHaveText('登录星图');
    await expect(page.locator('input[autocomplete="username"]')).toBeVisible();
    await expect(page.locator('input[autocomplete="current-password"]')).toBeVisible();
    const csrf = page.locator('input[name="_csrf"]');
    await expect(csrf).toHaveAttribute('type', 'hidden');
    expect((await csrf.inputValue()) === AUTH_CSRF).toBe(true);
    await expect(page.getByRole('button', { name: '注册账号', exact: true })).toBeVisible();
  });

  test('无待授权上下文及 BFF 会话时自动发起一次 BFF 导航', async ({ page }) => {
    await mockLoginApi(page, { authorizationPending: false });
    await page.route('**/bff/me', route =>
      route.fulfill({ status: 401, json: { code: 40101, success: false, data: null } })
    );
    const requests = await interceptNativeForm(page, '/oauth2/authorization/blade');
    await page.goto('/auth/login');
    await expect(page).toHaveURL(/\/oauth2\/authorization\/blade$/);
    await expect(page.locator('h1')).toHaveText('已收到测试提交');
    expect(requests.length).toBe(1);
    expect(requests[0].method).toBe('GET');
    expect(requests[0].credentialHeaders).toEqual([]);
  });

  test('registered=1 只展示注册完成提示', async ({ page }) => {
    await mockLoginApi(page);
    await page.goto('/auth/login?registered=1');
    await expect(page.getByText('注册成功，请登录', { exact: true })).toBeVisible();
  });

  test('键盘提交原生 POST，使用提交前重新取得的 AUTH CSRF 和默认租户', async ({ page }) => {
    const state = await mockLoginApi(page, {
      defaultTenantId: '100001',
      csrfTokens: [AUTH_CSRF, AUTH_CSRF_RENEWED],
    });
    const requests = await interceptNativeForm(page, '/auth-api/login');
    await page.goto('/auth/login');
    const username = page.locator('input[autocomplete="username"]');
    const password = page.locator('input[autocomplete="current-password"]');
    await username.fill('auth-fe-login');
    await password.fill(MOCK_PASSWORD);
    await username.focus();
    await page.keyboard.press('Tab');
    await expect(password).toBeFocused();
    await password.press('Enter');
    await expect(page.locator('h1')).toHaveText('已收到测试提交');
    expect(state.contextRequests).toBe(2);
    expect(requests.length).toBe(1);
    const request = requests[0];
    expect(request.method).toBe('POST');
    expect(request.contentType).toContain('application/x-www-form-urlencoded');
    expect([...request.params.keys()].sort()).toEqual([
      '_csrf',
      'password',
      'tenantId',
      'username',
    ]);
    expect(request.params.get('tenantId')).toBe('100001');
    expect(request.params.get('username')).toBe('auth-fe-login');
    expect(request.params.get('password') === MOCK_PASSWORD).toBe(true);
    expect(request.params.get('_csrf') === AUTH_CSRF_RENEWED).toBe(true);
    expect(request.queryEmpty).toBe(true);
    expect(request.credentialHeaders).toEqual([]);
  });

  test('刷新登录页面清空密码、重取上下文且不重复提交', async ({ page }) => {
    const state = await mockLoginApi(page);
    const requests = await interceptNativeForm(page, '/auth-api/login');
    await page.goto('/auth/login');
    await page.locator('input[autocomplete="current-password"]').fill(MOCK_PASSWORD);
    await page.reload();
    await expect(page.locator('input[autocomplete="current-password"]')).toHaveValue('');
    expect(state.contextRequests).toBe(2);
    expect(requests.length).toBe(0);
  });

  test('提交前上下文获取失败时不发送密码，清空密码并释放提交锁', async ({ page }) => {
    await mockLoginApi(page);
    const requests = await interceptNativeForm(page, '/auth-api/login');
    await page.goto('/auth/login');
    await page.locator('input[autocomplete="username"]').fill('auth-fe-login');
    await page.locator('input[autocomplete="current-password"]').fill(MOCK_PASSWORD);
    await page.route('**/auth-api/ui/login-context', route =>
      route.fulfill({ status: 503, json: { code: 503, success: false, msg: '服务不可用' } })
    );
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await expect(page.locator('.el-alert--error')).toContainText('登录服务暂时不可用');
    await expect(page.locator('input[autocomplete="current-password"]')).toHaveValue('');
    await expect(page.getByRole('button', { name: '登录', exact: true })).toBeEnabled();
    expect(requests.length).toBe(0);
    await expect(page).toHaveURL(/\/auth\/login$/);
  });

  test('无效上下文重复回跳停止自动登录，用户主动才再次发起', async ({ page }) => {
    await mockLoginApi(page, { authorizationPending: false });
    await page.route('**/bff/me', route =>
      route.fulfill({ status: 401, json: { code: 40101, success: false, data: null } })
    );
    let navigations = 0;
    await page.route('**/oauth2/authorization/blade', route => {
      navigations += 1;
      return route.fulfill({ status: 302, headers: { Location: '/auth/login' }, body: '' });
    });
    await page.goto('/auth/login');
    await expect(page.locator('h1')).toHaveText('登录未完成');
    expect(navigations).toBe(1);
    await page.getByRole('button', { name: '重新登录', exact: true }).click();
    await expect.poll(() => navigations).toBe(2);
    await expect(page.locator('h1')).toHaveText('登录未完成');
  });

  test('已退出页面保持停留，点击重新登录才发起导航', async ({ page }) => {
    const state = await mockLoginApi(page, { authorizationPending: false });
    const requests = await interceptNativeForm(page, '/oauth2/authorization/blade');
    await page.goto('/auth/login?reason=logout');
    await expect(page.locator('h1')).toHaveText('已退出星图');
    expect(requests.length).toBe(0);
    expect(state.contextRequests).toBe(0);
    await page.getByRole('button', { name: '重新登录', exact: true }).click();
    await expect(page).toHaveURL(/\/oauth2\/authorization\/blade$/);
    expect(requests.length).toBe(1);
  });
});
