# GitHub Actions 构建并发布公开 GHCR 测试镜像测试文档

## 1. 文档信息

| 项目 | 内容 |
| --- | --- |
| 测试编号 | TEST-REQ-2026-008 |
| 关联需求 | [REQ-2026-008](../requirements/REQ-2026-008-ghcr-image-publishing.md) |
| 关联设计 | [DESIGN-REQ-2026-008](../design/DESIGN-REQ-2026-008-ghcr-image-publishing.md) |
| 测试负责人 | Codex |
| 文档状态 | 已完成 |
| 测试日期 | 2026-09-04 |
| 文档版本 | 0.4 |
| 创建日期 | 2026-09-04 |
| 最后更新日期 | 2026-09-04 |
| 前端版本/提交 | Saber 5.0.1；`e7e7c30` + 本需求未提交工作区 diff |
| 后端版本/提交 | 不涉及后端代码变化 |

## 2. 测试范围

- 测试目标：验证 GHCR 工作流结构、多阶段 Docker 构建、Nginx History 回退、健康检查、缓存策略、
  最小权限及逐行中文解释。
- 测试范围：`.github/workflows/publish-ghcr.yml`、`.dockerignore`、`src/docker/Dockerfile`、
  `src/docker/nginx.conf`、`src/docker/docker-compose.yaml`、`src/docker/compose.env.example` 以及
  构建出的本地测试镜像。
- 不测试内容：真实 GHCR 写入、正式标签发布、生产服务器拉取、HTTPS、外部网关和后端业务接口。
- 数据库影响：不涉及。

## 3. 测试环境与执行约束

| 项目 | 内容 |
| --- | --- |
| 操作系统 | Windows，本地 Codex 工作区 |
| Node.js | 24.11.1；Docker 构建阶段目标 Node.js 22 |
| 包管理器 | pnpm 10.23.0 |
| Docker | Client 28.3.2；Docker Desktop `desktop-linux` builder |
| Docker Compose | v2.39.1-desktop.1 |
| 测试地址 | 临时使用 `http://127.0.0.1:32768`，验证后已停止并删除容器 |
| 浏览器 | 不需要；使用 HTTP 客户端验证静态响应 |
| 测试账号 | 不涉及业务账号；不记录 GitHub Token 或 PAT |
| 测试数据 | 不创建业务数据，仅构建镜像和临时容器 |
| 执行面 | 本地 shell、Docker daemon；GitHub Actions 真实发布待远端执行 |
| 代理与并发 | 主代理 1 个，未使用子代理，并发数 1 |

写操作仅限构建本地标签 `saber-ghcr:test` 和启动对应临时容器；清理时只能删除本次容器和测试镜像，
不得删除用户其他镜像、容器、缓存或远端 GHCR 包。

## 4. 测试用例

### TC-001 发布工作流静态检查

- 优先级：P0
- 关联验收标准：`AC-001`、`AC-002`、`AC-003`、`AC-010`
- 模块与入口：`.github/workflows/publish-ghcr.yml`
- 前置条件：配置文件已生成。
- 依赖：无。
- 可并行：是；只读检查，不修改共享状态。
- 浏览器能力与执行面：本地 shell，无浏览器连续性要求。
- 测试步骤：
  1. 检查触发器包含 `v*.*.*` 和 `workflow_dispatch.image_tag`。
  2. 检查权限仅包含 `contents: read` 和 `packages: write`。
  3. 检查 GHCR 登录密码来自 `secrets.GITHUB_TOKEN`，且文件中不存在 PAT 或明文密码。
  4. 检查镜像名称为全小写，构建前校验标签格式，构建步骤启用推送和 BuildKit 缓存。
  5. 检查所有外部 Action 固定到已核对发布版本的完整提交 SHA。
  6. 逐行检查所有有效 YAML 配置均有紧邻中文注释。
- 预期结果：所有检查通过，工作流不存在未解释的有效配置行或敏感值。
- 证据要求：命令输出和最终 diff。
- 清理要求：无。
- 实际结果：actionlint 1.7.12 在只读挂载单个 workflow 文件且禁用容器网络的条件下通过，
  触发器、最小权限、`GITHUB_TOKEN`、标签格式校验、全小写镜像名、Action 完整 SHA、BuildKit 缓存
  和逐行中文解释检查均通过。
- 结果：通过
- 缺陷引用：无

### TC-002 Docker 构建与前端工程门禁

