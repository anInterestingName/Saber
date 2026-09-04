# Saber 公开 GHCR 镜像部署说明

## 文件关系

- `docker-compose.yaml` 是服务器部署清单，需要先从 GitHub 代码仓库取得。
- `compose.env.example` 是非敏感变量示例，服务器复制为 `compose.env` 后填写镜像标签和端口。
- `docker compose pull` 根据 Compose 文件中的 `image` 匿名拉取公开 GHCR 镜像，但不会启动容器。
- `docker compose up -d` 创建或更新容器；由于配置了 `pull_policy: always`，执行时也会检查远端镜像。

## 1. 下载部署文件

首次测试可以从 `main` 下载：

```bash
mkdir -p /opt/saber
cd /opt/saber
curl -fsSLo docker-compose.yaml \
  https://raw.githubusercontent.com/anInterestingName/Saber/main/src/docker/docker-compose.yaml
curl -fsSLo compose.env.example \
  https://raw.githubusercontent.com/anInterestingName/Saber/main/src/docker/compose.env.example
cp compose.env.example compose.env
```

生产部署建议把 URL 中的 `main` 换成不可变版本标签，例如 `v5.0.1`，保证 Compose 配置与镜像版本
来自同一个 Git 提交。

## 2. 设置部署参数

编辑 `/opt/saber/compose.env`：

```dotenv
SABER_IMAGE_TAG=v5.0.1
SABER_BIND_ADDRESS=127.0.0.1
SABER_HTTP_PORT=8080
```

这些参数只用于 Compose 字符串替换，不会进入前端容器环境，也不能改变已经编译进静态资源的
`VITE_APP_*` 配置。不要把 GitHub Token 或密码写入 `compose.env`。

## 3. 确认 GHCR 包为公开

首次 Actions 发布后，在 GitHub 用户主页依次进入 `Packages`、`saber`、`Package settings`，在
`Danger Zone` 中将可见性修改为 `Public`。公开设置是不可逆操作，后续不能再改回 Private。

包变为 Public 后，服务器不需要执行 `docker login ghcr.io`，也不需要保存 GitHub Token 或 PAT。

## 4. 校验、匿名拉取和启动

```bash
docker compose --env-file compose.env -f docker-compose.yaml config
docker compose --env-file compose.env -f docker-compose.yaml pull
docker compose --env-file compose.env -f docker-compose.yaml up -d
docker compose --env-file compose.env -f docker-compose.yaml ps
curl http://127.0.0.1:8080/healthz
```

健康检查预期返回 `ok`。默认仅绑定 `127.0.0.1:8080`，需要由宿主机 Nginx、Traefik 或 Ingress
对外提供 HTTPS，并优先把 `/api/*` 请求去除 `/api` 前缀后转发到 SpringBlade 网关，其余请求转发到
Saber。这样与生产构建使用的 `VITE_APP_API=/api` 保持一致。

## 5. 升级与回滚

修改 `compose.env` 中的 `SABER_IMAGE_TAG` 后执行：

```bash
docker compose --env-file compose.env -f docker-compose.yaml pull
docker compose --env-file compose.env -f docker-compose.yaml up -d
docker compose --env-file compose.env -f docker-compose.yaml ps
```

升级失败时，把 `SABER_IMAGE_TAG` 改回上一个已经验证的版本标签，再重复上述三条命令。版本标签应保持
不可变，不要把不同镜像重复推送到同一个正式版本标签。
