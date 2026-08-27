/**
 * 全局配置文件
 */
export default {
  title: 'staratlas',
  logo: '星',
  key: 'saber', //配置主键,目前用于存储
  indexTitle: '星图 staratlas',
  clientId: 'saber', // 客户端id
  clientSecret: 'saber_secret', // 客户端密钥
  tenantMode: true, // 是否开启租户模式
  captchaMode: true, // 是否开启验证码模式
  tokenTime: 3000, //token过期时间
  Authorization: 'Blade-Auth',
  //http的status默认放行不才用统一处理的,
  statusWhiteList: [],
  //配置首页不可关闭
  setting: {
    sidebar: 'vertical',
    tag: true,
    debug: true,
    collapse: true,
    search: true,
    lock: true,
    screenshot: true,
    fullscreen: true,
    theme: true,
    menu: true,
  },
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
    publicKey: '04e296a8cb493f3e7b275bedbd4d8b7af47a35720d013e9d08b3dbb76eaca4dd253c957c1fd943b8b0e87167ac5c0aa326c562377f55d7d8b68ae598501bfdb4de',
  },
  // 授权地址
  authUrl: 'http://localhost/blade-auth/oauth/render',
  // 报表设计器地址(cloud端口为8108,boot端口为80)
  reportUrl: 'http://localhost:8108/ureport',
};
