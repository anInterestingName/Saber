import { test as base, expect } from '@playwright/test';

export const test = base.extend<{ runtimeChecks: void }>({
  runtimeChecks: [
    async ({ page }, use, testInfo) => {
      const errors: string[] = [];
      const unexpectedRequests: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        // HTTP 失败由各用例的响应断言判断；其浏览器通用提示不是脚本异常。
        if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) {
          errors.push(message.text());
        }
      });
      if (testInfo.project.name !== 'real-backend') {
        await page.route(
          /^https?:\/\/[^/]+\/(?:auth-api|api|bff|oauth2|blade-auth|login)(?:\/|$)/,
          async route => {
            unexpectedRequests.push(new URL(route.request().url()).pathname);
            await route.fulfill({
              status: 501,
              json: { code: 501, success: false, msg: '测试未登记该接口', data: null },
            });
          }
        );
      }
      await use();
      if (testInfo.status !== testInfo.expectedStatus && testInfo.project.name !== 'real-backend') {
        const image = await page
          .screenshot({ mask: [page.locator('input')], fullPage: true, animations: 'disabled' })
          .catch(() => undefined);
        if (image)
          await testInfo.attach('失败页面（输入已遮蔽）', {
            body: image,
            contentType: 'image/png',
          });
      }
      expect(errors, 'Console/PageError 不应出现未处理异常').toEqual([]);
      expect(unexpectedRequests, '隔离 Mock 不应请求未登记接口或真实后端').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
