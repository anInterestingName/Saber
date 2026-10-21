import { test, expect } from './fixtures';
import { mockRegisterApi } from './mocks/register';
import { CAPTCHA_KEY, CAPTCHA_KEY_RENEWED, MOCK_PASSWORD } from './support/constants';
import { fillRegistration } from './support/forms';

test.describe('TC-010 新注册入口与异常闭环', () => {
  test('从登录入口注册：仅 JSON 白名单字段、配置租户及 BFF CSRF，成功后返回登录', async ({
    page,
  }) => {
    const state = await mockRegisterApi(page, { defaultTenantId: '100001' });
    await page.goto('/auth/login');
    await page.getByRole('button', { name: '注册账号', exact: true }).click();
    await expect(page.locator('h1')).toHaveText('注册账号');
    await fillRegistration(page);
    await page.getByRole('button', { name: '注册', exact: true }).click();
    await expect(page).toHaveURL(/\/auth\/login\?registered=1$/);
    await expect(page.getByText('注册成功，请登录', { exact: true })).toBeVisible();
    expect(state.submissions.length).toBe(1);
    const request = state.submissions[0];
    expect(Object.keys(request.body).sort()).toEqual(
      [
        'tenantId',
        'account',
        'name',
        'password',
        'confirmPassword',
        'captchaKey',
        'captchaCode',
      ].sort()
    );
    expect(request.body.tenantId).toBe('100001');
    expect(typeof request.body.tenantId).toBe('string');
    expect(request.body.account).toBe('auth-fe-register');
    expect(request.body.name).toBe('测试用户');
    expect(request.body.password === MOCK_PASSWORD).toBe(true);
    expect(request.body.confirmPassword === MOCK_PASSWORD).toBe(true);
    expect(request.body.captchaKey).toBe(CAPTCHA_KEY);
    expect(request.body.captchaCode).toBe('TEST');
    expect(request.method).toBe('POST');
    expect(request.contentType).toContain('application/json');
    expect(request.csrfValid).toBe(true);
    expect(request.credentialHeaders).toEqual([]);
    expect(request.queryEmpty).toBe(true);
  });

  test('72 个 UTF-8 字节边界允许提交', async ({ page }) => {
    const state = await mockRegisterApi(page);
    const password = `Aa1${'汉'.repeat(23)}`;
    expect(Buffer.byteLength(password)).toBe(72);
    await page.goto('/auth/register');
    await fillRegistration(page, 'auth-fe-byte-limit', password);
    await page.getByRole('button', { name: '注册', exact: true }).click();
    await expect(page).toHaveURL(/\/auth\/login\?registered=1$/);
    expect(state.submissions.length).toBe(1);
    expect(state.submissions[0].body.password === password).toBe(true);
  });

  for (const omitPasswordMaxBytes of [false, true]) {
    test(`73 字节禁止提交（配置${
      omitPasswordMaxBytes ? '省略' : '提供'
    } passwordMaxBytes）`, async ({ page }) => {
      const state = await mockRegisterApi(page, { omitPasswordMaxBytes });
      const password = `Aa12${'汉'.repeat(23)}`;
      expect(Buffer.byteLength(password)).toBe(73);
      await page.goto('/auth/register');
      await fillRegistration(page, 'auth-fe-byte-overflow', password);
      await page.getByRole('button', { name: '注册', exact: true }).click();
      await expect(page.locator('.el-form-item__error')).toHaveText('密码不能超过72个UTF-8字节');
      await expect(page.getByRole('button', { name: '注册', exact: true })).toBeEnabled();
      expect(state.submissions.length).toBe(0);
      expect(state.csrfRequests).toBe(0);
      await expect(page).toHaveURL(/\/auth\/register$/);
    });
  }

  test('48303 验证码错误保持注册可用、取得新验证码，只有手动重试才再次提交', async ({ page }) => {
    const state = await mockRegisterApi(page, {
      responses: [
        { code: 48303, success: false, msg: '验证码无效，请重新获取' },
        { code: 200, success: true, msg: '注册成功' },
      ],
    });
    await page.goto('/auth/register');
    await fillRegistration(page);
    await page.getByRole('button', { name: '注册', exact: true }).click();
    await expect(page.locator('.el-alert--error')).toContainText('验证码无效，请重新获取');
    await expect(page.getByRole('button', { name: '注册', exact: true })).toBeEnabled();
    await expect(page.locator('input[autocomplete="username"]')).toHaveValue('auth-fe-register');
    await expect(page.locator('input[autocomplete="new-password"]').nth(0)).toHaveValue('');
    await expect(page.locator('input[autocomplete="new-password"]').nth(1)).toHaveValue('');
    await expect(page.locator('input[autocomplete="off"]')).toHaveValue('');
    expect(state.captchaRequests).toBe(2);
    expect(state.submissions.length).toBe(1);
    await expect(page).toHaveURL(/\/auth\/register$/);
    await fillRegistration(page);
    await page.getByRole('button', { name: '注册', exact: true }).click();
    await expect(page).toHaveURL(/\/auth\/login\?registered=1$/);
    expect(state.submissions.length).toBe(2);
    expect(state.submissions[1].body.captchaKey).toBe(CAPTCHA_KEY_RENEWED);
  });

  test('注册开关关闭时隐藏登录入口与注册表单，零验证码和零提交请求', async ({ page }) => {
    const state = await mockRegisterApi(page, { enabled: false });
    await page.goto('/auth/login');
    await expect(page.getByRole('button', { name: '注册账号', exact: true })).toHaveCount(0);
    await page.goto('/auth/register');
    await expect(page.locator('.el-alert--info')).toContainText('当前未开放账号注册');
    await expect(page.getByRole('button', { name: '注册', exact: true })).toHaveCount(0);
    expect(state.captchaRequests).toBe(0);
    expect(state.submissions.length).toBe(0);
  });

  test('48301 表示服务端关闭注册，禁止继续提交且不刷新验证码', async ({ page }) => {
    const state = await mockRegisterApi(page, {
      responses: [{ code: 48301, success: false, msg: '当前暂未开放注册' }],
    });
    await page.goto('/auth/register');
    await fillRegistration(page);
    await page.getByRole('button', { name: '注册', exact: true }).click();
    await expect(page.locator('.el-alert--info')).toContainText('当前未开放账号注册');
    await expect(page.getByRole('button', { name: '注册', exact: true })).toHaveCount(0);
    expect(state.captchaRequests).toBe(1);
    expect(state.submissions.length).toBe(1);
    await expect(page).toHaveURL(/\/auth\/register$/);
  });

  test('BFF CSRF 获取失败时零业务提交，恢复服务后仅用户再次提交', async ({ page }) => {
    const state = await mockRegisterApi(page, { csrfStatuses: [503, 200] });
    await page.goto('/auth/register');
    await fillRegistration(page);
    await page.getByRole('button', { name: '注册', exact: true }).click();
    await expect(page.locator('.el-alert--error')).toContainText('服务暂时不可用');
    await expect(page.getByRole('button', { name: '注册', exact: true })).toBeEnabled();
    expect(state.submissions.length).toBe(0);
    expect(state.csrfRequests).toBe(1);
    await fillRegistration(page);
    await page.getByRole('button', { name: '注册', exact: true }).click();
    await expect(page).toHaveURL(/\/auth\/login\?registered=1$/);
    expect(state.csrfRequests).toBe(2);
    expect(state.submissions.length).toBe(1);
  });

  test('业务 403 不自动重放、不显示成功，释放锁后允许手动重试', async ({ page }) => {
    const state = await mockRegisterApi(page, {
      responses: [
        { status: 403, code: 403, success: false, msg: '请求被拒绝' },
        { code: 200, success: true, msg: '注册成功' },
      ],
    });
    await page.goto('/auth/register');
    await fillRegistration(page);
    await page.getByRole('button', { name: '注册', exact: true }).click();
    await expect(page.locator('.el-alert--error')).toContainText('操作被拒绝');
    await expect(page.getByRole('button', { name: '注册', exact: true })).toBeEnabled();
    await expect(page.locator('.el-alert--success')).toHaveCount(0);
    await expect(page).toHaveURL(/\/auth\/register$/);
    expect(state.submissions.length).toBe(1);
    await fillRegistration(page);
    await page.getByRole('button', { name: '注册', exact: true }).click();
    await expect(page).toHaveURL(/\/auth\/login\?registered=1$/);
    expect(state.submissions.length).toBe(2);
  });

  test('连续双击注册在响应完成前只发送一次请求', async ({ page }) => {
    let release = () => {};
    const held = new Promise<void>(resolve => {
      release = resolve;
    });
    const state = await mockRegisterApi(page, { beforeReply: () => held });
    await page.goto('/auth/register');
    await fillRegistration(page);
    await page.getByRole('button', { name: '注册', exact: true }).click({ clickCount: 2 });
    try {
      await expect.poll(() => state.submissions.length).toBe(1);
      await expect(page.getByRole('button', { name: '注册', exact: true })).toBeDisabled();
      expect(state.submissions.length).toBe(1);
    } finally {
      release();
    }
    await expect(page).toHaveURL(/\/auth\/login\?registered=1$/);
    expect(state.submissions.length).toBe(1);
  });
});
