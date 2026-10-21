/** 认证 JSON 使用统一 Axios；登录/同意和 OAuth 回调使用浏览器原生导航。 */
import request, { BladeBusinessError } from '@/axios';
import type { AuthResponse, BffSession, ConsentContext, LoginContext } from '@/types/auth';
import { markLoginAttempt, rememberReturnPath } from '@/utils/auth';

export type { AuthResponse, BffSession, ConsentContext, LoginContext } from '@/types/auth';

const readContext = <T>(value: AuthResponse<T>) => {
  if (!value || value.code !== 200 || value.success !== true || !value.data) {
    throw new BladeBusinessError(502, '认证响应不完整，请重新加载', 502);
  }
  return value;
};

const validAuthCsrf = (value: LoginContext['csrf']) =>
  !!value &&
  typeof value.parameterName === 'string' &&
  !!value.parameterName &&
  typeof value.headerName === 'string' &&
  /^X-AUTH-[A-Za-z0-9-]+$/i.test(value.headerName) &&
  typeof value.token === 'string' &&
  !!value.token;

export const startBffLogin = (returnPath?: string) => {
  if (typeof returnPath === 'string') rememberReturnPath(returnPath);
  markLoginAttempt();
  window.location.assign('/oauth2/authorization/blade');
};

export const getLoginContext = async () => {
  const response = await request<AuthResponse<LoginContext>>({
    url: '/auth-api/ui/login-context',
    method: 'get',
    meta: { scope: 'auth', silent: true },
  });
  const result = readContext(response.data);
  if (
    !validAuthCsrf(result.data.csrf) ||
    typeof result.data.authorizationPending !== 'boolean' ||
    typeof result.data.authenticated !== 'boolean' ||
    typeof result.data.defaultTenantId !== 'string'
  )
    throw new BladeBusinessError(502, '登录上下文不完整，请重新加载', 502);
  return result;
};

export const getConsentContext = async (clientId: string, state: string) => {
  const response = await request<AuthResponse<ConsentContext>>({
    url: '/auth-api/ui/consent',
    method: 'get',
    params: { client_id: clientId, state },
    meta: { scope: 'auth', silent: true },
  });
  const result = readContext(response.data);
  const value = result.data;
  if (
    value.clientId !== clientId ||
    typeof value.clientName !== 'string' ||
    typeof value.username !== 'string' ||
    !value.username.trim() ||
    !validAuthCsrf(value.csrf) ||
    !Array.isArray(value.scopes) ||
    value.scopes.some(
      scope =>
        !scope ||
        typeof scope.code !== 'string' ||
        !scope.code ||
        typeof scope.description !== 'string' ||
        typeof scope.autoApproved !== 'boolean'
    )
  )
    throw new BladeBusinessError(502, '授权上下文不完整，请重新发起登录', 502);
  return result;
};

export const getBffSession = async () => {
  const response = await request<AuthResponse<BffSession>>({
    url: '/bff/me',
    method: 'get',
    meta: { scope: 'bff', silent: true, sessionProbe: true },
  });
  const result = readContext(response.data);
  const value = result.data;
  if (
    typeof value.subject !== 'string' ||
    !value.subject ||
    typeof value.issuer !== 'string' ||
    typeof value.clientId !== 'string' ||
    !Array.isArray(value.scope) ||
    value.scope.some(scope => typeof scope !== 'string') ||
    typeof value.accessTokenExpiresAt !== 'string'
  )
    throw new BladeBusinessError(502, '登录状态响应不完整，请重新检查', 502);
  return result;
};

export const logoutBff = () =>
  request<AuthResponse<null>>({
    url: '/bff/logout',
    method: 'post',
    meta: { scope: 'bff', silent: true },
  });
