# Saber Element Plus 第三阶段树表与复杂页面迁移详细设计文档

## 1. 文档信息

| 项目 | 内容 |
| --- | --- |
| 功能/模块 | Element Plus 树表、授权、用户管理与代码生成页面迁移 |
| 设计编号 | DESIGN-REQ-2026-003 |
| 设计版本 | 0.8 |
| 关联需求 | [需求索引](../requirements-index.md)；[REQ-2026-003 第三阶段树表与复杂页面迁移](../requirements/REQ-2026-003-element-plus-migration-phase-3.md)；[TEST-REQ-2026-003 测试文档](../test/TEST-REQ-2026-003-element-plus-migration-phase-3.md)；前置设计 [DESIGN-REQ-2026-001](DESIGN-REQ-2026-001-element-plus-migration.md)、[DESIGN-REQ-2026-002](DESIGN-REQ-2026-002-element-plus-migration-phase-2.md) |
| 目标版本/迭代 | Saber 5.x / Element Plus 页面迁移第三阶段 |
| 文档状态 | 已实现，部分验证，待验收 |
| 设计负责人 | 待定 |
| 评审人 | 前端、后端、安全、测试、运维按需填写 |
| 最后更新日期 | 2026-09-03 |

## 2. 设计摘要与范围

### 2.1 设计摘要

第三阶段继续使用前两阶段已经实现的 `SearchPanel + ListPanel + el-table + FormDialog` 页面骨架。
顶部菜单、用户和代码生成继续复用 `usePagedList` 与 `ListPagination`；字典、部门、菜单和角色的后端
`/list` 返回完整树形数组，不使用分页，因此新增 `useTreeList` 管理树查询、请求竞态、失败和展开键。

角色的菜单/数据/API 三类授权、顶部菜单配置和用户角色配置具有相同的树勾选交互。本阶段新增
`tree-check-panel`，以 `v-model` 管理已选键和联动状态，组件内部统一全选、反选、半选保留与
Element Plus `ElTree` 同步。菜单与顶部菜单当前依赖 Avue 图标字段，因此新增 `icon-select`，直接读取
现有 `iconList` 并保存原始 class 字符串，不改变历史菜单数据。

用户导入使用页面内原生 `el-upload` 和自定义 `http-request`，通过 `@/axios` 提交 `FormData`；不建设
通用上传框架。用户导出和模板下载改为 Axios Blob 请求，继续使用拦截器注入的标准认证头，不再把 Token
拼进 URL；新增最小 `downloadBlob` 工具处理文件名、对象 URL 和 Blob 形式错误响应。该认证兼容调整必须
在安全评审通过后实施。

后端、数据库和现有业务接口均不修改。用户导入当前按最多 3000 行分批落库且没有跨批次整体事务，代码生成
逐配置写服务端目录；两者都可能在失败前产生部分副作用。前端通过确认、单次提交锁和准确反馈降低风险，但
不声明能够回滚后端数据或文件。

### 2.2 关键决策

| 编号 | 决策 | 原因 | 影响 |
| --- | --- | --- | --- |
| DEC-001 | 完整复用前两阶段列表、分页、选择、详情、权限、远程选项和表单能力 | 已有契约覆盖大部分状态且已被多页使用 | 第三阶段只补树表、授权树、图标和下载缺口 |
| DEC-002 | 为非分页树列表新增 `useTreeList`，不把树结果适配成分页结果 | 字典、部门、菜单、角色后端直接返回 `List` | 避免伪造 total、前端截断和双重加载 |
| DEC-003 | 新增受控 `tree-check-panel`，不新增授权业务引擎 | 5 处授权树交互完全重复，且状态串用风险高 | 页面仍负责加载和提交，组件只负责勾选 UI |
| DEC-004 | `tree-check-panel` 用 `modelValue` 保存 checked keys，切换联动时把 checked 与 half-checked 合并后重放 | Element Plus 的 `check-strictly` 切换会改变父子计算 | 保持当前页面的节点联动和半选语义 |
| DEC-005 | 新增 `icon-select` 并原样保存 `iconList` class 字符串 | Element Plus 没有等价图标选择器，历史数据依赖 iconfont class | 不新增图标依赖，不转换历史值 |
| DEC-006 | 新增子项使用显式 `parentContext`，普通新增重置上下文 | 当前 Avue 通过动态修改列配置锁定父级，容易残留禁用状态 | 父级预填/禁用由页面状态决定，不再修改共享配置 |
| DEC-007 | 授权弹窗使用组合 loader 一次返回“树数据 + 已选键”，完整成功后再渲染 | 嵌套请求可能显示半完成授权，快速切换可能串用 | 复用 `useRemoteDetail` 的请求序号和失败状态 |
| DEC-008 | 顶部菜单排序使用单向 `model-value`，成功后刷新，失败时列表行从未被乐观修改 | 直接 `v-model="row.sort"` 会在失败时留下虚假值 | 每行更新串行，省去复杂回滚快照 |
| DEC-009 | 用户租户联动由显式 change 处理，不用对表单 tenantId 的无条件 watch | 详情回填和用户主动切换需要不同的清理语义 | 主动切换清空旧选择，详情初始化保留并校验原值 |
| DEC-010 | 批量用户角色配置仅允许同一租户的用户，批量模式不预填并明确覆盖 | 不同租户的角色树无法用一个勾选集合正确表达 | 防止跨租户混合选择和隐式覆盖 |
| DEC-011 | 用户上传使用页面内 `el-upload + FormData`，不实现 `blade-upload` | 本阶段只有一个 Excel 导入场景，现有 Element Plus 已满足 | 降低通用组件和认证配置维护成本 |
| DEC-012 | 用户下载使用 Axios Blob 和标准认证头，导出参数取最后一次已执行查询的 5 个白名单字段 | 避免 Token 出现在 URL，并使导出范围与列表一致 | 需要安全/兼容评审；不修改后端接口 |
| DEC-013 | 代码生成固定 `system=saber3`，提交前显示选择数量和不可撤销说明 | 后端会直接写配置目录且没有文件事务 | 失败不显示成功，提示人工核对目标目录 |
| DEC-014 | 页面实体、查询和表单类型保持局部；仅共享树键、节点和工具契约 | 避免跨模块巨型实体层和类型漂移 | API 参数补最小类型，不使用显式 `any` |
| DEC-015 | 按层级基础、菜单、角色、顶部菜单、用户、代码生成分批实现 | 后续页面依赖前面树和选项能力，风险性质不同 | 每批独立验证、发布和回滚 |

### 2.3 改动范围

| 层级 | 改动内容 | 不涉及内容 |
| --- | --- | --- |
| 后端 | 无代码改动；核对现有 Controller、Service、租户和文件副作用 | Controller、Service、实体、权限注解、导入事务、代码生成器 |
| 前端组件 | 新增 `tree-check-panel`、`icon-select` | 通用 CRUD 引擎、树表封装、通用上传框架 |
| 前端状态 | 新增 `useTreeList`；复用 `usePagedList`、`useRemoteDetail`、`useRemoteOptions`、`useTableSelection`、`useCrudPermission` | Vuex 重构、全局页面缓存 |
| 前端工具 | 新增 `downloadBlob` | 修改 Axios 拦截器、Token 存储和认证头名称 |
| 前端 API | 补目标接口包装和最小参数类型；新增用户导入/导出/模板下载函数 | 新后端路径、重复 Axios 实例 |
| 前端页面 | 迁移 dict、dept、menu、role、topmenu、user、code 7 页 | datascope、apiscope、region、util 页面 |
| 数据库 | 无 | 表、字段、索引、数据迁移 |
| 配置/部署 | 不新增配置和依赖；代码生成验收使用已有可控目录 | 环境变量、锁文件、生成模板和目录语义 |

## 3. 总体设计

### 3.1 架构图

