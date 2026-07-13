# Saber 前端 · Vue3 Composition API + TypeScript 迁移升级指南

> 适用工程：SpringBlade 开源前端版 **Saber**（Vue 3 + Element Plus + @smallwei/avue + Vite）
> 对应变更：`src/views/` 页面层由 **Options API** 全量迁移为 **`<script setup lang="ts">` Composition API + 轻量 TypeScript**
> 文档性质：升级指导 / 迁移规范。既供工程师直接阅读执行，也供 AI 依此拆解任务、逐文件推进迁移。

---

## 0. 阅读前须知

本指南描述的是一次**范式迁移**，不是功能升级：业务逻辑、接口、路由、权限模型**保持不变**，改变的只是页面层的书写范式（Options API → Composition API）与类型标注（JS → 轻量 TS）。

本次变更的一个关键特征——**零工具链改动**：

- 未新增 `tsconfig.json`、未引入 `vue-tsc` / `type-check`、未改 `vite.config.mjs`、未改 `package.json` 依赖、未改 ESLint / Prettier 配置。
- TS 仅体现为 `.vue` 文件的 `<script setup lang="ts">` + 内联类型，由 Vite / esbuild **转译**（`pnpm build` 只转译、不做类型检查）。

因此升级本身**不需要安装新依赖**，风险集中在「代码书写范式」与「若干工具函数重命名」两处，下文分节详述。

---

## 1. 升级概述

| 项目 | 说明 |
| --- | --- |
| 迁移对象 | `src/views/` 下全部业务页面（约 32 个 `.vue`） |
| 目标范式 | `<script setup lang="ts">` + Composition API + 轻量 TS |
| option 组织 | 一律**内联**在 `.vue` 内（`src/views/` **不使用** `mixins/crud.js`） |
| 参照样板 | `src/views/system/dict.vue`（系统管理类）、`src/views/authority/role.vue`（权限/树类） |
| 尚未迁移 | `src/components/`、`src/page/`、`src/mac/` 仍为 Options API（属渐进迁移的允许混用状态） |
| 工具链 | 无新增；`pnpm build` = esbuild 转译，不做类型检查 |

迁移后的强约束（对应 `CLAUDE.md §4.1`）：

- 禁止再写 Options API（`data()` / `methods` / `computed` 选项、`mapGetters`、`this.$xxx`）。
- 禁止 explicit `any`。
- Vue / Vuex API 一律**显式 import**（工程虽配 auto-import，但 `dts:false`，显式引入才能保证 IDE / 类型服务正常）。

---

## 2. 破坏性变更（Breaking Changes）⚠️

> 对**二次开发工程 / fork** 而言，本节是升级时最容易踩雷的部分。若你的工程从 `@/utils/util` 或 `@/utils/validate` 引用过下列函数，升级后**旧名将不存在**，需同步改名，否则构建/运行报错。

### 2.1 工具函数重命名（对外导出，破坏性）

**`src/utils/validate.js`**

| 旧名（已移除） | 新名 |
| --- | --- |
| `validatenull` | `validateNull` |
| `isvalidUsername` | `isValidUsername` |
| `validatAlphabets` | `validateAlphabets` |
| `vaildatePc` | `validatePc` |
| `cardid` | `cardId` |
| `isvalidatemobile` | `isValidateMobile` |
| `validatename` | `validateName` |
| `validatenum` | `validateNum` |
| `validatenumord` | `validateNumOrd` |

> `validateURL` / `validateEmail` / `validateLowerCase` / `validateUpperCase` 等**未改名**，仅内部变量做了规范化，对外签名不变。

**`src/utils/util.js`**

| 旧名（已移除） | 新名 |
| --- | --- |
| `fullscreenToggel` | `fullscreenToggle` |
| `listenfullscreen` | `listenFullscreen` |
| `findByvalue` | `findByValue` |

**升级动作**：全局搜索旧名，替换为新名。命令参考：

```bash
# 检测残留（应为空）
grep -rn "validatenull\|fullscreenToggel\|listenfullscreen\|findByvalue\|isvalidatemobile\|vaildatePc\|validatename\b" src/
```

### 2.2 全局 mixin 方法移除（破坏性）

迁移前，工程通过全局 mixin 向每个组件实例注入了 `this.validData` / `this.findObject` 等辅助方法。迁移后**这些全局注入被移除**，改为从工具模块**显式 import**：

