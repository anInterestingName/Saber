# Saber Pinia 状态管理迁移与 Vuex 4 完全移除详细设计文档

## 1. 文档信息

| 项目 | 内容 |
| --- | --- |
| 功能/模块 | Pinia 状态管理、应用启动、认证会话、动态路由、主布局、权限与日志 |
| 设计编号 | DESIGN-REQ-2026-006 |
| 设计版本 | 0.2 |
| 关联需求 | [需求索引](../requirements-index.md)；[REQ-2026-006 需求 0.3](../requirements/REQ-2026-006-pinia-migration-and-vuex-removal.md)；协同需求 [REQ-2026-005](../requirements/REQ-2026-005-element-plus-full-migration-and-avue-removal.md)；数据库设计不涉及；[测试文档 0.1（5 通过/11 阻塞）](../test/TEST-REQ-2026-006-pinia-migration-and-vuex-removal.md) |
| 实现回退基线 | `75f133d`（`迁移业务页面至 Element Plus`） |
| 目标版本/迭代 | Saber 5.x / Vue 3 状态管理升级 |
| 文档状态 | 开发中（已实现，待业务验收） |
| 设计负责人 | 待定 |
| 评审人 | 前端、安全、测试、产品按需填写 |
| 最后更新日期 | 2026-09-04 |

## 2. 设计摘要与范围

### 2.1 设计摘要

本设计采用一次性原子切换：在同一实现批次内创建唯一 Pinia 实例，将 `common`、`user`、`tags`、`logs` 四个
Vuex 模块转换为四个 Pinia Option Store，迁移全部 Options API、Composition API、模板和组件外调用方，随后
删除 Vuex store、全局 getters、`$store` 类型、直接依赖和锁文件记录。实现分步骤进行，但任何可交付代码状态都不
允许同时注册 Pinia 与 Vuex，也不增加模拟 `getters/commit/dispatch` 的兼容层。

状态文件继续放在项目既有 `src/store/` 目录，移除 `modules/` 与全局 getter 聚合结构，改为平级的
`common.ts`、`user.ts`、`tags.ts`、`logs.ts`。四个 store 使用 Option Store，以便状态、派生值和动作边界直接映射
现有 Vuex 模块，并让仍保留 Options API 的主布局和登录组件使用 Pinia 官方映射助手，不把状态管理迁移扩大为
页面范式重写。

当前最重要的结构性问题是 `user store -> api -> axios -> store/router` 循环依赖。迁移后 `axios.ts` 不再导入
router 或任何 store，而是暴露一次性 401 处理器注册入口，由 `main.ts` 在 Pinia、用户 store 和 router 均可用后
注入处理函数。路由守卫、动态路由、i18n、主题和错误处理均显式使用同一个 Pinia 实例，从初始化路径上禁止产生
第二棵状态树。

### 2.2 关键决策

| 编号 | 决策 | 原因 | 影响 |
| --- | --- | --- | --- |
| DEC-001 | 使用 `pinia@4.0.3`，精确锁定版本 | 设计时官方最新稳定版；与当前 Vue 3.5.40、TypeScript 5.9.3 兼容 | 新增运行时依赖，后续升级单独回归 |
| DEC-002 | 直接依赖 `@vue/devtools-api@8.1.5` | Pinia 4.0.3 将其声明为运行时 peer dependency | 锁文件可能同时保留其他依赖需要的 6.x，不影响 Vuex 零引用 |
| DEC-003 | 只创建一个导出的 Pinia 实例 | 组件外模块在应用挂载前即访问状态，需要明确实例 | `main`、router、permission、lang、error 使用同一实例 |
| DEC-004 | 原子切换，不注册双状态运行时 | 当前源代码已有提交回退点，用户确认可以整体回退 | 任一迁移门禁失败即回退整个批次 |
| DEC-005 | 不建立 Vuex 兼容层 | 兼容层会保留字符串分发、隐藏遗漏并削弱类型收益 | 所有调用方必须在同批次修改完成 |
| DEC-006 | 保留 `src/store/` 路径并删除 `modules/` 层 | 符合现有仓库结构且减少路径搬迁；Pinia 已按 store 分文件 | 删除 `store/getters.ts` 与 `store/modules/*` |
| DEC-007 | 四个状态域使用 Pinia Option Store | 与现有 state/getters/actions 结构接近，便于 Options API 映射和审查 | Composition API 仍通过 `storeToRefs` 使用 |
| DEC-008 | 不引入状态持久化插件 | 当前存储具有固定前缀、session/local 回退和时间元数据，通用插件会改变格式 | 继续调用 `utils/store.ts`，保持旧数据兼容 |
| DEC-009 | Axios 通过注册回调处理 401 | 解除 Axios 对 store/router 的反向依赖并集中并发去重 | 新增 `setUnauthorizedHandler` 和单次执行锁 |
| DEC-010 | 权限守卫改为显式 `setupPermissionGuards` | 移除仅靠模块副作用注册的隐式顺序 | `main.ts` 在 router 安装前完成守卫注册 |
| DEC-011 | 菜单路径格式化移至无状态纯函数模块 | 用户 store 需要格式化菜单，动态路由又需要标签 store；拆分可避免循环 | 新增 `router/menu.ts`，算法和外链规则不变 |
| DEC-012 | 动态路由安装显式接收 tags store | `closeTag` 只依赖标签状态，不应依赖通用全局 store | 删除 `Store<object>` 类型和字符串 mutation |
| DEC-013 | 用户 store 直接调用 common/tags store 完成跨域清理 | Pinia 不使用全局 mutation 命名空间；显式依赖可审查 | 登录、退出和 401 的清理顺序集中在用户动作中 |
| DEC-014 | Options API 使用 `mapState`/`mapActions`，不强制改写页面范式 | `src/page/` 允许保留 Options API，迁移目标是状态框架 | 17 个组件保持当前生命周期和交互结构 |
| DEC-015 | Composition API 使用具体 store 与 `storeToRefs` | 避免直接解构 store 丢失响应式并获得明确类型 | 14 个调用方和权限 composable 改为业务 store |
| DEC-016 | 规范化空用户为 `null`，旧空数组按“未加载”读取 | 当前 `[]` 仅充当空哨兵且会破坏语义判断 | 路由守卫使用 `hasUserInfo`，不依赖 truthy 判断 |
| DEC-017 | 退出和 401 同时清除 userInfo 与 permission | 当前残留可能让下一会话短暂读取上一用户状态，不满足状态隔离要求 | 属迁移阻断性安全修复，纳入专项回归 |
| DEC-018 | 登录业务失败必须 reject，不再以成功 Promise 继续跳转 | 当前 action 在 `success=false` 时仍 resolve，与需求失败流程冲突 | 登录页保留输入、恢复 loading 并按现有方式提示 |
| DEC-019 | 删除无真实消费者的 `menuId`、`tagCurrent` 与 store 内 `website` | `menuId` 无 mutation 调用，`tagCurrent` 无 getter，website 可直接导入 | 作为迁移清单中的显式废弃项，不提供别名 |
| DEC-020 | `isFullScren` 更名为 `isFullscreen` | 全部调用方同批次迁移，可消除长期拼写错误 | 仅内部状态名称变化，UI 行为不变 |

### 2.3 改动范围

