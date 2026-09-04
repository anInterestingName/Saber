# Saber Element Plus 渐进迁移与通用组件建设详细设计文档

## 1. 文档信息

| 项目 | 内容 |
| --- | --- |
| 功能/模块 | Element Plus 通用列表能力与 Avue 页面渐进迁移 |
| 设计编号 | DESIGN-REQ-2026-001 |
| 设计版本 | 0.4 |
| 关联需求 | [需求索引](../requirements-index.md)；[Saber Element Plus 渐进迁移与通用组件建设需求文档](../requirements/REQ-2026-001-element-plus-migration.md) |
| 目标版本/迭代 | Saber 5.x / Element Plus 迁移第一阶段 |
| 文档状态 | 已实现，待验收 |
| 设计负责人 | 待定 |
| 评审人 | 前端、后端、测试按需填写 |
| 最后更新日期 | 2026-09-03 |

## 2. 设计摘要与范围

### 2.1 设计摘要

迁移页面以 Element Plus 作为唯一基础组件库，页面直接声明 `el-table` 和业务表单；通用组件只负责搜索、
列表布局、分页、弹窗和标准字典等稳定展示行为，composable 负责分页请求、选择状态、远程选项和权限状态。
方案不通过 JSON 列配置自动生成 CRUD，不让组件持有业务 API，从而避免重新实现 Avue。所有新组件和
迁移页面以 Ant Design Vue 后台管理界面为视觉与交互基准，但使用 Element Plus、Element Plus Icons 和
Saber CSS Token 独立实现，不引入 Ant Design Vue 运行时依赖或直接复制其样式。

迁移按页面渐进进行。未迁移页面继续使用 Avue，新增组件采用局部显式导入，不修改 Avue 全局注册和现有
页面行为。第一阶段以参数管理验证标准分页 CRUD，以岗位管理验证标准字典和租户选择；用户管理在这些
基础能力稳定后迁移，并将用户表单、导入和角色配置保留为业务组件。

主要风险是 Avue 隐式能力在手工迁移中遗漏，包括表单详情回填、字典值类型、选择清理、查看模式、
按钮权限和失败回调。每个页面必须先建立行为对照清单，再进入实现。

### 2.2 关键决策

| 编号 | 决策 | 原因 | 影响 |
| --- | --- | --- | --- |
| DEC-001 | 迁移页面使用纯 Element Plus 实现，以 Ant Design Vue 作为视觉与交互基准，不引入其运行时依赖 | Element Plus 已安装且 Avue 基于它，既避免三套组件并存，又统一后台产品体验 | 无新增运行时依赖，复用现有主题和图标 |
| DEC-002 | 页面直接使用 `el-table`，不封装通用声明式表格 | 树表、懒加载、主子表和列插槽差异大 | 页面保留列和业务事件的可读性 |
| DEC-003 | 通用组件仅负责展示和交互骨架 | 防止组件与模块 API、权限和实体转换耦合 | 业务逻辑留在页面或业务组件 |
| DEC-004 | 分页、选择、远程选项和权限使用 composable | 这些是跨组件状态逻辑，不适合通过 UI 组件传递 | 减少重复代码并改善失败状态 |
| DEC-005 | 新组件局部导入，不在 `main.ts` 全局注册 | 明确依赖、便于删除未使用组件 | 每个迁移页面显式导入 |
| DEC-006 | 参数管理和岗位管理作为第一阶段试点 | 分别覆盖标准 CRUD 与字典/租户选择，风险低于用户管理 | 试点通过后才迁移复杂页面 |
| DEC-007 | Avue 与 Element Plus 按页面共存，不在页面内部长期混用 | 页面内混用需要同时维护两套状态和样式语义 | 迁移完成的页面不再保留 `avue-crud`/`avue-form` |
| DEC-008 | 不修改后端、数据库、认证和租户契约 | 本次目标是前端架构迁移 | 发布可按页面回滚，无数据迁移 |
| DEC-009 | Ant Design Vue 的结构与密度映射为 Saber Token 和 Element Plus 组件约定，不复制 CSS、Less Token 或 DOM | 保留主题切换、暗色模式和未来组件升级能力 | 需要建立明确尺寸、间距和截图验收基线 |

### 2.3 改动范围

| 层级 | 改动内容 | 不涉及内容 |
| --- | --- | --- |
| 后端 | 无；仅核对现有接口契约 | Controller、Service、数据库实体、权限实现 |
| 前端组件 | 搜索、列表、分页、表单弹窗、字典选择/标签；后续按需增加行操作、详情抽屉和上传 | 自动 CRUD、动态列生成器、页面路由改造 |
| 前端状态 | 分页列表、选择、远程选项、标准权限 composable 和共享类型 | Vuex 全局业务状态重构 |
| 前端页面 | 第一阶段迁移参数管理、岗位管理；输出后续迁移矩阵 | 第一阶段全量迁移 21 个页面 |
| 数据库 | 无 | 表、字段、索引和数据迁移 |
| 配置/部署 | 无新增配置；继续使用现有 Vite、Axios 和主题 | 新环境变量、代理、认证配置 |

## 3. 总体设计

### 3.1 架构图

~~~mermaid
flowchart TB
    subgraph Migrated[已迁移页面]
        Page[业务页面]
        Business[业务组件<br/>如 UserFormDialog]
        Common[通用展示组件<br/>Search/List/Pagination/Form/Dict]
        Hooks[Composables<br/>PagedList/Selection/RemoteOptions/Permission]
        Page --> Business
        Page --> Common
        Page --> Hooks
        Business --> Common
        Common --> EP[Element Plus]
    end

    subgraph Legacy[未迁移页面]
        AvuePage[现有 Avue 页面] --> Avue[Avue]
        Avue --> EP
    end

    Page --> API[模块 API]
    Business --> API
    Hooks --> API
    AvuePage --> API
    API --> Axios[现有 @/axios]
    Axios --> Backend[SpringBlade 后端]