| 迁移前（全局 `this.`，已移除） | 迁移后（显式 import） |
| --- | --- |
| `this.validData(x, def)` | `import { validData } from '@/utils/util'` |
| `this.findObject(column, prop)` | `import { findColumn } from '@/utils/util'` |
| `this.validatenull(x)` | `import { validateNull } from '@/utils/validate'` |

> 注意：`this.validatenull` 这类**通过 `this.` 访问的写法**在 `src/page/` 等仍为 Options API 的文件里若有残留，升级后会变成 `undefined`（既非全局也未 import），运行时抛 `is not a function`。升级时需一并排查这些文件，改为显式 import 后**直接函数调用**（脚本内无 `this`）或在 `methods` 中注册。

### 2.3 全局属性访问方式变化

`main.js` 仍在 `app.config.globalProperties` 上挂载 `website` / `$dayjs` / `getScreen`，**模板中可直接使用**；但 `<script setup>` 脚本内**没有 `this`**，需改用 import：

| 模板可用（不变） | 脚本内替代写法 |
| --- | --- |
| `website` | `import website from '@/config/website'` |
| `$dayjs` | `import dayjs from 'dayjs'` |
| `getScreen` | 从 `@/utils/util` 按需引入 |
| `axios`（`window.axios`） | `import request from '@/axios'` |

---

## 3. 新增基础设施（自研工具）

迁移在 `src/utils/util.js` 中新增两个自研工具，用于替代被移除的全局 mixin：

### 3.1 `validData(val, defaultVal = false)`

取值兜底：布尔值原样返回，其余值为空（走 `validateNull`）时回退到默认值（缺省 `false`）。常用于把可能缺失的权限位归一到确定的布尔值。

```js
export const validData = (val, defaultVal = false) => {
  if (typeof val === 'boolean') return val;
  return validateNull(val) ? defaultVal : val;
};
```

典型用法（权限按钮位）：

```ts
const permissionList = computed(() => ({
  addBtn: validData(permission.value.dict_add, false),
  editBtn: validData(permission.value.dict_edit, false),
}));
```

### 3.2 `findColumn(arr, prop)`

在 Avue option 的 `column` 配置中按 `prop` 查找列对象；兼容扁平列数组 `[{ prop }]` 与分组列 `[{ column: [{ prop }] }]`。**未命中返回 `null`**，取用前必须判空。

```js
export const findColumn = (arr, prop) => {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr.flatMap(item => item.column || [item]).find(col => col.prop === prop) || null;
};
```

典型用法（回填字典树）：

```ts
const column = findColumn(option.column, 'parentId');
if (column) column.dicData = res.data.data; // 必须 if(column) 守卫
```

---

## 4. 页面迁移规范（迁移的核心）

以下约定与 `CLAUDE.md §4.1` 完全一致，是所有新增 / 迁移页面必须遵循的规则。

### 4.1 显式 import 清单

只 import 实际用到的符号：

```ts
import { ref, reactive, computed, watch, nextTick } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import { validData, findColumn } from '@/utils/util';
import { validateNull } from '@/utils/validate';
import website from '@/config/website';
```

| 迁移前 | 迁移后 |
| --- | --- |
| `this.$message` / `this.$confirm` | `ElMessage` / `ElMessageBox` |
| `...mapGetters(['permission'])` | `const store = useStore(); const permission = computed(() => store.getters.permission)` |
| `this.website` | `import website from '@/config/website'` |

### 4.2 状态声明：`ref` vs `reactive`（含分页关键规则）

- 实体列表、表单、加载态、选中集：用 `ref`。
- Avue `option`：用 `reactive`（不带泛型参数，Vue 官方建议改用接口标注变量）。
- **分页 `page` 的选择取决于模板绑定方式**（易错点）：

| 模板绑定 | `page` 声明 | 原因 |
| --- | --- | --- |
| `v-model:page="page"`（双向） | **必须 `ref`** | avue 会 `emit('update:page', ...)` **整体重赋值**，`reactive` 会丢响应性 |
| `:page="page"`（单向） | `reactive` 即可 | 只读传入，无重赋值 |

