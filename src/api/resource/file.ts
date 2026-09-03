import request from '@/axios';

export interface BladeFile {
  link: string;
  name?: string;
  originalName?: string;
  domain?: string;
}

interface BladeResponse<T> {
  success?: boolean;
  msg?: string;
  data: T;
}

export const uploadFile = async (file: File) => {
  const data = new FormData();
  data.append('file', file);
  const response = await request<BladeResponse<BladeFile>>({
    url: '/blade-resource/oss/endpoint/put-file',
    method: 'post',
    data,
  });
  const result = response.data.data;
  if (!result?.link?.trim()) {
    throw new Error('资源服务未返回文件地址');
  }
  return result;
};
