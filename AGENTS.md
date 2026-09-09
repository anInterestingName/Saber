# AGENTS.md

本文件适用于仓库根目录及全部子目录，供参与 Saber 开发的 AI 代理和工程师使用。交流、代码注释、提交说明默认使用中文；代码标识符保持英文。

## 1. 项目定位与事实来源

Saber 是 SpringBlade 的官方 Vue 3 管理端，与 SpringBlade Boot/Cloud 后端配套。当前仓库版本为 `5.0.1`，
实际依赖以 `package.json` 和锁文件为准。当前业务页面统一使用 Vue 3.5、TypeScript、Vite 5、Element Plus、
Vue Router 4、Pinia 4、Axios、vue-i18n 和 Sass。Avue 及其插件已从活动运行时、依赖和业务页面中移除，
不得重新引入 Avue 组件、配置、样式或运行时兼容层。

遇到文档、模板和现有代码不一致时，按以下优先级判断：

1. 用户当前需求、已确认的需求文档和验收标准。
2. `package.json`、`vite.config.mts`、`tsconfig*.json`、`.env.*` 等当前配置。
3. 目标模块当前 API、后端契约和现有业务行为。
4. 同类型 Element Plus 页面、公共组件和 composable。
5. `README.md` 中的项目背景信息。

历史 Avue 实现只存在于 Git 历史和迁移文档中，可用于追溯旧字段、接口和交互，不是当前代码模板。历史实现与已确认
需求冲突时，以需求和后端契约为准；发现历史行为未被当前文档覆盖时应记录并确认，不得根据旧实现机械恢复能力。

## 2. 工程结构

```text
src/
├── api/                 # 按业务模块组织的 HTTP 接口
├── components/          # Element Plus 公共组件及少量全局基础容器
├── composables/         # 分页、树列表、远程详情/选项、权限和选择状态
├── config/              # website、环境地址、图标等全局配置
├── lang/                # zh/en/ja 国际化资源
├── mixins/              # 历史刷新 Token mixin；不新增能力
├── page/                # 登录、锁屏、主布局，仍允许保留 Options API
├── router/              # 静态路由、动态菜单路由和组件装配
├── store/               # Pinia 根实例与 user/common/tags/logs 状态域
├── styles/              # 全局样式、变量、mixin 和明暗主题
├── types/               # 项目自建的最小类型声明
├── utils/               # 鉴权、加密、校验、存储和通用工具
├── views/               # 业务页面；统一使用 Composition API + TypeScript
├── axios.ts             # Axios 实例、鉴权头和统一错误处理
├── permission.ts        # 登录、锁屏、标签页等路由守卫
└── main.ts              # 应用入口和全局注册
vite/                    # Vite 插件；现有插件文件刻意保留 JavaScript
doc/                     # 需求、设计、测试、模板与迁移指南
```

路径别名：`@` 指向 `src`，`~` 指向仓库根目录，`components`、`styles`、`utils` 分别指向对应的 `src` 子目录。优先使用别名，避免深层相对路径。

## 3. 开始开发前

1. 先阅读目标业务的 `src/views/{module}/`、`src/api/{module}/`、关联需求和详细设计，再确认字段、接口、权限码和异常分支。
2. 分页 CRUD 优先参考 `src/views/system/param.vue`、`post.vue`；树表、复杂表单和授权树分别参考 `dict.vue`、`user.vue`、`src/views/authority/role.vue`；工具页面参考 `src/views/tool/code.vue`。
3. 搜索 `src/components/`、`src/composables/`、`src/types/`、`src/utils/` 和现有 API，优先复用已有 Element Plus 能力。
4. 明确当前任务涉及的目标页面和回归页面，不重新引入已经移除的框架或兼容实现。
5. 检查工作区状态，保留用户已有改动；不要顺手格式化、迁移或重构范围外文件。

## 4. Vue 与 TypeScript 规范

### 4.1 页面范式

- `src/views/**/*.vue` 新增和修改统一使用 `<script setup lang="ts">` 与 Composition API。
- 禁止在业务页面新增 `data()`、`methods`、`computed` 选项、`mapGetters` 或 `this.$xxx`。
- `src/components/`、`src/page/` 仍处于渐进迁移状态。局部修改遵循文件现有范式；需求明确要求迁移该文件时再完整调整范式。
- 新增 API、工具、配置、store、router、lang 和 composable 文件使用 `.ts`；新增 Vue 组件使用 `.vue` 并在脚本中使用 TypeScript。不新增 `src/option/` 或 CRUD mixin 文件。
- `src/mixins/index.ts` 是历史 Options API 刷新 Token mixin；除阻断性修复外不扩展，新增复用能力优先使用 composable。`vite/plugins/*.js` 刻意保留 JavaScript，局部修改遵循现有范式。
- 方法和事件处理器使用 `const fn = (...) => {}`。