~~~mermaid
flowchart TB
    subgraph Pages[第三阶段页面]
        TreePages[字典/部门/菜单/角色]
        TopMenu[顶部菜单]
        User[用户管理]
        Code[代码生成]
    end

    TreePages --> Search[SearchPanel]
    TreePages --> TreeState[useTreeList]
    TreePages --> TreeTable[ListPanel + 页面 el-table]
    TreePages --> Form[FormDialog + 页面 el-form]

    TopMenu --> Paged[usePagedList + ListPagination]
    User --> Paged
    Code --> Paged

    TreePages --> Selection[useTableSelection]
    TopMenu --> Selection
    User --> Selection
    Code --> Selection

    TreePages --> Detail[useRemoteDetail]
    TopMenu --> Detail
    User --> Detail
    Code --> Detail

    TreePages --> Options[useRemoteOptions]
    User --> Options
    Code --> Dict[useDictionary/DictSelect]

    TreePages --> Icon[IconSelect]
    TopMenu --> Icon
    TreePages --> Grant[TreeCheckPanel]
    TopMenu --> Grant
    User --> Grant

    User --> Upload[ElUpload + FormData]
    User --> Download[downloadBlob]

    Pages --> API[现有模块 API 包装]
    Upload --> API
    Download --> API
    API --> Axios[现有 @/axios]
    Axios --> Backend[SpringBlade 现有服务]
    Code --> Files[(服务端生成目录)]
~~~

业务页面负责字段、权限、接口调用、实体转换和专项确认；通用组件只负责显示与标准事件；composable 只管理
可复用异步状态。`tree-check-panel`、`icon-select`、`useTreeList` 和 `downloadBlob` 不得导入具体页面、模块
API、Vuex 权限码或业务实体。

### 3.2 组件职责

| 组件/模块 | 职责 | 输入 | 输出 |
| --- | --- | --- | --- |
| `search-panel` | 查询字段布局和查询/重置反馈 | 查询模型、loading、字段插槽 | `search`、`reset` |
| `list-panel` | 标题、主操作、工具、树表/普通表格容器 | 标题和区域插槽 | 页面原生事件 |
| `list-pagination` | 3 个分页页面的分页交互 | current、size、total、disabled | 单次 `change` |
| `form-dialog` | 7 个页面的 CRUD 表单容器 | mode、loading、submitting、表单插槽 | `confirm`、`cancel` |
| `row-actions` | 查看、编辑、删除标准行操作 | 权限显示和 disabled | 标准操作事件 |
| `icon-select` | 搜索、预览和选择现有 iconfont class | 当前值、禁用、占位 | `update:modelValue` |
| `tree-check-panel` | 授权树、联动、全选、反选和勾选同步 | 树数据、checked keys、linked、loading、disabled | keys/linked 更新 |
| `useTreeList` | 非分页树查询、失败、竞态和展开键 | fetcher、响应转换、初始查询、主键读取 | data/query/loading/failed/expandedKeys 及操作 |
| `usePagedList` | 分页列表、查询和请求竞态 | fetcher 与分页响应转换 | data/query/page/loading 及操作 |
| `useRemoteDetail` | 详情或组合授权加载、失败和竞态 | loader、目标 ID | data/loading/failed/load/clear |
| `useRemoteOptions` | 父级、租户、部门、角色、岗位、数据源选项 | loader 和参数 | options/loading/load/clear |
| `useTableSelection` | 选中行和 ID 集合 | 行和主键读取 | rows/ids/clear |
| `useCrudPermission` | 标准 CRUD 按钮权限 | 模块前缀 | add/view/edit/delete |
| `downloadBlob` | 校验 Blob、解析文件名并触发浏览器下载 | Axios Blob 响应、后备文件名 | 下载完成或可显示错误 |

### 3.3 新增依赖

不新增依赖。`package.json` 与 `pnpm-lock.yaml` 不应因第三阶段发生变化。

- 树表、树选择、上传、Tab、Dialog、InputNumber 和 loading 使用已安装 Element Plus。
- 操作图标使用已安装 `@element-plus/icons-vue`；业务菜单图标继续使用 `src/config/iconList.ts`。
- 文件请求使用现有 Axios；不引入文件下载、上传或状态管理库。
- 不引入 Ant Design Vue、其他表格框架或图标库。

## 4. 核心流程设计

### 4.1 非分页树列表流程

~~~mermaid
sequenceDiagram
    actor User as 用户
    participant Page as 树页面
    participant Tree as useTreeList
    participant API as 模块 list API
    participant Table as ElTable

    User->>Page: 进入/查询/重置/刷新
    Page->>Tree: load/search/reset/refresh
    Tree->>Tree: requestId + 1, loading=true
    alt 查询或重置
        Tree->>Tree: 清空旧查询结果
    end
    Tree->>API: GET /list + 查询白名单
    alt 最新请求成功
        API-->>Tree: BladeResponse<TreeNode[]>
        Tree->>Tree: data=nodes, failed=false
        Tree->>Tree: 修剪不存在的 expanded keys
        Tree-->>Table: 树数据和展开键
    else 最新请求失败
        API-->>Tree: reject
        Tree->>Tree: failed=true, loading=false
    else 旧请求后返回
        API-->>Tree: stale nodes
        Tree->>Tree: 丢弃结果
    end
~~~

`search` 和 `reset` 在发请求前清空旧数据，避免把上一次条件结果误认为当前结果；相同查询下的 `refresh`
保留当前树直到新请求成功。列表成功后页面清空表格选择，展开键只保留新树仍存在的节点。树表不渲染
`ListPagination`，也不向后端传递无意义的 current、size。

### 4.2 CRUD、详情与新增子项流程

1. 普通新增调用 `prepareDialog('add')`，重置 form、详情、校验和 `parentContext`。
2. 行“新增子项”先设置 `{ parentId, inheritedCode? }`，再创建初始表单；父级字段在该次新增中禁用。
3. 查看/编辑先打开带 loading 的 `FormDialog`，通过 `useRemoteDetail.load(id)` 获取目标详情。
4. 详情成功后复制成表单模型；失败显示 `ElResult` 和重试，不开放编辑提交。
5. 父级选项通过 `useRemoteOptions` 独立加载；编辑时禁用当前节点及其后代，防止形成循环。
6. 提交前复制 form，再执行数组连接、数值归一化或只读字段剔除；不直接修改绑定模型。
7. 保存成功关闭、清选择并刷新列表和父级树；失败保留表单和 `parentContext`。
8. 关闭弹窗调用 `detail.clear()`、清校验和 parentContext，使在途详情失效。

字典子项额外继承并锁定 `code`；部门和菜单只锁定 `parentId`。树表批量选择仍按用户显式勾选的行生成
ID，不因选中父节点自动追加后代，最终删除约束由现有后端负责。

### 4.3 授权树流程

~~~mermaid
sequenceDiagram
    actor User as 用户
    participant Page as 角色/顶部菜单/用户页
    participant State as useRemoteDetail
    participant TreeAPI as 树接口
    participant KeysAPI as 已选键接口/行数据
    participant Panel as TreeCheckPanel
    participant GrantAPI as grant API

    User->>Page: 选择目标并打开授权
    Page->>Page: 校验数量、权限和租户
    Page->>State: clear(), load(targetId)
    par 加载可授权树
        State->>TreeAPI: grantTree/getRoleTree
    and 加载当前已选键
        State->>KeysAPI: roleTreeKeys/topTreeKeys/行 roleId
    end
    TreeAPI-->>State: tree data
    KeysAPI-->>State: checked keys
    State-->>Page: 完整授权模型
    Page->>Panel: data + v-model:keys + v-model:linked
    User->>Panel: 勾选/联动/全选/反选
    Panel-->>Page: checked keys 更新
    User->>Page: 确定
    Page->>GrantAPI: target ids + checked keys
    alt 成功
        GrantAPI-->>Page: success
        Page->>Page: 关闭、清理并刷新
    else 失败
        GrantAPI-->>Page: reject
        Page->>Page: 保留弹窗和 keys，恢复提交
    end
~~~

角色页面为菜单、数据、API 三类授权分别创建独立 `keys`、`linked` 和 `tree data`，不得使用按字符串名称查找
组件引用。`tree-check-panel` 在收到新 data 或 keys 后通过 `ElTree.setCheckedKeys` 同步；同步期间使用内部标记
阻止事件回写。切换联动前读取 checked 与 half-checked，切换完成后合并去重并重新设置，提交仍只使用
`getCheckedKeys` 对应的受控 keys。

### 4.4 用户租户联动与文件流程

#### 租户联动