~~~

调用方向必须保持为“页面/业务组件 -> 通用组件或 composable -> 模块 API”。通用展示组件不得反向导入
`src/views`、模块 API、Vuex 权限或具体实体。

### 3.2 组件职责

| 组件/模块 | 职责 | 输入 | 输出 |
| --- | --- | --- | --- |
| `search-panel` | 搜索布局、查询、重置、展开收起 | 查询模型、加载态、布局配置、字段插槽 | `search`、`reset`、`expand-change` |
| `list-panel` | 列表卡片、标题、工具栏、内容与底部布局 | 标题及各区域插槽 | 页面操作和原生插槽事件 |
| `list-pagination` | 分页展示、移动端裁剪、页容量切换 | 当前页、页容量、总数 | 分页状态更新和单次 `change` |
| `form-dialog` | 新增/编辑/查看弹窗骨架和提交态 | 模式、实体名称、可见状态、提交态 | `confirm`、`cancel`、可见状态更新 |
| `dict-select` | 加载和选择标准 Blade 字典 | 字典编码、值、选择器配置 | 值更新、加载失败事件 |
| `dict-tag` | 标准 Blade 字典值回显 | 字典编码、值、标签类型映射 | 字典标签 |
| `row-actions` | 后续统一常用行按钮布局 | 标准权限、禁用态、扩展插槽 | 查看、编辑、删除事件 |
| `detail-drawer` | 后续统一只读详情抽屉 | 标题、可见状态、加载态、内容插槽 | 关闭事件 |
| `blade-upload` | 后续统一上传鉴权、响应和错误状态 | 上传地址、限制、文件列表 | 成功、失败、超限事件 |
| `usePagedList` | 分页列表与查询状态 | 加载函数、响应转换、初始查询 | 数据、分页、加载态和操作方法 |
| `useTableSelection` | 选择行和 ID 状态 | 主键读取函数 | 选中行、ID、更新和清空方法 |
| `useRemoteOptions` | 远程选择项加载和竞态保护 | 选项加载函数 | 选项、加载态、加载/清空方法 |
| `useCrudPermission` | 标准 CRUD 权限计算 | 模块权限前缀 | 新增、查看、编辑、删除布尔值 |

### 3.3 Ant Design Vue 参考映射

Ant Design Vue 仅提供视觉层级、信息密度和交互组织参考。实现时使用下表映射，不导入 Ant Design Vue
组件、图标、样式或 Token。

| Ant Design Vue/Pro 参考模式 | Saber 实现 | 必须保留的体验 | 不复制的内容 |
| --- | --- | --- | --- |
| Query Filter | `search-panel` + `el-form` + 栅格 | 标签对齐、紧凑字段、右侧操作、展开/收起 | Ant 表单 DOM、类名和 Less 样式 |
| ProTable 卡片与工具栏 | `list-panel` + 页面原生 `el-table` | 左侧标题、右侧操作、主次操作层级、轻量表格 | ProTable 列配置、请求封装和运行时代码 |
| Space/Compact | Flex/Grid 与 `gap` | 8px 基础间距、按钮组稳定且不依赖相邻 margin | Ant Space 组件和类名 |
| Table | `el-table` | 浅色表头、细分隔线、行 hover、固定操作列、文本行操作 | Ant Table DOM、虚拟滚动和列 API |
| Pagination | `list-pagination` + `el-pagination` | 桌面右对齐、移动端精简、页容量和总数层级 | Ant Pagination 组件 |
| Modal/Form | `form-dialog` + `el-dialog` + `el-form` | 清晰标题、正文留白、右对齐底部操作、提交 loading | Ant Modal/Form 校验 API |
| Drawer/Descriptions | `detail-drawer` + `el-drawer` + `el-descriptions` | 只读信息分组、关闭路径和详情层级 | Ant Drawer/Descriptions 组件 |
| Select/TreeSelect | `dict-select`、`el-select`、`el-tree-select` | 统一标签、清空、禁用、loading 和多选反馈 | Ant Select/TreeSelect 组件 |
| Tag/Badge | `dict-tag` + `el-tag` | 克制颜色、状态语义和紧凑尺寸 | Ant Tag/Badge 样式 |

### 3.4 新增依赖

不适用。全部能力使用当前已安装的 Vue 3、Element Plus、Vuex、Axios 和 TypeScript；不得新增
Ant Design Vue、表格框架、表单生成器或状态管理库。`package.json` 和 `pnpm-lock.yaml` 不应因第一阶段
迁移产生依赖变化。

## 4. 核心流程设计

### 4.1 列表查询技术流程

~~~mermaid
sequenceDiagram
    actor User as 用户
    participant Page as 业务页面
    participant Hook as usePagedList
    participant API as 模块 API
    participant Axios as @/axios
    participant Backend as SpringBlade

    User->>Page: 查询/重置/切换分页
    Page->>Hook: search/reset/changePage
    Hook->>Hook: 更新查询和分页，生成请求序号
    Hook->>API: fetcher(current, size, query)
    API->>Axios: GET list
    Axios->>Backend: 携带现有认证头
    Backend-->>Axios: Blade 分页响应
    Axios-->>API: 成功响应或统一错误
    API-->>Hook: 原始响应
    Hook->>Hook: resolveResponse -> records/total
    alt 是最近一次请求
        Hook-->>Page: 更新 data/page/loading
    else 已过期请求
        Hook-->>Page: 丢弃数据，仅结束自身流程
    end
    Page-->>User: 展示列表或保留可重试状态
~~~

`usePagedList` 的所有请求路径使用 `finally` 恢复加载状态。请求序号只控制前端结果覆盖，不取消后端请求，
也不改变 Axios 的统一错误提示。