- 优先级：P0
- 关联验收标准：`AC-004`、`AC-005`、`AC-006`、`AC-010`
- 模块与入口：`src/docker/Dockerfile`、`.dockerignore`
- 前置条件：依赖可访问，Docker daemon 可用。
- 依赖：`TC-001`。
- 可并行：否；会占用 Docker daemon 和本地构建缓存。
- 浏览器能力与执行面：本地 shell，无浏览器连续性要求。
- 测试步骤：
  1. 运行 `pnpm run type-check`，确认当前源码类型门禁通过。
  2. 执行 `docker build -f src/docker/Dockerfile -t saber-ghcr:test .`。
  3. 检查构建日志包含 frozen 依赖安装、类型检查和 `build:prod`。
  4. 检查最终镜像历史和文件，确认运行阶段不包含 `/app/node_modules` 与源码。
  5. 逐行检查 Dockerfile 和 `.dockerignore` 的有效行均有中文注释。
- 预期结果：类型检查和 Docker 构建成功，最终镜像只包含运行所需内容。
- 证据要求：命令、退出码、镜像 ID 与关键构建阶段摘要。
- 清理要求：全部测试完成后仅删除 `saber-ghcr:test`。
- 实际结果：本机 `pnpm run type-check` 通过；Docker Linux 构建完成 frozen 安装、容器内类型检查和
  `build:prod`，生成镜像摘要 `sha256:fe4d46abdeded6decf751e7cb2f0601a83564465a94cf8bc94e5d058571b5be9`。
  最终镜像大小为 33,213,870 字节，不包含 `node` 命令和 `/app` 目录，静态入口存在。
- 结果：通过
- 缺陷引用：无

### TC-003 Nginx History 路由、缓存与健康检查

- 优先级：P0
- 关联验收标准：`AC-007`、`AC-008`、`AC-009`、`AC-010`
- 模块与入口：`src/docker/nginx.conf`、本地测试容器。
- 前置条件：`TC-002` 构建成功，测试端口未被占用。
- 依赖：`TC-002`。
- 可并行：否；依赖同一测试镜像和临时容器。
- 浏览器能力与执行面：本地 shell 与 HTTP 客户端，same-turn 连续状态。
- 测试步骤：
  1. 使用唯一容器名和动态宿主端口启动 `saber-ghcr:test`。
  2. 在容器内执行 `nginx -t`。
  3. 请求 `/healthz`，检查状态码 200、正文 `ok`。
  4. 请求 `/` 和一个不存在的 History 子路由，检查两者均返回应用 `index.html`。
  5. 请求真实带哈希静态资源，检查长期缓存响应头；请求 `/index.html`，检查禁用强缓存。
  6. 逐行检查 Nginx 配置的有效行均有中文注释。
- 预期结果：Nginx 配置有效，入口、子路由、缓存和探活行为符合设计。
- 证据要求：容器 ID、端口、HTTP 状态、响应头和正文摘要。
- 清理要求：停止并删除本案例启动的唯一临时容器。
- 实际结果：`nginx -t` 通过，容器健康状态为 `healthy`；`/healthz` 返回 200 和 `ok`，
  `/index.html` 返回 200 和 `no-cache/no-store/must-revalidate`，`/system/user` 返回与入口相同的 HTML，
  `/assets/index-zhKfRAec.js` 返回 200 和 `public, max-age=31536000, immutable`。
- 结果：通过
- 缺陷引用：无

### TC-004 真实 GHCR 公开发布与匿名拉取

- 优先级：P0
- 关联验收标准：`AC-001`、`AC-002`、`AC-003`
- 模块与入口：GitHub Actions、GitHub Packages、目标服务器。
- 前置条件：配置提交并推送；仓库允许 Actions 写 Packages；维护者理解 Public 设置不可逆。
- 依赖：`TC-001` 至 `TC-003`。
- 可并行：否；依赖真实远端发布结果。
- 浏览器能力与执行面：GitHub 网页、目标服务器 shell；需要人工连续核验。
- 测试步骤：
  1. 手动触发工作流并输入 `manual`。
  2. 确认 Job 成功且生成 `ghcr.io/aninterestingname/saber:manual`。
  3. 在 Packages 页面将包确认为 Public 并确认已关联当前仓库。
  4. 在未执行 `docker login ghcr.io` 的目标服务器匿名拉取镜像。
  5. 启动容器并执行根路径、子路由和 `/healthz` 冒烟检查。
- 预期结果：公开镜像发布成功；未认证服务器可以匿名拉取并正常运行。
- 证据要求：Actions 运行链接、包设置截图、镜像 digest 和脱敏后的拉取结果。
- 清理要求：保留 `manual` 包供验收；停止测试容器，不删除正式或历史版本。
- 实际结果：公开模式尚未合并到默认分支 `main` 并触发工作流，因此未执行真实 GHCR 发布、
  Public 可见性和目标服务器匿名拉取。
- 结果：阻塞
- 缺陷引用：`ENV-001`

### TC-005 Docker Compose 清单与变量渲染

