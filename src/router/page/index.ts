import Store from '@/store/'
import type { RouteRecordRaw } from 'vue-router'
// 显式标注为路由记录数组：字面量推断出的联合类型会与 RouteRecordRaw 的重定向分支互斥而无法赋值
const routes: RouteRecordRaw[] = [{
  path: '/login',
  name: '登录页',
  component: () =>
    Store.getters.isMacOs ? import('@/mac/login.vue') : import('@/page/login/index.vue'),
  meta: {
    keepAlive: true,
    isTab: false,
    isAuth: false
  }
},
{
  path: '/lock',
  name: '锁屏页',
  component: () =>
    Store.getters.isMacOs ? import('@/mac/lock.vue') : import('@/page/lock/index.vue'),
  meta: {
    keepAlive: true,
    isTab: false,
    isAuth: false
  }
},
{
  path: '/404',
  component: () =>
    import( /* webpackChunkName: "page" */ '@/components/error-page/404.vue'),
  name: '404',
  meta: {
    keepAlive: true,
    isTab: false,
    isAuth: false
  }

},
{
  path: '/403',
  component: () =>
    import( /* webpackChunkName: "page" */ '@/components/error-page/403.vue'),
  name: '403',
  meta: {
    keepAlive: true,
    isTab: false,
    isAuth: false
  }
},
{
  path: '/500',
  component: () =>
    import( /* webpackChunkName: "page" */ '@/components/error-page/500.vue'),
  name: '500',
  meta: {
    keepAlive: true,
    isTab: false,
    isAuth: false
  }
},
{
  path: '/',
  name: '主页',
  redirect: '/wel'
}]

export default routes
