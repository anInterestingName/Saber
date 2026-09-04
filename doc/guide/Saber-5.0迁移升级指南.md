# Saber 前端 · Vue3 Composition API + TypeScript 迁移升级指南

> 适用工程：SpringBlade 开源前端版 **Saber**（Vue 3 + Element Plus + @smallwei/avue + Vite）
> 对应变更：第一阶段 —— `src/views/` 页面层由 **Options API** 全量迁移为 **`<script setup lang="ts">` Composition API + 轻量 TypeScript**；
> 第二阶段 —— 引入 **vue-tsc 类型检查门禁**（tsconfig + `pnpm run type-check`）并修复门禁暴露的存量缺陷（§9）；
> 第三阶段 —— **基础设施层**（api / utils / config / store / router / lang / option / mixins 及入口文件）由 `.js` 全量转为 `.ts`（§10）；
> 第四阶段 —— **构建配置层 TS 化**（`vite.config.mjs` → `vite.config.mts`），引入 Node 语境独立检查工程 `tsconfig.node.json`（§11）
> 文档性质：升级指导 / 迁移规范。既供工程师直接阅读执行，也供 AI 依此拆解任务、逐文件推进迁移。

---

## 0. 阅读前须知

本指南描述的是一次**范式迁移**，不是功能升级：业务逻辑、接口、路由、权限模型**保持不变**，改变的只是页面层的书写范式（Options API → Composition API）与类型标注（JS → 轻量 TS）。

本次变更的一个关键特征——**零工具链改动**：

- 未新增 `tsconfig.json`、未引入 `vue-tsc` / `type-check`、未改 `vite.config.mjs`、未改 `package.json` 依赖、未改 ESLint / Prettier 配置。
- TS 仅体现为 `.vue` 文件的 `<script setup lang="ts">` + 内联类型，由 Vite / esbuild **转译**（`pnpm build` 只转译、不做类型检查）。

因此升级本身**不需要安装新依赖**，风险集中在「代码书写范式」与「若干工具函数重命名」两处，下文分节详述。

> ⚠️ 演进说明：「零工具链改动」是**第一阶段**（范式迁移）的状态。第二阶段已引入 `tsconfig.json` 与
> `vue-tsc` 类型门禁（`pnpm run type-check`）；第三阶段将基础设施层全量转为 `.ts`；第四阶段将
> `vite.config.mjs` 转为 `vite.config.mts` 并引入 `tsconfig.node.json`。四个阶段中
> 构建链路始终为 esbuild 纯转译**不变**，详见 §9、§10、§11。

---

## 1. 升级概述

| 项目 | 说明 |
| --- | --- |
| 迁移对象 | `src/views/` 下全部业务页面（约 32 个 `.vue`） |
| 目标范式 | `<script setup lang="ts">` + Composition API + 轻量 TS |
| option 组织 | 一律**内联**在 `.vue` 内（`src/views/` **不使用** `mixins/crud.js`） |
| 参照样板 | `src/views/system/dict.vue`（系统管理类）、`src/views/authority/role.vue`（权限/树类） |
| 尚未迁移 | `src/components/`、`src/page/` 下的部分 `.vue` 仍为 Options API（属渐进迁移的允许混用状态） |
| 基础设施层 | 第三阶段已由 `.js` 全量转为 `.ts`（§10）；仅 `mixins/crud.js` 与 `vite/plugins/*.js` 保留 JS |
| 工具链 | 第一阶段无新增；第二阶段引入 `vue-tsc` 类型门禁（§9.1）；第四阶段构建配置层转 `.mts` 并引入 `tsconfig.node.json` 独立检查工程（§11）。`pnpm build` 始终为 esbuild 纯转译 |

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

`main.ts`（第三阶段前为 `main.js`）仍在 `app.config.globalProperties` 上挂载 `website` / `$dayjs` / `getScreen`，**模板中可直接使用**；但 `<script setup>` 脚本内**没有 `this`**，需改用 import：

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