| 层级 | 改动内容 | 不涉及内容 |
| --- | --- | --- |
| 后端 | 无代码改动；复用现有认证、菜单、权限和日志接口 | Controller、服务、数据库、认证协议 |
| 状态层 | 创建 Pinia 实例与四个 store；迁移 state/getters/actions | 新增服务端状态、离线缓存、跨标签同步 |
| 应用启动 | 调整 Pinia、主题、i18n、401、守卫、router 和错误处理初始化 | Vite 配置、环境变量、入口视觉结构 |
| 路由 | 动态路由接收 tags store；菜单格式化拆为纯函数 | 动态菜单算法、组件路径约定、外链规则 |
| 请求层 | Axios 注入 401 处理器并对并发 401 去重 | Token 头、序列化、NProgress、普通错误提示 |
| 页面/组件 | 替换 `mapGetters`、Vuex `useStore`、`$store` 与字符串调用 | 主布局整体重写、业务 UI 和字段调整 |
| 持久化 | 沿用现有 Cookie、localStorage、sessionStorage 格式和键 | 数据库迁移、批量清空浏览器存储 |
| 依赖 | 新增 Pinia 与 devtools peer；删除 Vuex | 升级 Vue、Router、i18n、Element Plus |
| 数据库 | 无 | 表、字段、索引和数据回填 |

## 3. 总体设计

### 3.1 架构图

~~~mermaid
flowchart TB
    Main[main.ts 原子启动编排]
    Pinia[唯一 Pinia 实例]
    Common[useCommonStore]
    User[useUserStore]
    Tags[useTagsStore]
    Logs[useLogsStore]
    Lang[vue-i18n]
    Router[Vue Router / dynamic-router]
    Guard[setupPermissionGuards]
    Axios[axios.ts]
    Unauthorized[401 处理器与单次执行锁]
    Error[全局 error handler]
    Pages[Options API / Composition API 页面]
    APIs[现有 Blade API]
    Storage[Cookie / localStorage / sessionStorage]

    Main --> Pinia
    Pinia --> Common
    Pinia --> User
    Pinia --> Tags
    Pinia --> Logs
    Main --> Lang
    Common --> Lang
    Main --> Router
    Main --> Guard
    Guard --> Common
    Guard --> User
    Guard --> Tags
    Router --> User
    Router --> Tags
    Main --> Unauthorized
    Unauthorized --> User
    Unauthorized --> Router
    Axios --> Unauthorized
    User --> APIs
    Logs --> APIs
    APIs --> Axios
    Error --> Logs
    Pages --> Common
    Pages --> User
    Pages --> Tags
    Pages --> Logs
    Common --> Storage
    User --> Storage
    Tags --> Storage
    Logs --> Storage
~~~

### 3.2 组件职责

| 组件/模块 | 职责 | 输入 | 输出 |
| --- | --- | --- | --- |
| `store/index.ts` | 创建并导出唯一 Pinia 实例 | 无 | `pinia` |
| `store/common.ts` | 语言、设置、布局、折叠、全屏、菜单、搜索、刷新、锁屏 | 存储值、界面动作 | 响应式公共状态与持久化 |
| `store/user.ts` | 登录、刷新、退出、用户、角色、权限、菜单与会话清理 | 登录载荷、API 响应 | 当前认证与授权上下文 |
| `store/tags.ts` | 首页标签、当前标签、标签列表与 keep-alive 名单 | 路由标签、关闭动作 | 标签状态与持久化 |
| `store/logs.ts` | 错误日志添加、数量、发送和清理 | 错误载荷 | 日志列表与发送结果 |
| `router/menu.ts` | 菜单路径、图标、组件与外链 URL 纯格式化 | `MenuItem` | 格式化后的菜单树 |
| `router/dynamic-router.ts` | 动态组件装配、标题和标签关闭 | Router、i18n、tags store、菜单 | RouteRecord、标题、标签操作 |
| `router/index.ts` | 创建 Router、安装动态路由、恢复持久化菜单 | pinia、user/tags store、i18n | 单一 Router 实例 |
| `permission.ts` | 注册登录、锁屏、用户恢复、标签和标题守卫 | Router、Pinia | beforeEach/afterEach 守卫 |
| `axios.ts` | 请求、响应、统一错误与 401 通知 | Axios 配置、401 handler | HTTP Promise |
| `main.ts` | 按确定顺序装配 Pinia、i18n、401、守卫、router 和插件 | App 与单例模块 | 已挂载应用 |
| `error.ts` | 创建绑定指定 Pinia 的全局错误处理插件 | Pinia、Vue Error | logs store 记录 |
| `lang/index.ts` | 根据 common store 初始语言创建 i18n | pinia/common store | i18n、messages、language |
| `useCrudPermission.ts` | 根据 user store 权限表生成 CRUD 权限 | 模块名、permission | add/view/edit/delete computed |

### 3.3 新增与移除依赖

| 依赖 | 动作 | 用途 | 版本与理由 | 锁文件/部署影响 |
| --- | --- | --- | --- | --- |
| `pinia` | 新增直接依赖 | Vue 3 全局状态管理 | 精确 `4.0.3`；官方稳定版，peer 要求匹配当前工程 | 新增 Pinia ESM 包，随主入口加载 |
| `@vue/devtools-api` | 新增直接依赖 | 满足 Pinia 运行时 peer dependency 与开发工具接入 | 精确 `8.1.5`；Pinia 4.0.3 要求最低版本 | 可能与 Router/i18n 的 6.x 并存 |
| `vuex` | 删除直接依赖 | 旧全局状态管理 | 全部调用方原子迁移后无用途 | 删除 `vuex@4.1.0` 及其专属解析关系 |

Pinia 4 为 ESM-only；当前工程由 Vite 5.4.21 构建并使用 ES module，满足加载条件。版本采用精确锁定，避免在状态
框架切换时同时引入后续 minor/major 变化。后续升级必须单独执行认证、路由、持久化和生产构建回归。

### 3.4 官方资料与评估日期

