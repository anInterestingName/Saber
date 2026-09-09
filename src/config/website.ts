/**
 * 全局配置文件
 */
import type { AppSetting } from '@/types/setting';

const setting: AppSetting = {
  theme: 'light',
  colorPrimary: '#1677ff',
  layout: 'mix',
  sidebar: 'vertical',
  tag: true,
  debug: true,
  collapse: true,
  search: true,
  lock: true,
  fullscreen: true,
  menu: true,
};

export default {
  title: 'staratlas',
  logo: '星',
  key: 'saber', //配置主键,目前用于存储
  indexTitle: '星图 staratlas',
  clientId: 'saber', // 客户端id
  clientSecret: 'saber_secret', // 客户端密钥
  tenantMode: true, // 是否开启租户模式
  captchaMode: false, // 是否开启验证码模式
  tokenTime: 3000, //token过期时间
  Authorization: 'Blade-Auth',
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
  //auth配置
  auth: {
    // 使用后端工程 @org.springblade.test.Sm2KeyGenerator 获取
    publicKey:
      '04d4c3073bfff5ebc0a25d9266e7b037a64143829f099151ab340689675a9bcb6124c61ddb7de78984129a003b35b2b92e972349d6836c955febf44a1e3c2439ff',
  },
  // 授权地址
  authUrl: 'http://localhost/blade-auth/oauth/render',
  // 报表设计器地址(cloud端口为8108,boot端口为80)
  reportUrl: 'http://localhost:8108/ureport',
};