`reactive` 不使用泛型参数、也不额外标注（列的类型在回调形参处用 `ColumnSchema` 承接，见 §9.3）：

```ts
const option = reactive({ column: [] });
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
| Avue 列配置（`option.column` 回调形参、`findColumn` 返回值） | `@/types/column` 的 `ColumnSchema`（§9.2） |
| 框架回调中不取用的对象形参（校验器 `rule`、懒加载 `treeNode`、上传回调 `res` 等） | `object` |
| 纯 `v-model` 绑定的对话框 / 表单模型 | 按 option 实际字段自建 `interface` |
| 有确定取值域 | 字面量联合，如 `ref<'ltr' \| 'rtl' \| 'ttb' \| 'btt'>('rtl')` |

禁止 explicit `any`；第二阶段起同时禁止 `Record<string, unknown>` 与裸 `unknown`（§9.3）。`reactive` 不使用泛型参数。

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
const option = reactive({ column: [] });
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
3. 排查 `src/page/`、`src/components/` 中对 `this.validData` / `this.findObject` / `this.validatenull` 等**已移除全局方法**的引用，改为显式 import（§2.2）。

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
| 9 | 运行期按扩展名寻址未同步 | 基础设施层转 `.ts` 后，`import.meta.glob` 查表等**运行期路径拼接**仍写 `.js` 会取到 `undefined`，且 `type-check` / `build` **都发现不了**（详见 §10.5）。 |
| 10 | Node 全局类型泄入浏览器工程 | 为让 `vite.config.mts` 通过检查而把 `@types/node` 加进 `tsconfig.json` 的 `types` 数组，会使 `process` 等 Node 全局在全部 `src/` 代码中不再报错，门禁放过「浏览器代码误用 Node API」类缺陷；应走独立的 `tsconfig.node.json`（详见 §11.2）。 |

---

## 8. 验证清单

### 8.1 静态

```
[ ] pnpm run build 通过（exit 0）
[ ] pnpm run type-check 通过（全仓 0 类型错误，含 Node 语境工程，见 §9.1 / §11）
[ ] 无 this.xxx 残留（src/views/）
[ ] 无 explicit any（: any / as any / <any>）
[ ] 无 Record<string, unknown> / 裸 unknown 残留（src/views/，见 §9.3）
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

## 9. 第二阶段升级：类型检查门禁与存量缺陷修复

> 第一阶段完成范式迁移后，`src/views/` 的 TS 代码仅由 esbuild 转译、从未被真正检查过，
> 类型错误只能在编辑器中零散暴露。第二阶段补上这块短板：引入独立的类型检查门禁，
> 并修复门禁与代码审查暴露的存量缺陷。业务逻辑、接口、路由、权限模型仍然**零变更**。

### 9.1 类型检查工具链

| 项目 | 说明 |
| --- | --- |
| 新增 `tsconfig.json` | 类型检查专用配置；构建仍由 esbuild 纯转译（`pnpm build` 不读取检查开关），检查与构建**解耦** |
| 移除 `jsconfig.json` | jsconfig 本质是 `allowJs` 默认开启的 tsconfig 子集，二者共存会产生解析歧义；由 tsconfig 接管，路径别名已补全（`~` / `components` / `styles` / `utils`） |
| 新增 devDependencies | `typescript`、`vue-tsc`、`@vue/runtime-core`（钉与 vue 一致版本，原因见 §9.2） |
| 新增命令 | `pnpm run type-check`（`vue-tsc --noEmit`），要求**全仓 0 错误** |

> ⚠️ 演进说明：第四阶段起 `type-check` 扩展为双工程检查——`vue-tsc --noEmit && tsc --noEmit -p tsconfig.node.json`（§11）。
> 命令名与「全仓 0 错误」的要求不变。

**JS 共存策略（关键）**：`allowJs: true` + `checkJs: false` —— `.js` 文件允许被 TS 侧引用、参与类型推断，
但**自身零检查、零要求**。

