# AGENTS.md

本文件适用于仓库根目录及全部子目录，供参与 Saber 开发的 AI 代理和工程师使用。交流、代码注释、提交说明默认使用中文；代码标识符保持英文。

## 1. 项目定位与事实来源

Saber 是 SpringBlade 的官方 Vue 3 管理端，与 SpringBlade Boot/Cloud 后端配套。当前仓库版本为 `5.0.1`，实际依赖以 `package.json` 和锁文件为准：Vue 3.5、TypeScript、Vite 5、Element Plus、Avue 3.9、Vue Router 4、Vuex 4、Axios、vue-i18n 和 Sass。

遇到文档、模板和现有代码不一致时，按以下优先级判断：

1. 用户当前需求和目标模块的现有实现。
2. `package.json`、`vite.config.mts`、`tsconfig*.json`、`.env.*` 等当前配置。
3. 同目录或同类型页面的现有代码。
4. `.claude/skills/blade-design/references/frontend.md` 与 `.claude/skills/avue-design/references/`。
5. `README.md` 中的项目背景信息。

技能参考中仍有 Options API、JavaScript 和旧版 Avue 示例。它们只用于理解交互和接口语义，不得覆盖本仓库已经完成的 TypeScript/Composition API 迁移结果。Avue 能力或属性不确定时，按任务读取 `.claude/skills/avue-design/references/` 中对应文档，并以已安装版本和本地用法校验。

## 2. 工程结构

```text
src/
├── api/                 # 按业务模块组织的 HTTP 接口
├── components/          # 公共组件，basic-container/basic-block 等在 main.ts 全局注册
├── config/              # website、环境地址、图标等全局配置
├── lang/                # zh/en/ja 国际化资源
├── mixins/              # 历史 CRUD 混入；crud.js 为刻意保留的 JavaScript
├── option/              # 少量可复用或自动装配的 Avue 配置
├── page/                # 登录、锁屏、主布局，仍允许保留 Options API
├── router/              # 静态路由、动态菜单路由和组件装配
├── store/               # Vuex store、getters 与业务模块
├── styles/              # 全局样式、变量、mixin 和明暗主题
├── types/               # 项目自建的最小类型声明
├── utils/               # 鉴权、加密、校验、存储和通用工具
├── views/               # 业务页面；必须使用 Composition API + TypeScript
├── axios.ts             # Axios 实例、鉴权头和统一错误处理
├── permission.ts        # 登录、锁屏、标签页等路由守卫
└── main.ts              # 应用入口和全局注册
vite/                    # Vite 插件；现有插件文件刻意保留 JavaScript
doc/guide/               # 升级与迁移文档
```

路径别名：`@` 指向 `src`，`~` 指向仓库根目录，`components`、`styles`、`utils` 分别指向对应的 `src` 子目录。优先使用别名，避免深层相对路径。

## 3. 开始开发前

1. 先阅读目标业务的 `src/views/{module}/` 和 `src/api/{module}/`，再看一个相近页面；不要仅按通用模板生成。
2. 系统管理页面优先参考 `src/views/system/dict.vue`、`src/views/system/user.vue`；权限树参考 `src/views/authority/role.vue`、`datascope.vue`；工具页面参考 `src/views/tool/`。
3. 搜索 `src/components/`、`src/utils/` 和现有 API，优先复用已有能力。
4. 检查工作区状态，保留用户已有改动；不要顺手格式化、迁移或重构无关文件。
5. 需求涉及 Avue 特定能力时，只读取相应参考：CRUD 基础看 `crud-core.md`，列/字典看 `crud-column.md`，搜索看 `crud-search.md`，弹窗表单看 `crud-form-dialog.md`，树表/主子表/导入导出看 `crud-features.md`，字段类型看 `form-field-types.md`。

## 4. Vue 与 TypeScript 规范

### 4.1 页面范式

