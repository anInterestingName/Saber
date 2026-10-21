import { test, expect } from './fixtures';
import { mockLoginApi } from './mocks/login';
import { mockRegisterApi } from './mocks/register';
import { mockConsentApi, CONSENT_PATH } from './mocks/consent';
import { AUTH_CSRF_RENEWED } from './support/constants';
import { expectReachable, interceptNativeForm } from './support/forms';

test.describe('TC-012 认证页面响应式与键盘操作', () => {
  for (const theme of ['light', 'dark'] as const) {
    for (const kind of ['login', 'register', 'consent'] as const) {
      test(`${kind}：${theme} 主题在项目视口中主要操作可达`, async ({ page }, testInfo) => {
        if (kind === 'login') await mockLoginApi(page);
        if (kind === 'register') await mockRegisterApi(page);
        const consentState = kind === 'consent' ? await mockConsentApi(page) : null;
        const requests =
          kind === 'consent' ? await interceptNativeForm(page, '/auth-api/oauth2/authorize') : [];
        await page.goto(kind === 'consent' ? CONSENT_PATH : `/auth/${kind}`);
        await expect(page.locator('h1')).toHaveText(
          { login: '登录星图', register: '注册账号', consent: '登录测试客户端' }[kind]
        );
        if (theme === 'dark') await page.getByRole('button', { name: '切换到深色模式' }).click();
        await expect(page.locator('.auth-shell')).toHaveClass(
          theme === 'dark' ? /is-dark/ : /^(?!.*is-dark)/
        );
        await expectReachable(page.getByRole('heading', { level: 1 }));
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true
        );
        await expectReachable(
          page.getByRole('button', {
            name: theme === 'dark' ? '切换到浅色模式' : '切换到深色模式',
          })
        );
        if (kind !== 'consent') {
          await expectReachable(page.locator('input[autocomplete="username"]'));
          await expectReachable(
            page
              .locator(`input[autocomplete="${kind === 'login' ? 'current' : 'new'}-password"]`)
              .first()
          );
          await expectReachable(
            page.getByRole('button', { name: kind === 'login' ? '登录' : '注册', exact: true })
          );
          await expectReachable(
            page.getByRole('button', {
              name: kind === 'login' ? '注册账号' : '返回登录',
              exact: true,
            })
          );
        } else {
          await expect(page.locator('.consent-scopes')).not.toContainText('untrusted');
          await expectReachable(page.getByRole('button', { name: '授权并登录', exact: true }));
          await expectReachable(page.getByRole('button', { name: '取消登录', exact: true }));
        }
        const screenshot = await page.screenshot({
          fullPage: true,
          animations: 'disabled',
          mask: [page.locator('input')],
        });
        await testInfo.attach(`${kind}-${theme}-布局`, {
          body: screenshot,
          contentType: 'image/png',
        });
        if (kind === 'consent') {
          const approve = page.getByRole('button', { name: '授权并登录', exact: true });
          const deny = page.getByRole('button', { name: '取消登录', exact: true });
          await approve.focus();
          await page.keyboard.press('Tab');
          await expect(deny).toBeFocused();
          await (theme === 'light' ? approve : deny).press('Enter');
          await expect(page.locator('h1')).toHaveText('已收到测试提交');
          expect(consentState?.contextRequests).toBe(2);
          expect(requests.length).toBe(1);
          const request = requests[0];
          expect(request.method).toBe('POST');
          expect(request.params.get('client_id')).toBe('mock-client');
          expect(request.params.get('state') === 'mock-state').toBe(true);
          expect(request.params.get('decision')).toBe(theme === 'light' ? 'approve' : 'deny');
          expect(request.params.get('_csrf') === AUTH_CSRF_RENEWED).toBe(true);
          expect(request.params.getAll('scope')).toEqual(
            theme === 'light' ? ['profile', 'service.read'] : []
          );
          expect(request.queryEmpty).toBe(true);
          expect(request.credentialHeaders).toEqual([]);
        }
      });
    }
  }
});
