# 前端新认证服务与 BFF 接入说明

- 初始POC日期：2026-10-08；文档版本：0.6；最后更新：2026-10-15。
- 当前状态：已完成前端新认证适配，工程检查通过，真实业务和生产验收待执行。
- 原POC使用`codex/authorization-frontend-poc`；当前工作区未提交，不以工作区实现或构建推断业务已验收。
- 正式交付见[REQ-2026-015 0.13](requirements/REQ-2026-015-authorization-frontend-adaptation.md)、[详细设计0.11](design/DESIGN-REQ-2026-015-authorization-frontend-adaptation.md)及[测试文档0.9](test/TEST-REQ-2026-015-authorization-frontend-adaptation.md)。当前16个完整用例待执行，0.8历史阶段证据保留，不代表新版通过。
- 后端契约及部署见[认证服务运行说明](../../SpringBlade/blade-authorization-server/README.md)、[REQ-2026-010](../../SpringBlade/doc/requirements/REQ-2026-010-production-authentication.md)和[详细设计](../../SpringBlade/doc/design/DESIGN-REQ-2026-010-production-authentication.md)。历史最小验证见[TEST-REQ-2026-009](../../SpringBlade/doc/test/TEST-REQ-2026-009-bff-validation.md)，不与Saber的同号提示词需求混用。

## 开发与联调

1. 用户准备Authorization Server、BFF、system及目标资源服务、MySQL/Redis/Nacos、外部JWK、有效用户/租户/角色/菜单和客户端；实际凭据在执行环境提供，前端不配置BFF/服务客户端密钥。
2. 在仓库外环境配置`VITE_AUTH_PROXY_TARGET`指向授权服务，`VITE_BFF_PROXY_TARGET`指向新BFF；未设置BFF目标时沿用`VITE_APP_PROXY_TARGET`及项目默认值。`VITE_APP_API=/api`，不提交专用地址或密钥。前端地址、issuer、客户端精确回调和后端frontend-uri必须一致，不能混用不同主机名。
3. 用户执行`pnpm run dev`，打开当前前端地址的业务页或`/auth/verify`。未登录时发起BFF授权；AUTH登录/同意成功后回固定前端入口，完成用户/角色/菜单/按钮初始化，再进入业务或消费本标签页安全回跳。
4. `/auth/login`采用品牌分栏，无待授权上下文时先恢复BFF或自动准备授权；无效上下文短时间反复返回时停止自动跳转，由用户重新登录。按开关展示注册入口；注册成功仍由用户主动登录，不自动建立会话。
5. 账户菜单不提供检查登录状态；403使BFF校验缓存失效，下次用户主动提交先获取新值，不自动重放原操作。退出成功停留在已退出页面，点击重新登录后才发起新授权。退出只影响当前BFF，AUTH会话可能仍有效，再次登录不保证要求输入密码。
6. 按正式测试文档进行业务验收、主题/视口、Console/Network及证据清理；代理本轮未启动服务或访问真实接口。

## 当前实现

| 位置 | 行为 |
| --- | --- |
| `/auth/login` | 品牌分栏、组织/账号/密码，自动准备及防循环；独立AUTH CSRF原生提交锁，退出后停留 |
| `/auth/consent` | 独立卡片突出账号/应用/全部服务端权限，标识可展开，缺说明提示；同意前内容复核及AUTH原生提交 |
| `/auth/register` | system配置/验证码/JSON白名单、BFF CSRF、密码最多72个UTF-8字节、失败换验证码、成功回新登录 |
| `/auth/verify` | 自动初始化/校验并回到安全业务路径，正常只显示正在进入，失败提供重试或重新登录 |
| `src/api/authorization.ts`、`src/axios.ts` | 统一Axios Cookie，BFF写请求单飞CSRF；无Basic/浏览器Token/刷新定时器；HTTP优先，资源401探测BFF，不重放原请求 |
| Store/路由/业务调用方 | 身份及权限仅当前会话内存，按代次隔离并清理动态路由；头像/导入导出/密码/退出/锁屏/AI配置/客户端适配完成 |
| 旧认证 | 旧页面/API/SM2登录包装器/Token读写/刷新mixin及无新契约日志上传已移除；已知旧Cookie和Storage只清理不读取 |

Vite精确转发BFF发起/回调、`/bff/`及`/api/`；AUTH UI/form只允许登记的方法，`/auth-api/`去一次前缀；根发现及协议端点精确代理SAS；未登记协议子路径404，Vue认证页面由SPA处理。`/login`是SAS表单端点，不能作为旧Saber页面恢复。`pnpm run serve`和Saber静态Nginx不提供业务代理；生产由后端ingress完整同源代理承接，HTTPS、Secure/HttpOnly/Path/SameSite、可信代理、issuer/回调和缓存必须实际验收。

注册后端响应仍缺设计中的passwordMaxBytes：前端按已经落地的PasswordPolicy强制72字节并兼容未来可选字段，差异保留为ITEM-012。旧Token外链必须由菜单维护方更新安全地址，不能空替换后宣称恢复。客户端停用不保证离线JWT立即失效；失败不伪造回滚。首次新体系故障按后端停流/维护/向前修复处理，不恢复旧auth或旧网关。

## 工程检查与验收边界

本轮`pnpm run type-check`、`pnpm run type-check:e2e`、`pnpm run build:prod`、活动引用扫描与`git diff --check`通过；构建依赖注解、动态/静态导入和较大分包提示不阻断。未新增依赖或测试基础设施，dist为忽略产物。新版没有浏览器、登录、权限/租户、文件、并发或部署通过结论，16个完整用例待执行；历史阶段证据见测试文档。证据不得包含密码、Cookie、CSRF值、授权码/state、OAuth令牌、原始密钥或完整敏感请求体。

## 变更记录

| 日期 | 版本 | 内容 |
| --- | --- | --- |
| 2026-10-08 | 0.1 | 新增Vue登录、授权确认、验证页面及代理；关联后端统一测试，待用户联调 |
| 2026-10-08 | 0.2 | 同步后端登录路径启动修复及统一测试0.7，前端代码与代理契约不变，待启动和登录复测 |
| 2026-10-13 | 0.3 | 按后端0.11/设计0.10更新API、路由标记、代理、真实用户、会话摘要和退出边界，关联全站需求 |
| 2026-10-13 | 0.4 | 同步后端0.13/设计0.12及源码，明确AUTH CSRF消费差距、JSON改密、新注册与外层代理，业务未执行 |
| 2026-10-14 | 0.5 | 完成全站前端适配，verify改为初始化入口，记录统一请求/代理、工程验证及真实验收边界，保留历史证据 |
| 2026-10-15 | 0.6 | 按确认方案改版登录/确权、自动进入/防循环/退出落地，移除用户检查入口，403后下一次主动提交更新校验；新增验收待执行 |
