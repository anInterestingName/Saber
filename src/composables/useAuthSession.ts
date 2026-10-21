import { ref } from 'vue';
import type { Pinia } from 'pinia';
import type { Router } from 'vue-router';
import { getBffSession } from '@/api/authorization';
import type { BffSession } from '@/types/auth';
import {
  BladeBusinessError,
  getRequestSessionVersion,
  SessionChangedError,
  setUnauthorizedHandler,
  type UnauthorizedContext,
} from '@/axios';
import { setSessionCleanupHandler, useUserStore } from '@/store/user';
import { rememberReturnPath } from '@/utils/auth';

type SessionStatus =
  | 'unknown'
  | 'checking'
  | 'initializing'
  | 'ready'
  | 'anonymous'
  | 'unavailable';
const status = ref<SessionStatus>('unknown');
const session = ref<BffSession | null>(null);
const stage = ref('检查登录状态');
const failureMessage = ref('');
interface AuthSessionManager {
  status: typeof status;
  session: typeof session;
  stage: typeof stage;
  failureMessage: typeof failureMessage;
  checkSession: () => Promise<BffSession | null>;
  ensureReady: () => Promise<boolean>;
}
let manager: AuthSessionManager;

export const createAuthSession = (router: Router, pinia: Pinia): AuthSessionManager => {
  const userStore = useUserStore(pinia);
  let checkTask: Promise<BffSession | null> | null = null;
  let initializeTask: Promise<boolean> | null = null;

  setSessionCleanupHandler(() => {
    router.$dynamicRouter.clearRoutes();
    status.value = 'anonymous';
    session.value = null;
    failureMessage.value = '';
    checkTask = null;
    initializeTask = null;
  });

  const checkSession = (): Promise<BffSession | null> => {
    if (!checkTask) {
      const version = getRequestSessionVersion();
      const wasReady = status.value === 'ready';
      if (!wasReady) status.value = 'checking';
      stage.value = '检查登录状态';
      failureMessage.value = '';
      const task = getBffSession()
        .then(response => {
          if (version !== getRequestSessionVersion()) throw new SessionChangedError();
          const value = response.data;
          if (
            session.value &&
            (session.value.subject !== value.subject ||
              session.value.issuer !== value.issuer ||
              session.value.clientId !== value.clientId)
          )
            userStore.clearSession();
          session.value = value;
          if (wasReady && userStore.hasUserInfo) status.value = 'ready';
          else status.value = 'unknown';
          return value;
        })
        .catch(error => {
          if (version !== getRequestSessionVersion() || error instanceof SessionChangedError) {
            throw new SessionChangedError();
          }
          if (
            error instanceof BladeBusinessError &&
            (error.status === 401 ||
              (error.status >= 200 &&
                error.status < 300 &&
                [401, 40101, 40102].includes(error.code)))
          ) {
            userStore.clearSession();
            return null;
          }
          status.value = 'unavailable';
          failureMessage.value = '登录状态暂时无法确认，请稍后重新检查';
          throw error;
        });
      checkTask = task;
      void task.then(
        () => {
          if (checkTask === task) checkTask = null;
        },
        () => {
          if (checkTask === task) checkTask = null;
        }
      );
    }
    return checkTask;
  };

  const ensureReady = (): Promise<boolean> => {
    if (status.value === 'ready') return Promise.resolve(true);
    if (!initializeTask) {
      const task = (async () => {
        let version = getRequestSessionVersion();
        try {
          const summary = await checkSession();
          if (!summary) return false;
          version = getRequestSessionVersion();
          status.value = 'initializing';
          stage.value = '加载用户资料、角色、菜单和按钮权限';
          await userStore.initializeContext(summary.subject);
          if (version !== getRequestSessionVersion()) throw new SessionChangedError();
          router.$dynamicRouter.clearRoutes();
          router.$dynamicRouter.formatRoutes(userStore.menuAll, true);
          status.value = 'ready';
          return true;
        } catch (error) {
          if (version !== getRequestSessionVersion() || error instanceof SessionChangedError) {
            return false;
          }
          const summary = session.value;
          userStore.clearSession();
          session.value = summary;
          status.value = 'unavailable';
          failureMessage.value =
            error instanceof BladeBusinessError
              ? error.message
              : '用户资料或业务权限初始化失败，请重新加载';
          return false;
        }
      })();
      initializeTask = task;
      void task.then(() => {
        if (initializeTask === task) initializeTask = null;
      });
    }
    return initializeTask;
  };

  const handleUnauthorized = async (context: UnauthorizedContext) => {
    let expired = context.sessionExpired;
    if (!expired) {
      try {
        expired = !(await checkSession());
      } catch {
        // 无法确认 BFF 状态时保留业务输入，不把资源拒绝推断为注销。
        return false;
      }
    } else {
      userStore.clearSession();
    }
    if (expired) {
      const route = router.currentRoute.value;
      rememberReturnPath(route.fullPath);
      if (!route.meta.authorization)
        await router.replace({ path: '/auth/login', query: { reason: 'expired' } });
      return true;
    }
    if (!userStore.hasUserInfo && !router.currentRoute.value.meta.authorization) {
      rememberReturnPath(router.currentRoute.value.fullPath);
      await router.replace('/auth/verify');
    }
    return false;
  };

  setUnauthorizedHandler(handleUnauthorized);
  manager = { status, session, stage, failureMessage, checkSession, ensureReady };
  return manager;
};

export const useAuthSession = () => manager;
