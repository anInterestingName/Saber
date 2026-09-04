import type { Pinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import type { AppI18n } from '@/lang';
import { useTagsStore } from '@/store/tags';
import { useUserStore } from '@/store/user';
import { installDynamicRouter } from './dynamic-router';
import PageRouter from './page/';
import ViewsRouter from './views/';

export const createAppRouter = (pinia: Pinia, i18n: AppI18n) => {
  const router = createRouter({
    history: createWebHistory(import.meta.env.VITE_APP_BASE),
    routes: [...PageRouter, ...ViewsRouter],
  });
  installDynamicRouter({
    router,
    tagsStore: useTagsStore(pinia),
    i18n,
  });
  router.$dynamicRouter.formatRoutes(useUserStore(pinia).menuAll, true);
  return router;
};
