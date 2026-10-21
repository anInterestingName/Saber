import type { Pinia } from 'pinia';
import type { Router } from 'vue-router';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import { ElMessage } from 'element-plus';
import { useCommonStore } from '@/store/common';
import { useTagsStore } from '@/store/tags';
import { useAuthSession } from '@/composables/useAuthSession';
import { startBffLogin } from '@/api/authorization';
import { rememberReturnPath } from '@/utils/auth';
import { getSafeExternalUrl } from '@/router/menu';
import type { MenuMeta } from '@/types/menu';
import { getRequestSessionVersion } from '@/axios';

NProgress.configure({ showSpinner: false });
type LazyRouteComponent = () => Promise<{ default: { name?: string } }>;

export const setupPermissionGuards = (router: Router, pinia: Pinia) => {
  const commonStore = useCommonStore(pinia);
  const tagsStore = useTagsStore(pinia);
  const auth = useAuthSession();

  router.beforeEach(async to => {
    NProgress.start();
    const meta = to.meta;
    const isMenu = meta.menu === undefined ? to.query.menu : meta.menu;
    commonStore.setMenuVisible(isMenu === undefined);
    if (meta.authorization || meta.isAuth === false) return true;

    const wasReady = auth.status.value === 'ready';
    const version = getRequestSessionVersion();
    if (!(await auth.ensureReady())) {
      rememberReturnPath(to.fullPath);
      if (auth.status.value === 'anonymous') {
        startBffLogin();
        NProgress.done();
        return false;
      }
      return { path: '/auth/verify', replace: true };
    }
    if (auth.status.value !== 'ready' || (wasReady && version !== getRequestSessionVersion())) {
      return false;
    }
    // 首次匹配发生在菜单装配之前，重新解析目标路径。
    if (!wasReady) return { path: to.path, query: to.query, hash: to.hash, replace: true };
    if (!to.matched.length) return '/404';
    if (commonStore.isLock && to.path !== '/lock') return '/lock';

    if (meta.target) {
      const href = typeof to.query.url === 'string' ? getSafeExternalUrl(to.query.url) : null;
      if (href) window.open(href, '_blank', 'noopener,noreferrer');
      else ElMessage.warning('外链地址不可用，请联系管理员更新菜单地址');
      NProgress.done();
      return false;
    }
    const component = to.matched[to.matched.length - 1]?.components?.default;
    if (typeof component === 'function') {
      void (component as LazyRouteComponent)().then(module => {
        module.default.name = to.path;
      });
    }
    if (meta.isTab !== false) {
      const name = to.query.name ?? to.name;
      tagsStore.addTag({
        name: Array.isArray(name) ? name.join(',') : name == null ? undefined : String(name),
        path: to.path,
        fullPath: to.path,
        params: to.params,
        query: to.query,
        meta: meta as MenuMeta,
      });
    }
    return true;
  });

  router.afterEach(to => {
    NProgress.done();
    router.$dynamicRouter.setTitle(router.$dynamicRouter.generateTitle(to, { label: 'name' }));
    commonStore.setSearch(false);
  });
  router.onError(() => NProgress.done());
};
