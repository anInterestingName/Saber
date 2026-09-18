import request from '@/axios';
import website from '@/config/website';
import type { BladeResponse } from '@/types/option';

interface RegisterResponse<T> extends BladeResponse<T> {
  success: boolean;
}

export interface RegisterConfig {
  enabled: boolean;
  defaultTenantId: string;
  captchaEnabled: boolean;
  accountMinLength: number;
  accountMaxLength: number;
  passwordMinLength: number;
  passwordMaxLength: number;
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

// password 之后的入参按登录链路各自缺省：type 仅切换角色部门时下发，key / code 仅验证码模式下发；
// 手机验证码链路（store 的 LoginByPhone）只透传前两位，故 password 亦为可选
export const loginByUsername = (
  tenantId,
  account,
  password?: string,
  type?: string,
  key?: string,
  code?: string
) => request({
  url: '/blade-auth/token',
  method: 'post',
  headers: {
    'Captcha-Key': key,
    'Captcha-Code': code,
  },
  params: {
    grantType: (website.captchaMode ? "captcha" : "password"),
    tenantId,
    account,
    password,
    type
  }
});

export const loginBySocial = (tenantId, source, code, state) => request({
  url: '/blade-auth/token',
  method: 'post',
  headers: {
    'Tenant-Id': tenantId
  },
  params: {
    tenantId,
    source,
    code,
    state,
    grantType: "social",
    scope: "all",
  }
});

export const getButtons = () => request({
  url: '/blade-system/menu/buttons',
  method: 'get'
});

export const getUserInfo = () => request({
  url: '/user/getUserInfo',
  method: 'get'
});

export const refreshToken = (refreshToken) => request({
  url: '/blade-auth/token',
  method: 'post',
  params: {
    refreshToken,
    grantType: "refresh_token",
    scope: "all",
  }
})

export const registerGuest = (form, oauthId) => request({
  url: '/blade-system/user/register-guest',
  method: 'post',
  params: {
    tenantId: form.tenantId,
    name: form.name,
    account: form.account,
    password: form.password,
    oauthId
  }
});

export const getCaptcha = () => request({
  url: '/blade-auth/captcha',
  method: 'get'
});

export const getRegisterConfig = () => request<RegisterResponse<RegisterConfig>>({
  url: '/blade-auth/register/config',
  method: 'get',
  meta: { isToken: false }
});

export const registerUser = (data: RegisterPayload) => request<RegisterResponse<RegisterResult>>({
  url: '/blade-auth/register',
  method: 'post',
  data,
  meta: { isToken: false }
});

export const sendLogs = (list) => request({
  url: '/user/send-logs',
  method: 'post',
  data: list
})

export const logout = () => request({
  url: '/blade-auth/logout',
  method: 'post'
})