1. 新增表单打开时先加载租户选项；租户模式关闭时以当前登录上下文加载部门、角色和岗位。
2. 用户主动切换租户时立即清空 `deptId`、`roleId`、`postId` 和三类旧选项。
3. 三个 `useRemoteOptions` 分别用 tenantId 加载部门树、角色树和岗位列表；各自请求序号丢弃旧租户响应。
4. 任一必需选项失败时表单保持打开但禁止提交，并在对应字段提供重试。
5. 编辑/查看先加载详情，随后用详情 tenantId 加载选项，最后回填逗号 ID 数组；不触发“主动切换”清空逻辑。
6. 提交前验证当前已选 ID 均存在于当前租户选项，再把数组副本连接为逗号字符串。

#### 导入

1. 导入弹窗使用 `el-upload`，`accept=".xls,.xlsx"`、`limit=1`、`auto-upload=false`。
2. 确认时验证 `UploadUserFile.raw` 存在，并以不区分大小写的扩展名再次校验；不依赖不稳定的 MIME。
3. API 函数创建 `FormData`，字段名固定为 `file`；不手工设置 `Content-Type`，由浏览器添加 multipart boundary。
4. 请求通过 `@/axios`，沿用 Basic、Blade Token、NProgress、401 和统一错误处理；不使用独立 upload action。
5. 上传中锁定关闭和重复提交；成功关闭、清文件并刷新用户列表；失败保留文件和弹窗。
6. 不传没有实际业务效果的 `isCovered`，也不在前端声称支持覆盖模式。

#### 导出与模板下载

1. 导出取 `usePagedList.query.value`，即最后一次已执行的账号、姓名、昵称、手机、邮箱白名单，不读取未提交搜索草稿。
2. `exportUsers(query)` 与 `downloadUserTemplate()` 设置 `responseType: 'blob'`，认证由 Axios 请求头注入。
3. `downloadBlob` 优先解析 `filename*=UTF-8''...`，其次解析 `filename=...`，最后使用固定中文 `.xlsx` 后备名。
4. 若响应 content-type 为 JSON，工具先把 Blob 转文本并提取 `msg`，抛出可显示错误，不创建下载。
5. Excel Blob 使用 `URL.createObjectURL` 和临时 `<a download>` 触发，点击后移除节点并 revoke URL。
6. 下载中仅锁定对应操作，不改变分页、查询和选择；浏览器失败不显示成功。

### 4.5 顶部菜单排序与代码生成流程

#### 顶部菜单排序

- `el-input-number` 使用 `:model-value="row.sort"` 和 `@change`，不直接修改列表实体。
- 页面维护单个 `sortingId`；同一行或其他行提交期间禁用排序控件，避免交叉更新。
- 调用 `update({ ...row, sort: nextSort })`，成功后刷新；失败时原行仍显示上次服务端值。
- nextSort 为空、与原值相同或超出当前 `1..100` 范围时不发请求。

#### 代码生成

1. 页面从 `useTableSelection` 取得 selectedIds，空选择直接提示。
2. 确认框展示“将生成 N 个模块，文件会写入配置的服务端目录且无法由前端撤销”。
3. `generating` 为 true 时禁用新增、删除、复制、分页和再次生成，避免状态竞争。
4. 请求固定传 `ids=逗号字符串`、`system=saber3`。
5. 只有 Blade 成功响应才刷新列表、清选择并显示成功。
6. 失败或网络中断保留选择并提示检查配置目录；再次操作必须重新确认。

### 4.6 异常与边界流程

| 场景 | 处理位置 | 处理方式 | HTTP/错误码 | 数据是否改变 |
| --- | --- | --- | --- | :---: |
| 未登录/登录失效 | `axios.ts` | 沿用 `FedLogOut` 与登录跳转 | 401 | 否 |
| 树列表失败 | `useTreeList` | 当前查询标记 failed，结束 loading；查询切换不显示旧结果 | Blade 非 200/网络异常 | 否 |
| 父级/租户选项失败 | `useRemoteOptions` + 页面 | 清空旧选项，禁用依赖字段提交，提供重试 | Blade 非 200/网络异常 | 否 |
| 详情失败 | `useRemoteDetail` + FormDialog | data 为空，显示失败和重试，不提交旧值 | Blade 非 200/网络异常 | 否 |
| 授权组合加载失败 | 授权页面 | 任一请求失败即不渲染可提交授权，清空旧状态 | Blade 非 200/网络异常 | 否 |
| 授权提交失败 | 授权页面 | 保留 checked keys，恢复确认按钮 | Blade 非 200/网络异常 | 由后端事务决定 |
| 表单校验失败 | 页面 ElForm | 定位字段，不发请求 | 不发请求 | 否 |
| 删除取消/失败 | 页面 | 取消不提示接口错误；失败保留选择 | 不发请求/接口异常 | 否或由后端决定 |
| 顶部菜单排序失败 | topmenu 页面 | 列表值未乐观修改，恢复操作后可重试 | Blade 非 200/网络异常 | 由后端决定 |
| 跨租户批量角色配置 | user 页面 | 检测多个 tenantId 并阻止打开授权 | 不发请求 | 否 |
| Excel 类型错误 | user 页面 | 扩展名校验失败，不提交 FormData | 不发请求 | 否 |
| Excel 导入中途失败 | 后端现有实现 | 前端显示实际响应；不承诺已回滚，提示核对列表 | Blade 异常或现有成功响应 | 可能部分改变 |
| Blob 错误响应 | downloadBlob | 解析 JSON Blob 并提示，不创建文件 | Blade 非 200 包装 Blob | 否 |
| 代码生成失败/断连 | code 页面 | 不显示成功，保留选择，提示检查目录 | Blade 异常/网络异常 | 可能部分写文件 |

### 4.7 事务、并发与幂等

| 操作 | 事务边界 | 并发控制 | 幂等策略 |
| --- | --- | --- | --- |
| 树/分页/详情/选项查询 | 不适用 | composable 请求序号丢弃旧响应 | GET 只读 |
| CRUD 保存和删除 | 现有后端事务 | submitting、确认框和页面锁 | 沿用现有接口，不新增幂等键 |
| 角色/顶部菜单/用户授权 | 现有后端 Service | 授权提交锁；完整状态加载后才提交 | 重复提交会覆盖为同一集合，但前端仍阻止重复 |
| 顶部菜单排序 | 单次 `/submit` | 全页单个 sortingId 串行 | 相同 sort 不发请求 |
| 用户导入 | 后端按最多 3000 行分批调用，非整体事务 | 前端单文件、单次提交锁 | 非幂等；重复导入可能重复或冲突 |
| 用户导出/模板 | 不适用 | 独立 downloading 锁 | GET 只读 |
| 代码复制 | 单次后端 save | copyingId 阻止同一行重复点击 | 非幂等，每次会新增记录 |
| 代码生成 | 每个配置独立执行文件写入，无整体文件事务 | generating 全页锁 | 非幂等，重复执行可能覆盖文件 |

## 5. 后端设计

### 5.1 路由、模型与服务

后端无代码改动。本设计已对照当前 SpringBlade 源码确认：

- `DictController`、`DeptController`、`MenuController`、`RoleController`、`TopMenuController`、
  `UserController` 和 `CodeController` 继续提供现有列表、详情、提交、删除和专项接口。
- 字典、部门、菜单、角色 `/list` 返回完整 `List`；顶部菜单、用户和代码 `/list` 返回 `IPage`。
- 部门、角色、用户 Service 继续执行现有租户限制和 `TenantGuard` 校验，前端 tenantId 不是安全边界。
- 角色 grant 同时接收 roleIds、menuIds、dataScopeIds、apiScopeIds；顶部菜单 grant 接收 topMenuIds、menuIds。
- 用户新增使用 `/submit`，编辑必须继续使用专用 `/update`，不得机械合并。
- 用户导入监听器每 3000 行调用一次 `userService.importUser`，没有覆盖模式实现，也没有跨批次事务。
- 代码生成按配置逐个创建 `BladeCodeGenerator` 并直接写 `apiPath`、`webPath` 指向的目录。

### 5.2 认证与数据归属