本工程实际分布（可作对照）：`v-model:page` → `ref` 的有 `topmenu.vue`、`reportlist.vue`；其余列表页均为 `:page` 单向 + `reactive`。

`reactive` 标注示例：

```ts
const option: { column: unknown[] } = reactive({ column: [] });
```

### 4.3 组件 / DOM 引用

模板 `ref="xxxRef"` + 脚本 `const xxxRef = ref()`：

| 类型 | 写法 |
| --- | --- |
| Element Plus 实例 | `ref<InstanceType<typeof ElForm>>()` |
| Avue 实例（无 TS 类型） | 无参 `ref()` |

| 迁移前 | 迁移后 |
| --- | --- |
| `this.$refs.crud.rowAdd()` | `crudRef.value.rowAdd()`（模板 `ref="crudRef"`） |

### 4.4 事件处理器签名（Avue 约定，务必照搬）

一律箭头函数，参数按 Avue 约定标注类型。**保存 / 更新的回调参数是 `done` 与 `loading` 两个不同的函数**，语义来自 avue-crud 源码（弹窗表单路径 emit `row, closeDialog, hide`）：

| 参数 | avue 真身 | 作用 | 何时调用 |
| --- | --- | --- | --- |
| `done` | `closeDialog` | 关闭弹窗 + 刷新列表 | **成功**时 |
| `loading` | `hide` | 仅复位提交按钮的 loading 转圈，弹窗保持打开 | **失败**时 |

```ts
const rowSave = (row: DictForm, done: () => void, loading: () => void) => {
  add(row).then(
    () => { done(); onLoad(page); ElMessage({ type: 'success', message: '操作成功!' }); }, // 成功关弹窗
    error => { window.console.log(error); loading(); },                                     // 失败留弹窗、复位按钮
  );
};

const rowUpdate = (row: DictForm, index: number, done: () => void, loading: () => void) => { /* 同上 */ };
```

> 常见误解：失败时应调 `done`。**错**——失败调 `done` 会关闭弹窗、用户输入丢失且误以为成功；失败调 `loading` 才能保留弹窗供用户改错重试。`done` / `loading` 是 avue 官方约定形参名，**不要为消除与外层变量的同名而改掉它们**（见 §7 陷阱 2）。

### 4.5 `@on-load` 回调与 total 回写

```ts
const onLoad = (pageData: { currentPage: number; pageSize: number }, params: Partial<DictEntity> = {}) => {
  loading.value = true;
  getList(pageData.currentPage, pageData.pageSize, Object.assign(params, query.value)).then(res => {
    page.total = res.data.data.total; // 写回外层 page（reactive 直接改；若 page 是 ref 则 page.value.total）
    data.value = res.data.data.records;
    loading.value = false;
  });
};
```

**要点**：`@on-load` 回调若把形参也命名为 `page`，会遮蔽外层分页对象。**建议形参改名**（如 `pageData` / `pageParam`）：读分页参数用形参，写回 `total` 用外层 `page`，避免"名字对、对象错"（见 §7 陷阱 2）。

### 4.6 TS 类型选型原则

| 场景 | 类型 |
| --- | --- |
| 有确定形状的实体 / 表单 | `interface XxxEntity`；列表 `ref<XxxEntity[]>`、表单 `Partial<XxxEntity>` |
| 搜索袋 `query` / `params` | `Partial<XxxEntity>`（映射实体字段） |
| 真·动态无固定形状（Avue 列 / 节点、纯 `v-model` 的对话框模型、未使用的框架回调参数如校验器 `rule`） | `Record<string, unknown>` / `unknown` |

禁止 explicit `any`。`reactive` 不使用泛型参数，改用接口标注变量。

---

## 5. Options → Composition 完整对照

### 5.1 构造映射速查

| Options API | Composition API + TS |
| --- | --- |
| `data() { return { form: {} } }` | `const form = ref<XxxForm>({})` |
| `data() { return { page: {...} } }` | `const page = reactive({...})` 或 `ref({...})`（见 §4.2） |
| `computed: { xxx() {} }` | `const xxx = computed(() => ...)` |
| `...mapGetters(['permission'])` | `const permission = computed(() => store.getters.permission)` |
| `methods: { fn() {} }` | `const fn = () => {}` |
| `this.xxx`（状态） | `xxx.value`（ref）/ `xxx.field`（reactive） |
| `this.$refs.crud` | `crudRef.value` |
| `this.$message` | `ElMessage` |
| `mounted() {}` | `onMounted(() => {})`（需从 vue import） |
| `watch: { 'form.x'() {} }` | `watch(() => form.value.x, () => {})` |

