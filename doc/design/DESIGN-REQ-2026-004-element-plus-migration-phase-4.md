# Saber Element Plus 第四阶段权限范围、区域与示例页面收尾迁移详细设计文档

## 1. 文档信息

| 项目 | 内容 |
| --- | --- |
| 功能/模块 | Element Plus 权限范围、行政区划与工具示例页面迁移 |
| 设计编号 | DESIGN-REQ-2026-004 |
| 设计版本 | 0.2 |
| 关联需求 | [需求索引](../requirements-index.md)；[REQ-2026-004 第四阶段需求 0.3](../requirements/REQ-2026-004-element-plus-migration-phase-4.md)；前置设计 [DESIGN-REQ-2026-001](DESIGN-REQ-2026-001-element-plus-migration.md)、[DESIGN-REQ-2026-002](DESIGN-REQ-2026-002-element-plus-migration-phase-2.md)、[DESIGN-REQ-2026-003](DESIGN-REQ-2026-003-element-plus-migration-phase-3.md)；正式测试文档待详细测试阶段创建 |
| 目标版本/迭代 | Saber 5.x / Element Plus 页面迁移第四阶段 |
| 文档状态 | 已实现，常规检查通过，待详细验收 |
| 设计负责人 | 待定 |
| 评审人 | 前端、后端、安全、测试、产品按需填写 |
| 最后更新日期 | 2026-09-03 |

## 2. 设计摘要与范围

### 2.1 设计摘要

第四阶段沿用前三阶段已经实现的 `SearchPanel`、`ListPanel`、`ListPagination`、`FormDialog`、
`RowActions`、`DictSelect`、`DictTag`、`usePagedList`、`useRemoteDetail`、`useRemoteOptions`、
`useTableSelection` 等 Element Plus 能力，不新增通用 CRUD、表单生成器或运行时依赖。

数据权限和 API 权限页面具有相同的菜单浏览结构。本设计新增模块内组件
`src/views/authority/components/scope-menu-browser.vue`，只封装菜单查询、懒加载表格和“权限配置”事件。
两个页面分别维护自己的权限规则实体、分页列表、表单和提交函数。规则抽屉通过 `menuContextVersion` 校验当前
菜单，使关闭、重开或快速切换时的旧响应不能回填新上下文。

行政区划页面改为原生 `ElTree + ElForm`。区划树继续从 `00` 懒加载，节点失败通过公开的
`updateKeyChildren` 接口重试；写操作成功后递增 `treeVersion` 重建树实例，清除 Element Plus 内部懒加载缓存，
避免局部缓存与后端层级不一致。编辑态锁定区划主键编码；新增下级时才允许输入子编号，并在提交前生成完整编码。
该方案避免现有 `/submit` 在编码改变时把“改码”解释成新增记录。

3 个工具示例页面没有仓库内静态路由引用，但部署环境可能通过动态菜单访问。根据需求的保守默认值，本设计保留
原文件和路径，分别改为本地 Element Plus 表格、表单校验和按钮权限示例，不发业务请求。Avue 包、全局注册、
富文本和数据展示专项组件不属于本阶段，继续保留。

### 2.2 关键决策

| 编号 | 决策 | 原因 | 影响 |
| --- | --- | --- | --- |
| DEC-001 | 严格按 REQ-2026-004 v0.2 的 3 个生产页和 3 个示例页实施 | 用户暂不扩大到 Avue 全量移除 | `main.ts`、依赖、富文本和 `util/data.vue` 不变 |
| DEC-002 | 两个权限页共享模块内 `scope-menu-browser`，页面保留规则业务 | 菜单浏览完全重复，规则字段和联动不同 | 去除大段重复 UI，不形成通用 CRUD 引擎 |
| DEC-003 | 菜单浏览继续使用 `GET /menu/lazy-menu-list` 和 ElTable lazy | 保持现有按节点加载和管理员契约 | 根查询、子节点和重试状态需独立管理 |
| DEC-004 | 懒加载失败调用 `resolve([])` 结束 loading，并记录失败节点；重试成功后用 `updateKeyChildren` 回填 | 不调用 resolve 会永久 loading，失败又不能冒充叶子节点 | 使用 Element Plus 2.14 已公开暴露的表格实例方法 |
| DEC-005 | 权限规则分页复用 `usePagedList`，另用 `menuContextVersion` 防止跨菜单回填 | `usePagedList` 已处理同列表请求竞态，但不知道抽屉菜单上下文 | 不修改共享 composable，页面关闭和菜单切换可使旧响应失效 |
| DEC-006 | 权限规则 CRUD 使用抽屉内列表加 `FormDialog` | 子表需要持续看到当前菜单与查询状态 | 表单失败时保留输入，抽屉和表单分别设提交锁 |
| DEC-007 | 数据权限新增默认值由显式函数生成，不用 watch 修改列配置 | Avue 动态 option 容易覆盖编辑详情和残留状态 | 新增与编辑初始化路径分离 |
| DEC-008 | 非自定义数据权限提交 `scopeValue: ''` | 发送 null/省略字段可能被 MyBatis 更新策略忽略，留下旧自定义值 | 类型 1 至 4 不携带具有业务含义的旧规则值 |
| DEC-009 | 自定义规则值按当前后端契约保持可选并限制 2000 字符，需求确认前不增加表达式校验 | 实体无必填注解，数据库字段可空，前端无法验证规则语法 | 待产品/后端评审；不静默收紧或放宽服务端语义 |
| DEC-010 | 抽屉内规则 CRUD 不新增独立权限码，入口继续由 `*_scope_setting` 控制 | 当前菜单资源只有配置入口，Controller 统一要求 admin | 页面每次打开和提交前复核入口权限，服务端最终授权 |
| DEC-011 | 行政区划使用 ElTree 懒加载，写成功后重建树实例 | ElTree 持有已加载分支缓存，局部刷新容易产生陈旧叶子状态 | 写成功后折叠树并清空无效详情，行为明确可恢复 |
| DEC-012 | 行政区划编辑态锁定 `code/subCode`，新增下级态才生成新编码 | 后端 `/submit` 以新 code 是否存在判断新增或更新，没有安全改码契约 | 防止编辑改码生成重复节点；如需改码应另立后端需求 |
| DEC-013 | 根节点 `00` 作为 `parentCode` 提交，但不拼入省级完整编码 | 后端需要 `00` 建立父级与 ancestors，历史省级 code 不含 `00` | 省级子编号 `11` 提交为 code `11`、parentCode `00` |
| DEC-014 | 省、市、区调试使用 3 组 `useRemoteOptions` 和显式 change 事件 | 动态 `dicUrl` 模板会隐藏清理、失败和竞态行为 | 上级变化立即清空全部下级选项和值 |
| DEC-015 | 3 个 util 示例默认保留原路径并替换，不删除动态菜单 | 仓库静态检索无法证明所有部署环境无菜单引用 | 示例不调用后端，不创建新公共组件 |
| DEC-016 | 按权限外壳、数据权限、API 权限、区划、示例页顺序实施 | 权限页共享外壳且写操作影响访问控制 | 高风险配置串行验证，每批可独立回滚 |

### 2.3 改动范围

| 层级 | 改动内容 | 不涉及内容 |
| --- | --- | --- |
| 后端 | 无代码改动；核对菜单、数据权限、API 权限、区划 Controller 与实体契约 | Controller、Service、Mapper、权限算法、缓存和数据库事务 |
| 前端页面 | 迁移 `authority/datascope.vue`、`authority/apiscope.vue`、`base/region.vue`、`util/table.vue`、`util/form.vue`、`util/permission.vue` | 公告编辑、`util/data.vue`、工作台、主布局和其他已迁移页 |
| 前端模块组件 | 新增 `authority/components/scope-menu-browser.vue`；为 `FormDialog` 增加可选 confirmDisabled | 全局树表组件、声明式列配置和通用 CRUD 引擎 |
| 前端状态 | 复用现有 composable；页面增加菜单上下文版本、懒加载失败节点和提交锁 | Vuex 重构、跨页缓存、持久化状态 |
| 前端 API | 为 `scope.ts`、`region.ts` 补充最小类型和明确的区划级联包装函数 | 新接口、独立 Axios、认证头变更 |
| 前端样式 | 目标页使用 Saber Token 和响应式布局，删除目标页 Avue 定向样式 | 主布局 `.avue-*` 历史类名及其他 Avue 页面样式 |
| 数据库 | 无 | 表、字段、索引、字典值和数据迁移 |
| 配置/部署 | 无新增配置或依赖 | `main.ts` Avue 注册、`package.json`、锁文件和环境变量 |

