import { test, expect } from './fixtures';
import { mockAdminRoles } from './mocks/adminRoles';

const cases: Array<{ name: string; roles: string[]; expectedAdmin: boolean }> = [
  { name: 'administrator 角色', roles: ['administrator'], expectedAdmin: true },
  { name: 'admin 角色', roles: ['admin'], expectedAdmin: true },
  { name: '混合角色中的 administrator', roles: ['user', 'administrator'], expectedAdmin: true },
  { name: '普通 user 角色', roles: ['user'], expectedAdmin: false },
  { name: '空角色', roles: [], expectedAdmin: false },
  { name: '名称包含 admin 的自定义角色', roles: ['admin-readonly'], expectedAdmin: false },
];

test.describe('TC-003 管理员角色与普通按钮权限隔离', () => {
  for (const entry of cases) {
    test(`${entry.name}按实际角色控制应用管理入口`, async ({ page }) => {
      const state = await mockAdminRoles(page, entry.roles);
      await page.goto('/system/client');
      await expect(page).toHaveURL(/\/system\/client$/);
      const management = page.locator('.client-management-page');
      const addButton = page.getByRole('button', { name: '新增', exact: true });
      const denied = page.getByText('仅管理员可管理 OAuth 客户端', { exact: true });
      if (entry.expectedAdmin) {
        await expect(management).toBeVisible();
        await expect(addButton).toBeVisible();
        await expect(denied).toHaveCount(0);
        await expect.poll(() => state.clientListRequests).toBe(1);
      } else {
        await expect(denied).toBeVisible();
        await expect(management).toHaveCount(0);
        await expect(addButton).toHaveCount(0);
        expect(state.clientListRequests).toBe(0);
      }
    });
  }
});
