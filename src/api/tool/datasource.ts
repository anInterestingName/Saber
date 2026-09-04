import request from '@/axios';
import type { BladeResponse } from '@/types/option';

export interface DatasourceOption {
  id: string;
  name: string;
}

export const getList = (current: number, size: number, params: object) => {
  return request({
    url: '/blade-develop/datasource/list',
    method: 'get',
    params: {
      ...params,
      current,
      size,
    },
  });
};

export const getDetail = (id: string) => {
  return request({
    url: '/blade-develop/datasource/detail',
    method: 'get',
    params: {
      id,
    },
  });
};

export const getDatasourceSelect = () =>
  request<BladeResponse<DatasourceOption[]>>({
    url: '/blade-develop/datasource/select',
    method: 'get',
  });

export const remove = (ids: string) => {
  return request({
    url: '/blade-develop/datasource/remove',
    method: 'post',
    params: {
      ids,
    },
  });
};

export const add = (row: object) => {
  return request({
    url: '/blade-develop/datasource/submit',
    method: 'post',
    data: row,
  });
};

export const update = (row: object) => {
  return request({
    url: '/blade-develop/datasource/submit',
    method: 'post',
    data: row,
  });
};