## 3. 总体设计

### 3.1 架构图

~~~mermaid
flowchart TB
    subgraph ScopePages[权限范围页面]
        DataPage[数据权限页]
        ApiPage[API 权限页]
        Browser[scope-menu-browser]
        DataDrawer[数据权限规则抽屉]
        ApiDrawer[API 权限规则抽屉]
    end

    DataPage --> Browser
    ApiPage --> Browser
    DataPage --> DataDrawer
    ApiPage --> ApiDrawer
    Browser --> MenuAPI[menu/lazy-menu-list]
    DataDrawer --> Paged[usePagedList]
    ApiDrawer --> Paged
    DataDrawer --> Detail[useRemoteDetail]
    ApiDrawer --> Detail
    DataDrawer --> Dict[DictSelect/DictTag]
    ApiDrawer --> Dict
    Paged --> ScopeAPI[system/scope.ts]
    Detail --> ScopeAPI

    subgraph RegionPage[行政区划页]
        RegionTree[ElTree lazy]
        RegionForm[ElForm]
        RegionDebug[省市区调试 Dialog]
    end

    RegionTree --> RegionAPI[base/region.ts]
    RegionForm --> RegionAPI
    RegionDebug --> Options[useRemoteOptions]
    Options --> RegionAPI
    RegionForm --> RegionDict[DictSelect region]

    subgraph DemoPages[工具示例]
        TableDemo[ElTable + ListPagination]
        FormDemo[ElForm]
        PermissionDemo[ElTable + local permission]
    end

    MenuAPI --> Axios[现有 @/axios]
    ScopeAPI --> Axios
    RegionAPI --> Axios
    RegionDict --> Axios
    Axios --> Backend[SpringBlade 现有服务]
~~~

权限页面组件只负责展示与事件，页面负责权限规则实体和 API。所有服务请求继续经过 `@/axios`；普通错误由现有
拦截器统一提示，页面只恢复 loading、提交锁和可重试上下文。工具示例不进入 Axios 链路。

### 3.2 组件职责

| 组件/模块 | 职责 | 输入 | 输出 |
| --- | --- | --- | --- |
| `scope-menu-browser` | 两个权限页共用的菜单查询、懒加载、失败重试和配置入口 | title、canConfigure | `configure(menu)` |
| `SearchPanel` | 菜单或规则查询布局及查询/重置事件 | 查询模型、loading、字段插槽 | `search`、`reset` |
| `ListPanel` | 权限规则或示例表格的标题、操作和工具区 | 标题和插槽 | 原生表格事件 |
| `ListPagination` | 权限规则与表格示例分页 | current、size、total、disabled | 单次 `change` |
| `FormDialog` | 数据/API 权限规则新增、编辑、查看；增加默认 false 的 confirmDisabled | mode、loading、submitting、confirmDisabled、表单 | `confirm`、`cancel` |
| `RowActions` | 权限规则查看、编辑、删除 | 显示条件、disabled | 标准行操作事件 |
| `DictSelect` | 规则类型和区划等级选择 | code、valueType、modelValue | 数字型值更新 |
| `DictTag` | 规则类型列表回显 | code、value、valueType | 字典标签 |
| `usePagedList` | 当前菜单规则的查询、分页和同列表竞态 | fetcher、解析函数、初始查询 | data/query/page/loading 与加载操作 |
| `useRemoteDetail` | 规则或区划详情的清空、加载、失败和竞态 | loader、实体 ID/code | detail/loading/failed |
| `useRemoteOptions` | 省市区各级选项的清空、加载和竞态 | `/region/select` loader | options/loading/failed |
| `useTableSelection` | 权限规则批量选择和 ID 集合 | 规则行 | rows/ids/clear |
| `scope.ts` | 数据/API 权限接口的类型化包装 | 分页、查询、实体和 ID | Blade Axios 响应 |
| `region.ts` | 区划树、详情、提交、删除和级联选项包装 | parentCode、code、表单 | Blade Axios 响应 |

### 3.3 新增依赖

不新增依赖。`package.json` 与 `pnpm-lock.yaml` 不应因第四阶段发生变化。

- 懒加载表格、树、抽屉、表单和级联选择使用已安装的 Element Plus。
- 字典使用已有 `useDictionary`、`DictSelect` 和 `DictTag`。
- 图标使用已安装的 `@element-plus/icons-vue` 和菜单历史 iconfont class。
- Avue 及 `avue-plugin-ueditor` 继续供范围外页面运行，本阶段不移除或改配。

## 4. 核心流程设计

### 4.1 权限菜单浏览与上下文切换

~~~mermaid
sequenceDiagram
    actor User as 用户
    participant Browser as scope-menu-browser
    participant MenuAPI as getLazyMenuList
    participant Page as 数据/API 权限页
    participant List as usePagedList
    participant ScopeAPI as 权限规则 API

    User->>Browser: 进入页面/查询/重置
    Browser->>Browser: rootRequestId+1, treeVersion+1
    Browser->>MenuAPI: parentId=0 或空 + name/code
    MenuAPI-->>Browser: 菜单根结果
    User->>Browser: 展开菜单节点
    Browser->>MenuAPI: parentId=节点 id
    alt 子节点成功
        MenuAPI-->>Browser: 子节点
        Browser->>Browser: resolve(children)
    else 子节点失败
        MenuAPI-->>Browser: reject
        Browser->>Browser: resolve([]), 记录 failedNodeId
        User->>Browser: 点击重试
        Browser->>MenuAPI: parentId=节点 id
        MenuAPI-->>Browser: 子节点
        Browser->>Browser: table.updateKeyChildren(id, children)
    end
    User->>Browser: 点击权限配置
    Browser-->>Page: configure(menu)
    Page->>Page: menuContextVersion+1, 清空旧抽屉状态
    Page->>List: currentPage=1, query={}, load()
    List->>ScopeAPI: current/size/menuId
    alt 返回时上下文仍有效
        ScopeAPI-->>List: records/total
        List-->>Page: 当前菜单规则
    else 抽屉关闭或菜单已切换
        ScopeAPI-->>List: 旧响应
        Page->>Page: 丢弃响应
    end
~~~

菜单根请求使用白名单 `{ name, code }`。无查询时 `parentId=0`；存在 name/code 查询时沿用后端现有语义传空
parentId，使后端可返回任意层级匹配项。子节点展开只传当前节点 ID，不继承根查询，保持迁移前行为。

`scope-menu-browser` 的每次查询、重置和刷新都递增 `treeVersion`，使 ElTable 重建并清除旧 lazy cache。
根请求只接受最新 `rootRequestId`。子节点请求捕获当时 `treeVersion`；版本变化后即使请求返回也不再写入当前表格。

打开权限抽屉时，页面保存只读的 `{ id, name, code }` 副本，并递增 `menuContextVersion`。传给
`usePagedList` 的 fetcher 捕获该版本和 menuId；响应返回时二者必须仍与当前值一致，否则以内部过期结果结束，
不更新 records/total，也不显示第二次业务错误。

### 4.2 数据权限规则流程

#### 新增初始化

| 字段 | 类型 1 全部 | 类型 2 本人 | 类型 3 所在机构 | 类型 4 机构及子级 | 类型 5 自定义 |
| --- | --- | --- | --- | --- | --- |
| `scopeName` | `{菜单名} [全部可见]` | `{菜单名} [本人可见]` | `{菜单名} [所在机构可见]` | `{菜单名} [所在机构可见及子级可见]` | `{菜单名} [自定义]`，允许修改 |
| `resourceCode` | 当前菜单 code | 当前菜单 code | 当前菜单 code | 当前菜单 code | 当前菜单 code，允许修改 |
| `scopeColumn` | `-` | `create_user` | `create_dept` | `create_dept` | 空值，由用户填写 |
| `scopeField` | `*` | `*` | `*` | `*` | `*` |
| `scopeValue` | 空字符串 | 空字符串 | 空字符串 | 空字符串 | 显示文本域，当前契约允许空 |

