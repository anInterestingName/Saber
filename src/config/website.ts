/**
 * 全局配置文件
 */
import type { AppSetting } from '@/types/setting';

const setting: AppSetting = {
  theme: 'light',
  colorPrimary: '#1677ff',
  layout: 'mix',
  contentWidth: 'fluid',
  sidebar: 'vertical',
  tag: true,
  debug: false,
  collapse: true,
  search: false,
  lock: false,
  fullscreen: true,
  menu: true,
};

export default {
  title: 'staratlas',
  logo: '星',
  key: 'saber', //配置主键,目前用于存储
  indexTitle: '星图 staratlas',
  tenantMode: true, // 是否开启租户模式
  //http的status默认放行不才用统一处理的,
  statusWhiteList: [],
  //配置首页不可关闭
  setting,
  firstPage: {
    name: '首页',
    path: '/wel/index',
  },
  //配置菜单的属性
  menu: {
    iconDefault: 'icon-caidan',
    label: 'name',
    path: 'path',
    icon: 'source',
    children: 'children',
    query: 'query',
    href: 'path',
    meta: 'meta',
  },
  // 报表设计器地址(cloud端口为8108,boot端口为80)
  reportUrl: 'http://localhost:8108/ureport',
};
