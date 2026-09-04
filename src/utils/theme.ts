import type { AppSetting } from '@/types/setting';

export const DEFAULT_PRIMARY_COLOR = '#1677ff';

export const primaryColorOptions = [
  { label: '拂晓蓝', value: '#1677ff' },
  { label: '科技蓝', value: '#1890ff' },
  { label: '薄暮', value: '#f5222d' },
  { label: '火山', value: '#fa541c' },
  { label: '日暮', value: '#faad14' },
  { label: '明青', value: '#13c2c2' },
  { label: '极光绿', value: '#52c41a' },
  { label: '极客蓝', value: '#2f54eb' },
  { label: '酱紫', value: '#722ed1' },
] as const;

const normalizeHex = (color: string) => {
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : DEFAULT_PRIMARY_COLOR;
};

const mixColor = (source: string, target: string, ratio: number) => {
  const sourceValue = Number.parseInt(source.slice(1), 16);
  const targetValue = Number.parseInt(target.slice(1), 16);
  const channels = [16, 8, 0].map(shift => {
    const sourceChannel = (sourceValue >> shift) & 0xff;
    const targetChannel = (targetValue >> shift) & 0xff;
    return Math.round(sourceChannel + (targetChannel - sourceChannel) * ratio);
  });

  return `#${channels.map(channel => channel.toString(16).padStart(2, '0')).join('')}`;
};

export const normalizePrimaryColor = (color: string | undefined) => {
  return normalizeHex(color || DEFAULT_PRIMARY_COLOR);
};

export const applyTheme = (setting: Pick<AppSetting, 'theme' | 'colorPrimary'>) => {
  const root = document.documentElement;
  const body = document.body;
  const primaryColor = normalizePrimaryColor(setting.colorPrimary);

  root.classList.toggle('dark', setting.theme === 'dark');
  Array.from(body.classList)
    .filter(className => className.startsWith('theme-') && className !== 'theme-dark')
    .forEach(className => body.classList.remove(className));
  body.classList.toggle('theme-dark', setting.theme === 'dark');

  root.style.setProperty('--el-color-primary', primaryColor);
  root.style.setProperty('--el-color-primary-light-3', mixColor(primaryColor, '#ffffff', 0.3));
  root.style.setProperty('--el-color-primary-light-5', mixColor(primaryColor, '#ffffff', 0.5));
  root.style.setProperty('--el-color-primary-light-7', mixColor(primaryColor, '#ffffff', 0.7));
  root.style.setProperty('--el-color-primary-light-8', mixColor(primaryColor, '#ffffff', 0.8));
  root.style.setProperty('--el-color-primary-light-9', mixColor(primaryColor, '#ffffff', 0.9));
  root.style.setProperty('--el-color-primary-dark-2', mixColor(primaryColor, '#000000', 0.2));
};
