import { createRouter, createWebHistory } from 'vue-router';
import PageRouter from './page/'
import ViewsRouter from './views/'
import AvueRouter from './avue-router';
import i18n from '@/lang'
import Store from '@/store/'
//创建路由
const Router = createRouter({
  // 基础路径由 createWebHistory 承载，vue-router 4 的 RouterOptions 已无 base 选项
  history: createWebHistory(import.meta.env.VITE_APP_BASE),
  routes: [...PageRouter, ...ViewsRouter]
})
AvueRouter.install({
  store: Store,
  router: Router,
  i18n: i18n
});

Router.$avueRouter.formatRoutes(Store.getters.menuAll, true);

export default Router
