import request from '@/axios';
import type { AuthResponse, PermissionNode } from '@/types/auth';

export interface RegisterConfig {
  enabled: boolean;
  defaultTenantId: string;
  captchaEnabled: boolean;
  accountMinLength: number;
  accountMaxLength: number;
  passwordMinLength: number;
  passwordMaxLength: number;
  passwordMaxBytes?: number;
}

export interface RegisterPayload {
  tenantId: string;
  account: string;
  name: string;
  password: string;
  confirmPassword: string;
  captchaKey: string;
  captchaCode: string;
}

export interface RegisterResult {
  tenantId: string;
  account: string;
  nextAction: 'LOGIN';
}

export const getButtons = () =>
  request<AuthResponse<PermissionNode[]>>({
    url: '/blade-system/menu/buttons',
    method: 'get',
    meta: { silent: true },
  });

export const getRegisterConfig = () =>
  request<AuthResponse<RegisterConfig>>({
    url: '/blade-system/user/register/config',
    method: 'get',
    meta: { scope: 'public', silent: true },
  });

export const getRegisterCaptcha = () =>
  request<AuthResponse<{ key: string; image: string }>>({
    url: '/blade-system/user/register/captcha',
    method: 'get',
    meta: { scope: 'public', silent: true },
  });

export const registerUser = (form: RegisterPayload) =>
  request<AuthResponse<RegisterResult>>({
    url: '/blade-system/user/register',
    method: 'post',
    data: {
      tenantId: form.tenantId,
      account: form.account,
      name: form.name,
      password: form.password,
      confirmPassword: form.confirmPassword,
      captchaKey: form.captchaKey,
      captchaCode: form.captchaCode,
    },
    meta: { scope: 'public', silent: true },
  });