> ⚠️ 本段描述的是**第二阶段的状态**：彼时 `api/` `utils/` `store/` `router/` `option/` `mixins/` 仍为 JS 形态。
> **第三阶段已将其全量转为 `.ts`**（§10），`allowJs` 保留下来只为承接 `mixins/crud.js` 一个文件。

> ⚠️ `.js` 文件的 JSDoc 会参与签名推断：可选参数必须写成 `@param {number} [defaultValue]`（方括号语法），
> 否则 TS 视为必填，省参调用点报 `TS2554`（本次 `func.toInt` 即因此修正）。转为 `.ts` 后改用原生可选形参
> `defaultValue?: number`，JSDoc 中的类型标记随之移除。

### 9.2 新增类型基建（2 个纯类型文件，不参与构建产物）

**`src/env.d.ts`** —— 类型环境声明：`vite/client` 与 element-plus 全局组件类型、`main.ts` 挂载的
globalProperties（`$dayjs` / `website` / `getScreen`）、avue-router 挂载的 `Router.$avueRouter`、
axios 自定义配置字段（`meta` / `cryptoToken`）、`window.axios` / `window.$crudCommon`。

> ⚠️ `ComponentCustomProperties` 的扩展目标必须是 `@vue/runtime-core` 而非 `vue`：
> `@smallwei/avue` 已在 `@vue/runtime-core` 上建立声明合并标识，此后对 `vue` 的扩展不会并入同一接口
> （vue-router@4.6 的声明在 `vue` 上因此失效，`$route` / `$router` / `$store` 均在 env.d.ts 补齐）。
> 为使根目录可解析该模块，`@vue/runtime-core` 以 devDependency 钉在与 vue 一致的版本（pnpm 只提升直接依赖）。

**`src/types/column.ts`** —— 共享列配置类型 `ColumnSchema`，供 `option.column` 各类回调形参与
`findColumn` 返回值使用。**只声明工程实际读写的字段**（`prop` / `value` / `display` / `disabled` /
`addDisabled` / `dicData`），新增消费时按需补充，不做全量映射。

### 9.3 类型选型规则收紧

第二阶段起，除禁止 explicit `any` 外，同时**禁止 `Record<string, unknown>` 与裸 `unknown`** ——
它们只是把「没想清楚形状」写进代码。替代写法：

| 场景 | 写法 |
| --- | --- |
| 列配置（`column` 回调形参、`findColumn` 返回值） | `import type { ColumnSchema } from '@/types/column'` |
| 框架回调里不取用的对象形参（校验器 `rule`、懒加载 `treeNode`、上传回调 `res` 等） | `object`（诚实表达「确是对象、只是不读」，无需断言） |
| 纯 `v-model` 绑定的表单模型 | 按 option 实际字段自建 `interface`（如 `ExcelForm` / `DebugForm`） |
| 有确定取值域 | 字面量联合，如 `ref<'ltr' \| 'rtl' \| 'ttb' \| 'btt'>('rtl')` |

### 9.4 门禁暴露并修复的缺陷清单

类型检查跑通的过程本身就是一次审计。以下按性质分列，供二次开发工程升级时对照排查。

**A. 类型报错修复（vue-tsc 报错驱动，11 处）**

| 位置 | 问题 | 修复 |
| --- | --- | --- |
| `system/dept.vue` / `dict.vue` / `menu.vue` | 模板 `handleAdd(scope.row, scope.index)` 传 2 参而函数只收 1 参（TS2554） | 去掉从未被消费的 `index` 实参 |
| `api/logs.js` | 视图传 3 参（含查询条件）而函数只收 2 参——**条件检索静默失效** | 补 `params` 形参并透传后端 |
| `authority/apiscope.vue` / `datascope.vue` | `direction` 推断为 `string`，el-drawer 要求字面量联合（TS2322） | `ref<'ltr' \| 'rtl' \| 'ttb' \| 'btt'>('rtl')` |
| `utils/func.js` | `toInt` 第二参 JSDoc 未标可选，省参调用报 TS2554 | `@param {number} [defaultValue]` |
| `util/permission.vue` | `@expand-change` 绑定的处理器从未存在（死绑定，TS2339） | 移除绑定 |
| `util/logs.vue` | 演示页刻意引用未定义变量（TS2304） | `@ts-expect-error`（**全仓唯一允许的压制**） |