### 4.2 表单新增、编辑和查看流程

~~~mermaid
sequenceDiagram
    actor User as 用户
    participant Page as 业务页面
    participant Dialog as FormDialog
    participant Form as ElForm
    participant API as 模块 API

    User->>Page: 点击新增/编辑/查看
    alt 新增
        Page->>Page: 创建全新表单模型
    else 编辑或查看
        Page->>API: 获取详情（接口存在时）
        API-->>Page: 返回详情
        Page->>Page: 执行业务字段转换
    end
    Page->>Dialog: 设置 mode 并打开
    alt 查看
        Dialog-->>User: 只读展示，无提交按钮
    else 新增或编辑
        User->>Dialog: 点击确认
        Dialog->>Page: confirm
        Page->>Form: validate
        alt 校验失败
            Form-->>User: 展示字段错误
        else 校验通过
            Page->>Page: submitting=true，转换提交数据副本
            Page->>API: add/update
            alt 提交失败
                API-->>Page: reject
                Page->>Page: submitting=false，保留弹窗与输入
            else 提交成功
                API-->>Page: success
                Page->>Dialog: 关闭
                Page->>Page: 刷新列表并清空选择
            end
        end
    end
~~~

编辑详情必须在数据加载及字段转换完成后再打开或结束弹窗骨架 loading，避免现有 Avue `beforeOpen`
先 `done()`、后异步回填造成的短暂旧值或空值。

### 4.3 批量操作流程

1. `el-table` 的 `selection-change` 更新 `useTableSelection`。
2. 页面在批量操作前检查选中数量；为空时只提示，不发请求。
3. 页面按业务规则生成逗号分隔 ID 或接口要求的其他参数。
4. 用户确认后调用现有批量接口。
5. 成功后使用表格实例 `clearSelection()`，清空 composable 状态并刷新列表。
6. 失败时保留当前选择，便于用户确认后重试。

### 4.4 异常与边界流程

| 场景 | 处理位置 | 处理方式 | HTTP/错误码 | 数据是否改变 |
| --- | --- | --- | --- | :---: |
| 未登录/登录失效 | 现有 `axios.ts` | 触发 `FedLogOut` 并进入登录页 | 401 | 否 |
| 普通接口错误 | 现有 `axios.ts` | 统一 `ElMessage.error`；页面 `finally` 恢复局部状态 | Blade 非 200 状态 | 由后端决定 |
| 表单校验失败 | 业务页面 `ElForm` | 阻止请求并显示字段错误 | 不发请求 | 否 |
| 请求乱序 | `usePagedList`/`useRemoteOptions` | 请求序号只接受最新结果 | 不适用 | 否 |
| 字典加载失败 | 字典 composable/组件 | 保留空选项并允许重试，不伪造标签 | 复用现有错误 | 否 |
| 无批量选择 | 业务页面 | 阻止请求并显示警告 | 不发请求 | 否 |
| 详情不存在 | 模块 API/页面 | 不打开可编辑表单，保留列表 | 复用现有错误 | 否 |

### 4.5 事务、并发与幂等

前端迁移不改变后端事务边界和幂等语义。提交按钮 loading 用于避免同一弹窗重复提交；列表请求序号用于避免
旧响应覆盖新响应，不构成服务端幂等保证。

| 操作 | 事务边界 | 并发控制 | 幂等策略 |
| --- | --- | --- | --- |
| 列表查询 | 不适用 | 前端请求序号防止旧响应覆盖 | GET 天然只读 |
| 新增/编辑 | 现有后端事务 | 前端提交锁；服务端保持现状 | 沿用现有接口 |
| 删除/批量删除 | 现有后端事务 | 前端确认和提交锁 | 沿用现有接口 |

## 5. 后端设计

### 5.1 路由、模型与服务

不修改后端路由、请求模型、服务和数据库模型。迁移页面继续调用当前 `src/api/{module}` 中的函数，API 层
继续经 `@/axios` 发起请求。

第一阶段涉及的现有接口：

| 模块 | 列表 | 新增/修改 | 删除 | 详情/选项 |
| --- | --- | --- | --- | --- |
| 参数 | `GET /blade-system/param/list` | `POST /blade-system/param/submit` | `POST /blade-system/param/remove` | 当前页面使用行数据，不新增详情接口 |
| 岗位 | `GET /blade-system/post/list` | `POST /blade-system/post/submit` | `POST /blade-system/post/remove` | `GET /blade-system/post/detail`、`GET /blade-system/post/select` |
| 标准字典 | 不适用 | 不适用 | 不适用 | `GET /blade-system/dict/dictionary?code={code}` |
| 租户选项 | 不适用 | 不适用 | 不适用 | `GET /blade-system/tenant/select` |

### 5.2 认证与数据归属

- 是否需要登录：是。
- 认证方式：复用 `src/axios.ts` 注入的 OAuth Basic 和 Blade Token。
- 资源归属：沿用现有实体和服务端租户上下文。
- 客户端写入：不新增或修改 `tenantId` 规则；表单只按现有页面行为提交。
- 角色权限：沿用后端权限；前端按钮显示不是安全边界。
- 多租户开关：继续使用 `website.tenantMode`，不得硬编码。

### 5.3 查询与错误

- 分页查询：继续传递 `current`、`size` 和页面明确的查询字段。
- 普通分页响应：从 `res.data.data.records` 和 `res.data.data.total` 读取。
- 树或非分页响应：不得强行套用分页转换，由页面或专用 composable 明确解析。
- 错误：由 `axios.ts` 处理 Blade 状态和普通错误提示，页面只恢复 loading、submitting 等局部状态。
- 敏感字段：不得在控制台输出密码、Token、连接串或完整敏感表单。

## 6. API 契约

### 6.1 接口清单

