import request from '@/axios';
import type { BladeResponse } from '@/types/option';
import type { TreeKey, TreeNode } from '@/types/tree';

interface PageData<T> {
  records: T[];
  total: number;
}

interface TopMenuGrantTree {
  menu: TreeNode[];
}

interface TopMenuGrantKeys {
  menu: TreeKey[];
}

export const getList = <T>(current: number, size: number, params: object) =>
  request<BladeResponse<PageData<T>>>({
    url: '/blade-system/topmenu/list',
    method: 'get',
    params: { ...params, current, size },
  });

export const getDetail = <T>(id: string) =>
  request<BladeResponse<T>>({
    url: '/blade-system/topmenu/detail',
    method: 'get',
    params: { id },
  });

export const remove = (ids: string) =>
  request({
    url: '/blade-system/topmenu/remove',
    method: 'post',
    params: { ids },
  });

export const add = (row: object) =>
  request({
    url: '/blade-system/topmenu/submit',
    method: 'post',
    data: row,
  });

export const update = (row: object) =>
  request({
    url: '/blade-system/topmenu/submit',
    method: 'post',
    data: row,
  });

export const grantTree = () =>
  request<BladeResponse<TopMenuGrantTree>>({
    url: '/blade-system/menu/grant-top-tree',
    method: 'get',
  });

export const getTopTree = (topMenuIds: string) =>
  request<BladeResponse<TopMenuGrantKeys>>({
    url: '/blade-system/menu/top-tree-keys',
    method: 'get',
    params: { topMenuIds },
  });

export const getGrantKeys = getTopTree;

export const grant = (topMenuIds: TreeKey[], menuIds: TreeKey[]) =>
  request({
    url: '/blade-system/topmenu/grant',
    method: 'post',
    data: { topMenuIds, menuIds },
  });
