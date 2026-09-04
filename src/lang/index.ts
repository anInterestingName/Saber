import { createI18n } from 'vue-i18n';
import elementEnLocale from 'element-plus/es/locale/lang/en';
import elementZhLocale from 'element-plus/es/locale/lang/zh-cn';
import elementJaLocale from 'element-plus/es/locale/lang/ja';
import type { AppLanguage } from '@/store/common';
import enLocale from './en';
import zhLocale from './zh';
import jaLocale from './ja';

export const messages = {
  en: { ...enLocale, ...elementEnLocale },
  'zh-cn': { ...zhLocale, ...elementZhLocale },
  ja: { ...jaLocale, ...elementJaLocale },
};

export const createAppI18n = (language: AppLanguage) =>
  createI18n({
    locale: language,
    messages,
  });

export type AppI18n = ReturnType<typeof createAppI18n>;
