import Layout from '@/page/index/index.vue';
import type { RouteRecordRaw } from 'vue-router';
// 显式标注为路由记录数组：字面量推断出的联合类型会与 RouteRecordRaw 的重定向分支互斥而无法赋值
const routes: RouteRecordRaw[] = [
  {
    path: '/wel',
    component: Layout,
    redirect: '/wel/index',
    children: [
      {
        path: 'index',
        name: '首页',
        meta: {
          i18n: 'dashboard',
        },
        component: () => import(/* webpackChunkName: "views" */ '@/views/wel/index.vue'),
      },
      {
        path: 'more',
        name: '控制台',
        meta: {
          i18n: 'more',
          menu: false,
        },
        component: () => import(/* webpackChunkName: "views" */ '@/views/wel/dashboard.vue'),
      },
    ],
  },
  {
    path: '/iframe',
    component: Layout,
    redirect: '/iframe',
    children: [
      {
        path: '',
        name: '',
        component: () => import(/* webpackChunkName: "views" */ '@/components/iframe/main.vue'),
      },
    ],
  },
  {
    path: '/info',
    component: Layout,
    redirect: '/info/index',
    children: [
      {
        path: 'index',
        name: '个人信息',
        meta: {
          i18n: 'info',
        },
        component: () => import(/* webpackChunkName: "views" */ '@/views/user/info.vue'),
      },
    ],
  },
];

export default routes;
