import type { BrowserContext, Page } from '@playwright/test';
import type { AuthResponse, BffSession, CsrfContext, UserProfile } from '../src/types/auth';
import { test, expect } from './fixtures';

const username = process.env.E2E_USERNAME || '';
const password = process.env.E2E_PASSWORD || '';
const legacyKeys = [
  'saber-token',
  'saber-refreshToken',
  'saber-userInfo',
  'saber-permission',
  'saber-menu',
];

const getCsrf = async (context: BrowserContext) => {
  const response = await context.request.get('/bff/csrf');
  expect(response.status()).toBe(200);
  const body = (await response.json()) as AuthResponse<CsrfContext>;
  expect(body.code).toBe(200);
  expect(body.success).toBe(true);
  expect(body.data.headerName).toBe('X-BFF-XSRF-TOKEN');
  expect(typeof body.data.token === 'string' && body.data.token.length > 0).toBe(true);
  return body.data;
};

const cleanupSession = async (context: BrowserContext) => {
  const session = await context.request.get('/bff/me');
  if (session.status() === 401) return;
  expect(session.status(), '仅清理本用例建立的有效 BFF 会话').toBe(200);
  const csrf = await getCsrf(context);
  const response = await context.request.post('/bff/logout', {
    headers: { [csrf.headerName]: csrf.token },
  });
  expect(response.status(), '测试结束后注销本用例会话').toBe(200);
  expect((await context.request.get('/bff/me')).status()).toBe(401);
};

const login = async (page: Page) => {
  // 比较前端实际收到的 CSRF；不同 GET 响应的掩码值可能不同，不能直接相等比较。
  const csrfResponsePromise = page
    .waitForResponse(
      response => new URL(response.url()).pathname === '/bff/csrf' && response.status() === 200
    )
    .catch(() => null);
  const authorizationRequests: Array<{ hasState: boolean; hasS256: boolean }> = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname === '/oauth2/authorize' && request.method() === 'GET') {
      authorizationRequests.push({
        hasState: !!url.searchParams.get('state'),
        hasS256:
          url.searchParams.get('code_challenge_method') === 'S256' &&
          !!url.searchParams.get('code_challenge'),
      });
    }
  });
  await page.goto('/');
  await expect(page).toHaveURL(/\/auth\/login(?:\?.*)?$/);
  await expect(page.locator('h1')).toHaveText('登录星图');
  await page.locator('input[autocomplete="username"]').fill(username);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  if (process.env.E2E_TENANT_ID) {
    await page.locator('input[autocomplete="organization"]').fill(process.env.E2E_TENANT_ID);
  }
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL(url => ['/auth/consent', '/wel/index'].includes(url.pathname));
  if (new URL(page.url()).pathname === '/auth/consent') {
    await page.getByRole('button', { name: '授权并登录', exact: true }).click();
  }
  await expect(page).toHaveURL(/\/wel\/index$/);
  await expect(page.locator('.nav-user-actions__account').first()).toBeVisible();
  expect(authorizationRequests.length).toBeGreaterThan(0);
  expect(authorizationRequests.every(request => request.hasState && request.hasS256)).toBe(true);
  const csrfResponse = await csrfResponsePromise;
  if (!csrfResponse) throw new Error('前端未成功取得 BFF CSRF');
  const csrfBody = (await csrfResponse.json()) as AuthResponse<CsrfContext>;
  expect(csrfBody.code).toBe(200);
  expect(csrfBody.success).toBe(true);
  expect(csrfBody.data.headerName).toBe('X-BFF-XSRF-TOKEN');
  expect(typeof csrfBody.data.token === 'string' && !!csrfBody.data.token).toBe(true);
  return csrfBody.data;
};

