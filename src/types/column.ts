/**
 * 声明式列配置的类型，供 `option.column` 的各类回调与 `findColumn` 的返回值使用。
 * 一条配置同时驱动表格列与表单字段（`prop` / `label` 属表格侧，`display` / `rules` 属表单侧）。
 *
 * 底层组件库未随包导出列类型（其 `types/` 只覆盖 install 选项与 locale），故在此自建。
 * 刻意不做全量声明 —— 该库的列配置项极多，全量映射维护成本高且会随其版本漂移；
 * 这里只声明本工程实际读写的字段，新增时按需补充即可。
 */

/** `option.column` 中的单列配置 */
export interface ColumnSchema {
  prop?: string;
  value?: string | number;
  display?: boolean;
  disabled?: boolean;
  addDisabled?: boolean;
  /** 字典数据。元素形状由各页接口决定，本工程只整体赋值、不逐项取用 */
  dicData?: object[];
}