本设计不新增或变更后端接口。前端为标准字典补充一个显式 API 函数，封装既有接口：

```ts
export const getDictionary = (code: string) => {
  return request({
    url: '/blade-system/dict/dictionary',
    method: 'get',
    params: { code },
  });
};
```

该函数替代迁移页面中的 `dicUrl` 字符串，不改变网络契约。

### 6.2 分页接口约定

```ts
export interface PageState {
  currentPage: number;
  pageSize: number;
  total: number;
}

export interface PageResult<T> {
  records: T[];
  total: number;
}
```

- 请求：`GET` 查询参数包含 `current`、`size` 和查询字段。
- 响应：Blade 外层响应中的 `data` 为 `PageResult<T>`。
- 默认页：`currentPage = 1`，`pageSize = 10`，与现有页面保持一致。
- 排序：沿用后端现有默认排序，不在迁移中新增客户端排序参数。
- 查询白名单：由每个页面的查询类型和后端接口契约明确，不透传整个表单对象。

### 6.3 删除和提交接口约定

- 删除：`POST /remove`，ID 按现有契约放入查询参数 `ids`，批量 ID 使用逗号分隔字符串。
- 新增：通常为 `POST /submit`，请求体为业务实体。
- 修改：遵循当前模块实际 API；不得机械统一 `/submit` 与 `/update`。
- 成功：沿用 Blade `code = 200` 响应，由页面显示“操作成功”。
- 失败：Axios 拒绝 Promise；表单弹窗保持打开并恢复提交状态。

## 7. 前端设计

### 7.1 目录结构

```text
src/
├── components/
│   ├── search-panel/main.vue          # 增强现有组件
│   ├── list-panel/main.vue
│   ├── list-pagination/main.vue
│   ├── form-dialog/main.vue
│   ├── dict-select/main.vue
│   ├── dict-tag/main.vue
│   ├── row-actions/main.vue           # 第二阶段按需
│   ├── detail-drawer/main.vue         # 日志页迁移时增加
│   └── blade-upload/main.vue           # 上传页迁移时增加
├── composables/
│   ├── usePagedList.ts
│   ├── useTableSelection.ts
│   ├── useRemoteOptions.ts
│   └── useCrudPermission.ts
├── types/
│   ├── list.ts
│   ├── option.ts
│   └── crud.ts
└── views/
    └── system/
        ├── param.vue                  # 第一试点
        └── post.vue                   # 第二试点
```

组件目录使用 kebab-case，composable 和类型文件使用 camelCase。所有新增 Vue 组件使用
`<script setup lang="ts">`，并由页面局部导入。

### 7.2 `search-panel`

现有组件保留插槽式字段声明，避免通过字段数组生成表单。扩展后的契约：

```ts
interface ResponsiveCol {
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}

interface SearchPanelProps {
  model: object;
  labelWidth?: string | number;
  gutter?: number;
  defaultExpanded?: boolean;
  loading?: boolean;
  actionCol?: ResponsiveCol;
}
```

| 类型 | 名称 | 说明 |
| --- | --- | --- |
| 插槽 | `default` | 搜索字段；标准页面无需自行控制折叠，仍暴露 `{ expanded }` 兼容自定义附加内容 |
| 插槽 | `extra-actions` | 查询、重置、展开按钮之外的页面操作 |
| 事件 | `search` | 表单 submit 触发 |
| 事件 | `reset` | 点击重置触发，组件不直接修改模型 |
| 事件 | `expand-change` | 展开状态变化 |

`actionCol` 默认值保持现有 `xs=24, sm=12, md=6`。组件挂载后读取当前 `el-row`、直接子级查询列和操作列的实际宽度，
将可与操作区共同占用首行的查询列作为收起态可见字段；操作列占满整行时至少保留一个查询字段。仅当剩余字段超过
首行容量时渲染展开按钮。`ResizeObserver`、窗口 resize 和直接子节点变化触发重新测量，折叠只改变 DOM 可见性，
不修改查询模型。加载时查询按钮 loading，重置按钮禁用；展开按钮仍可用。

### 7.3 `list-panel`

`list-panel` 组合现有 `basic-container`，接管 `.saber-list-panel` 中稳定的卡片、标题、工具栏和响应式布局，
但不渲染 `el-table`。

| 类型 | 名称 | 说明 |
| --- | --- | --- |
| Prop | `title: string` | 列表标题 |
| Prop | `compact?: boolean` | 是否使用紧凑内边距，默认 `false` |
| 插槽 | `actions` | 新增、删除和业务批量操作 |
| 插槽 | `tools` | 刷新、列设置等低频工具；页面按需提供 |
| 插槽 | `default` | 页面原生 `el-table` |
| 插槽 | `footer` | 分页或汇总信息 |

列表容器不提供 `data`、`columns`、`fetcher`、`permission` 或 CRUD 事件。页面使用原生表格引用执行
`clearSelection()`、`doLayout()`、树节点更新等操作。

#### 原生 `el-table` 约定

- 页面在 `el-table` 上直接绑定 `data`、`v-loading` 和实际需要的原生事件。
- 可选择列表使用 `type="selection"`，标准主键页面设置 `row-key="id"`；跨页保留选择必须有明确业务需求。
- 普通横向表格的选择列固定在左侧，操作列固定在右侧；移动端不得通过取消固定使核心操作不可访问。
- 操作列宽度按实际按钮数量确定，低频操作进入“更多”菜单，不依赖文本换行压缩列宽。
- 树表显式设置 `row-key`、`tree-props` 和懒加载函数，不由 `list-panel` 推断父子字段。
- 长文本列按业务设置 `show-overflow-tooltip`；表单隐藏字段不能据此自动决定列表列是否显示。
- 空状态、表头、hover 和固定列背景使用统一 Token，页面不重复覆盖通用颜色。