| 模块 | 后端访问边界 | 前端入口 | 归属与特殊规则 |
| --- | --- | --- | --- |
| 字典 | CRUD/树由管理员权限保护；dictionary 为通用字典读取 | `dict_*`，子项沿用 admin 标识 | 平台级 |
| 部门 | Controller 管理员保护 | `dept_*`，子项沿用 admin 标识 | 租户级，Service 使用登录上下文 |
| 菜单 | CRUD 管理员保护；路由/按钮为登录业务接口 | `menu_*`，子项沿用 admin 标识 | 平台级权限资源 |
| 角色 | Controller 管理员保护 | `role_*`；权限设置沿用页面管理员入口 | 租户级，角色树和授权受后端限制 |
| 顶部菜单 | Controller 管理员保护 | `topmenu_*`、`topmenu_setting` | 平台级，grant 后清理菜单缓存 |
| 用户 | 管理接口逐项管理员保护 | `user_*`、`user_reset`、admin 专项入口 | 租户级，授权/导入/导出有后端限制 |
| 代码 | Controller 管理员保护 | `code_*`；复制沿用 edit，生成沿用当前入口 | 开发工具资源和服务端目录 |

所有请求继续经过 `@/axios`，由现有拦截器设置 OAuth Basic、`website.Authorization` 对应 Blade Token、
Cookie、NProgress 和 401 退出。页面不读取或重建认证头。下载从 URL Token 改为同一拦截器请求头是前端传递
方式收敛，不改变 Token 值、Cookie Key、后端注解或网关契约，实施前仍需安全/兼容评审。

### 5.3 查询、导入与文件副作用

- 字典、部门、菜单、角色查询由后端实体 QueryWrapper 和现有 Service 生成树结构；页面不再传分页参数。
- 用户列表和导出均可通过 `Map<String, Object>` 转换为 `User` QueryWrapper；本设计白名单为 `account`、
  `realName`、`name`、`phone`、`email`，不透传表单或任意对象字段。
- 用户导入只验证文件名扩展名，`isCovered` 当前没有被 Controller 或 Service 使用；前端不展示虚假覆盖能力。
- `UserController` 当前捕获 `IOException` 后仍可能返回成功，且 listener 分批落库。若验收需要准确失败和全量回滚，
  必须另立后端修复；本前端设计无法补足。
- 代码生成没有 dry-run、文件事务或冲突响应模型。验收必须使用可恢复目录，前端只解释明确 Blade 成功/失败。

## 6. API 契约

### 6.1 层级与授权接口

| 方法 | 路径 | 用途 | 关键参数/响应 | 变更类型 |
| --- | --- | --- | --- | --- |
| GET | `/blade-system/dict/list` | 字典树列表 | query: code、dictValue、remark；data: `DictNode[]` | 不变 |
| GET | `/blade-system/dict/detail` | 字典详情 | query: id | 不变 |
| GET | `/blade-system/dict/tree?code=DICT` | 字典父级树 | data: `TreeOption[]` | 不变 |
| POST | `/blade-system/dict/submit` | 字典新增/编辑 | body: DictForm | 不变 |
| POST | `/blade-system/dict/remove` | 字典删除 | query: ids | 不变 |
| GET | `/blade-system/dept/list` | 部门树列表 | query: deptName、fullName、tenantId；data: `DeptNode[]` | 不变 |
| GET | `/blade-system/dept/detail` | 部门详情 | query: id | 不变 |
| GET | `/blade-system/dept/tree` | 部门选项树 | query: tenantId | 不变 |
| POST | `/blade-system/dept/submit` | 部门新增/编辑 | body: DeptForm | 不变 |
| POST | `/blade-system/dept/remove` | 部门删除 | query: ids | 不变 |
| GET | `/blade-system/menu/list` | 菜单树列表 | query: name、code；data: `MenuNode[]` | 不变 |
| GET | `/blade-system/menu/detail` | 菜单详情 | query: id | 不变 |
| GET | `/blade-system/menu/tree` | 菜单父级树 | data: `TreeOption[]` | 前端新增包装，后端不变 |
| POST | `/blade-system/menu/submit` | 菜单新增/编辑 | body: MenuForm | 不变 |
| POST | `/blade-system/menu/remove` | 菜单删除 | query: ids | 不变 |
| GET | `/blade-system/role/list` | 角色树列表 | query: roleName、roleAlias、tenantId；data: `RoleNode[]` | 不变 |
| GET | `/blade-system/role/detail` | 角色详情 | query: id | 前端新增包装，后端不变 |
| GET | `/blade-system/role/tree` | 角色选项树 | query: tenantId | 不变 |
| POST | `/blade-system/role/submit` | 角色新增/编辑 | body: RoleForm | 不变 |
| POST | `/blade-system/role/remove` | 角色删除 | query: ids | 不变 |
| GET | `/blade-system/menu/grant-tree` | 菜单/数据/API 授权树 | data: menu、dataScope、apiScope | 不变 |
| GET | `/blade-system/menu/role-tree-keys` | 角色已选授权 | query: roleIds；data: 三类 keys | 不变 |
| POST | `/blade-system/role/grant` | 提交角色授权 | body: roleIds、menuIds、dataScopeIds、apiScopeIds | 不变 |

`src/api/system/menu.ts` 中 `getLazyMenuList`、`getTopMenu` 和 `getRoutes` 仍被第四阶段页面与 Store 使用，
第三阶段只能补类型，不得删除或改变其契约。

### 6.2 分页、用户与代码接口

| 方法 | 路径 | 用途 | 关键参数/响应 | 变更类型 |
| --- | --- | --- | --- | --- |
| GET | `/blade-system/topmenu/list` | 顶部菜单分页 | current、size、name、code；IPage | 不变 |
| GET | `/blade-system/topmenu/detail` | 顶部菜单详情 | id | 不变 |
| POST | `/blade-system/topmenu/submit` | 新增、编辑、排序 | body: TopMenuForm | 不变 |
| POST | `/blade-system/topmenu/remove` | 删除 | ids | 不变 |
| GET | `/blade-system/menu/grant-top-tree` | 可配置菜单树 | data.menu | 不变 |
| GET | `/blade-system/menu/top-tree-keys` | 顶部菜单已选键 | topMenuIds | 不变 |
| POST | `/blade-system/topmenu/grant` | 提交下级菜单 | body: topMenuIds、menuIds | 不变 |
| GET | `/blade-system/user/list` | 用户分页 | current、size + 5 项查询白名单 | 不变 |
| GET | `/blade-system/user/detail` | 用户详情 | id | 不变 |
| POST | `/blade-system/user/submit` | 新增用户 | body: UserForm | 不变 |
| POST | `/blade-system/user/update` | 编辑用户 | body: UserForm | 不变 |
| POST | `/blade-system/user/remove` | 删除用户 | ids | 不变 |
| POST | `/blade-system/user/grant` | 配置角色 | userIds、roleIds | 不变 |
| POST | `/blade-system/user/reset-password` | 重置密码 | userIds | 不变 |
| POST | `/blade-system/user/unlock` | 解锁用户 | userIds | 不变 |
| POST | `/blade-system/user/import-user` | Excel 导入 | multipart `file` | 前端改用 Axios FormData |
| GET | `/blade-system/user/export-user` | Excel 导出 | 5 项查询白名单；Blob | 前端改用 Axios Blob |
| GET | `/blade-system/user/export-template` | 模板下载 | Blob | 前端改用 Axios Blob |
| GET | `/blade-develop/code/list` | 代码配置分页 | current、size、datasourceId、codeName、serviceName | 不变 |
| GET | `/blade-develop/code/detail` | 代码配置详情 | id | 不变 |
| POST | `/blade-develop/code/submit` | 新增/编辑 | body: CodeForm | 不变 |
| POST | `/blade-develop/code/remove` | 删除 | ids | 不变 |
| POST | `/blade-develop/code/copy` | 复制配置 | id | 不变 |
| POST | `/blade-develop/code/gen-code` | 生成代码 | ids、`system=saber3` | 不变 |

用户页面还复用 `/blade-system/tenant/select`、`/blade-system/dept/tree`、`/blade-system/role/tree` 和
`/blade-system/post/select`；代码页面复用 `/blade-develop/datasource/select` 与 `yes_no` 字典接口。

### 6.3 响应与前端 API 类型

非分页列表：

```ts
interface BladeResponse<T> {
  code: number;
  data: T;
  msg?: string;
}

type TreeListResponse<T> = BladeResponse<T[]>;
```

