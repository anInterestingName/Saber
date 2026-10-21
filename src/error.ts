import type { App } from 'vue';
import type { Pinia } from 'pinia';
import { useLogsStore } from '@/store/logs';
import { BladeBusinessError, SessionChangedError } from '@/axios';

export const createErrorPlugin = (pinia: Pinia) => ({
  install: (app: App) => {
    const logsStore = useLogsStore(pinia);
    app.config.errorHandler = (err, _vm, info) => {
      if (err instanceof BladeBusinessError || err instanceof SessionChangedError) return;
      logsStore.addLog({
        type: 'error',
        message: '界面操作失败',
        info,
      });
      if (import.meta.env.DEV) {
        console.warn('界面操作失败', info);
      }
    };
  },
});
