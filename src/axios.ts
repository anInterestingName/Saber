/** 同源 Cookie 请求层：BFF 写操作使用内存 CSRF，401 按来源检查会话。 */
import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { ElMessage } from 'element-plus';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import { serialize } from '@/utils/util';
import { baseUrl } from '@/config/env';
import website from '@/config/website';
import type { AuthResponse, CsrfContext } from '@/types/auth';

interface ErrorResponse {
  code?: number;
  success?: boolean;
  msg?: string;
}

export class BladeBusinessError extends Error {
  constructor(public readonly code: number, message: string, public readonly status = 200) {
    super(message);
    this.name = 'BladeBusinessError';
  }
}

export class SessionChangedError extends Error {
  constructor() {
    super('会话已变化，请重新操作');
    this.name = 'SessionChangedError';
  }
}

export interface UnauthorizedContext {
  status: number;
  code: number;
  sessionExpired: boolean;
}

type UnauthorizedHandler = (context: UnauthorizedContext) => Promise<boolean>;
let unauthorizedHandler: UnauthorizedHandler;
let unauthorizedTask: Promise<boolean> | null = null;
let sessionVersion = 0;
let csrfContext: CsrfContext | null = null;
let csrfTask: Promise<CsrfContext> | null = null;
let csrfVersion = 0;

export const getRequestSessionVersion = () => sessionVersion;

export const resetRequestSession = () => {
  sessionVersion += 1;
  csrfContext = null;
  csrfTask = null;
  csrfVersion += 1;
  unauthorizedTask = null;
};

export const setUnauthorizedHandler = (handler: UnauthorizedHandler) => {
  unauthorizedHandler = handler;
};

const handleUnauthorized = (context: UnauthorizedContext) => {
  if (!unauthorizedHandler) return Promise.resolve(false);
  if (!unauthorizedTask) {
    const task = unauthorizedHandler(context).catch(() => false);
    unauthorizedTask = task;
    void task.finally(() => {
      if (unauthorizedTask === task) unauthorizedTask = null;
    });
  }
  return unauthorizedTask;
};

export const getBffCsrf = (): Promise<CsrfContext> => {
  if (csrfContext) return Promise.resolve(csrfContext);
  if (!csrfTask) {
    const version = sessionVersion;
    const currentCsrfVersion = csrfVersion;
    const task = axios
      .get<AuthResponse<CsrfContext>>('/bff/csrf', {
        meta: { scope: 'bff', silent: true, sessionProbe: true },
      })
      .then(response => {
        const value = response.data.data;
        if (version !== sessionVersion || currentCsrfVersion !== csrfVersion)
          throw new SessionChangedError();
        if (
          !value ||
          typeof value.headerName !== 'string' ||
          !/^X-BFF-[A-Za-z0-9-]+$/i.test(value.headerName) ||
          typeof value.token !== 'string' ||
          !value.token
        ) {
          throw new BladeBusinessError(502, '暂时无法提交操作，请稍后重试', 502);
        }
        csrfContext = { headerName: value.headerName, token: value.token };
        return csrfContext;
      });
    csrfTask = task;
    void task.then(
      () => {
        if (csrfTask === task) csrfTask = null;
      },
      () => {
        if (csrfTask === task) csrfTask = null;
      }
    );
  }
  return csrfTask;
};

const invalidateBffCsrf = () => {
  csrfVersion += 1;
  csrfContext = null;
  csrfTask = null;
};

/** 初始化或下一次主动操作更新校验，不重放之前失败的写请求。 */
export const refreshBffCsrf = () => {
  invalidateBffCsrf();
  return getBffCsrf();
};

const isWrite = (method = 'get') => !['get', 'head', 'options'].includes(method.toLowerCase());
const assertCurrentSession = (config?: InternalAxiosRequestConfig) => {
  if (config?.sessionVersion !== undefined && config.sessionVersion !== sessionVersion) {
    throw new SessionChangedError();
  }
};

axios.defaults.timeout = 10000;
axios.defaults.withCredentials = true;
// CSRF 来自 JSON 中的掩码值，不读取或自动注入默认 XSRF Cookie。
axios.defaults.xsrfCookieName = undefined;
axios.defaults.xsrfHeaderName = undefined;
axios.defaults.validateStatus = status => status >= 200 && status < 300;
NProgress.configure({ showSpinner: false });