分页列表继续解析 `response.data.data.records` 和 `response.data.data.total`。页面使用
`Awaited<ReturnType<typeof getList>>` 推断实际 Axios 响应，不额外维护跨模块实体 DTO。

API 文件按实际用途补最小类型：

```ts
export const getList = (params: object) => { /* 非分页树 GET */ };
export const getList = (current: number, size: number, params: object) => { /* 分页 GET */ };
export const getDetail = (id: string) => { /* GET detail */ };
export const remove = (ids: string) => { /* POST remove */ };
export const add = (row: object) => { /* POST submit */ };
export const update = (row: object) => { /* POST submit/update */ };
```

同一文件不会实际声明两个同名 `getList`；上例分别表示树模块和分页模块的签名。授权键统一使用
`TreeKey = string | number`，请求前保留后端返回值类型，不通过 `Number()` 转换 64 位 ID。

API 导出函数遵循兼容优先：`getDeptTree`、`getRoleTree`、`getLazyMenuList`、`getTopMenu`、`getRoutes` 和
`getDictionary` 已被其他页面、composable 或 Store 使用，保留现有导出名与行为。角色页面补实体 `getDetail`，
并可为现有授权键函数增加 `getGrantKeys` 清晰别名；顶部菜单可增加 `getGrantKeys` 别名。旧导出只有在全仓
静态检索确认无调用方后才可删除，本阶段默认不删除。

### 6.4 文件请求契约

```ts
export const importUsers = (file: File) => {
  const data = new FormData();
  data.append('file', file);
  return request({ url: '/blade-system/user/import-user', method: 'post', data });
};

export const exportUsers = (params: object) =>
  request<Blob>({
    url: '/blade-system/user/export-user',
    method: 'get',
    params,
    responseType: 'blob',
  });

export const downloadUserTemplate = () =>
  request<Blob>({
    url: '/blade-system/user/export-template',
    method: 'get',
    responseType: 'blob',
  });
```

不手工设置 `Blade-Auth`、`Authorization` 或 multipart `Content-Type`。Blob 请求的业务错误不会被当前 Axios
拦截器按普通 JSON 完整识别，因此调用方必须先经过 `downloadBlob` 校验，再显示成功或错误。

## 7. 前端设计

### 7.1 目录结构

```text
src/
├── components/
│   ├── icon-select/main.vue                 # 新增：现有 iconList 选择器
│   └── tree-check-panel/main.vue             # 新增：授权树勾选面板
├── composables/
│   └── useTreeList.ts                        # 新增：非分页树列表状态
├── types/
│   └── tree.ts                               # 新增：TreeKey、TreeNode、TreeListOptions
├── utils/
│   └── download.ts                           # 新增：Blob 下载与错误解析
├── api/
│   ├── system/{dict,dept,menu,role,topmenu,user}.ts
│   └── tool/code.ts
└── views/
    ├── authority/role.vue
    ├── system/{dict,dept,menu,topmenu,user}.vue
    └── tool/code.vue
```

组件使用 kebab-case 目录，composable、工具和类型使用 camelCase 文件名。7 个页面仍保留原文件和动态菜单路径，
不新增并行生产路由。用户表单、授权和导入先保持在 `user.vue` 内，以页面函数分区组织；只有实现中出现独立
复用或无法维护的 props 边界时，才按评审拆分业务组件。

### 7.2 `useTreeList`

```ts
export type TreeKey = string | number;

export interface TreeNode {
  id: TreeKey;
  children?: TreeNode[];
}

export interface TreeListOptions<T extends TreeNode, Q extends object, R> {
  fetcher: (query: Q) => Promise<R>;
  resolveResponse: (response: R) => T[];
  createInitialQuery: () => Q;
  getRowKey?: (row: T) => TreeKey;
}
```

返回：

- `data: Ref<T[]>`
- `query: Ref<Q>`
- `loading: Ref<boolean>`
- `failed: Ref<boolean>`
- `expandedRowKeys: Ref<TreeKey[]>`
- `load()`、`search(query)`、`reset()`、`refresh()`、`handleExpandChange(row, expanded)`

实现要求：

1. 使用递增 requestId，只有最新请求可更新 data、failed 和 loading。
2. `search`、`reset` 先替换查询并清空旧结果；`refresh` 保留相同查询下的当前结果。
3. 请求参数使用查询副本，不修改调用方对象。
4. 成功后递归收集新树 ID，并修剪已经不存在的 expanded keys。
5. 不包含分页、ElMessage、权限、选择、详情或业务 API。
6. 页面 watch data 后同时清 `useTableSelection` 和 ElTable 选择状态。

### 7.3 `tree-check-panel`

```ts
interface TreeCheckNode {
  id: TreeKey;
  title?: string;
  children?: TreeCheckNode[];
}

interface TreeCheckPanelProps {
  modelValue: TreeKey[];
  linked: boolean;
  data: TreeCheckNode[];
  loading?: boolean;
  disabled?: boolean;
  maxHeight?: string | number;
  emptyText?: string;
}
```

| 类型 | 名称 | 说明 |
| --- | --- | --- |
| v-model | `modelValue` | 当前完整勾选键，不包含半选键 |
| v-model | `linked` | `true` 时 `check-strictly=false` |
| Prop | `data` | 当前授权树，固定 `node-key="id"`、label=`title` |
| Prop | `loading`/`disabled` | 加载或提交期间禁用操作 |
| Prop | `maxHeight` | 树内容最大高度，默认适配视口 |
| Event | `update:modelValue` | 用户勾选、全选、反选或联动切换后触发 |
| Event | `update:linked` | 联动状态变化 |

组件内部使用 Element Plus `ElTree`，顶部为节点联动 Switch、说明 Tooltip、全选和反选按钮。全选递归收集
全部 ID；严格模式反选全部节点，联动模式反选叶子节点。收到外部 modelValue/data 更新时 `nextTick` 后调用
`setCheckedKeys`，使用 syncing 标记避免同步循环。组件不加载接口、不知道角色/用户 ID，也不提交授权。

### 7.4 `icon-select`

```ts
interface IconSelectProps {
  modelValue?: string;
  disabled?: boolean;
  clearable?: boolean;
  placeholder?: string;
}
```

- 输入区展示当前图标预览和 class 字符串，点击打开 Popover；查看模式禁用。
- Popover 提供本地搜索，按 `iconList` 分组展示固定尺寸图标按钮。
- 每个图标按钮有 tooltip/aria-label，选中态使用 Element Plus 主色 Token；不显示无意义文本胶囊。
- 搜索同时匹配组名和 class，空结果显示 Element Plus Empty。
- 选中原样 emit class 字符串并关闭；清空 emit 空字符串。
- 组件不修改 `iconList.ts`，不把 iconfont class 转成 Element Plus 组件名。

### 7.5 页面通用结构

树页面：

```text
SearchPanel
└── ListPanel
    ├── actions: 新增/删除
    ├── tools: 刷新
    └── el-table(row-key=id, tree-props.children=children)
        ├── selection/index/业务列
        └── RowActions + 新增子项/专项操作
FormDialog
```

分页复杂页面：

```text
SearchPanel
└── ListPanel
    ├── actions/tools
    ├── el-table
    └── ListPagination
FormDialog + 专项 ElDialog
```

表格选择列固定左侧，操作列按按钮数稳定宽度；低频操作进入“更多”菜单。树表不固定父级文本列，避免树缩进
和固定列在窄视口互相覆盖。所有刷新按钮使用 Tooltip + circle 图标，树、表格、表单和专项弹窗使用独立 loading。

### 7.6 页面设计

