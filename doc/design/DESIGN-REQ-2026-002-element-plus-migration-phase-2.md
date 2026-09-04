# Saber Element Plus 第二阶段普通页面迁移详细设计文档

## 1. 文档信息

| 项目 | 内容 |
| --- | --- |
| 功能/模块 | Element Plus 普通 CRUD、报表列表与日志详情迁移 |
| 设计编号 | DESIGN-REQ-2026-002 |
| 设计版本 | 0.5 |
| 关联需求 | [需求索引](../requirements-index.md)；[REQ-2026-002 第二阶段普通页面迁移](../requirements/REQ-2026-002-element-plus-migration-phase-2.md)；[手工测试](../test/TEST-REQ-2026-002-element-plus-migration-phase-2.md)；前置设计 [DESIGN-REQ-2026-001](DESIGN-REQ-2026-001-element-plus-migration.md) |
| 目标版本/迭代 | Saber 5.x / Element Plus 迁移第二阶段 |
| 文档状态 | 已实现，部分验证，待验收 |
| 设计负责人 | 待定 |
| 评审人 | 前端、后端、安全、测试按需填写 |
| 最后更新日期 | 2026-09-01 |

## 2. 设计摘要与范围

### 2.1 设计摘要

第二阶段沿用第一阶段已经实现的 `SearchPanel + ListPanel + el-table + ListPagination` 页面骨架，
标准 CRUD 页面继续使用 `FormDialog`，通知类型继续使用 `DictSelect`/`DictTag`。本阶段新增
`RowActions`、`DetailDrawer` 和 `useRemoteDetail`，分别统一标准行操作、只读详情布局及详情请求的
加载/失败/竞态状态。8 个目标页面直接声明表格列和业务表单，不通过 JSON 配置生成页面。

租户、客户端、数据源和通知公告按标准 CRUD 模式迁移；报表列表保留设计、预览和删除专项操作；三类
日志共用只读详情模式。公告富文本不是 Element Plus 能力，本阶段保留已经安装并全局注册的
`avue-plugin-ueditor`，通过公告目录内的业务适配组件独立使用，不保留 `avue-crud` 或 `avue-form`。

数据库、认证和接口契约均不修改。公告写接口在后端增加字段级 HTML 白名单过滤，避免全局 XSS 包装器直接改写
JSON 导致格式丢失或解析失败。客户端和数据源详情当前会返回原始密钥/密码，页面只在弹窗打开期间以密码输入框
持有，不写入日志、Store 或浏览器持久化。日志参数和堆栈按纯文本渲染，禁止 `v-html`。
报表没有现成按钮权限码，第二阶段保持当前菜单级入口与服务端校验，不发明新的前端权限码。

### 2.2 关键决策

| 编号 | 决策 | 原因 | 影响 |
| --- | --- | --- | --- |
| DEC-001 | 完整复用第一阶段页面骨架和 composable | 参数、岗位已验证分页、选择、权限、字典和表单状态 | 本阶段只扩展缺失能力，不形成第二套范式 |
| DEC-002 | 新增轻量 `row-actions`，只处理查看、编辑、删除标准操作 | 5 个 CRUD 页面和 3 个日志页存在稳定重复布局 | 专项操作仍由页面显式声明，不做动态菜单引擎 |
| DEC-003 | 新增 `detail-drawer` 和 `useRemoteDetail` | 三类日志及多个详情表单都需要清理旧值、防竞态和失败恢复 | UI 骨架与请求状态分离，组件不持有业务 API |
| DEC-004 | 公告使用业务级 `notice-editor` 适配既有 `avue-ueditor` | Element Plus 无富文本编辑器，直接替换会导致能力降级 | 保留既有依赖；迁移页面仅此字段继续使用 Avue 插件 |
| DEC-005 | 客户端密钥和数据源密码在分页响应进入列表状态前剔除，详情表单默认遮蔽 | 后端列表/详情当前可能返回原值，无法只靠前端改变更新契约 | 列表只保留“已配置”标记；原值仅存在详情表单生命周期内 |
| DEC-006 | 日志详情使用转义后的纯文本和 `<pre>` 语义展示 | 请求参数和堆栈可能包含 HTML、超长文本或敏感词 | 避免 XSS，支持换行与局部滚动 |
| DEC-007 | 报表操作使用 `URL`/`URLSearchParams` 生成地址并用新窗口打开 | 保持 `blade-{name}` 语义，同时正确编码特殊字符 | 不改变报表服务，不新增路由或 API |
| DEC-008 | 报表页不新增前端按钮权限判断 | 当前菜单数据没有报表按钮权限码，后端报表能力由既有服务控制 | 保持现状；权限增强需单独变更菜单和后端契约 |
| DEC-009 | 页面本地声明实体、查询和表单类型；API 参数只补最小类型 | 与第一阶段模式一致，避免建立跨模块巨型实体层 | 不新增裸 `unknown`、`Record<string, unknown>` 或显式 `any` |
| DEC-010 | 8 个页面按子批次逐页迁移和回滚 | 跨系统管理、工作台、工具、报表和日志，整体发布风险较高 | 每页完成静态、类型、构建和业务验证后再进入下一页 |
| DEC-011 | 公告写接口跳过原始 JSON XSS 过滤，解析后使用 OWASP HTML 白名单清洗 `content` | 通用过滤器不是 JSON 感知，曾剥离列表标签并破坏链接属性转义 | 保留安全富文本语义；配置与 `blade-desk` 代码必须同步发布 |

### 2.3 改动范围

| 层级 | 改动内容 | 不涉及内容 |
| --- | --- | --- |
| 后端 | `NoticeController` 在保存前清洗富文本；新增 `NoticeHtmlSanitizer` | 其他 Controller、Service、实体、数据库、网关和权限模型 |
| 前端组件 | 新增 `row-actions`、`detail-drawer`；新增公告业务适配组件 | 通用表格生成器、上传组件、树表组件 |
| 前端状态 | 新增 `useRemoteDetail`；复用分页、选择、字典和权限 composable | Vuex 业务状态重构、全局详情缓存 |
| 前端 API | 为涉及 API 的参数补最小 TypeScript 类型，路径和请求配置不变 | 新接口、重复 Axios 实例、认证头处理 |
| 前端页面 | 迁移 tenant、client、datasource、notice、reportlist、usual/api/error log | 用户、树表、主子表和专项示例页面 |
| 数据库 | 无 | 表、字段、索引和数据迁移 |
| 配置/部署 | Nacos XSS 跳过 `/notice/save`、`/notice/update`、`/notice/submit`；继续使用既有报表地址 | 前端环境变量和锁文件变更 |

