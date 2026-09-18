# Saber 图片提示词反推详细设计文档

## 1. 文档信息

| 项目 | 内容 |
| --- | --- |
| 功能/模块 | 图片提示词反推 |
| 设计编号 | DESIGN-REQ-2026-013 |
| 关联需求 | [REQ-2026-013](../requirements/REQ-2026-013-image-prompt-reverse.md) |
| 关联测试 | [TEST-REQ-2026-013](../test/TEST-REQ-2026-013-image-prompt-reverse.md) |
| 目标版本/迭代 | Saber 5.x / AI 能力第二阶段 |
| 文档状态 | 草稿 |
| 设计负责人 | 待指定 |
| 评审人 | 待指定 |
| 最后更新日期 | 2026-09-16 |

## 2. 设计摘要与范围

### 2.1 设计摘要

在现有 `/asset/prompt` 工具栏增加图片反推入口，使用独立抽屉承载单图上传、预览、分析状态和结果。页面只向 `/blade-ai/prompt/reverse` 提交 FormData，不读取标签、不拼装系统指令、不直连 fast。成功结果按“标签、视觉分析、提示词、JSON”分区展示，并提供复制操作。

现有提示词编辑器继续承担策略维护。对保留编码 `image_prompt_reverse`，只有 `prompt_system_manage` 用户显示管理动作，类型与发布方式锁定为 `SYSTEM + MANUAL`。

### 2.2 关键决策

| 编号 | 决策 | 原因 | 影响 |
| --- | --- | --- | --- |
| DEC-001 | 入口复用 `/asset/prompt` 工具栏 | 属于提示词资产工具，不新增菜单层级 | 新增按钮和抽屉 |
| DEC-002 | 单图 FormData 直传 SpringBlade | 保留认证头，避免 Base64 和浏览器直连 fast | Axios API 新增方法 |
| DEC-003 | 结果不进 Pinia/Storage | 图片和提示词仅本次会话使用 | 关闭时彻底清理 |
| DEC-004 | 结果分四区而非嵌套卡片 | 便于扫描和复制，符合现有工作型页面 | 使用全宽 Section/Tab |
| DEC-005 | 系统策略编辑锁定 SYSTEM/MANUAL | 防止管理员误切 AUTO 或普通类型 | 编辑器按保留编码禁用字段 |
| DEC-006 | 前端权限只控制可见性 | 后端 API Scope/DataScope 是最终边界 | 失败仍统一处理 |

### 2.3 改动范围

| 层级 | 改动内容 | 不涉及内容 |
| --- | --- | --- |
| 前端页面 | 提示词列表工具栏、反推抽屉、系统策略编辑约束 | 新菜单、历史页面 |
| API | `/blade-ai/prompt/reverse` FormData、响应类型 | fast API、Redis |
| 国际化 | zh/en/ja 文案 | 业务标签多语言 |
| 数据库 | 无 | 图片/结果持久化 |
| 配置 | 无 | fast 地址和密钥 |

## 3. 总体设计

### 3.1 架构图

~~~mermaid
flowchart LR
    User[用户] --> PromptPage[/asset/prompt]
    PromptPage --> Drawer[PromptReverseDrawer]
    Drawer --> API[src/api/ai/prompt]
    API --> Axios[共享 Axios]
    Axios --> BladeAI[/blade-ai/prompt/reverse]
~~~

### 3.2 组件职责

| 组件 | 职责 | 输入 | 输出 |
| --- | --- | --- | --- |
| `prompt.vue` | 权限判断、打开抽屉 | 用户权限 | visible |
| `prompt-reverse-drawer.vue` | 文件、预览、状态、结果和复制 | `modelValue` | 无业务写事件 |
| `prompt.ts` | FormData API 和响应类型 | File | `PromptReverseResult` |
| `prompt-editor-dialog.vue` | 保留策略编辑字段锁定 | detail/code/type/mode | create/update 请求 |

### 3.3 新增依赖

不新增依赖，复用 Element Plus、Axios、现有图标和浏览器 Clipboard API。

## 4. 核心流程设计

### 4.1 技术流程图

~~~mermaid
sequenceDiagram
    actor U as 用户
    participant P as PromptPage
    participant D as ReverseDrawer
    participant A as Axios
    participant B as blade-ai
    U->>P: 点击图片反推
    P->>D: 打开抽屉
    U->>D: 选择图片并提交
    D->>D: 基本格式/大小提示 + Object URL
    D->>A: FormData(image)
    A->>B: POST /blade-ai/prompt/reverse
    B-->>A: 固定 JSON
    A-->>D: PromptReverseResult
    D-->>U: 展示标签/分析/提示词/JSON
~~~

### 4.2 异常与边界流程

| 场景 | 处理位置 | 处理方式 | 页面行为 |
| --- | --- | --- | --- |
| 无权限 | `prompt.vue` | 不显示入口 | 直接请求仍由后端拒绝 |
| 文件非法 | 抽屉 + 后端 | 客户端提示、后端最终校验 | 保留抽屉并重新选择 |
| 请求失败 | Axios/抽屉 | 不重复普通错误提示 | 保留图片，显示重试状态 |
| 旧响应晚到 | 抽屉请求序号 | 忽略非最新响应 | 不覆盖新图片上下文 |
| 抽屉关闭 | 抽屉 | 递增请求序号、revoke URL、清空结果 | 下次为空状态 |
| 复制失败 | Clipboard catch | 显示失败消息 | 结果不清空 |

### 4.3 状态与并发

状态使用 `EMPTY/READY/ANALYZING/SUCCESS/FAILED`。每次提交递增 request token；只有当前 token 可以更新结果。`ANALYZING` 禁止重新选择和重复提交；关闭抽屉不取消后端模型调用，但本地忽略晚到响应。

