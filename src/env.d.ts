// 类型环境声明：仅服务编辑器类型服务与 vue-tsc 门禁，不参与构建；
// vite/client 与 element-plus/global 环境类型由 tsconfig 的 `types` 数组引入。

// 扩展目标使用 '@vue/runtime-core'，为 Options API 页面补齐运行时全局属性；
// @vue/runtime-core 以 devDependency 钉在与 vue 一致的版本，保证根目录可解析。
declare module '@vue/runtime-core' {
  // main.ts 挂载的 globalProperties，仅 Options API 可经 this 取用
  interface ComponentCustomProperties {
    $dayjs: typeof import('dayjs');
    website: typeof import('@/config/website').default;
    getScreen: typeof import('@/utils/util').getScreen;
    $route: import('vue-router').RouteLocationNormalizedLoaded;
    $router: import('vue-router').Router;
  }
}

declare module 'vue-router' {
  // src/router/dynamic-router.ts 运行时挂载
  interface Router {
    $dynamicRouter: import('@/router/dynamic-router').DynamicRouterManager;
  }
}

declare module 'axios' {
  // src/axios.ts 拦截器约定的自定义配置字段
  interface AxiosRequestConfig {
    /** 同源接口所属会话；公开接口与主动会话探测由调用方处理 401。 */
    meta?: {
      scope?: 'business' | 'public' | 'bff' | 'auth';
      silent?: boolean;
      sessionProbe?: boolean;
      isSerialize?: boolean;
    };
    /** 请求层内部会话代次，防止退出后的迟到响应恢复旧 UI。 */
    sessionVersion?: number;
  }
}

declare global {
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