## 3. 总体设计

### 3.1 架构图

~~~mermaid
flowchart TB
    subgraph Pages[第二阶段页面]
        Crud[租户/客户端/数据源/公告]
        Report[报表列表]
        Logs[通用/接口/错误日志]
    end

    Crud --> Search[SearchPanel]
    Crud --> List[ListPanel + ListPagination]
    Crud --> Table[页面 el-table]
    Crud --> Actions[RowActions]
    Crud --> Form[FormDialog + 页面 el-form]
    Crud --> DetailState[useRemoteDetail]
    Crud --> NoticeEditor[notice-editor]

    Report --> Search
    Report --> List
    Report --> Table
    Report --> ReportUrl[URL + window.open]

    Logs --> Search
    Logs --> List
    Logs --> Table
    Logs --> Actions
    Logs --> Drawer[DetailDrawer]
    Logs --> DetailState

    Pages --> Hooks[usePagedList/useTableSelection/useCrudPermission/useDictionary]
    Pages --> API[现有模块 API]
    DetailState --> API
    API --> Axios[现有 @/axios]
    Axios --> Backend[SpringBlade 现有服务]
    ReportUrl --> ReportService[现有报表服务]
~~~

业务页面负责字段、权限、API 调用和实体转换；通用组件只负责展示骨架及标准事件；composable 负责可复用
异步状态。任何通用组件都不得导入 `src/views`、模块 API、Vuex 权限码或具体业务实体。

### 3.2 组件职责

| 组件/模块 | 职责 | 输入 | 输出 |
| --- | --- | --- | --- |
| `search-panel` | 搜索字段布局与查询/重置状态 | 查询模型、loading、页面字段插槽 | `search`、`reset` |
| `list-panel` | 标题、主操作、工具、表格和底部布局 | 标题及区域插槽 | 页面原生事件 |
| `list-pagination` | 分页和移动端裁剪 | 页码、页容量、总数、禁用态 | 单次 `change` |
| `form-dialog` | 新增/编辑/查看弹窗和提交态 | 模式、标题、loading、submitting | `confirm`、`cancel` |
| `dict-select`/`dict-tag` | `notice` 字典选择和回显 | 字典编码、值类型、当前值 | 模型值、标签、失败状态 |
| `row-actions` | 标准查看、编辑、删除文本操作 | 三个显示开关、disabled | `view`、`edit`、`delete` |
| `detail-drawer` | 统一只读详情抽屉骨架 | 标题、可见、loading、尺寸、内容插槽 | 关闭及可见状态 |
| `notice-editor` | 隔离公告富文本插件 | 内容、disabled、rows | 内容更新 |
| `useRemoteDetail` | 详情加载、失败、竞态和清理 | 详情 loader、资源 ID | data、loading、failed、load、clear |
| `usePagedList` | 列表、查询、分页和请求竞态 | 页面 fetcher 与响应转换 | data、query、page、loading 及操作 |
| `useTableSelection` | 选择行与逗号 ID | 行及主键读取 | selectedRows、ids、clear |
| `useCrudPermission` | 标准 CRUD 权限 | 模块前缀 | add/view/edit/delete 布尔值 |

### 3.3 新增依赖

前端不新增依赖，`package.json` 和 `pnpm-lock.yaml` 不因第二阶段发生变化。SpringBlade 的 `blade-desk` 增加
`com.googlecode.owasp-java-html-sanitizer:owasp-java-html-sanitizer:20240325.1`，用于解析后的公告 `content`
字段白名单清洗。通用 XSS 过滤器仅支持有限标签且直接处理原始 JSON，不能满足安全富文本往返要求。

- `avue-plugin-ueditor@1.0.4` 已安装并在 `src/main.ts` 注册，支持独立 `v-model`、`disabled` 和 `rows`。
- Element Plus、Element Plus Icons、Vue、Vuex、Axios 和现有 Saber Token 满足其他功能。
- 不引入 Ant Design Vue、其他富文本编辑器、表格框架或状态管理库。

## 4. 核心流程设计

### 4.1 列表与 CRUD 技术流程

标准分页和保存流程沿用 `DESIGN-REQ-2026-001`。第二阶段页面统一执行以下调用顺序：

~~~mermaid
sequenceDiagram
    actor User as 用户
    participant Page as 业务页面
    participant List as usePagedList
    participant Form as FormDialog/ElForm
    participant API as 模块 API
    participant Axios as @/axios

    User->>Page: 进入页面/查询/分页
    Page->>List: load/search/change page
    List->>API: getList(current, size, query)
    API->>Axios: 现有 GET 请求
    Axios-->>List: Blade 分页响应或异常
    List-->>Page: 最新 records/total/loading
    User->>Page: 新增/编辑/删除
    alt 新增或编辑
        Page->>Form: validate
        Form-->>Page: 校验结果
        Page->>API: submit(payload)
    else 删除
        Page->>Page: 校验选择并确认
        Page->>API: remove(ids)
    end
    API-->>Page: 成功或异常
    alt 成功
        Page->>Page: 关闭弹窗/清空选择
        Page->>List: refresh
    else 失败
        Page->>Page: 保留输入或选择，恢复局部状态
    end
~~~

列表加载继续由 `usePagedList` 的请求序号避免旧响应覆盖。页面禁止在 `@change` 之外同时监听分页组件的
页码和页容量事件发起请求，避免一次用户操作产生两次加载。

### 4.2 详情加载技术流程

~~~mermaid
sequenceDiagram
    actor User as 用户
    participant Page as 页面
    participant State as useRemoteDetail
    participant API as 详情 API
    participant View as FormDialog/DetailDrawer

    User->>Page: 点击查看或编辑
    Page->>State: clear()
    Page->>View: 打开并显示 loading
    Page->>State: load(id)
    State->>State: requestId + 1, failed=false
    State->>API: getDetail(id)
    alt 当前请求成功
        API-->>State: detail
        State-->>Page: data=detail, loading=false
        Page-->>View: 展示目标详情
    else 当前请求失败
        API-->>State: reject
        State-->>Page: failed=true, data=null
        Page-->>View: 展示失败状态和重试入口
    else 旧请求后返回
        API-->>State: stale detail
        State->>State: 丢弃结果
    end
    User->>Page: 关闭
    Page->>State: clear() 并使在途请求失效
~~~

租户页面没有详情 API，查看/编辑使用所选行的副本；客户端、数据源、公告和三类日志必须使用详情 API。
详情失败时不允许表单提交，重试使用相同目标 ID。切换记录或关闭容器时调用 `clear()`。

### 4.3 公告富文本流程

