import request from '@/axios';
import type { BladeResponse } from '@/types/option';

interface PageData<T> {
  records: T[];
  total: number;
}

export const getList = <T>(current: number, size: number, params: object) =>
  request<BladeResponse<PageData<T>>>({
    url: '/blade-system/user/list',
    method: 'get',
    params: { ...params, current, size },
  });

export const remove = (ids: string) =>
  request({
    url: '/blade-system/user/remove',
    method: 'post',
    params: { ids },
  });

export const add = (row: object) =>
  request({
    url: '/blade-system/user/submit',
    method: 'post',
    data: row,
  });

export const update = (row: object) =>
  request({
    url: '/blade-system/user/update',
    method: 'post',
    data: row,
  });

export const grant = (userIds: string, roleIds: string) =>
  request({
    url: '/blade-system/user/grant',
    method: 'post',
    params: { userIds, roleIds },
  });

export const getUser = <T>(id: string) =>
  request<BladeResponse<T>>({
    url: '/blade-system/user/detail',
    method: 'get',
    params: { id },
  });

export const getUserInfo = () =>
  request({
    url: '/blade-system/user/info',
    method: 'get',
  });

export const resetPassword = (userIds: string) =>
  request({
    url: '/blade-system/user/reset-password',
    method: 'post',
    params: { userIds },
  });

export const updatePassword = (oldPassword: string, newPassword: string, newPassword1: string) =>
  request({
    url: '/blade-system/user/update-password',
    method: 'post',
    params: { oldPassword, newPassword, newPassword1 },
  });

export const updateInfo = (row: object) =>
  request({
    url: '/blade-system/user/update-info',
    method: 'post',
    data: row,
  });

export const unlock = (userIds: string) =>
  request({
    url: '/blade-system/user/unlock',
    method: 'post',
    params: { userIds },
  });

export const importUsers = (file: File) => {
  const data = new FormData();
  data.append('file', file);
  return request({
    url: '/blade-system/user/import-user',
    method: 'post',
    data,
  });
};

export const exportUsers = (params: object) =>
  request<Blob>({
    url: '/blade-system/user/export-user',
    method: 'get',
    params,
    responseType: 'blob',
  });

export const downloadUserTemplate = () =>
  request<Blob>({
    url: '/blade-system/user/export-template',
    method: 'get',
    responseType: 'blob',
  });