新增表单先调用 `createInitialDataScopeForm(menu)`，再由用户选择类型触发
`applyDataScopeTypeDefaults(form, menu, type)`。该函数只在 `mode === 'add'` 时重写名称、资源编号和权限字段。
编辑态切换类型只调整 `scopeColumn` 和 `scopeValue` 的必要语义，不重写用户已有名称和资源编号。

#### 保存流程

1. 打开新增时清除详情、校验和上次表单；打开编辑/查看时先以空表单进入 loading。
2. 编辑/查看通过 `useRemoteDetail.load(id)` 获取详情，响应 ID 与当前记录一致后复制到表单。
3. `DictSelect code="data_scope_type" value-type="number"` 保证类型值为数字。
4. `ElForm.validate()` 通过后复制表单为 payload，强制写入当前 `menuId`。
5. 类型 1 至 4 强制把 `scopeValue` 设为空字符串；类型 5 保留用户值，不做表达式解释。
6. 保存期间锁定 FormDialog、抽屉关闭和菜单切换；详情或字典失败时通过 `confirmDisabled` 禁用确认；成功后关闭表单并刷新当前菜单当前查询。
7. 请求失败时由 Axios 提示，页面保留输入和 menu context，仅恢复 submitting。
8. 单删或批量删除经确认后提交逗号分隔 ID；成功刷新并清选择，失败保留选择。

字段长度按当前数据库契约做前端上限提示：`scopeName`、`resourceCode`、`scopeField`、`scopeColumn`、`remark`
最多 255，`scopeClass` 最多 500，`scopeValue` 最多 2000。前端长度限制只改善输入反馈，服务端仍负责最终校验。

### 4.3 API 权限规则流程

API 权限与数据权限共享抽屉状态结构，但实体和表单独立，不抽取声明式字段配置。

1. 规则查询白名单仅为 `scopeName`、`resourceCode`，请求始终附加当前 `menuId`。
2. 新增表单默认 `menuId` 为当前菜单，其他字段为空；不自动构造或归一化 `scopePath`。
3. `DictSelect code="api_scope_type" value-type="number"` 提交 1（系统接口）或 2（业务接口）。
4. 权限名称、资源编号、权限路径和接口类型为表单必填；备注可选。
5. 编辑/查看通过 `getApiScopeDetail(id)` 获取服务端原值，`scopePath` 不 trim、不补斜杠、不改大小写。
6. 提交前复制 payload 并覆盖当前 `menuId`，防止旧表单菜单 ID 回流。
7. 删除、成功刷新、失败恢复和抽屉上下文处理与数据权限一致。

`scopeName`、`resourceCode`、`scopePath`、`remark` 的 `maxlength` 均为 255。前端不实现路径冲突或命中预览，
验收通过受控角色对目标接口与相邻非目标接口的实际访问验证服务端结果。

### 4.4 行政区划树、详情与写操作

~~~mermaid
sequenceDiagram
    actor User as 用户
    participant Tree as ElTree
    participant Page as region.vue
    participant Detail as useRemoteDetail
    participant API as region API

    Tree->>Page: lazy load 根节点
    Page->>API: GET lazy-tree?parentCode=00
    API-->>Page: RegionTreeNode[]
    Page-->>Tree: resolve(nodes)
    User->>Tree: 点击节点 code
    Page->>Detail: load(code)
    Detail->>API: GET detail?code
    API-->>Detail: RegionEntity
    Detail-->>Page: 仅最新详情回填编辑表单
    alt 新增下级
        User->>Page: 新增下级
        Page->>Page: 保存父上下文并创建 add-child 表单
        User->>Page: 输入子编号、名称、等级、排序
    else 编辑
        User->>Page: 修改名称、等级、排序、备注
        Page->>Page: code/subCode 保持只读
    end
    User->>Page: 保存
    Page->>Page: ElForm.validate + 生成 payload
    Page->>API: POST submit
    alt 成功
        API-->>Page: success
        Page->>Page: treeVersion+1, 清选择和详情
    else 失败
        API-->>Page: reject
        Page->>Page: 保留树、表单和模式，恢复提交
    end
~~~

#### 树加载与重试

- `ElTree` 设置 `node-key="id"`、`lazy`，label 为 `title`，`isLeaf` 为 `!hasChildren`。
- 根节点 load 使用 `parentCode=00`，普通节点使用 `node.data.id`。
- 每个请求捕获 `treeVersion`；树重建后旧响应只调用旧实例的 resolve，不写当前详情或失败集合。
- 子节点失败时调用 `resolve([])` 结束 loading，并把父 code 加入 `failedNodeCodes`。
- 节点内容插槽在失败节点旁显示重试图标；重试成功后调用 `treeRef.updateKeyChildren(code, rows)`。
- 根加载失败显示 `ElAlert + 重新加载`；重新加载递增 `treeVersion`，不把空结果当作真实空树。

#### 页面模式

| 模式 | 进入方式 | code/subCode | 允许操作 |
| --- | --- | --- | --- |
| `idle` | 初次进入或写成功 | 空、禁用 | 选择节点、打开调试 |
| `loading` | 点击树节点 | 空、禁用 | 切换节点 |
| `edit` | 详情加载成功 | 显示且只读 | 修改名称、等级、排序、备注；保存或删除 |
| `add-child` | 对有效节点点击新增下级 | 子编号可输入 | 保存新节点、取消并返回父详情 |
| `error` | 当前详情失败 | 空、禁用 | 重试详情或选择其他节点 |

#### 编码与提交

- `parentContext` 保存父节点 `code`、`name`、`level`，不从可编辑表单反推父级。
- `codePrefix = parentCode === '00' ? '' : parentCode`。
- `codePreview = codePrefix + subCode`；完整长度不得超过数据库的 12 字符上限。
- 新增下级 payload 使用 `{ ...form, code: codePreview, parentCode: parentContext.code }`。
- 等级默认 `Math.min(parent.level + 1, 5)`，仍通过 `DictSelect code="region" value-type="number"` 明确展示。
- 编辑 payload 的 code、parentCode 使用已加载详情原值，不读取用户可编辑输入，防止主键或父级变更。
- 名称限制 32 字符，备注限制 255 字符；子编号只校验必填与完整长度，不新增未经确认的纯数字规则。
- 删除只允许 `edit` 模式下针对 `selectedCode`；`add-child` 模式禁用删除，避免误删父节点。
- 后端存在子节点时返回“请先删除子节点”，页面保持当前选择和详情，不提前移除树节点。
- 保存或删除成功统一重建树，清除 selectedCode、parentContext、表单和校验；不做乐观更新。

### 4.5 行政区划级联调试

1. 打开调试弹窗时清空 province/city/district 及三组 options，加载 `getRegionOptions('00')`。
2. 用户选择 province 时立即清空 city、district 及其 options，再加载 `getRegionOptions(province)`。
3. 用户选择 city 时立即清空 district 及其 options，再加载 `getRegionOptions(city)`。
4. district 只选择不触发后续请求。
5. 三组 `useRemoteOptions` 分别维护 loading、failed 和 requestId；快速切换上级时旧响应不会覆盖新选项。
6. 任一级失败在对应选择框 empty slot 提供重试；重试使用当前上级 code。
7. 关闭弹窗调用 3 组 `clear()` 并清空表单，使在途响应失效。

调试功能只观察后端级联数据，不提交、不保存、不写 Store 或浏览器存储。

### 4.6 工具示例页面

#### 表格示例 `util/table.vue`

- 使用 `ListPanel + ElTable + ListPagination`，数据为页面内确定性样例数组。
- 列保留用户名、姓名、申请日期和长文本签名，长文本使用 `show-overflow-tooltip`。
- 当前页数据由 `computed` 根据 currentPage/pageSize 切片，total 等于样例数组真实长度。
- 分页只更新本地 ref，不使用 `usePagedList`，因为没有远程请求和请求状态。
- 不展示或记录密码字段，不提供新增、编辑、删除和导出操作。

