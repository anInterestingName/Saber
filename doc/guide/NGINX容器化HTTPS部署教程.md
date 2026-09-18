# Saber 前端 Nginx 容器化 HTTPS 部署教程

> 适用场景：Saber 前端使用 Docker 镜像部署，Nginx 和证书申请也全部容器化。
>
> 目标架构：宿主机只运行 Docker、Docker Compose 和必要的定时调度器，不在宿主机安装 Nginx 或 Certbot。

## 1. 部署架构

```text
浏览器
  |
  | HTTP 80 / HTTPS 443
  v
saber-nginx 容器
  |
  | Docker 内部网络
  v
saber-web 容器
  |
  | 容器内 Nginx 80
  v
Saber 静态前端
```

证书申请和续期由 `certbot` 容器执行，证书通过共享目录提供给 `saber-nginx` 容器。

部署完成后，公网只需要开放以下端口：

| 端口 | 用途 | 是否公网开放 |
| --- | --- | --- |
| 80 | HTTP、Let's Encrypt 验证和跳转 HTTPS | 是 |
| 443 | HTTPS | 是 |
| 9090 | 前端容器内部调试端口 | 否 |

本文默认使用域名申请受浏览器信任的证书，例如：

```text
saber.example.com
```

需要先将域名的 A 记录解析到服务器公网 IP，并在云服务器安全组放行 TCP 80 和 TCP 443。Let's Encrypt 的 HTTP 验证需要公网能够访问 80 端口。

## 2. 目录规划

以下目录假设部署路径为 `/opt/saber`：

```text
/opt/saber/
├── .env
├── docker-compose.yaml
├── nginx/
│   └── conf.d/
│       └── saber.conf
└── certbot/
    ├── conf/
    └── www/
        └── .well-known/
            └── acme-challenge/
```

创建目录：

```bash
sudo mkdir -p /opt/saber/nginx/conf.d
sudo mkdir -p /opt/saber/certbot/conf
sudo mkdir -p /opt/saber/certbot/www/.well-known/acme-challenge
sudo chown -R "$USER":"$USER" /opt/saber
cd /opt/saber
```

## 3. 配置环境变量

创建 `/opt/saber/.env`：

```dotenv
# GHCR 镜像标签。生产环境建议使用明确版本，不要长期使用 manual。
SABER_IMAGE_TAG=manual

# 对外提供访问的域名，只填写实际已解析的域名。
SABER_DOMAIN=saber.example.com

# 申请证书时接收续期提醒的邮箱。
CERTBOT_EMAIL=your-email@example.com
```

`.env` 中不要写入密码、Token、私钥或其他敏感信息。

## 4. Docker Compose

创建或替换 `/opt/saber/docker-compose.yaml`：

```yaml
name: saber

services:
  # Saber 前端静态站点。只加入 Docker 网络，不直接暴露宿主机端口。
  web:
    image: ghcr.io/aninterestingname/saber:${SABER_IMAGE_TAG:-manual}
    pull_policy: always
    restart: unless-stopped
    expose:
      - "80"
    networks:
      - saber

  # 对外提供 HTTP、HTTPS，并将请求转发给 web 服务。
  edge:
    image: nginx:1.27-alpine
    container_name: saber-nginx
    restart: unless-stopped
    depends_on:
      - web
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./certbot/www:/var/www/certbot:ro
      - ./certbot/conf:/etc/letsencrypt:ro
    networks:
      - saber

  # 证书申请和续期使用一次性容器执行，不作为常驻服务启动。
  certbot:
    image: certbot/certbot:latest
    profiles:
      - certbot
    volumes:
      - ./certbot/www:/var/www/certbot
      - ./certbot/conf:/etc/letsencrypt
    networks:
      - saber

networks:
  saber:
    driver: bridge
```

检查 Compose 配置：

```bash
cd /opt/saber
docker compose config
```

确认没有错误后再启动服务。

## 5. 首次启动 HTTP 配置

申请证书前，Nginx 必须先能够通过 HTTP 提供 ACME 验证文件。

创建 `/opt/saber/nginx/conf.d/saber.conf`：

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name saber.example.com;

    # Let's Encrypt HTTP-01 验证目录。
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/certbot;
        try_files $uri =404;
    }

    # 申请证书前先通过 HTTP 访问前端。
    location / {
        proxy_pass http://web:80;

        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 60s;
    }
}
```

启动前端和 Nginx 容器：

```bash
cd /opt/saber
docker compose up -d web edge
```

查看状态：

```bash
docker compose ps
docker compose logs --tail=100 edge
docker compose logs --tail=100 web
```

本机测试 Nginx：

```bash
curl -I http://127.0.0.1
```

测试 ACME 验证目录：

```bash
echo ok > /opt/saber/certbot/www/.well-known/acme-challenge/test.txt
curl http://saber.example.com/.well-known/acme-challenge/test.txt
```

应该返回：

```text
ok
```

如果访问失败，先不要申请证书，优先检查 DNS、云安全组和 Nginx 日志。

## 6. 使用 Certbot 容器申请证书

确认域名已解析到当前服务器，并且公网 HTTP 访问正常后执行：

```bash
cd /opt/saber

set -a
. ./.env
set +a

docker compose --profile certbot run --rm certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  --email "$CERTBOT_EMAIL" \
  --agree-tos \
  --no-eff-email \
  --non-interactive \
  -d "$SABER_DOMAIN"