### 7.4 `list-pagination`

```ts
interface ListPaginationProps {
  currentPage: number;
  pageSize: number;
  total: number;
  pageSizes?: number[];
  disabled?: boolean;
}

interface PaginationChange {
  currentPage: number;
  pageSize: number;
}
```

- 支持 `v-model:current-page` 和 `v-model:page-size`。
- 页码变化后触发一次 `change`。
- 页容量变化时组件先将当前页置为 1，再触发一次 `change`，避免页面重复加载。
- 桌面布局显示总数、页容量、页码和跳转；小于 768px 时只保留上一页、页码和下一页。
- `total = 0` 时仍保持稳定占位，由页面决定是否隐藏。

### 7.5 `form-dialog`

```ts
export type CrudMode = 'add' | 'edit' | 'view';

interface FormDialogProps {
  modelValue: boolean;
  mode: CrudMode;
  entityName: string;
  submitting?: boolean;
  loading?: boolean;
  width?: string | number;
  destroyOnClose?: boolean;
}
```

| 类型 | 名称 | 说明 |
| --- | --- | --- |
| 插槽 | `default` | 页面业务表单或查看内容 |
| 插槽 | `footer-extra` | 默认按钮左侧的扩展操作 |
| 事件 | `confirm` | 新增/编辑点击确认；组件不调用 `ElForm.validate` |
| 事件 | `cancel` | 用户取消 |
| 事件 | `update:modelValue` | 可见状态同步 |

标题默认组合为“新增/编辑/查看 + entityName”。查看模式只显示关闭按钮；提交中禁止重复确认并阻止误关闭。
表单 ref、校验、详情加载、字段转换和 API 调用全部由业务页面负责。抽屉不塞入该组件，日志等只读场景后续使用
独立 `detail-drawer`。

### 7.6 标准字典组件

新增 `DictionaryItem`：

```ts
export interface DictionaryItem {
  dictKey: string | number;
  dictValue: string;
}
```

`dict-select` 使用 `getDictionary(code)` 加载数据，并显式映射标签和值；支持单选、多选、清空、禁用和
placeholder。`dict-tag` 使用相同字典数据回显标签，找不到值时显示原值或 `-`，不得显示错误标签。

字典数据通过内部 `useDictionary` 或模块级 Promise 缓存按 `code` 复用。缓存只保存成功响应；失败响应不缓存，
再次进入或手动重试时可重新请求。缓存不跨登录会话持久化。

任意业务选项不使用 `dict-select`：租户、部门、角色、岗位、菜单和数据源由页面调用明确 API，并通过
`useRemoteOptions` 管理加载状态。

### 7.7 `usePagedList`

建议契约：

```ts
interface PageListOptions<T, Q extends object, R> {
  fetcher: (current: number, size: number, query: Q) => Promise<R>;
  resolveResponse: (response: R) => PageResult<T>;
  createInitialQuery: () => Q;
  initialPageSize?: number;
}
```

返回以下状态和方法：

- `data: Ref<T[]>`
- `query: Ref<Q>`
- `page: Ref<PageState>`，因为分页组件使用双向绑定并可能整体更新。
- `loading: Ref<boolean>`
- `load()`、`search(query)`、`reset()`、`refresh()`、`changePage(page)`、`changeSize(size)`

实现要求：

1. `search` 和 `reset` 将页码置为 1。
2. `changeSize` 将页码置为 1 并只加载一次。
3. 查询参数通过新对象传入 API，不修改调用方对象。
4. 使用递增请求序号，只有最后一次请求可以更新 `data` 和 `total`。
5. `finally` 只在当前请求仍是最后请求时结束全局列表 loading，避免旧请求提前取消新请求的加载提示。
6. 不内置 `ElMessage`，普通错误继续由 Axios 处理。
7. 树表、非分页接口和主子表不强制使用该 composable。

### 7.8 选择、远程选项与权限 composable

`useTableSelection<T>`：

- 默认从 `row.id` 读取主键，也允许传入 `(row: T) => string`。
- 返回 `selectedRows`、`selectedIds`、`ids`（逗号连接）、`handleSelectionChange` 和 `clearSelection`。
- `clearSelection` 只清空状态；页面同时调用 `ElTable` 实例的 `clearSelection()`。

`useRemoteOptions<T>`：

- 接收返回 `Promise<T[]>` 的业务加载函数。
- 返回 `options`、`loading`、`load(...args)` 和 `clear()`。
- 使用请求序号处理租户快速切换，旧租户结果不得覆盖新租户选项。
- 是否缓存由调用方决定；租户联动数据默认不跨租户缓存。

`useCrudPermission(moduleName)`：

- 从现有 Vuex `permission` getter 计算 `{ add, view, edit, delete }`。
- 内部使用 `validData(permission[`${moduleName}_add`], false)` 等现有语义。
- 管理员判断和 `user_reset` 等扩展权限保留在业务页面，不塞入通用 composable。

### 7.9 页面状态组织

标准页面状态分为三组：

| 状态组 | 状态 | 所有者 |
| --- | --- | --- |
| 列表 | `data/query/page/loading` | `usePagedList` |
| 选择 | `selectedRows/ids` | `useTableSelection` |
| 表单 | `form/mode/dialogVisible/submitting/formLoading` | 业务页面 |
| 选项 | 字典、租户、角色、部门、岗位等 | 字典组件或 `useRemoteOptions` |
| 权限 | 标准 CRUD 与业务扩展权限 | `useCrudPermission` + 页面 computed |

表单提交前复制数据再执行 ID join、日期格式或敏感字段处理，禁止直接修改正在绑定的表单模型导致失败后输入类型改变。

### 7.10 第一阶段页面设计

#### 参数管理