#### 表单示例 `util/form.vue`

- 使用 `BasicContainer + ElForm`，字段为用户名、密码、确认密码、申请日期和个性签名。
- 用户名、密码、确认密码为必填；确认密码通过本地 validator 与 password 相等。
- “验证”只执行 `formRef.validate()` 并显示本地成功消息，不发送请求。
- “重置”调用 `resetFields()`；验证成功后不持久化内容，并立即清空两个密码字段。
- 页面卸载时表单随组件销毁，不写 localStorage、sessionStorage 或 Store。

#### 权限示例 `util/permission.vue`

- 使用 `ElSwitch` 控制本地 `actionsEnabled`，可见标签明确为“显示操作按钮”。
- 使用 `ListPanel + ElTable` 展示两条本地数据；开启时显示新增和删除按钮，关闭时按钮不渲染。
- 删除按钮只展示本地提示，不修改样例数组，避免示例被误认为真实授权或数据管理。
- 删除对外 Avue 文档链接和 Avue permission 对象，不读取真实用户权限。

### 4.7 异常与边界流程

| 场景 | 处理位置 | 处理方式 | HTTP/错误码 | 数据是否改变 |
| --- | --- | --- | --- | :---: |
| 未登录或会话失效 | `axios.ts` | 沿用 401 清理和登录流程 | 401 | 否 |
| 菜单根请求失败 | `scope-menu-browser` | loading 结束、失败提示、保留查询和重试 | 现有接口错误 | 否 |
| 菜单子节点失败 | `scope-menu-browser` | resolve 空数组结束 loading，记录节点并提供显式重试 | 现有接口错误 | 否 |
| 抽屉菜单已切换 | 页面上下文校验 | 丢弃旧规则响应，不更新列表 | 内部过期结果 | 否 |
| 规则详情失败 | `useRemoteDetail`/FormDialog | 清旧详情、禁提交、允许关闭或重试 | 现有接口错误 | 否 |
| 规则字典失败 | DictSelect | 清选项、禁提交依赖字段、empty slot 重试 | 现有接口错误 | 否 |
| 规则保存或删除失败 | 页面提交函数 | 保留表单/选择，恢复锁，不显示成功 | 现有接口错误 | 后端事务决定 |
| 数据权限切离自定义 | payload 转换 | `scopeValue` 写空字符串 | 不适用 | 提交成功后改变 |
| 区划根或子树失败 | region 页面 | 显示失败节点和重试，不改为叶子 | 现有接口错误 | 否 |
| 区划详情乱序 | `useRemoteDetail` | 仅最新 code 回填 | 内部过期结果 | 否 |
| 区划存在子节点时删除 | 后端 RegionService | 返回“请先删除子节点”，前端保留状态 | 业务错误 | 否 |
| 区划写请求失败 | region 页面 | 保留树和表单，恢复提交锁 | 现有接口错误 | 后端事务决定 |
| 级联选项失败 | `useRemoteOptions` | 清空失败级及全部下级，允许重试 | 现有接口错误 | 否 |
| 示例页输入或操作 | 示例页面 | 只修改内存状态，不发业务请求 | 不适用 | 否 |

### 4.8 事务、并发与幂等

| 操作 | 事务边界 | 前端并发控制 | 幂等/重复策略 |
| --- | --- | --- | --- |
| 菜单根/子节点查询 | 单次 GET | rootRequestId、treeVersion、失败节点集合 | 可重复；旧上下文丢弃 |
| 权限规则列表/详情 | 单次 GET | usePagedList/useRemoteDetail + menuContextVersion | 可重复；仅最新上下文生效 |
| 权限规则新增 | 后端单次 `/submit` | 表单提交锁，抽屉禁止关闭 | 非幂等；一次用户动作只发一次 |
| 权限规则编辑 | 后端单次 `/submit` | 表单提交锁和当前 menuId 覆盖 | 近似幂等；以后端结果为准 |
| 权限规则删除 | 后端逻辑删除 | 删除锁、确认、选择快照 | 重复删除由后端决定 |
| 区划保存 | 后端 `RegionService.submit` | 单提交锁、编辑 code 不可变 | 新增非幂等；重复 code 可能转为更新，禁止自动重试 |
| 区划删除 | 后端 `removeRegion` | 当前 selectedCode 快照和确认 | 重复删除由后端决定 |
| 工具示例 | 无持久化 | 不适用 | 刷新页面恢复初始值 |

前端不自动重试任何写请求。网络超时后不得根据页面状态推断写入失败，用户重试前应刷新对应规则列表或区划树。

## 5. 后端设计

### 5.1 路由、模型与服务

本阶段不修改 SpringBlade 后端。详细设计以当前 Controller、实体、Service 和数据库契约为兼容边界。

| 模块 | 路由/服务 | 现有模型 | 本阶段使用方式 |
| --- | --- | --- | --- |
| 菜单 | `MenuController.lazyMenuList` / `IMenuService` | `MenuVO` | 只读取 category=1 的懒加载菜单与 hasChildren |
| 数据权限 | `DataScopeController` / `IDataScopeService` | `DataScope`、`DataScopeVO` | 按 menuId 分页、详情、submit、逻辑删除 |
| API 权限 | `ApiScopeController` / `IApiScopeService` | `ApiScope`、`ApiScopeVO` | 按 menuId 分页、详情、submit、逻辑删除 |
| 行政区划 | `RegionController` / `IRegionService` | `Region`、`RegionVO` | 懒加载树、详情、submit、删除、下拉列表 |
| 字典 | 现有 dictionary 接口 | `DictionaryItem` | 读取 data_scope_type、api_scope_type、region |

后端不新增请求/响应模型、服务函数或数据库字段。数据/API 权限的 `/submit` 会清理现有系统缓存；区划
`removeRegion` 在存在直接子节点时拒绝删除；这些现有副作用由前端准确反馈，不做替代实现。

### 5.2 认证与数据归属

- 是否需要登录：是，所有请求通过现有 `@/axios` 携带认证上下文。
- 数据/API 权限：Controller 类级 `@PreAuth(RoleConstant.HAS_ROLE_ADMIN)`，服务端要求管理员角色。
- 菜单懒加载：方法级管理员校验。
- 行政区划：当前 Controller 未声明操作级 `@PreAuth`；本阶段不修改后端，发布前必须核实网关及实际部署保护。
- 权限规则归属：通过 `menuId` 关联平台菜单，不由租户选择器改写。
- 区划归属：平台级基础数据，通过 `code/parentCode` 建立层级。
- 客户端不得修改：编辑态区划 code/parentCode、规则列表当前 menuId。
- 前端按钮控制不是安全边界，接口最终授权仍由 SpringBlade 后端负责。

### 5.3 查询、删除与错误

- 菜单懒加载：只返回未删除且 category=1 的菜单，按 sort 排序；name/code 使用后端现有模糊查询。
- 权限规则列表：MyBatis Plus 按传入实体条件分页；前端只发送 menuId、scopeName、resourceCode 白名单。
- 权限详情：按 id 查询；响应为空时按现有统一响应处理，不显示旧详情。
- 权限删除：使用逻辑删除并清理系统缓存；批量 ID 为逗号分隔字符串。
- 区划树：parentCode 精确限制当前层，返回 id/title/value/key/hasChildren。
- 区划详情：按 code 查询并由 wrapper 回填 parentName。
- 区划新增：服务端写 ancestors 及对应层级 code/name；前端不得伪造这些派生字段。
- 区划删除：存在直接子节点时抛出业务错误；前端不预先递归删除。
- 对外错误：继续使用 Blade 统一响应和 Axios 统一提示，不在页面输出后端堆栈或完整请求体。

## 6. API 契约

### 6.1 接口清单