### 5.2 真实样例：`src/views/system/dict.vue`

**迁移前（Options API，节选）**

```js
import { mapGetters } from "vuex";
export default {
  data () {
    return { form: {}, selectionList: [], loading: true, query: {}, page: { pageSize: 10, currentPage: 1, total: 0 }, option: {/*...*/} };
  },
  computed: {
    ...mapGetters(["userInfo", "permission"]),
    permissionList () {
      return { addBtn: this.validData(this.permission.dict_add, false) /*...*/ };
    },
    ids () { let ids = []; this.selectionList.forEach(ele => ids.push(ele.id)); return ids.join(","); }
  },
  methods: {
    handleAdd (row) { this.$refs.crud.rowAdd(); },
    rowSave (row, done, loading) { /* ... */ },
  }
}
```

**迁移后（`<script setup lang="ts">`，节选）**

```ts
import { ref, reactive, computed } from 'vue';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import { validData, findColumn } from '@/utils/util';

interface DictEntity { id: string; code: string; dictValue: string; parentId: string; }
type DictForm = Partial<DictEntity>;

const store = useStore();
const permission = computed(() => store.getters.permission);

const form = ref<DictForm>({});
const selectionList = ref<DictEntity[]>([]);
const loading = ref(true);
const query = ref<Partial<DictEntity>>({});
const page = reactive({ pageSize: 10, currentPage: 1, total: 0 });
const option: { column: unknown[] } = reactive({ column: [] });
const crudRef = ref();

const permissionList = computed(() => ({
  addBtn: validData(permission.value.dict_add, false),
}));
const ids = computed(() => selectionList.value.map(ele => ele.id).join(','));

const handleAdd = (row: DictEntity) => { crudRef.value.rowAdd(); };
const rowSave = (row: DictForm, done: () => void, loading: () => void) => { /* ... */ };
```

---

## 6. 升级实施步骤（可供 AI 按步拆解执行）

> 建议以**单文件为最小可验证单元**逐个迁移，每迁一个文件即验证一次，避免一次性大改难以回归。

### 阶段一 · 基础设施对齐（先做，全局影响）

1. 对齐 `src/utils/validate.js`、`src/utils/util.js` 的函数命名（§2.1），确认新增 `validData` / `findColumn`（§3）。
2. 全局搜索旧函数名残留并替换（§2.1 命令）。
3. 排查 `src/page/`、`src/components/`、`src/mac/` 中对 `this.validData` / `this.findObject` / `this.validatenull` 等**已移除全局方法**的引用，改为显式 import（§2.2）。

### 阶段二 · 逐页面迁移 `src/views/`（对每个 `.vue`）

1. `<script>` → `<script setup lang="ts">`，删除 `export default {}` 外壳。
2. `data()` 字段 → `ref` / `reactive`（分页 `page` 按 §4.2 选型）。
3. `computed` / `methods` → 顶层 `const`（computed / 箭头函数），补全 vue / vuex / element-plus 的显式 import。
4. `...mapGetters` → `useStore` + `computed`（§4.1）。
5. 全部 `this.xxx` → `xxx.value` / `xxx.field`；`this.$refs.crud` → `crudRef.value`（模板同步 `ref="crudRef"`）。
6. 事件处理器按 Avue 约定标注类型；`rowSave` / `rowUpdate` 保持 `done` / `loading` 语义（§4.4）；`onLoad` 形参改名避免遮蔽（§4.5）。
7. 为实体 / 表单建立 `interface`，按 §4.6 选型标注；清除所有 explicit `any`。
8. `findColumn` 取用处补 `if (column)` 守卫（§3.2）。

### 阶段三 · 验证（每个文件 + 整体）

1. `pnpm run build` 通过（转译层无语法 / 未定义引用错误）。
2. `pnpm run dev` 起服务（端口 2888），逐页面走 §8 运行时清单。

---

## 7. 常见陷阱清单

