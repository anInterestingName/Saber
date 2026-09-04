# 使用 Node.js 22 的 Alpine 镜像执行前端依赖安装和生产构建。
FROM node:22-alpine AS builder

# 将容器内的工作目录固定为 /app，后续命令都在该目录执行。
WORKDIR /app

# 声明可覆盖的 pnpm 版本，并默认与当前开发环境保持一致。
ARG PNPM_VERSION=10.23.0

# 启用 Corepack 并激活指定 pnpm 版本，避免包管理器版本随环境漂移。
RUN corepack enable && corepack prepare "pnpm@${PNPM_VERSION}" --activate

# 先复制依赖清单和锁文件，使源码变化时仍能复用依赖安装缓存层。
COPY package.json pnpm-lock.yaml ./

# 严格按照锁文件安装依赖，锁文件与清单不一致时立即终止构建。
RUN pnpm install --frozen-lockfile

# 复制经过 .dockerignore 过滤后的项目源码和生产环境配置。
COPY . .

# 在生成生产产物前执行 Vue 和 Node 配置的 TypeScript 类型检查。
RUN pnpm run type-check

# 使用 production 模式构建静态资源并输出到 /app/dist。
RUN pnpm run build:prod

# 明确检查入口文件存在，避免空产物被组装成表面成功的运行镜像。
RUN test -f /app/dist/index.html

# 使用固定主次版本的 Alpine Nginx 作为轻量运行阶段。
FROM nginx:1.28-alpine AS runtime

# 用项目配置覆盖官方镜像的默认站点配置。
COPY src/docker/nginx.conf /etc/nginx/conf.d/default.conf

# 只从构建阶段复制生产静态资源，不把源码和 node_modules 带入最终镜像。
COPY --from=builder /app/dist/ /usr/share/nginx/html/

# 声明容器通过 HTTP 80 端口提供服务，HTTPS 由外部代理或 Ingress 终止。
EXPOSE 80

# 定期请求健康端点，连续失败时将容器状态标记为 unhealthy。
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1

# 使用 SIGQUIT 让 Nginx 优雅停止并完成正在处理的请求。
STOPSIGNAL SIGQUIT

# 以前台模式启动 Nginx，使其作为容器主进程接收停止信号。
CMD ["nginx", "-g", "daemon off;"]
