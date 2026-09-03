import request from '@/axios';
import type { BladeResponse } from '@/types/option';
import type { TreeKey, TreeNode } from '@/types/tree';

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

export const getTopMenu = () =>
  request({
    url: '/blade-system/menu/top-menu',
    method: 'get',
  });

export const getRoutes = (topMenuId: string) =>
  request({
    url: '/blade-system/menu/routes',
    method: 'get',
    params: { topMenuId },
  });