| 方法 | 路径 | 用途 | 关键参数 | 访问条件 | 变更类型 |
| --- | --- | --- | --- | --- | --- |
| GET | `/blade-system/menu/lazy-menu-list` | 懒加载菜单 | parentId、name、code | admin | 不变，补前端类型 |
| GET | `/blade-system/data-scope/list` | 数据权限分页 | current、size、menuId、scopeName、resourceCode | admin | 不变，补前端类型 |
| GET | `/blade-system/data-scope/detail` | 数据权限详情 | id | admin | 不变，补前端类型 |
| POST | `/blade-system/data-scope/submit` | 新增或修改数据权限 | DataScope JSON | admin | 不变，补前端类型 |
| POST | `/blade-system/data-scope/remove` | 删除数据权限 | ids query | admin | 不变，补前端类型 |
| GET | `/blade-system/api-scope/list` | API 权限分页 | current、size、menuId、scopeName、resourceCode | admin | 不变，补前端类型 |
| GET | `/blade-system/api-scope/detail` | API 权限详情 | id | admin | 不变，补前端类型 |
| POST | `/blade-system/api-scope/submit` | 新增或修改 API 权限 | ApiScope JSON | admin | 不变，补前端类型 |
| POST | `/blade-system/api-scope/remove` | 删除 API 权限 | ids query | admin | 不变，补前端类型 |
| GET | `/blade-system/region/lazy-tree` | 懒加载区划树 | parentCode | 已登录，实际角色校验待核实 | 不变，补前端类型 |
| GET | `/blade-system/region/detail` | 区划详情 | code | 已登录，实际角色校验待核实 | 不变，补前端类型 |
| POST | `/blade-system/region/submit` | 新增或修改区划 | Region JSON | 已登录，实际角色校验待核实 | 不变，补前端类型 |
| POST | `/blade-system/region/remove` | 删除区划 | id query | 已登录，实际角色校验待核实 | 不变，补前端类型 |
| GET | `/blade-system/region/select` | 区划下级选项 | code，默认 00 | 已登录，实际角色校验待核实 | 不变，新增前端包装 |
| GET | `/blade-system/dict/dictionary` | 规则类型与区划等级 | code | 已登录 | 不变 |

### 6.2 分页与查询契约

数据权限和 API 权限列表统一解析：

~~~json
{
  "code": 200,
  "data": {
    "records": [],
    "total": 0
  },
  "msg": "操作成功"
}
~~~

- current、size 来自 `usePagedList.page`。
- `menuId` 必须来自当前只读菜单上下文，不允许由搜索表单输入。
- 查询白名单仅 `scopeName`、`resourceCode`；空字符串提交前转换为 undefined。
- 后端默认排序保持现状，前端不发送未经支持的 sort 参数。
- 分页切换使用最后一次已执行子表查询，不读取菜单搜索表单。

### 6.3 数据权限接口模型

前端页面局部类型：

~~~ts
interface DataScopeEntity {
  id: string;
  menuId?: string;
  resourceCode?: string;
  scopeName?: string;
  scopeField?: string;
  scopeClass?: string;
  scopeColumn?: string;
  scopeType?: number;
  scopeValue?: string;
  scopeTypeName?: string;
  remark?: string;
}

interface ScopeQuery {
  scopeName?: string;
  resourceCode?: string;
}
~~~

- 新增与修改均 POST JSON 到 `/submit`，不改变现有路径。
- payload 的 menuId 总是被当前上下文覆盖。
- `scopeType` 必须为数字 1 至 5；字典标签只用于展示。
- `scopeValue` 类型 1 至 4 发送空字符串，类型 5 原样发送用户输入。
- `scopeClass`、`scopeColumn` 和 `scopeField` 不做 SQL/类名解析，后端负责最终有效性。
- `/remove` 使用 `params: { ids }`，不放请求体。

### 6.4 API 权限接口模型

~~~ts
interface ApiScopeEntity {
  id: string;
  menuId?: string;
  resourceCode?: string;
  scopeName?: string;
  scopePath?: string;
  scopeType?: number;
  scopeTypeName?: string;
  remark?: string;
}
~~~

- 新增与修改均 POST JSON 到 `/submit`。
- `scopeType` 必须为数字 1 或 2。
- `scopePath` 原样发送，不进行 URL 解码、补前缀、大小写变化或尾斜杠处理。
- `/remove` 使用逗号分隔 ids 查询参数。

### 6.5 行政区划接口模型

~~~ts
interface RegionTreeNode extends TreeNode {
  id: string;
  parentId?: string;
  title: string;
  value?: string;
  key?: string;
  hasChildren?: boolean;
  children?: RegionTreeNode[];
}

interface RegionEntity {
  code: string;
  parentCode: string;
  parentName?: string;
  name: string;
  level: number;
  sort: number;
  remark?: string;
}

interface RegionOption {
  code: string;
  name: string;
}
~~~

- `/lazy-tree` 响应是 `RegionTreeNode[]`，不是分页结果，不伪造 total。
- `/detail` 查询参数名为 code；`/remove` 查询参数名仍为 id。
- `/submit` 的新增 payload 只发送用户可编辑字段和 code/parentCode，不回传 ancestors 或省市区派生字段。
- 顶级省份示例：`code='11'`、`parentCode='00'`；`00` 不拼入 code。
- `/select` 只传当前上级 code，响应映射 label=name、value=code。

### 6.6 前端 API 文件调整

`src/api/system/scope.ts` 保留一个模块文件，但统一命名并补泛型响应：

- `getDataScopeList<T>(current, size, params)`
- `getDataScopeDetail<T>(id)`
- `addDataScope(row)`
- `updateDataScope(row)`
- `removeDataScope(ids)`
- `getApiScopeList<T>(current, size, params)`
- `getApiScopeDetail<T>(id)`
- `addApiScope(row)`
- `updateApiScope(row)`
- `removeApiScope(ids)`

新增与修改后端共用 `/submit`，前端仍按仓库约定保留 add/update 语义函数，两者只复用相同路径。
当前旧导出只被两个待迁移页面引用，可在同批次直接更新调用方，不保留无使用方的别名。

`src/api/base/region.ts` 保留现有路由并补类型，新增 `getRegionOptions<T>(code)` 包装 `/select`。未被页面消费的
`getList` 不因本次迁移顺手删除。

## 7. 前端设计

### 7.1 目录结构

~~~text
src/
├── components/
│   └── form-dialog/main.vue                   # 增加可选确认禁用态
├── api/
│   ├── base/region.ts                         # 补类型与区划选项包装
│   └── system/scope.ts                        # 统一权限接口命名与类型
└── views/
    ├── authority/
    │   ├── components/
    │   │   └── scope-menu-browser.vue         # 模块内菜单懒加载浏览器
    │   ├── apiscope.vue                       # API 权限规则页
    │   └── datascope.vue                      # 数据权限规则页
    ├── base/
    │   └── region.vue                         # ElTree + ElForm 区划页
    └── util/
        ├── form.vue                           # 本地 Element Plus 表单示例
        ├── permission.vue                     # 本地按钮权限示例
        └── table.vue                          # 本地 Element Plus 表格示例
~~~

不新增 `src/option/`、CRUD mixin 或全局注册组件。`scope-menu-browser` 仅服务 authority 下两个页面，暂不提升到
`src/components/`。

`FormDialog` 新增 `confirmDisabled?: boolean`，默认值为 false，确认按钮使用
`disabled="submitting || confirmDisabled"`。该变更向后兼容现有页面；实现后需要回归至少一个现有新增/编辑页面，
确认默认确认按钮行为不变。

### 7.2 `scope-menu-browser`

#### 对外契约

| 属性/事件 | 类型 | 说明 |
| --- | --- | --- |
| `title` | string | “数据权限菜单”或“API 权限菜单” |
| `canConfigure` | boolean | 控制配置按钮；默认 false |
| `configure` | `(menu: ScopeMenuEntity) => void` | 返回当前行只读菜单数据 |

组件内部 `ScopeMenuEntity` 只声明 `id`、`name`、`code`、`path`、`source`、`sort`、`hasChildren` 和 children。
列表列为菜单名称（含历史图标）、菜单编号、路由地址、排序和操作。组件没有新增、编辑、删除菜单入口。

#### 内部状态

