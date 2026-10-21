import { defineStore } from 'pinia';
import dayjs from 'dayjs';

export interface LogItem {
  type?: string;
  message?: string;
  stack?: string;
  info: string;
  url: string;
  time: string;
}

export interface LogPayload {
  type?: string;
  message?: string;
  stack?: string;
  info?: object | string | number | boolean | null;
}

export const useLogsStore = defineStore('logs', {
  state: () => ({ logsList: [] as LogItem[] }),
  getters: {
    logCount: state => state.logsList.length,
    isEmpty(): boolean {
      return this.logCount === 0;
    },
  },
  actions: {
    addLog(payload: LogPayload) {
      this.logsList.push({
        type: payload.type,
        message: payload.message,
        stack: payload.stack,
        info: String(payload.info ?? ''),
        url: window.location.pathname,
        time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      });
    },
    clearLogs() {
      this.logsList = [];
    },
  },
});