1. 新增时创建全新 `NoticeForm`，`content` 初始化为空字符串。
2. 编辑/查看时先通过 `/blade-desk/notice/detail` 获取完整内容。
3. `notice-editor` 使用 `<avue-ueditor v-model="content">`，编辑模式可用，查看模式传入 `disabled`。
4. `ElForm` 仍负责标题、类型和时间校验；富文本组件只更新 `content`，不调用公告 API。
5. 提交时复制表单对象，按现有格式提交 `releaseTime` 和 HTML 内容。
6. Nacos XSS 配置跳过公告写接口，避免请求包装器在 Jackson 解析前改写 JSON；Controller 解析实体后仅对白名单字段
   `content` 执行 `NoticeHtmlSanitizer`。
7. 白名单保留段落、换行、标题、列表、强调、链接、图片、视频和表格等编辑器语义，移除脚本、事件属性和危险协议。
8. 列表中的内容只显示通过 `DOMParser` 提取的纯文本摘要，不使用 `v-html`；完整格式在查看弹窗中显示。
9. 富文本图片上传保持插件当前配置，不在第二阶段新增上传地址或鉴权方案。

### 4.4 报表外链流程

1. 页面从行数据读取 `name`，空名称时禁用设计和预览操作。
2. 使用 `new URL(website.reportUrl, window.location.origin)` 解析报表基础地址。
3. 在基础 pathname 后追加 `designer` 或 `preview`，使用 `searchParams.set('_u', `blade-${name}`)` 设置标识。
4. 使用 `_blank` 和 `noopener,noreferrer` 打开新窗口；`window.open` 返回空时提示浏览器可能已阻止弹窗。
5. 打开动作不修改列表、选择或分页状态。
6. 删除仍调用现有 `/blade-report/report/rest/remove`，与外链打开互不耦合。

### 4.5 异常与边界流程

| 场景 | 处理位置 | 处理方式 | HTTP/错误码 | 数据是否改变 |
| --- | --- | --- | --- | :---: |
| 未登录/登录失效 | `axios.ts` | 沿用 `FedLogOut` 和登录跳转 | 401 | 否 |
| 列表失败 | `usePagedList` | 保留查询，`finally` 恢复 loading | Blade 非 200/网络异常 | 否 |
| 详情失败 | `useRemoteDetail` + 页面 | 清空 data、显示失败和重试，不提交旧值 | Blade 非 200/网络异常 | 否 |
| 字典失败 | `useDictionary` | 清空选项、允许重新加载，不伪造标签 | Blade 非 200/网络异常 | 否 |
| 表单校验失败 | 页面 `ElForm` | 阻止请求并定位字段 | 不发请求 | 否 |
| 保存失败 | 页面 | 保留表单，恢复 submitting | Blade 非 200/网络异常 | 由后端决定 |
| 删除取消 | 页面 | 捕获取消，不提示接口错误，不清选择 | 不发请求 | 否 |
| 删除失败 | 页面 | 保留列表和选择 | Blade 非 200/网络异常 | 由后端决定 |
| 富文本内容为空 | 公告表单 | 内容当前非必填，按现有契约提交空字符串 | 不适用 | 取决于提交 |
| 报表名称为空 | 报表页面 | 禁用设计/预览，避免生成错误 URL | 不发请求 | 否 |
| 报表窗口被阻止 | 报表页面 | 提示检查浏览器弹窗设置，列表不变 | 不适用 | 否 |
| 日志长文本 | 详情内容 | 纯文本换行并限制局部高度，允许滚动 | 不适用 | 否 |

### 4.6 事务、并发与幂等

| 操作 | 事务边界 | 并发控制 | 幂等策略 |
| --- | --- | --- | --- |
| 列表/详情查询 | 不适用 | 前端请求序号丢弃旧响应 | GET 只读 |
| 新增/编辑 | 现有后端事务 | 前端 submitting 锁 | 沿用后端接口，不增加幂等键 |
| 单删/批量删除 | 现有后端事务 | 确认框和页面操作锁 | 沿用后端逻辑删除语义 |
| 报表设计/预览 | 外部报表服务 | 不适用 | 新窗口 GET 只读或由外部服务负责 |

## 5. 后端设计

### 5.1 路由、模型与服务

除公告富文本安全入库外，后端接口、实体和数据库不变。详细设计以当前 SpringBlade 源码为事实来源：

| 模块 | 当前后端实现 | 设计结论 |
| --- | --- | --- |
| 客户端 | `AuthClientController` 类级 `HAS_ROLE_ADMIN`；实体直接包含 `clientSecret` | 前端保持管理员边界，密钥遮蔽但不改变提交值 |
| 数据源 | `DatasourceController` 类级 `HAS_ROLE_ADMIN`；详情直接返回 `password` | 前端密码输入遮蔽；URL 继续由后端处理 `&amp;` |
| 日志 | 三个 Controller 的 list/detail 均为 `HAS_ROLE_ADMIN` | 前端按钮权限只控制入口，后端管理员角色最终授权 |
| 错误日志 | `LogErrorWrapper` 已处理既有敏感词 | 前端仍按纯文本展示，不依赖前端完成脱敏 |
| 报表 | `blade-report` 使用现有报表组件和 `blade-` provider 前缀 | 前端只构造现有设计/预览地址和调用删除接口 |
| 公告 | `NoticeController` 沿用现有实体和接口，写入前通过 `NoticeHtmlSanitizer` 清洗 `content` | 保留允许的富文本格式，剔除脚本、事件属性和危险 URL；不改变字段和响应契约 |
| 租户 | 沿用现有 Blade Controller 和实体 | 不改变租户和字典语义 |

### 5.2 认证与数据归属

- 是否需要登录：是。
- 认证方式：继续由 `src/axios.ts` 注入 OAuth Basic 和 Blade Token。
- 管理员后端边界：客户端、数据源和三类日志由 `HAS_ROLE_ADMIN` 保护。
- 前端按钮权限：继续读取 `store.getters.permission`，仅用于入口显示。
- 数据归属：沿用各服务现有租户上下文和逻辑删除字段；前端不改写归属字段。
- 客户端写入：租户新增/编辑不允许用户填写或修改 `tenantId`；其他模块只提交现有表单字段。
- 报表服务：继续使用当前网关/报表服务访问规则，不把 Blade Token 新增到 URL。

### 5.3 查询、删除与错误