| # | 陷阱 | 说明与修复 |
| --- | --- | --- |
| 1 | 脚本内漏 `.value` | ref 在脚本中必须 `.value`；模板中自动解包，勿写 `.value`。 |
| 2 | 事件回调形参遮蔽外层同名状态 | Options 时代外层是 `this.page` / `this.loading` 不冲突；转 `<script setup>` 后外层变顶层 `const`，与形参撞名。**判定**：需读写外层同名状态的形参（如 `onLoad` 的 `page` 要写 `total`）**必须改名**（`pageData`）；纯回调且是 avue 官方名（`done` / `loading`）**保留原名**，属良性遮蔽，切勿改。 |
| 3 | 分页 `page` 用错 `ref`/`reactive` | `v-model:page` 必须 `ref`，`:page` 用 `reactive`（§4.2）。 |
| 4 | `findColumn` 返回值未判空 | 未命中返回 `null`，直接 `.dicData` 会报错，必须 `if (column)`。 |
| 5 | 忘记显式 import vue API | `computed is not defined` 类错误；易漏 `watch` / `nextTick` / `onMounted`。 |
| 6 | `reactive` 整体替换失效 | `state = {...}` 会断开响应；改用 `Object.assign(state, ...)` 或改用 `ref`。 |
| 7 | `watch` 源写成 `.value` | `watch(count.value, ...)` 只取初值不响应；应 `watch(count, ...)` 或 getter `watch(() => form.value.x, ...)`。 |
| 8 | 残留 Options 痕迹 | `this.` / `mapGetters` / `data()` / `methods:` 均应清除。 |

---

## 8. 验证清单

### 8.1 静态

```
[ ] pnpm run build 通过（exit 0）
[ ] 无 this.xxx 残留（src/views/）
[ ] 无 explicit any（: any / as any / <any>）
[ ] 无 mapGetters / export default {} 残留（src/views/）
[ ] 无旧工具函数名残留（validatenull / fullscreenToggel / listenfullscreen / findByvalue ...）
```

### 8.2 运行时（`pnpm run dev`，端口 2888）

```
[ ] 页面加载无白屏、无 Console error
[ ] 列表显示、分页（切页 / 改页大小）正常
[ ] 搜索 / 重置正常
[ ] 新增 / 编辑（表单回显）/ 查看正常，提交后列表刷新、弹窗按预期关闭
[ ] 提交失败时弹窗保留、按钮 loading 复位（验证 done/loading 语义）
[ ] 单条 / 批量删除（含未选警告）正常
[ ] 权限按钮显隐符合预期
[ ] 树 / 穿梭框 / 权限分配类页面勾选与回填正常
```

---

## 附录 A · 完整函数重命名对照表

| 文件 | 旧名 | 新名 | 性质 |
| --- | --- | --- | --- |
| validate.js | validatenull | validateNull | 破坏性改名 |
| validate.js | isvalidUsername | isValidUsername | 破坏性改名 |
| validate.js | validatAlphabets | validateAlphabets | 破坏性改名 |
| validate.js | vaildatePc | validatePc | 破坏性改名 |
| validate.js | cardid | cardId | 破坏性改名 |
| validate.js | isvalidatemobile | isValidateMobile | 破坏性改名 |
| validate.js | validatename | validateName | 破坏性改名 |
| validate.js | validatenum | validateNum | 破坏性改名 |
| validate.js | validatenumord | validateNumOrd | 破坏性改名 |
| util.js | fullscreenToggel | fullscreenToggle | 破坏性改名 |
| util.js | listenfullscreen | listenFullscreen | 破坏性改名 |
| util.js | findByvalue | findByValue | 破坏性改名 |
| util.js | —（新增） | validData | 新增自研工具 |
| util.js | —（新增） | findColumn | 新增自研工具（替代全局 `this.findObject`） |

---

## 附录 B · 迁移文件清单（基准提交 `177a56e8`，47 个文件）

**A. 视图层全量迁移（Options → Composition + TS）**

- `authority/`：apiscope.vue、datascope.vue、role.vue
- `base/`：region.vue
- `desk/`：notice.vue
- `monitor/log/`：api.vue、error.vue、usual.vue
- `report/`：reportlist.vue
- `system/`：client.vue、dept.vue、dict.vue、menu.vue、param.vue、post.vue、tenant.vue、topmenu.vue、user.vue
- `tool/`：code.vue、datasource.vue
- `user/`：info.vue
- `util/`（Demo 页）：data.vue、form.vue、logs.vue、permission.vue、store.vue、table.vue、tags.vue、test.vue
- `wel/`：dashboard.vue、index.vue
- `views/test.vue`

