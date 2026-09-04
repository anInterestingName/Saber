import request from '@/axios';

export const getList = (current: number, size: number, params: object) => {
  return request({
    url: '/blade-report/report/rest/list',
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
    url: '/blade-report/report/rest/remove',
    method: 'post',
    params: {
      ids,
    },
  });
};
