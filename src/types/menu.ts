/**
 * 后端菜单项。字段名经 website.menu 的属性映射消费（label→name、icon→source、href→path），
 * 仅声明前端实际读写的字段；component 与 meta 由 formatPath 在路由注册前动态写入。
 */
export interface MenuItem {
  /** 雪花主键，后端可能下发 string，与路由参数比对须保持宽松相等 */
  id?: string | number;
  name?: string;
  path?: string;
  source?: string;
  code?: string;
  component?: string;
  query?: Record<string, string>;
  meta?: MenuMeta;
  children?: MenuItem[];
}

/**
 * 菜单 meta：formatPath 重建后随动态路由注册，permission.ts 与标签体系按此约定消费。
 */
export interface MenuMeta {
  keepAlive?: boolean;
  isTab?: boolean;
  isAuth?: boolean;
  /** 有值表示外链菜单，点击开新窗口而非站内导航 */
  target?: string;
  i18n?: string;
  menu?: boolean;
}