test.describe('真实后端认证回归（独立测试会话）', () => {
  test.setTimeout(60000);
  test.beforeAll(() => {
    if (!username || !password)
      throw new Error('真实后端测试需要环境注入 E2E_USERNAME/E2E_PASSWORD');
  });
  test.afterEach(async ({ context }) => cleanupSession(context));

  test('受保护入口完成 PKCE 登录、当前身份与菜单初始化、HttpOnly 及旧缓存清理', async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    await context.addCookies(
      ['saber3-access-token', 'saber3-refresh-token'].map(name => ({
        name,
        value: 'legacy-test-fixture',
        url: baseURL!,
      }))
    );
    await context.addInitScript(keys => {
      if (sessionStorage.getItem('e2e-seeded')) return;
      for (const key of keys) {
        localStorage.setItem(key, 'legacy-test-fixture');
        sessionStorage.setItem(key, 'legacy-test-fixture');
      }
      localStorage.setItem('e2e-unrelated', 'keep');
      sessionStorage.setItem('e2e-seeded', '1');
    }, legacyKeys);
    const forbiddenHeaders: string[] = [];
    const initializedPaths: string[] = [];
    page.on('request', request => {
      if (!new URL(request.url()).pathname.startsWith('/api/')) return;
      for (const key of Object.keys(request.headers())) {
        if (
          ['authorization', 'blade-auth', 'x-user-id', 'x-tenant-id', 'x-user-roles'].includes(key)
        ) {
          forbiddenHeaders.push(key);
        }
      }
    });
    page.on('response', response => {
      if (response.status() === 200) initializedPaths.push(new URL(response.url()).pathname);
    });
    await login(page);
    const menu = page.locator('.saber-menu').getByRole('menubar');
    await expect(menu).toBeVisible();
    await expect(menu).toContainText('工作台');
    await expect(menu).toContainText('系统管理');
    expect(initializedPaths).toEqual(
      expect.arrayContaining([
        '/api/blade-system/user/info',
        '/api/blade-system/menu/routes',
        '/api/blade-system/menu/buttons',
      ])
    );
    expect(forbiddenHeaders).toEqual([]);
    const me = await context.request.get('/bff/me');
    expect(me.status()).toBe(200);
    const session = (await me.json()) as AuthResponse<BffSession>;
    expect(session.success).toBe(true);
    expect(typeof session.data.subject === 'string' && !!session.data.subject).toBe(true);
    const profileResponse = await context.request.get('/api/blade-system/user/info');
    expect(profileResponse.status()).toBe(200);
    const profile = (await profileResponse.json()) as AuthResponse<UserProfile>;
    expect(profile.success).toBe(true);
    expect(profile.data.account === username).toBe(true);
    expect(profile.data.id === session.data.subject).toBe(true);
    const rolesIsArray = Array.isArray(profile.data.roles);
    const hasAdmin =
      rolesIsArray && profile.data.roles.some(role => role === 'administrator' || role === 'admin');
    await testInfo.attach('角色契约诊断（不含身份与凭据值）', {
      body: Buffer.from(
        JSON.stringify(
          {
            accountMatchesFixture: profile.data.account === username,
            subjectMatchesProfile: profile.data.id === session.data.subject,
            rolesIsArray,
            roleCount: rolesIsArray ? profile.data.roles.length : 0,
            administratorPresent: rolesIsArray && profile.data.roles.includes('administrator'),
            adminPresent: rolesIsArray && profile.data.roles.includes('admin'),
            expectedAdminPresent: hasAdmin,
          },
          null,
          2
        )
      ),
      contentType: 'application/json',
    });
    // 角色不匹配时保留失败，同时取得 Cookie 和旧缓存清理的独立证据。
    expect.soft(hasAdmin, '管理员资料应返回约定的管理员角色编码').toBe(true);
    if (process.env.E2E_TENANT_ID)
      expect(profile.data.tenantId === process.env.E2E_TENANT_ID).toBe(true);
    const cookies = await context.cookies(baseURL);
    const sessions = cookies.filter(cookie => cookie.name === 'BFF_SESSION');
    expect(sessions.length).toBe(1);
    expect(sessions[0].httpOnly).toBe(true);
    expect(sessions[0].sameSite).toBe('Lax');
    expect(sessions[0].path).toBe('/');
    if (baseURL?.startsWith('https:')) expect(sessions[0].secure).toBe(true);
    expect(cookies.map(cookie => cookie.name)).not.toEqual(
      expect.arrayContaining(['saber3-access-token'])
    );
    expect(cookies.map(cookie => cookie.name)).not.toEqual(
      expect.arrayContaining(['saber3-refresh-token'])
    );
    const storage = await page.evaluate(
      keys => ({
        legacyPresent: keys.some(
          key => localStorage.getItem(key) !== null || sessionStorage.getItem(key) !== null
        ),
        unrelated: localStorage.getItem('e2e-unrelated'),
      }),
      legacyKeys
    );
    expect(storage.legacyPresent).toBe(false);
    expect(storage.unrelated).toBe('keep');
    const dataKeys = [...Object.keys(session.data), ...Object.keys(profile.data)];
    expect(
      dataKeys.some(key => /^(access_?token|refresh_?token|client_?secret|password)$/i.test(key))
    ).toBe(false);
  });

  test('确认退出只发送一次 Cookie+CSRF POST，当前会话和资源返回401，另一会话保持有效', async ({
    page,
    context,
    browser,
    baseURL,
  }) => {
    const csrf = await login(page);
    const otherContext = await browser.newContext({ baseURL, serviceWorkers: 'block' });
    try {
      const otherPage = await otherContext.newPage();
      await login(otherPage);
      let logoutRequests = 0;
      let csrfValid = false;
      let cookiePresent = false;
      let forbiddenHeaderPresent = false;
      page.on('request', request => {
        if (new URL(request.url()).pathname !== '/bff/logout') return;
        logoutRequests++;
        const headers = request.headers();
        csrfValid = headers[csrf.headerName.toLowerCase()] === csrf.token;
        forbiddenHeaderPresent = ['authorization', 'blade-auth'].some(key => key in headers);
      });
      const responsePromise = page.waitForResponse(
        response =>
          new URL(response.url()).pathname === '/bff/logout' &&
          response.request().method() === 'POST'
      );
      await page.locator('.nav-user-actions__account').first().hover();
      await page
        .locator('.el-dropdown-menu:visible')
        .getByText('退出登录', { exact: true })
        .click();
      const dialog = page.locator('.el-message-box');
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: '确定', exact: true }).click();
      const response = await responsePromise;
      const allHeaders = await response.request().allHeaders();
      cookiePresent = (allHeaders.cookie || '').includes('BFF_SESSION=');
      expect(response.status()).toBe(200);
      const result = (await response.json()) as AuthResponse<null>;
      expect(result.code).toBe(200);
      expect(result.success).toBe(true);
      expect(logoutRequests).toBe(1);
      expect(csrfValid).toBe(true);
      expect(cookiePresent).toBe(true);
      expect(forbiddenHeaderPresent).toBe(false);
      await expect(page).toHaveURL(/\/auth\/login$/);
      await expect(page.locator('.nav-user-actions__account')).toHaveCount(0);
      const me = await context.request.get('/bff/me');
      expect(me.status()).toBe(401);
      const anonymous = (await me.json()) as AuthResponse<null>;
      expect(anonymous.code).toBe(40101);
      expect((await context.request.get('/api/blade-system/user/info')).status()).toBe(401);
      expect((await otherContext.request.get('/bff/me')).status()).toBe(200);
      expect((await otherContext.request.get('/api/blade-system/user/info')).status()).toBe(200);
    } finally {
      try {
        await cleanupSession(otherContext);
      } finally {
        await otherContext.close();
      }
    }
  });
});
