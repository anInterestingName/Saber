import { defineStore } from 'pinia';
import { ElMessage } from 'element-plus';
import {
  getButtons,
  getUserInfo,
  loginBySocial,
  loginByUsername,
  logout,
  refreshToken,
} from '@/api/user';
import { getRoutes, getTopMenu } from '@/api/system/menu';
import type { MenuItem } from '@/types/menu';
import { formatMenuPaths } from '@/router/menu';
import { removeRefreshToken, removeToken, setRefreshToken, setToken } from '@/utils/auth';
import { encrypt } from '@/utils/sm2';
import { getStore, removeStore, setStore } from '@/utils/store';
import { deepClone } from '@/utils/util';
import { useCommonStore } from './common';
import { useTagsStore } from './tags';

export interface UserInfo {
  userId?: string | number;
  userName?: string;
  account?: string;
  avatar?: string;
  authority?: string;
  oauthId?: string | number;
  accessToken?: string;
  refreshToken?: string;
}

export interface PermissionMap {
  [code: string]: boolean | undefined;
}

export interface LoginPayload {
  tenantId?: string;
  username?: string;
  password?: string;
  type?: string;
  key?: string;
  code?: string;
  source?: string;
  state?: string;
  phone?: string;
}

interface PermissionNode {
  code?: string;
  children?: PermissionNode[];
}

interface UserContextResponse extends UserInfo {
  roles?: string[];
  user?: UserInfo;
  userInfo?: UserInfo;
}

const userInfoKeys: Array<keyof UserInfo> = [
  'userId',
  'userName',
  'account',
  'avatar',
  'authority',
  'oauthId',
  'accessToken',
  'refreshToken',
];

const normalizeUserInfo = (
  value: object | string | number | boolean | null | undefined
): UserInfo | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return userInfoKeys.some(key => Reflect.has(value, key)) ? (value as UserInfo) : null;
};

const normalizePermission = (
  value: object | string | number | boolean | null | undefined
): PermissionMap => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as PermissionMap)
    : {};
};

const normalizeMenu = (value: object | string | number | boolean | null | undefined) => {
  return Array.isArray(value) ? (value as MenuItem[]) : [];
};

const getStoredString = (name: string) => {
  const value = getStore({ name });
  return typeof value === 'string' ? value : '';
};

const buildPermissionMap = (nodes: PermissionNode[] = []) => {
  const permission: PermissionMap = {};
  const collect = (list: PermissionNode[]) => {
    list.forEach(node => {
      if (node.children?.length) {
        collect(node.children);
      } else if (node.code) {
        permission[node.code] = true;
      }
    });
  };
  collect(nodes);
  return permission;
};