- 分页：继续使用 `current`、`size`，响应读取 `res.data.data.records` 和 `total`。
- 默认排序：不增加前端排序参数，沿用各后端当前排序；日志后端当前按 `create_time` 升序。
- 详情：客户端、数据源、公告和日志按 `id` 查询；租户继续使用行数据。
- 删除：继续使用 `POST /remove`，`ids` 为逗号分隔字符串。
- 普通错误：继续由 `axios.ts` 显示统一错误；页面只恢复局部状态。
- HTTP 错误：Axios 仅允许 2xx 进入成功拦截器；4xx/5xx 即使响应体没有 Blade `code` 也必须进入失败分支。
- 敏感字段：本阶段不改变后端响应模型；客户端和数据源列表在 `resolveResponse` 中剔除密钥/密码，详情原值只在表单生命周期内存在。

## 6. API 契约

### 6.1 接口清单

本设计不新增接口或修改请求/响应字段。公告提交仅增加服务端字段级安全处理，下表用于锁定迁移必须保持的当前契约。

| 方法 | 路径 | 用途 | 前端访问条件 | 变更类型 |
| --- | --- | --- | --- | --- |
| GET | `/blade-system/tenant/list` | 租户分页 | 租户菜单 | 不变 |
| POST | `/blade-system/tenant/submit` | 租户新增/修改 | `tenant_add/edit`；后端最终授权 | 不变 |
| POST | `/blade-system/tenant/remove` | 租户删除 | `tenant_delete`；后端最终授权 | 不变 |
| GET | `/blade-system/client/list` | 客户端分页 | 客户端菜单；后端管理员 | 不变 |
| GET | `/blade-system/client/detail` | 客户端详情 | `client_view/edit`；后端管理员 | 不变 |
| POST | `/blade-system/client/submit` | 客户端新增/修改 | `client_add/edit`；后端管理员 | 不变 |
| POST | `/blade-system/client/remove` | 客户端删除 | `client_delete`；后端管理员 | 不变 |
| GET | `/blade-develop/datasource/list` | 数据源分页 | 数据源菜单；后端管理员 | 不变 |
| GET | `/blade-develop/datasource/detail` | 数据源详情 | `datasource_view/edit`；后端管理员 | 不变 |
| POST | `/blade-develop/datasource/submit` | 数据源新增/修改 | `datasource_add/edit`；后端管理员 | 不变 |
| POST | `/blade-develop/datasource/remove` | 数据源删除 | `datasource_delete`；后端管理员 | 不变 |
| GET | `/blade-desk/notice/list` | 公告分页 | 公告菜单 | 不变 |
| GET | `/blade-desk/notice/detail` | 公告详情 | `notice_view/edit` | 不变 |
| POST | `/blade-desk/notice/submit` | 公告新增/修改 | `notice_add/edit` | 不变 |
| POST | `/blade-desk/notice/remove` | 公告删除 | `notice_delete` | 不变 |
| GET | `/blade-system/dict/dictionary?code=notice` | 通知类型字典 | 已登录 | 不变 |
| GET | `/blade-report/report/rest/list` | 报表分页 | 报表菜单 | 不变 |
| POST | `/blade-report/report/rest/remove` | 报表删除 | 保持当前菜单级入口/服务端规则 | 不变 |
| GET | `/blade-log/{type}/list` | usual/api/error 日志分页 | 对应菜单；后端管理员 | 不变 |
| GET | `/blade-log/{type}/detail` | usual/api/error 日志详情 | 对应 view 权限；后端管理员 | 不变 |

### 6.2 分页与查询白名单

| 页面 | 查询模型 | 请求参数 |
| --- | --- | --- |
| 租户 | `TenantQuery` | `tenantId`、`tenantName`、`linkman` |
| 客户端 | `ClientQuery` | `clientId`、`clientSecret` |
| 数据源 | `DatasourceQuery` | 当前为空，不擅自新增筛选 |
| 通知公告 | `NoticeQuery` | `title`、`category` |
| 报表列表 | `ReportQuery` | `name` |
| 三类日志 | `LogQuery` | `serviceId`、`serverHost` |

所有查询模型通过 `createInitialQuery()` 创建，页面只把模型白名单传给 API，不透传表单或行数据。
`clientSecret` 查询是既有兼容行为，输入控件使用密码类型；其 GET 查询仍可能进入服务端访问日志，是否废弃
该查询条件需要单独的后端兼容变更，不在本次前端迁移中静默删除。

### 6.3 提交字段和默认值

| 模块 | 新增初始值/字段规则 | 编辑规则 |
| --- | --- | --- |
| 租户 | `tenantName`、`linkman` 必填；`contactNumber`、`address`、`domain` 可选；不提交用户填写的 `tenantId` | 使用行副本；`tenantId` 只读且不允许修改 |
| 客户端 | `authorizedGrantTypes='refresh_token,password,authorization_code'`、`scope='all'`、`accessTokenValidity=3600`、`refreshTokenValidity=604800` | 列表不保留密钥；详情全量回填；未修改密钥时提交原值 |
| 数据源 | 驱动限现有 MySQL/PostgreSQL/Oracle 值；名称、驱动、用户名、密码、URL 必填 | 列表不保留密码；详情全量回填；未修改密码时提交原值 |
| 公告 | 标题、类型、发布时间必填；内容默认空字符串；类型按 number 归一化 | 详情全量回填；时间仍为 `YYYY-MM-DD HH:mm:ss` |

### 6.4 前端 API 类型调整

涉及的 API 文件保持现有函数名和返回值，仅为参数补最小类型：

```ts
export const getList = (current: number, size: number, params: object) => { /* existing request */ };
export const getDetail = (id: string) => { /* existing request */ };
export const remove = (ids: string) => { /* existing request */ };
export const add = (row: object) => { /* existing request */ };
export const update = (row: object) => { /* existing request */ };
```

页面继续使用 `type XxxListResponse = Awaited<ReturnType<typeof getList>>` 作为 `usePagedList` 的响应类型。
实体、查询和表单 interface 保持页面局部，避免 API 层和页面层维护两套字段定义。

## 7. 前端设计

### 7.1 目录结构

```text
src/
├── components/
│   ├── row-actions/main.vue                 # 新增：标准行操作
│   └── detail-drawer/main.vue               # 新增：只读详情抽屉
├── composables/
│   └── useRemoteDetail.ts                   # 新增：详情状态与竞态保护
├── views/
│   ├── desk/
│   │   ├── components/notice-editor.vue     # 新增：公告富文本业务适配
│   │   └── notice.vue
│   ├── monitor/log/
│   │   ├── usual.vue
│   │   ├── api.vue
│   │   └── error.vue
│   ├── report/reportlist.vue
│   ├── system/
│   │   ├── tenant.vue
│   │   └── client.vue
│   └── tool/datasource.vue
└── api/                                     # 现有文件补最小参数类型
```

