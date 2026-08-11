// 类型环境声明：仅服务编辑器类型服务与 vue-tsc 门禁，不参与构建；
// vite/client 与 element-plus/global 环境类型由 tsconfig 的 `types` 数组引入。

// 扩展目标须为 '@vue/runtime-core'：@smallwei/avue 已在该模块上扩展 ComponentCustomProperties，
// 对 'vue' 再扩展不会并入同一接口，vue-router/vuex 的 $route/$router/$store 因此未生效，在此补齐；
// @vue/runtime-core 以 devDependency 钉在与 vue 一致的版本，保证根目录可解析。
declare module '@vue/runtime-core' {
  // main.ts 挂载的 globalProperties，仅 Options API 可经 this 取用
  interface ComponentCustomProperties {
    $dayjs: typeof import('dayjs');
    website: typeof import('@/config/website').default;
    getScreen: typeof import('@/utils/util').getScreen;
    $store: import('vuex').Store<object>;
    $route: import('vue-router').RouteLocationNormalizedLoaded;
    $router: import('vue-router').Router;
  }
}

declare module 'vue-router' {
  // src/router/avue-router.ts 的 install() 运行时挂载
  interface Router {
    $avueRouter: {
      safe: object;
      setTitle: (title?: string) => void;
      /** 不传则关闭当前标签；传字符串按 fullPath 匹配；也可直接传标签对象 */
      closeTag: (value?: string | object) => void;
      generateTitle: (
        item: object,
        props?: { query?: string; label?: string; meta?: string }
      ) => string;
      formatRoutes: (aMenu?: object[], first?: boolean) => void;
    };
  }
}

declare module 'axios' {
  // src/axios.ts 拦截器约定的自定义配置字段
  interface AxiosRequestConfig {
    /** 请求元信息：isToken 是否携带令牌（默认携带）；isSerialize 是否表单序列化提交 */
    meta?: { isToken?: boolean; isSerialize?: boolean };
    /** 以 AES 加密令牌头（crypto 前缀） */
    cryptoToken?: boolean;
  }
}

declare global {
  interface Window {
    // main.ts 挂载；$crudCommon 供代码生成页面消费
    axios: import('axios').AxiosStatic;
    $crudCommon: typeof import('@/mixins/crud.js').default;
  }

  // utils/util.ts 全屏三函数的旧内核兜底分支所需的浏览器前缀成员（标准 lib.dom 未收录）
  interface Document {
    webkitIsFullScreen?: boolean;
    webkitFullscreenElement?: Element | null;
    mozFullScreenElement?: Element | null;
    webkitExitFullscreen?: () => void;
    mozCancelFullScreen?: () => void;
  }
  interface HTMLElement {
    webkitRequestFullscreen?: () => void;
    mozRequestFullScreen?: () => void;
  }

  // utils/util.ts openWindow 的 Firefox 旧属性兜底分支
  interface Screen {
    left?: number;
    top?: number;
  }
}

export {};
