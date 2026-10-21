import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { MOCK_PASSWORD } from './constants';

export const fillRegistration = async (
  page: Page,
  account = 'auth-fe-register',
  password = MOCK_PASSWORD
) => {
  await page.locator('input[autocomplete="username"]').fill(account);
  await page.locator('input[autocomplete="nickname"]').fill('测试用户');
  const passwords = page.locator('input[autocomplete="new-password"]');
  await passwords.nth(0).fill(password);
  await passwords.nth(1).fill(password);
  await page.locator('input[autocomplete="off"]').fill('TEST');
};

export const interceptNativeForm = async (page: Page, path: string) => {
  const requests: Array<{
    method: string;
    params: URLSearchParams;
    queryEmpty: boolean;
    contentType: string;
    credentialHeaders: string[];
  }> = [];
  await page.route(`**${path}`, async route => {
    const request = route.request();
    const headers = request.headers();
    requests.push({
      method: request.method(),
      params: new URLSearchParams(request.postData() || ''),
      queryEmpty: new URL(request.url()).search === '',
      contentType: headers['content-type'] || '',
      credentialHeaders: Object.keys(headers).filter(key =>
        ['authorization', 'blade-auth', 'x-user-id', 'x-tenant-id', 'x-user-roles'].includes(key)
      ),
    });
    await route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><html><head><meta charset="utf-8"></head><body><h1>已收到测试提交</h1></body></html>',
    });
  });
  return requests;
};

/** 可见、完整进入视口且通过真实点击的命中检查；不执行业务副作用。 */
export const expectReachable = async (locator: Locator) => {
  await expect(locator).toBeVisible();
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeInViewport({ ratio: 1 });
  await locator.click({ trial: true });
};
