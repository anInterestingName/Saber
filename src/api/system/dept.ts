import request from '@/axios';
import type { BladeResponse } from '@/types/option';
import type { TreeNode } from '@/types/tree';

export const getList = <T extends TreeNode>(params: object) =>
  request<BladeResponse<T[]>>({
    url: '/blade-system/dept/list',
    method: 'get',
    params,
  });

export const remove = (ids: string) =>
  request({
    url: '/blade-system/dept/remove',
    method: 'post',
    params: { ids },
  });

export const add = (row: object) =>
  request({
    url: '/blade-system/dept/submit',
    method: 'post',
    data: row,
  });

export const update = (row: object) =>
  request({
    url: '/blade-system/dept/submit',
    method: 'post',
    data: row,
  });

export const getDept = <T>(id: string) =>
  request<BladeResponse<T>>({
    url: '/blade-system/dept/detail',
    method: 'get',
    params: { id },
  });

export const getDeptTree = <T extends TreeNode = TreeNode>(tenantId?: string) =>
  request<BladeResponse<T[]>>({
    url: '/blade-system/dept/tree',
    method: 'get',
    params: { tenantId },
  });
