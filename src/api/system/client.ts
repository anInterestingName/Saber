import request from '@/axios';

export const getList = (current: number, size: number, params: object) => {
  return request({
    url: '/blade-system/client/list',
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
    url: '/blade-system/client/detail',
    method: 'get',
    params: {
      id,
    },
  });
};

export const remove = (ids: string) => {
  return request({
    url: '/blade-system/client/remove',
    method: 'post',
    params: {
      ids,
    },
  });
};

export const add = (row: object) => {
  return request({
    url: '/blade-system/client/submit',
    method: 'post',
    data: row,
  });
};

export const update = (row: object) => {
  return request({
    url: '/blade-system/client/submit',
    method: 'post',
    data: row,
  });
};