| 状态 | 类型 | 清理时机 |
| --- | --- | --- |
| `searchForm/executedQuery` | `{ name?: string; code?: string }` | 重置或组件卸载 |
| `rootRows` | `ScopeMenuEntity[]` | 查询、重置或根请求成功 |
| `rootLoading/rootFailed` | boolean | 每次根请求结束 |
| `failedNodeIds` | `Set<string>` | 树重建或节点重试成功 |
| `rootRequestId` | number | 每次根请求递增 |
| `treeVersion` | number | 查询、重置、刷新递增，绑定 table key |
| `tableRef` | `TableInstance` | 组件卸载 |

查询提交先复制白名单到 executedQuery，再重建树。刷新保留 executedQuery，重建树并重新加载根节点。配置按钮
disabled 条件为根 loading 或目标行缺少 id；点击前再次检查 canConfigure。

### 7.3 权限页面状态结构

两个页面各自维护下列状态，不通过 Store 或共享单例跨页面保存：

| 状态 | 所有者 | 说明 |
| --- | --- | --- |
| `drawerVisible` | 页面 | 当前规则抽屉可见性 |
| `activeMenu` | 页面 | `{ id, name, code }` 只读快照 |
| `menuContextVersion` | 页面 | 打开、切换、关闭均递增 |
| `searchForm` | 页面 | 子表未执行搜索草稿 |
| `data/query/page/loading` | `usePagedList` | 当前菜单已执行查询与分页 |
| `selectedRows/ids` | `useTableSelection` | 当前规则选择 |
| `mode/form/formRef` | 页面 | 规则表单模式和输入 |
| `detail` | `useRemoteDetail` | 当前规则详情和失败状态 |
| `submitting/deleting` | 页面 | 保存和删除的独立执行锁 |

`openDrawer(menu)` 的固定顺序：递增版本、复制 activeMenu、清空 detail/form/selection、重置 query/page/data/total、
显示抽屉、加载第一页。`closeDrawer()` 在提交或删除期间拒绝关闭，否则递增版本并清空全部状态。

`usePagedList` fetcher 在请求前捕获 `contextVersion` 和 `menuId`，请求成功后再次校验。校验失败抛出仅供本地吞掉的
过期上下文错误；该错误不使用 `ElMessage`。页面普通失败仍由 Axios 统一提示。

### 7.4 数据权限页面

页面结构：`scope-menu-browser` + `ElDrawer` + 抽屉内 `SearchPanel/ListPanel/ElTable/ListPagination` +
`FormDialog/ElForm`。

权限处理：

- `canConfigure` 读取 `store.getters.permission.data_scope_setting` 并使用 `validData(..., false)`。
- 无权限时不渲染配置按钮；`openDrawer`、保存和删除前再次检查当前值。
- 抽屉 CRUD 不使用 `menu_add/edit/delete/view`，因为页面不维护菜单。
- 后端 DataScopeController 的 admin 校验是最终边界。

表格列：序号、权限名称、权限编号、权限字段、规则类型、操作；可见字段、类名、规则值和备注进入查看/编辑表单。
规则类型使用 `DictTag`。批量删除按钮只在有配置权限时显示，空选择直接提示。

表单布局在桌面两列，`scopeClass`、`scopeValue`、remark 使用整行；查看模式全部禁用。详情或字典加载失败时展示
不可关闭的错误 Alert，禁用确认按钮并保留关闭/重试入口。

### 7.5 API 权限页面

结构、上下文和权限处理与数据权限一致，入口权限改为 `api_scope_setting`。表格列为序号、权限名称、权限编号、
权限路径、接口类型、操作。表单字段为权限名称、权限编号、权限路径、接口类型和备注。

权限路径使用普通文本输入并设置 `maxlength=255`；不使用 URL input 自动规范化。列表和表单的接口类型均复用
`api_scope_type` 字典及数字值。

### 7.6 行政区划页面

页面使用一个 `basic-container` 承载工具栏和响应式双栏，不再嵌套多个卡片：

- 左栏：标题、树级 loading/失败状态、`ElTree` 和节点失败重试。
- 右栏：当前模式提示、`ElForm`、保存/取消操作。
- 顶部工具栏：新增下级、删除、调试；按 `region_add/delete/debug` 显示。
- 调试弹窗：省、市、区 3 个 ElSelect，正文独立滚动。

Element Plus 实例使用 `ref<InstanceType<typeof ElTree>>()` 和 `ref<InstanceType<typeof ElForm>>()`。页面不再使用
`findColumn`、Avue option、动态 `dicUrl` 或 Avue 表单回调。

点击树节点时立即清 `parentContext` 和旧 form，并进入 loading。新增下级仅在详情成功且有 add 权限时可用。
取消 add-child 时重新加载父 code 的详情；取消 edit 时用当前 detail 重建表单，不请求后端。

### 7.7 工具示例页面

示例页继续使用 `<script setup lang="ts">`，只定义最小局部类型和内存数据。三页不抽取公共示例组件，不加入
API、Store、权限 getter、远程字典或持久化。标题、字段和按钮保持紧凑后台风格，不显示 Avue 文档链接。

若评审后决定下线某一示例页，必须先提供部署菜单核查证据并同步删除对应动态菜单；在此之前以本设计的保留替换
方案实施。

### 7.8 状态、缓存与请求

| 状态/数据 | 存放位置 | 获取方式 | 失效条件 |
| --- | --- | --- | --- |
| 菜单根与 lazy children | scope-menu-browser/ElTable | getLazyMenuList | 查询、重置、刷新、组件卸载 |
| 菜单失败节点 | scope-menu-browser Set | 子节点请求 catch | 重试成功或树重建 |
| 当前菜单 | 权限页面 ref | configure 事件 | 抽屉关闭或切换菜单 |
| 权限规则列表 | usePagedList | data/api scope list | 菜单切换、关闭、写成功 |
| 权限规则选择 | useTableSelection | ElTable selection | 列表更新、关闭、删除成功 |
| 权限规则详情 | useRemoteDetail | detail API | 目标切换、表单关闭、抽屉关闭 |
| 字典 | useDictionary 会话缓存 | dictionary API | 请求失败不缓存；页面不主动失效 |
| 区划 lazy tree | ElTree 实例 | getLazyTree | treeVersion 重建或页面卸载 |
| 区划详情 | useRemoteDetail | getDetail | 节点切换、写成功、页面卸载 |
| 省市区选项 | 3 组 useRemoteOptions | getRegionOptions | 上级变化、弹窗关闭 |
| 示例数据 | 页面内 ref/computed | 本地常量 | 页面卸载或刷新 |

不新增 localStorage、sessionStorage、IndexedDB 或 Vuex 状态。401 继续由现有 Axios 和路由守卫处理。

### 7.9 样式、响应式与可访问性

- 使用 `--saber-surface`、`--saber-border`、`--saber-text-primary`、`--saber-text-secondary` 和 Element Plus
  状态 Token，不硬编码主题色。
- 目标页不新增 `.avue-*`、`.ant-*` 或针对第三方内部 DOM 的大范围 `:deep()`。
- 权限抽屉 size 使用 `min(1000px, 100vw)`；正文为纵向 flex，规则列表区域可横向滚动。
- 1440px 完整展示主列；1024px 表格允许横向滚动；375px 搜索单列、工具栏换行、分页隐藏 total/sizes/jumper。
- 行政区划在大于 767px 使用 `minmax(260px, 32%) minmax(0, 1fr)` 双栏；375px 改为上下布局。
- 区划树区域使用 `max-height: min(680px, calc(100vh - 220px))` 和独立滚动，不固定 800px 页面高度。
- FormDialog 和 ElDrawer 在 loading/submit 时保持 header/footer 可见，正文独立滚动。
- 刷新、重试等图标按钮带 tooltip 与 aria-label；规则配置按钮保留文字。
- 菜单/区划树支持键盘聚焦与展开；抽屉、Dialog 的关闭和确认遵循提交锁。
- 示例表单 label 与控件关联，权限开关有可见标签，不用颜色作为唯一状态表达。

## 8. 数据库、配置与发布影响