- 使用 `SearchPanel` 声明参数名称、参数键等现有搜索字段。
- 使用 `ListPanel + el-table + ListPagination` 展示标准分页列表。
- 使用 `FormDialog + el-form` 实现新增、编辑和查看。
- 使用 `usePagedList`、`useTableSelection` 和 `useCrudPermission('param')`。
- API 路径、权限码和批量删除参数保持不变。
- 迁移前后逐项对照现有 `option.column` 的列表显示、表单规则和隐藏字段。

#### 岗位管理

- 复用参数管理的列表、分页、表单和状态模式。
- 岗位类型使用 `DictSelect/DictTag`，字典编码为 `post_category`，保持数字值类型。
- 租户模式开启时使用明确租户选项 API；关闭时不显示或提交新增租户字段。
- 编辑前调用现有 `getDetail(id)`，完成详情加载后打开或解除弹窗 loading。
- 岗位提交继续调用现有 `/submit`。

### 7.11 用户管理后续迁移设计

用户管理不作为第一试点，但通用能力必须支持其后续拆分：

```text
user.vue
├── SearchPanel                 # 通用
├── ListPanel + el-table        # 通用骨架 + 页面列
├── ListPagination              # 通用
├── UserFormDialog              # 用户业务组件
├── UserRoleDialog              # 用户业务组件，复用现有 el-tree 逻辑
└── UserImportDialog            # 用户业务组件，内部使用 BladeUpload
```

用户表单需要显式处理租户、角色、部门、岗位联动，多选 ID 的数组/字符串转换，密码新增校验和查看模式。
导出仍按正式后端契约构造筛选参数；昵称、手机、邮箱在迁移前完成接口白名单确认。

### 7.12 样式与主题

#### 视觉原则

- 组件和页面必须仿照 Ant Design Vue 后台界面的信息密度、空间层级、工具栏组织和状态反馈。
- “仿照”不等于像素级复制：底层组件、可访问性状态、交互事件和主题能力均以 Element Plus 为准。
- 新组件使用 `var(--saber-surface)`、`var(--saber-border)`、`var(--saber-text-primary)`、
  `var(--saber-text-secondary)`、`var(--saber-surface-muted)` 和 Element Plus 主色 Token，不硬编码 Ant Design 默认蓝色。
- 以 8px 为基础间距单位，允许 4px 用于图标与文字、紧凑行操作等局部关系。
- 字号不随视口宽度缩放，字间距固定为 0；紧凑面板内不使用大标题。
- 不使用营销式卡片、装饰渐变、悬浮色块或大面积单色装饰。

#### 尺寸与间距基线

| 对象 | 桌面基线 | 移动端基线 | 说明 |
| --- | --- | --- | --- |
| 页面区块间距 | 16px | 12px | 搜索区与列表区保持稳定节奏 |
| 卡片内边距 | 24px | 16px | 参考 Ant Design Vue 管理页内容密度 |
| 卡片圆角 | 6px | 6px | 不超过 8px，与 Saber 现有容器一致 |
| 标准控件高度 | 32px | 32px | 输入、选择、按钮默认保持一致 |
| 工具栏按钮间距 | 8px | 6px 至 8px | 使用 `gap`，不依赖 `.el-button + .el-button` 默认 margin |
| 列表标题 | 16px / 600 / 32px | 16px / 600 / 32px | 标题是工具栏层级，不使用页面 Hero 字号 |
| 表头单元格 | 上下 12px | 上下 10px | 使用 muted surface 和底部分隔线 |
| 表体单元格 | 上下 8px | 上下 8px | 行高稳定，长文本使用 tooltip |
| 表单行间距 | 18px 至 20px | 16px | 标签和控件对齐，错误文案不得挤压相邻字段 |
| 弹窗底部按钮间距 | 8px | 8px | 次操作在左、确认操作在右的视觉顺序 |

#### 搜索与列表

- `search-panel` 参考 Query Filter：桌面端优先四列布局，操作区位于当前行右侧；组件按实际首行容量自动收起
  溢出字段，展开/收起作为低强调文本操作，并随容器宽度变化重新计算。
- `list-panel` 参考 ProTable：标题位于左侧，主操作和批量操作位于右侧；新增使用主按钮，删除使用危险语义，
  导入、导出、授权等低频操作进入“更多”菜单。
- 表格使用轻量表头、细分隔线和克制 hover，不使用重边框或斑马纹作为默认视觉。
- 行内查看、编辑、删除优先使用文本操作；超过三个操作时保留高频项，其余进入更多菜单。
- 分页桌面端右对齐并显示总数和页容量；小于 768px 时居中并隐藏总数、页容量和跳转输入。

#### 表单、弹窗与反馈

- `form-dialog` 参考 Ant Design Vue Modal：标题、正文、底部之间有明确分区，底部操作右对齐，确认按钮为主操作。
- 查看模式不显示提交按钮；编辑详情加载完成前显示骨架/loading，不先展示旧值或空表单。
- 表单标签宽度在同一弹窗内统一；两列布局仅在字段和视口允许时使用，移动端统一单列。
- 空状态、加载、校验失败、请求失败和提交成功必须有稳定占位，不得引发布局跳动。
- 使用 Element Plus Message、MessageBox、Tooltip 和 Icons 表达反馈，不引入 Ant Design Vue 对应组件。

#### 样式所有权

- 组件内部使用 scoped SCSS，只允许组件自身为 Element Plus 子结构提供必要的 `:deep()`。
- 页面不再通过用户专属 class 修改通用搜索、列表工具栏、分页和弹窗。
- 现有 `.saber-list-panel` 在 Avue 用户页迁移前保留；纯 Element Plus 页面由 `list-panel` 自身提供样式。
- 不允许引用 `.ant-*` 类、Ant Design Vue CSS/Less 文件或复制其编译后 CSS。
- 固定列背景、hover、空状态、loading 和弹出层必须同时验证浅色、深色及自定义主色。