**B. 存量运行时缺陷修复（逐处经本仓证据确认）**

| 位置 | 缺陷 | 影响 / 说明 |
| --- | --- | --- |
| `validate.js cardId` | 校验位严格比对（数字 ≠ 字符），**合法身份证被全量误判**；parity 表多一位永取不到的 `'x'` | 归一为字符串大写后比对 |
| `validate.js isValidateMobile` | 误用座机正则且判断逻辑颠倒，任意 11 位数字均放行 | **行为收紧**：手机号须 `1[3-9]` 开头 |
| `util.js` 全屏三函数 | `requestFullScreen` 等大小写错误 / 不存在的 API，现代浏览器全屏失效 | 标准 API 优先、前缀分支兜底旧内核 |
| `util.js findByValue` | 数组翻译未命中时误回填整个数组 | 回填当前元素 `ele` |
| `utils/store.js` | boolean 反序列化走 `eval`；两处 `<=` 循环越界产出 `name: null` 脏条目 | 直取值 / 修正边界 |
| `mixins/crud.js` | `rowDel` 默认取 `api['del']`，但全仓 API 删除函数均名 `remove`，调用必抛 TypeError | 默认改 `remove`；二开工程若确有 `del` 导出，经 `option.del` 显式指定 |
| `components/basic-video/plugin.js` | 监听不存在的 `loadmetadata` 事件，视频流就绪后不会自动播放 | 改 `loadedmetadata` |
| `mockProdServer.js` | 引用不存在的 `mock/` 目录，坏引用死文件 | 删除 |

### 9.5 第二阶段验证清单

```
[ ] pnpm run type-check 通过（全仓 0 类型错误；唯一允许的压制是 util/logs.vue 的 @ts-expect-error）
[ ] pnpm run build 通过（构建链路与产物不受类型门禁影响）
[ ] pnpm run dev 正常启动
[ ] 无 Record<string, unknown> / 裸 unknown 残留（src/views/）
```

---

## 10. 第三阶段升级：基础设施层全量 TS 化

> 前两个阶段后，`src/views/` 已是 TS 而其依赖的 `api/` `utils/` `store/` `router/` 仍是 JS——
> 页面拿到的返回值、工具函数签名一律推断为 `any`，类型门禁形同虚设于「页面边界之外」。
> 第三阶段把基础设施层一并转为 `.ts`，让检查面覆盖到调用链两端。
> **业务逻辑、接口、路由、权限模型仍然零变更**：所有代码改动均为类型检查强制，无一处出于主观判断。

### 10.1 迁移范围

| 层 | 文件数 | 说明 |
| --- | --- | --- |
| `src/api/**` | 18 | 接口层 |
| `src/utils/**` | 7 | auth / crypto / func / sm2 / store / util / validate |
| `src/store/**` | 6 | index / getters / modules(user, common, tags, logs) |
| `src/router/**` | 4 | index / avue-router / page / views |
| `src/lang/**` | 4 | index / zh / en / ja |
| `src/config/**` | 3 | website / env / iconList |
| 入口文件 | 4 | main / axios / permission / error |
| 其余 | 3 | option/crud/index、mixins/index、components/basic-video/plugin |
| **合计** | **49** | 另新增 `src/types/menu.ts` |

`index.html` 的入口脚本同步改为 `/src/main.ts`。

**刻意保留为 `.js` 的两处**：

