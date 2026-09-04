import request from '@/axios';

export const getUsualList = (current: number, size: number, params: object) => {
  return request({
    url: '/blade-log/usual/list',
    method: 'get',
    params: {
      ...params,
      current,
      size,
    },
  });
};

export const getApiList = (current: number, size: number, params: object) => {
  return request({
    url: '/blade-log/api/list',
    method: 'get',
    params: {
      ...params,
      current,
      size,
    },
  });
};

export const getErrorList = (current: number, size: number, params: object) => {
  return request({
    url: '/blade-log/error/list',
    method: 'get',
    params: {
      ...params,
      current,
      size,
    },
  });
};

export const getUsualLogs = (id: string) => {
  return request({
    url: '/blade-log/usual/detail',
    method: 'get',
    params: {
      id,
    },
  });
};
export const getApiLogs = (id: string) => {
  return request({
    url: '/blade-log/api/detail',
    method: 'get',
    params: {
      id,
    },
  });
};
export const getErrorLogs = (id: string) => {
  return request({
    url: '/blade-log/error/detail',
    method: 'get',
    params: {
      id,
    },
  });
};