- 优先级：P0
- 关联验收标准：`AC-011`、`AC-012`、`AC-013`
- 模块与入口：`src/docker/docker-compose.yaml`、`src/docker/compose.env.example`。
- 前置条件：Docker Compose v2 可用；不需要 GHCR 登录或远端镜像存在。
- 依赖：无。
- 可并行：是；`config` 只解析配置，不创建容器或网络。
- 浏览器能力与执行面：本地 shell，无浏览器连续性要求。
- 测试步骤：
  1. 逐行检查 Compose 清单和变量示例的有效配置均有紧邻中文注释。
  2. 使用示例变量文件执行 `docker compose config --quiet`。
  3. 执行 `docker compose config --images` 检查变量替换后的完整镜像地址。
  4. 检查默认绑定地址、端口、拉取策略、重启策略、安全限制和日志轮转配置。
- 预期结果：Compose 配置解析通过，镜像解析为 `ghcr.io/aninterestingname/saber:manual`，且安全默认值
  与设计一致。
- 证据要求：Compose 版本、命令退出码和解析后的镜像地址。
- 清理要求：`config` 不创建 Docker 资源，无需清理。
- 实际结果：Docker Compose v2.39.1-desktop.1 执行 `config --quiet` 退出码为 0，`config --images`
  输出 `ghcr.io/aninterestingname/saber:manual`；逐行中文解释检查通过。沙箱无法读取本机 Docker
  凭据文件产生警告，但未影响配置解析，也未访问 GHCR。
- 结果：通过
- 缺陷引用：无

## 5. 缺陷记录

| 缺陷编号 | 关联用例 | 严重级别 | 问题描述 | 状态 |
| --- | --- | --- | --- | --- |
| ENV-001 | TC-004 | 阻塞 | 公开模式尚未合并到默认分支 `main` 并触发工作流，无法执行真实 GHCR 发布、匿名拉取和 Compose 启动验收 | 待远端执行 |

## 6. 测试汇总

| 指标 | 数量 |
| --- | ---: |
| 用例总数 | 5 |
| 通过 | 4 |
| 失败 | 0 |
| 阻塞 | 1 |
| 不适用 | 0 |
| 未执行 | 0 |

### 测试结论

- 结论：有条件通过
- 已通过范围：工作流语法和最小权限、本地类型检查、Linux 多阶段构建、最小运行镜像、Nginx
  配置、健康检查、History 回退、入口缓存、哈希资源缓存和 Compose 配置渲染。
- 未完成项：真实 GHCR 发布、Packages Public 可见性、目标服务器匿名拉取和 Compose 启动。
- 遗留风险：首次发布前无法确认仓库级 Packages 权限和生产网络的实际拉取能力。
- 说明：需求保持“开发中（开发完成，待远端验收）”，不得标记已验收。

## 7. 验收标准覆盖矩阵

| 验收标准 | 覆盖用例 | 当前结果 |
| --- | --- | --- |
| AC-001 | TC-001、TC-004 | 工作流静态通过，真实推送阻塞 |
| AC-002 | TC-001、TC-004 | 手动入口静态通过，真实推送阻塞 |
| AC-003 | TC-001、TC-004 | 凭据设计通过，真实 GHCR 认证阻塞 |
| AC-004 | TC-002 | 通过 |
| AC-005 | TC-002 | 通过 |
| AC-006 | TC-002 | 通过 |
| AC-007 | TC-003 | 通过 |
| AC-008 | TC-003 | 通过 |
| AC-009 | TC-003 | 通过 |
| AC-010 | TC-001、TC-002、TC-003 | 通过 |
| AC-011 | TC-004、TC-005 | 配置解析通过，真实拉取阻塞 |
| AC-012 | TC-004、TC-005 | 配置解析通过，真实启动阻塞 |
| AC-013 | TC-004、TC-005 | 配置解析通过，真实升级回滚阻塞 |

## 8. 清理与变更记录

- 临时容器 `saber-ghcr-req-2026-008` 已停止并通过 `--rm` 自动删除。
- 本地测试镜像 `saber-ghcr:test` 已删除；未删除用户其他镜像、容器或缓存。
- actionlint 仅只读挂载单个 workflow 文件并禁用容器网络，未暴露仓库其他内容。
- 未创建或修改业务数据，未记录 GitHub Token、PAT、密码或后端地址。

| 日期 | 版本 | 变更内容 | 修改人 |
| --- | --- | --- | --- |
| 2026-09-04 | 0.3 | 新增并执行 Compose 配置用例；当前 4 个本地通过，1 个远端阻塞 | Codex |
| 2026-09-04 | 0.2 | 执行 4 个用例；3 个本地通过，1 个真实 GHCR 发布环境阻塞 | Codex |
| 2026-09-04 | 0.4 | 测试目标改为 Public 包和匿名拉取，移除部署端 PAT 验收 | Codex |
| 2026-09-04 | 0.1 | 创建 4 个用例，覆盖工作流、容器构建、Nginx 行为和真实私有发布 | Codex |