## 8. 数据库、配置与发布影响

| 影响项 | 是否涉及 | 说明 | 关联文档 |
| --- | :---: | --- | --- |
| 新表/改表/约束/索引 | 否 | 前端迁移不改变持久化结构 | 不适用 |
| 数据迁移/回填 | 否 | 无历史数据处理 | 不适用 |
| 环境变量/配置 | 否 | 继续使用现有 Vite、API 和租户配置 | 不适用 |
| 部署顺序/兼容 | 是 | 页面按批次发布；Avue 在全部运行时引用移除前继续保留 | 本文第 10 节 |
| 依赖/锁文件 | 否 | 不新增依赖，不应修改锁文件 | 不适用 |

## 9. 安全、测试与可观测性

### 9.1 认证与安全要求

| 检查项 | 设计 |
| --- | --- |
| 身份认证 | 复用 `@/axios` 的现有 OAuth Basic、Blade Token 和 401 处理 |
| 角色授权 | 前端沿用按钮权限；后端仍为最终安全边界 |
| 数据归属 | 复用 `website.tenantMode` 和现有后端租户上下文，不擅自修改 `tenantId` |
| 输入与 SQL | 前端 `ElForm` 校验；后端继续负责业务校验和参数化查询 |
| 敏感字段 | 密码、Token、连接串不得进入日志；查看模式不展示密码 |
| 上传 | 后续 `blade-upload` 必须复用现有 Token 规则，不在 URL 或日志中泄露敏感信息；已有后端契约要求除外并单独评审 |

### 9.2 测试矩阵

仓库当前没有单元测试、E2E 或 lint 脚本，本需求不新增测试基础设施。每个迁移页面至少执行以下验证：

| 场景 | 层级 | 关键断言 | 关联需求 |
| --- | --- | --- | --- |
| 初次加载与空数据 | 浏览器 | loading 正常结束，分页总数正确，空状态可理解 | AC-005、AC-019 |
| 查询、重置和快速连续查询 | 浏览器/网络 | 页码归 1，只展示最后查询结果 | AC-001、AC-004、AC-020 |
| 分页与页容量 | 浏览器/网络 | 参数正确，页容量变化只产生一次有效加载 | AC-006、AC-007 |
| 新增、编辑和查看 | 浏览器 | 模式、详情、校验、提交和刷新正确 | AC-010 至 AC-014 |
| 单删和批量删除 | 浏览器 | 确认、ID 参数、选择清理和刷新正确 | AC-021、AC-027 |
| 权限差异 | 浏览器/后端 | 无权限按钮隐藏，直接请求仍由后端拒绝 | AC-022 |
| 字典值与租户选项 | 浏览器/网络 | 标签、值类型和租户切换无旧结果覆盖 | AC-015 至 AC-018 |
| 浅色/深色 | 浏览器截图 | 表头、固定列、弹窗和状态对比度正常 | AC-029 |
| 1440/1024/375 视口 | 浏览器截图 | 无重叠、溢出，操作列和分页可用 | AC-008、AC-029 |
| Ant Design Vue 视觉基线 | 浏览器截图/设计评审 | 搜索、ProTable 式工具栏、轻量表格、分页、Modal/Drawer 层级符合第 7.12 节，且无 `.ant-*` 或 Ant 运行时依赖 | AC-031 至 AC-035 |
| 未迁移 Avue 冒烟 | 浏览器 | 代表性普通 CRUD 和树表行为不变 | AC-024 |
| 类型检查 | 工程命令 | `pnpm run type-check` 通过 | AC-025 |
| 生产构建 | 工程命令 | `pnpm run build:prod` 通过 | AC-025 |

### 9.3 日志、指标与性能

- 不新增前端业务日志和指标。
- 继续使用现有 Axios/NProgress 行为。
- 禁止新增调试 `console.log`；现有错误日志不在无关迁移中扩散。
- 通过浏览器网络面板确认查询、页容量和字典请求没有重复调用。
- 大数据量、虚拟滚动和服务端性能不属于第一阶段，遇到明确页面需求时专项设计。

### 9.4 第一阶段实施结果

| 设计项 | 实施结果 | 验证结果 |
| --- | --- | --- |
| 通用组件 | 已完成 `search-panel`、`list-panel`、`list-pagination`、`form-dialog`、`dict-select` 和 `dict-tag` | 组件局部导入，无业务 API 或权限码反向耦合；SearchPanel 已在 1440px、1024px、375px 验证首行容量自动折叠和查询值保持 |
| Composable 与类型 | 已完成分页、选择、远程选项、CRUD 权限、字典缓存及分页/选项/CRUD 共享类型 | 请求序号、失败状态恢复、成功刷新后选择清理通过类型检查 |
| 参数管理 | 已改为 `SearchPanel + ListPanel + el-table + ListPagination + FormDialog` | 真实后端查询、重置、查看、新增初始态和前端校验通过 |
| 岗位管理 | 已接入显式租户 API、`post_category` 数字字典和详情接口 | 租户“管理组”及高层/中层/基层字典回显、详情回填通过 |
| 工程与静态门禁 | 无新增依赖；两个试点不再引用 Avue 或 Ant Design | `pnpm run type-check` 通过；Node 22 下 `pnpm run build:prod` 通过；`avue-crud` 页面数为 19 |
| 响应式与主题 | 组件样式使用 Saber/Element Plus Token | 1440px、1024px、375px 及明暗主题检查通过 |

当前未执行会改变真实数据的新增、编辑、单删和批量删除。接口失败恢复、权限差异、租户关闭模式和代表性
未迁移 Avue 页面业务冒烟保留为正式验收项。默认 Node 24 在当前 Windows 环境触发 Rollup 原生进程崩溃，
生产构建验证使用本机 Node 22 完成，未修改依赖或锁文件。