| 页面 | 列表/状态 | 表单和专项设计 | 特殊转换 |
| --- | --- | --- | --- |
| 字典 | `useTreeList`；code/dictValue/remark 查询 | FormDialog + ElTreeSelect；admin 显示新增子项 | 子项继承 code；dictKey/sort 使用 ElInputNumber，保留 0 |
| 部门 | `useTreeList`；deptName/fullName/tenantId 查询 | FormDialog + 部门父级树；租户列/搜索/查看受 tenantMode 控制 | 新增/编辑不由用户修改 tenantId；子项锁 parentId |
| 菜单 | `useTreeList`；name/code 查询 | FormDialog + ElTreeSelect + IconSelect + Radio | category/action/isOpen 保持 number；source 保持 class 字符串 |
| 角色 | `useTreeList`；roleName/roleAlias/tenantId 查询 | FormDialog + 三 Tab TreeCheckPanel 授权弹窗 | `/role/detail` 详情；三类 keys 独立；grant body 保持数组 |
| 顶部菜单 | `usePagedList`；name/code 查询 | FormDialog + IconSelect + TreeCheckPanel 配置 | 排序单向更新；工具栏单选/行入口共享 loader |
| 用户 | `usePagedList`；5 项查询由 SearchPanel 按首行容量自动折叠 | FormDialog + 三类联动选择；TreeCheckPanel；ElUpload 导入 | 详情 ID string->array；提交副本 array->string；Blob 下载 |
| 代码 | `usePagedList`；datasourceId/codeName/serviceName 查询 | FormDialog + 数据源 Select + yes_no DictSelect | baseMode/wrapMode 保持 number；生成固定 system=saber3 |

#### 字典、部门、菜单和角色

- 树页面 `el-table` 绑定 `expandedRowKeys` 和 `@expand-change`，不显示分页 footer。
- 父级选项不直接复用筛选后的列表，分别调用 dict/dept/menu/role tree 接口，避免搜索导致父级缺失。
- 查看/编辑均使用真实 detail 接口；角色新增 API 文件补 `getDetail`，不再把授权 keys 接口误作实体详情。
- `FormDialog` 的 `loading` 合并详情与必要选项加载；`submitting` 只表示写请求。
- 菜单类型、按钮功能、新窗口仍全部显式声明，不在本阶段引入条件表单规则变更。
- 角色权限设置要求列表恰好单选一条；弹窗默认 720px，内容区 Tab 内局部滚动，移动端宽度受 32px 视口边距限制。

#### 顶部菜单

- `row-actions` 的 extra 插槽放配置操作，工具栏配置与行配置共同调用 `openGrant(topMenu)`。
- 分页数据加载成功后清选择；授权成功刷新但不改变当前页和查询。
- 排序控件只在 edit 权限允许时启用；是否进一步绑定 `topmenu_setting` 由权限评审确认。
- 关闭授权弹窗调用组合详情 `clear()` 并把 keys、data、linked、targetIds 全部重置。

#### 用户管理

- 保留当前 Element Plus SearchPanel 和工具栏视觉，替换 Avue 列表、分页、表单及导入表单，不再保留
  `.avue-crud__left/right` 等深层样式。
- 用户页声明账号、姓名、昵称、手机、邮箱五项查询，不再手工传入展开开关或控制字段显隐；SearchPanel 在桌面端
  自动将账号、姓名、昵称保留在首行并折叠手机、邮箱，窄屏按当前首行容量重新计算。导出使用已执行 query，
  不读取正在编辑但未查询的值。
- 表单用 `el-tree-select` 管理部门和角色多选，用 `el-select` 管理岗位多选；全部支持明确 loading/empty。
- 新增初始化密码和确认密码为空；编辑/查看模型在赋值前删除 password/password2，列表转换也不保留密码。
- 角色配置单选时从行 `roleId` 回填；批量时 keys 初始为空并展示 `ElAlert` 说明将覆盖 N 个用户。
- 角色配置检测选中行 tenantId 唯一；租户模式关闭仍使用登录上下文返回的角色树。
- 密码重置、解锁、删除均使用独立 running 状态，成功后清选择并刷新；失败保留选择。
- 导入弹窗不嵌套 `FormDialog`，使用普通 ElDialog + ElUpload；提交中阻止关闭。
- 导出、模板、导入操作仅 admin 入口显示，密码重置继续使用 `user_reset`；后端为最终边界。

#### 代码生成

- 数据源选项通过 `useRemoteOptions` 加载；`yes_no` 使用已存在 `DictSelect`，列表需要回显时使用 `DictTag`。
- API 路径和 Web 路径用 textarea 或完整宽度 input，避免窄弹窗截断；查看模式可复制但不能编辑。
- 复制按钮只在 `code_edit` 可见，使用 `copyingId` 禁止同一行重复复制。
- 代码生成按钮的独立权限仍待产品/后端确认；当前设计保持页面管理员入口，不虚构 `code_build`。
- 生成成功清选择并刷新；失败保留选择，便于核对目录后重试。

### 7.7 状态、缓存与请求

| 状态/数据 | 所有者 | 获取方式 | 清理/失效条件 |
| --- | --- | --- | --- |
| 4 个树列表及查询 | `useTreeList` | 模块 `/list` | 页面卸载、查询替换；不跨页面缓存 |
| 3 个分页列表及查询 | `usePagedList` | 模块 `/list` | 页面卸载；不跨页面缓存 |
| 表格选择 | `useTableSelection` + ElTable ref | 用户选择 | 列表成功更新、操作成功、页面关闭 |
| 实体详情 | `useRemoteDetail` | detail API | 弹窗关闭、目标切换、成功提交 |
| 父级和租户联动选项 | `useRemoteOptions` | 明确 tree/select API | 租户切换、弹窗关闭、请求失败 |
| 字典选项 | `useDictionary` | dictionary API | 成功 Promise 会话内复用；失败不缓存 |
| 授权组合数据 | 页面 `useRemoteDetail` | Promise.all 树 + keys | 授权弹窗关闭或目标切换 |
| 图标筛选 | `icon-select` 内部 | 本地 iconList | Popover 关闭或组件卸载 |
| 上传文件 | user 页面 + ElUpload ref | 用户本地选择 | 成功、取消或显式移除 |
| Blob 对象 URL | `downloadBlob` | 导出响应 | 触发下载后立即 revoke |
| 生成/排序/复制锁 | 对应页面 ref | 用户操作 | 当前请求 finally |

所有 API 继续使用 `@/axios`。普通 Blade JSON 错误由 Axios 统一提示；页面 catch 只恢复局部状态。Blob 业务错误
由 `downloadBlob` 解析后页面显示一次。不得新增全局 Store、localStorage、sessionStorage 或 IndexedDB 缓存。

### 7.8 样式、响应式与可访问性

- 使用 `--saber-surface`、`--saber-border`、`--saber-text-primary`、`--saber-text-secondary`、
  `--saber-surface-muted` 和 Element Plus状态 Token，不硬编码 Ant Design 默认色。
- `tree-check-panel` 工具栏使用现有表面与边框 Token；树区 `max-height: min(480px, calc(100vh - 260px))`。
- `icon-select` 图标网格使用稳定 36px 方格和最小 32px 点击区域，hover 不改变布局尺寸。
- 1440px 表格完整展示主列；1024px 允许横向滚动；375px 搜索单列、工具栏换行、分页裁剪。
- 授权、用户和代码表单使用 `FormDialog` 现有视口最大高度与正文滚动，footer 不被树或上传区遮挡。
- TreeCheckPanel 的 switch、按钮和树使用可见焦点；IconSelect 按钮具备 aria-label；图标预览不作为唯一字段说明。
- 用户导入拖拽区同时保留可点击选择和可见文件名，不仅依赖拖拽。
- 页面不引用 `.ant-*`、不复制 Ant CSS，也不新增用户页对 Avue DOM 的 `:deep()`。

## 8. 数据库、配置与发布影响

| 影响项 | 是否涉及 | 说明 | 关联文档 |
| --- | :---: | --- | --- |
| 新表/改表/约束/索引 | 否 | 前端迁移不改变持久化结构 | 不适用 |
| 数据迁移/回填 | 否 | 层级、授权、图标和用户历史值原样读取 | 不适用 |
| 环境变量/配置 | 否 | 继续使用现有 API、tenantMode 和代码生成路径 | 不适用 |
| 文件系统副作用 | 是，保持现状 | 代码生成仍写服务端现有目录；验收使用可控路径 | 本文 4.5、10 节 |
| 部署顺序/兼容 | 是 | 按需求 9.5 子批次发布；Avue 为第四阶段继续保留 | 本文 10 节 |
| 依赖/锁文件 | 否 | 不新增依赖，不应修改锁文件 | 不适用 |

## 9. 安全、测试与可观测性

### 9.1 认证与安全要求