### 4.2 导入和全局能力

- Vue/Pinia API 必须显式导入且只导入实际使用项，如 `ref`、`reactive`、`computed`、`watch`、`storeToRefs`。虽然工程配置了 auto-import，但没有生成声明文件。
- 消息与确认框使用 `ElMessage`、`ElMessageBox` 显式导入。
- 脚本中使用 `import website from '@/config/website'`、`import dayjs from 'dayjs'`、`import request from '@/axios'`，不要依赖 `this.website`、`this.$dayjs` 或 `window.axios`。
- 权限判断优先复用 `useCrudPermission`；其他现有能力使用 `validData` 时从 `@/utils/util` 导入。
- 空值校验从 `@/utils/validate` 导入 `validateNull`，不要复制一套相似校验函数。

### 4.3 状态与类型

- 实体使用局部 `interface XxxEntity`，表单通常为 `type XxxForm = Partial<XxxEntity>`。
- 列表使用 `ref<XxxEntity[]>([])`；表单、查询、选中项和加载状态使用 `ref`。
- 分页状态优先由 `usePagedList` 管理，非分页树状态优先由 `useTreeList` 管理；不要在页面重复实现请求序号、loading 和失败恢复。
- Element Plus 实例使用公开类型或 `ref<InstanceType<typeof ElXxx>>()`；表单提交前必须通过表单实例的 `validate()`。
- 菜单项等已有公共模型优先复用 `@/types/menu`，不为单页字段建立跨模块巨型实体类型。
- 列表响应、分页、树节点和远程选项优先复用 `@/types/list`、`@/types/tree` 和 `@/types/option` 中的契约。
- 禁止显式 `any`，也不要用裸 `unknown` 或 `Record<string, unknown>` 掩盖未梳理的数据结构。类型检查未要求时避免过度标注；确实不读取内容的对象参数可用 `object`。
- 工程当前 `strict: false`、`allowJs: true`、`checkJs: false`；不要擅自一次性开启严格模式。

### 4.4 格式与命名

遵循 `.prettierrc.json`：100 字符行宽、2 空格、分号、单引号、箭头函数单参数不加括号、对象括号保留空格。不要对未修改文件做全仓格式化。

- 页面文件：kebab-case，如 `api-scope.vue`。
- 公共组件：kebab-case 目录配 `main.vue`。
- API、composable、类型和工具文件：camelCase。
- 变量和函数：camelCase。
- Pinia action 默认使用 camelCase；认证与菜单等已有业务 action 沿用现有 PascalCase。
- 权限码：`{module}_{action}`，如 `dict_add`、`user_delete`。

## 5. API 层约定

- 所有请求经 `@/axios` 发起，不另建 Axios 实例，也不要重复实现 Token、NProgress 或统一错误提示。
- Blade 接口统一使用 `/blade-{module}/...` 前缀；Boot 和 Cloud 前端路径一致。
- 标准命名：`getList(current, size, params)`、`getDetail(id)`/`getXxx(id)`、`add(row)`、`update(row)`、`remove(ids)`、`getXxxTree()`。
- 分页接口通常返回 `res.data.data.records` 和 `res.data.data.total`；树或非分页接口可能直接返回 `res.data.data`。以接口和相邻页面为准。
- GET 查询放 `params`，POST 请求体放 `data`。批量删除的 `ids` 通常为逗号分隔字符串。
- 新增和修改通常共用 `/submit`，但已有模块存在专用 `/update` 时必须遵循实际后端契约，不能机械改写。
- 需要加密令牌时使用请求配置 `cryptoToken: true`；不要自行拼装 `Blade-Auth`。项目的固定 Cookie Key、OAuth Basic 头和 SM2 登录加密不得随意改变。
- 不要在页面重复展示由 `axios.ts` 已统一处理的普通接口错误；失败路径仍必须恢复页面 loading、提交锁和可重试状态。

## 6. Element Plus 页面约定

### 6.1 页面骨架与复用

