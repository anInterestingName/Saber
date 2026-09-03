import request from '@/axios';
import type { PageResult } from '@/types/list';
import type { BladeResponse } from '@/types/option';

export const getDataScopeList = <T>(current: number, size: number, params: object) =>
  request<BladeResponse<PageResult<T>>>({
    url: '/blade-system/data-scope/list',
    method: 'get',
    params: {
      ...params,
      current,
      size,
    },
  });

export const removeDataScope = (ids: string) =>
  request({
    url: '/blade-system/data-scope/remove',
    method: 'post',
    params: { ids },
  });

export const addDataScope = (row: object) =>
  request({
    url: '/blade-system/data-scope/submit',
    method: 'post',
    data: row,
  });

export const updateDataScope = (row: object) =>
  request({
    url: '/blade-system/data-scope/submit',
    method: 'post',
    data: row,
  });

export const getDataScopeDetail = <T>(id: string) =>
  request<BladeResponse<T>>({
    url: '/blade-system/data-scope/detail',
    method: 'get',
    params: { id },
  });

export const getApiScopeList = <T>(current: number, size: number, params: object) =>
  request<BladeResponse<PageResult<T>>>({
    url: '/blade-system/api-scope/list',
    method: 'get',
    params: {
      ...params,
      current,
      size,
    },
  });

export const removeApiScope = (ids: string) =>
  request({
    url: '/blade-system/api-scope/remove',
    method: 'post',
    params: { ids },
  });

export const addApiScope = (row: object) =>
  request({
    url: '/blade-system/api-scope/submit',
    method: 'post',
    data: row,
  });

export const updateApiScope = (row: object) =>
  request({
    url: '/blade-system/api-scope/submit',
    method: 'post',
    data: row,
  });

export const getApiScopeDetail = <T>(id: string) =>
  request<BladeResponse<T>>({
    url: '/blade-system/api-scope/detail',
    method: 'get',
    params: { id },
  });