| 检查项 | 设计 |
| --- | --- |
| 身份认证 | 所有 API 复用 `@/axios` 的 Basic、Blade Token、Cookie 和 401 流程 |
| 角色授权 | 标准按钮使用现有权限码；admin 专项保持现状；后端管理员注解最终授权 |
| 数据归属 | 部门、角色、用户继续由后端登录上下文和 TenantGuard 限制；前端阻止混租户批量授权 |
| 输入校验 | ElForm/文件扩展名做体验校验，后端继续负责必填、实体、租户和文件内容校验 |
| 密码 | 仅新增表单短期持有；列表、查看、编辑、日志和持久化中不得出现 |
| 下载 Token | 不拼 URL；由 Axios 请求头注入；不记录响应、查询或对象 URL |
| 上传内容 | 不读取或记录 Excel 正文；只向既有 multipart `file` 字段提交 |
| 授权数据 | 三类 keys 独立，只提交当前目标；关闭清理，不进入 Store/持久化 |
| 代码生成 | 前端不读取数据源密码，不输出生成路径到控制台，不宣称文件已回滚 |

### 9.2 测试矩阵

仓库当前没有单元测试、E2E 或 lint 脚本，本设计不新增测试基础设施。当前已创建
[TEST-REQ-2026-003 测试文档](../test/TEST-REQ-2026-003-element-plus-migration-phase-3.md)，覆盖：

| 场景 | 层级 | 关键断言 | 关联需求 |
| --- | --- | --- | --- |
| 目标页静态迁移 | 静态检索 | 7 页无 avue-crud/avue-form，无 Ant 依赖 | AC-001、AC-049 |
| 树初载、查询、重置、刷新 | 浏览器/网络 | 无分页参数、层级正确、旧响应不覆盖、展开键合理 | AC-002、AC-003 |
| 普通新增与新增子项 | 浏览器 | parentContext 不串用，字典 code 正确继承 | AC-004、AC-005、AC-008、AC-011、AC-013 |
| 详情和父级失败 | 浏览器/网络 | 旧详情/旧选项不显示且不可提交 | AC-006、AC-014、AC-037 |
| 字段值类型 | 浏览器/网络 | dictKey=0、菜单枚举、yes_no 数字不转换 | AC-009、AC-012、AC-036 |
| tenantMode 与树归属 | 多账号浏览器 | 部门、角色显示和选项不越租户 | AC-010、AC-016 |
| 角色三类授权 | 浏览器/网络 | 单选、回填、Tab 隔离、联动/半选/取消/失败正确 | AC-017 至 AC-021 |
| 顶部菜单分页和排序 | 浏览器/网络 | total 正确；排序失败不保留新值 | AC-022、AC-023 |
| 顶部菜单配置 | 多权限浏览器 | 权限、两入口、回填和失败恢复正确 | AC-024 至 AC-026 |
| 用户查询与分页 | 浏览器/网络 | 5 字段白名单、页码和请求数正确 | AC-027 |
| 用户表单与租户联动 | 多租户浏览器 | 密码边界、乱序防护、数组/字符串转换正确 | AC-028 至 AC-030 |
| 单/批量用户角色配置 | 多租户浏览器 | 同租户约束、单选回填、批量覆盖说明正确 | AC-031 |
| 用户删除/重置/解锁 | 浏览器/网络 | 选择、确认、成功和失败状态正确 | AC-032 |
| 用户导入 | 真实后端 | 文件校验、认证、单次提交、成功刷新和部分失败限制有记录 | AC-033 |
| 用户导出与模板 | 真实后端/下载 | 5 条件、文件名、Blob 错误、Token 不进 URL | AC-034、AC-035 |
| 代码复制和生成 | 可控目录 | 复制非幂等、固定 system、重复锁、成功/失败反馈和目录核对 | AC-038 至 AC-040 |
| 跨阶段回归/回滚 | 浏览器/Git | 前两阶段和第四阶段 Avue 页面正常；单页可恢复 | AC-041 至 AC-044 |
| 视口、主题、键盘 | 浏览器截图/人工 | 1440/1024/375、浅深主题、焦点和弹窗可用 | AC-045 至 AC-047 |
| 工程门禁 | 命令 | `pnpm run type-check`、`pnpm run build:prod` 通过 | AC-048 |

用户导入测试必须使用可清理租户和可识别账号前缀，分别覆盖 1 行、跨 3000 行边界、非法扩展名、解析异常和
重复文件。代码生成必须使用专用可恢复目录，不得指向开发者真实工作代码或生产目录。

### 9.3 日志、指标与性能

- 不新增前端业务埋点、后端日志、指标或告警。
- 禁止新增 `console.log`，尤其不得记录 Token、密码、用户表单、Excel、授权 keys、数据源或生成路径。
- 浏览器网络面板验证列表、租户联动、授权和分页请求与用户动作一一对应。
- 大型树使用现有完整树接口，不发逐节点请求；用真实规模验证首次渲染、Tab 切换和全选/反选。
- `tree-check-panel` 的递归 key 收集为 O(n)，只在用户显式全选/反选时执行，不在每次 render 执行。
- Blob 下载完成立即 revoke URL，上传弹窗关闭清文件引用，避免长会话内存滞留。
- 本需求不承诺后端响应时间；若真实授权树规模导致明显卡顿，单独评审虚拟树或后端懒加载契约。

### 9.4 当前设计与验证状态

| 设计项 | 当前状态 | 已完成证据 | 待完成 |
| --- | --- | --- | --- |
| 范围与接口 | 已实现，待验收 | 7 个页面沿用原路由，API 保持既有路径并补最小类型和文件请求包装 | 产品、后端、安全和测试评审 |
| 树列表 | 已实现，待验收 | `useTreeList` 已管理非分页树、请求竞态、失败和展开键；字典、部门、菜单、角色已接入 | 真实层级数据、父子上下文和动态路由验证 |
| 授权树 | 已实现，待验收 | `tree-check-panel` 已接入角色三类授权、顶部菜单和用户角色配置 | 真实 keys、半选、联动、大树性能和权限验收 |
| 用户文件流程 | 已实现，待验收 | 已使用 Axios FormData/Blob、标准认证头、文件类型校验和已执行查询导出 | 网关下载兼容、文件名、导入非原子风险和失败样例 |
| 代码生成 | 已实现，待验收 | 已实现复制锁、生成确认、固定 `system=saber3` 和失败目录提示 | 可控目录、重复提交和部分失败人工核对 |
| 工程与视觉 | 两项界面缺陷已修复，整体仍阶段性阻塞 | `DEF-001`、`DEF-002` 定向回归通过；GEN-001、ENG-002、VIS-002 维持通过；类型检查通过 | 完整复跑 VIS-001/VIS-003，解决 `ENV-002`，补做数据、文件、回归和工程门禁验收 |

2026-09-02 已按测试文档 0.3 执行首轮 4 条用例：GEN-001、ENG-002 通过；GEN-002 因独立端口
共享认证 Cookie 但缺少该原点的 `userInfo` 本地状态，被 `third-register` 不可关闭弹窗阻塞；ENG-001
类型检查通过，但生产构建两次以 Windows `0xC0000409` 异常终止。其余 42 条用例未执行，真实授权、租户、
上传下载、代码生成副作用、视觉和跨阶段兼容仍需在受控环境验收。第二阶段未完成的验收状态保持不变。

2026-09-02 随后按测试文档 0.4 仅由主代理串行执行 `VIS-001`、`VIS-002`、`VIS-003`，未使用子代理，
未执行数据或业务写入案例。`VIS-002` 通过；`VIS-001` 因 375px 角色授权 footer 裁切失败并登记 `DEF-001`；
`VIS-003` 因 IconSelect 无法通过键盘完成选择失败并登记 `DEF-002`。主题、主色、视口和弹层均已清理；
其余数据、文件、回归和工程案例仍未执行。

