import request from '@/axios';
import type { BladeResponse, TenantOption } from '@/types/option';

export const getList = (current: number, size: number, params: object) => {
  return request({
    url: '/blade-system/tenant/list',
    method: 'get',
    params: {
      ...params,
      current,
      size,
    },
  });
};
export const remove = (ids: string) => {
  return request({
    url: '/blade-system/tenant/remove',
    method: 'post',
    params: {
      ids,
    },
  });
};

export const add = (row: object) => {
  return request({
    url: '/blade-system/tenant/submit',
    method: 'post',
    data: row,
  });
};

export const update = (row: object) => {
  return request({
    url: '/blade-system/tenant/submit',
    method: 'post',
    data: row,
  });
};

export const info = (domain: string) => {
  return request({
    url: '/blade-system/tenant/info',
    method: 'get',
    params: {
      domain,
    },
  });
};

export const getTenantSelect = () => {
  return request<BladeResponse<TenantOption[]>>({
    url: '/blade-system/tenant/select',
    method: 'get',
  });
};
