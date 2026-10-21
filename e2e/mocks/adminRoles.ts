import type { Page } from '@playwright/test';
import type { BffSession, PermissionNode, UserProfile } from '../../src/types/auth';
import type { MenuItem } from '../../src/types/menu';
import { BFF_CSRF } from '../support/constants';

/** 隔离的业务会话，只检查管理员 UI，不创建真实用户、客户端或会话。 */
export const mockAdminRoles = async (page: Page, roles: string[]) => {
  const state = { clientListRequests: 0 };
  const session: BffSession = {
    subject: '1001',
    issuer: 'https://auth.example.test',
    clientId: 'mock-client',
    // 普通角色夹具也拥有相同 scope 和按钮，验证它们不能代替管理员身份。
    scope: ['openid', 'profile', 'service.read'],
    accessTokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
  };
  const profile: UserProfile = {
    id: session.subject,
    tenantId: '100001',
    account: 'auth-fe-role-case',
    // 即使显示名为管理员，也必须依据实际角色别名判断。
    name: '超级管理员',
    roles,
  };
  const menus: MenuItem[] = [
    { id: '2001', name: '应用管理', path: '/system/client', children: [] },
  ];
  const buttons: PermissionNode[] = [
    'client_add',
    'client_view',
    'client_edit',
    'client_delete',
  ].map(code => ({ code }));
  await page.route('**/bff/me', route =>
    route.fulfill({ json: { code: 200, success: true, msg: '操作成功', data: session } })
  );
  await page.route('**/bff/csrf', route =>
    route.fulfill({
      json: {
        code: 200,
        success: true,
        msg: '操作成功',
        data: { headerName: 'X-BFF-XSRF-TOKEN', token: BFF_CSRF },
      },
    })
  );
  await page.route('**/api/blade-system/user/info', route =>
    route.fulfill({ json: { code: 200, success: true, msg: '操作成功', data: profile } })
  );
  await page.route('**/api/blade-system/menu/routes**', route =>
    route.fulfill({ json: { code: 200, success: true, msg: '操作成功', data: menus } })
  );
  await page.route('**/api/blade-system/menu/top-menu', route =>
    route.fulfill({ json: { code: 200, success: true, msg: '操作成功', data: [] } })
  );
  await page.route('**/api/blade-system/menu/buttons', route =>
    route.fulfill({ json: { code: 200, success: true, msg: '操作成功', data: buttons } })
  );
  await page.route('**/api/blade-system/client/list**', route => {
    state.clientListRequests++;
    return route.fulfill({
      json: {
        code: 200,
        success: true,
        msg: '操作成功',
        data: { records: [], total: 0, current: 1, size: 10 },
      },
    });
  });
  return state;
};
