import type { Page } from '@playwright/test';
import type { LoginContext } from '../../src/types/auth';
import { AUTH_CSRF } from '../support/constants';

interface LoginOptions {
  authorizationPending?: boolean;
  authenticated?: boolean;
  registerEnabled?: boolean;
  defaultTenantId?: string;
  csrfTokens?: string[];
}

export const mockLoginApi = async (page: Page, options: LoginOptions = {}) => {
  const { defaultTenantId = '000000', csrfTokens = [AUTH_CSRF] } = options;
  const state = { contextRequests: 0 };
  await page.route('**/api/blade-system/user/register/config', route =>
    route.fulfill({
      json: {
        code: 200,
        success: true,
        msg: '操作成功',
        data: {
          enabled: options.registerEnabled ?? true,
          defaultTenantId,
          captchaEnabled: true,
          accountMinLength: 4,
          accountMaxLength: 32,
          passwordMinLength: 8,
          passwordMaxLength: 64,
        },
      },
    })
  );
  await page.route('**/auth-api/ui/login-context', route => {
    const token = csrfTokens[Math.min(state.contextRequests++, csrfTokens.length - 1)];
    const data: LoginContext = {
      authorizationPending: options.authorizationPending ?? true,
      authenticated: options.authenticated ?? false,
      defaultTenantId,
      csrf: { parameterName: '_csrf', headerName: 'X-AUTH-XSRF-TOKEN', token },
    };
    return route.fulfill({ json: { code: 200, success: true, msg: '操作成功', data } });
  });
  return state;
};