| 文件 | 保留原因 |
| --- | --- |
| `src/mixins/crud.js` | Options API 混入工厂，其 `this` 上的 `listBefore` / `addAfter` / `delAfter` 等钩子由**消费组件**提供而非混入自身声明，`defineComponent` 无法表达该契约；由 `allowJs: true` + `checkJs: false` 承接 |
| `vite/plugins/*.js` | Node 语境的构建插件，不在浏览器工程的检查面内；第四阶段起改由 `tsconfig.node.json` 承接（§11） |

### 10.2 迁移手法：重命名为主、标注为辅

检查档维持 `strict: false`，因此**隐式 `any` 不报错，形参无需标注**——18 个 api 文件里 14 个是零改动纯重命名。
只在类型检查真正拦下来的位置补标注，**不为标注而标注**：

| 触发的报错 | 补法 | 实例 |
| --- | --- | --- |
| `TS2554` 实参少于形参 | 尾部形参标可选 | `getDeptTree(tenantId?: string)`、`getLazyTree(parentCode, params?: object)` |
| `TS2339` 解构 `{}` 上不存在的属性 | 为参数袋建 `interface` | `utils/store.ts` 的 `StoreParams` / `StoreRecord`、`store/modules/user.ts` 的 `LoginPayload` |
| `TS2794` `resolve()` 不传参 | `Promise` 补 `void` 泛型 | `new Promise<void>((resolve, reject) => ...)` |
| `TS2339` 浏览器私有 API | 收进 `env.d.ts` 全局声明 | `Document.webkitIsFullScreen`、`HTMLElement.mozRequestFullScreen`、`Screen.left/top` |
| 动态导入模块形状未知 | `import.meta.glob<T>()` 泛型 | `avue-router.ts` 的 `modules` |

> ⚠️ **不要为了消错而改业务写法**。本阶段全部代码改动可逐条追溯到一个具体的 TS 报错码；
> 凡是「看着不对但编译器没报」的地方一律不动（详见 §10.4）。

### 10.3 结构等价改写（运行时行为不变，但代码形态必须改）

以下 4 处无法靠加标注解决，须改写结构，改写后运行时对象形态与调用语义完全一致：

| 位置 | 原因 | 改写 |
| --- | --- | --- |
| `router/avue-router.ts` | TS 中函数类型上挂 `install` 属性不成立（`RouterPlugin.install = ...` 报 `TS2339`） | 插件本体由「函数对象」改为「对象字面量含 `install` 方法」；`this` 指向、闭包捕获、`safe` 自引用均不变 |
| `utils/store.ts` `getStore` | 原用同一个 `obj` 先后承载原始串与 `JSON.parse` 结果，两种类型不兼容 | 拆为 `raw` / `obj` 两个变量，取值链路与 `catch` 回退语义不变 |
| `utils/util.ts` `findByValue` | 原 `result` 初值为 `''`（推断 `string`）却在数组分支被赋数组 | 改为分支内直接 `return`，三条出参路径取值与原实现逐一对齐 |
| `router/page/index.ts`、`router/views/index.ts` | 字面量推断出的联合类型与 `RouteRecordRaw` 的重定向分支互斥（`TS2322`） | 显式标注 `const routes: RouteRecordRaw[]`，末尾 `export default routes` |

### 10.4 本阶段的取舍原则：只改编译不过的，不改「看着不对的」

TS 化过程会顺带暴露一批存量疑点。本阶段**刻意不修**其中任何一条——修不修属业务决策，不应搭迁移的便车。
以下为已识别但**保持原样**的清单，供二次开发工程自行评估：

