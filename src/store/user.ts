import { defineStore } from 'pinia';
import { getButtons } from '@/api/user';
import { getUserInfo } from '@/api/system/user';
import { getRoutes, getTopMenu } from '@/api/system/menu';
import { logoutBff } from '@/api/authorization';
import { getRequestSessionVersion, resetRequestSession, SessionChangedError } from '@/axios';
import { formatMenuPaths } from '@/router/menu';
import type { MenuItem } from '@/types/menu';
import type { PermissionNode, UserProfile } from '@/types/auth';
import { clearReturnPath } from '@/utils/auth';
import { useCommonStore } from './common';
import { useTagsStore } from './tags';
import { useLogsStore } from './logs';

export interface UserInfo {
  userId: string;
  tenantId: string;
  userName: string;
  account: string;
  avatar?: string;
  authority: string[];
}

export interface PermissionMap {
  [code: string]: boolean | undefined;
}

let sessionCleanup: () => void;
let menuRequestVersion = 0;
let logoutTask: Promise<void> | null = null;
export const setSessionCleanupHandler = (handler: () => void) => {
  sessionCleanup = handler;
};

const normalizeUserInfo = (profile: UserProfile): UserInfo => {
  if (
    !profile ||
    typeof profile.id !== 'string' ||
    !profile.id ||
    typeof profile.tenantId !== 'string' ||
    !profile.tenantId ||
    typeof profile.account !== 'string' ||
    !profile.account ||
    !Array.isArray(profile.roles) ||
    profile.roles.some(role => typeof role !== 'string' || !role)
  )
    throw new Error('用户资料或角色编码不完整，请重新加载');
  return {
    userId: profile.id,
    tenantId: profile.tenantId,
    userName: profile.name || profile.account,
    account: profile.account,
    avatar: profile.avatar,
    authority: [...new Set(profile.roles)],
  };
};

const normalizeMenu = (value: MenuItem[]) => {
  if (!Array.isArray(value)) throw new Error('菜单响应不完整，请重新加载');
  const menu = structuredClone(value);
  menu.forEach(item => formatMenuPaths(item, true));
  return menu;
};

const buildPermissionMap = (nodes: PermissionNode[]) => {
  if (!Array.isArray(nodes)) throw new Error('按钮权限响应不完整，请重新加载');
  const permission: PermissionMap = {};
  const collect = (list: PermissionNode[]) => {
    for (const node of list) {
      if (!node || (node.children !== undefined && !Array.isArray(node.children))) {
        throw new Error('按钮权限响应不完整，请重新加载');
      }
      if (node.children?.length) collect(node.children);
      else if (node.code) permission[node.code] = true;
    }
  };
  collect(nodes);
  return permission;
};

const assertVersion = (version: number) => {
  if (version !== getRequestSessionVersion()) throw new SessionChangedError();
};

export const useUserStore = defineStore('user', {
  state: () => ({
    userInfo: null as UserInfo | null,
    permission: {} as PermissionMap,
    roles: [] as string[],
    menu: [] as MenuItem[],
    menuAll: [] as MenuItem[],
    topMenu: [] as MenuItem[],
  }),
  getters: {
    hasUserInfo: state => state.userInfo !== null,
    // 与后端 RoleConstant.HAS_ROLE_ADMIN 保持一致，原始角色别名不做转换。
    isAdmin: state =>
      state.userInfo?.authority.some(role => role === 'administrator' || role === 'admin') ?? false,
  },
  actions: {
    async initializeContext(subject: string) {
      const version = getRequestSessionVersion();
      const profile = normalizeUserInfo((await getUserInfo({ silent: true })).data.data);
      assertVersion(version);
      if (profile.userId !== subject) throw new Error('当前身份与用户资料不一致，请重新登录');
      const [routes, top, buttons] = await Promise.all([
        getRoutes(undefined, { silent: true }),
        getTopMenu({ silent: true }),
        getButtons(),
      ]);
      assertVersion(version);
      const menu = normalizeMenu(routes.data.data);
      if (!Array.isArray(top.data.data)) throw new Error('顶部菜单响应不完整，请重新加载');
      const permission = buildPermissionMap(buttons.data.data);
      // 资料、角色、菜单和按钮全部成功后，才提交同一代次的业务上下文。
      this.$patch({
        userInfo: profile,
        roles: profile.authority,
        menu,
        menuAll: menu,
        topMenu: structuredClone(top.data.data),
        permission,
      });
    },
    async GetUserInfo() {
      const version = getRequestSessionVersion();
      const response = await getUserInfo();
      const profile = normalizeUserInfo(response.data.data);
      assertVersion(version);
      this.userInfo = profile;
      this.roles = profile.authority;
      return response.data.data;
    },
    clearSession() {
      resetRequestSession();
      menuRequestVersion += 1;
      this.$patch({
        userInfo: null,
        permission: {},
        roles: [],
        menu: [],
        menuAll: [],
        topMenu: [],
      });
      useTagsStore().resetTags();
      useCommonStore().clearLock();
      useLogsStore().clearLogs();
      sessionCleanup?.();
    },
    LogOut(): Promise<void> {
      if (!logoutTask) {
        const version = getRequestSessionVersion();
        const task = logoutBff().then(() => {
          assertVersion(version);
          clearReturnPath();
          this.clearSession();
        });
        logoutTask = task;
        void task.then(
          () => {
            if (logoutTask === task) logoutTask = null;
          },
          () => {
            if (logoutTask === task) logoutTask = null;
          }
        );
      }
      return logoutTask;
    },
    async FedLogOut() {
      this.clearSession();
    },
    async GetTopMenu() {
      return this.topMenu;
    },
    async GetMenu(topMenuId?: string | number) {
      const version = getRequestSessionVersion();
      const requestVersion = ++menuRequestVersion;
      const [routes, buttons] = await Promise.all([
        getRoutes(topMenuId === undefined ? undefined : String(topMenuId)),
        getButtons(),
      ]);
      assertVersion(version);
      if (requestVersion !== menuRequestVersion) throw new SessionChangedError();
      const menu = normalizeMenu(routes.data.data);
      const permission = buildPermissionMap(buttons.data.data);
      const menuAll = [...this.menuAll];
      for (const item of menu) {
        const index = menuAll.findIndex(existing => existing.path === item.path);
        if (index === -1) menuAll.push(item);
        else menuAll[index] = item;
      }
      this.$patch({ menu, menuAll, permission });
      return menu;
    },
    async GetButtons() {
      const version = getRequestSessionVersion();
      const response = await getButtons();
      assertVersion(version);
      this.permission = buildPermissionMap(response.data.data);
    },
  },
});
