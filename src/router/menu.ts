import website from '@/config/website';
import type { MenuItem } from '@/types/menu';

const isURL = (value?: string) => /^https?:\/\//i.test(value || '');

/** 旧凭据占位符必须更新菜单，不能替换为空后继续访问。 */
export const getSafeExternalUrl = (href: string): string | null => {
  try {
    const decoded = decodeURIComponent(href);
    if (/\$\{token\}|[\u0000-\u001f\u007f]/i.test(decoded)) return null;
    const url = new URL(href, window.location.origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    if (
      [...url.searchParams.keys()].some(key => /token|password|secret|authorization/i.test(key))
    ) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
};

const setExternalMenu = (item: MenuItem, href: string) => {
  item.component = 'components/iframe/main';
  item.query = { url: getSafeExternalUrl(href) || '' };
};

export const formatMenuPaths = (menuItem: MenuItem, first?: boolean) => {
  menuItem.source = menuItem.source || website.menu.iconDefault;
  menuItem.meta = menuItem.meta || {};
  const children = menuItem.children || [];
  if (!children.length && first) {
    menuItem.component = `views${menuItem.path || ''}`;
    if (isURL(menuItem.path)) {
      const href = menuItem.path;
      menuItem.path = `/external-menu/${
        menuItem.id || menuItem.code || encodeURIComponent(menuItem.name || 'link')
      }`;
      setExternalMenu(menuItem, href);
    }
    return;
  }
  children.forEach(child => {
    child.component = `views${child.path || ''}`;
    if (isURL(child.path)) {
      const href = child.path;
      child.path = `${menuItem.path || ''}/${child.code || ''}`;
      setExternalMenu(child, href);
    }
    formatMenuPaths(child);
  });
};