| 影响项 | 是否涉及 | 说明 | 关联文档 |
| --- | :---: | --- | --- |
| 新表/改表/约束/索引 | 否 | 使用现有 blade_scope_data、blade_scope_api、blade_region | 不适用 |
| 数据迁移/回填 | 否 | 历史规则、路径和区划编码原样读取 | 不适用 |
| 字典数据 | 否 | 继续使用 data_scope_type、api_scope_type、region | 不适用 |
| 环境变量/配置 | 否 | 不改变 API、代理、端口、认证和租户配置 | 不适用 |
| 依赖/锁文件 | 否 | Avue 与其他现有依赖均不变 | 不适用 |
| 部署顺序/兼容 | 是 | 按 4A 至 4E 分批；前后端无需联动发布 | 本文 10 节 |

本阶段不创建数据库设计文档。测试产生的数据权限、API 权限和区划记录必须使用唯一前缀或专用 code，并在测试
文档中列出精确清理范围；不得修改或删除共享生产规则和真实行政区划数据。

## 9. 安全、测试与可观测性

### 9.1 认证与安全要求

| 检查项 | 设计 |
| --- | --- |
| 身份认证 | 全部请求复用 `@/axios` 的 Basic、Blade Token、Cookie 和 401 流程 |
| 数据/API 权限 | 前端入口 `*_scope_setting`，后端 Controller admin 校验最终授权 |
| 区划权限 | 前端沿用 region_add/delete/debug；后端操作级边界待安全评审确认 |
| 菜单绑定 | menuId 只取当前只读 context，搜索和表单不能任意改写 |
| 数据权限输入 | 不在日志输出 scopeClass、scopeValue 或完整 payload；服务端负责执行语义 |
| API 路径 | 不自动规范化，避免改变现有匹配结果；测试覆盖相邻非目标路径 |
| 区划层级 | code/parentCode 由模式和上下文生成，编辑不能改主键或父级 |
| 示例数据 | 仅本地非敏感假数据，不保存密码或调用业务接口 |
| 敏感信息 | 测试截图、日志和文档不得记录 Token、密码、完整自定义规则值或越权响应正文 |

权限规则保存会清理系统缓存，可能影响在线角色。测试环境必须提供隔离角色、菜单和规则；没有隔离条件时相关
写操作与实际权限 AC 标记阻塞，不得在共享数据上试验。

### 9.2 测试矩阵

仓库当前没有单元测试、E2E 或 lint 脚本，本设计不新增测试基础设施。当前需求仍处于设计中，本次不创建测试
文档；以下矩阵用于评审设计的可验收性，并在后续实际触发测试文档编写条件时作为覆盖输入。

| 场景 | 层级 | 关键断言 | 关联需求 |
| --- | --- | --- | --- |
| 目标页静态迁移 | 静态检索 | 6 页无 avue-crud/form/tree、Avue import/option 和 `.avue-*` 定向样式 | AC-001、AC-002、AC-006 |
| Avue 兼容边界 | 静态/浏览器 | 依赖和范围外专项组件仍可运行 | AC-003、AC-048 |
| 示例处置 | 文档/浏览器 | 3 页保留替换或有批准下线证据，无断链 | AC-004、AC-005、AC-039 至 AC-044 |
| 菜单根与懒加载 | 浏览器/网络 | parentId、层级、hasChildren、查询和节点重试正确 | AC-007、AC-008 |
| 抽屉上下文竞态 | 浏览器/网络 | 标题、menuId、菜单 A/B 乱序和重开清理正确 | AC-009 至 AC-012 |
| 数据权限新增默认 | 浏览器/网络 | 类型 1 至 5 的数字值和默认字段正确 | AC-013 至 AC-016 |
| 数据权限详情/保存/删除 | 浏览器/网络 | 详情不被默认值覆盖，当前 menuId、失败恢复和选择正确 | AC-017 至 AC-020 |
| 数据权限实际结果 | 多角色浏览器 | 正反向数据范围符合规则，无范围扩大 | AC-021、AC-046 |
| API 权限 CRUD | 浏览器/网络 | 分页、数字类型、必填、路径原值、menuId 和删除正确 | AC-022 至 AC-028 |
| API 权限实际结果 | 多角色浏览器 | 目标接口允许、相邻接口拒绝，无宽匹配回归 | AC-029、AC-046 |
| 区划树与详情 | 浏览器/网络 | 根 00、多级节点、hasChildren、失败重试和乱序正确 | AC-030、AC-031 |
| 区划新增/编辑/删除 | 受控数据浏览器 | 选择校验、编码、层级、写成功刷新和失败恢复正确 | AC-032 至 AC-037 |
| 区划级联调试 | 浏览器/网络 | 省市区上级变化清值、重载和失败重试正确 | AC-038 |
| 未授权访问 | 多权限浏览器 | 按钮隐藏且服务端拒绝越权 | AC-045 |
| 跨阶段回归 | 浏览器 | 前三阶段查询、树、授权、上传下载和动态路由不受影响 | AC-047 |
| 视口、主题、键盘 | 浏览器截图/人工 | 1440/1024/375、浅深/自定义主色、焦点和弹层可用 | AC-049 至 AC-051 |
| 工程门禁 | 命令 | type-check 与 build:prod 成功，无依赖变化 | AC-052、AC-053 |
| 单页回滚 | Git/浏览器 | 每个生产页可恢复且其他迁移页不需同步回滚 | AC-054 |

数据/API 权限写用例默认串行，不与角色授权或同一菜单规则测试并行。区划写用例只允许操作专用父节点下由本次
测试创建的数据，并先验证子节点清理顺序。工具示例用例可在独立浏览器上下文并行执行。

### 9.3 日志、指标与性能

- 不新增前端埋点、后端日志、指标或告警。
- 禁止新增 `console.log`；普通接口错误由 Axios 处理，页面不记录实体、规则或认证头。
- 浏览器网络面板验证每次根查询、节点展开、规则分页和级联选择只产生一次有效请求。
- 菜单与区划继续按节点懒加载，不请求整棵树；规则列表按页加载。
- failedNodeIds/failedNodeCodes 随树重建清空，页面卸载时不保留节点和响应引用。
- 工具示例不产生业务网络请求；第三方静态资源请求不应由本次改动新增。
- 本阶段不承诺后端响应时间；若真实树规模导致明显卡顿，另评审虚拟树或服务端搜索契约。

### 9.4 当前设计与验证状态

| 设计项 | 当前状态 | 已完成证据 | 待完成 |
| --- | --- | --- | --- |
| 范围与边界 | 已实现 | 已按 REQ-2026-004 v0.3 完成 3 个生产页、3 个示例页且保留范围外 Avue | 产品、前端和测试评审 |
| 菜单与规则状态 | 已实现，待业务验收 | 已实现 lazy-menu-list、上下文版本、节点重试、独立查询和规则状态清理 | 在真实菜单数据上验证懒加载、切换和失败恢复 |
| 数据权限 | 已实现，存在待确认项 | 已实现 5 类数字字典、默认映射、当前菜单覆盖、非自定义值清空和 CRUD | 确认自定义规则值契约并执行受控正反向权限验证 |
| API 权限 | 已实现，存在安全风险 | 已实现 2 类数字字典、路径原值、当前菜单覆盖和 CRUD | 评审路径匹配风险并执行目标/非目标接口验证 |
| 行政区划 | 已实现，存在权限待确认项 | 已实现根 00、12 字符上限、层级 0 至 5、编辑 code 锁定、树重建和三级调试 | 确认后端鉴权并使用受控数据验证写流程 |
| 工具示例 | 已按默认方案实现 | 3 页保留原路径并替换为无请求的 Element Plus 本地示例 | 核对部署动态菜单并完成多视口浏览器确认 |
| 测试与工程 | 常规检查完成 | 静态扫描和类型检查通过；Node 22 production 构建通过 | 默认 Node 24 构建崩溃待处理；详细浏览器、安全、主题、权限和业务测试未执行 |

本轮已按设计修改 `.ts`、`.vue` 并完成常规工程检查。由于用户明确要求不做详细测试，真实权限、区划写入、主题、
多视口、键盘和跨阶段回归均未执行，页面状态保持 `PILOTING`，需求索引保持“开发中”；不得据此标记已验收。

### 9.5 实施结果与偏差