| 位置 | 现象 | 为何不改 |
| --- | --- | --- |
| `utils/util.ts` `findArray` / `findParent` | 第一阶段 `==`→`===` 规范化后（见附录 B），字典配置或菜单主键存在 string / number 混用时不再命中 | 改相等语义会直接影响字典回显与菜单查找，属业务决策。**已同步修正原本与代码矛盾的注释**（旧注释写「需宽松匹配」却是 `===`），并注明调用方需自行归一类型 |
| `store/modules/user.ts` `LoginByPhone` | 调用 `loginByUsername(userInfo.phone, userInfo.code)`——手机号落在 `tenantId` 位、验证码落在 `account` 位 | 开源版无短信授权端点，该链路本就未接通；改调用等于新增功能 |
| `utils/store.ts` `getAllStore` | 枚举到的键已含 `saber-` 前缀，回传 `getStore` 时被二次拼接，`content` 恒为 `undefined` | 仅影响 `views/util/store.vue` 演示页，属独立缺陷 |
| `store/modules/user.ts` `GetMenu` | 遗留 `console.log(menu)` | 与迁移无关 |

**唯一的例外**是 `store/modules/user.ts` 的 `LoginBySocial`：其失败分支调用了未导入的 `Message`（`TS2552`），
JS 下必抛 `ReferenceError`，TS 下直接编译不过——**无法保留原样**，改为同文件已导入的 `ElMessage`。

同类被迫改动还有两处，均无运行时差异：

- `error.ts`：`process.env.NODE_ENV === 'development'` → `import.meta.env.DEV`（浏览器工程无 `process` 类型，Vite 下二者取值等价）
- `router/index.ts`：删除 `createRouter` 的 `base` 选项（vue-router 4 的 `RouterOptions` 已无此项，一直是空转）

### 10.5 ⚠️ 陷阱：运行期按扩展名寻址的代码不会被门禁发现

`mixins/crud.js` 通过 `import.meta.glob` 的键**按扩展名**取模块：

```js
// 迁移前：键全是 .js，正常命中
import.meta.glob(`../api/**/**`)[`../api/${option.name}.js`]
```

基础设施层转 `.ts` 后，glob 产出的键变成 `../api/system/dict.ts`，而查表用的仍是 `.js` ——
取到 `undefined`，`created()` 里 `optionObj()` 抛 `TypeError: optionObj is not a function`。

**这类缺陷 `type-check` 与 `build` 都发现不了**：它是运行期字符串查表，不是静态 import；
且 `crud.js` 本身在 `checkJs: false` 之外。修法是按 `.ts` 取、保留 `.js` 回退：

```js
const pickModule = (modules, path) => modules[`${path}.ts`] || modules[`${path}.js`]
let optionObj = pickModule(import.meta.glob(`../option/**/**`), `../option/${option.name}`)
let apiObj = pickModule(import.meta.glob(`../api/**/**`), `../api/${option.name}`)
```

> 二次开发工程升级时务必自查：凡是拼接文件路径的地方（`import.meta.glob` 查表、`require.context`、
> 动态 `import()` 的模板字符串），扩展名都要同步，且**必须真正跑一遍**才能验证。

### 10.6 第三阶段验证清单