- `src/views/**/*.vue` 新增和修改统一使用 `<script setup lang="ts">` 与 Composition API。
- 禁止在业务页面新增 `data()`、`methods`、`computed` 选项、`mapGetters` 或 `this.$xxx`。
- `src/components/`、`src/page/` 仍处于渐进迁移状态。局部修改应遵循文件现有范式，不为无关需求做整文件迁移。
- 新增 API、工具、配置、store、router、lang 和 option 文件使用 `.ts`。仅 `src/mixins/crud.js` 与 `vite/plugins/*.js` 是有意保留的 JavaScript。
- 方法和事件处理器使用 `const fn = (...) => {}`。

### 4.2 导入和全局能力

- Vue/Vuex API 必须显式导入且只导入实际使用项，如 `ref`、`reactive`、`computed`、`watch`、`useStore`。虽然工程配置了 auto-import，但没有生成声明文件。
- 消息与确认框使用 `ElMessage`、`ElMessageBox` 显式导入。
- 脚本中使用 `import website from '@/config/website'`、`import dayjs from 'dayjs'`、`import request from '@/axios'`，不要依赖 `this.website`、`this.$dayjs` 或 `window.axios`。
- 使用 `validData`、`findColumn` 时从 `@/utils/util` 导入；使用空值校验时从 `@/utils/validate` 导入 `validateNull`。
- `findColumn` 未命中返回 `null`，修改列配置前必须判空。

### 4.3 状态与类型

- 实体使用局部 `interface XxxEntity`，表单通常为 `type XxxForm = Partial<XxxEntity>`。
- 列表使用 `ref<XxxEntity[]>([])`；表单、查询、选中项和加载状态使用 `ref`。
- Avue `option` 和单向绑定的分页对象使用 `reactive({ ... })`，不要写 `reactive<T>()`。
- `v-model:page="page"` 会整体重赋值，`page` 必须使用 `ref`；仅 `:page="page"` 时可用 `reactive`。
- `@on-load` 形参命名为 `pageData` 等，避免遮蔽外层 `page`。从形参读取页码，把 `total` 写回外层响应式对象。
- Element Plus 实例可用 `ref<InstanceType<typeof ElXxx>>()`；缺少公开类型的 Avue 实例使用无泛型 `ref()`。
- 已有共享类型优先使用 `@/types/column` 的 `ColumnSchema` 和 `@/types/menu` 的 `MenuItem`。
- 禁止显式 `any`，也不要用裸 `unknown` 或 `Record<string, unknown>` 掩盖未梳理的数据结构。类型检查未要求时避免过度标注；确实不读取内容的对象参数可用 `object`。
- 工程当前 `strict: false`、`allowJs: true`、`checkJs: false`；不要擅自一次性开启严格模式。

### 4.4 格式与命名

遵循 `.prettierrc.json`：100 字符行宽、2 空格、分号、单引号、箭头函数单参数不加括号、对象括号保留空格。不要对未修改文件做全仓格式化。

- 页面文件：kebab-case，如 `api-scope.vue`。
- 公共组件：kebab-case 目录配 `main.vue`。
- API、option、工具文件：camelCase。
- 变量和函数：camelCase。
- Vuex mutation：UPPER_SNAKE_CASE；action 沿用现有 PascalCase。
- 权限码：`{module}_{action}`，如 `dict_add`、`user_delete`。

## 5. API 层约定

