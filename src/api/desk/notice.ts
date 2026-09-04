import request from '@/axios';

export const getList = (current: number, size: number, params: object) => {
  return request({
    url: '/blade-desk/notice/list',
    method: 'get',
    params: {
      ...params,
      current,
      size,
    },
    cryptoToken: false,
  });
};

export const remove = (ids: string) => {
  return request({
    url: '/blade-desk/notice/remove',
    method: 'post',
    params: {
      ids,
    },
    cryptoToken: false,
  });
};

export const add = (row: object) => {
  return request({
    url: '/blade-desk/notice/submit',
    method: 'post',
    data: row,
    cryptoToken: false,
  });
};

export const update = (row: object) => {
  return request({
    url: '/blade-desk/notice/submit',
    method: 'post',
    data: row,
    cryptoToken: false,
  });
};

export const getNotice = (id: string) => {
  return request({
    url: '/blade-desk/notice/detail',
    method: 'get',
    params: {
      id,
    },
    cryptoToken: false,
  });
};
