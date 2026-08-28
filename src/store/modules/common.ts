import { setStore, getStore, removeStore } from 'utils/store';
import website from '@/config/website';
import type { AppSetting, LayoutMode } from '@/types/setting';
import { normalizePrimaryColor } from '@/utils/theme';

const layoutSetting: Record<LayoutMode, Pick<AppSetting, 'sidebar' | 'menu'>> = {
  side: {
    sidebar: 'vertical',
    menu: false,
  },
  top: {
    sidebar: 'horizontal',
    menu: false,
  },
  mix: {
    sidebar: 'vertical',
    menu: true,
  },
};

const isSetting = (
  value: object | string | number | boolean | null | undefined
): value is Partial<AppSetting> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isLayoutMode = (value: string | undefined): value is LayoutMode => {
  return value === 'side' || value === 'top' || value === 'mix';
};

const createSetting = (storedSetting?: object | string | number | boolean | null) => {
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

const initialSetting = createSetting(getStore({ name: 'setting' }));
const common = {
  state: {
    language: getStore({ name: 'language' }) || 'zh-cn',
    isCollapse: false,
    isFullScren: false,
    isMenu: true,
    isSearch: false,
    isRefresh: true,
    isLock: getStore({ name: 'isLock' }),
    lockPasswd: getStore({ name: 'lockPasswd' }) || '',
    website: website,
    setting: initialSetting,
  },
  mutations: {
    SET_LANGUAGE: (state, language) => {
      state.language = language;
      setStore({
        name: 'language',
        content: state.language,
      });
    },
    SET_COLLAPSE: state => {
      state.isCollapse = !state.isCollapse;
    },
    SET_IS_MENU: (state, menu) => {
      state.isMenu = menu;
    },
    SET_IS_REFRESH: (state, refresh) => {
      state.isRefresh = refresh;
    },
    SET_IS_SEARCH: (state, search) => {
      state.isSearch = search;
    },
    SET_FULLSCREN: state => {
      state.isFullScren = !state.isFullScren;
    },
    SET_SETTING: (state, setting: Partial<AppSetting>) => {
      state.setting = createSetting({
        ...state.setting,
        ...setting,
      });
      setStore({
        name: 'setting',
        content: state.setting,
      });
    },
    SET_LAYOUT: (state, layout: LayoutMode) => {
      state.setting = createSetting({
        ...state.setting,
        layout,
      });
      setStore({
        name: 'setting',
        content: state.setting,
      });
    },
    RESET_SETTING: state => {
      state.setting = createSetting();
      setStore({
        name: 'setting',
        content: state.setting,
      });
    },
    SET_LOCK: state => {
      state.isLock = true;
      setStore({
        name: 'isLock',
        content: state.isLock,
        type: 'session',
      });
    },
    SET_LOCK_PASSWD: (state, lockPasswd) => {
      state.lockPasswd = lockPasswd;
      setStore({
        name: 'lockPasswd',
        content: state.lockPasswd,
        type: 'session',
      });
    },
    CLEAR_LOCK: state => {
      state.isLock = false;
      state.lockPasswd = '';
      removeStore({
        name: 'lockPasswd',
        type: 'session',
      });
      removeStore({
        name: 'isLock',
        type: 'session',
      });
    },
  },
};
export default common;
