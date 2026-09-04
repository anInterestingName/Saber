import { defineStore } from 'pinia';
import website from '@/config/website';
import type { AppSetting, LayoutMode } from '@/types/setting';
import { getStore, removeStore, setStore } from '@/utils/store';
import { normalizePrimaryColor } from '@/utils/theme';

const layoutSetting: Record<LayoutMode, Pick<AppSetting, 'sidebar' | 'menu'>> = {
  side: { sidebar: 'vertical', menu: false },
  top: { sidebar: 'horizontal', menu: false },
  mix: { sidebar: 'vertical', menu: true },
};

const isSetting = (
  value: object | string | number | boolean | null | undefined
): value is Partial<AppSetting> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isLayoutMode = (value: string | undefined): value is LayoutMode => {
  return value === 'side' || value === 'top' || value === 'mix';
};

const createSetting = (
  storedSetting?: object | string | number | boolean | null
): AppSetting => {
  const stored = isSetting(storedSetting) ? storedSetting : {};
  const legacyLayout: LayoutMode =
    stored.sidebar === 'horizontal' ? 'top' : stored.menu === false ? 'side' : 'mix';
  const layout = isLayoutMode(stored.layout) ? stored.layout : legacyLayout;
  const theme = stored.theme === 'dark' ? 'dark' : 'light';

  return {
    ...website.setting,
    ...stored,
    theme,
    colorPrimary: normalizePrimaryColor(stored.colorPrimary),
    layout,
    ...layoutSetting[layout],
  };
};

const getStoredString = (name: string, fallback = '') => {
  const value = getStore({ name });
  return typeof value === 'string' ? value : fallback;
};

export type AppLanguage = 'zh-cn' | 'en' | 'ja';

const getStoredLanguage = (): AppLanguage => {
  const language = getStoredString('language', 'zh-cn');
  return language === 'en' || language === 'ja' ? language : 'zh-cn';
};

export const useCommonStore = defineStore('common', {
  state: () => ({
    language: getStoredLanguage(),
    setting: createSetting(getStore({ name: 'setting' })),
    isCollapse: false,
    isFullscreen: false,
    isMenu: true,
    isSearch: false,
    isRefresh: true,
    isLock: getStore({ name: 'isLock' }) === true,
    lockPassword: getStoredString('lockPasswd'),
  }),
  getters: {
    layoutMode: state => state.setting.layout,
    isHorizontal: state => state.setting.layout === 'top',
  },
  actions: {
    setLanguage(language: AppLanguage) {
      this.language = language;
      setStore({ name: 'language', content: language });
    },
    toggleCollapse() {
      this.isCollapse = !this.isCollapse;
    },
    toggleFullscreen() {
      this.isFullscreen = !this.isFullscreen;
    },
    setMenuVisible(visible: boolean) {
      this.isMenu = visible;
    },
    setSearch(search: boolean) {
      this.isSearch = search;
    },
    setRefresh(refresh: boolean) {
      this.isRefresh = refresh;
    },
    setSetting(setting: Partial<AppSetting>) {
      this.setting = createSetting({ ...this.setting, ...setting });
      setStore({ name: 'setting', content: this.setting });
    },
    setLayout(layout: LayoutMode) {
      this.setting = createSetting({ ...this.setting, layout });
      setStore({ name: 'setting', content: this.setting });
    },
    resetSetting() {
      this.setting = createSetting();
      setStore({ name: 'setting', content: this.setting });
    },
    lock() {
      this.isLock = true;
      setStore({ name: 'isLock', content: true, type: 'session' });
    },
    setLockPassword(password: string) {
      this.lockPassword = password;
      setStore({ name: 'lockPasswd', content: password, type: 'session' });
    },
    clearLock() {
      this.isLock = false;
      this.lockPassword = '';
      removeStore({ name: 'lockPasswd', type: 'session' });
      removeStore({ name: 'isLock', type: 'session' });
    },
  },
});