- 业务页面外层沿用 `<basic-container>`，使用 Element Plus 组件和现有公共组件组合页面，不新建声明式 CRUD 引擎。
- 搜索区优先使用 `SearchPanel`，列表区使用 `ListPanel`，分页使用 `ListPagination`，表单弹窗使用 `FormDialog`，详情抽屉使用 `DetailDrawer`，行操作使用 `RowActions`。
- 分页列表优先复用 `usePagedList`，树列表使用 `useTreeList`，详情和动态选项分别使用 `useRemoteDetail`、`useRemoteOptions`，表格选择使用 `useTableSelection`。
- 只在职责、交互和数据契约稳定且有多个真实使用方时抽取公共组件或 composable；业务字段、API 参数和模块规则保留在页面或模块内。
- 页面应保持搜索、工具栏、表格、分页、弹窗的稳定布局。动态内容、loading、空数据和错误提示不得改变固定工具区尺寸或遮挡主要操作。

### 6.2 列表、表单与异常状态

- 查询时仅提交白名单字段并将页码归 1；重置时清空查询和页码；刷新保留最后一次已执行查询。每次用户操作只产生一次有效列表请求。
- 分页接口以服务端 `records` 和 `total` 为准；树接口不伪造分页。树表设置稳定 `row-key="id"`，按后端 `children` 展示层级。
- 加载、详情、选项和提交使用独立状态。快速切换查询、记录或租户时，旧响应不得覆盖当前上下文。
- 新增、查看和编辑共用表单时必须显式重置 mode、form、校验、只读状态和远程选项；关闭后不得把上一条详情或新增子项上下文带入下一次操作。
- 新增子项应显式保存父级上下文并写入 `parentId` 或实际外键；普通新增必须清除该上下文。编辑节点时不得允许选择自身或后代形成循环。
- 保存成功后关闭弹窗并按业务需要刷新；失败时保留用户输入、恢复提交按钮且不显示成功。详情或选项失败时清空旧值，并禁止提交依赖未成功加载的数据。
- 单删和批量删除均需确认；空选择不发请求。成功后刷新并清空选择，失败时保留记录、查询、页码和可重试选择。
- 主子表或复杂配置优先使用抽屉或对话框承载子列表，主表和子表分别维护 form、data、loading、page 和选择状态；提交子项前显式写入主记录 ID。

### 6.3 字典、权限与专项操作

- 字典显示与选择优先使用 `useDictionary`、`DictSelect` 和 `DictTag`；远程字典必须显式映射 label/value，保留后端约定的字符串或数值类型，不做真假值隐式转换。
- 标准按钮权限使用 `useCrudPermission` 或 `useUserStore().permission`，权限码保持 `{module}_{action}`。自定义入口同时执行可见性和操作前校验；后端仍是最终安全边界。
- 超级管理员专项入口沿用 `userInfo.authority.includes('admin')`，不得把管理员身份等同于普通按钮权限。
- 授权树优先使用 `TreeCheckPanel`；树数据、已选 keys、联动、半选和提交状态必须相互隔离，任一加载失败时不得展示不完整授权为当前结果。
- 上传使用 Element Plus Upload 和现有 Axios 请求；下载使用 Axios Blob 与标准认证头。不得把 Token 放入 URL，也不得把文件内容、密码或授权 keys 写入日志。
- 内联排序、授权、重置、解锁、复制、导入导出和代码生成等专项操作必须有独立执行锁、明确确认、成功判定和失败恢复；有服务端副作用时不得宣称前端已自动回滚。

### 6.4 已移除依赖边界

- 活动代码禁止重新引入 `@smallwei/avue`、`avue-plugin-*`、`avue-crud`、`avue-form`、Avue option/dicUrl、CRUD mixin 或 `.avue-*` 样式。
- `src/option/` 为空的历史目录，不新增文件；需要配置驱动能力时先确认现有组件和 composable 是否能够满足需求。
- 历史需求、设计、测试文档可以保留 Avue 迁移记录，不得据此恢复运行时依赖或旧实现。
- 修改依赖、应用入口、动态路由、主布局或全局样式时，应执行 `rg -n -i "avue" src package.json pnpm-lock.yaml`，确认没有活动引用。
- 动态菜单路由由 `src/router/dynamic-router.ts` 和 `src/router/menu.ts` 承载，除非需求明确要求，不重命名或改变其后端组件路径契约。

## 7. 路由、权限、租户与国际化