| 项目 | 官方资料 | 设计使用点 |
| --- | --- | --- |
| Pinia 4.0.3 | [官方 Release](https://github.com/vuejs/pinia/releases/tag/v4.0.3)；[包定义](https://github.com/vuejs/pinia/blob/v4.0.3/packages/pinia/package.json) | 当前版本、Vue/TypeScript/devtools peer 要求、ESM-only |
| Vuex 迁移 | [官方迁移指南](https://pinia.vuejs.org/cookbook/migration-vuex.html) | 模块拆分、Option Store、调用方迁移方式 |
| 组件外使用 | [官方说明](https://pinia.vuejs.org/core-concepts/outside-component-usage.html) | 显式 Pinia 实例与初始化顺序 |
| State/Getters/Actions | [官方核心概念](https://pinia.vuejs.org/core-concepts/) | `storeToRefs`、映射助手与动作设计 |

资料评估日期为 2026-09-04。实现开始前若 Pinia 发布新版本，本需求仍使用设计锁定的 `4.0.3`，除非重新评审并
同步需求、设计和锁文件策略。

### 3.5 文件改动清单

| 范围 | 文件 | 动作 |
| --- | --- | --- |
| Pinia 根实例 | `src/store/index.ts` | 替换 Vuex `createStore`，只导出 `pinia` |
| Store | `src/store/common.ts`、`user.ts`、`tags.ts`、`logs.ts` | 新增四个 Pinia Option Store |
| Vuex 遗留 | `src/store/getters.ts`、`src/store/modules/*` | 删除 |
| 菜单纯函数 | `src/router/menu.ts` | 新增，承接 `formatMenuPaths` |
| 路由 | `src/router/index.ts`、`src/router/dynamic-router.ts` | 改为显式 user/tags store |
| 启动 | `src/main.ts`、`src/permission.ts`、`src/lang/index.ts`、`src/error.ts` | 重排单实例初始化与插件装配 |
| 请求 | `src/axios.ts` | 删除 store/router 导入，新增 401 handler 注册和去重 |
| 类型 | `src/env.d.ts` | 删除 `$store: Store<object>` 声明 |
| 兼容 mixin | `src/mixins/index.ts` | 直接调用 user store 的 `RefreshToken` |
| Composition API | `auth-layout`、`logo`、`setting`、权限/系统/区域/代码页面、`useCrudPermission` | 使用具体 store 与 `storeToRefs` |
| Options API | 登录、锁屏、主布局、侧栏、标签、顶部工具、第三方注册共 17 个组件 | 使用 `mapState`、`mapActions` 或局部 store 方法 |
| 模板直连 | `page/index/index.vue`、`page/index/layout.vue` | 映射 `tagsKeep`，删除 `$store.getters` |
| 依赖 | `package.json`、`pnpm-lock.yaml` | 新增 Pinia/devtools，删除 Vuex |

## 4. 核心流程设计

### 4.1 应用启动流程

`main.ts` 成为唯一装配入口。`lang/index.ts` 和 `router/index.ts` 分别导出创建函数，不再在模块加载时隐式读取全局
store。所有组件外 store 均使用 `useXxxStore(pinia)` 显式绑定同一实例。

~~~mermaid
sequenceDiagram
    participant Main as main.ts
    participant Pinia as pinia
    participant Common as common store
    participant I18n as createAppI18n
    participant Router as createAppRouter
    participant User as user store
    participant Axios as axios.ts
    participant Guard as setupPermissionGuards
    participant App as Vue App

    Main->>Pinia: import 唯一实例
    Main->>Common: useCommonStore(pinia)
    Common-->>Main: 恢复 language/setting/lock
    Main->>I18n: createAppI18n(common.language)
    I18n-->>Main: i18n 实例
    Main->>Router: createAppRouter(pinia, i18n)
    Router->>User: useUserStore(pinia)
    Router->>Router: 按 menuAll 恢复动态路由
    Router-->>Main: router 实例
    Main->>User: useUserStore(pinia)
    Main->>Axios: setUnauthorizedHandler(handler)
    Main->>Guard: setupPermissionGuards(router, pinia)
    Main->>App: createApp(App)
    Main->>App: app.use(pinia)
    Main->>App: app.use(error/i18n/router/ElementPlus)
    Main->>App: mount('#app')
~~~

装配顺序固定为：

1. 导入唯一 `pinia`，使用显式参数实例化 common store。
2. 根据 `commonStore.language` 创建 i18n；根据 pinia 与 i18n 创建 router。
3. 实例化 user store，向 Axios 注册唯一 401 处理器。
4. 注册路由守卫，确保 `app.use(router)` 触发首次导航前守卫已就绪。
5. 创建 Vue App，先 `app.use(pinia)`，再安装错误处理、i18n、router 和 Element Plus。
6. 使用 common store 当前 setting 应用主题并挂载应用。

`createAppI18n` 和 `createAppRouter` 每次只由 `main.ts` 调用一次。开发环境可在创建函数内部检测重复调用并抛出明确
错误，但生产代码不通过全局变量缓存第二个实例。

### 4.2 Pinia 根实例

`src/store/index.ts` 只负责创建根实例，不导入任何业务 store，从而成为无反向依赖的图根：

```ts
import { createPinia } from 'pinia';

export const pinia = createPinia();
```

不默认导出 Vuex 风格 `store`，避免旧 `import store from '@/store'` 在遗漏迁移时继续通过。所有调用方必须明确导入
`pinia` 或某个 `useXxxStore`。

### 4.3 Common Store

`useCommonStore` 的 store id 为 `common`。状态初始化继续复用当前 `createSetting`、`normalizePrimaryColor` 和
`utils/store.ts`，不改变设置的归一化规则。

| 旧状态/getter | 新状态/getter | 初始值/来源 | 写入动作 | 持久化 |
| --- | --- | --- | --- | --- |
| `language` | `language` | `getStore('language') || 'zh-cn'` | `setLanguage` | local `language` |
| `setting` | `setting` | `createSetting(getStore('setting'))` | `setSetting`、`setLayout`、`resetSetting` | local `setting` |
| `layoutMode` | `layoutMode` getter | `setting.layout` | 只读 | 随 setting |
| `isHorizontal` | `isHorizontal` getter | `setting.layout === 'top'` | 只读 | 随 setting |
| `isCollapse` | `isCollapse` | `false` | `toggleCollapse` | 不持久化 |
| `isFullScren` | `isFullscreen` | `false` | `toggleFullscreen` | 不持久化 |
| `isMenu` | `isMenu` | `true` | `setMenuVisible` | 不持久化 |
| `isSearch` | `isSearch` | `false` | `setSearch` | 不持久化 |
| `isRefresh` | `isRefresh` | `true` | `setRefresh` | 不持久化 |
| `isLock` | `isLock` | session `isLock` 规范化为 boolean | `lock`、`clearLock` | session `isLock` |
| `lockPasswd` | `lockPassword` | session `lockPasswd` 或空串 | `setLockPassword`、`clearLock` | session `lockPasswd` |
| `website` | 删除 | 调用方直接导入配置 | 无 | 无 |

`setSetting`、`setLayout` 和 `resetSetting` 每次都通过 `createSetting` 归一化并一次写回存储。主题应用仍由页面或启动
编排调用 `applyTheme(commonStore.setting)`，store 不直接操作 DOM，便于保持状态层纯度。

### 4.4 User Store

`useUserStore` 的 store id 为 `user`。状态和响应只声明当前前端实际读取字段，不建立跨后端模块的巨型用户模型。

| 旧状态/getter | 新状态/getter | 初始值/来源 | 失效/清理 |
| --- | --- | --- | --- |
| `userInfo` | `userInfo: UserInfo | null` | local `userInfo`；旧 `[]`/空对象规范化为 `null` | 登录失败不写；退出/401 清除 |
| 无 | `hasUserInfo` getter | `userInfo !== null` | 随 userInfo |
| 无 | `isAdmin` getter | `userInfo?.authority?.includes('admin')` | 随 userInfo |
| `permission` | `permission: PermissionMap` | session `permission` 或 `{}` | 新会话前清空；按钮接口成功后替换 |
| `roles` | `roles: string[]` | `[]` | 用户信息失败、退出/401 清空 |
| `menu` | `menu: MenuItem[]` | local `menu` 或 `[]` | 菜单重载替换；退出/401 清空 |
| `menuAll` | `menuAll: MenuItem[]` | local `menuAll` 或 `[]` | 菜单合并；退出/401 清空 |
| `token` | `token` | local `token` 或空串 | 登录/刷新写入；退出/401 删除 |
| `refreshToken` | `refreshToken` | local `refreshToken` 或空串 | 登录/刷新写入；退出/401 删除 |
| `menuId` | 删除 | 无真实 mutation 调用和业务读取 | 不迁移 |

业务 action 保留当前 PascalCase 名称，减少登录和主布局方法名变化：

| Action | 设计 |
| --- | --- |
| `LoginByUsername` | 加密密码并请求 token；仅 `success=true` 时写认证状态、清标签和锁屏；业务失败抛出 `Error` |
| `LoginBySocial` | 保持 tenant/source/code/state 参数；成功处理与账号登录一致 |
| `LoginByPhone` | 保持当前手机号链路请求契约；成功后写认证状态并清标签/锁屏 |
| `GetUserInfo` | 请求用户信息并替换 roles；失败不保留本次不完整结果 |
| `RefreshToken` | 使用 store 当前 refreshToken；成功原子替换 access/refresh token 和 userInfo |
| `LogOut` | 先请求服务端 logout，成功后调用 `clearSession`；失败保留当前会话并向上抛出 |
| `FedLogOut` | 不请求后端，直接调用 `clearSession`；用于 401 和用户恢复失败 |
| `GetTopMenu` | 返回顶部菜单，不把局部列表写入全局状态 |
| `GetMenu` | 加载并格式化菜单，替换 menu、合并 menuAll，再触发 `GetButtons` |
| `GetButtons` | 拉取按钮树，转换为新的 PermissionMap 后一次替换 |
| `clearSession` | 清 token/cookie、userInfo、permission、roles、menu/menuAll、tags 与 lock；保留 language/setting/logs |

内部 `setToken`、`setRefreshToken`、`setUserInfo`、`setRoles`、`setMenu`、`mergeMenuAll`、`setPermission` 等动作统一
承担状态与存储同步。API action 不直接散落 `setStore`，避免成功路径只写内存或只写存储。

`GetMenu` 保留菜单响应先返回、按钮权限独立加载的现有交互节奏，但在开始加载按钮时先清空内存 permission，防止
切换用户或上下文后短暂展示旧权限。按钮失败保持空权限并由统一 Axios 显示错误，不恢复旧值。

### 4.5 Tags Store

`useTagsStore` 的 store id 为 `tags`。

| 旧状态/getter | 新状态/getter | 设计 |
| --- | --- | --- |
| `tagWel` | `homeTag` | 从 `website.firstPage` 创建只读首页标签 |
| `tag` | `currentTag: TagItem | null` | 从 local `tag` 规范化；无效值为 `null` |
| `tagList` | `tagList: TagItem[]` | 从 local `tagList` 过滤无 `fullPath` 项 |
| `tagsKeep` | `keepAliveNames` getter | 过滤 `meta.keepAlive` 并返回有效 `fullPath` |
| `ADD_TAG` | `addTag` | 将名称规范化为字符串；相同 fullPath 不重复插入 |
| `DEL_TAG` | `deleteTag` | 按 fullPath 删除指定标签 |
| `DEL_ALL_TAG` | `clearTags` | 默认清空；允许显式传入保留列表 |
| `DEL_TAG_OTHER` | `deleteOtherTags` | 只保留 currentTag 与首页标签 |

组件变量可以继续映射为原页面易读名称，例如 Options API 中把 `homeTag` 映射为 `tagWel`、把
`keepAliveNames` 映射为 `tagsKeep`；这只是组件局部属性名，不是 Vuex 兼容层。

### 4.6 Logs Store

`useLogsStore` 的 store id 为 `logs`。

| 旧状态/getter/action | 新设计 |
| --- | --- |
| `logsList` | `LogItem[]`，从 local `logsList` 恢复 |
| `logsLen` | `logCount` getter |
| `logsFlag` | `isEmpty` getter |
| `ADD_LOGS` | `addLog(payload)`，补充 URL 和 dayjs 时间 |
| `CLEAR_LOGS` | `clearLogs()`，内存与 localStorage 同步清空 |
| `SendLogs` | 保留 PascalCase；成功后 clearLogs，失败保留列表并向上抛出 |

`createErrorPlugin(pinia)` 在 install 时获取 `useLogsStore(pinia)`。开发环境控制台输出保持现有范围，但不得输出
Token、请求头、密码、完整用户或权限对象。

### 4.7 认证成功、失败与会话清理

~~~mermaid
sequenceDiagram
    actor User as 用户
    participant Page as 登录页
    participant Store as user store
    participant API as auth API
    participant Tags as tags store
    participant Common as common store
    participant Storage as Cookie/Storage

    User->>Page: 提交登录
    Page->>Store: LoginByUsername(payload)
    Store->>API: POST /blade-auth/token
    API-->>Store: success/data 或业务失败
    alt success=true
        Store->>Storage: 写 access/refresh/userInfo
        Store->>Tags: clearTags()
        Store->>Common: clearLock()
        Store-->>Page: resolve
        Page-->>User: 进入 homeTag
    else success=false 或请求失败
        Store-->>Page: reject Error
        Page->>Page: 关闭 loading/刷新验证码
        Page-->>User: 停留登录页
    end
~~~

`clearSession` 按以下顺序执行，所有步骤为同步本地操作：

1. 删除 access token 与 refresh token Cookie。
2. 清空内存 token、refreshToken、userInfo、permission、roles、menu、menuAll。
3. 删除对应 localStorage/sessionStorage 项，不保留空数组伪状态。
4. 调用 tags store `clearTags()` 并移除 currentTag/tagList 持久化。
5. 调用 common store `clearLock()`，保留 language、setting 和 logs。

### 4.8 401 并发去重与依赖反转

`axios.ts` 不再导入 router、pinia 或 user store。其模块内只保存注册的 handler 和正在执行的 Promise：

```ts
type UnauthorizedHandler = () => Promise<void>;

let unauthorizedHandler: UnauthorizedHandler | undefined;
let unauthorizedTask: Promise<void> | null = null;

export const setUnauthorizedHandler = (handler: UnauthorizedHandler) => {
  unauthorizedHandler = handler;
};
```

响应或失败拦截器识别到 401 时调用统一 `handleUnauthorized()`：已有任务时复用同一 Promise；没有任务时执行 handler，
最终清空锁。handler 由 `main.ts` 注册，执行 `userStore.FedLogOut()`，随后仅在当前路由不是 `/login` 时
`router.replace('/login')`。

401 请求仍按原 Axios Promise 失败返回调用方；handler 不吞掉原错误。状态清理或路由跳转自身失败只能记录不含
敏感信息的开发日志，不替换原接口错误。

### 4.9 动态路由、菜单与标签

`router/menu.ts` 承接当前 `formatMenuPaths`，保持以下规则：

- 缺省图标使用 `website.menu.iconDefault`。
- 首级叶子菜单映射为 `views${path}`。
- 子菜单递归映射组件路径。
- HTTP/HTTPS 外链继续使用 iframe 组件或现有 target 规则。
- `${token}` 替换继续从 `utils/auth.getToken()` 读取，随后按现有规则处理 URL 分隔符。

`installDynamicRouter` 的 options 从通用 Vuex Store 改为：

```ts
interface InstallOptions {
  router: Router;
  tagsStore: ReturnType<typeof useTagsStore>;
  i18n: AppI18n;
  keepAlive?: boolean;
}
```

`closeTag` 直接读取 `tagsStore.currentTag/tagList` 并调用 `deleteTag`。首次路由恢复由 `createAppRouter` 获取
`useUserStore(pinia).menuAll`，在 Router 返回给 main 前完成 `formatRoutes(menuAll, true)`。

### 4.10 持久化与旧数据兼容

不使用 Pinia 持久化插件。每个 store 在初始化和写动作中继续使用现有 `getStore/setStore/removeStore`，保留
`saber-` 前缀、`dataType/content/type/datetime` 记录结构及 session 优先读取规则。

| 存储键 | 介质 | 新 store | 迁移策略 |
| --- | --- | --- | --- |
| `language` | localStorage | common | 原样读取和写入 |
| `setting` | localStorage | common | 通过 `createSetting` 归一化 |
| `isLock` | sessionStorage | common | 规范化为 boolean |
| `lockPasswd` | sessionStorage | common | 映射到 lockPassword，键名不变 |
| `userInfo` | localStorage | user | 有效对象读取；`[]`/空对象视为 null |
| `permission` | sessionStorage | user | 有效对象读取；新会话加载前清空 |
| `menu` | localStorage | user | 有效数组读取，否则空数组 |
| `menuAll` | localStorage | user | 有效数组读取，否则空数组 |
| `token` | localStorage + Cookie | user | 键名与 Cookie 名不变，退出时删除 |
| `refreshToken` | localStorage + Cookie | user | 键名与 Cookie 名不变，退出时删除 |
| `tag` | localStorage | tags | 有效 fullPath 才恢复 |
| `tagList` | localStorage | tags | 过滤无效标签；退出时删除 |
| `logsList` | localStorage | logs | 有效数组读取；退出时保留 |

不执行批量升级脚本。兼容转换只发生在读取内存状态时；用户下一次修改或会话清理时按相同存储格式覆盖或删除。

### 4.11 异常、并发与幂等

| 操作 | 并发控制 | 幂等/恢复策略 |
| --- | --- | --- |
| 登录提交 | 沿用页面 loading/提交锁 | 失败不写状态，成功写一次并跳转 |
| Token 刷新 | 保留 mixin `refreshLock` | 同一计时周期只执行一个 RefreshToken |
| 并发 401 | Axios 模块级 unauthorizedTask | 复用同一清理 Promise，只 replace 一次登录页 |
| 用户信息恢复 | 路由守卫只在 `hasUserInfo=false` 时请求 | 失败调用 FedLogOut，目标导航不继续 |
| 菜单加载 | 当前请求成功后一次替换 menu | menuAll 按 path 合并，不重复插入 |
| 按钮权限加载 | 请求开始先清空当前 permission | 成功一次替换，失败保持空权限 |
| 标签添加 | fullPath 唯一判断 | 重复添加不改变列表 |
| 日志发送 | 沿用入口确认；发送 Promise 完成前不清空 | 成功清空，失败完整保留 |
| 主题/设置更新 | 同步归一化后一次持久化 | 重复相同值结果一致 |

## 5. 后端设计

### 5.1 路由、模型与服务

本需求不修改 SpringBlade 后端。Pinia store 继续调用当前前端 API 封装，URL、HTTP 方法、参数位置、成功码和响应
结构不变。后端无需感知前端状态管理框架。

### 5.2 认证与数据归属

- 是否需要登录：登录和验证码接口除外，其余用户、菜单、权限、退出和日志接口沿用现有认证要求。
- 认证头：继续由 `axios.ts` 使用 `website.Authorization` 和现有 bearer/crypto 规则注入。
- 多租户：继续由登录参数、请求上下文和服务端校验决定，store 不新增或改写租户字段。
- 权限：按钮权限仅用于前端显示控制，服务端权限仍是最终安全边界。
- 敏感信息：密码、Token、刷新 Token、验证码、客户端密钥和完整权限树不得写入日志。

### 5.3 查询、错误与兼容

- 用户、菜单和权限响应结构以当前 API 为准，不在状态层引入第二套 DTO 转换协议。
- 普通业务错误继续由 Axios 统一提示；store 负责恢复自身状态并向调用方 reject。
- 401 继续触发前端注销，但通过注入 handler 解耦依赖和合并并发处理。
- 不修改服务端状态码白名单、超时、序列化和 NProgress 行为。

## 6. API 契约

### 6.1 接口清单

| 方法 | 路径 | 用途 | Store Action | 变更类型 |
| --- | --- | --- | --- | --- |
| POST | `/blade-auth/token` | 账号、第三方、手机号登录及刷新 Token | `LoginByUsername`、`LoginBySocial`、`LoginByPhone`、`RefreshToken` | 不变 |
| GET | `/user/getUserInfo` | 获取当前用户及角色信息 | `GetUserInfo` | 不变 |
| GET | `/blade-system/menu/top-menu` | 获取顶部菜单 | `GetTopMenu` | 不变 |
| GET | `/blade-system/menu/routes` | 获取指定顶部菜单的动态路由 | `GetMenu` | 不变 |
| GET | `/blade-system/menu/buttons` | 获取当前用户按钮权限树 | `GetButtons` | 不变 |
| POST | `/blade-auth/logout` | 服务端退出 | `LogOut` | 不变 |
| POST | `/user/send-logs` | 发送前端错误日志 | `SendLogs` | 不变 |

### 6.2 接口详细约束

- 登录与刷新成功响应继续从 `res.data.data` 读取 `accessToken`、`refreshToken` 及现有用户字段。
- 业务响应 `success=false` 视为 action 失败，不写入认证状态，并向页面返回可处理的 Error。
- `GetUserInfo` 继续从 `res.data.data.roles` 写入角色列表。
- 菜单列表继续从 `res.data.data` 读取并执行深拷贝和路径格式化。
- 按钮权限继续递归读取叶子节点 `code`，生成 `{ [code]: true }` 权限映射。
- 批量 401 不新增后端请求；仅合并前端清理和登录跳转。
- 所有 API 兼容当前调用方，不增加 Pinia 专用字段或请求头。

### 6.3 列表接口

不适用。本需求只复用现有认证、菜单、权限和日志接口，不新增分页或筛选契约。

## 7. 前端设计

### 7.1 Store 文件结构

迁移后的状态目录如下：

```text
src/store/
├── index.ts       # 唯一 Pinia 实例
├── common.ts      # 布局、主题、语言、锁屏等公共状态
├── user.ts        # 认证、用户、角色、权限和菜单
├── tags.ts        # 标签与 keep-alive
└── logs.ts        # 前端错误日志
```

删除 `getters.ts` 和 `modules/` 后，任何跨 store 派生值由所属 store 自身 getter 提供，不再建立跨域全局 getter
聚合文件。store id 固定为 `common`、`user`、`tags`、`logs`，用于 DevTools 识别和后续调试。

### 7.2 Options API 调用迁移

保留现有 Options API 组件的生命周期、data、watch 和 methods，只替换 computed/action 接线。不同状态域分别使用
`mapState` 和 `mapActions`，组件中不出现 Pinia 根实例和 `$store`。

| 调用方 | 目标 store | 状态/动作 |
| --- | --- | --- |
| `components/third-register/main.vue` | user | `userInfo`、`LogOut` |
| `page/lock/index.vue` | user/common/tags | `userInfo`、`LogOut`、`lockPassword`、`clearLock`、`currentTag` |
| `page/login/userlogin.vue` | user/tags | `LoginByUsername`、`homeTag` |
| `page/login/facelogin.vue` | user/tags | `LoginByUsername`、`homeTag` |
| `page/login/codelogin.vue` | user/tags | `LoginByPhone`、`homeTag` |
| `page/index/index.vue` | common/user/tags | 布局状态、`GetMenu`、`keepAliveNames` |
| `page/index/search.vue` | user/common | `menu`、`setSearch` |
| `page/index/sidebar/index.vue` | common/user/tags | 布局状态、`menu`、`currentTag`；删除无用 `menuId` |
| `page/index/sidebar/sidebarItem.vue` | user | `roles` |
| `page/index/tags.vue` | tags/common | 标签动作、setting、search、refresh |
| `page/index/top/index.vue` | common/user/tags/logs | setting、userInfo、标签摘要、日志摘要、`LogOut`、折叠 |
| `page/index/top/top-full.vue` | common | `isFullscreen`、`toggleFullscreen` |
| `page/index/top/top-lang.vue` | common/tags | `language`、`setLanguage`、`currentTag` |
| `page/index/top/top-lock.vue` | common | `lockPassword`、`setLockPassword`、`lock` |
| `page/index/top/top-logs.vue` | logs | `logsList`、`logCount`、`isEmpty`、`SendLogs`、`clearLogs` |
| `page/index/top/top-menu.vue` | user/tags | `GetTopMenu`、`menu`、`homeTag`；删除不存在的 `tagCurrent` |
| `page/index/top/top-search.vue` | user | `menu` |

局部别名使用 Pinia `mapState` 的函数形式，例如把 `homeTag` 暴露为组件原有 `tagWel`，避免大范围修改模板：

```ts
computed: {
  ...mapState(useTagsStore, {
    tagWel: store => store.homeTag,
  }),
},
methods: {
  ...mapActions(useUserStore, ['LoginByUsername']),
},
```

别名仅存在于当前组件 computed，不暴露全局 getter，也不允许实现 `$store` 代理。

### 7.3 Composition API 调用迁移

| 调用方 | 目标 store | 迁移方式 |
| --- | --- | --- |
| `components/auth-layout/main.vue` | common | `storeToRefs` 读取 setting，动作更新主题 |
| `page/index/logo.vue` | common | 读取 `isCollapse` |
| `page/index/setting.vue` | common | 读取 setting，调用设置/布局/重置动作 |
| `composables/useCrudPermission.ts` | user | 读取 permission，保留 computed 权限返回值 |
| `views/system/dept.vue` | user | 读取 `isAdmin` getter |
| `views/system/dict.vue` | user | 读取 `isAdmin` getter |
| `views/system/menu.vue` | user | 读取 `isAdmin` getter |
| `views/system/user.vue` | user | 读取 `isAdmin` 和 permission |
| `views/system/topmenu.vue` | user | 读取 permission |
| `views/authority/role.vue` | user | 读取 `isAdmin` getter |
| `views/authority/apiscope.vue` | user | 读取 permission |
| `views/authority/datascope.vue` | user | 读取 permission |
| `views/base/region.vue` | user | 读取 permission |
| `views/tool/code.vue` | user | 读取 `isAdmin` getter |

标准形态：

```ts
const userStore = useUserStore();
const { userInfo, permission, isAdmin } = storeToRefs(userStore);
```

只调用 action 且不解构状态时直接使用 store。禁止 `const { permission } = useUserStore()`，避免失去响应式。

### 7.4 模板与 mixin 迁移

- `page/index/layout.vue` 增加 `<script setup lang="ts">`，通过 tags store 的 `keepAliveNames` 驱动 keep-alive。
- `page/index/index.vue` 将模板 `$store.getters.tagsKeep` 替换为局部 `tagsKeep` computed。
- `mixins/index.ts` 模块级使用 `useUserStore(pinia)`，定时器中直接调用 `RefreshToken()`。
- `env.d.ts` 删除 `$store: import('vuex').Store<object>`；保留 `$dayjs`、website、getScreen、router 和 route 类型。
- 不向 `app.config.globalProperties` 新增 `$piniaStore`、`$userStore` 或其他状态代理。

### 7.5 类型契约

类型在对应 store 文件内定义并按调用需要导出，避免建立跨业务巨型状态模型。

```ts
export interface UserInfo {
  userId?: string | number;
  userName?: string;
  account?: string;
  avatar?: string;
  authority?: string;
}

export interface PermissionMap {
  [code: string]: boolean | undefined;
}
```

`LoginPayload` 保留 tenantId、username、password、type、key、code、source、state、phone 等当前登录链路字段，均按
实际链路设为可选。Token 响应最小类型包含 `accessToken`、`refreshToken` 和 `UserInfo` 已用字段。

```ts
export interface TagItem {
  name?: string;
  path: string;
  fullPath: string;
  params?: RouteParamsRaw;
  query?: LocationQueryRaw;
  meta?: MenuMeta;
}

export interface LogItem {
  type?: string;
  message?: string;
  stack?: string;
  info: string;
  url: string;
  time: string;
}
```

持久化读取通过 store 局部类型守卫处理 `object | string | number | boolean | null | undefined`，不得使用显式 `any`、
裸 `unknown` 或 `Record<string, unknown>` 掩盖响应结构。`utils/store.ts` 不在本需求中改成无校验泛型 API。

### 7.6 权限映射

按钮接口响应使用最小递归节点：

```ts
interface PermissionNode {
  code?: string;
  children?: PermissionNode[];
}
```

纯函数 `buildPermissionMap(nodes)` 递归收集有效叶子 `code`，返回全新 `PermissionMap`。请求开始先将 permission 设置
为空对象，请求成功再一次替换，避免逐项 mutation 和上一用户权限残留。

`useCrudPermission(moduleName)` 返回值保持 `add/view/edit/delete` 四个 computed；管理员专项入口统一改用
`userStore.isAdmin`，页面不再重复解析 `userInfo.authority`。

### 7.7 页面交互状态

| 状态 | 展示与行为 | 恢复方式 |
| --- | --- | --- |
| 应用初始化 | 首帧前恢复主题/语言，控制台无 Pinia 激活错误 | 修正启动顺序，禁止降级为第二实例 |
| 登录中 | 沿用页面 loading，重复提交被阻止 | action resolve/reject 后恢复 |
| 登录业务失败 | 停留登录页，保留输入并按现有规则刷新验证码 | 用户修改后重试 |
| 用户恢复失败 | FedLogOut 清会话并进入登录页 | 重新登录 |
| 权限加载中 | permission 暂为空，不展示旧用户按钮 | 请求成功后替换 |
| 权限加载失败 | 普通受控按钮保持不可见，统一错误提示 | 刷新菜单或重新登录 |
| 401 处理中 | 多请求共享同一清理任务，只导航一次 | 自动进入登录页 |
| 标签恢复 | 过滤无 fullPath 标签，首页保持可达 | 打开有效菜单重新建立 |
| 锁屏 | session 状态继续限制受保护路由 | 正确密码解锁或退出 |
| 日志发送失败 | 原日志不清空，操作锁恢复 | 重试或人工清除 |

## 8. 数据库、配置与发布影响

| 影响项 | 是否涉及 | 说明 | 关联文档 |
| --- | :---: | --- | --- |
| 新表/改表/约束/索引 | 否 | 无数据库变化 | 不涉及数据库设计 |
| 数据迁移/回填 | 否 | 无服务端数据迁移 | 不适用 |
| 浏览器存储迁移 | 是，兼容读取 | 不运行脚本，读取时规范化旧空值，写入格式不变 | 本设计 4.10 |
| 环境变量/配置 | 否 | 不新增环境变量，不修改 API 代理和端口 | 不适用 |
| 依赖与锁文件 | 是 | 新增 Pinia/devtools，删除 Vuex | `package.json`、`pnpm-lock.yaml` |
| 部署顺序 | 是 | 前端单批次原子发布；后端无需配套发布 | 本设计 10.1 |
| 兼容窗口 | 否 | 不提供双运行时或兼容层窗口 | 本设计 DEC-004/005 |

## 9. 安全、测试与可观测性

### 9.1 认证与安全要求

| 检查项 | 设计 |
| --- | --- |
| 身份认证 | 复用现有 Blade Token、刷新 Token、验证码和 SM2 登录加密 |
| 401 | Axios 注入 handler；并发只清理一次；原请求继续 reject |
| 角色授权 | 角色和按钮权限来自服务端；Pinia 只承载前端显示状态 |
| 多租户 | 不新增租户字段或缓存；登录和服务端上下文保持现状 |
| 会话隔离 | 退出、401、恢复失败均清 userInfo、permission、roles、menu、tags、lock |
| 敏感字段 | 密码、Token、刷新 Token、验证码、客户端密钥和完整权限树不进入日志 |
| 外链 Token | 保持现有替换规则，不扩大 URL 暴露范围；专项安全变更另立需求 |

### 9.2 测试矩阵

| 场景 | 层级 | 关键断言 | 关联需求 |
| --- | --- | --- | --- |
| Pinia 单实例 | 静态/浏览器 | 只注册一次，无未激活或重复 store | AC-001、AC-003、AC-012、AC-016 |
| Vuex 零引用 | 静态/依赖 | package、lock、src 和类型声明无 Vuex | AC-002、AC-004、AC-005、AC-036 |
| 四状态域 | 静态/浏览器 | user/common/tags/logs 状态和派生值完整 | AC-006 至 AC-011 |
| 直接访问与刷新 | 浏览器 | 主题、语言、动态路由和当前页面正常恢复 | AC-012、AC-013 |
| 并发 401 | 浏览器/网络 | 多个 401 只清一次、跳转一次、旧状态为零 | AC-014、AC-022 |
| 全局错误 | 浏览器 | 错误进入 logs store，不创建新 Pinia | AC-015 |
| 账号登录 | 浏览器/网络 | 参数、加密、Token、首页与 loading 正确 | AC-017 |
| 第三方/手机号登录 | 浏览器/网络 | 可用环境下契约和登录后状态一致 | AC-018 |
| Token 刷新 | 浏览器/网络 | 单请求锁、成功替换、失败不污染状态 | AC-019、AC-020 |
| 主动退出 | 浏览器/网络 | 服务端成功后清全部会话状态 | AC-021、AC-032 |
| 顶部菜单与路由 | 浏览器 | menu/menuAll、动态路由和目标首页一致 | AC-023 |
| 权限差异 | 浏览器 | 普通用户、管理员、CRUD 权限无旧缓存 | AC-024、AC-025 |
| 标签与 keep-alive | 浏览器 | 标签操作、刷新和缓存恢复一致 | AC-008、AC-009、AC-026 |
| 设置与主题 | 浏览器截图 | 布局、主色、主题、刷新持久化一致 | AC-007、AC-027、AC-029、AC-039 |
| 锁屏 | 浏览器 | 路由限制、错误密码、解锁和退出正确 | AC-028、AC-031 |
| 旧登录存储 | 浏览器 | 覆盖升级后不因框架变化强制退出 | AC-030、AC-033 |
| 工程门禁 | 命令 | type-check、build:prod、diff check 通过 | AC-034、AC-035 |
| 响应式 | 浏览器截图 | 1440/1024/375 下全局操作可达 | AC-038 |
| 验收覆盖 | 文档 | 40 条 AC 均映射用例与证据 | AC-040 |

正式实现进入“开发完成，待验收”前，按测试模板创建
`doc/test/TEST-REQ-2026-006-pinia-migration-and-vuex-removal.md`，不得仅以本节矩阵替代正式测试文档。

### 9.3 静态与工程门禁

实现完成至少执行：

```powershell
rg -n -i "vuex" src package.json pnpm-lock.yaml
rg -n -F '$store' src
rg -n "createStore|mapGetters" src
rg -n -F "from 'vuex'" src
rg -n -F 'from "vuex"' src
rg -n "store\.(getters|commit|dispatch)|Store\.getters|Store<object>" src
rg -n "SET_[A-Z_]+|ADD_TAG|DEL_TAG|CLEAR_LOGS" src
pnpm list vuex --depth -1
pnpm run type-check
pnpm run build:prod
git diff --check
```

前六项中 Vuex 活动引用、依赖和旧 mutation 调用期望无结果；历史 `doc/` 不纳入零引用门禁。`SET_` 等扫描结果如
命中与 Vuex 无关的业务常量，必须逐条说明，不得直接忽略整类结果。生产构建后可对 `dist` 临时检索 `vuex`，但
不提交构建产物。

### 9.4 浏览器验证

- 启动开发服务，记录实际端口、Node/pnpm 版本和后端环境。
- 未登录直接访问、账号登录、业务失败登录、浏览器刷新、用户信息恢复。
- 顶部菜单、侧边菜单、动态路由、外链、标签新增/关闭/刷新和 keep-alive。
- 普通用户与管理员权限差异，至少验证一个 `useCrudPermission` 页面和一个专项权限页面。
- Token 刷新成功/失败；使用受控方式制造两个并发 401，确认只注销和跳转一次。
- 主题、主色、侧边/顶部/混合布局、语言、搜索、折叠、全屏和锁屏。
- 全局错误日志新增、发送成功/失败、清除。
- 使用迁移前生成的脱敏 localStorage/sessionStorage 样例验证覆盖升级。
- 1440px、1024px、375px；浅色、深色、自定义主色；Console 与 Network 无 Pinia/Vuex 相关错误。

### 9.5 日志、指标与性能

- 不新增前端埋点、后端日志、指标或告警。
- 不新增状态变化全量日志，避免输出用户、权限、菜单和 Token。
- 开发环境可通过 Pinia DevTools 检查 store id、action 和状态，但 DevTools 结果不能代替业务断言。
- 对比迁移前后主入口构建体积，记录 Pinia 新增和 Vuex 删除后的净变化，不设不现实的绝对减包目标。
- 登录、菜单和并发 401 的 Network 请求数不得因状态迁移重复增加。

## 10. 发布与回滚

### 10.1 原子迁移与发布

本需求不采用 Pinia/Vuex 并行发布。实现可以在本地工作区按以下顺序修改，但提交评审和部署产物必须是完整可运行的
单一 Pinia 状态：

| 步骤 | 范围 | 检查点 |
| --- | --- | --- |
| 1. 固化基线 | 确认 HEAD `75f133d`、当前类型检查与关键页面行为 | 基线可构建或已记录既有环境限制 |
| 2. 建立 Pinia | 更新 package/lock；创建根实例和四个 store | 状态、getter、action、存储映射审查完成 |
| 3. 解除循环依赖 | Axios 401 注入、lang/router 工厂、permission setup、error plugin | 模块图不再出现 axios -> store/router |
| 4. 迁移调用方 | Options API、Composition API、模板、mixin、动态路由 | `$store`、Vuex `useStore/mapGetters` 为零 |
| 5. 删除 Vuex | 删除旧 modules/getters、env 类型、package 依赖 | `src/package/lock` Vuex 活动引用为零 |
| 6. 工程验证 | 静态扫描、type-check、build:prod、diff check | 所有命令取得实际结果 |
| 7. 浏览器回归 | 认证、菜单、权限、标签、布局、存储升级、401、日志 | 正式测试文档记录结果和证据 |
| 8. 文档归档 | 同步需求、设计、测试与索引 | 存在失败/阻塞时保持未验收状态 |

依赖更新必须通过 pnpm 正常执行，禁止手工删除 `pnpm-lock.yaml` 中的 Vuex 片段。迁移最终建议形成一个独立提交，
提交内容只包含 REQ-2026-006 的状态管理及文档变化，便于整体审查和 `git revert`。

发布前必须确认：

1. 没有任何可执行代码导入 Vuex。
2. 应用入口只安装一个 Pinia。
3. 不存在 Vuex 兼容 facade、全局 `$store` 或双写逻辑。
4. 生产构建和至少账号登录主链路通过。
5. 测试文档中的失败、阻塞和未执行项已经如实归档。

### 10.2 回滚与恢复

- 触发条件：应用无法启动、Pinia 未激活、登录/刷新/401 失效、动态菜单断链、权限越权显示、标签或布局严重回归、
  持久化状态导致循环跳转、类型检查或生产构建失败。
- 代码回滚：对独立迁移提交执行 `git revert`，或部署 `75f133d` 对应的上一可用前端产物；不使用破坏工作区历史的
  `git reset --hard` 作为发布回滚方案。
- 依赖回滚：代码、`package.json` 和 `pnpm-lock.yaml` 必须作为同一单元恢复，禁止仅重新添加 Vuex 包。
- 数据库 downgrade：不适用，无数据库变化。
- 浏览器存储：键名和记录格式保持兼容，无需回填或清空；回滚后的 Vuex 可继续读取迁移期间写入的同格式值。
- 不可逆数据变化：无。前端只更新既有浏览器状态，不修改服务端业务数据格式。
- 回滚验证：应用启动、账号登录、动态菜单、按钮权限、标签、主题、语言、锁屏、退出和生产构建通过。

## 11. 风险、评审与变更

### 11.1 风险与开放问题

| 编号 | 类型 | 内容 | 负责人 | 状态/结论 |
| --- | --- | --- | --- | --- |
| ITEM-001 | 风险 | Pinia 4 为 ESM-only，旧式非 Vite 消费方式可能不兼容 | 前端负责人 | Node 22.3.0 下 Vite production 构建通过；默认 Node 24.11.1 存在 Windows 工具链异常，已记 ENV-001 |
| ITEM-002 | 风险 | Axios、API、user store 的历史循环依赖可能在遗漏导入时重新出现 | 前端负责人 | 已通过 401 handler 依赖反转解决；axios 无 store/router 导入，类型与启动烟雾通过 |
| ITEM-003 | 风险 | 17 个 Options API 组件跨多个 store 映射，局部别名可能遗漏模板字段 | 前端负责人 | 调用方迁移和 type-check 完成；登录页烟雾通过，登录后主布局仍待真实后端回归 |
| ITEM-004 | 风险 | 旧 `userInfo=[]`、无效标签或设置结构可能无法直接满足收紧后的类型 | 前端/测试负责人 | 已实现局部规范化；无效 language/setting/tag 回退通过，旧登录/权限样例待验收 |
| ITEM-005 | 风险 | 登录失败改为 reject、退出增加用户/权限清理会改变历史异常行为 | 产品/安全负责人 | 属需求明确的失败恢复和会话隔离修复，需专项验收 |
| ITEM-006 | 风险 | 并发 401 清理和路由 replace 自身失败可能留下半清理页面 | 前端负责人 | 本地状态先同步清除，导航失败不恢复旧权限，保留原请求错误 |
| ITEM-007 | 风险 | 当前没有单元测试和 E2E 脚本，store action 回归依赖真实后端 | 测试负责人 | 测试文档已建立；11 条真实业务用例因环境未准备而阻塞，需求保持未验收 |
| ITEM-008 | 依赖 | 第三方登录、手机号登录、Token 刷新失败和并发 401 需要可控环境 | 测试负责人 | 已在测试文档标记 ENV-003/004/005，等待可控环境 |
| ITEM-009 | 风险 | REQ-2026-005 与本需求均涉及 main/router/layout/package 文件 | 技术负责人 | 当前代码已提交为 `75f133d`，本需求在其上原子实施 |
| ITEM-010 | 问题 | 用户信息和按钮接口的完整响应类型仍较宽松 | 前端负责人 | 本次只声明实际读取字段；后续 API 类型化另立任务 |

### 11.2 评审结论

| 领域 | 结论 | 评审人 | 日期 | 备注 |
| --- | --- | --- | --- | --- |
| 后端/API | 不涉及变更，待确认兼容 | 待定 | 待定 | URL、参数、认证头与响应结构保持不变 |
| 前端 | 待评审 | 待定 | 待定 | 确认版本、Option Store、启动工厂、401 注入和调用方映射 |
| 安全与权限 | 待评审 | 待定 | 待定 | 确认退出清理、权限空窗、401 去重和敏感信息边界 |
| 数据库/发布 | 不涉及数据库，发布待评审 | 待定 | 待定 | 确认原子提交、依赖锁文件和整体 revert |
| 测试 | 待评审 | 待定 | 待定 | 准备账号、权限、菜单、旧存储、刷新和并发 401 环境 |

### 11.3 实现与验证结果

| 范围 | 实际结果 |
| --- | --- |
| 状态层 | 唯一 Pinia、四个 Option Store、旧存储兼容和跨域会话清理已实现 |
| 启动与循环依赖 | router/i18n 工厂、permission 显式安装、Axios 401 handler、error plugin 已实现 |
| 调用方 | Options API、Composition API、模板和 mixin 已迁移；Vuex/`$store`/旧 mutation 扫描为零 |
| 依赖 | Pinia 4.0.3、devtools API 8.1.5 精确锁定；Vuex 从 package 和 lock 删除 |
| 工程验证 | `pnpm run type-check`、`git diff --check`、Node 22 `pnpm run build:prod` 通过；dist 无 Vuex |
| 浏览器验证 | 未登录启动、主题、语言、无效旧存储和三视口登录页通过；Console 0 error |
| 未完成 | 登录、刷新、退出、并发 401、菜单、权限、标签、主布局、锁屏和日志需真实后端验收 |

实现与详细设计一致。额外同步了 `AGENTS.md` 与 Vite auto-import 配置，避免后续开发继续引用旧状态框架。
默认 Node 24.11.1 的 production 构建异常未通过修改构建配置规避，使用仓库支持范围内的 Node 22.3.0 完成门禁，
具体限制和复验步骤见测试文档 ENV-001。

### 11.4 变更记录

| 日期 | 版本 | 变更内容 | 原因 | 影响 | 修改人 |
| --- | --- | --- | --- | --- | --- |
| 2026-09-04 | 0.1 | 初稿 | 用户要求开始详细设计，并确认可直接移除 Vuex、失败时整体回退 | Pinia 版本、四个 store、启动依赖、调用方、持久化、测试、发布和回滚 | Codex |
| 2026-09-04 | 0.2 | 完成设计落地并归档工程与阶段性浏览器验证 | 用户要求依据需求和详细设计开始执行 | 状态、启动、调用方、依赖、验证、风险和测试文档 | Codex |
