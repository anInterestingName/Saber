import request from '@/axios';
import type { BladeResponse, DictionaryItem } from '@/types/option';
import type { TreeNode } from '@/types/tree';

export const getList = <T extends TreeNode>(params: object) =>
  request<BladeResponse<T[]>>({
    url: '/blade-system/dict/list',
    method: 'get',
    params,
  });

export const remove = (ids: string) =>
  request({
    url: '/blade-system/dict/remove',
    method: 'post',
    params: { ids },
  });

export const add = (row: object) =>
  request({
    url: '/blade-system/dict/submit',
    method: 'post',
    data: row,
  });

export const update = (row: object) =>
  request({
    url: '/blade-system/dict/submit',
    method: 'post',
    data: row,
  });

export const getDict = <T>(id: string) =>
  request<BladeResponse<T>>({
    url: '/blade-system/dict/detail',
    method: 'get',
    params: { id },
  });

export const getDictTree = <T extends TreeNode = TreeNode>() =>
  request<BladeResponse<T[]>>({
    url: '/blade-system/dict/tree',
    method: 'get',
    params: { code: 'DICT' },
  });

export const getDictionary = (code: string) =>
  request<BladeResponse<DictionaryItem[]>>({
    url: '/blade-system/dict/dictionary',
    method: 'get',
    params: { code },
  });