- 所有请求经 `@/axios` 发起，不另建 Axios 实例，也不要重复实现 Token、NProgress 或统一错误提示。
- Blade 接口统一使用 `/blade-{module}/...` 前缀；Boot 和 Cloud 前端路径一致。
- 标准命名：`getList(current, size, params)`、`getDetail(id)`/`getXxx(id)`、`add(row)`、`update(row)`、`remove(ids)`、`getXxxTree()`。
- 分页接口通常返回 `res.data.data.records` 和 `res.data.data.total`；树或非分页接口可能直接返回 `res.data.data`。以接口和相邻页面为准。
- GET 查询放 `params`，POST 请求体放 `data`。批量删除的 `ids` 通常为逗号分隔字符串。
- 新增和修改通常共用 `/submit`，但已有模块存在专用 `/update` 时必须遵循实际后端契约，不能机械改写。
- 需要加密令牌时使用请求配置 `cryptoToken: true`；不要自行拼装 `Blade-Auth`。项目的固定 Cookie Key、OAuth Basic 头和 SM2 登录加密不得随意改变。
- 不要在页面重复展示由 `axios.ts` 已统一处理的普通接口错误；Avue 保存失败时仍需调用其 `loading()` 回调复位按钮。

## 6. Avue 页面约定

### 6.1 标准 CRUD

业务页通常由 API 文件和页面文件组成；`src/views/` 的 option 默认内联在 `.vue` 中。只有相邻模块已经使用自动装配或配置确需复用时，才新增 `src/option/{module}/{name}.ts`。

标准页面应保持这些关系：

- 外层使用全局组件 `<basic-container>`。
- `<avue-crud>` 绑定 `option`、`data`、`table-loading`、`form`、`search`、`page`、`permissionList` 和 `beforeOpen`。
- 接入 `row-save`、`row-update`、`row-del`、`search-change`、`search-reset`、`selection-change`、分页、刷新和 `on-load` 等实际需要的事件。
- 搜索时更新 `query`、页码归 1 并加载；重置时清空 `query`。
- 批量删除前检查选中项，将 ID 以逗号连接；成功后刷新并清空选择。
- 加载开始设置 `loading.value = true`，成功和预期失败路径均应确保状态能够恢复。

Avue 保存回调语义不可颠倒：

```ts
const rowSave = (row: XxxForm, done: () => void, loading: () => void) => {
  add(row).then(
    () => {
      done();
      onLoad(page);
      ElMessage.success('操作成功!');
    },
    error => {
      window.console.log(error);
      loading();
    }
  );
};
```

成功调用 `done()` 关闭弹窗；失败调用 `loading()` 仅复位提交状态并保留用户输入。

### 6.2 Option、权限与字典

- `option.column` 同时驱动列表和表单；准确设置 `prop`、`type`、`search`、`hide`、`display`、`addDisplay`、`editDisplay`、`span`、`rules` 等属性。
- 远程字典遵循实际响应映射，常见写法为 `dicUrl` 配合 `props: { label, value }`；动态树数据加载后通过 `findColumn` 回填 `dicData`。
- 行按钮权限通过 `permissionList` 配置，使用 `validData(permission.value.xxx, false)`；自定义按钮还要在模板用对应 `v-if`。
- 超级管理员专属操作沿用 `userInfo.authority.includes('admin')`，不要把管理员判断等同于普通按钮权限。
- 复杂表单可使用 `group`/Tab 或 `dialogType: 'drawer'`，但不得为了视觉变化随意改变既有交互。

### 6.3 树形与主子表

- 树表需稳定设置 `row-key="id"` 和与后端结构一致的 `tree-props`。
- 父节点字段通常为 `type: 'tree'`；新增子节点时显式设置外键或 `parentId`。
- 主子表优先使用抽屉承载子表，分别维护主表和子表的 form、data、loading、page、option 状态。
- 打开子表前保存主表 ID；新增子项时在提交前写入该外键，禁止依赖界面显示值猜测关联关系。

## 7. 路由、权限、租户与国际化