```
[ ] pnpm run type-check 通过（全仓 0 错误；唯一压制仍是 util/logs.vue 的 @ts-expect-error）
[ ] pnpm run build 通过
[ ] pnpm run dev 启动后逐个拉取关键模块，确认无转译错误：
      main.ts / axios.ts / router/avue-router.ts / store/modules/user.ts / permission.ts
[ ] src/ 下仅剩 mixins/crud.js 一个 .js 文件
[ ] 全仓搜索 `.js'` / `.js\`` 字面量，确认无遗漏的运行期路径拼接（§10.5）
[ ] 登录 → 菜单加载 → 标签页 → 锁屏 → 全屏 → 语言切换 逐项人工回归
```

---

## 11. 第四阶段升级：构建配置层 TS 化与 Node 语境检查工程

> 前三个阶段把检查面铺满了 `src/`，但构建配置层始终游离在外：`vite.config.mjs` 与
> `vite/plugins/*.js` 虽被列入 tsconfig 的 include，却因 `checkJs: false` 不被实际检查，
> `process` / `__dirname` 等 Node 全局在浏览器工程里也无从正确声明。第四阶段把主配置转为
> `.mts` 纳入真实检查，并为 Node 语境建立独立的检查工程，与浏览器工程互相隔离。
> 构建产物与开发服务器默认行为**零变更**。

### 11.1 迁移内容

| 项目 | 说明 |
| --- | --- |
| `vite.config.mjs` → `vite.config.mts` | 补 `ConfigEnv` / `UserConfig` 类型标注；server 配置抽出为 `serverConfig`，端口与代理目标改由环境变量驱动（见 §11.2） |
| 新增 `tsconfig.node.json` | Node 语境独立检查工程：`types: ["node"]`、`lib: ["esnext"]`（无 DOM），include 仅 `vite.config.mts` 与 `vite/**/*.js`，由 `tsc --noEmit -p tsconfig.node.json` 独立执行 |
| `tsconfig.json` | include 移除 `vite.config.mjs` 与 `vite/**/*.js`，构建配置层整体移交 node 工程，浏览器工程检查面自此不含任何 Node 语境文件 |
| `package.json` | `type-check` 扩展为 `vue-tsc --noEmit && tsc --noEmit -p tsconfig.node.json`；devDependencies 新增 `@types/node` |
| `.env.development` | 新增 `VITE_APP_PORT`（开发服务器端口）与 `VITE_APP_PROXY_TARGET`（`/api` 代理目标）两键 |

`vite/plugins/*.js` 维持 JS 形态，由 node 工程的 `allowJs: true` + `checkJs: false` 承接——
与 `mixins/crud.js` 在浏览器工程中的待遇一致：允许被引用参与推断，自身零检查。

### 11.2 关键决策

**为什么建独立的 `tsconfig.node.json`，而不是把 `@types/node` 加进浏览器工程**：`types` 数组
中的包注入的是**全局**声明——`@types/node` 一旦进入 `tsconfig.json`，`process` / `Buffer` 等
Node 全局在全部 `src/` 代码中都不再报错，门禁将放过「浏览器代码误用 Node API」这类真实缺陷；
反向同理，DOM lib 也不应泄入构建配置层（node 工程的 `lib` 刻意不含 `dom`）。两个语境各建工程、
互相隔离，各自的检查面才都严格。

**扩展名为何取 `.mts` 而非 `.ts`**：`package.json` 未声明 `"type": "module"`，`.mts` 后缀向
tsc 与 Node 显式声明 ESM 语义，模块判定无歧义，也与原 `.mjs` 的语义一脉相承。

**`__dirname` 在 ESM 配置中为何可用**：Vite 加载配置文件时会将其打包并注入 `__dirname` /
`__filename`，`@types/node` 亦有对应全局声明，类型与运行时行为一致。这是 Vite 对配置文件的
特殊处理，**不可类推**到工程内其他 Node ESM 脚本。

**server 配置环境变量化**：端口与代理目标原为硬编码，现改由 `VITE_APP_PORT` /
`VITE_APP_PROXY_TARGET` 驱动，且保留原值兜底（`2888` / `http://localhost`）——二开工程升级后
即使 `.env` 未补这两个键，开发服务器行为也与升级前完全一致。

### 11.3 第四阶段验证清单

```
[ ] pnpm install 后 pnpm run type-check 通过（vue-tsc 与 tsc 双工程均 0 错误）
[ ] pnpm run build 通过（构建链路不读取任何检查开关，产物不变）
[ ] pnpm run dev 启动端口与 VITE_APP_PORT 一致，/api 代理指向 VITE_APP_PROXY_TARGET
[ ] tsconfig.json 的 include 不再包含 vite 配置层，其 types 数组中无 @types/node（§7 陷阱 10）
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

## 附录 B · 第一阶段迁移文件清单（基准提交 `177a56e8`，47 个文件）

> 本清单为**第一阶段**（页面层范式迁移）的范围快照。其中标注「仍为 JS」的基础设施文件
> 已在第三阶段全量转为 `.ts`（§10.1），阅读时请以 §10 为准。

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
const option = reactive({ /* ... */ column: [] });
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
