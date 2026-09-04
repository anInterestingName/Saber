import request from '@/axios';
import type { PageResult } from '@/types/list';
import type { BladeResponse } from '@/types/option';

export const getList = <T>(current: number, size: number, params: object) =>
  request<BladeResponse<PageResult<T>>>({
    url: '/blade-system/region/list',
    method: 'get',
    params: {
      ...params,
      current,
      size,
    },
  });

export const getLazyTree = <T>(parentCode: string, params?: object) =>
  request<BladeResponse<T[]>>({
    url: '/blade-system/region/lazy-tree',
    method: 'get',
    params: {
      ...params,
      parentCode,
    },
  });

export const getDetail = <T>(code: string) =>
  request<BladeResponse<T>>({
    url: '/blade-system/region/detail',
    method: 'get',
    params: { code },
  });

export const remove = (id: string) =>
  request({
    url: '/blade-system/region/remove',
    method: 'post',
    params: { id },
  });

export const submit = (row: object) =>
  request({
    url: '/blade-system/region/submit',
    method: 'post',
    data: row,
  });

export const getRegionOptions = <T>(code: string) =>
  request<BladeResponse<T[]>>({
    url: '/blade-system/region/select',
    method: 'get',
    params: { code },
  });
