import router from './router/'
import store from './store'
import { validateNull } from '@/utils/validate'
import { getToken } from '@/utils/auth'
import NProgress from 'nprogress' // progress bar
import 'nprogress/nprogress.css' // progress bar style
NProgress.configure({ showSpinner: false });
const lockPage = '/lock'; //锁屏页

// 懒加载路由组件：本工程的路由组件只有两种登记形态——静态导入的模块对象，
// 与 import() 产出的模块加载器，函数形态即后者，加载完成后回写 default.name 供 keep-alive 按标签地址缓存
type LazyRouteComponent = () => Promise<{ default: { name?: string } }>;

router.beforeEach((to, from, next) => {
  // 获取匹配的路由数组
  const matchedRoutes = to.matched;
  const component = matchedRoutes.length > 0 ? matchedRoutes[matchedRoutes.length - 1].components.default : null;
  if (component && typeof (component) == 'function') {
    (component as LazyRouteComponent)().then(mod => {
      mod.default.name = to.fullPath
    });
  }
  const meta = to.meta || {};
  const isMenu = meta.menu === undefined ? to.query.menu : meta.menu;
  store.commit('SET_IS_MENU', isMenu === undefined);
  if (getToken()) {
    if (store.getters.isLock && to.path !== lockPage) { //如果系统激活锁屏，全部跳转到锁屏页
      next({ path: lockPage })
    } else if (to.path === '/login') { //如果登录成功访问登录页跳转到主页
      next({ path: '/' })
    } else {
      //如果用户信息为空则获取用户信息，获取用户信息失败，跳转到登录页
      if (!store.getters.userInfo) {
        store.dispatch('GetUserInfo').then(() => {
          next({ ...to, replace: true })
        }).catch(() => {
          store.dispatch('FedLogOut').then(() => {
            next({ path: '/login' })
          })
        })
      } else {
        const meta = to.meta || {}
        const query = to.query || {}
        if (meta.target) {
          // 外链地址由菜单 query 下发，路由 query 的值域为 string | string[]，按外链约定断言为字符串
          window.open((query.url as string).replace(/#/g, "&"))
          return
        } else if (meta.isTab !== false) {
          store.commit('ADD_TAG', {
            name: query.name || to.name,
            path: to.path,
            fullPath: to.path,
            params: to.params,
            query: to.query,
            meta: meta
          });
        }
        next()
      }
    }
  } else {
    //判断是否需要认证，没有登录访问去登录页
    if (meta.isAuth === false) {
      next()
    } else {
      next('/login')
    }
  }
})

router.afterEach(to => {
  NProgress.done();
  let title = router.$dynamicRouter.generateTitle(to, { label: 'name' })
  router.$dynamicRouter.setTitle(title);
  store.commit('SET_IS_SEARCH', false)
});