## 5. 前端设计

### 5.1 API 类型

`src/api/ai/prompt.ts` 增加：

- `PromptReverseAnalysis`
- `PromptReverseLabelCategory`
- `PromptReverseLabelSelection`
- `PromptReverseGeneratedPrompt`
- `PromptReverseStrategyVersion`
- `PromptReverseWarning`
- `PromptReverseResult`
- `reversePromptImage(image: File)`

请求使用 `FormData`，字段名固定为 `image`；不手工设置 multipart boundary，由浏览器和 Axios 处理。

### 5.2 页面与组件

| 页面/组件 | 类型 | 职责 | 访问条件 |
| --- | --- | --- | --- |
| `src/views/asset/prompt.vue` | 页面 | 新增图片反推按钮 | `permission.prompt_reverse` |
| `src/views/asset/components/prompt-reverse-drawer.vue` | 抽屉 | 上传、预览、结果和复制 | 已打开入口 |
| `prompt-editor-dialog.vue` | 现有弹窗 | 保留策略字段锁定 | `prompt_system_manage` + 后端 ALL |

抽屉布局：顶部上传和图片预览；成功后显示策略版本摘要；主体使用 Tabs 或全宽 Section 展示标签、分析、提示词和 JSON。不得在卡片内嵌套卡片。

### 5.3 系统策略管理交互

- 当详情 `promptCode=image_prompt_reverse` 时标记“系统分析策略”。
- 无 `prompt_system_manage` 时不显示该行的编辑、发布、停用和回滚动作；后端仍做最终拒绝。
- 有权限时编辑器将 `promptType=SYSTEM`、`publishMode=MANUAL` 设置为只读，不允许切换。
- 该策略仍使用现有预览、发布、版本和回滚弹层，不新增第二套编辑器。
- 普通 OWN 用户通常不会从列表取得该管理员所有记录；页面不能依赖前端过滤实现安全。

### 5.4 结果展示

- `analysisPrompt`：编码、SYSTEM 标签、Vn、contentHash 前 12 位；完整值保留于 JSON。
- `labels`：按分类分组，标签用 `el-tag`，置信度用百分比，reason 作为辅助文本。
- `analysis`：摘要、主体、场景、细节、未匹配和不确定项。
- `prompt`：正向/负向分别使用只读 textarea/pre，独立复制按钮。
- `JSON`：格式化只读 pre，复制完整响应业务对象。
- `warnings`：使用 warning alert/list，不静默隐藏。

### 5.5 临时数据

| 数据 | 存放位置 | 失效条件 |
| --- | --- | --- |
| File | 组件 ref | 关闭/重新选择 |
| previewUrl | `URL.createObjectURL` | 重新选择/关闭时 revoke |
| result | 组件 ref | 重新分析/关闭 |
| request token | 组件局部变量 | 每次请求/关闭递增 |

不写入 Pinia、localStorage、sessionStorage 或 URL 查询参数。

## 6. API 契约

| 方法 | 路径 | 用途 | 访问条件 | 变更类型 |
| --- | --- | --- | --- | --- |
| POST | `/blade-ai/prompt/reverse` | 单图反推 | 登录 + `prompt_reverse` | 新增 |

成功仍使用 Blade `R<T>`：读取 `response.data.data`。业务错误由共享 Axios 处理，组件只负责恢复状态和展示功能级失败区域。

## 7. 国际化

同步 `src/lang/zh.ts`、`en.ts`、`ja.ts`：图片反推、选择图片、重新选择、开始分析、分析中、标签、视觉分析、正向提示词、负向提示词、固定 JSON、策略版本、复制成功/失败、重试和规则不可用。

## 8. 数据库、配置与发布影响

| 影响项 | 是否涉及 | 说明 |
| --- | :---: | --- |
| 新表/改表 | 否 | 前端不持久化 |
| 环境变量 | 否 | 沿用网关地址 |
| 菜单/API Scope | 是 | 后端初始化 `prompt_reverse`、`prompt_system_manage` 按钮权限 |
| 部署顺序 | 是 | SpringBlade/fast 先于 Saber |

## 9. 安全、测试与可观测性

- 图片只通过共享 Axios 发送给 SpringBlade，Token 继续由请求拦截器注入。
- 不把 API Key、fast 地址、Redis Key、完整系统指令放入页面或控制台。
- 禁止使用 `v-html` 展示模型文本；全部按纯文本渲染。
- 关闭抽屉释放 Object URL，避免内存持续增长。
- 验证 1440px、1024px、375px；长提示词和 JSON 使用独立滚动区域。

## 10. 发布与回滚

发布顺序：后端契约和权限 -> fast -> SpringBlade -> Saber。上线后使用有/无权限角色和合法图片冒烟。回滚 Saber 只移除入口和组件，不改变后端数据；系统提示词版本保留。

## 11. 风险、评审与变更

| 编号 | 类型 | 内容 | 负责人 | 状态/结论 |
| --- | --- | --- | --- | --- |
| ITEM-001 | 风险 | 大图片预览占用浏览器内存 | 待指定 | 限单图并及时 revoke |
| ITEM-002 | 风险 | JSON/提示词过长影响窄屏 | 待指定 | 独立滚动和复制 |
| ITEM-003 | 依赖 | 后端权限码和 SYSTEM/MANUAL 锁定错误语义 | 待指定 | 开放 |

| 日期 | 版本 | 变更内容 | 原因 | 影响 | 修改人 |
| --- | --- | --- | --- | --- | --- |
| 2026-09-16 | 0.1 | 根据 REQ-2026-013 0.3 建立上传、结果和系统策略管理详细设计。 | 同步更新后的提示词管理能力 | 页面、组件、API、权限和国际化 | Codex |