export const useUserStore = defineStore('user', {
  state: () => ({
    userInfo: normalizeUserInfo(getStore({ name: 'userInfo' })),
    permission: normalizePermission(getStore({ name: 'permission' })),
    roles: [] as string[],
    menu: normalizeMenu(getStore({ name: 'menu' })),
    menuAll: normalizeMenu(getStore({ name: 'menuAll' })),
    token: getStoredString('token'),
    refreshToken: getStoredString('refreshToken'),
  }),
  getters: {
    hasUserInfo: state => state.userInfo !== null,
    isAdmin: state => state.userInfo?.authority?.includes('admin') ?? false,
  },
  actions: {
    setTokenValue(token: string) {
      this.token = token;
      setToken(token);
      setStore({ name: 'token', content: token });
    },
    setRefreshTokenValue(token: string) {
      this.refreshToken = token;
      setRefreshToken(token);
      setStore({ name: 'refreshToken', content: token });
    },
    setUserInfo(userInfo: UserInfo | null) {
      this.userInfo = userInfo;
      if (userInfo) {
        setStore({ name: 'userInfo', content: userInfo });
      } else {
        removeStore({ name: 'userInfo' });
      }
    },
    setRoles(roles: string[]) {
      this.roles = Array.isArray(roles) ? roles : [];
    },
    setMenu(menu: MenuItem[]) {
      this.menu = menu;
      setStore({ name: 'menu', content: menu });
    },
    mergeMenuAll(menuAll: MenuItem[]) {
      const merged = [...this.menuAll];
      menuAll.forEach(menuItem => {
        const index = merged.findIndex(item => item.path === menuItem.path);
        if (index === -1) merged.push(menuItem);
        else merged[index] = menuItem;
      });
      this.menuAll = merged;
      setStore({ name: 'menuAll', content: merged });
    },
    setPermission(permission: PermissionMap) {
      this.permission = permission;
      if (Object.keys(permission).length > 0) {
        setStore({ name: 'permission', content: permission, type: 'session' });
      } else {
        removeStore({ name: 'permission', type: 'session' });
      }
    },
    completeLogin(data: UserInfo) {
      if (!data.accessToken) throw new Error('登录响应缺少访问令牌');
      this.clearSession();
      this.setTokenValue(data.accessToken);
      if (data.refreshToken) this.setRefreshTokenValue(data.refreshToken);
      this.setUserInfo(data);
      this.setPermission({});
      useTagsStore().resetTags();
      useCommonStore().clearLock();
    },
    async LoginByUsername(userInfo: LoginPayload = {}) {
      const response = await loginByUsername(
        userInfo.tenantId,
        userInfo.username,
        encrypt(userInfo.password),
        userInfo.type,
        userInfo.key,
        userInfo.code
      );
      const result = response.data;
      if (!result.success) {
        const message = result.msg || '登录失败';
        ElMessage.error(message);
        throw new Error(message);
      }
      this.completeLogin(result.data);
    },
    async LoginBySocial(userInfo: LoginPayload) {
      const response = await loginBySocial(
        userInfo.tenantId,
        userInfo.source,
        userInfo.code,
        userInfo.state
      );
      const result = response.data;
      if (!result.success) {
        const message = result.msg || '登录失败';
        ElMessage.error(message);
        throw new Error(message);
      }
      this.completeLogin(result.data);
    },
    async LoginByPhone(userInfo: LoginPayload) {
      const response = await loginByUsername(userInfo.phone, userInfo.code);
      const result = response.data;
      if (result.success === false) {
        const message = result.msg || '登录失败';
        ElMessage.error(message);
        throw new Error(message);
      }
      const data = result.data;
      if (typeof data === 'string') {
        this.clearSession();
        this.setTokenValue(data);
        this.setPermission({});
        useTagsStore().resetTags();
        useCommonStore().clearLock();
        return;
      }
      this.completeLogin(data);
    },
    async GetUserInfo() {
      try {
        const response = await getUserInfo();
        const data = response.data.data as UserContextResponse;
        const roles = Array.isArray(data.roles) ? data.roles : [];
        const recoveredUser =
          normalizeUserInfo(data.userInfo) || normalizeUserInfo(data.user) || normalizeUserInfo(data);
        this.setRoles(roles);
        if (recoveredUser) {
          this.setUserInfo({ ...this.userInfo, ...recoveredUser });
        } else if (!this.userInfo) {
          this.setUserInfo({ authority: roles.join(',') });
        }
        return data;
      } catch (error) {
        this.setUserInfo(null);
        this.setRoles([]);
        throw error;
      }
    },
    async RefreshToken() {
      const response = await refreshToken(this.refreshToken);
      const data = response.data.data;
      this.setTokenValue(data.accessToken);
      this.setRefreshTokenValue(data.refreshToken);
      this.setUserInfo(data);
      return response.data;
    },
    clearSession() {
      removeToken();
      removeRefreshToken();
      this.token = '';
      this.refreshToken = '';
      this.userInfo = null;
      this.permission = {};
      this.roles = [];
      this.menu = [];
      this.menuAll = [];
      removeStore({ name: 'token' });
      removeStore({ name: 'refreshToken' });
      removeStore({ name: 'userInfo' });
      removeStore({ name: 'permission', type: 'session' });
      removeStore({ name: 'menu' });
      removeStore({ name: 'menuAll' });
      useTagsStore().resetTags();
      useCommonStore().clearLock();
    },
    async LogOut() {
      await logout();
      this.clearSession();
    },
    async FedLogOut() {
      this.clearSession();
    },
    async GetTopMenu() {
      const response = await getTopMenu();
      return response.data.data || [];
    },
    async GetMenu(topMenuId?: string | number) {
      const response = await getRoutes(topMenuId === undefined ? undefined : String(topMenuId));
      const menu = deepClone(response.data.data || []) as MenuItem[];
      menu.forEach(menuItem => formatMenuPaths(menuItem, true));
      this.setMenu(menu);
      this.mergeMenuAll(menu);
      void this.GetButtons().catch(() => undefined);
      return menu;
    },
    async GetButtons() {
      this.setPermission({});
      const response = await getButtons();
      const nodes = Array.isArray(response.data.data) ? response.data.data : [];
      this.setPermission(buildPermissionMap(nodes));
    },
  },
});
