import type { RouteLocationNormalized, RouteRecordRaw, Router } from 'vue-router';
import type { MenuItem, MenuMeta } from '@/types/menu';
import type { TagItem, useTagsStore } from '@/store/tags';

const modules = import.meta.glob<{ default: { name?: string } }>('../**/**/*.vue');

const isURL = (value?: string) => /^https?:\/\/.*/.test(value ?? '');

interface InstallOptions {
  router: Router;
  tagsStore: ReturnType<typeof useTagsStore>;
  i18n: { global: { t: (key: string) => string; te: (key: string) => boolean } };
  keepAlive?: boolean;
}

export interface DynamicRouterManager {
  setTitle: (title?: string) => void;
  closeTag: (value?: string | TagItem) => void;
  generateTitle: (
    item: MenuItem | RouteLocationNormalized,
    props?: { query?: string; label?: string; meta?: string }
  ) => string;
  formatRoutes: (menu?: MenuItem[], first?: boolean) => RouteRecordRaw[] | void;
}

type DynamicRouteRecord = RouteRecordRaw & {
  icon?: string;
  query?: MenuItem['query'];
};

export const installDynamicRouter = (options: InstallOptions) => {
  const { router, tagsStore, i18n, keepAlive } = options;
  const setTitle = (title?: string) => {
    const defaultTitle = i18n.global.t('title');
    document.title = title ? `${title} | ${defaultTitle}` : defaultTitle;
  };

  const closeTag = (value?: string | TagItem) => {
    let tag = typeof value === 'string' ? undefined : value || tagsStore.currentTag || undefined;
    if (typeof value === 'string') {
      tag = tagsStore.tagList.find(item => item.fullPath === value);
    }
    if (tag) tagsStore.deleteTag(tag);
  };

  const generateTitle = (
    item: MenuItem | RouteLocationNormalized,
    props: { query?: string; label?: string; meta?: string } = {}
  ) => {
    const query = Reflect.get(item, props.query || 'query') as MenuItem['query'];
    const label = Reflect.get(item, props.label || 'name');
    const meta = Reflect.get(item, props.meta || 'meta') as MenuMeta;
    const title = query?.name || String(label ?? '');
    if (meta?.i18n && i18n.global.te(`route.${meta.i18n}`)) {
      return i18n.global.t(`route.${meta.i18n}`);
    }
    return title.split(',')[0];
  };

  const formatRoutes = (menu: MenuItem[] = [], first?: boolean): RouteRecordRaw[] | void => {
    if (menu.length === 0) return first ? undefined : [];
    const routes: RouteRecordRaw[] = [];
    for (const menuItem of menu) {
      const path = menuItem.path ?? '';
      const children = menuItem.children ?? [];
      const isChild = children.length > 0;
      const meta = menuItem.meta ?? {};
      if (keepAlive) meta.keepAlive = true;
      const component = menuItem.component;
      const viewModule = component ? modules[`../${component}.vue`] : undefined;
      const route: DynamicRouteRecord = {
        path,
        component: first
          ? modules['../page/index/index.vue']
          : isChild
            ? modules['../page/index/layout.vue']
            : viewModule,
        name: `${menuItem.name ?? ''},${menuItem.id ?? ''}`,
        icon: menuItem.source,
        meta,
        query: menuItem.query,
        redirect: !isChild && first ? path : '',
        children: [],
      };

      if (!isChild && first) {
        menuItem.path = path;
        if (viewModule) {
          void viewModule().then(module => {
            module.default.name = path;
          });
        } else if (component) {
          console.error(`动态页面组件不存在: ${component}`);
        }
        const childRoute: DynamicRouteRecord = {
          path: '',
          component: viewModule,
          name: route.name,
          icon: menuItem.source,
          meta,
          query: menuItem.query,
        };
        route.children = [childRoute];
      } else if (isChild) {
        const childRoutes = formatRoutes(children, false);
        route.children = Array.isArray(childRoutes) ? childRoutes : [];
      }

      if (!isURL(path)) routes.push(route);
    }
    if (first) {
      routes.forEach(route => router.addRoute(route));
      return;
    }
    return routes;
  };

  const manager: DynamicRouterManager = {
    setTitle,
    closeTag,
    generateTitle,
    formatRoutes,
  };
  router.$dynamicRouter = manager;
};