新组件和 composable 局部导入，不修改 `main.ts`。`notice-editor` 使用已全局注册的 `avue-ueditor`，
不新增重复注册。

### 7.2 页面统一状态模型

标准 CRUD 页面保持以下状态：

```ts
const searchForm = ref<XxxQuery>(createInitialQuery());
const form = ref<XxxForm>(createInitialForm());
const mode = ref<CrudMode>('add');
const dialogVisible = ref(false);
const submitting = ref(false);
const formRef = ref<InstanceType<typeof ElForm>>();
const tableRef = ref<TableInstance>();
```

- 列表：使用 `usePagedList<XxxEntity, XxxQuery, XxxListResponse>`。
- 选择：可删除页面使用 `useTableSelection<XxxEntity>()`，并在 `watch(data, ...)` 中同步清除表格选择。
- 权限：标准页面使用 `useCrudPermission(moduleName)`；日志使用 `useCrudPermission('log_usual/api/error').view`。
- 详情：有详情接口的页面使用 `useRemoteDetail`；租户使用行副本。
- 表单：`createInitialForm()` 必须返回全新对象，新增时不复用上一次值。
- 提交：复制 payload 后调用 API，不直接修改表格行对象。
- 错误：`catch` 不重复弹普通接口错误，`finally` 恢复 submitting/loading。

敏感或超长详情字段不得直接保留在分页列表状态。客户端、数据源和日志的 `resolveResponse` 显式映射
列表模型：

```ts
interface ClientListItem extends Omit<ClientEntity, 'clientSecret'> {
  hasClientSecret: boolean;
}

const toClientListItem = (entity: ClientEntity): ClientListItem => {
  const { clientSecret, ...item } = entity;
  return { ...item, hasClientSecret: Boolean(clientSecret) };
};
```

数据源采用相同方式剔除 `password` 并生成 `hasPassword`。三类日志列表模型只选择表格需要的服务、环境、
接口、级别/标题和时间字段，不保留 `params`、`userAgent` 或 `stackTrace`；这些内容仅通过详情接口加载。

### 7.3 `row-actions`

组件契约：

```ts
interface RowActionsProps {
  showView?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  disabled?: boolean;
}

const emit = defineEmits<{
  view: [];
  edit: [];
  delete: [];
}>();
```

| 类型 | 名称 | 说明 |
| --- | --- | --- |
| Prop | `showView` | 显示带 `View` 图标的“查看”文本按钮 |
| Prop | `showEdit` | 显示带 `Edit` 图标的“编辑”文本按钮 |
| Prop | `showDelete` | 显示 danger 语义的“删除”文本按钮 |
| Prop | `disabled` | 禁用当前行全部标准操作 |
| 插槽 | `extra` | 标准操作之后的少量页面专属操作；不得传权限配置对象 |
| 事件 | `view/edit/delete` | 只通知页面，不弹确认、不调用 API |

组件使用稳定 inline-flex 和 4px gap，固定按钮尺寸，避免 hover 或 loading 改变操作列宽。操作超过三个时，
页面按业务重要性将低频操作放入 Element Plus Dropdown；组件本身不推断或生成菜单。

### 7.4 `detail-drawer`

```ts
interface DetailDrawerProps {
  modelValue: boolean;
  title: string;
  loading?: boolean;
  size?: string | number;
  destroyOnClose?: boolean;
}
```

| 类型 | 名称 | 说明 |
| --- | --- | --- |
| Prop | `modelValue` | 抽屉可见状态 |
| Prop | `title` | 页面提供的业务标题 |
| Prop | `loading` | 内容区域 loading，不影响关闭按钮 |
| Prop | `size` | 默认 `640px`，CSS 限制最大宽度为视口宽度 |
| Prop | `destroyOnClose` | 默认 true，关闭后销毁详情 DOM |
| 插槽 | `default` | `el-descriptions`、失败状态或长文本内容 |
| 事件 | `update:modelValue`、`close` | 同步可见状态并通知页面清理详情 |

抽屉固定从右侧打开，移动端占满可用宽度。正文可滚动，标题和关闭入口保持可见；组件不提供提交按钮，
不调用详情 API。页面在失败时通过默认插槽渲染 `el-result` 和重试按钮。

### 7.5 `useRemoteDetail`

```ts
export const useRemoteDetail = <T, ID>(loader: (id: ID) => Promise<T>) => {
  const data = ref(null) as Ref<T | null>;
  const loading = ref(false);
  const failed = ref(false);
  let latestRequest = 0;

  const load = async (id: ID) => { /* request token + failure state */ };
  const clear = () => { /* invalidate request + clear state */ };

  return { data, loading, failed, load, clear };
};
```

页面传入的 loader 负责从 Axios 响应中提取实体，例如：

```ts
const detailState = useRemoteDetail<ClientEntity, string>(async id => {
  const response = await getDetail(id);
  return response.data.data;
});
```

`load` 开始时清空旧数据；只有最新请求可以更新 `data`、`failed` 和 `loading`。`clear` 增加请求序号，
从而使已关闭页面的在途响应失效。普通错误继续由 Axios 提示，composable 不重复显示消息。

### 7.6 `notice-editor`

```ts
interface NoticeEditorProps {
  modelValue: string;
  disabled?: boolean;
  rows?: number;
}
```

- 模板直接使用全局 `<avue-ueditor>`，透传 `modelValue`、`disabled` 和 `rows`。
- 只发出 `update:modelValue`，不感知公告表单、权限、API 或上传地址。
- 编辑器容器设置稳定最小高度；弹窗宽度建议 `880px`，移动端最大宽度不超视口。
- 查看模式使用插件的 `disabled` 能力，不另用 `v-html` 渲染公告内容。
- 组件销毁时由插件销毁编辑器实例；`FormDialog` 对公告启用 `destroy-on-close`。
- 如果插件在目标 Vue/Element Plus 版本下出现阻断问题，回滚公告页面，不在本需求中临时引入新编辑器。

### 7.7 页面设计矩阵

#### 标准 CRUD 页面

| 页面 | 搜索字段 | 主要列表列 | 表单/详情特性 | 权限前缀 |
| --- | --- | --- | --- | --- |
| 租户 | 租户 ID、名称、联系人 | 租户 ID、名称、联系人、电话、地址、域名 | 无详情请求；新增/编辑隐藏租户 ID；查看只读显示 | `tenant` |
| 客户端 | 客户端 ID、密钥（密码输入） | 客户端 ID、遮蔽密钥、授权类型、范围、访问令牌秒数 | 640px 表单；隐藏字段在详情中完整回填；数值用 `el-input-number` | `client` |
| 数据源 | 无 | 名称、驱动、用户名、连接地址 | 密码输入；驱动选择；URL/备注占满一行 | `datasource` |
| 通知公告 | 标题、通知类型 | 标题、类型标签、通知日期、内容纯文本摘要 | 880px 富文本表单；详情请求；日期时间控件 | `notice` |

