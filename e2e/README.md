# 认证自动化回归

本目录按 TEST-REQ-2026-015 检查已实现的部分子场景，不代表其 12 个正式用例或 32 项验收标准全部通过。
Mock 使用每个用例独立的 BrowserContext，未登记的认证/业务请求直接失败；真实后端项目仅操作本轮浏览器建立的会话，不新增、删除或改密真实业务数据。

管理员判断按后端 `RoleConstant.HAS_ROLE_ADMIN` 精确接受 `administrator` 和 `admin`，保留原始角色别名。
`tc003-admin-roles.spec.ts` 准备了两种管理员、混合角色、普通角色、空角色及相似角色名的 UI 回归；普通夹具即使有相同 OAuth scope、管理员显示名和按钮权限，也不能访问客户端管理列表。
2026-10-14修复阶段按用户要求暂停复测；收到新通知后首轮86次为85通过/1首次导航超时，原样诊断复跑1通过，角色修复已验证。首轮失败与复跑证据均保留，存在测试不稳定项；详细统计见TEST-REQ-2026-015第11节，不将原样复跑改写为首轮全通过或完整验收。

## 执行

- `pnpm run type-check`：应用工程门禁。
- `pnpm run type-check:e2e`：测试与配置的独立类型门禁。
- `pnpm run test:e2e`：三个视口的 Mock 场景及一个真实后端项目。
- `pnpm run test:e2e --project=chromium-desktop --project=responsive-tablet --project=responsive-mobile`：只运行隔离 Mock。
- `pnpm run test:e2e --list --reporter=list`：只读取清单，不生成 HTML 报告。

真实项目需从环境安全提供 `E2E_USERNAME`、`E2E_PASSWORD`，使用已授权的测试管理员，按需提供 `E2E_TENANT_ID`。
缺少凭据会明确失败，不以跳过或默认凭据表示通过。`E2E_BASE_URL` 可指定已准备的同源测试站点；未配置时由 Playwright 启动当前 Vite 开发服务。
本地 HTTP 联调不证明生产 Secure Cookie、TLS、issuer 或发布代理通过。

## 证据与清理

每次执行自动分配 `output/playwright/<批次>/`，也可通过 `E2E_RUN_ID` 指定唯一批次名。
目录含 `html/index.html`、`results.json` 及遮蔽输入后的页面截图；不录制认证 trace/video，不持久化 storageState。
真实凭据通过环境注入，reporter 在其他报告接收事件前隐藏输入值、密码及敏感协议参数。截图不采集真实登录表单。
真实用例结束后仅注销自己的 BFF 会话；退出边界用例还清理自己的第二个会话，失败清理也会报告。AUTH 会话不做全局注销。
失败时先区分脚本、业务与环境问题，不降低断言或把故障计为通过。真实代码缺陷只记录，不由测试脚本自动修复。
