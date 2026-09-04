import { defineStore } from 'pinia';
import dayjs from 'dayjs';
import { sendLogs } from '@/api/user';
import { getStore, setStore } from '@/utils/store';

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

const getStoredLogs = () => {
  const value = getStore({ name: 'logsList' });
  return Array.isArray(value) ? (value as LogItem[]) : [];
};

export const useLogsStore = defineStore('logs', {
  state: () => ({ logsList: getStoredLogs() }),
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
        url: window.location.href,
        time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      });
      setStore({ name: 'logsList', content: this.logsList });
    },
    clearLogs() {
      this.logsList = [];
      setStore({ name: 'logsList', content: this.logsList });
    },
    async SendLogs() {
      await sendLogs(this.logsList);
      this.clearLogs();
    },
  },
});
