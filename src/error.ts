import type { App } from 'vue';
import type { Pinia } from 'pinia';
import { useLogsStore } from '@/store/logs';

export const createErrorPlugin = (pinia: Pinia) => ({
  install: (app: App) => {
    const logsStore = useLogsStore(pinia);
    app.config.errorHandler = (err, _vm, info) => {
      const error = err instanceof Error ? err : new Error(String(err));
      logsStore.addLog({
        type: 'error',
        message: error.message,
        stack: error.stack,
        info,
      });
      if (import.meta.env.DEV) {
        console.group('>>>>>> 错误信息 >>>>>>');
        console.log(info);
        console.log(error);
        console.groupEnd();
      }
    };
  },
});