客户端分页响应在进入列表状态前剔除 `clientSecret`，表格根据 `hasClientSecret` 显示固定遮蔽符；查看/编辑
表单使用 `type="password"`。数据源分页响应同样剔除 `password`，密码不进入表格，查看/编辑使用密码输入。
关闭表单时 `form.value = createInitialForm()` 并调用详情状态的 `clear()`，尽快释放页面引用。

#### 报表列表

| 区域 | 设计 |
| --- | --- |
| 搜索 | 文件名输入；查询/重置回第一页 |
| 工具栏 | 批量删除、刷新；不显示新增 |
| 表格 | 选择、序号、文件名、创建时间、更新时间、操作 |
| 文件名 | 可点击预览，使用链接按钮或带明确可点击样式的文本 |
| 行操作 | 设计、预览、删除；不复用 CRUD 查看/编辑语义 |
| 权限 | 不新增按钮权限；保持菜单可访问用户的现有操作可见性，服务端最终校验 |
| 外链 | 结构化 URL、正确编码 `_u=blade-{name}`、新窗口打开 |

#### 日志页面

三页共享布局，但继续各自显式声明列和详情字段，不抽象为 JSON 日志页面生成器。

| 页面 | 列表差异 | 详情长文本 | 权限前缀 |
| --- | --- | --- | --- |
| 通用日志 | 日志级别、日志 ID、请求接口、日志时间 | 用户代理、请求数据 | `log_usual` |
| 接口日志 | 日志名、请求方法、请求接口、日志时间 | 用户代理、请求数据 | `log_api` |
| 错误日志 | 日志名、请求方法、请求接口、日志时间 | 用户代理、请求数据、错误堆栈 | `log_error` |

公共列包括服务 ID、服务 Host、服务 IP 和软件环境。详情主体使用 `el-descriptions`；长文本字段单独占满
抽屉宽度并使用 `.log-detail__pre { white-space: pre-wrap; overflow-wrap: anywhere; max-height: 320px;
overflow: auto; }`。模板使用文本插值，禁止 `v-html`。

### 7.8 权限映射

| 页面 | 新增 | 查看 | 编辑 | 删除 | 后端补充边界 |
| --- | --- | --- | --- | --- | --- |
| 租户 | `tenant_add` | `tenant_view` | `tenant_edit` | `tenant_delete` | 现有后端规则 |
| 客户端 | `client_add` | `client_view` | `client_edit` | `client_delete` | `HAS_ROLE_ADMIN` |
| 数据源 | `datasource_add` | `datasource_view` | `datasource_edit` | `datasource_delete` | `HAS_ROLE_ADMIN` |
| 公告 | `notice_add` | `notice_view` | `notice_edit` | `notice_delete` | 现有后端规则 |
| 通用日志 | 不适用 | `log_usual_view` | 不适用 | 不适用 | `HAS_ROLE_ADMIN` |
| 接口日志 | 不适用 | `log_api_view` | 不适用 | 不适用 | `HAS_ROLE_ADMIN` |
| 错误日志 | 不适用 | `log_error_view` | 不适用 | 不适用 | `HAS_ROLE_ADMIN` |
| 报表 | 不适用 | 当前无按钮权限 | 当前无按钮权限 | 当前无按钮权限 | 保持现有报表服务规则 |

前端权限不是安全边界。特别是客户端、数据源和日志，即使菜单按钮状态异常，后端管理员角色校验仍必须生效。

### 7.9 视觉与响应式

- 搜索、列表、分页和表单继续使用第一阶段 Saber Token，不新增页面主题色。
- `row-actions` 使用 Element Plus link 按钮和官方图标，危险操作使用 danger 语义。
- CRUD 表格操作列固定右侧；日志查看列宽 96px；标准三操作列宽 200px。
- 公告富文本弹窗桌面宽度 880px，客户端/数据源 720px，租户 640px；均受 `calc(100vw - 32px)` 限制。
- 日志抽屉桌面默认 640px，375px 视口使用 100% 可用宽度。
- 1440px 显示完整分页；小于 768px 隐藏总数、页容量和跳转输入。
- 敏感输入禁止使用 `show-password`，避免页面提供无必要的明文切换。
- 内容摘要、URL、用户代理和堆栈必须设置溢出策略，不允许改变表格行高造成布局跳动。

## 8. 数据库、配置与发布影响

| 影响项 | 是否涉及 | 说明 | 关联文档 |
| --- | :---: | --- | --- |
| 新表/改表/约束/索引 | 否 | 前端迁移不改变持久化结构 | 不适用 |
| 数据迁移/回填 | 否 | 无历史数据处理 | 不适用 |
| 环境变量/配置 | 否 | 继续使用现有 API、`website.reportUrl` 和富文本注册 | 不适用 |
| 部署顺序/兼容 | 是 | 按页面子批次发布；Avue 依赖继续保留 | 本文第 10 节 |
| 前端依赖/锁文件 | 否 | 不新增前端依赖，不应修改 `package.json` 或 `pnpm-lock.yaml` | 不适用 |

## 9. 安全、测试与可观测性

### 9.1 认证与安全要求

| 检查项 | 设计 |
| --- | --- |
| 身份认证 | 复用 `@/axios` 的 OAuth Basic、Blade Token 和 401 处理 |
| 角色授权 | 前端按钮权限控制可见性；客户端、数据源、日志后端继续要求管理员 |
| 数据归属 | 不修改租户上下文或归属字段；租户 ID 不由租户表单写入 |
| 输入与 SQL | 前端 `ElForm` 校验；后端继续负责 Bean Validation、业务校验和参数化查询 |
| 客户端密钥 | 搜索及表单使用 password 输入；分页响应进入状态前剔除原值；详情原值只在表单生命周期内保留 |
| 数据源密码 | 分页响应进入状态前剔除原值；表单使用 password 输入；详情原值只在表单生命周期内保留 |
| 日志内容 | 列表状态不保留参数/堆栈；详情使用文本插值/`textContent` 语义，不使用 `v-html`；后端既有敏感词处理继续生效 |
| 公告内容 | 编辑/查看使用既有编辑器；列表摘要通过 DOMParser 的 `textContent` 提取，不执行 HTML |
| 报表外链 | 使用结构化 URL 和 `noopener,noreferrer`，不新增 Token URL 参数 |

