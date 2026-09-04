import request from '@/axios';
import type { BladeResponse } from '@/types/option';

interface PageData<T> {
  records: T[];
  total: number;
}

export const getList = <T>(current: number, size: number, params: object) =>
  request<BladeResponse<PageData<T>>>({
    url: '/blade-develop/code/list',
    method: 'get',
    params: { ...params, current, size },
  });

export const build = (ids: string) =>
  request({
    url: '/blade-develop/code/gen-code',
    method: 'post',
    params: { ids, system: 'saber3' },
  });

export const remove = (ids: string) =>
  request({
    url: '/blade-develop/code/remove',
    method: 'post',
    params: { ids },
  });

export const add = (row: object) =>
  request({
    url: '/blade-develop/code/submit',
    method: 'post',
    data: row,
  });

export const update = (row: object) =>
  request({
    url: '/blade-develop/code/submit',
    method: 'post',
    data: row,
  });

export const copy = (id: string) =>
  request({
    url: '/blade-develop/code/copy',
    method: 'post',
    params: { id },
  });

export const getCode = <T>(id: string) =>
  request<BladeResponse<T>>({
    url: '/blade-develop/code/detail',
    method: 'get',
    params: { id },
  });