2026-09-02 完成两项缺陷修复。角色授权弹窗使用 Teleport 可达的 `role-grant-modal` 全局类限制
`max-height: calc(100vh - 32px)`，以 flex 列布局固定 header/footer，并让 body 独立滚动；375x812
定向回归中弹窗底部为 763.6px、footer 底部为 747.6px。IconSelect 移除受控显隐与 click trigger 的
双重开关，改用原生按钮和 Popover 自身触发；打开后聚焦搜索框，禁用选项 Tooltip 的键盘触发以保留按钮
`Enter` 行为，选择、清空或 `Esc` 后关闭并返回触发器，移动端内容区限制为 `min(36vh, 300px)`。
两项定向回归均未提交业务数据。用户注册相关逻辑按用户决定暂缓且未修改。2026-09-03 共享搜索面板调整后，
默认 Node 24 构建在转换 2001 个模块后仍以 Windows `0xC0000409` 退出；Node 22.3.0 直接执行同等
production 构建成功，`ENV-002` 收敛为默认 Node 24 的环境兼容限制。

## 10. 发布与回滚

### 10.1 迁移与发布

1. 评审需求与本设计，关闭或接受下载认证、用户导入、独立权限码和代码生成目录风险。
2. 实现 `useTreeList`、`tree-check-panel`、`icon-select`、`downloadBlob` 及共享类型，使用隔离状态验证契约。
3. 迁移字典、部门，验证非分页树、父级选择、租户模式和新增子项。
4. 迁移菜单，验证图标原值、菜单枚举和动态路由冒烟。
5. 迁移角色，使用真实授权样例验证三类 keys、半选和失败恢复。
6. 迁移顶部菜单，验证分页、内联排序和下级菜单配置。
7. 迁移用户，验证多租户联动、密码边界、授权、导入导出和不同权限账号。
8. 迁移代码生成，使用可控目录验证配置、复制、固定 system 和部分失败说明。
9. 执行第一、二阶段和第四阶段代表页回归、静态检索、类型检查、生产构建、多视口和主题验证。
10. 全部 Must 验收与正式评审完成后，同步需求、设计、测试和索引状态。

页面迁移使用原文件和原路由，不并行保留第二个生产入口。每个子批次可单独发布；共享能力一旦被后续批次修改，
必须重新验证所有既有使用方。

### 10.2 回滚与恢复

- 触发条件：层级错误、授权集合变化、跨租户选项、密码暴露、导入导出认证失败、动态路由回归、代码生成目标错误、
  未迁移 Avue 页面回归、类型或生产构建失败。
- 代码回滚：按目标页面和对应新增能力回滚；共享能力先回滚使用方，再回滚组件/composable。
- 配置回滚：不适用，无新配置。
- 数据库 downgrade：不适用，无数据库变化。
- CRUD/授权数据：前端迁移本身无数据迁移；验收写操作通过现有业务接口，按测试租户清理。
- 用户导入：可能已分批写入，代码回滚不能恢复；使用测试账号前缀查询并按后端允许方式清理。
- 代码生成：前端不能回滚文件；验收目录通过版本控制、备份或目录级恢复处理，禁止自动递归删除未知目录。
- 回滚验证：原菜单恢复 Avue 行为，其他已迁移页正常，下载认证回到原兼容方式，类型检查和构建通过。

## 11. 风险、评审与变更

### 11.1 风险与开放问题

| 编号 | 类型 | 内容 | 负责人 | 状态/结论 |
| --- | --- | --- | --- | --- |
| ITEM-001 | 依赖 | 第二阶段真实业务、权限、主题、类型和构建仍待验收 | 技术/测试负责人 | 第三阶段开发前关闭或形成带风险准入 |
| ITEM-002 | 风险 | 树接口返回完整数据，大规模节点可能影响渲染和全选性能 | 前端/测试负责人 | 使用真实规模验证；暂不改后端契约 |
| ITEM-003 | 风险 | `check-strictly` 切换可能改变父、子、半选 keys | 前后端/测试负责人 | 使用现网样例对照 TreeCheckPanel 提交集合 |
| ITEM-004 | 风险 | 编辑节点的父级树包含自身/后代可能形成循环 | 前端负责人 | 设计为禁用当前子树，后端继续最终校验 |
| ITEM-005 | 风险 | 用户详情回填 tenantId 时若复用普通 change 会清空原角色/部门/岗位 | 前端负责人 | 使用显式 change 与初始化顺序分离 |
| ITEM-006 | 问题 | 用户导入分批落库且 IOException 可能被 Controller 吞掉后返回成功 | 后端/产品/测试负责人 | 阻塞“准确失败/整体回滚”验收；需接受限制或另立后端修复 |
| ITEM-007 | 兼容 | 下载从 URL Token 改为 Axios 认证头与 Blob | 安全/前端负责人 | 待评审；后端路径不变，需真实网关验证 |
| ITEM-008 | 问题 | 导出从 2 项扩为已执行的 5 项查询白名单 | 产品/后端负责人 | 后端 QueryWrapper 可支持；待产品确认预期 |
| ITEM-009 | 问题 | 角色权限设置和代码生成没有独立按钮权限码 | 产品/后端负责人 | 默认保持当前管理员入口，不虚构权限 |
| ITEM-010 | 风险 | 顶部菜单排序为即时写操作 | 前端负责人 | 单向 model-value + 全页串行，失败不污染行 |
| ITEM-011 | 风险 | 代码生成非幂等且可能部分写文件 | 技术/运维负责人 | 可控目录、明确确认和人工核对；前端不承诺回滚 |
| ITEM-012 | 风险 | 用户页面一次消除 Avue 列表/表单，改动面最大 | 前端/测试负责人 | 独立子批次，完成前不发布混合中间态 |
| ITEM-013 | 风险 | 当前仓库无自动化测试 | 测试负责人 | 建立第三阶段手工测试文档和证据矩阵 |

### 11.2 评审结论

| 领域 | 结论 | 评审人 | 日期 | 备注 |
| --- | --- | --- | --- | --- |
| 后端/API | 待评审 | 待定 | 待定 | 确认树/授权 keys、用户导入限制和 5 项导出查询 |
| 前端 | 待评审 | 待定 | 待定 | 确认新增组件/composable、状态边界和子批次 |
| 安全与租户 | 待评审 | 待定 | 待定 | 确认 Blob 认证、密码、同租户批量授权和文件内容边界 |
| 数据库/发布 | 不涉及数据库，发布待评审 | 待定 | 待定 | 确认可控生成目录、导入数据和单页回滚 |
| 测试 | 待评审 | 待定 | 待定 | 准备真实树规模、多权限/多租户账号、Excel 和生成目录 |

### 11.3 变更记录

| 日期 | 版本 | 变更内容 | 原因 | 影响 | 修改人 |
| --- | --- | --- | --- | --- | --- |
| 2026-09-01 | 0.1 | 初稿 | 启动 Element Plus 页面迁移第三阶段详细设计评审 | 共享能力、7 个页面、接口、安全、测试和发布方案 | Codex |
| 2026-09-02 | 0.2 | 同步代码实现与常规检查证据 | 第三阶段开发完成，进入待验收状态 | 共享能力、API、7 个页面、验证边界和遗留验收项 | Codex |
| 2026-09-02 | 0.3 | 关联 46 条用例测试文档并同步待执行状态 | 完成测试设计和 AC 覆盖自检 | 测试矩阵、环境准备、高风险副作用和清理约束 | Codex |
| 2026-09-02 | 0.4 | 同步默认 admin 单账号测试约束 | 测试文档收敛多账号前置条件 | 权限负向边界、租户数据维度和执行准备 | Codex |
| 2026-09-02 | 0.5 | 同步首轮测试和两项环境阻塞 | 2890 原点状态与 Windows 构建异常阻止继续执行 | 工程门禁、浏览器前置和待验收范围 | Codex |
| 2026-09-02 | 0.6 | 同步界面案例串行测试结果和 `DEF-001`、`DEF-002` | 按用户要求仅执行界面测试，不使用子代理且不执行数据案例 | 视觉、键盘可访问性和后续补测边界 | Codex |
| 2026-09-02 | 0.7 | 落实 `DEF-001`、`DEF-002` 修复并同步定向回归 | 修复移动端授权弹窗越界和图标选择器键盘状态链 | 角色授权弹窗、IconSelect、移动端约束和验证结论 | Codex |
| 2026-09-03 | 0.8 | 用户查询字段改由 SearchPanel 根据首行容量自动折叠，并同步 Node 22 对照构建通过 | 统一搜索面板能力，移除用户页专用展开配置并更新工程验证事实 | 用户搜索布局、共享组件契约、响应式回归和环境限制 | Codex |