## 10. 发布与回滚

### 10.1 迁移与发布

1. 建设并验证第一阶段通用组件、composable 和共享类型。
2. 迁移参数管理，完成行为对照、类型检查、构建及浏览器验证。
3. 发布参数管理试点并执行代表性未迁移 Avue 页面冒烟验证。
4. 迁移岗位管理，补齐字典和租户选项能力并重复验证。
5. 评审试点复盘，冻结第一版组件契约和页面迁移清单。
6. 按普通分页页、只读详情页、树表、复杂页面、主子表的顺序继续迁移。
7. 仅当 `src` 中不存在 Avue 运行时引用且布局/插件已有替代方案时，单独评审移除 Avue 依赖。

建议迁移批次：

| 批次 | 页面类型 | 候选页面 | 主要验证能力 |
| --- | --- | --- | --- |
| 第一阶段 | 标准分页 CRUD | `system/param.vue`、`system/post.vue` | 基础组件、分页、字典、租户选择 |
| 第二阶段 | 普通 CRUD/只读详情 | tenant、client、datasource、notice、reportlist、monitor/log | 通用行操作、详情抽屉 |
| 第三阶段 | 树表与复杂单表 | dict、dept、menu、role、topmenu、user、code | 树节点、联动选项、上传和复杂业务弹窗 |
| 第四阶段 | 主子表和专项页面 | datascope、apiscope、region、util 页面 | 懒加载、抽屉子表、示例清理 |

实际批次以需求评审为准，每个页面独立提交和验证，避免跨批次大面积格式化或重构。

### 10.2 回滚与恢复

- 触发条件：核心流程回归、权限/租户行为错误、未迁移页面受影响、移动端关键操作不可用或生产构建失败。
- 代码回滚：按页面和对应通用组件版本回滚；保留原路由和 API，因此无需后端配合。
- 数据库 downgrade：不适用。
- 不可逆数据变化：无；业务操作仍由现有后端接口处理。
- 回滚验证：目标页面恢复迁移前 Avue 行为，代表性 Avue 页面正常，类型检查和构建通过。

## 11. 风险、评审与变更

### 11.1 风险与开放问题

| 编号 | 类型 | 内容 | 负责人 | 状态/结论 |
| --- | --- | --- | --- | --- |
| ITEM-001 | 风险 | Avue option 同时驱动表格和表单，手工拆分可能遗漏隐藏、查看、校验或字典行为 | 前端负责人 | 第一阶段已关闭；参数、岗位完成字段对照和只读流程验证 |
| ITEM-002 | 风险 | `usePagedList` 无法统一树形和非分页响应 | 前端负责人 | 已接受；通过转换或专项 composable 处理 |
| ITEM-003 | 风险 | 字典 `dictKey` 在不同模块可能为字符串或数字 | 前后端负责人 | 第一阶段已确认 `post_category` 使用数字值；后续模块继续逐接口确认 |
| ITEM-004 | 风险 | 新组件样式与现有 Avue 全局样式可能互相影响 | 前端负责人 | 第一阶段已完成明暗主题和多视口回归；后续页面持续检查 |
| ITEM-005 | 风险 | 无自动化测试导致跨页面回归成本较高 | 测试负责人 | 仍开放；第一阶段使用类型、构建和人工浏览器矩阵 |
| ITEM-006 | 问题 | 是否将 `row-actions` 纳入第一阶段需由参数页实现后确认 | 前端负责人 | 已确认不纳入第一阶段，试点页面直接声明行操作 |
| ITEM-007 | 问题 | 用户管理额外搜索字段和导出参数的正式后端白名单需确认 | 前后端负责人 | 用户页迁移前关闭 |
| ITEM-008 | 风险 | 全量迁移周期较长，过渡期会同时维护 Avue 页和 Element Plus 页 | 技术负责人 | 已接受；禁止单页内部长期混用 |
| ITEM-009 | 风险 | Ant Design Vue 参考版本或主观理解不同可能导致页面视觉漂移 | 设计/前端负责人 | 第一阶段按第 3.3、7.12 节实现并完成多视口验证；正式视觉评审仍待完成 |

### 11.2 评审结论

| 领域 | 结论 | 评审人 | 日期 | 备注 |
| --- | --- | --- | --- | --- |
| 后端/API | 第一阶段现有接口联调通过，写操作待验收 | 待定 | 2026-08-31 | 列表、详情、字典和租户选项已验证 |
| 前端 | 实施验证通过 | 待定 | 2026-08-31 | 组件契约、试点页面、类型和构建通过 |
| 数据库/发布 | 不适用/待确认发布批次 | 待定 | 2026-08-31 | 无数据库变更 |
| 测试 | 部分通过，待业务验收 | 待定 | 2026-08-31 | 写操作、失败恢复、权限差异和 Avue 冒烟待完成 |

### 11.3 变更记录

| 日期 | 版本 | 变更内容 | 原因 | 影响 | 修改人 |
| --- | --- | --- | --- | --- | --- |
| 2026-08-31 | 0.1 | 初稿 | 建立 Element Plus 迁移技术基线 | 通用组件、composable、试点及迁移批次 | Codex |
| 2026-08-31 | 0.2 | 增加 Ant Design Vue 参考映射和视觉实现规范 | 明确组件与样式的设计基准及验收方式 | 关键决策、组件映射、样式、测试和风险 | Codex |
| 2026-08-31 | 0.3 | 同步第一阶段实现、验证结果和剩余验收项 | 通用能力及参数、岗位试点已完成开发 | 文档状态、测试、风险和评审结论 | Codex |
| 2026-09-03 | 0.4 | SearchPanel 改为测量实际列宽并自动折叠首行溢出字段 | 统一所有使用页面的展开/收起启用规则 | 组件契约、响应式测量、使用方和验证范围 | Codex |
