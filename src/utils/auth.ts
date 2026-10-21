import Cookies from 'js-cookie';
import website from '@/config/website';

const returnPathKey = `${website.key}-auth-return-path`;
const loginAttemptKey = `${website.key}-auth-login-attempt`;

/** 只记录本标签页的导航时间，防止缺失授权上下文时连续自动跳转。 */
export const markLoginAttempt = () =>
  window.sessionStorage.setItem(loginAttemptKey, String(Date.now()));

export const clearLoginAttempt = () => window.sessionStorage.removeItem(loginAttemptKey);

export const canAutomaticallyStartLogin = () => {
  const startedAt = Number(window.sessionStorage.getItem(loginAttemptKey));
  const elapsed = Date.now() - startedAt;
  return !Number.isFinite(startedAt) || !startedAt || elapsed < 0 || elapsed >= 30000;
};
const sensitiveKey = /token|password|secret|authorization|(^|_)(code|state|verifier)($|_)/i;
const protocolPath =
  /^\/(auth(?:\/|$)|auth-api(?:\/|$)|bff(?:\/|$)|oauth2(?:\/|$)|login(?:\/|$)|blade-auth(?:\/|$)|api(?:\/|$))/i;

/** 只清理本项目已知旧键；不读取旧凭据，不清空用户的其他存储。 */
export const clearLegacyAuthStorage = () => {
  Cookies.remove('saber3-access-token', { path: '/' });
  Cookies.remove('saber3-refresh-token', { path: '/' });
  const names = [
    'token',
    'refreshToken',
    'userInfo',
    'permission',
    'menu',
    'menuAll',
    'tag',
    'tagList',
    'lockPasswd',
    'isLock',
    'logsList',
  ];
  for (const name of names) {
    const key = `${website.key}-${name}`;
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }
};

export const getSafeReturnPath = (value: string): string | null => {
  if (
    !value ||
    value !== value.trim() ||
    value.startsWith('//') ||
    (!value.startsWith('/') && !/^https?:\/\//i.test(value))
  )
    return null;
  try {
    const decoded = decodeURIComponent(value);
    if (/[\u0000-\u001f\u007f\\]/.test(decoded) || decoded.startsWith('//')) return null;
    const url = new URL(value, window.location.origin);
    if (
      url.origin !== window.location.origin ||
      url.username ||
      url.password ||
      !url.pathname.startsWith('/') ||
      protocolPath.test(decodeURIComponent(url.pathname))
    )
      return null;
    if ([...url.searchParams.keys()].some(key => sensitiveKey.test(key))) return null;
    const hash = decodeURIComponent(url.hash.slice(1));
    if (
      protocolPath.test(hash) ||
      /(?:^|[?&])(token|password|secret|code|state|verifier)=/i.test(hash)
    ) {
      return null;
    }
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
};

export const rememberReturnPath = (value: string) => {
  const path = getSafeReturnPath(value);
  if (path) window.sessionStorage.setItem(returnPathKey, path);
};

export const consumeReturnPath = () => {
  const path = window.sessionStorage.getItem(returnPathKey);
  window.sessionStorage.removeItem(returnPathKey);
  return (path && getSafeReturnPath(path)) || website.firstPage.path;
};

export const clearReturnPath = () => window.sessionStorage.removeItem(returnPathKey);