- 静态页面路由位于 `src/router/page/` 和 `src/router/views/`；业务菜单主要由后端 `/blade-system/menu/routes` 动态下发。
- 动态组件遵循 `views/{path}.vue` 约定，由 `src/router/dynamic-router.ts` 的 `import.meta.glob` 装配。新增普通业务页面通常不需要手写前端路由。
- 外链菜单由路由层转换为 iframe 或新窗口，并可能替换 `${token}`；修改此链路时同时检查鉴权和 URL 编码。
- 按钮权限来自 `useUserStore().permission`。不要仅隐藏按钮而遗漏接口侧/后端权限，前端显示控制不是安全边界。
- 多租户开关来自 `website.tenantMode`；不要硬编码租户模式或管理租户编号。
- 新增菜单 i18n key 时同步维护 `src/lang/zh.ts`、`en.ts`、`ja.ts` 的 `route.*` 条目。

## 8. 样式、响应式与可访问性

- 优先使用 Element Plus 和现有公共组件，不重复封装相同能力，不引入第二套 UI 组件库。
- 全局 SCSS 变量和 mixin 位于 `src/styles/variables.scss`、`mixin.scss`；优先使用现有变量，避免硬编码主题色。
- 明暗主题与动态主色统一位于 `src/styles/theme/tokens.scss`，调整时必须同时检查浅色、深色和自定义主色。
- 页面布局保持后台系统的紧凑、可扫描风格；不要引入与现有系统不一致的营销式布局或大面积装饰。
- Element Plus 图标已全量注册。沿用项目现有图标命名方式，不手写重复 SVG。
- 表格、工具栏、分页、弹窗和树控件必须定义稳定的响应式约束；至少检查 1440px、1024px 和 375px，移动端允许换行或横向滚动，但主要操作必须可达。
- 表单弹窗保持 header/footer 可见，正文独立滚动；焦点顺序、键盘关闭/确认、危险操作辨识和 loading 对比度应可用。
- 不新增 `.ant-*`、`.avue-*` 或针对第三方内部 DOM 的大范围 `:deep()` 补丁；通用视觉问题应在共享组件或主题 Token 层解决。

## 9. 文档契约

### 9.1 文档体系与模板

- `doc/requirements-index.md` 是需求编号、版本、状态和关联文档的统一登记入口，需求正文和详细变更记录保存在对应文档中。
- 需求文档使用 `doc/templates/requirements-template.md`，详细设计使用 `doc/templates/detailed-design-template.md`，涉及数据库变化时使用 `doc/templates/database-design-template.md`，测试文档使用 `doc/templates/test-document-template.md`。
- 新文档沿用 `REQ-YYYY-NNN` 编号：需求为 `doc/requirements/REQ-YYYY-NNN-short-name.md`，设计为 `doc/design/DESIGN-REQ-YYYY-NNN-short-name.md`，数据库设计文件名为 `DB-REQ-YYYY-NNN-short-name.md`，测试为 `doc/test/TEST-REQ-YYYY-NNN-short-name.md`。
- 文档、模板和实现不一致时按第 1 节事实来源处理。模板用于保证信息完整，不得用模板占位符覆盖已经确认的业务事实。

### 9.2 需求驱动任务的文档同步

以下任务需要建立或维护完整的“需求 -> 数据库设计（按需） -> 详细设计 -> 测试文档”链路：

- 用户明确要求正式需求、设计或验收归档。
- 新增业务能力，或改变用户可观察的业务规则和流程。
- 修改 API 契约、权限、租户、认证、数据模型或持久化行为。
- 跨模块重构、依赖替换或发布方案变化，且需要独立验收和回滚计划。

不改变业务契约的局部缺陷修复、样式调整、类型修正、内部重构、构建修复和文档勘误，默认不新建需求编号或完整
文档链。若它们属于已有需求，应只同步确实受影响的既有文档，不重复建档；用户有明确要求时按用户要求执行。

需要完整文档链时遵循以下规则：

1. 先在索引分配编号，再按“需求文档 -> 数据库设计（按需） -> 详细设计 -> 测试文档”的顺序建立关联文档。
2. 不涉及数据库变化时在需求、设计和索引中写明“不涉及”，不要创建空数据库设计。
3. 开发实现完成或进入下一阶段时，同步更新相关文档和索引的版本、状态、最后更新日期、关联链接和变更记录。
4. 文档记录实际完成范围、实现偏差、验证命令与结果、未完成验收项和已知环境限制，描述必须与代码现状一致。
5. 文档版本从 `0.1` 开始；评审确认后使用 `1.0`，后续按兼容变化或重大范围变化递增版本，并记录变更。
6. 状态使用索引定义的统一枚举。仅完成开发或部分验证时保持“开发中”；全部验收标准和必要业务回归通过后才能标记“已验收”。
7. 文档新增或关联关系变化后检查相对链接，避免单向关联或失效路径。

