import type { Page } from '@playwright/test';
import type { ConsentContext } from '../../src/types/auth';
import { AUTH_CSRF, AUTH_CSRF_RENEWED } from '../support/constants';

export const CONSENT_PATH = '/auth/consent?client_id=mock-client&state=mock-state&scope=untrusted';

export const mockConsentApi = async (page: Page) => {
  const state = { contextRequests: 0 };
  await page.route('**/auth-api/ui/consent?**', route => {
    const data: ConsentContext = {
      clientId: 'mock-client',
      clientName: '测试客户端',
      username: 'TEST_USER',
      scopes: [
        { code: 'openid', description: '身份标识', autoApproved: true },
        { code: 'profile', description: '个人资料', autoApproved: false },
        { code: 'service.read', description: '读取服务', autoApproved: false },
      ],
      csrf: {
        parameterName: '_csrf',
        headerName: 'X-AUTH-XSRF-TOKEN',
        token: state.contextRequests++ === 0 ? AUTH_CSRF : AUTH_CSRF_RENEWED,
      },
    };
    return route.fulfill({ json: { code: 200, success: true, msg: '操作成功', data } });
  });
  return state;
};
