import request from '@/axios';
import type { BladeResponse } from '@/types/option';
import type { TreeKey, TreeNode } from '@/types/tree';
import type { AuthResponse } from '@/types/auth';
import type { MenuItem } from '@/types/menu';

export const getList = <T extends TreeNode>(params: object) =>
  request<BladeResponse<T[]>>({
    url: '/blade-system/menu/list',
    method: 'get',
    params,
  });

export const remove = (ids: string) =>
  request({
    url: '/blade-system/menu/remove',
    method: 'post',
    params: { ids },
  });

export const add = (row: object) =>
  request({
    url: '/blade-system/menu/submit',
    method: 'post',
    data: row,
  });

export const update = (row: object) =>
  request({
    url: '/blade-system/menu/submit',
    method: 'post',
    data: row,
  });

export const getMenu = (id: string) =>
  request({
    url: '/blade-system/menu/detail',
    method: 'get',
    params: { id },
  });

export const getMenuTree = <T extends TreeNode = TreeNode>() =>
  request<BladeResponse<T[]>>({
    url: '/blade-system/menu/tree',
    method: 'get',
  });

export const getLazyMenuList = <T extends TreeNode = TreeNode>(
  parentId: TreeKey,
  params?: object
) =>
  request<BladeResponse<T[]>>({
    url: '/blade-system/menu/lazy-menu-list',
    method: 'get',
    params: {
      ...params,
      parentId,
    },
  });

export const getTopMenu = (meta?: { silent?: boolean }) =>
  request<AuthResponse<MenuItem[]>>({
    url: '/blade-system/menu/top-menu',
    method: 'get',
    meta,
  });

export const getRoutes = (topMenuId?: string, meta?: { silent?: boolean }) =>
  request<AuthResponse<MenuItem[]>>({
    url: '/blade-system/menu/routes',
    method: 'get',
    params: { topMenuId },
    meta,
  });