axios.interceptors.request.use(async config => {
  const url = new URL(config.url || '', window.location.origin);
  if (url.origin !== window.location.origin || url.username || url.password) {
    throw new BladeBusinessError(400, '请求地址必须使用当前站点的同源接口', 400);
  }
  const scope = config.meta?.scope || 'business';
  if (scope === 'business' || scope === 'public') {
    const prefix = (baseUrl || '/api').replace(/\/$/, '');
    if (!url.pathname.startsWith(`${prefix}/`)) url.pathname = prefix + url.pathname;
  }
  config.url = url.pathname + url.search;
  config.baseURL = undefined;
  config.withCredentials = true;
  config.headers.delete('Authorization');
  config.headers.delete('Blade-Auth');
  config.headers.delete('X-User-Id');
  config.headers.delete('X-Tenant-Id');
  config.headers.delete('X-User-Roles');
  if (scope !== 'auth') config.sessionVersion = sessionVersion;
  if (scope !== 'auth' && isWrite(config.method)) {
    const csrf = await getBffCsrf().catch(error => {
      if (!config.meta?.silent && !(error instanceof SessionChangedError)) {
        ElMessage.error('暂时无法提交操作，请稍后重试');
      }
      throw error;
    });
    assertCurrentSession(config);
    config.headers.set(csrf.headerName, csrf.token);
  }
  if (config.method === 'post' && config.meta?.isSerialize) {
    config.data = serialize(config.data);
  }
  config.headers.set('Accept', config.headers.get('Accept') || 'application/json');
  NProgress.start();
  return config;
});

const readErrorResponse = async (response: AxiosResponse): Promise<ErrorResponse> => {
  if (response.data instanceof Blob) {
    if (!response.data.type.includes('json')) return {};
    try {
      return JSON.parse(await response.data.text()) as ErrorResponse;
    } catch {
      return {};
    }
  }
  return response.data && typeof response.data === 'object' ? response.data : {};
};

const rejectResponse = async (response: AxiosResponse) => {
  assertCurrentSession(response.config);
  const body = await readErrorResponse(response);
  assertCurrentSession(response.config);
  const status = response.status;
  const code = typeof body.code === 'number' ? body.code : status;
  const failureStatus = status >= 400 ? status : code;
  const scope = response.config.meta?.scope || 'business';
  let message = body.msg || '请求未完成，请重试';
  let sessionExpired = false;
  if (failureStatus === 401 || (status < 400 && [40101, 40102].includes(code))) {
    message = '无法访问此资源，请联系管理员确认访问权限';
    if (!response.config.meta?.sessionProbe && scope !== 'auth' && scope !== 'public') {
      sessionExpired = await handleUnauthorized({
        status,
        code,
        sessionExpired: [40101, 40102].includes(code),
      });
    }
  } else if (failureStatus === 403) {
    // 不推断拒绝原因，不重放原操作；下一次主动提交先获取新的 BFF 校验值。
    if (scope !== 'auth') invalidateBffCsrf();
    message = '操作被拒绝，请确认访问权限后重试，或联系管理员';
  } else if (status === 429) {
    message = '操作过于频繁，请稍后重试';
  } else if (status >= 500) {
    message = '服务暂时不可用，请稍后重试';
  }
  const error = new BladeBusinessError(code, message, status);
  if (!response.config.meta?.silent && !sessionExpired && !website.statusWhiteList.includes(code)) {
    ElMessage.error(message);
  }
  throw error;
};

axios.interceptors.response.use(
  async response => {
    NProgress.done();
    assertCurrentSession(response.config);
    const body = await readErrorResponse(response);
    assertCurrentSession(response.config);
    if ((body.code !== undefined && body.code !== 200) || body.success === false) {
      return rejectResponse(response);
    }
    // JSON 接口不能将代理返回的 HTML/302 页面当作成功结果。
    if (response.config.responseType !== 'blob' && typeof response.data === 'string') {
      if (!response.config.meta?.silent) ElMessage.error('服务暂时不可用，请稍后重试');
      throw new BladeBusinessError(502, '服务暂时不可用，请稍后重试', response.status);
    }
    return response;
  },
  async error => {
    NProgress.done();
    if (error instanceof SessionChangedError) throw error;
    if (axios.isAxiosError(error)) {
      assertCurrentSession(error.config);
      if (error.response) return rejectResponse(error.response);
      if (axios.isCancel(error)) throw error;
    }
    if (error instanceof BladeBusinessError) throw error;
    const message = '服务暂时不可用，请检查网络或稍后重试';
    if (!error.config?.meta?.silent) ElMessage.error(message);
    throw new BladeBusinessError(0, message, 0);
  }
);

export default axios;
