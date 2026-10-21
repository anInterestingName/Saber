import type { RouteRecordRaw } from 'vue-router';
// 显式标注为路由记录数组：字面量推断出的联合类型会与 RouteRecordRaw 的重定向分支互斥而无法赋值
const routes: RouteRecordRaw[] = [
  {
    path: '/auth/login',
    name: '认证登录',
    component: () => import('@/page/auth/login.vue'),
    meta: { isAuth: false, isTab: false, authorization: true },
  },
  {
    path: '/auth/consent',
    name: '授权确认',
    component: () => import('@/page/auth/consent.vue'),
    meta: { isAuth: false, isTab: false, authorization: true },
  },
  {
    path: '/auth/verify',
    name: '登录验证',
    component: () => import('@/page/auth/verify.vue'),
    meta: { isAuth: false, isTab: false, authorization: true },
  },
  {
    path: '/auth/register',
    name: '注册',
    component: () => import('@/page/auth/register.vue'),
    meta: { isAuth: false, isTab: false, authorization: true },
  },
  {
    path: '/login',
    redirect: '/auth/login',
  },
  {
    path: '/lock',
    name: '锁屏页',
    component: () => import('@/page/lock/index.vue'),
    meta: {
      keepAlive: true,
      isTab: false,
      isAuth: true,
    },
  },
  {
    path: '/404',
    component: () => import(/* webpackChunkName: "page" */ '@/components/error-page/404.vue'),
    name: '404',
    meta: {
      keepAlive: true,
      isTab: false,
      isAuth: false,
    },
  },
  {
    path: '/403',
    component: () => import(/* webpackChunkName: "page" */ '@/components/error-page/403.vue'),
    name: '403',
    meta: {
      keepAlive: true,
      isTab: false,
      isAuth: false,
    },
  },
  {
    path: '/500',
    component: () => import(/* webpackChunkName: "page" */ '@/components/error-page/500.vue'),
    name: '500',
    meta: {
      keepAlive: true,
      isTab: false,
      isAuth: false,
    },
  },
  {
    path: '/',
    name: '主页',
    redirect: '/wel',
  },
];

export default routes;