```

证书会写入：

```text
/opt/saber/certbot/conf/live/saber.example.com/
```

主要文件：

```text
fullchain.pem  # 完整证书链
privkey.pem    # 证书私钥
```

如果需要同时申请 `www` 域名，必须先为 `www.saber.example.com` 配置 DNS，然后增加参数：

```bash
-d www.saber.example.com
```

## 7. 切换到 HTTPS

证书申请成功后，将 `/opt/saber/nginx/conf.d/saber.conf` 替换为：

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name saber.example.com;

    # 续期验证请求不能被重定向。
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/certbot;
        try_files $uri =404;
    }

    # 其他 HTTP 请求统一跳转 HTTPS。
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;

    server_name saber.example.com;

    ssl_certificate /etc/letsencrypt/live/saber.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/saber.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_timeout 10m;

    location / {
        proxy_pass http://web:80;

        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        proxy_read_timeout 60s;
    }
}
```

检查并重新加载 Nginx：

```bash
cd /opt/saber
docker compose exec -T edge nginx -t
docker compose exec -T edge nginx -s reload
```

确认端口监听：

```bash
sudo ss -lntp | grep -E ':80|:443'
```

测试访问：

```bash
curl -I http://saber.example.com
curl -I https://saber.example.com
```

预期结果：HTTP 请求返回 301 并跳转到 HTTPS，HTTPS 请求返回前端应用响应。

## 8. 证书自动续期

Certbot 会将当前证书的续期配置写入共享目录。续期命令仍然通过容器执行：

```bash
cd /opt/saber
docker compose --profile certbot run --rm certbot renew --quiet
docker compose exec -T edge nginx -s reload
```

创建 `/opt/saber/renew-cert.sh`：

```bash
#!/usr/bin/env bash
set -euo pipefail

cd /opt/saber

docker compose --profile certbot run --rm certbot renew --quiet
docker compose exec -T edge nginx -s reload
```

赋予权限并手工测试：

```bash
sudo chmod +x /opt/saber/renew-cert.sh
sudo /opt/saber/renew-cert.sh
```

创建 `/etc/systemd/system/saber-certbot-renew.service`：

```ini
[Unit]
Description=Renew Saber HTTPS certificate
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
WorkingDirectory=/opt/saber
ExecStart=/opt/saber/renew-cert.sh
```

创建 `/etc/systemd/system/saber-certbot-renew.timer`：

```ini
[Unit]
Description=Run Saber certificate renewal twice daily

[Timer]
OnCalendar=*-*-* 03,15:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

启用定时器：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now saber-certbot-renew.timer
sudo systemctl status saber-certbot-renew.timer
```

这里的宿主机只负责定时触发 Docker 命令，Nginx、Certbot、证书和前端运行环境仍然全部在容器和 Docker 卷中。

## 9. 后端 API 反向代理

如果前端通过 `/api/` 请求 SpringBlade 后端，需要在 HTTPS 的 `server` 块中增加：

```nginx
location /api/ {
    proxy_pass http://实际后端服务名:实际后端端口;

    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
}
```

如果后端也在同一个 Compose 网络中，可以使用服务名：

```nginx
proxy_pass http://springblade-api:8080;
```

不要直接把当前服务器的 `18080` 当成 SpringBlade 后端端口；当前部署中它是 Nacos 容器的映射端口，必须先确认真实后端服务地址。

修改后检查并重载：

```bash
docker compose exec -T edge nginx -t
docker compose exec -T edge nginx -s reload
```

## 10. 常用排障命令

### 10.1 容器状态

```bash
cd /opt/saber
docker compose ps
docker compose logs --tail=200 edge
docker compose logs --tail=200 web
```

### 10.2 Nginx 配置错误

```bash
docker compose exec -T edge nginx -t
docker compose exec -T edge nginx -T
```

常见原因：

- 证书文件不存在。
- `server_name` 与证书申请的域名不一致。
- 配置文件语法错误。
- 443 端口已被其他进程占用。

### 10.3 502 Bad Gateway

```bash
docker compose exec -T edge getent hosts web
docker compose exec -T edge wget -S -O - http://web/healthz
```

常见原因：

- `web` 容器没有启动。
- Nginx 配置错误地使用了 `127.0.0.1:9090`。
- Nginx 和前端不在同一个 Docker 网络。
- Compose 服务名不是 `web`。

容器之间通信时应该使用：

```nginx
proxy_pass http://web:80;
```

而不是：

```nginx
proxy_pass http://127.0.0.1:9090;
```

### 10.4 HTTPS 证书失败

```bash
dig +short saber.example.com
curl -I http://saber.example.com
sudo ufw status
sudo ss -lntp | grep ':80'
```

此外，还需要确认腾讯云安全组允许公网访问 TCP 80。

## 11. 发布、升级和回滚

拉取新镜像并重新创建前端容器：

```bash
cd /opt/saber
docker compose pull web
docker compose up -d web edge
```

确认服务正常：

```bash
docker compose ps
docker compose logs --tail=100 web
docker compose logs --tail=100 edge
```

如果新镜像异常，将 `.env` 中的 `SABER_IMAGE_TAG` 改回上一个可用标签，然后执行：

```bash
docker compose pull web
docker compose up -d web edge
```

不要删除以下目录，否则会丢失证书和续期状态：

```text
/opt/saber/certbot/conf
/opt/saber/certbot/www
```

## 12. 验收清单

- [ ] DNS A 记录指向服务器公网 IP。
- [ ] 腾讯云安全组开放 TCP 80 和 TCP 443。
- [ ] `web` 容器没有绑定宿主机公网端口。
- [ ] `edge` 容器监听宿主机 80 和 443。
- [ ] `certbot` 容器成功申请证书。
- [ ] HTTP 自动跳转到 HTTPS。
- [ ] 浏览器访问 HTTPS 时证书受信任且域名匹配。
- [ ] `certbot renew --quiet` 执行成功。
- [ ] 证书续期后 Nginx 能够自动 reload。
- [ ] 前端静态资源加载成功。
- [ ] 如果存在 `/api/`，接口代理地址已单独验证。