- 静态页面路由位于 `src/router/page/` 和 `src/router/views/`；业务菜单主要由后端 `/blade-system/menu/routes` 动态下发。
- 动态组件遵循 `views/{path}.vue` 约定，由 `src/router/avue-router.ts` 的 `import.meta.glob` 装配。新增普通业务页面通常不需要手写前端路由。
- 外链菜单由路由层转换为 iframe 或新窗口，并可能替换 `${token}`；修改此链路时同时检查鉴权和 URL 编码。
- 按钮权限来自 `store.getters.permission`。不要仅隐藏按钮而遗漏接口侧/后端权限，前端显示控制不是安全边界。
- 多租户开关来自 `website.tenantMode`；不要硬编码租户模式或管理租户编号。
- 新增菜单 i18n key 时同步维护 `src/lang/zh.ts`、`en.ts`、`ja.ts` 的 `route.*` 条目。

## 8. 样式与组件复用

- 优先使用 Element Plus、Avue 和现有公共组件，不重复封装相同能力。
- 全局 SCSS 变量和 mixin 位于 `src/styles/variables.scss`、`mixin.scss`；优先使用现有变量，避免硬编码主题色。
- 明暗主题与动态主色统一位于 `src/styles/theme/tokens.scss`，调整时必须同时检查浅色、深色和自定义主色。
- 页面布局保持后台系统的紧凑、可扫描风格；不要引入与现有系统不一致的营销式布局或大面积装饰。
- Element Plus 图标已全量注册。沿用项目现有图标命名方式，不手写重复 SVG。

## 9. 命令与验证

使用 `pnpm`，不要生成 npm/yarn 锁文件。Node.js 要求 18 或更高版本。

```bash
pnpm run dev          # 开发服务器，默认 http://localhost:2888，监听 host
pnpm run prod         # 以 production 模式启动 Vite 开发服务
pnpm run type-check   # vue-tsc + Node 侧 tsc；不生成文件
pnpm run build        # 默认模式构建
pnpm run build:prod   # production 模式构建到 dist/
pnpm run serve        # 预览构建产物
```

`pnpm run build` 只由 Vite/esbuild 转译，不包含类型检查。改动 `.ts` 或 `.vue` 后至少运行 `pnpm run type-check`；影响构建、依赖、环境变量或 Vite 配置时再运行 `pnpm run build:prod`。需要浏览器验证时启动开发服务并检查目标页面、控制台和网络请求。

当前仓库没有单元测试、端到端测试或 lint 脚本。不要虚构命令；若新增测试基础设施，必须是用户需求的一部分并说明范围。

开发环境的 `VITE_APP_API=/api`，Vite 将 `/api` 代理到 `VITE_APP_PROXY_TARGET`（默认 `http://localhost`）。端口由 `VITE_APP_PORT` 控制，默认 `2888`。不要提交本机专用后端地址或密钥。

## 10. 变更与提交纪律

- 保持改动最小且聚焦，不修改无关格式、生成物和依赖元数据。
- `dist/` 是构建产物，除非用户明确要求发布产物，否则不要手工编辑或提交其变化。
- 引入新依赖前确认现有 Vue、Element Plus、Avue、dayjs、crypto-js、sm-crypto、NProgress 等能力不能满足需求，并说明新增依赖的必要性。
- 不修改认证头、Token Cookie Key、SM2 公钥、多租户行为或动态路由契约，除非需求明确要求且已检查后端兼容性。
- 提交前查看实际 diff，运行与风险匹配的验证；不要覆盖用户未提交的改动。
- Git 提交采用 Gitmoji 代码加中文描述，例如 `:sparkles:` 功能、`:bug:` 修复、`:zap:` 性能、`:lipstick:` 样式、`:recycle:` 重构、`:wrench:` 配置、`:memo:` 文档、`:fire:` 删除。只在用户明确要求时创建提交。

## 11. 完成标准

交付前确认：实现与相邻模块风格一致；权限、加载、空数据、错误和分页状态完整；API 参数位置和返回结构正确；TypeScript 门禁通过；没有无关变更、调试日志、临时地址或敏感信息。最终说明改动文件、行为变化、已运行的验证，以及仍需用户在真实后端环境验证的鉴权、多租户或业务流程。
