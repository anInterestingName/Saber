# 需求文档索引

本文件是 Saber 需求编号、当前需求版本、状态及关联设计文档的统一登记入口。需求正文和详细变更记录
保存在对应文档中，历史版本由 Git 保存。

## 使用规则

- 需求讨论结束后，先在本文件登记编号，再按照“需求文档 -> 数据库设计（按需） -> 详细设计”的顺序编写和评审。
- 全局需求编号格式为 `REQ-YYYY-NNN`，其中 `NNN` 按当年登记顺序递增。
- 需求文件名格式为 `REQ-YYYY-NNN-short-name.md`，`short-name` 使用简短英文 kebab-case。
- 详细设计编号使用 `DESIGN-REQ-YYYY-NNN`，文件名格式为 `DESIGN-REQ-YYYY-NNN-short-name.md`。
- 数据库设计编号使用 `DB-REQ-YYYY-NNN`，文件名格式为 `DB-REQ-YYYY-NNN-short-name.md`。
- 编号一经分配永久保留；需求合并、废弃或延期时不得删除或复用。
- 不涉及数据库变化时，“数据库设计”填写“不涉及”，不要创建空文档。
- 索引只记录当前有效版本；每次需求版本、状态、负责人或关联设计变化时同步更新对应行。
- 需求版本从 `0.1` 开始，评审确认后更新为 `1.0`；确认后的兼容性变化使用 `1.1`、`1.2`，重大范围变化使用下一个主版本。
- 状态统一使用：待编写、待评审、已确认、设计中、开发中、已验收、已废弃。

## 编号分配

| 年份 | 下一个编号 | 最后分配日期 | 维护人 |
| --- | --- | --- | --- |
| 2026 | `REQ-2026-011` | 2026-09-10 | Codex |

> 分配需求编号后，立即将“下一个编号”加一。例如分配 `REQ-2026-002` 后，本表更新为 `REQ-2026-003`。

## 需求索引