**B. 工具 / 基础设施（重命名 + 增强，仍为 JS）**

- `utils/util.js`（函数改名 + 新增 `validData` / `findColumn` + `var`→`const/let`、`==`→`===`）
- `utils/validate.js`（函数改名 + 规范化）
- `utils/store.js`（`let`→`const`、`==`→`===`）

**C. 同步旧名 / 修复旧引用的 Options 文件（仍为 Options API）**

- `mixins/index.js`、`permission.js`
- `page/index/index.vue`、`page/index/sidebar/sidebarItem.vue`、`page/index/top/top-full.vue`、`page/index/top/top-lock.vue`
- `page/index/search.vue`、`page/index/top/top-search.vue`（修复悬空的 `this.validatenull` → 显式 `import { validateNull }` 后直接调用）
- `page/login/codelogin.vue`、`page/login/index.vue`
- `components/third-register/main.vue`

**D. 文档**

- `CLAUDE.md`（§4.1 开发规范由 Options API 改写为 Composition API + TS）

---

## 附录 C · 迁移后 `.vue` 骨架模板

```vue
<template>
  <basic-container>
    <avue-crud
      ref="crudRef"
      :option="option"
      :data="data"
      :page="page"
      :table-loading="loading"
      :permission="permissionList"
      v-model="form"
      @on-load="onLoad"
      @row-save="rowSave"
      @row-update="rowUpdate"
      @row-del="rowDel"
      @search-change="searchChange"
      @selection-change="selectionChange"
    />
  </basic-container>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import { validData } from '@/utils/util';
import { getList, add, update, remove } from '@/api/xxx/xxx';

interface XxxEntity { id: string; /* ... */ }
type XxxForm = Partial<XxxEntity>;

const store = useStore();
const permission = computed(() => store.getters.permission);

const form = ref<XxxForm>({});
const data = ref<XxxEntity[]>([]);
const selectionList = ref<XxxEntity[]>([]);
const loading = ref(true);
const query = ref<Partial<XxxEntity>>({});
const page = reactive({ pageSize: 10, currentPage: 1, total: 0 });
const option: { column: unknown[] } = reactive({ /* ... */ column: [] });
const crudRef = ref();

const permissionList = computed(() => ({
  addBtn: validData(permission.value.xxx_add, false),
  editBtn: validData(permission.value.xxx_edit, false),
  delBtn: validData(permission.value.xxx_delete, false),
  viewBtn: validData(permission.value.xxx_view, false),
}));

const onLoad = (pageData: { currentPage: number; pageSize: number }, params: Partial<XxxEntity> = {}) => {
  loading.value = true;
  getList(pageData.currentPage, pageData.pageSize, Object.assign(params, query.value)).then(res => {
    page.total = res.data.data.total;
    data.value = res.data.data.records;
    loading.value = false;
  });
};

const rowSave = (row: XxxForm, done: () => void, loading: () => void) => {
  add(row).then(
    () => { done(); onLoad(page); ElMessage({ type: 'success', message: '操作成功!' }); },
    error => { window.console.log(error); loading(); },
  );
};

const rowUpdate = (row: XxxForm, index: number, done: () => void, loading: () => void) => {
  update(row).then(
    () => { done(); onLoad(page); ElMessage({ type: 'success', message: '操作成功!' }); },
    error => { window.console.log(error); loading(); },
  );
};

const rowDel = (row: XxxEntity) => {
  ElMessageBox.confirm('确定将选择数据删除?', { type: 'warning' })
    .then(() => remove(row.id))
    .then(() => { onLoad(page); ElMessage({ type: 'success', message: '操作成功!' }); });
};

const searchChange = (params: Partial<XxxEntity>, done: () => void) => {
  query.value = params;
  page.currentPage = 1;
  onLoad(page, params);
  done();
};

const selectionChange = (list: XxxEntity[]) => { selectionList.value = list; };
</script>
```

> 本模板综合自 `dict.vue` / `role.vue` 等实际迁移结果，用于新页面起步与迁移比对；字段名、接口签名以各模块实际实现为准。
</content>
</invoke>
