import type { Pinia } from 'pinia';
import type { Router } from 'vue-router';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import { useCommonStore } from '@/store/common';
import { useTagsStore } from '@/store/tags';
import { useUserStore } from '@/store/user';
import type { MenuMeta } from '@/types/menu';
import { getToken } from '@/utils/auth';

NProgress.configure({ showSpinner: false });
const lockPage = '/lock';

type LazyRouteComponent = () => Promise<{ default: { name?: string } }>;

export const setupPermissionGuards = (router: Router, pinia: Pinia) => {
  const commonStore = useCommonStore(pinia);
  const tagsStore = useTagsStore(pinia);
  const userStore = useUserStore(pinia);

  router.beforeEach((to, _from, next) => {
    const matchedRoutes = to.matched;
    const component =
      matchedRoutes.length > 0
        ? matchedRoutes[matchedRoutes.length - 1].components.default
        : null;
    if (component && typeof component === 'function') {
      void (component as LazyRouteComponent)().then(module => {
        module.default.name = to.fullPath;
      });
    }

    const meta = to.meta || {};
    const isMenu = meta.menu === undefined ? to.query.menu : meta.menu;
    commonStore.setMenuVisible(isMenu === undefined);

    if (!getToken()) {
      if (meta.isAuth === false) next();
      else next('/login');
      return;
    }

    if (commonStore.isLock && to.path !== lockPage) {
      next({ path: lockPage });
    } else if (to.path === '/login') {
      next({ path: '/' });
    } else if (!userStore.hasUserInfo) {
      userStore
        .GetUserInfo()
        .then(() => next({ ...to, replace: true }))
        .catch(() => {
          userStore.FedLogOut().then(() => next({ path: '/login' }));
        });
    } else {
      const query = to.query || {};
      if (meta.target) {
        window.open((query.url as string).replace(/#/g, '&'));
        return;
      }
      if (meta.isTab !== false) {
        const routeName = query.name ?? to.name;
        tagsStore.addTag({
          name: Array.isArray(routeName)
            ? routeName.join(',')
            : routeName == null
              ? undefined
              : String(routeName),
          path: to.path,
          fullPath: to.path,
          params: to.params,
          query: to.query,
          meta: meta as MenuMeta,
        });
      }
      next();
    }
  });

  router.afterEach(to => {
    NProgress.done();
    const title = router.$dynamicRouter.generateTitle(to, { label: 'name' });
    router.$dynamicRouter.setTitle(title);
    commonStore.setSearch(false);
  });
};