| 需求编号 | 需求名称 | 模块 | 需求版本 | 状态 | 目标迭代 | 需求文档 | 数据库设计 | 详细设计 | 负责人 | 最后更新 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [REQ-2026-001](requirements/REQ-2026-001-element-plus-migration.md) | Saber Element Plus 渐进迁移与通用组件建设 | 前端基础能力、管理端业务页面 | 0.4 | 开发中 | Saber 5.x / Element Plus 迁移第一阶段 | [需求文档 0.4（自动折叠已实现，待验收）](requirements/REQ-2026-001-element-plus-migration.md) | 不涉及 | [详细设计 0.4（已实现，待验收）](design/DESIGN-REQ-2026-001-element-plus-migration.md) | 待指定 | 2026-09-03 |
| [REQ-2026-002](requirements/REQ-2026-002-element-plus-migration-phase-2.md) | Saber Element Plus 第二阶段普通页面迁移 | 系统管理、工作台、开发工具、报表管理、监控日志 | 0.6 | 开发中 | Saber 5.x / Element Plus 迁移第二阶段 | [需求文档 0.6（缺陷修复完成，待回归验收）](requirements/REQ-2026-002-element-plus-migration-phase-2.md) | 不涉及 | [详细设计 0.5（已实现，部分验证，待验收）](design/DESIGN-REQ-2026-002-element-plus-migration-phase-2.md)；[手工测试 0.4（25通过/4失败/19阻塞，5项缺陷待回归）](test/TEST-REQ-2026-002-element-plus-migration-phase-2.md) | 待指定 | 2026-09-01 |
| [REQ-2026-003](requirements/REQ-2026-003-element-plus-migration-phase-3.md) | Saber Element Plus 第三阶段树表与复杂页面迁移 | 系统管理、权限管理、开发工具 | 0.9 | 开发中 | Saber 5.x / Element Plus 页面迁移第三阶段 | [需求文档 0.9（用户查询自动折叠已实现，待验收）](requirements/REQ-2026-003-element-plus-migration-phase-3.md) | 不涉及 | [详细设计 0.8（用户查询自动折叠已实现）](design/DESIGN-REQ-2026-003-element-plus-migration-phase-3.md)；[测试文档 0.6（自动折叠定向验证、Node 22 对照构建通过）](test/TEST-REQ-2026-003-element-plus-migration-phase-3.md) | 待指定 | 2026-09-03 |
| [REQ-2026-004](requirements/REQ-2026-004-element-plus-migration-phase-4.md) | Saber Element Plus 第四阶段权限范围、区域与示例页面收尾迁移 | 权限管理、基础管理、工具示例 | 0.3 | 开发中 | Saber 5.x / Element Plus 页面迁移第四阶段 | [需求文档 0.3（代码已实现，常规检查完成，待详细验收）](requirements/REQ-2026-004-element-plus-migration-phase-4.md) | 不涉及 | [详细设计 0.2（已实现，常规检查通过，待详细验收）](design/DESIGN-REQ-2026-004-element-plus-migration-phase-4.md) | 待指定 | 2026-09-03 |
| [REQ-2026-005](requirements/REQ-2026-005-element-plus-full-migration-and-avue-removal.md) | Saber Element Plus 全量迁移与 Avue 完全移除 | 前端基础能力、主布局、动态路由、通知公告、工具示例 | 0.3 | 设计中 | Saber 5.x / Element Plus 全量迁移收尾 | [需求文档 0.3（设计中，已登记 Pinia 协同需求）](requirements/REQ-2026-005-element-plus-full-migration-and-avue-removal.md) | 不涉及 | [详细设计 0.1（设计中，待评审）](design/DESIGN-REQ-2026-005-element-plus-full-migration-and-avue-removal.md) | 待指定 | 2026-09-03 |
| [REQ-2026-006](requirements/REQ-2026-006-pinia-migration-and-vuex-removal.md) | Saber Pinia 状态管理迁移与 Vuex 4 完全移除 | 前端基础能力、应用启动、认证会话、动态路由、主布局、权限与日志 | 0.3 | 开发中 | Saber 5.x / Vue 3 状态管理升级 | [需求文档 0.3（开发完成，待验收）](requirements/REQ-2026-006-pinia-migration-and-vuex-removal.md) | 不涉及 | [详细设计 0.2（已实现，待业务验收）](design/DESIGN-REQ-2026-006-pinia-migration-and-vuex-removal.md)；[测试文档 0.1（5 通过/11 阻塞）](test/TEST-REQ-2026-006-pinia-migration-and-vuex-removal.md) | 待指定 | 2026-09-04 |
| [REQ-2026-007](requirements/REQ-2026-007-sidebar-collapse-navigation-theme.md) | 主导航折叠交互与导航背景统一 | 前端主布局、侧栏、顶部栏、响应式导航 | 0.2 | 开发中 | Saber 5.x / 主布局体验优化 | [需求文档 0.2（开发完成，待验收）](requirements/REQ-2026-007-sidebar-collapse-navigation-theme.md) | 不涉及 | [详细设计 0.2（已实现，部分验证）](design/DESIGN-REQ-2026-007-sidebar-collapse-navigation-theme.md)；[测试文档 0.1（4 通过/1 阻塞）](test/TEST-REQ-2026-007-sidebar-collapse-navigation-theme.md) | 待指定 | 2026-09-04 |
| [REQ-2026-008](requirements/REQ-2026-008-ghcr-image-publishing.md) | GitHub Actions 构建并发布公开 GHCR 测试镜像 | CI/CD、Docker、Nginx、GHCR | 0.4 | 开发中 | Saber 5.x / 容器化发布 | [需求文档 0.4（公开测试模式，待远端验收）](requirements/REQ-2026-008-ghcr-image-publishing.md) | 不涉及 | [详细设计 0.4（公开拉取模式已实现）](design/DESIGN-REQ-2026-008-ghcr-image-publishing.md)；[测试文档 0.4（4 通过/1 阻塞）](test/TEST-REQ-2026-008-ghcr-image-publishing.md) | Codex | 2026-09-04 |
| [REQ-2026-009](requirements/REQ-2026-009-prompt-management.md) | Saber 提示词管理 | 资产管理、提示词草稿、预览与版本发布 | 0.3 | 开发中 | Saber 5.x / AI 能力第一阶段 | [需求文档 0.3（缺陷修复完成，待联调验收）](requirements/REQ-2026-009-prompt-management.md) | 不涉及 | [详细设计 0.3（变量默认值与保存交互已更新）](design/DESIGN-REQ-2026-009-prompt-management.md)；[测试文档 0.3（待执行，12 项未执行）](test/TEST-REQ-2026-009-prompt-management.md) | 待指定 | 2026-09-09 |
| [REQ-2026-010](requirements/REQ-2026-010-tag-management-frontend.md) | Saber 标签分类与标签管理 | 系统管理、标签分类、层级标签 | 0.5 | 开发中 | Saber 5.x / 标签基础能力前端第一阶段 | [需求文档 0.5（分类查看样式已优化，待联调验收）](requirements/REQ-2026-010-tag-management-frontend.md) | 不涉及 | [详细设计 0.5（非表格详情网格已实现）](design/DESIGN-REQ-2026-010-tag-management-frontend.md)；[测试文档 0.5（待执行，10 项未执行）](test/TEST-REQ-2026-010-tag-management-frontend.md) | 待指定 | 2026-09-10 |

## 状态说明

| 状态 | 进入条件 |
| --- | --- |
| 待编写 | 需求讨论已结束并完成编号登记，尚未提交正式需求文档。 |
| 待评审 | 需求或设计初稿已完成，等待产品、技术和测试评审。 |
| 已确认 | 需求目标、范围、流程、认证边界和验收标准已确认。 |
| 设计中 | 需求已经确认，正在编写或修订数据库设计和详细设计。 |
| 开发中 | 所需设计已评审，需求进入实现和验证。 |
| 已验收 | 验收标准已通过，相关文档和索引已更新。 |
| 已废弃 | 需求不再实施；保留编号、原因和已有文档链接。 |