### 9.3 测试文档编写

正式需求进入“开发完成，待验收”且需要验收归档、用户明确要求编写测试文档，或详细设计将测试文档列为交付物时，
在 `doc/test/` 创建或更新关联测试文档。测试默认由用户在目标环境手工执行；编写测试文档不代表代理自动执行测试。
不得脱离模板另建只有用例列表或测试结论的简化文档。

1. 测试事实来源依次为用户当前要求、关联需求、详细设计、当前代码与 API 契约、同阶段既有测试文档。发现不一致时记录待澄清项，不得自行选择有利于通过的预期。
2. 保留模板中的文档信息、测试范围、测试环境、测试用例、缺陷记录、测试汇总、测试结论和变更记录。可以增加使用说明、测试准备、覆盖矩阵、数据清理和执行约束，但不得删除模板核心信息。
3. 文档信息至少包含测试编号、关联需求、关联设计、负责人、状态、测试日期、版本、创建日期、最后更新日期及前后端版本或提交。未知信息填写“待准备”或“待执行”，不得猜测。
4. 测试范围分别写明目标、范围内页面/接口/流程和不测试内容。后端、数据库、外部服务或人工核验不在范围时必须明确标注。
5. 从需求逐条提取验收标准、业务规则、异常流程、安全约束、权限/租户边界和回归要求。文末建立验收标准覆盖矩阵，保证每项验收标准至少关联一个可执行用例；存在缺口时记录阻塞原因。
6. 每个用例必须是可独立验收的完整状态链，至少包含唯一编号和名称、优先级、关联验收标准、模块与页面入口、前置账号角色/权限/租户/数据、依赖、完整步骤、逐步可观察预期、证据要求、清理要求、实际结果、结果状态和缺陷引用。
7. 用例应声明依赖关系、是否涉及共享登录态或全局配置，以及适合手工还是自动执行。端口、批次、模型、浏览器工具和并发数不属于业务测试契约，不写入固定计划。
8. 步骤必须使用明确的页面入口、按钮名称、输入数据和观察点；预期同时覆盖可见页面状态及影响结论的控制台或网络状态，不写“功能正常”“显示正确”等笼统表述。
9. 写操作用例定义唯一数据前缀和精确清理范围。删除、授权、租户、导入、下载、代码生成等高风险行为必须写清允许操作的数据、确认点、副作用和失败恢复；无法安全清理的数据不得授权自动删除。
10. 测试文档、截图、日志和缺陷记录不得包含密码、Token、客户端密钥、数据源凭据、上传文件正文或其他敏感数据。账号只记录代号、角色和最低权限，实际凭据由执行环境安全提供。
11. 编写过程中可使用“草稿”，完成自检后改为“待执行”；用例结果初始为“未执行”。正式结果只使用“未执行”“通过”“失败”“阻塞”或“不适用”，汇总数量必须与实际用例数一致。
12. 建档或测试范围、版本、状态变化后，按第 9.2 节同步关联需求、设计和索引；仅完成测试文档编写不得把需求标记为“已验收”。

测试文档完成后至少检查：链接可达；用例编号唯一；用例总数与汇总一致；全部验收标准均已映射；前置条件、
步骤、预期、证据和清理要求完整；没有敏感信息；状态与实际执行进度一致。

### 9.4 测试结果归档

- 用户完成手工测试并提供结果，或用户明确要求代理执行并记录测试时，才更新正式测试结果；不得根据代码检查推断业务用例通过。
- 测试完成或因明确阻塞阶段性收尾时，记录用例总数、执行范围、各状态数量、逐用例结果、证据位置、缺陷、数据清理和环境限制。
- 用户提供的信息不足以判断结果时保持“未执行”或“阻塞”，不得补写未经确认的步骤、证据或通过结论。
- 同步更新确实受影响的需求、详细设计和索引；涉及数据库设计但未验证后端时，明确后端不在测试范围。
- 记录未执行、阻塞、不适用、重试后不稳定和仍需真实业务环境验证的内容。存在失败、阻塞或未执行用例时，需求保持“开发中”或原有未完成状态。
- 归档后检查实际 diff，确保用例数和汇总一致，没有覆盖用户已有改动，没有写入账号密码、Token、本机专用后端地址或临时调试信息。

