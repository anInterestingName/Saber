import website from '@/config/website'
import { getToken } from '@/utils/auth';
import type { Router } from 'vue-router';
import type { Store } from 'vuex';
import type { MenuItem } from '@/types/menu';

// 视图模块表：动态路由按约定路径取用；首路由的子路由在加载后回写 default.name，
// 使 keep-alive 以标签地址为缓存键，泛型即为该回写面所需的模块形状
const modules = import.meta.glob<{ default: { name?: string } }>('../**/**/*.vue')
function isURL (s) {
  return /^http[s]?:\/\/.*/.test(s)
}

// install 的消费面：i18n 仅取全局翻译器的 t / te，收窄为结构类型以避开联合实例的泛型噪声
interface InstallOption {
  router?: Router;
  store?: Store<object>;
  i18n?: { global: { t: (key: string) => string; te: (key: string) => boolean } };
  keepAlive?: boolean;
}

// 插件本体写成对象字面量而非函数对象：函数类型上挂 install 属性在 TS 中不成立，
// 且对象形态下 install 内的 this 有确定类型，$router / $store 的读写无需任何断言
const RouterPlugin = {
  $router: null as Router,
  $store: null as Store<object>,
  install (option: InstallOption = {}) {
    this.$router = option.router;
    this.$store = option.store;
    const i18n = option.i18n.global
    this.$router.$avueRouter = {
      safe: this,
      // 设置标题
      setTitle: (title) => {
        const defaultTitle = i18n.t('title');
        title = title ? `${title} | ${defaultTitle}` : defaultTitle;
        document.title = title;
      },
      closeTag: (value) => {
        let tag = value || this.$store.getters.tag;
        if (typeof value === 'string') {
          tag = this.$store.getters.tagList.find(ele => ele.fullPath === value)
        }
        this.$store.commit('DEL_TAG', tag)
      },
      generateTitle: (item: MenuItem, props: { query?: string; label?: string; meta?: string } = {}) => {
        const query = item[props.query || 'query'] || {}
        const title = query.name || item[props.label || 'label']
        const meta = item[props.meta || 'meta'] || {}
        const key = meta.i18n
        if (key) {
          const hasKey = i18n.te('route.' + key)
          if (hasKey) return i18n.t('route.' + key)
        }
        return title.split(',')[0];
      },
      //动态路由
      formatRoutes: function (aMenu: MenuItem[] = [], first?: boolean) {
        const aRouter = []
        const propsDefault = website.menu
        if (aMenu && aMenu.length === 0) return;
        for (let i = 0; i < aMenu.length; i++) {
          const oMenu = aMenu[i];
          let path = oMenu[propsDefault.path],
            isComponent = true,
            component = oMenu.component,
            name = oMenu[propsDefault.label] + ',' + oMenu.id,
            icon = oMenu[propsDefault.icon],
            children = oMenu[propsDefault.children],
            query = oMenu[propsDefault.query],
            meta = oMenu[propsDefault.meta];
          if (option.keepAlive) {
            meta.keepAlive = option.keepAlive
          }
          const isChild = !!(children && children.length !== 0);
          const oRouter = {
            path: path,
            component: (() => {
              // 判断是否为首路由
              if (first) {
                return modules[option.store.getters.isMacOs ? '../page/index/layout.vue' : '../page/index/index.vue']
                // 判断是否为多层路由
              } else if (isChild && !first) {
                return modules['../page/index/layout.vue']
                // 判断是否为最终的页面视图
              } else {
                const result = modules[`../${component}.vue`];
                if (!result){
                  isComponent = false;
                }
                return result;
              }
            })(),
            name,
            icon,
            meta,
            query,
            redirect: (() => {
              if (!isChild && first) return `${path}`
              else return '';
            })(),
            // 处理是否为一级路由
            children: !isChild ? (() => {
              if (first) {
                oMenu[propsDefault.path] = `${path}`;
                const result = modules[`../${component}.vue`]
                if (result) result().then(mod => mod.default.name = path)
                else { console.log(component + '不存在') }
                return [{
                  component: result,
                  icon: icon,
                  name: name,
                  meta: meta,
                  query: query,
                  path: ''
                }]
              }
              return [];
            })() : (() => {
              return this.formatRoutes(children, false)
            })()
          }
          if (!isURL(path)) aRouter.push(oRouter)
        }
        if (first) {
          aRouter.forEach((ele) => this.safe.$router.addRoute(ele))
        } else {
          return aRouter
        }

      }
    };
  },
};
export const formatPath = (ele, first?: boolean) => {
  const propsDefault = website.menu;
  const icon = ele[propsDefault.icon];
  ele[propsDefault.icon] = !icon ? propsDefault.iconDefault : icon;
  ele.meta = ele.meta || {}
  const iframeComponent = 'components/iframe/main';
  const iframeSrc = (href) => {
    // 替换&为#
    let processedHref = href.replace(/&/g, '#');

    // 检查URL中是否包含${token}，如果有则使用getToken()替换
    if (processedHref.includes('${token}')) {
      const token = getToken();
      processedHref = processedHref.replace(/\${token}/g, token);
    }
    return processedHref;
  }
  const isChild = !!(ele[propsDefault.children] && ele[propsDefault.children].length !== 0);
  if (!isChild && first) {
    ele.component = 'views' + ele[propsDefault.path]
    if (isURL(ele[propsDefault.href])) {
      let href = ele[propsDefault.href]
      ele.component = iframeComponent
      ele[propsDefault.query] = { url: iframeSrc(href) }
    }
  } else {
    ele[propsDefault.children] && ele[propsDefault.children].forEach(child => {
      child.component = 'views' + child[propsDefault.path]
      if (isURL(child[propsDefault.href])) {
        let href = child[propsDefault.href]
        child[propsDefault.path] = ele[propsDefault.path] + '/' + child.code
        child.component = iframeComponent
        child[propsDefault.query] = { url: iframeSrc(href) }
      }
      formatPath(child);
    })
  }
}
export default RouterPlugin;
