import type { AxiosResponse } from 'axios';

const decodeFileName = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const resolveFileName = (disposition: string | undefined, fallbackName: string) => {
  if (!disposition) return fallbackName;
  const encodedMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (encodedMatch?.[1]) return decodeFileName(encodedMatch[1].replace(/["']/g, ''));
  const plainMatch = disposition.match(/filename=([^;]+)/i);
  return plainMatch?.[1]?.replace(/["']/g, '').trim() || fallbackName;
};

export const downloadBlob = async (response: AxiosResponse<Blob>, fallbackName: string) => {
  const contentType = String(response.headers['content-type'] ?? response.data.type);
  if (contentType.includes('application/json')) {
    const text = await response.data.text();
    try {
      const payload = JSON.parse(text) as { msg?: string };
      throw new Error(payload.msg || '下载失败');
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error('下载失败');
      throw error;
    }
  }

  const fileName = resolveFileName(response.headers['content-disposition'], fallbackName);
  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
