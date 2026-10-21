import type { Page } from '@playwright/test';
import { BFF_CSRF, CAPTCHA_KEY, CAPTCHA_KEY_RENEWED } from '../support/constants';
import { mockLoginApi } from './login';

export interface RegistrationRequest {
  tenantId: string;
  account: string;
  name: string;
  password: string;
  confirmPassword: string;
  captchaKey: string;
  captchaCode: string;
}

interface RegistrationReply {
  status?: number;
  code: number;
  success: boolean;
  msg: string;
  nextAction?: string;
}

interface RegisterOptions {
  enabled?: boolean;
  defaultTenantId?: string;
  omitPasswordMaxBytes?: boolean;
  responses?: RegistrationReply[];
  csrfStatuses?: number[];
  beforeReply?: () => Promise<void>;
}

export const mockRegisterApi = async (page: Page, options: RegisterOptions = {}) => {
  await mockLoginApi(page);
  const defaultTenantId = options.defaultTenantId ?? '000000';
  const state = {
    captchaRequests: 0,
    csrfRequests: 0,
    submissions: [] as Array<{
      body: RegistrationRequest;
      method: string;
      csrfValid: boolean;
      credentialHeaders: string[];
      queryEmpty: boolean;
      contentType: string;
    }>,
  };
  await page.route('**/bff/csrf', route => {
    const statuses = options.csrfStatuses ?? [200];
    const status = statuses[Math.min(state.csrfRequests++, statuses.length - 1)];
    return route.fulfill({
      status,
      json: {
        code: status,
        success: status === 200,
        msg: status === 200 ? '操作成功' : '校验服务暂不可用',
        data:
          status === 200
            ? { headerName: 'X-BFF-XSRF-TOKEN', parameterName: '_csrf', token: BFF_CSRF }
            : null,
      },
    });
  });
  await page.route('**/api/blade-system/user/register/config', route =>
    route.fulfill({
      json: {
        code: 200,
        success: true,
        msg: '操作成功',
        data: {
          enabled: options.enabled ?? true,
          defaultTenantId,
          captchaEnabled: true,
          accountMinLength: 4,
          accountMaxLength: 32,
          passwordMinLength: 8,
          passwordMaxLength: 64,
          ...(options.omitPasswordMaxBytes ? {} : { passwordMaxBytes: 72 }),
        },
      },
    })
  );
  await page.route('**/api/blade-system/user/register/captcha', route => {
    const key = state.captchaRequests++ === 0 ? CAPTCHA_KEY : CAPTCHA_KEY_RENEWED;
    return route.fulfill({
      json: {
        code: 200,
        success: true,
        msg: '操作成功',
        data: {
          key,
          image:
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        },
      },
    });
  });
  await page.route('**/api/blade-system/user/register', async route => {
    const request = route.request();
    const body = request.postDataJSON() as RegistrationRequest;
    const headers = request.headers();
    state.submissions.push({
      body,
      method: request.method(),
      csrfValid: headers['x-bff-xsrf-token'] === BFF_CSRF,
      credentialHeaders: Object.keys(headers).filter(key =>
        ['authorization', 'blade-auth', 'x-user-id', 'x-tenant-id', 'x-user-roles'].includes(key)
      ),
      queryEmpty: new URL(request.url()).search === '',
      contentType: headers['content-type'],
    });
    await options.beforeReply?.();
    const responses = options.responses ?? [{ code: 200, success: true, msg: '注册成功' }];
    const response = responses[Math.min(state.submissions.length - 1, responses.length - 1)];
    await route.fulfill({
      status: response.status ?? 200,
      json: {
        ...response,
        data: response.success
          ? {
              tenantId: body.tenantId,
              account: body.account,
              nextAction: response.nextAction ?? 'LOGIN',
            }
          : null,
      },
    });
  });
  return state;
};