## 10. 命令与验证

使用 `pnpm`，不要生成 npm/yarn 锁文件。Node.js 要求 18 或更高版本。

```bash
pnpm run dev          # 开发服务器，默认 http://localhost:2888，监听 host
pnpm run prod         # 以 production 模式启动 Vite 开发服务
pnpm run type-check   # vue-tsc + Node 侧 tsc；不生成文件
pnpm run build        # 默认模式构建
pnpm run build:prod   # production 模式构建到 dist/
pnpm run serve        # 预览构建产物
```

`pnpm run build` 只由 Vite/esbuild 转译，不包含类型检查。改动 `.ts` 或 `.vue` 后至少运行
`pnpm run type-check`；修改共享基础能力，或影响构建、依赖、环境变量、Vite 配置时再运行 `pnpm run build:prod`。

页面、共享组件或 composable 改动还应执行与范围匹配的检查：

- 检查目标文件没有重新引入 Avue、Ant Design、旧 option/mixin 或针对第三方内部 DOM 的大范围样式补丁。
- 识别受影响的菜单、页面和共享调用方，并在交付说明中给出用户手工验收清单。
- 手工验收清单按改动范围覆盖页面主流程、Console、Network、浅色/深色主题及 1440px、1024px、375px 视口。
- 只有用户明确要求代理执行浏览器测试时，代理才启动开发服务并操作浏览器；执行方式根据当前环境能力确定，不在本文件中固定端口、浏览器、模型或并发数。
- 只将实际执行且取得结果的检查写入验证记录；静态扫描、类型检查、构建和业务验收不可相互替代。

当前仓库没有单元测试、端到端测试或 lint 脚本。不要虚构命令；若新增测试基础设施，必须是用户需求的一部分并说明范围。

开发环境的 `VITE_APP_API=/api`，Vite 将 `/api` 代理到 `VITE_APP_PROXY_TARGET`（默认 `http://localhost`）。端口由 `VITE_APP_PORT` 控制，默认 `2888`。不要提交本机专用后端地址或密钥。

## 11. 变更与提交纪律

- 保持改动最小且聚焦，不修改无关格式、生成物和依赖元数据。
- `dist/` 是构建产物，除非用户明确要求发布产物，否则不要手工编辑或提交其变化。
- 引入新依赖前确认现有 Vue、Element Plus、dayjs、Axios、crypto-js、sm-crypto、NProgress 等能力不能满足需求，并说明新增依赖的必要性。
- 不修改认证头、Token Cookie Key、SM2 公钥、多租户行为或动态路由契约，除非需求明确要求且已检查后端兼容性。
- 提交前查看实际 diff，运行与风险匹配的验证；不要覆盖用户未提交的改动。
- Git 提交采用 Gitmoji 代码加中文描述，例如 `:sparkles:` 功能、`:bug:` 修复、`:zap:` 性能、`:lipstick:` 样式、`:recycle:` 重构、`:wrench:` 配置、`:memo:` 文档、`:fire:` 删除。只在用户明确要求时创建提交。

## 12. 完成标准

交付前确认：实现与相邻模块风格一致；权限、加载、空数据、错误和分页状态完整；API 参数位置和返回结构正确；
TypeScript 门禁通过；没有无关变更、调试日志、临时地址或敏感信息。需求驱动任务同时按第 9 节完成文档同步。

最终说明改动文件、行为变化、已运行的验证，以及仍需用户在真实后端环境验证的鉴权、多租户、文件或业务流程。
未执行的验证必须明确说明，不得用类型检查或静态检索替代业务验收。

## 13. 测试职责边界

- 代理默认负责静态检索、类型检查、构建检查和受影响范围分析，不默认执行真实业务验收。
- 登录、权限、租户、文件操作和完整业务流程默认由用户在目标环境手工测试。
- 未经用户明确要求，代理不自动启动测试服务、操作浏览器、分派测试子代理或修改正式测试结果。
- 用户明确要求代理执行测试时，以用户指定的测试文档和当前运行时能力为准，执行计划在任务开始时动态生成；不得在仓库契约中固定模型、并发数、浏览器、端口或插件错误处理。
- 测试执行与缺陷修复是两个阶段。执行测试时只记录问题；只有用户明确要求修复后，才修改业务代码并重新验证。
- 最终交付必须区分已执行的工程检查、代理实际执行的测试、用户仍需手工验收的项目和已知环境限制。
