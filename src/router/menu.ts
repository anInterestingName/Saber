import website from '@/config/website';
import type { MenuItem } from '@/types/menu';
import { getToken } from '@/utils/auth';

const isURL = (value?: string) => /^https?:\/\/.*/.test(value ?? '');

const createIframeUrl = (href: string) => {
  let processedHref = href.replace(/&/g, '#');
  if (processedHref.includes('${token}')) {
    processedHref = processedHref.replace(/\$\{token\}/g, getToken() ?? '');
  }
  return processedHref;
};

export const formatMenuPaths = (menuItem: MenuItem, first?: boolean) => {
  menuItem.source = menuItem.source || website.menu.iconDefault;
  menuItem.meta = menuItem.meta || {};
  const iframeComponent = 'components/iframe/main';
  const children = menuItem.children ?? [];
  const isChild = children.length > 0;

  if (!isChild && first) {
    menuItem.component = `views${menuItem.path ?? ''}`;
    if (isURL(menuItem.path)) {
      menuItem.component = iframeComponent;
      menuItem.query = { url: createIframeUrl(menuItem.path ?? '') };
    }
    return;
  }

  children.forEach(child => {
    child.component = `views${child.path ?? ''}`;
    if (isURL(child.path)) {
      const href = child.path ?? '';
      child.path = `${menuItem.path ?? ''}/${child.code ?? ''}`;
      child.component = iframeComponent;
      child.query = { url: createIframeUrl(href) };
    }
    formatMenuPaths(child);
  });
};