### 9.2 测试矩阵

仓库没有单元测试、E2E 或 lint 脚本，本阶段不新增测试基础设施。验证以类型、构建、静态检索和真实浏览器
业务回归组成。

| 场景 | 层级 | 关键断言 | 关联需求 |
| --- | --- | --- | --- |
| 8 页初始加载/空数据/失败 | 浏览器 | loading 结束，总数正确，可重试，无旧数据 | AC-001、AC-004 |
| 查询、重置、分页 | 浏览器/网络 | 参数白名单正确，每次操作一次有效请求 | AC-003、AC-006、AC-020、AC-023 |
| 乱序列表请求 | 浏览器/代码检查 | 旧响应不覆盖新结果 | AC-004 |
| 标准按钮权限 | 不同权限账号 | 无权限入口不可见，后端仍拒绝越权请求 | AC-002 |
| 移动端工具栏和行操作 | 375px 浏览器 | 主操作、行操作可访问，文字和按钮不溢出 | AC-005、AC-034 |
| 租户新增/查看/编辑 | 真实后端 | 租户 ID 不可写，必填和提交正确 | AC-007 |
| 客户端默认值与详情 | 真实后端 | 默认值准确，详情属于目标记录，密钥遮蔽 | AC-008、AC-009、AC-011 |
| 数据源详情与保存 | 真实后端 | 驱动、URL、密码和备注提交不变 | AC-010、AC-011 |
| 删除与选择 | 真实后端 | 成功清选择，失败保留，空选择不请求 | AC-012、AC-017、AC-021、AC-022 |
| 公告字典 | 浏览器/网络 | `notice` 数字值选项、标签和提交一致 | AC-013 |
| 公告富文本 | 真实后端 | 格式保存、再次查看一致；校验阻止无效提交；失败保留输入 | AC-014、AC-015、AC-016 |
| 报表设计/预览 | 真实报表服务 | URL 标识正确、名称编码正确、列表状态不变 | AC-018、AC-019 |
| 日志权限和详情 | 不同权限账号/真实后端 | 无权限无入口，后端拒绝越权，详情字段完整 | AC-024、AC-025 |
| 日志长文本和竞态 | 浏览器 | 纯文本、可滚动、不撑破、不显示旧记录，关闭后状态清理 | AC-026、AC-027、AC-028 |
| 原菜单与路由 | 浏览器 | 8 个页面仍通过原菜单和动态路由进入 | AC-029 |
| 静态 Avue 门禁 | 静态检索 | 8 页无 `avue-crud`/`avue-form`；公告只在适配组件使用 ueditor | AC-030 |
| 第一阶段回归 | 浏览器 | 参数、岗位核心流程和布局不回退 | AC-031 |
| 未迁移页回归 | 浏览器 | 至少一个 Avue CRUD 页查询、表格、弹窗正常 | AC-032 |
| 单页回滚演练 | Git/浏览器 | 单个目标页面可恢复原实现，无数据恢复且其他页面不受影响 | AC-033 |
| 多视口/主题 | 截图评审 | 1440/1024/375、浅色/深色无重叠溢出 | AC-034、AC-035 |
| 工程门禁 | 命令 | `pnpm run type-check`、Node 22 `pnpm run build:prod` 通过；后端在 JDK 21 下完成 `blade-desk` 测试 | AC-036、AC-037 |
| 依赖门禁 | 静态/锁文件 | 无新前端运行时依赖和 Ant Design 引用；后端仅增加公告 HTML 安全依赖 | AC-038 |

### 9.3 日志、指标与性能

- 本阶段不新增前端埋点、后端日志、指标或告警。
- 控制台禁止记录请求体、客户端密钥、数据源密码、Token、公告 HTML、日志参数和错误堆栈。
- 列表与详情请求数量应与用户动作一一对应；浏览器网络面板用于发现重复请求。
- 长文本只在打开详情时渲染，列表不展开完整堆栈或富文本，避免不必要 DOM 和布局开销。
- 报表新窗口打开不轮询或预加载外部页面。

### 9.4 第二阶段实施结果

| 设计项 | 实施结果 | 当前验证状态 |
| --- | --- | --- |
| 通用组件 | 已新增 `row-actions` 和 `detail-drawer`；`form-dialog` 使用 Teleport 可达的全局类约束视口高度，固定 header/footer 并滚动 body | 类型检查通过；首次验证码登录未成功，375px 公告弹窗和竞态失败待人工登录后补测 |
| 详情状态 | 已新增 `useRemoteDetail`，实现加载前清空、请求序号、防旧响应覆盖、失败状态和关闭失效 | 正常详情和部分失败恢复已验证；Slow 3G、关闭在途请求待可用数据/工具后补测 |
| 租户、客户端、数据源 | 已迁移为第一阶段页面骨架、显式表格与 Element Plus 表单；客户端密钥和数据源密码在列表转换时剔除；Axios 不再把空 HTTP 500 当成功 | 租户和客户端核心管理员流程通过；应用删除失败选择保留待回归，数据源列表接口 404 |
| 通知公告 | 已新增业务级 `notice-editor`；后端增加 OWASP HTML 白名单并为公告写接口跳过原始 JSON XSS 过滤；列表继续生成纯文本摘要 | 清洗器格式保留、危险内容移除、标题纯文本化 3 条独立单测通过；本机仅 JDK 17，完整 Java 21 模块测试和真实环境往返待补 |
| 报表列表 | 已使用 `URL`/`URLSearchParams` 生成设计与预览地址，保留查询、刷新和删除 | 空选择删除和 URL 静态核对通过；列表接口 404，真实服务和弹窗行为待验收 |
| 三类日志 | 已使用显式列表模型剔除长文本，详情通过统一抽屉和纯文本 `<pre>` 展示 | 错误详情、只读性、长文本和滚动通过；日志数据、权限和并发切换待补测 |
| API 与依赖 | 前端 API 路径、方法、认证和锁文件保持不变；后端仅增加公告 HTML 安全依赖和 Nacos 跳过配置 | TypeScript 通过；Node 22 生产构建成功，Node 24 仍有原生进程限制；后端 JDK 21 验证待补 |
| 静态迁移门禁 | 8 个目标页已移除 `avue-crud` 和 `avue-form`，仅公告适配组件使用 `avue-ueditor`；Avue 恢复内置国际化 | 静态检索通过；字典页 warning 修复待浏览器回归 |