- 新增 `authority/components/scope-menu-browser.vue`，两个权限页共用菜单查询、ElTable lazy、失败节点重试和配置事件。
- 数据权限与 API 权限页已完整移除 Avue CRUD/Form，规则列表复用分页、详情、选择和字典能力；提交强制覆盖当前菜单 ID。
- 行政区划页已使用 ElTree、ElForm 和 3 组独立远程选项，编辑态 code/parentCode 取详情原值，写成功后重建树。
- 3 个 util 页面因无批准下线结论而保留路径替换；示例不发业务请求、不写存储、不展示或保留密码数据。
- `FormDialog` 新增默认 false 的 `confirmDisabled`；`DictSelect` 增加加载成功事件，使字典重试成功后父表单恢复确认能力。
- 实现未改变后端接口、认证、多租户、依赖或 Avue 全局注册。数据库设计仍为“不涉及”。
- 与设计的验证计划相比，本轮只执行常规检查；完整 AC、安全和浏览器验收延期到正式测试阶段。

验证结果：`pnpm run type-check` 通过；目标页与全部 `src/views` 的 Avue CRUD/Form/Tree 活动标签扫描无结果；
`git diff --check` 通过。默认 Node.js 24.11.1 执行 `pnpm run build:prod` 在模块转换后以 Windows 进程码
`3221226505` 退出；使用已安装 Node.js 22.3.0 执行同等 `vite build --mode production` 成功，仅有既有 CSS、
动态/静态导入和 chunk 体积警告。

## 10. 发布与回滚

### 10.1 迁移与发布

1. 评审需求与本设计，确认自定义规则值、API 路径风险、区划鉴权和示例页保留方案。
2. 实现并验证 `scope-menu-browser`，只接入只读菜单浏览和配置事件。
3. 迁移数据权限页，在隔离菜单/角色下验证类型默认、CRUD、缓存影响和正反向数据范围。
4. 迁移 API 权限页，在隔离菜单/角色下验证路径原值、CRUD 和目标/非目标接口访问。
5. 迁移行政区划页，使用专用父节点验证树重试、详情、编码、删除约束和三级调试。
6. 保留原路径迁移 3 个工具示例，确认不发业务请求且动态菜单无断链。
7. 静态检索 6 页的 Avue CRUD/Form/Tree、option、import 和定向样式引用。
8. 执行 `pnpm run type-check`、`pnpm run build:prod`、多视口/主题/键盘验证及前三阶段回归。
9. 按实际阶段同步需求、设计、测试（如已触发建档）和索引的版本、状态、验证结果与变更记录。
10. 全部 Must 验收和正式评审通过后才能更新为“已验收”。

页面迁移继续使用原文件和动态菜单路径，不并行保留第二个生产入口。权限配置与区划写操作批次默认串行发布，
示例页面可与生产页代码同版本交付，但不能替代生产页验收。

### 10.2 回滚与恢复

- 触发条件：权限规则跨菜单、访问范围扩大、区划层级/编码错误、动态菜单断链、范围外 Avue 页面回归、类型或构建失败。
- 代码回滚：`scope-menu-browser` 先回滚两个使用方，再删除组件；各生产页和示例页可按原文件独立回滚。
- API 回滚：若 API 包装重命名随页面回滚，必须同步恢复调用方；后端接口无变化。
- 配置回滚：不适用，无新配置和依赖。
- 数据库 downgrade：不适用，无数据库变化。
- 权限数据：前端回滚不能撤销已保存规则；测试或发布前记录原规则，由授权管理员通过现有接口恢复。
- 区划数据：前端回滚不能恢复新增、编辑或删除结果；测试只使用可清理节点，删除前记录父子和字段快照。
- 缓存影响：权限规则提交已触发服务端缓存清理，代码回滚后仍需重新验证受控角色访问。
- 回滚验证：原菜单可进入旧 Avue 页面，权限规则和区划详情与服务端一致，范围外 Avue 专项组件正常，工程门禁通过。

## 11. 风险、评审与变更

### 11.1 风险与开放问题

| 编号 | 类型 | 内容 | 负责人 | 状态/结论 |
| --- | --- | --- | --- | --- |
| ITEM-001 | 依赖 | 第三阶段仍有真实业务、权限、主题、构建和缺陷回归待完成 | 技术/测试负责人 | 第四阶段开发前关闭或形成带风险准入 |
| ITEM-002 | 风险 | ElTable lazy 与根查询各自缓存，处理不当会混合旧节点 | 前端负责人 | treeVersion 重建 + rootRequestId + 节点版本校验 |
| ITEM-003 | 风险 | 权限抽屉快速切换菜单可能把旧 records 或详情写入新菜单 | 前端负责人 | menuContextVersion、主动清空和只读 menuId 覆盖 |
| ITEM-004 | 风险 | 数据权限默认字段或旧 scopeValue 可能改变实际 SQL 数据范围 | 前后端/安全负责人 | 显式映射、非自定义写空、隔离角色正反向验证 |
| ITEM-005 | 问题 | 自定义 scopeValue 是否必填及允许格式未由后端验证声明 | 产品/后端负责人 | 本设计按可选原样传递，需求确认前评审 |
| ITEM-006 | 风险 | API 权限服务端包含匹配可能命中相邻路径 | 后端/安全负责人 | 保持原值并测试目标/非目标接口；算法改造另立需求 |
| ITEM-007 | 问题 | 数据/API 权限抽屉内 CRUD 没有独立按钮权限码 | 产品/后端负责人 | 保持 setting 入口 + admin 后端边界，不虚构权限 |
| ITEM-008 | 风险 | 权限提交清理全局系统缓存，测试可能影响共享在线角色 | 测试/运维负责人 | 只使用隔离菜单、规则和角色，默认串行 |
| ITEM-009 | 风险 | RegionController 未体现与 region_* 一致的操作级鉴权 | 后端/安全负责人 | 开发前核实部署保护；不以按钮隐藏替代后端授权 |
| ITEM-010 | 问题 | 旧页面允许编辑子编号，但后端没有安全主键改码契约 | 产品/后端负责人 | 本设计编辑态锁定 code；支持改码需另立后端需求 |
| ITEM-011 | 风险 | 区划写成功后局部 lazy cache 可能保留错误 hasChildren | 前端负责人 | 成功后重建 ElTree，不做局部乐观更新 |
| ITEM-012 | 问题 | 部署数据库可能仍有 3 个 util 示例动态菜单 | 产品/维护负责人 | 默认保留原路径替换，批准后方可下线 |
| ITEM-013 | 兼容 | 第四阶段清除目标页 CRUD/Form 不代表可移除 Avue | 前端负责人 | main、依赖、富文本、data-pay 和主布局保持不变 |
| ITEM-014 | 风险 | 当前仓库无自动化测试，高风险权限和区划写入依赖真实环境 | 测试负责人 | 评审测试矩阵并准备隔离数据；达到建档条件后按仓库流程处理 |

### 11.2 评审结论

| 领域 | 结论 | 评审人 | 日期 | 备注 |
| --- | --- | --- | --- | --- |
| 后端/API | 待评审 | 待定 | 待定 | 确认自定义规则值、区划 code 不可编辑和实际鉴权 |
| 前端 | 待评审 | 待定 | 待定 | 确认模块内菜单组件、懒加载重试、上下文版本和示例方案 |
| 安全与权限 | 待评审 | 待定 | 待定 | 确认 API 路径包含匹配、缓存影响和隔离角色 |
| 数据库/发布 | 不涉及数据库，发布待评审 | 待定 | 待定 | 确认权限规则与区划测试数据恢复方案 |
| 测试 | 待评审 | 待定 | 待定 | 准备隔离菜单/角色、正反向访问和专用区划父节点 |

### 11.3 变更记录

| 日期 | 版本 | 变更内容 | 原因 | 影响 | 修改人 |
| --- | --- | --- | --- | --- | --- |
| 2026-09-02 | 0.1 | 初稿 | 启动 Element Plus 页面迁移第四阶段详细设计 | 3 个生产页、3 个示例页、API、权限、安全、测试和发布方案 | Codex |
| 2026-09-03 | 0.2 | 按设计完成页面实现并记录常规检查 | 用户要求开始实施且不做详细测试 | 页面、API、共享组件、实现偏差、环境限制和待验收项 | Codex |
