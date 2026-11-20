# 直接部署到腾讯云 Docker 网站

`trafarch-web` 容器将宿主机 `/opt/trafarch/site` 挂载到容器内的 `/usr/share/nginx/html`。

## 首次配置 SSH 登录

服务器只接受公钥时，本机需要一对密钥，并把**公钥**加入服务器。已有密钥的用户可跳过生成步骤，记下对应的私钥文件路径。需要新建专用密钥时，在本机 PowerShell 运行：

```powershell
ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\trafarch_deploy" -C "trafarch-deploy"
Get-Content "$env:USERPROFILE\.ssh\trafarch_deploy.pub"
```

如果第一条命令提示目标文件已存在，请勿覆盖已有私钥。复制公钥文件输出的整行（可能以 `ssh-ed25519` 或 `ssh-rsa` 开头）。通过腾讯云控制台的实例登录/网页终端进入服务器，在服务器上运行：

```sh
install -d -m 700 /root/.ssh
cat >> /root/.ssh/authorized_keys
```

接着粘贴**完整的一行公钥**、按回车，再按 `Ctrl+D` 结束输入。运行 `chmod 600 /root/.ssh/authorized_keys`。也可以使用腾讯云控制台的“关联密钥”功能绑定已有密钥；具体是否需要重启实例以控制台提示为准。请勿把私钥粘贴到聊天或服务器。使用新生成的专用密钥验证本机登录：

```powershell
ssh -i "$env:USERPROFILE\.ssh\trafarch_deploy" -o IdentitiesOnly=yes root@43.142.89.159
```

如果使用已有的 RSA 密钥，将 `-i` 后的路径改为对应的**私钥**文件路径。验证成功后，部署时也指定同一路径：`.\deploy.ps1 -IdentityFile 'C:\实际路径\私钥文件'`。私钥保存在项目文件夹时，已通过 `.gitignore` 排除 `*.pem` 和 `*.key`，不要用 `git add -f` 强行提交。

验证成功后，在项目目录内用 PowerShell 运行：

```powershell
git add .
git commit -m "更新网站"
.\deploy.ps1
```

部署脚本只打包当前 `HEAD` 的网站文件，通过 SSH 上传到 `root@43.142.89.159`，不会使用 GitHub。默认使用项目目录的 `git.pem`；密钥在其他位置时，可以运行 `.\deploy.ps1 -IdentityFile 'C:\实际路径\私钥文件'`。首次连接时 SSH 可能提示核对服务器指纹。电脑需要可用的 `git`、`scp` 和 `ssh` 命令，服务器需要 `tar`、`cp` 和 `find`（Debian 系统默认提供）。

也可以用 IPv6 部署，但运行脚本的电脑必须有 IPv6 网络连接。先测试：

```powershell
ssh -6 -i .\git.pem -o IdentitiesOnly=yes root@2402:4e00:c032:6e00:7400:253a:8622:0
.\deploy.ps1 -ServerHost '2402:4e00:c032:6e00:7400:253a:8622:0'
```

当前电脑没有可用的公网 IPv6 地址和默认路由，因此保留 IPv4 为默认地址。等本机网络支持 IPv6 后，上面的参数即可切换。

远端脚本先把当前站点备份到 `/opt/trafarch/backups/`，然后更新 `/opt/trafarch/site`。由于这是 Docker 的目录挂载，通常无需重启容器。脚本会替换站点目录下的全部内容，请不要在该目录存放需要单独保留的服务器文件。部署期间文件逐个复制，访问可能短暂受到影响。

## 启用常见 HTTP 错误页

站点根目录的数字 HTML 文件是可直接部署的静态页面，无需 Node.js 或 JavaScript 就能显示错误说明。支持 `400、401、403、404、405、408、409、410、413、414、415、422、429、431、500、501、502、503、504`。样式沿用 404 车票；开启 JavaScript 后支持简中、繁中、英文和主题切换。

修改共用页面结构时编辑 `scripts/error-pages/template.html`，修改错误码或三语文案时编辑同目录的 `messages.json`。运行 `node scripts/error-pages/generate.mjs` 更新所有数字 HTML 和 `nginx-errors.conf`；运行 `node scripts/error-pages/generate.mjs --check` 检查是否同步。将生成物一并提交，再随站点部署。

**首次启用或从单独的 404 配置升级：** 先部署网页文件。将 `scripts/error-pages/nginx-errors.conf` 单独传到宿主机的 `/opt/trafarch/nginx/nginx-errors.conf`（此配置不在网站发布包中）。在宿主机 `/opt/trafarch/nginx/default.conf` 的 `server { ... }` 中，用下面这行替换旧的 `error_page 404`、`location = /404.html` 和 `location = /404`。放在通用的 `.html` 正则重写规则之前，保留站点原有的 `location /` 和 `try_files $uri $uri.html $uri/ =404;`。

```nginx
include /etc/nginx/trafarch-errors.conf;
```

配置通过内部请求读取对应 HTML，不重定向，也不把错误改为 `200`。错误码短路径和对应 HTML 均为内部资源：访客直接输入 `/503` 或 `/503.html` 会看到 404，而真正的 503 仍显示 503 车票。要预览样式，在本地打开仓库中的 `503.html` 即可，不必开放线上测试地址。若有反向代理，仅在提供网页的 `proxy_pass` 位置按需启用 `proxy_intercept_errors on;`，不要拦截需要返回 JSON 的 API。外部 CDN、浏览器或已停机的 Nginx 产生的错误不能由本站页面接管。

目前只有网页目录被挂载。在宿主机保留容器正在使用的配置，再复制文件、检查并重载：

```sh
docker cp trafarch-web:/etc/nginx/conf.d/default.conf /opt/trafarch/nginx/default.conf.before-errors
docker cp /opt/trafarch/nginx/nginx-errors.conf trafarch-web:/etc/nginx/trafarch-errors.conf &&
docker cp /opt/trafarch/nginx/default.conf trafarch-web:/etc/nginx/conf.d/default.conf &&
  docker exec trafarch-web nginx -t && docker exec trafarch-web nginx -s reload
```

如果检查失败，不要重载；把 `default.conf.before-errors` 复制回容器后再修改。重建容器后也要重新复制两个配置文件，或将它们挂载到对应位置。仅改文案无需重载 Nginx。

用浏览器访问 `/missing/test-page?lang=en-US`，应显示英文 404 车票并保留原网址。用 `curl -I 'https://你的域名/503'` 和 `curl -I 'https://你的域名/503.html'` 确认两者都返回 `404`。如果之前已启用数字预览地址，只需替换容器中的 `trafarch-errors.conf`、检查并重载，无需重新部署 HTML。

## 回滚站点文件

如果部署后需要回滚，先从部署输出找到备份目录，再在服务器执行（把路径换成实际输出）：

```sh
backup=/opt/trafarch/backups/替换成实际备份目录名
site=/opt/trafarch/site
find "$site" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
cp -a -- "$backup/." "$site/"
```