本轮首轮测试基线为 48 条用例中 24 条通过、4 条失败、20 条阻塞。`DEF-001` 至 `DEF-005` 已完成代码修复，
Node 22 生产构建已通过并关闭 `ENV-004`，当前记录调整为 25 条通过、4 条待回归失败、19 条环境阻塞。数据源/报表
接口、受限账号、日志数据、缺陷业务回归和后端 JDK 21 验证仍未闭环，设计状态保持“已实现，部分验证，待验收”，
不得标记为“已验收”。

## 10. 发布与回滚

### 10.1 迁移与发布

建议按以下子批次执行，每个子批次均完成类型、构建和目标页面浏览器验证：

1. 新增 `row-actions`、`detail-drawer` 和 `useRemoteDetail`，以独立示例状态验证契约。
2. 迁移三类日志页面，先验证只读详情、长文本和查看权限。
3. 迁移租户页面，验证标准 CRUD 与行操作。
4. 迁移客户端和数据源页面，验证详情竞态和敏感字段生命周期。
5. 新增 `notice-editor` 并迁移公告页面，验证数字字典和富文本往返。
6. 迁移报表列表，验证结构化外链和删除流程。
7. 执行参数、岗位和代表性未迁移 Avue 页面回归。
8. 完成 8 页静态门禁、多视口/主题截图和正式业务验收后更新需求与设计状态。

页面迁移使用原文件和原路由，不并行保留第二个生产入口。每页应独立提交或保持可单独回滚的变更边界。

### 10.2 回滚与恢复

- 触发条件：核心 CRUD 回归、敏感字段错误提交、公告格式丢失、报表地址错误、日志详情错配、权限/租户错误、
  第一阶段或未迁移页面回归、生产构建失败。
- 代码回滚：按目标页面和其新增组件/composable 回滚；共享组件若已被后续页面使用，先回滚使用方。
- 配置回滚：公告后端代码回滚时同步移除 Nacos XSS 的三个 `/notice/*` 跳过项；禁止只回滚清洗器而保留跳过配置。
- 数据库 downgrade：不适用，无数据库变化。
- 不可逆数据变化：前端迁移本身无；业务写操作仍由现有后端事务处理。
- 公告专项：若富文本适配阻断，只回滚公告页面，其他第二阶段页面可继续发布。
- 回滚验证：原菜单恢复 Avue 页面行为，类型检查和构建通过，已发布的其他页面无回归。

## 11. 风险、评审与变更

### 11.1 风险与开放问题

| 编号 | 类型 | 内容 | 负责人 | 状态/结论 |
| --- | --- | --- | --- | --- |
| ITEM-001 | 依赖 | 第一阶段仍有写操作、权限差异和 Avue 冒烟待正式验收 | 技术/测试负责人 | 第二阶段验收前关闭，不阻塞设计草稿 |
| ITEM-002 | 风险 | 既有富文本插件基于 WangEditor，仍是 Avue 过渡依赖 | 前端负责人 | 已设计业务适配隔离；移除依赖留待后续专项 |
| ITEM-003 | 风险 | 客户端列表/详情返回原始密钥，且既有 GET 查询条件可能进入服务端访问日志 | 安全/后端负责人 | 列表状态剔除原值，详情遮蔽且不持久化；废弃密钥查询需另立兼容变更 |
| ITEM-004 | 风险 | 数据源详情返回原始密码，误用占位掩码可能覆盖真实值 | 前端负责人 | 模型保留原值、输入仅视觉遮蔽，不把掩码写入模型 |
| ITEM-005 | 问题 | 报表菜单没有设计、预览、删除按钮权限码 | 产品/后端负责人 | 第二阶段保持现状，不新增虚构权限；权限增强另立需求 |
| ITEM-006 | 风险 | 日志可能包含超长或仍未覆盖的敏感内容 | 安全/后端负责人 | 前端纯文本与滚动；内容脱敏继续由后端负责 |
| ITEM-007 | 风险 | `FormDialog` 当前没有内建详情失败插槽契约 | 前端负责人 | 页面默认插槽渲染 `el-result`；不扩大 FormDialog API |
| ITEM-008 | 风险 | 8 页跨模块且无自动化测试 | 测试负责人 | 分子批次发布，保留真实环境验收证据 |
| ITEM-009 | 问题 | 日志后端当前显式按 `create_time` 升序，是否符合运维期望 | 产品/后端负责人 | 本需求保持现有排序；如需倒序单独变更契约 |
| ITEM-010 | 安全 | 公告写接口跳过通用 XSS 后必须由字段级白名单过滤兜底，配置和代码不能拆分发布 | 后端/运维负责人 | 已实现 OWASP 白名单与单元测试；待 JDK 21 和真实环境回归 |

### 11.2 评审结论

| 领域 | 结论 | 评审人 | 日期 | 备注 |
| --- | --- | --- | --- | --- |
| 后端/API | 待评审 | 待定 | 待定 | 确认敏感字段、报表和日志现有契约 |
| 前端 | 待评审 | 待定 | 待定 | 重点评审新组件、富文本隔离和页面子批次 |
| 安全 | 待评审 | 待定 | 待定 | 重点评审密钥、密码、日志和外链处理 |
| 数据库/发布 | 不涉及数据库，发布待评审 | 待定 | 待定 | 逐页迁移和回滚 |
| 测试 | 待评审 | 待定 | 待定 | 需要真实后端、报表服务和不同权限账号 |

### 11.3 变更记录

| 日期 | 版本 | 变更内容 | 原因 | 影响 | 修改人 |
| --- | --- | --- | --- | --- | --- |
| 2026-09-01 | 0.1 | 初稿 | 启动 Element Plus 迁移第二阶段详细设计 | 新增组件、状态、8 个页面、测试与发布方案 | Codex |
| 2026-09-01 | 0.2 | 同步第二阶段代码实现和验证限制 | 共享能力与 8 个目标页面已落地，按指令暂不测试 | 实施结果、文档状态、待验证矩阵和变更记录 | Codex |
| 2026-09-01 | 0.3 | 关联可执行手工测试文档 | 第二阶段进入人工验证阶段 | 关联文档、验收证据入口和变更记录 | Codex |
| 2026-09-01 | 0.4 | 同步首轮手工测试结果和工程门禁状态 | 已完成 48 条用例首轮执行 | 实施结果、遗留缺陷、环境阻塞和补测要求 | Codex |
| 2026-09-01 | 0.5 | 同步首轮缺陷修复设计与验证证据 | 修复公告 XSS/JSON 冲突、HTTP 错误、移动端弹窗和 Avue 国际化 | 后端安全链路、共享前端能力、依赖、配置、回滚和待回归项 | Codex |
