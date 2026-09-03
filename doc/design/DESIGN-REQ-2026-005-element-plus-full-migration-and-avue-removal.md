# Saber Element Plus 全量迁移与 Avue 完全移除详细设计文档

## 1. 文档信息

| 项目 | 内容 |
| --- | --- |
| 功能/模块 | Element Plus 全量迁移、Avue 运行时移除、富文本替代、主布局与动态路由清理 |
| 设计编号 | DESIGN-REQ-2026-005 |
| 设计版本 | 0.1 |
| 关联需求 | [需求索引](../requirements-index.md)；[REQ-2026-005 需求 0.2](../requirements/REQ-2026-005-element-plus-full-migration-and-avue-removal.md)；前置设计 [DESIGN-REQ-2026-004](DESIGN-REQ-2026-004-element-plus-migration-phase-4.md)；数据库设计不涉及；测试文档待实现完成后创建 |
| 目标版本/迭代 | Saber 5.x / Element Plus 全量迁移收尾 |
| 文档状态 | 设计中，待评审 |
| 设计负责人 | 待定 |
| 评审人 | 前端、后端、安全、测试、产品按需填写 |
| 最后更新日期 | 2026-09-03 |

## 2. 设计摘要与范围

### 2.1 设计摘要

本设计在第四阶段业务页面迁移完成的基础上，处理最后两个 Avue 专项组件和全部活动兼容代码。公告富文本不切换
编辑器数据模型，而是直接使用现有 `avue-plugin-ueditor` 内部已经采用的 WangEditor 5：把当前锁文件已解析的
`@wangeditor/editor@5.1.23` 与 `@wangeditor/editor-for-vue@5.1.12` 提升为直接依赖，由
`notice-editor.vue` 局部导入。该方案保持现有 HTML 生成内核、表格和媒体节点语义，避免在移除 Avue 的同时再进行
一次内容模型迁移。

富文本读取、只读展示、粘贴和提交前统一经过 `DOMPurify@3.4.14`，白名单与后端
`NoticeHtmlSanitizer` 对齐。图片和视频上传新增 `src/api/resource/file.ts` 包装，继续通过现有 Axios 调用
`POST /blade-resource/oss/endpoint/put-file`，由拦截器注入认证头，不在组件内读取或拼接 Token。服务端已有
OWASP HTML Sanitizer，仍作为最终存储安全边界。

运行时清理采用原子发布链：先替换富文本与 `util/data.vue`，再删除 Avue 全局注册、CRUD mixin/option 和依赖，
最后同步重命名动态路由、主布局 CSS 类、样式入口及当前可见文案。历史需求、设计、测试和 Git 记录保留 Avue
事实；`src`、`package.json` 和 `pnpm-lock.yaml` 形成零引用门禁。

### 2.2 富文本方案评估与结论

评估基于 2026-09-03 的仓库现状与官方项目资料。分值为 1 至 5，5 表示最适合本需求。

| 方案 | 历史 HTML 保真 | Vue 3/TS | 表格与媒体 | 实施成本 | 上游维护 | 本次结论 |
| --- | :---: | :---: | :---: | :---: | :---: | --- |
| 直接 WangEditor 5 | 5 | 4 | 5 | 5 | 2 | 采用；与现有插件同内核，迁移风险最低 |
| Tiptap 3 | 3 | 5 | 3 | 2 | 5 | 暂不采用；需组合扩展、重建工具栏和视频节点并验证 HTML 转换 |
| Quill 2 | 2 | 2 | 2 | 2 | 3 | 不采用；核心以 Delta 为主，官方仓库无 Vue 适配层，历史 HTML 风险较高 |

选择 WangEditor 是本次“移除 Avue”范围内的兼容性决策，不代表长期编辑器标准。官方仓库当前包定义为
`@wangeditor/editor@5.1.23`、MIT 许可，当前项目也已通过旧插件解析相同版本；但其仓库最近代码推送停留在
2024-10-11，维护风险必须显式接受。Tiptap 官方仓库在 2026-09-01 发布 3.31.0，活跃度更高，适合作为未来
独立的富文本现代化需求，但不应与本次零数据迁移目标绑定。Quill 官方核心为 2.0.3、BSD-3-Clause，未提供官方
Vue 组件，需自行维护适配层。

### 2.3 关键决策

| 编号 | 决策 | 原因 | 影响 |
| --- | --- | --- | --- |
| DEC-001 | 以 REQ-2026-005 独立承接全量移除，不修改第四阶段既有范围 | 第四阶段明确保留 Avue 专项能力，直接扩写会破坏历史验收边界 | 新建设计、测试和发布批次 |
| DEC-002 | 富文本直接使用 WangEditor 5.1.23 与 Vue 适配层 5.1.12 | 现有 Avue 插件已使用同一内核，HTML、表格和媒体模型变化最小 | 两个传递依赖变为直接依赖，版本精确锁定 |
| DEC-003 | 新增 DOMPurify 3.4.14，并与后端白名单对齐 | 编辑器不是安全边界，历史数据和只读展示仍需前端防御 | 新增一个运行时依赖和 `noticeHtml.ts` 工具 |
| DEC-004 | 编辑态使用 WangEditor，只读态使用净化后的 HTML viewer | 查看无需创建编辑器实例，可避免只读模式误触发更新 | `notice-editor` 内有 edit/view 两条渲染路径 |
| DEC-005 | 编辑器初始化完成前、上传中或初始化失败时禁用表单确认 | 防止空值覆盖、上传未完成或旧实例回填 | 公告页新增 editorReady/editorFailed/uploading 状态 |
| DEC-006 | 媒体上传经 API 层和现有 Axios，不自行设置认证头或 multipart boundary | 复用统一认证、401 和错误提示，避免 Token 泄漏 | 新增 `src/api/resource/file.ts` |
| DEC-007 | `util/data.vue` 默认保留原路径，改为 Element Plus 能力矩阵 | 无部署菜单下线证据，删除页面会形成动态菜单断链 | 页面只使用本地数据和 Element Plus |
| DEC-008 | `avue-router.ts` 改为 `dynamic-router.ts`，Router 扩展改为 `$dynamicRouter` | 能力本质是动态菜单路由与标签标题，不属于 Avue | 路由、store、permission、布局、示例和类型同步修改 |
| DEC-009 | 主布局类名原子替换为 `saber-*`，不并存双选择器 | 双命名会永久保留兼容层并削弱零引用门禁 | 模板和 SCSS 必须同批次发布 |
| DEC-010 | 删除未渲染的 `wechat.vue`，不迁移 `avue_lock` | 组件仅被注释，实际锁屏使用 Vuex 的 isLock/lockPasswd | 无用户有效状态需要迁移 |
| DEC-011 | 删除 `findColumn`、CRUD mixin/option 和 Avue 专用样式 | 全仓无活动调用方，保留只会形成错误扩展入口 | 删除遗留文件和类型声明 |
| DEC-012 | `element-ui.scss` 改名 `element-plus.scss`，同步清理旧 `el-icon-*` 用法 | 当前 UI 栈已经是 Element Plus，旧命名与图标 API 会继续误导 | 涉及主布局、登录、欢迎页和 dashboard 示例 |
| DEC-013 | 欢迎页中的活动宣传和历史版本文本统一去品牌化 | `src` 零引用要求不允许当前页面继续包含 Avue 字样 | 精确历史仍由 Git 与迁移文档保存 |
| DEC-014 | 保留 `$dayjs`、website、getScreen 等仍有调用方的全局属性 | 它们不是 Avue 依赖，直接删除会扩大主布局重构范围 | 仅删除 window.axios 与 `$crudCommon` |

### 2.4 改动范围

