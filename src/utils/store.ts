import { validateNull } from 'utils/validate';
import website from '@/config/website';

const keyName = website.key + '-';

/** 可入库的存储内容：与 JSON 序列化能力对齐 */
type StoreContent = string | number | boolean | object | null;

/** 存取参数：type 有值走 sessionStorage，否则走 localStorage */
interface StoreParams {
  name?: string;
  content?: StoreContent;
  type?: string;
  /** 为 true 时返回带 dataType/datetime 的原始存储对象 */
  debug?: boolean;
}

/** 序列化后落库的存储结构 */
interface StoreRecord {
  dataType?: string;
  content?: StoreContent;
  type?: string;
  datetime?: number;
}

/**
 * 存储localStorage
 */
export const setStore = (params: StoreParams = {}) => {
  let {
    name,
    content,
    type,
  } = params;
  name = keyName + name
  const obj = {
    dataType: typeof (content),
    content: content,
    type: type,
    datetime: new Date().getTime()
  }
  if (type) window.sessionStorage.setItem(name, JSON.stringify(obj));
  else window.localStorage.setItem(name, JSON.stringify(obj));
}
/**
 * 获取localStorage
 */

export const getStore = (params: StoreParams = {}) => {
  let {
    name,
    debug
  } = params;
  name = keyName + name
  // 原实现用同一个 obj 先后承载原始串与解析结果，类型上无法兼容，拆为 raw / obj 两个变量，取值链路不变
  let raw,
    content;
  raw = window.sessionStorage.getItem(name);
  if (validateNull(raw)) raw = window.localStorage.getItem(name);
  if (validateNull(raw)) return;
  let obj: StoreRecord;
  try {
    obj = JSON.parse(raw);
  } catch {
    return raw;
  }
  if (debug) {
    return obj;
  }
  if (obj.dataType === 'string') {
    content = obj.content;
  } else if (obj.dataType === 'number') {
    content = Number(obj.content);
  } else if (obj.dataType === 'boolean') {
    content = obj.content;
  } else if (obj.dataType === 'object') {
    content = obj.content;
  }
  return content;
};
/**
 * 删除localStorage
 */
export const removeStore = (params: StoreParams = {}) => {
  let {
    name,
    type
  } = params;
  name = keyName + name
  if (type) {
    window.sessionStorage.removeItem(name);
  } else {
    window.localStorage.removeItem(name);
  }

}

/**
 * 获取全部localStorage
 */
export const getAllStore = (params: StoreParams = {}) => {
  const list = [];
  const {
    type
  } = params;
  if (type) {
    for (let i = 0; i < window.sessionStorage.length; i++) {
      list.push({
        name: window.sessionStorage.key(i),
        content: getStore({
          name: window.sessionStorage.key(i),
          type: 'session'
        })
      })
    }
  } else {
    for (let i = 0; i < window.localStorage.length; i++) {
      list.push({
        name: window.localStorage.key(i),
        content: getStore({
          name: window.localStorage.key(i),
        })
      })

    }
  }
  return list;

}

/**
 * 清空全部localStorage
 */
export const clearStore = (params: StoreParams = {}) => {
  const { type } = params;
  if (type) {
    window.sessionStorage.clear();
  } else {
    window.localStorage.clear()
  }

}