| 层级 | 改动内容 | 不涉及内容 |
| --- | --- | --- |
| 后端 | 无代码改动；核对公告 HTML 清洗和资源上传契约 | Controller、数据库、对象存储实现、认证算法 |
| 依赖 | 新增直接 WangEditor 与 DOMPurify；删除 Avue 与 Avue 富文本插件 | Vue、Element Plus、Axios、Vuex 版本升级 |
| 业务页面 | 替换公告富文本；迁移 `util/data.vue`；更新工具示例和欢迎页文案 | 其他业务字段、接口和权限码 |
| 前端基础 | 动态路由、主布局类名、样式入口、图标和类型声明清理 | Vuex 模块重构、主布局整体 Composition API 改写 |
| 遗留代码 | 删除 CRUD mixin/option、未使用 wechat、Avue 样式和全局对象 | 通用刷新 Token mixin 和仍有调用方的全局能力 |
| 数据库 | 无 | 表、字段、索引和历史 HTML 批量迁移 |
| 配置/部署 | 锁文件和前端产物变化 | 环境变量、代理地址、后端发布顺序 |

## 3. 总体设计

### 3.1 架构图

~~~mermaid
flowchart TB
    subgraph App[应用入口与主布局]
        Main[main.ts]
        Router[dynamic-router.ts]
        Shell[Saber 主布局]
        Styles[Element Plus/Saber 样式]
    end

    subgraph Notice[通知公告]
        NoticePage[notice.vue]
        NoticeEditor[notice-editor.vue]
        Wang[WangEditor 5]
        Purify[noticeHtml.ts / DOMPurify]
        FileApi[resource/file.ts]
    end

    subgraph Demo[工具示例]
        DataPage[util/data.vue]
        Element[Element Plus]
    end

    Main --> Router
    Main --> Shell
    Main --> Styles
    NoticePage --> NoticeEditor
    NoticeEditor --> Wang
    NoticeEditor --> Purify
    NoticeEditor --> FileApi
    FileApi --> Axios[现有 @/axios]
    NoticePage --> NoticeApi[desk/notice.ts]
    NoticeApi --> Axios
    Axios --> Resource[/blade-resource/oss/endpoint/put-file]
    Axios --> Desk[/blade-desk/notice/*]
    Desk --> BackendSanitizer[NoticeHtmlSanitizer]
    DataPage --> Element
~~~

### 3.2 组件职责

| 组件/模块 | 职责 | 输入 | 输出 |
| --- | --- | --- | --- |
| `notice-editor.vue` | 编辑/只读富文本、生命周期、上传状态和 v-model 适配 | modelValue、disabled、rows、placeholder | update:modelValue、ready、error、uploading |
| `noticeHtml.ts` | 统一 HTML 白名单净化、危险 URL 处理和纯文本摘要 | HTML 字符串 | 安全 HTML、摘要文本 |
| `resource/file.ts` | 资源上传 API 包装和响应类型收敛 | File | `BladeFile` |
| `notice.vue` | 详情竞态、表单状态、编辑器状态和提交协调 | 通知列表/详情 | 现有 notice API 请求 |
| `dynamic-router.ts` | 动态组件装配、标题、标签关闭和菜单路径格式化 | MenuItem、Router、Store、i18n | RouteRecord、标题、标签操作 |
| `page/index/*` | Saber 主布局、菜单、标签、搜索和顶部工具 | Vuex 布局状态 | 页面导航与交互 |
| `styles/element-plus.scss` | Element Plus 全局覆盖与共享列表样式 | Saber/Element Plus Token | 全局组件视觉 |
| `util/data.vue` | 本地能力矩阵和详情展示 | 局部常量 | 无副作用交互 |
| `basic-block`/dashboard | Element Plus 图标示例，清除旧 Element UI 图标类 | 图标组件与局部数据 | dashboard 磁贴 |

### 3.3 新增与移除依赖

| 依赖 | 动作 | 用途 | 版本与理由 | 锁文件/部署影响 |
| --- | --- | --- | --- | --- |
| `@wangeditor/editor` | 新增直接依赖 | 富文本核心、表格、图片和视频 | 精确 `5.1.23`；当前锁文件已存在同版本 | 从传递依赖变直接依赖，不升级解析版本 |
| `@wangeditor/editor-for-vue` | 新增直接依赖 | Vue 3 Editor/Toolbar 组件 | 精确 `5.1.12`；当前插件已使用 | 从传递依赖变直接依赖 |
| `dompurify` | 新增直接依赖 | 前端 HTML 白名单与 XSS 防护 | 精确 `3.4.14`；安全依赖固定后单独升级 | 新增锁文件条目，随公告 chunk 加载 |
| `@smallwei/avue` | 删除 | 旧 CRUD/Form/Tree 和数据组件 | 全部活动使用方已替换 | 删除包及大量传递依赖/样式 |
| `avue-plugin-ueditor` | 删除 | 旧富文本包装 | 改为直接使用其内核 | 删除插件及兼容上传代码 |

依赖精确版本用于把“移除 Avue”和“升级编辑器”分离。后续安全或兼容升级必须单独执行历史 HTML、上传和构建回归。

### 3.4 官方资料与评估日期

| 项目 | 官方资料 | 设计使用点 |
| --- | --- | --- |
| WangEditor | [官方仓库](https://github.com/wangeditor-team/wangEditor)；[框架集成](https://www.wangeditor.com/v5/for-frame.html) | Vue 3 组件、编辑器生命周期、HTML 与媒体能力 |
| Tiptap | [官方仓库](https://github.com/ueberdosis/tiptap)；[Vue 3 安装](https://tiptap.dev/docs/editor/getting-started/install/vue3) | 活跃度、无头架构与扩展成本对照 |
| Quill | [官方仓库](https://github.com/slab/quill)；[官方文档](https://quilljs.com/docs/quickstart) | Delta/HTML 与 Vue 适配成本对照 |
| DOMPurify | [官方仓库](https://github.com/cure53/DOMPurify) | 前端 HTML 安全边界 |

资料评估日期为 2026-09-03；实现时若版本或安全公告已变化，必须重新评审并更新本节。

## 4. 核心流程设计

### 4.1 富文本详情、编辑与提交

~~~mermaid
sequenceDiagram
    actor User as 用户
    participant Page as notice.vue
    participant Detail as useRemoteDetail
    participant Editor as notice-editor
    participant Purify as noticeHtml.ts
    participant API as notice API
    participant Backend as NoticeController/Sanitizer

    User->>Page: 打开新增/编辑/查看
    Page->>Page: 重置 form 与 editor 状态
    alt 编辑或查看
        Page->>Detail: load(id)
        Detail->>API: GET /notice/detail
        API-->>Detail: NoticeEntity
        Detail-->>Page: 仅最新 id 详情
    end
    Page->>Purify: sanitize(content)
    alt 查看模式
        Purify-->>Editor: safeHtml
        Editor-->>User: 只读 viewer
    else 新增或编辑
        Purify-->>Editor: initialHtml
        Editor->>Editor: 创建 WangEditor
        Editor-->>Page: ready
        User->>Editor: 编辑内容
        Editor-->>Page: update:modelValue
    end
    User->>Page: 提交
    Page->>Page: 校验 detail/editor/upload/submitting
    Page->>Purify: sanitize(form.content)
    Purify-->>Page: safe payload content
    Page->>API: POST /notice/submit
    API->>Backend: Notice JSON
    Backend->>Backend: 服务端再次 sanitize
    Backend-->>API: success/failure
    alt 成功
        API-->>Page: success
        Page->>Page: 关闭、销毁编辑器、刷新列表
    else 失败
        API-->>Page: reject
        Page->>Page: 保留表单和编辑器内容
    end
~~~

详情页使用现有 `useRemoteDetail` 请求序号避免公告 A/B 乱序。`notice-editor` 不自行请求详情，只消费当前页面传入的
HTML。每次打开弹窗先把 `editorReady=false`、`editorFailed=false`、`uploading=false`，详情返回后再挂载编辑器。
`FormDialog.confirmDisabled` 绑定 `detailFailed || editorFailed || !editorReady || uploading`；查看模式不显示确认按钮。

WangEditor 的程序化赋值与用户输入必须区分。组件内部保存 `lastExternalValue` 和 `settingExternalValue` 标记：父组件
更新 `modelValue` 时净化并设置内部值，但不回发 `update:modelValue`；编辑器 `onChange` 仅在非程序化更新且内容实际
变化时 emit，避免详情初始化形成脏数据或循环更新。

### 4.2 媒体上传流程

~~~mermaid
sequenceDiagram
    actor User as 用户
    participant Editor as WangEditor
    participant Adapter as notice-editor
    participant FileAPI as resource/file.ts
    participant Axios as @/axios
    participant Resource as OssEndpoint

    User->>Editor: 选择图片或视频
    Editor->>Adapter: customUpload(file, insert)
    Adapter->>Adapter: 校验 image/* 或 video/*
    Adapter-->>Page: uploading=true
    Adapter->>FileAPI: uploadFile(file)
    FileAPI->>Axios: FormData(file)
    Axios->>Resource: POST /oss/endpoint/put-file + 认证头
    alt 成功且 link 非空
        Resource-->>Axios: R<BladeFile>
        Axios-->>FileAPI: data.data.link
        FileAPI-->>Adapter: BladeFile
        Adapter->>Editor: insert(link)
    else 请求或响应失败
        Resource-->>Axios: error/invalid payload
        Axios-->>Adapter: reject
        Adapter->>Adapter: 不调用 insert
    end
    Adapter-->>Page: uploading=false
~~~

组件使用计数器而不是布尔量处理并行上传，`uploading = activeUploadCount > 0`。请求体只包含字段名 `file`；不手工设置
`Content-Type`，由浏览器生成 multipart boundary。`BladeFile.link` 为空时按失败处理。普通错误由 Axios 统一提示，
组件只恢复上传锁，不记录文件内容、URL、认证头或完整响应。

图片仅接受 `image/*`，视频仅接受 `video/*`；文件大小由现有资源服务和网关限制最终校验，本需求不虚构前端上限。
如测试环境的资源服务不支持某类媒体，对应 AC 标记阻塞，不得退化为 data URL、base64 或第三方匿名上传。

### 4.3 前端 HTML 净化流程

`src/utils/noticeHtml.ts` 暴露两个函数：

```ts
export const sanitizeNoticeHtml = (html?: string): string => {}
export const extractNoticeText = (html?: string): string => {}
export const isNoticeHtmlEmpty = (html?: string): boolean => {}
```

DOMPurify 白名单与后端 `NoticeHtmlSanitizer` 保持同源：

| 类型 | 允许内容 |
| --- | --- |
| 块元素 | `p`、`br`、`div`、`h1` 至 `h6`、`blockquote`、`pre`、`code` |
| 列表与文本 | `ul`、`ol`、`li`、`strong`、`b`、`em`、`i`、`u`、`s`、`sub`、`sup`、`span` |
| 链接 | `a[href,target,title,rel]`，协议仅 `http`、`https`、`mailto` |
| 图片 | `img[src,alt,title,width,height]` |
| 视频 | `video[src,controls,width,height,poster]`、`source[src,type]` |
| 表格 | `table`、`thead`、`tbody`、`tfoot`、`tr`、`th`、`td`、`colgroup`、`col`；单元格允许 `colspan/rowspan` |
| 样式 | `style` 先经浏览器 `CSSStyleDeclaration` 解析，只保留显式安全属性 |

style 属性只保留 `color`、`background-color`、`font-size`、`font-family`、`text-align`、`line-height`、
`text-indent`、`margin-left`、`letter-spacing`，通过临时元素的 `CSSStyleDeclaration` 逐属性读取和重建；不保留
`background-image`、`url()`、`position`、`z-index`、`display` 等可加载外部资源或破坏页面结构的声明。历史样例
若需要其他安全属性，必须先同步更新前后端白名单设计并复测，不用正则拼接 CSS。

净化后对外链统一补 `rel="nofollow noopener noreferrer"`；`target="_blank"` 保留。`extractNoticeText` 先净化，
再使用 DOMParser 提取 textContent 并压缩空白，替换公告页当前重复实现。`isNoticeHtmlEmpty` 将空字符串、纯空白、
`<p><br></p>` 等编辑器空文档归一为空。服务端保存后的内容是最终事实来源，前端净化仅提供展示和提交前防御，
不取代后端清洗。

### 4.4 应用启动与依赖移除流程

1. 先在 `package.json` 增加 WangEditor 与 DOMPurify 的直接依赖并更新锁文件。
2. 完成 `notice-editor` 和 `util/data.vue` 替换，确认模板中不再存在 Avue 专项组件。
3. 从 `main.ts` 删除 Avue、Avue CSS、旧富文本插件、crudCommon 与 axios 兼容导入/挂载。
4. 删除 `src/mixins/crud.js`、`src/option/crud/index.ts` 和 `src/page/index/wechat.vue`。
5. 完成动态路由、布局、样式、图标、文案和类型命名清理。
6. 删除 `@smallwei/avue` 与 `avue-plugin-ueditor`，重新生成锁文件。
7. 执行 `src`、依赖和构建产物零引用门禁；门禁通过前不发布。

步骤 1 至 6 在同一功能分支完成，但按提交或可恢复补丁分批组织。不得先删除依赖再留下未知自定义元素，也不得在
最终版本中保留双注册、双类名或兼容别名。

### 4.5 动态路由与布局命名切换

动态路由从对象内部 `safe` 自引用改为闭包，避免重命名时继续暴露插件实现：

```ts
export const installDynamicRouter = (options: InstallOptions) => {
  const manager: DynamicRouterManager = {
    setTitle,
    closeTag,
    generateTitle,
    formatRoutes,
  };
  options.router.$dynamicRouter = manager;
};
```

`formatPath` 同时更名为 `formatMenuPaths`，只修改导出名和调用方，不改变外链 `${token}` 替换、iframe query、菜单
component 路径和 children 递归规则。路由初始化顺序保持“创建 Router -> 安装 manager -> 注册缓存菜单”。

布局模板与 SCSS 使用一次性名称映射：

| 旧名称 | 新名称 |
| --- | --- |
| `avue-contail` | `saber-shell` |
| `avue--collapse` | `saber-shell--collapsed` |
| `avue-layout` | `saber-layout` |
| `avue-layout--horizontal` | `saber-layout--horizontal` |
| `avue-sidebar` | `saber-sidebar` |
| `avue-main` | `saber-main` |
| `avue-view` / `#avue-view` | `saber-view` / `#saber-view` |
| `avue-logo` | `saber-logo` |
| `avue-menu` | `saber-menu` |
| `avue-tags` | `saber-tags` |
| `avue-top` | `saber-top` |
| `avue-breadcrumb` | `saber-breadcrumb` |
| `avue-searchs` | `saber-menu-search` |
| `avue-footer` | `saber-footer` |

模板和样式不保留旧选择器兼容层。`element-ui.scss` 重命名为 `element-plus.scss`，`common.scss` 的 load-css 路径
同步更新。仅存在于 Avue CRUD 的表头、hover、icon 和 header 选择器全部删除；现有 `ListPanel` 样式按组件自身类名
保留，不再嵌套 `.avue-crud__header`。

### 4.6 异常与边界流程

| 场景 | 处理位置 | 处理方式 | HTTP/错误码 | 数据是否改变 |
| --- | --- | --- | --- | :---: |
| 未登录上传或保存 | Axios/后端 | 沿用 401 注销与登录跳转 | 401 | 否 |
| 富文本初始化异常 | notice-editor | emit error、销毁半初始化实例、禁用确认 | 前端错误 | 否 |
| 详情请求乱序 | useRemoteDetail/notice.vue | 仅最后目标 ID 可回填 | 不适用 | 否 |
| 媒体上传失败 | notice-editor | 不调用 insert，恢复上传计数 | 4xx/5xx/业务错误 | 否 |
| 上传响应无 link | resource/file.ts | 抛出明确响应契约错误 | 前端错误 | 否 |
| HTML 含危险节点 | noticeHtml + 后端 | 前后端两次白名单过滤 | 200/业务保存结果 | 仅保存净化结果 |
| 历史 HTML 不兼容 | 设计/测试门禁 | 阻止实施或编辑提交，记录样例 | 不适用 | 否 |
| 动态组件不存在 | dynamic-router | 保持现有未注册行为并记录验证失败 | 路由错误 | 否 |
| `util/data` 菜单存在 | util/data | 保留同路径 Element Plus 页面 | 200 | 否 |
| Node 24 构建异常 | 工程门禁 | 记录环境问题并用 Node 22 对照，不以对照替代正式门禁 | 进程错误 | 否 |

### 4.7 事务、并发与幂等

| 操作 | 事务边界 | 并发控制 | 幂等策略 |
| --- | --- | --- | --- |
| 公告详情 | 单 GET | useRemoteDetail 请求序号 | 天然幂等 |
| 富文本外部赋值 | 单组件实例 | settingExternalValue + 值比较 | 相同 HTML 不重复 emit |
| 媒体上传 | 单文件请求 | activeUploadCount；提交等待全部结束 | 非幂等；失败不自动重复上传 |
| 公告提交 | 单现有 `/submit` | submitting 锁；详情和编辑器状态校验 | 非幂等；失败保留输入由用户重试 |
| 动态路由注册 | 当前 Router 实例 | 沿用首次/菜单切换调用顺序 | 不新增重复注册机制，回归现有行为 |
| 依赖移除 | 单发布批次 | 锁文件与源码同步提交 | 同一提交可重复安装得到一致结果 |

## 5. 后端设计

### 5.1 路由、模型与服务

本需求不修改后端代码。实现前已核对 SpringBlade 当前契约：

| 项目 | 现有设计与本次使用 |
| --- | --- |
| 公告保存 | `POST /blade-desk/notice/submit`，请求体仍为 Notice JSON |
| 公告详情 | `GET /blade-desk/notice/detail?id=...`，返回历史 HTML content |
| HTML 清洗 | NoticeController 在 save/update/submit 前调用 NoticeHtmlSanitizer |
| 媒体上传 | `POST /blade-resource/oss/endpoint/put-file`，multipart 字段 `file` |
| 上传响应 | `R<BladeFile>`，前端读取 `res.data.data.link` |
| 数据库 | `blade_notice.content` 继续保存 HTML；不迁移、不回填 |

### 5.2 认证与数据归属

- 公告和资源上传均经现有网关、OAuth/Blade Token 与租户上下文处理。
- 前端上传通过 `@/axios`，由拦截器设置 Basic 与 `Blade-Auth`，组件不得接受或持有 Token prop。
- `tenantId`、创建人、部门和对象存储归属均由现有服务端上下文决定，本需求不允许客户端新增或覆盖归属字段。
- `notice_*` 按钮权限保持现状，后端仍是最终权限边界。

### 5.3 内容清洗与错误

- 后端允许的标签和属性以 `NoticeHtmlSanitizer` 为准，前端白名单只能等于或更严格，不能允许服务端明确禁止的内容。
- 保存后若服务端删除危险标签或属性，页面下一次详情加载展示服务端结果，不在前端声称原始危险内容已保存。
- 资源上传错误继续由统一 R、网关和 Axios 映射；本需求不增加专用错误码。
- 不在日志中输出公告完整 content、上传文件正文、BladeFile 完整对象或认证信息。

## 6. API 契约

### 6.1 接口清单

| 方法 | 路径 | 用途 | 访问条件 | 变更类型 |
| --- | --- | --- | --- | --- |
| GET | `/blade-desk/notice/detail` | 加载公告与历史 HTML | 已登录及现有 notice 权限 | 不变 |
| POST | `/blade-desk/notice/submit` | 新增或更新公告 | 已登录及现有 notice 权限 | 不变 |
| POST | `/blade-resource/oss/endpoint/put-file` | 上传富文本图片/视频 | 已登录且资源服务允许 | 新增前端调用方，后端不变 |

### 6.2 资源上传前端包装

`src/api/resource/file.ts` 定义最小返回模型，不把后端对象扩展成全局巨型类型：

```ts
export interface BladeFile {
  link: string;
  name?: string;
  originalName?: string;
  domain?: string;
}

export const uploadFile = (file: File) => {
  const data = new FormData();
  data.append('file', file);
  return request<BladeResponse<BladeFile>>({
    url: '/blade-resource/oss/endpoint/put-file',
    method: 'post',
    data,
  });
};
```

实际实现优先复用仓库已有 Blade 响应类型；若当前没有统一类型，只在本文件定义接口响应所需的最小结构。不得显式
设置 `Content-Type: multipart/form-data`，不得把 Token 加入 query 或 URL。响应 `data.data.link` 必须为非空字符串。

### 6.3 通知接口兼容

- `getNotice(id)`、`add(row)`、`update(row)` 的路径、方法与参数位置不变。
- `NoticeForm.content` 继续为字符串。提交前使用净化后的副本，不直接修改用户当前编辑对象，失败后仍保留编辑内容。
- 分页列表摘要由 `extractNoticeText` 生成，不向列表接口增加字段或请求完整内容以外的新契约。
- 本需求不增加版本号、ETag 或并发更新检测；并发编辑继续遵循现有后端最后写入语义，测试需记录该限制。

## 7. 前端设计

### 7.1 文件级改动清单

| 文件 | 动作 | 设计内容 |
| --- | --- | --- |
| `package.json`、`pnpm-lock.yaml` | 修改 | 提升 WangEditor 直接依赖、新增 DOMPurify、删除 Avue 两项依赖 |
| `src/main.ts` | 修改 | 删除 Avue/插件/CSS/crudCommon/axios 兼容挂载，保留 Element Plus 与现有全局属性 |
| `src/views/desk/components/notice-editor.vue` | 重写 | WangEditor 编辑态、DOMPurify viewer、上传与生命周期事件 |
| `src/views/desk/notice.vue` | 修改 | 编辑器 ready/error/uploading、提交净化、摘要工具复用 |
| `src/api/resource/file.ts` | 新增 | 资源上传包装与 BladeFile 最小类型 |
| `src/utils/noticeHtml.ts` | 新增 | 前端白名单、链接属性和摘要提取 |
| `src/views/util/data.vue` | 重写 | Element Plus 本地能力矩阵，删除购买与外部 Avue 资源 |
| `src/router/avue-router.ts` | 重命名并修改 | 改为 `dynamic-router.ts`，导出 installDynamicRouter/formatMenuPaths |
| `src/router/index.ts` | 修改 | 安装 `$dynamicRouter` 并注册缓存菜单 |
| `src/store/modules/user.ts` | 修改 | 更新 formatMenuPaths import 与调用 |
| `src/permission.ts` | 修改 | 使用 `$dynamicRouter` 生成和设置标题 |
| `src/env.d.ts` | 修改 | 删除 Avue 合并说明、Window axios/$crudCommon，声明 `$dynamicRouter` |
| `src/page/index/index.vue` 及子组件 | 修改 | 布局类名、路由 manager、图标、菜单搜索标题和未使用组件清理 |
| `src/page/index/wechat.vue` | 删除 | 未渲染的 Avue 二维码与 `avue_lock` 遗留 |
| `src/styles/element-ui.scss` | 重命名并修改 | 改为 `element-plus.scss`，删除 Avue CRUD/Icon 选择器 |
| `src/styles/common.scss`、`top.scss`、`tags.scss`、`sidebar.scss`、`media.scss`、`theme/tokens.scss` | 修改 | `saber-*` 类名原子替换 |
| `src/mixins/crud.js`、`src/option/crud/index.ts` | 删除 | 无调用方的声明式 CRUD 兼容实现 |
| `src/utils/util.ts` | 修改 | 删除无调用方 `findColumn` 和 Avue option 注释 |
| `src/components/iframe/main.vue` | 修改 | 组件名改为 `SaberIframe`，行为不变 |
| `src/views/util/store.vue`、`tags.vue` | 修改 | 示例值和 `$dynamicRouter` 命名 |
| `src/lang/zh.ts`、`en.ts`、`ja.ts` | 修改 | 当前欢迎文案去 Avue 品牌，保持 key 不变 |
| `src/views/wel/index.vue` | 修改 | 当前介绍改为 Vue 3/Element Plus；历史 Avue 字样改为“旧版组件库” |
| `src/components/basic-block/main.vue`、`src/views/wel/dashboard.vue` | 修改 | 支持 Element Plus 图标组件并移除旧 Element UI 图标类 |
| `src/page/login/index.vue`、`src/page/index/top/top-logs.vue`、`top-lock.vue`、`search.vue`、`tags.vue` | 修改 | 删除旧 `el-icon-*` 字符串 API，使用图标组件或 Element Plus 默认 loading |

实现必须先查看实际 diff，保留这些文件中用户已有的主题和迁移改动，不通过整文件回退获取旧基线。

### 7.2 `notice-editor` 组件契约

组件继续保留业务级名称和当前调用方式，新增状态事件：

```ts
interface NoticeEditorProps {
  modelValue: string;
  disabled?: boolean;
  rows?: number;
  placeholder?: string;
}

const emit = defineEmits<{
  'update:modelValue': [value: string];
  ready: [];
  error: [error: Error];
  uploading: [value: boolean];
}>();
```

#### 编辑态

- 局部导入 `Editor`、`Toolbar` 与 WangEditor CSS，不在 `main.ts` 全局注册。
- 编辑器实例使用 `shallowRef<IDomEditor>()`，`onBeforeUnmount` 必须调用 `destroy()` 并清空引用。
- `rows` 转换为稳定高度：`Math.max(Number(rows) * 150, 300)`，正文区域独立滚动，toolbar 保持可见。
- `editorConfig` 显式配置 placeholder、customPaste、uploadImage.customUpload 和 uploadVideo.customUpload。
- 工具栏只保留需求列出的能力，不开放源码编辑、全屏覆盖或无法通过后端白名单的节点。
- 链接插入只允许 `http`、`https`、`mailto`；非法协议在前端净化后不会进入提交值。
- 创建成功后根据当前 modelValue 设置内容并 emit ready；创建异常 emit error，不能留下可提交的空编辑器。

#### 查看态

- 不创建 WangEditor 实例，不展示工具栏。
- 使用 `sanitizeNoticeHtml(modelValue)` 的计算结果渲染 viewer。
- viewer 内图片、视频 `max-width: 100%`；表格放在横向滚动容器内；长链接和代码允许换行或滚动。
- 外链添加 `rel`，不得注册点击脚本或使用未经净化的 `v-html`。

#### 内容同步

- props 改变时只接受父组件最新值；编辑器销毁后到达的 watch 回调不再操作旧实例。
- 程序化 `setHtml` 不触发对外更新。用户输入时获取 editor HTML，值变化后再 emit。
- 父组件关闭弹窗后组件销毁，下一次打开不复用上一个公告的 editor、upload count 或错误状态。
- 编辑器内部空内容可能表示为 `<p><br></p>`；提交前通过 `isNoticeHtmlEmpty` 归一为空字符串，但本需求不强制公告内容必填。

### 7.3 工具栏与后端白名单映射

| 用户能力 | WangEditor 菜单/行为 | HTML | 后端支持 |
| --- | --- | --- | :---: |
| 段落/标题 | headerSelect | `p`、`h1` 至 `h6` | 是 |
| 粗体/斜体/下划线/删除线 | bold/italic/underline/through | `strong/em/u/s` | 是 |
| 有序/无序列表 | todo/list | `ol/ul/li` | 是 |
| 引用/代码 | blockquote/codeBlock | `blockquote/pre/code` | 是 |
| 链接 | insertLink/editLink | `a[href,target,title]` | 是 |
| 图片 | uploadImage/insertImage | `img[src,alt,title,width,height]` | 是 |
| 视频 | uploadVideo/insertVideo | `video/source` | 是 |
| 表格 | insertTable | `table/thead/tbody/tr/th/td` | 是 |
| 上下标 | sub/sup | `sub/sup` | 是 |
| 清除格式 | clearStyle | 回退允许标签 | 是 |
| 撤销/重做 | undo/redo | 不改变契约 | 是 |

颜色、背景色和字号只有在实际输出为后端 `allowStyling()` 可保留的 style 时才开放；历史样例验证不通过则从工具栏
移除，不扩展后端白名单。WangEditor 产生的 `data-w-e-*` 编辑辅助属性不属于持久化契约，前端和后端均可剥离。

### 7.4 公告页面状态整合

`notice.vue` 新增以下局部状态：

| 状态 | 初始/重置 | 置为成功 | 置为失败/结束 |
| --- | --- | --- | --- |
| `editorReady` | false | notice-editor ready | 关闭、切换详情、error |
| `editorFailed` | false | 重试前清零 | notice-editor error |
| `editorUploading` | false | uploading(true) | uploading(false)、关闭 |

打开新增时立即挂载空编辑器；打开编辑时在详情成功前不挂载编辑器，避免空值实例先 emit。查看模式详情成功后直接渲染
viewer。`handleSubmit` 的前置条件增加 `editorReady && !editorFailed && !editorUploading`；payload 使用
`sanitizeNoticeHtml(form.content)` 的副本。请求失败时不重建编辑器，不清 form，不关闭 Dialog。

详情失败继续使用现有 `ElResult` 重试。编辑器失败在表单内显示不可关闭的 `ElAlert`，提供“重试编辑器”操作；重试
通过 `editorVersion` 递增重建组件，不修改当前 form.content。媒体上传期间 FormDialog footer 保持可见但确认禁用，
取消仍允许，由组件销毁结束前端状态；已发出的上传请求不自动插入到已销毁实例。

### 7.5 `util/data.vue` 迁移设计

页面保留 `<basic-container>` 和动态路径，改为本地“能力矩阵”示例：

- 顶部使用 `ElSegmented` 或 `ElRadioGroup` 在“基础能力、协作能力、治理能力”之间切换。
- 主体使用 `ElTable` 展示能力名称、适用范围和状态，使用 `ElTag` 表示“可用、规划、受限”。
- 右侧或下方使用 `ElDescriptions` 展示当前分组摘要，不出现价格、购买、会员、外部教程或品牌图片。
- 数据定义为局部 `interface CapabilityItem` 和只读数组，不请求接口，不写 localStorage。
- 1440px 为两栏，1024px 和 375px 改为上下布局；表格允许横向滚动。
- 不抽取新的通用数据展示组件，不复刻 `avue-data-pay` option 结构。

### 7.6 动态路由类型与调用方

`dynamic-router.ts` 导出明确类型：

```ts
export interface DynamicRouterManager {
  setTitle: (title?: string) => void;
  closeTag: (value?: string | object) => void;
  generateTitle: (
    item: MenuItem,
    props?: { query?: string; label?: string; meta?: string }
  ) => string;
  formatRoutes: (menu?: MenuItem[], first?: boolean) => RouteRecordRaw[] | void;
}
```

`env.d.ts` 的 Router module augmentation 直接引用该类型。调用方映射如下：

| 调用方 | 修改 |
| --- | --- |
| `router/index.ts` | `installDynamicRouter(...)`，随后 `Router.$dynamicRouter.formatRoutes(...)` |
| `store/modules/user.ts` | `formatPath` import 改 `formatMenuPaths` |
| `permission.ts` | 标题生成与设置改 `$dynamicRouter` |
| `page/index/index.vue` | 顶部菜单切换后注册路由改 `$dynamicRouter` |
| `page/index/tags.vue` | 标签标题生成改 `$dynamicRouter` |
| `page/index/sidebar/sidebarItem.vue` | 菜单标题生成改 `$dynamicRouter` |
| `page/index/top/top-lang.vue` | 语言切换后标题更新改 `$dynamicRouter` |
| `views/util/tags.vue` | 标签关闭示例改 `$dynamicRouter` |

本次只收紧已有使用面的类型，不改变动态路由算法。发现类型化暴露现有空值风险时，记录为缺陷并采用最小修复，
不得在同批次重写整个路由系统。

### 7.7 主布局、样式与主题

主布局模板和 SCSS 按 4.5 的映射同步修改。以下视觉契约必须保持：

- `saber-shell` 与 `saber-layout` 继续占满视口并隐藏外层溢出。
- `saber-main` 保持纵向 flex，顶部栏、标签栏固定，`#saber-view` 独立滚动。
- 侧边模式、顶部模式和混合模式继续由现有 Vuex setting 驱动，不新增布局状态。
- 992px 以下侧栏使用现有抽屉式位移逻辑；collapsed 类名只改名称，不改变方向和宽度。
- Logo、sidebar、top、tags 的背景、边框和激活色继续使用 `--saber-*` 与 Element Plus Token。
- `theme-dark`、`html.dark` 内选择器同步改为 `saber-*`，不得用双选择器兼容旧类名。
- `element-plus.scss` 只保留仍有真实使用方的 Element Plus 覆盖和 `saber-list-panel` 样式；删除全部
  `.avue-crud*`、`.avue-icon*` 规则。

类名替换后对 1440px、1024px、375px 分别截图比较 header 高度、sidebar 宽度、标签区、内容 padding 和滚动条。
浅色、深色和自定义主色均需验证，避免只在默认主题下通过。

### 7.8 Element UI 遗留图标收尾

本需求触及的运行时代码不再使用 Element UI 时代的 `el-icon-*` 字符串。处理规则：

| 文件 | 处理 |
| --- | --- |
| `page/index/search.vue` | append 按钮改用 `Search` 图标组件并增加 aria-label |
| `page/index/tags.vue` | 刷新与下拉改用 `Refresh`、`ArrowDown`，保持固定尺寸 |
| `page/index/top/top-lock.vue` | 设置锁屏按钮改用 `Lock` |
| `page/index/top/top-logs.vue` | 上传、删除改用 `Upload`、`Delete` |
| `page/login/index.vue` | 删除 `spinner: 'el-icon-loading'`，使用 Element Plus 默认 loading spinner |
| `views/wel/index.vue` | divider 星标改用 `Star` 组件 |
| `components/basic-block/main.vue` | icon prop 改接收 Vue Component，使用 `ElIcon + component :is` |
| `views/wel/dashboard.vue` | 20 个旧图标类改为 Element Plus 图标组件引用 |

`src/views/system/user.vue` 的 `el-icon--upload` 是 Element Plus 官方结构类，不属于旧图标字体，保留。静态门禁使用
`rg --pcre2 "el-icon-(?!-)" src`，只排除双连字符 utility class。

### 7.9 全局对象、遗留文件与文案

#### 应用入口

`main.ts` 删除：

- `axios` 导入与 `window.axios = axios`。
- `Avue`、Avue CSS、`app.use(Avue, ...)`。
- `crudCommon` 与 `window.$crudCommon`。
- `avue-plugin-ueditor` 与 `app.use(avueUeditor, ...)`。

保留 Element Plus、图标全局注册、error/i18n/store/router、basicContainer/basicBlock，以及仍被 Options API 消费的
`$dayjs`、website、getScreen。

#### 删除与去品牌化

- 删除 `src/mixins/crud.js` 和 `src/option/crud/index.ts`；`src/option` 为空时不保留占位文件。
- 删除 `src/page/index/wechat.vue` 及 `index.vue` 中 import/components/comment。该组件没有渲染入口，实际锁屏状态使用
  `isLock`、`lockPasswd`，因此不迁移 `avue_lock`。
- 删除 `utils/util.ts` 的 `findColumn`；全仓已有扫描证明无调用方。
- `components/iframe/main.vue` 的 name 改为 `SaberIframe`。
- `views/util/store.vue` 示例值改为 `saber`；`views/util/tags.vue` 改用 `$dynamicRouter`。
- 三份语言文件中的 `wel.info/dept` 保持 key，内容改为 Saber 中性文案。
- `views/wel/index.vue` 当前介绍改为 Vue 3、TypeScript、Element Plus；历史发布项中的 Avue 字样改为“旧版组件库”，
  Element UI 改为“旧版 UI 组件库”。精确历史仍保存在 Git 和 `doc/`。

### 7.10 状态、缓存与请求

| 状态/数据 | 存放位置 | 获取方式 | 失效条件 |
| --- | --- | --- | --- |
| 公告列表/查询/分页 | `usePagedList` | notice list API | 查询、分页、写成功 |
| 公告详情 | `useRemoteDetail` | notice detail API | 目标切换、关闭、写成功 |
| 富文本内部 HTML | notice-editor local ref | props/WangEditor | 组件销毁、目标切换 |
| 编辑器实例 | notice-editor shallowRef | WangEditor onCreated | onBeforeUnmount、重建 |
| 编辑器 ready/error | notice.vue ref | 组件事件 | 每次打开/重试/关闭 |
| 上传计数 | notice-editor local ref | customUpload 生命周期 | 请求结束、组件销毁 |
| 安全 HTML | computed/function result | DOMPurify | modelValue 改变 |
| 动态路由 manager | Router 扩展 | router 初始化 | 应用刷新 |
| 布局状态 | 现有 Vuex/store | setting mutation | 用户设置/重置/退出规则不变 |
| data 示例 | util/data local const/ref | 本地数据 | 页面卸载 |

不新增 localStorage、sessionStorage、IndexedDB 或跨页面富文本缓存。401、超时和普通错误继续由 Axios 处理。

### 7.11 交互状态

| 状态 | 展示与行为 | 恢复方式 |
| --- | --- | --- |
| 富文本加载中 | 固定高度 skeleton/loading，确认禁用 | 创建成功自动恢复 |
| 富文本加载失败 | ElAlert，保留当前 content，确认禁用 | editorVersion 重建 |
| 富文本只读 | 安全 viewer，无工具栏和可编辑焦点 | 关闭弹窗 |
| 媒体上传中 | 工具栏上传项 loading，确认禁用 | 所有上传结束 |
| 媒体上传失败 | Axios 错误提示，不插入节点 | 用户再次选择文件 |
| 提交中 | FormDialog 锁定关闭和确认 | 请求完成 |
| 提交失败 | 编辑器与表单不销毁 | 用户修改或重试 |
| data 示例空筛选 | ElEmpty 与清除筛选入口 | 重置筛选 |
| 动态路由失败 | 标准空/错误行为，Console 有可定位但无敏感数据的信息 | 刷新菜单或修复 component |

### 7.12 响应式与可访问性

- 富文本 Dialog 继续使用 `width="880px"` 和 FormDialog 的 `max-width`；375px 下正文独立滚动，footer 始终可达。
- toolbar 使用横向滚动或自动换行，不通过缩小文字到不可读尺寸适配移动端。
- 工具栏按钮使用 WangEditor 可访问名称；自定义上传状态与错误提示可见，不仅依赖颜色。
- viewer 中图片、视频和表格不会突破 Dialog；长 URL、pre/code 支持换行或局部滚动。
- 主布局 icon button 使用 tooltip/aria-label；Logo 图片保留空 alt，由外层 aria-label 提供品牌名称。
- data 示例的 segmented/radio、table 和 descriptions 使用明确 label；状态同时显示文字和 Tag 类型。

## 8. 数据库、配置与发布影响

| 影响项 | 是否涉及 | 说明 | 关联文档 |
| --- | :---: | --- | --- |
| 新表/改表/约束/索引 | 否 | 继续使用现有 blade_notice 与资源存储 | 不适用 |
| 数据迁移/回填 | 否 | 历史 HTML 原样读取，不执行批量转换 | 不适用 |
| 后端代码 | 否 | 已有 NoticeHtmlSanitizer 和 OssEndpoint 满足设计 | SpringBlade 现有实现 |
| 环境变量 | 否 | 不增加 API、代理、上传或富文本配置项 | 不适用 |
| 前端依赖 | 是 | 增加 WangEditor 直接依赖与 DOMPurify，删除 Avue 两项依赖 | 本文 3.3 |
| 锁文件 | 是 | 保持 WangEditor 已解析版本，新增 DOMPurify，删除 Avue 记录 | `pnpm-lock.yaml` |
| 动态菜单 | 默认否 | `util/data` 保留原路径；下线需另行批准 | 本文 7.5 |
| 部署顺序/兼容 | 是 | 按 5A 至 5E 分批，最终制品必须零 Avue | 本文 10 节 |

构建产物 `dist/` 不手工编辑或提交。富文本 CSS 由公告页面异步 chunk 引入；主入口不再加载 Avue 全量 CSS。实现后
记录移除前后主入口 JS/CSS 体积与公告 chunk 体积，仅用于回归比较，不设置未经基线验证的硬性体积百分比。

## 9. 安全、测试与可观测性

### 9.1 认证与安全要求

| 检查项 | 设计 |
| --- | --- |
| 身份认证 | notice 与 resource 请求复用现有 Basic、Blade Token、Cookie、401 和租户上下文 |
| 角色授权 | 不新增权限码；notice_* 与后端现有授权保持不变 |
| 上传认证 | 只经 `@/axios`；Token 不进入 URL、组件 prop、日志或 localStorage |
| HTML 输入 | 编辑、粘贴、提交和 viewer 使用 DOMPurify；服务端 NoticeHtmlSanitizer 再次过滤 |
| URL 协议 | 链接仅 http/https/mailto；图片视频仅保留净化后安全 src |
| 外链安全 | `_blank` 链接补 nofollow/noopener/noreferrer |
| 敏感信息 | 不记录完整公告、文件正文、上传响应、Token、对象存储凭据 |
| 供应链 | 依赖使用精确版本；实现前复核许可证、安全公告和锁文件来源 |
| 数据归属 | 不新增 tenantId 参数，不改变服务端租户与创建人字段 |

WangEditor 与 DOMPurify 均不是授权边界。前端净化用于避免历史数据和编辑过程在浏览器执行危险内容，服务端清洗才是
持久化最终边界。若前后端白名单不一致，以更严格结果为准，不通过扩大前端白名单绕过服务端。

### 9.2 测试矩阵

仓库当前无单元测试、E2E 或 lint 脚本，本设计不新增测试框架。进入开发完成待验收时，必须按测试模板创建
`doc/test/TEST-REQ-2026-005-element-plus-full-migration-and-avue-removal.md`，覆盖以下矩阵。

| 场景 | 层级 | 关键断言 | 关联需求 |
| --- | --- | --- | --- |
| 依赖零引用 | 静态/锁文件 | package、lock、src、构建产物无 Avue 包或代码 | AC-001 至 AC-005、AC-034 |
| 富文本基础格式 | 浏览器/后端 | 标题、文本样式、列表、引用、代码保存重开一致 | AC-006 |
| 历史 HTML | 浏览器/数据 | 表格、链接、图片、视频可读，不静默清空 | AC-007、AC-008 |
| 只读查看 | 浏览器 | 无工具栏、无模型更新、无保存请求 | AC-009 |
| 图片/视频上传成功 | 浏览器/网络 | multipart file、认证头、link 插入、重开可见 | AC-010 |
| 上传失败 | 浏览器/网络 | 不插入坏节点，正文保留，上传锁恢复 | AC-011 |
| 编辑器/详情失败 | 浏览器 | 确认禁用、可重试、旧内容不覆盖 | AC-012、AC-014 |
| XSS 与危险 URL | 安全/后端 | script、事件属性、javascript URL 不执行且不保存 | AC-013 |
| data 示例 | 浏览器/网络 | 原路径可达、无 Avue、无业务写请求、响应式正常 | AC-015 至 AC-018 |
| 动态菜单 | 浏览器 | 首级、子级、外链、缓存菜单正常 | AC-019 |
| 标签与标题 | 浏览器 | 关闭动作和中英文标题一致 | AC-020、AC-021 |
| 布局与主题 | 浏览器截图 | 侧边/顶部/混合、折叠、三视口、三主题可用 | AC-022、AC-023 |
| 活动命名 | 静态 | `$avueRouter`、avue 类名与组件名无结果 | AC-024、AC-027 |
| 类型与全局 | 静态/类型 | Window 和 Router 声明与调用一致，保留全局能力可用 | AC-025、AC-026 |
| 旧存储键 | 浏览器 | 删除未渲染 wechat 不影响实际锁屏 | AC-028 |
| 未登录与跨阶段 | 浏览器/网络 | 登录跳转、CRUD、树、授权、权限范围、区划无回归 | AC-029 至 AC-033 |
| 工程门禁 | 命令/浏览器 | type-check、build、正式用例与回滚证据完整 | AC-035 至 AC-039 |

#### 历史 HTML 样例集

测试至少准备以下脱敏样例，不在仓库记录真实公告正文：

1. 纯文本与空内容。
2. `p/h1-h6/strong/em/u/s/sub/sup` 混合文本。
3. 有序、无序列表与嵌套列表。
4. blockquote、pre、code。
5. http、https、mailto 和非法 javascript 链接。
6. 图片含 alt/title/width/height。
7. video + source + poster。
8. table/thead/tbody/tfoot、colspan、rowspan。
9. 包含 style 的历史内容。
10. script、onclick、onerror、iframe、object 等危险内容。

每个样例记录“详情原值摘要、前端净化 DOM、编辑器加载、保存后服务端 DOM、重开 DOM”。比较采用语义节点和允许
属性，不以属性顺序、空标签格式或编辑器内部辅助属性的字符串完全相等作为通过条件。

### 9.3 静态与工程门禁

实现完成至少执行：

```powershell
rg -n -i "avue" src package.json pnpm-lock.yaml
rg -n "@smallwei/avue|avue-plugin-ueditor|avue-ueditor|avue-data-pay" src package.json pnpm-lock.yaml
rg -n "\$crudCommon|window\.axios|mixins/crud|option/crud" src
rg -n "\$avueRouter|avue-router|\.avue-|#avue-" src
rg --pcre2 -n "el-icon-(?!-)" src
pnpm run type-check
pnpm run build:prod
git diff --check
```

前四条期望无结果；`el-icon--upload` 等双连字符 Element Plus utility class 允许存在。`doc/` 单独检索并作为历史记录
报告，不纳入零引用失败。构建产物进一步检索 `@smallwei/avue`、`avue-plugin-ueditor` 和明显 Avue CSS 选择器。

### 9.4 浏览器验证

- 启动开发服务，确认实际端口并记录。
- 未登录访问、账号登录、菜单加载、顶部菜单切换、外链、标签关闭、语言、主题、折叠、锁屏和退出。
- 通知新增、编辑、查看、详情失败、保存失败、图片/视频上传成功与失败。
- `util/data`、欢迎页、dashboard、标签示例和 iframe。
- 第一阶段参数/岗位，第二阶段公告或日志，第三阶段菜单/角色/用户，第四阶段权限范围/区划代表页。
- 1440px、1024px、375px；浅色、深色、自定义主色；Console 与 Network 无 Avue 加载和未知组件错误。

富文本写测试与权限范围、区划写测试默认串行，避免共用登录态、对象存储或全局缓存影响结论。数据使用唯一前缀，
只清理由本次创建的公告和媒体；资源服务无安全删除条件时记录遗留 URL，不自动删除共享对象。

### 9.5 日志、指标与性能

- 不新增前端埋点、后端日志、指标或告警。
- 不新增 `console.log`；动态组件不存在的现有日志若保留，只允许输出组件相对标识，不含 query、Token 或用户数据。
- 记录移除前后主入口 JS/CSS、公告异步 chunk 和首次打开公告的请求，不把本机缓存结果当作线上性能承诺。
- 富文本组件关闭后确认 editor 实例销毁，重复打开 20 次不持续增长编辑器 DOM、事件监听或上传状态。
- DOMPurify 只在详情值变化、粘贴和提交时执行，不在无变化渲染循环中重复净化。

## 10. 发布与回滚

### 10.1 迁移与发布

| 批次 | 范围 | 进入条件 | 退出条件 |
| --- | --- | --- | --- |
| 5A 富文本适配 | DOMPurify、file API、notice-editor、notice | 历史样例和上传契约已确认 | AC-006 至 AC-014 通过；Avue 插件可暂留但已无页面调用 |
| 5B 专项页面 | util/data 与当前文案 | 动态菜单处置结论明确 | AC-015 至 AC-018、AC-027 通过 |
| 5C 路由与布局 | dynamic-router、saber 类名、样式、图标 | 5A/5B 可独立运行 | AC-019 至 AC-028 通过 |
| 5D 依赖清理 | main、env、mixin/option/wechat、package/lock | 所有 Avue 调用方为 0 | AC-001 至 AC-005、AC-024、AC-034 通过 |
| 5E 回归发布 | 全量工程与浏览器验证、文档同步 | 5D 静态和构建通过 | AC-029 至 AC-039 全部通过 |

实施顺序：

1. 评审本设计并准备历史 HTML、上传账号和动态菜单信息。
2. 完成 5A，先证明富文本能力与安全边界，不立即删除旧依赖。
3. 完成 5B，确认 `util/data` 无断链和第三方请求。
4. 完成 5C，模板与 SCSS 类名同一提交切换，执行布局回归。
5. 完成 5D，使用 pnpm 正常更新依赖与锁文件，禁止手工删除锁文件片段。
6. 执行 5E，创建测试文档并同步需求、设计、测试和索引状态。
7. 全部 Must 验收通过后发布；存在失败、阻塞或未执行项时保持“开发中/待验收”。

### 10.2 回滚与恢复

- 触发条件：历史 HTML 丢失、危险内容执行、媒体上传不可用、动态菜单/标签断链、主题布局明显回归、零引用或构建失败。
- 5A 回滚：恢复旧 `notice-editor` 调用；在 5D 前旧 Avue 依赖仍存在。已保存公告内容由后端 sanitizer 处理，不自动回写旧值。
- 5B 回滚：恢复 `util/data.vue`；不涉及后端数据。
- 5C 回滚：模板和全部关联 SCSS、Router 类型与调用方必须整体回滚，禁止只恢复一侧类名或属性名。
- 5D 回滚：恢复 main 注册、mixin/option、package 和 lock 的同一基线；不能只重新安装包而不恢复调用方。
- 数据库 downgrade：不适用，无数据库迁移。
- 媒体对象：前端回滚不删除已上传对象；测试按资源服务允许范围人工清理。
- 公告数据：前端回滚不撤销已提交公告；写测试前记录原内容摘要，使用受控测试记录。
- 回滚验证：应用启动、登录、动态菜单、公告查看/编辑、标签、主题、代表性迁移页和生产构建通过。

## 11. 风险、评审与变更

### 11.1 风险与开放问题

| 编号 | 类型 | 内容 | 负责人 | 状态/结论 |
| --- | --- | --- | --- | --- |
| ITEM-001 | 风险 | WangEditor 上游活跃度较弱，后续安全与浏览器兼容升级存在成本 | 前端/安全负责人 | 本次精确锁定并隔离；长期替换另立需求 |
| ITEM-002 | 风险 | 编辑器与后端 sanitizer 对 style、video 或 table 的保留细节可能不同 | 前后端负责人 | 历史样例按语义 DOM 对比，服务端结果为准 |
| ITEM-003 | 风险 | DOMPurify 配置过严会丢历史样式，过宽会扩大前端攻击面 | 安全负责人 | 白名单与后端同源，变更需双端评审 |
| ITEM-004 | 问题 | 资源服务对视频大小、格式和上传权限的实际限制尚未形成前端文档 | 后端/测试负责人 | 实现前用受控账号验证，不虚构限制 |
| ITEM-005 | 风险 | 32 个源码文件的命名清理可能遗漏模板或 SCSS 一侧 | 前端负责人 | 映射表、零引用扫描和三视口截图 |
| ITEM-006 | 风险 | 动态路由类型收紧可能暴露既有空值和组件缺失问题 | 前端负责人 | 只做阻断性最小修复，其他问题单独记录 |
| ITEM-007 | 问题 | `util/data` 部署菜单是否仍存在未确认 | 产品/维护负责人 | 默认保留迁移；有下线证据再调整 |
| ITEM-008 | 风险 | Node 24 Windows 构建异常可能掩盖真实依赖问题 | 环境负责人 | Node 22 对照 + Node 24 问题单，正式门禁结论分开记录 |
| ITEM-009 | 风险 | 欢迎页历史文案去品牌化可能影响版本说明精确性 | 产品负责人 | Git/doc 保留精确历史，当前 UI 使用中性描述 |
| ITEM-010 | 依赖 | 真实历史公告、媒体上传、权限账号和后端环境尚待准备 | 测试负责人 | 未准备时相关用例阻塞，不宣称已验收 |

### 11.2 评审结论

| 领域 | 结论 | 评审人 | 日期 | 备注 |
| --- | --- | --- | --- | --- |
| 后端/API | 待评审 | 待定 | 待定 | 确认 BladeFile.link、视频上传和 sanitizer 白名单 |
| 前端 | 待评审 | 待定 | 待定 | 确认 WangEditor 兼容决策、状态机、路由和类名映射 |
| 安全与权限 | 待评审 | 待定 | 待定 | 确认 DOMPurify 配置、外链和上传认证 |
| 数据库/发布 | 不涉及数据库，发布待评审 | 待定 | 待定 | 确认 5A 至 5E 和整体回滚边界 |
| 测试 | 待评审 | 待定 | 待定 | 准备历史样例、账号、媒体和跨阶段回归 |

### 11.3 变更记录

| 日期 | 版本 | 变更内容 | 原因 | 影响 | 修改人 |
| --- | --- | --- | --- | --- | --- |
| 2026-09-03 | 0.1 | 初稿 | 启动第四阶段后的 Element Plus 全量迁移与 Avue 完全移除详细设计 | 富文本选型、依赖、路由、布局、专项页面、安全、测试和发布 | Codex |
